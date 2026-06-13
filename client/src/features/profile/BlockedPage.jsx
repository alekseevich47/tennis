import React from 'react';
import { format } from 'date-fns';
import { MAX_SELLER_URL } from '../../config';
import { openSellerChat } from '../shop/buyMessage';
import './BlockedPage.css';

/**
 * @param {{ user: { banned_at?: string, ban_reason?: string } }} props
 */
function BlockedPage({ user }) {
  const bannedAt = user?.banned_at ? new Date(user.banned_at) : null;
  const formattedDate =
    bannedAt && !Number.isNaN(bannedAt.getTime())
      ? format(bannedAt, 'HH:mm dd.MM.yyyy')
      : null;

  return (
    <div className="blocked-page">
      <div className="blocked-icon" aria-hidden="true">
        ⚠️
      </div>
      <h1 className="blocked-title">Доступ заблокирован</h1>

      {formattedDate && (
        <p className="blocked-details">Дата: {formattedDate}</p>
      )}

      {user?.ban_reason && (
        <p className="blocked-reason">Причина: {user.ban_reason}</p>
      )}

      <p className="blocked-contact-hint">
        Вы можете связаться с администратором для решения проблемы.
      </p>

      <button
        type="button"
        className="blocked-chat-btn"
        onClick={() => openSellerChat(MAX_SELLER_URL)}
      >
        Перейти в чат
      </button>
    </div>
  );
}

export default BlockedPage;
