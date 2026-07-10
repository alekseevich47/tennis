import React from 'react';
import { format } from 'date-fns';
import { MAX_SELLER_URL } from '../../config';
import { BOT_BLOCKED_APP_MESSAGE, isUserBotBlocked } from '../../services/auth';
import { openSellerChat } from '../shop/buyMessage';
import './BlockedPage.css';

/**
 * @param {{ user: {
 *   banned_at?: string,
 *   ban_reason?: string,
 *   bot_blocked?: boolean,
 *   bot_blocked_at?: string,
 *   is_banned?: boolean
 * } }} props
 */
function BlockedPage({ user }) {
  const botBlocked = isUserBotBlocked(user);
  const blockedAtRaw = botBlocked ? user?.bot_blocked_at : user?.banned_at;
  const blockedAt = blockedAtRaw ? new Date(blockedAtRaw) : null;
  const formattedDate =
    blockedAt && !Number.isNaN(blockedAt.getTime())
      ? format(blockedAt, 'HH:mm dd.MM.yyyy')
      : null;

  return (
    <div className="blocked-page">
      <div className="blocked-icon" aria-hidden="true">
        ⚠️
      </div>
      <h1 className="blocked-title">
        {botBlocked ? 'Доступ ограничен' : 'Доступ заблокирован'}
      </h1>

      {formattedDate && (
        <p className="blocked-details">Дата: {formattedDate}</p>
      )}

      {botBlocked ? (
        <p className="blocked-reason">Причина: {BOT_BLOCKED_APP_MESSAGE}</p>
      ) : user?.ban_reason ? (
        <p className="blocked-reason">Причина: {user.ban_reason}</p>
      ) : null}

      <p className="blocked-contact-hint">
        {botBlocked
          ? 'После повторного запуска бота обновите мини-приложение.'
          : 'Вы можете связаться с администратором для решения проблемы.'}
      </p>

      {!botBlocked && (
        <button
          type="button"
          className="blocked-chat-btn"
          onClick={() => openSellerChat(MAX_SELLER_URL)}
        >
          Перейти в чат
        </button>
      )}
    </div>
  );
}

export default BlockedPage;
