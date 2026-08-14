// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import pb from '../services/pb';
import {
  initMaxAuth,
  getCurrentUser,
  loadBanInfo,
  isUserBanned,
  refreshAuthUser,
  saveBanInfo
} from '../services/auth';
import { purgeAbandonedComments, purgeAbandonedPosts } from '../services/posts';
import { purgeAbandonedTournamentPosts } from '../services/tournamentPosts';
import { purgeAbandonedProducts } from '../services/catalog';
import { warn, error } from '../lib/log';
import { mutate as mutateSWR } from 'swr';

/**
 * @typedef {import('../services/auth').UserRecord} UserRecord
 */

/**
 * @returns {UserRecord | null}
 */
function getInitialUser() {
  const banInfo = loadBanInfo();
  if (banInfo) return banInfo;
  return getCurrentUser();
}

/**
 * Идемпотентная инициализация MAX-сессии (фикс C4, C9).
 * Реализован гвард: повторный mount в StrictMode не запускает auth дважды.
 * Возвращает `{ user, isLoading, error, setUser }`.
 */
export function useMaxAuth() {
  const [user, setUser] = useState(/** @type {UserRecord | null} */ (getInitialUser()));
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState(/** @type {Error | null} */ (null));
  const bannedRef = useRef(/** @type {UserRecord | null} */ (loadBanInfo()));

  // Гвард против двойного вызова StrictMode и любых параллельных монтирований.
  const startedRef = useRef(false);

  const applyUser = useCallback((/** @type {UserRecord | null} */ nextUser) => {
    if (isUserBanned(nextUser)) {
      bannedRef.current = nextUser;
    } else {
      bannedRef.current = null;
    }
    setUser(nextUser);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const webApp = /** @type {{ ready?: () => void, initData?: string } | undefined} */ (
          window
        ).WebApp;
        try {
          webApp?.ready?.();
        } catch {
          // ignore
        }

        let initData = webApp?.initData || '';
        // Иногда Bridge отдаёт initData чуть позже ready().
        if (!initData) {
          await new Promise((resolve) => window.setTimeout(resolve, 50));
          initData = webApp?.initData || '';
        }

        let loggedUser = null;

        if (initData) {
          loggedUser = await initMaxAuth(initData, controller.signal);
        } else {
          warn('Запуск вне мессенджера MAX. Используем локальную сессию.');
          loggedUser = getCurrentUser();
          if (loggedUser?.id && pb.authStore.token) {
            try {
              loggedUser = await refreshAuthUser(loggedUser.id, controller.signal);
            } catch (refreshErr) {
              if (refreshErr && /** @type {Error} */ (refreshErr).name === 'AbortError') throw refreshErr;
              error('Ошибка обновления профиля из локальной сессии:', refreshErr);
            }
          }
        }

        if (cancelled) return;
        applyUser(loggedUser);

        // Параллельная зачистка зомби soft-delete — не блокирует UI.
        if (loggedUser?.id && !isUserBanned(loggedUser)) {
          purgeAbandonedComments(loggedUser.id, { signal: controller.signal }).catch((e) =>
            error('Ошибка автозачистки старых комментариев:', e)
          );
          if (loggedUser.role === 'moderator') {
            Promise.all([
              purgeAbandonedPosts({ signal: controller.signal }),
              purgeAbandonedTournamentPosts({ signal: controller.signal }),
              purgeAbandonedProducts({ signal: controller.signal })
            ])
              .then(() => {
                mutateSWR((key) => Array.isArray(key) && (key[0] === 'posts' || key[0] === 'tournament_posts' || key[0] === 'products'));
              })
              .catch((e) => error('Ошибка автозачистки soft-delete:', e));
          }
        }
      } catch (e) {
        if (!cancelled) setErr(/** @type {Error} */ (e));
        error('Критическая ошибка инициализации сессии:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Слушаем смену authStore (например, после updateUserProfile → authRefresh).
  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      if (bannedRef.current?.is_banned) return;
      setUser(/** @type {UserRecord | null} */ (pb.authStore.model));
    });
    return unsubscribe;
  }, []);

  // Realtime: бан, bot_blocked, заморозка абонемента, ограничение комментариев.
  useEffect(() => {
    const userId = user?.id;
    if (!userId || isUserBanned(user)) return;

    let cancelled = false;

    const handler = (/** @type {{ action?: string, record?: Record<string, unknown> }} */ event) => {
      if (cancelled) return;
      const record = event.record;
      if (!record) return;

      if (record.is_banned === true) {
        pb.authStore.clear();
        const bannedUser = /** @type {UserRecord} */ ({
          is_banned: true,
          ban_reason: String(record.ban_reason || ''),
          banned_at: String(record.banned_at || '')
        });
        saveBanInfo(bannedUser);
        bannedRef.current = bannedUser;
        setUser(bannedUser);
        return;
      }

      setUser((prev) => {
        if (!prev) return prev;
        if (
          prev.membership_frozen !== record.membership_frozen ||
          prev.can_comment !== record.can_comment ||
          prev.bot_blocked !== record.bot_blocked ||
          prev.bot_blocked_at !== record.bot_blocked_at
        ) {
          return { ...prev, .../** @type {UserRecord} */ (record) };
        }
        return prev;
      });
    };

    pb.collection('users').subscribe(userId, handler).catch((e) => {
      error('Ошибка подписки на обновления пользователя:', e);
    });

    return () => {
      cancelled = true;
      pb.collection('users').unsubscribe(userId);
    };
  }, [user?.id]);

  // Стабильная ссылка: иначе App handleUserUpdate меняется каждый рендер →
  // ProfilePage useEffect([user.id, onUpdate]) → бесконечный getOne.
  const setUserSafe = useCallback(
    (/** @type {UserRecord | null} */ nextUser) => {
      applyUser(nextUser);
    },
    [applyUser]
  );

  return { user, isLoading, error: err, setUser: setUserSafe };
}
