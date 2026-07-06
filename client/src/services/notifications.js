// @ts-check
import { useEffect } from 'react';
import useSWR from 'swr';
import pb from './pb';
import { error } from '../lib/log';

const SESSIONS_LEFT_COPY = {
  3: {
    title: 'Ваше время — ценный ресурс ⏳',
    body: 'Очень мало... Самое время запланировать следующие визиты, чтобы сохранить привычный ритм!',
    badge_text: 'Осталось 3 посещения!'
  },
  2: {
    title: 'Мы ценим Ваше время 🙏🏼',
    body: 'В вашем распоряжении остается совсем немного. Продлите абонемент сейчас, чтобы не прерывать прогресс в последний момент.',
    badge_text: 'Осталось 2 посещения!'
  },
  1: {
    title: 'Скоро понадобится добавка! 🤏🏼',
    body: 'Осталось всего ничего... Продлите абонемент заранее, чтобы не тратить время на формальности при следующем входе.',
    badge_text: 'Осталось 1 посещение!'
  },
  0: {
    title: 'Я сейчас заплачу 😭',
    body: 'Они закончились! Но мы верим, что увидим Вас снова!',
    badge_text: 'Осталось 0 посещений!'
  }
};

/**
 * @param {string} userId
 */
export async function listNotifications(userId) {
  return pb.collection('notifications').getFullList({
    filter: `recipient = "${userId}"`,
    sort: '-created'
  });
}

/**
 * @param {string | null | undefined} userId
 */
export function useNotifications(userId) {
  const swr = useSWR(
    userId ? ['notifications', userId] : null,
    ([, id]) => listNotifications(id),
    { dedupingInterval: 5000, revalidateOnFocus: false }
  );
  const { mutate } = swr;

  useEffect(() => {
    if (!userId) return undefined;

    pb.collection('notifications')
      .subscribe('*', () => {
        mutate();
      })
      .catch((err) => {
        error('Ошибка подписки на уведомления:', err);
      });

    return () => {
      pb.collection('notifications').unsubscribe('*');
    };
  }, [userId, mutate]);

  return swr;
}

/**
 * @param {string} id
 */
export async function markNotificationRead(id) {
  return pb.collection('notifications').update(id, { is_read: true });
}

/**
 * @param {string} id
 */
export async function deleteNotification(id) {
  return pb.collection('notifications').delete(id);
}

/**
 * @param {string} userId
 */
export async function clearAllNotifications(userId) {
  const records = await listNotifications(userId);
  await Promise.all(records.map((record) => deleteNotification(record.id)));
}

/**
 * @param {string} userId
 * @param {number} previousAvailable
 * @param {number} newAvailable
 * @param {string} [membershipType]
 */
export async function maybeNotifySessionsLeft(
  userId,
  previousAvailable,
  newAvailable,
  membershipType
) {
  if (membershipType !== 'regular') return;
  if (previousAvailable === newAvailable) return;
  if (![0, 1, 2, 3].includes(newAvailable)) return;

  const copy = SESSIONS_LEFT_COPY[newAvailable];
  if (!copy) return;

  try {
    await pb.collection('notifications').create({
      recipient: userId,
      title: copy.title,
      body: copy.body,
      badge_text: copy.badge_text,
      click_action: 'open_membership',
      is_read: false
    });
  } catch (err) {
    error('maybeNotifySessionsLeft:', err);
  }
}
