// @ts-check

/**
 * Шаблонное содержимое алерт-окна с результатом отправки рассылки/уведомления —
 * единая логика для `BroadcastModal` и `NotificationSendModal`.
 * @param {{
 *   kind: 'broadcast' | 'notification',
 *   editing: boolean,
 *   result: { sendNow: boolean, dispatched: boolean, dispatchFailed: boolean, accepted?: boolean }
 * }} params
 * @returns {{ title: string, message: string }}
 */
export function buildSendResultAlert({ kind, editing, result }) {
  const noun = kind === 'broadcast' ? 'Рассылка' : 'Уведомление';
  const title = noun;

  if (!result.sendNow) {
    return {
      title,
      message: editing
        ? `Изменения сохранены. ${noun} остаётся запланирован${kind === 'broadcast' ? 'а' : 'о'} на указанное время.`
        : `${noun} успешно запланирован${kind === 'broadcast' ? 'а' : 'о'}.`
    };
  }

  if (result.dispatched) {
    return {
      title,
      message: `${noun} поставлен${kind === 'broadcast' ? 'а' : 'о'} в очередь. Отправка произойдёт в течение минуты.`
    };
  }

  return {
    title,
    message: `${noun} сохранен${kind === 'broadcast' ? 'а' : 'о'}, но не удалось поставить в очередь (проблема с сетью или сервером). Повторная попытка будет выполнена автоматически в течение минуты.`
  };
}
