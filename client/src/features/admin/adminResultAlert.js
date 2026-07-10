// @ts-check

/**
 * Текст ошибки create/update из PocketBase ClientResponseError
 * (полевые `response.data.<field>.message` или общий `message`), иначе fallback.
 * @param {unknown} err
 * @param {string} fallback
 * @returns {string}
 */
export function formatAdminSaveError(err, fallback) {
  const response =
    err && typeof err === 'object' && 'response' in err
      ? /** @type {{ message?: string, data?: Record<string, { message?: string }> }} */ (
          err.response
        )
      : null;
  const data = response?.data
    ?? (err && typeof err === 'object' && 'data' in err
      ? /** @type {Record<string, { message?: string }> | { message?: string }} */ (err.data)
      : null);

  if (data && typeof data === 'object') {
    const fieldMessages = Object.values(data)
      .map((value) =>
        value && typeof value === 'object' && typeof value.message === 'string'
          ? value.message.trim()
          : ''
      )
      .filter(Boolean);
    if (fieldMessages.length > 0) {
      return fieldMessages.join('; ');
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }
  }

  if (typeof response?.message === 'string' && response.message.trim()) {
    return response.message.trim();
  }

  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof err.message === 'string' &&
    err.message.trim() &&
    !err.message.startsWith('ClientResponseError')
  ) {
    return err.message.trim();
  }

  return fallback;
}

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
