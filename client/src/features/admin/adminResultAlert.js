// @ts-check

/**
 * Шаблонное содержимое алерт-окна с результатом отправки рассылки/уведомления —
 * единая логика для `BroadcastModal` и `NotificationSendModal`.
 * @param {{
 *   kind: 'broadcast' | 'notification',
 *   editing: boolean,
 *   result: { sendNow: boolean, dispatched: boolean, dispatchFailed: boolean, recipientsCount?: number }
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
    const count = typeof result.recipientsCount === 'number' ? result.recipientsCount : null;
    const recipientsText = count !== null ? ` Получателей: ${count}.` : '';
    return {
      title,
      message: `${noun} успешно отправлен${kind === 'broadcast' ? 'а' : 'о'}.${recipientsText}`
    };
  }

  return {
    title,
    message: `${noun} сохранен${kind === 'broadcast' ? 'а' : 'о'}, но немедленная отправка не удалась (проблема с сетью или сервером). Повторная попытка будет выполнена автоматически в течение минуты.`
  };
}
