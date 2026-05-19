// @ts-check
import { useEffect, useRef, useState } from 'react';
import pb from '../services/pb';
import { initMaxAuth, getCurrentUser } from '../services/auth';
import { purgeAbandonedComments } from '../services/posts';
import { warn, error } from '../lib/log';

/**
 * @typedef {import('../services/auth').UserRecord} UserRecord
 */

/**
 * Идемпотентная инициализация MAX-сессии (фикс C4, C9).
 * Реализован гвард: повторный mount в StrictMode не запускает auth дважды.
 * Возвращает `{ user, isLoading, error, setUser }`.
 */
export function useMaxAuth() {
  const [user, setUser] = useState(/** @type {UserRecord | null} */ (getCurrentUser()));
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState(/** @type {Error | null} */ (null));

  // Гвард против двойного вызова StrictMode и любых параллельных монтирований.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const initData = /** @type {{ initData?: string }} */ (window).WebApp?.initData;
        let loggedUser = null;

        if (initData) {
          loggedUser = await initMaxAuth(initData, controller.signal);
        } else {
          warn('Запуск вне мессенджера MAX. Используем локальную сессию.');
          loggedUser = getCurrentUser();
        }

        if (cancelled) return;
        setUser(loggedUser);

        // Параллельная зачистка зомби-комментариев — не блокирует UI (правило async-parallel).
        if (loggedUser?.id) {
          purgeAbandonedComments(loggedUser.id, { signal: controller.signal }).catch((e) =>
            error('Ошибка автозачистки старых комментариев:', e)
          );
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
      setUser(/** @type {UserRecord | null} */ (pb.authStore.model));
    });
    return unsubscribe;
  }, []);

  return { user, isLoading, error: err, setUser };
}
