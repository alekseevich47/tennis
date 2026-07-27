import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { formatRelativeTime } from '../../lib/format';
import { markNotificationRead, isDeletableNotification } from '../../services/notifications';
import PostContentHtml from '../feed/PostContentHtml';
import Avatar from '../../components/ui/Avatar';
import { formatTrainingCountdownBadge } from './notificationBadges';
import '../feed/Feed.css';
import './NotificationCard.css';

const CLICK_ACTION_LABELS = {
  open_training: 'Перейти к тренировке',
  open_membership: 'Перейти к абонементу'
};

const READ_VISIBLE_DELAY_MS = 1200;

/** @param {string} body */
function parseCommentReplyParentText(body) {
  const text = String(body || '').trim();
  const legacyMatch = text.match(/^ответил(?:\(а\))? на ваш комментарий [«"](.+)[»"]$/i);
  if (legacyMatch) return legacyMatch[1];
  return text;
}

/**
 * @param {{
 *   notification: Record<string, unknown>,
 *   userId: string,
 *   training?: Record<string, unknown> | null,
 *   scrollRootRef: React.RefObject<HTMLElement | null>,
 *   onMarkRead?: () => void,
 *   onDelete: (id: string) => void,
 *   onOpenTraining?: (trainingId: string) => void,
 *   onOpenMembership?: () => void,
 *   onOpenBooking?: () => void,
 *   onOpenComment?: (meta: Record<string, unknown>) => void
 * }} props
 */
export default function NotificationCard({
  notification,
  userId,
  training,
  scrollRootRef,
  onMarkRead,
  onDelete,
  onOpenTraining,
  onOpenMembership,
  onOpenBooking,
  onOpenComment
}) {
  const cardRef = useRef(null);
  const markedRef = useRef(false);
  const readTimeoutRef = useRef(null);
  const [now, setNow] = useState(() => new Date());
  const [readLocally, setReadLocally] = useState(false);

  const id = String(notification.id);
  const isRead = Boolean(notification.is_read);
  const showUnreadDot = !isRead && !readLocally;
  const clickAction = notification.click_action;
  const badgeDynamicType = notification.badge_dynamic_type;
  const meta = /** @type {Record<string, unknown> | undefined} */ (notification.meta);
  const isCommentReply =
    clickAction === 'open_comment' ||
    (meta && typeof meta === 'object' && meta.kind === 'comment_reply');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isRead || markedRef.current) return undefined;

    const root = scrollRootRef.current;
    const target = cardRef.current;
    if (!root || !target) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (!visible) {
          if (readTimeoutRef.current) {
            window.clearTimeout(readTimeoutRef.current);
            readTimeoutRef.current = null;
          }
          return;
        }
        if (markedRef.current || readTimeoutRef.current) return;
        readTimeoutRef.current = window.setTimeout(() => {
          readTimeoutRef.current = null;
          if (markedRef.current) return;
          markedRef.current = true;
          setReadLocally(true);
          markNotificationRead(id)
            .then(() => onMarkRead?.())
            .catch(() => {
              markedRef.current = false;
              setReadLocally(false);
            });
        }, READ_VISIBLE_DELAY_MS);
      },
      { root, threshold: 0.25 }
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
      if (readTimeoutRef.current) {
        window.clearTimeout(readTimeoutRef.current);
        readTimeoutRef.current = null;
      }
    };
  }, [id, isRead, onMarkRead, scrollRootRef]);

  const badgeText = (() => {
    if (badgeDynamicType === 'training_countdown') {
      return formatTrainingCountdownBadge(training, now, userId);
    }
    return notification.badge_text || null;
  })();

  const trainingState = notification.training_state;
  const clickLabel = (() => {
    if (clickAction === 'open_booking') {
      if (trainingState === 'farewell') return 'Записаться на тренировку';
      if (trainingState === 'completed') return 'Записаться ещё';
      return null;
    }
    return clickAction && CLICK_ACTION_LABELS[clickAction] ? CLICK_ACTION_LABELS[clickAction] : null;
  })();
  const canDelete = isDeletableNotification(notification);

  const handleActionClick = useCallback(() => {
    if (clickAction === 'open_training' && meta?.trainingId) {
      onOpenTraining?.(String(meta.trainingId));
      return;
    }
    if (clickAction === 'open_membership') {
      onOpenMembership?.();
      return;
    }
    if (clickAction === 'open_booking') {
      onOpenBooking?.();
      return;
    }
    if ((clickAction === 'open_comment' || (meta && meta.kind === 'comment_reply')) && meta) {
      onOpenComment?.(meta);
    }
  }, [clickAction, meta, onOpenBooking, onOpenComment, onOpenMembership, onOpenTraining]);

  const handleDelete = useCallback(
    (event) => {
      event.stopPropagation();
      onDelete(id);
    },
    [id, onDelete]
  );

  const handleCardClick = useCallback(() => {
    if (isCommentReply) handleActionClick();
  }, [handleActionClick, isCommentReply]);

  if (isCommentReply) {
    const actor = /** @type {import('../../lib/avatar').UserAvatarLike | undefined} */ (
      meta && typeof meta === 'object' ? meta.actor : undefined
    );
    const actorName = String(notification.title || actor?.full_name || 'Игрок секции');
    const parentCommentText = parseCommentReplyParentText(String(notification.body || ''));

    return (
      <article
        ref={cardRef}
        className={clsx(
          'notification-card',
          'notification-card--comment-reply',
          showUnreadDot && 'notification-card--unread'
        )}
        onClick={handleCardClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardClick();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {showUnreadDot ? (
          <span className="notification-card__unread-dot" aria-hidden="true" />
        ) : null}

        <div className="notification-card__reply-layout">
          <Avatar user={actor || { full_name: actorName }} size="sm" className="notification-card__reply-avatar" />
          <div className="notification-card__reply-content">
            <div className="notification-card__reply-header">
              <span className="notification-card__reply-name">{actorName}</span>
              <time
                className="notification-card__time notification-card__time--reply"
                dateTime={String(notification.created || '')}
              >
                {notification.created ? formatRelativeTime(notification.created, now) : ''}
              </time>
            </div>
            <p className="notification-card__reply-action">
              <span className="notification-card__reply-action-label">ответил(а):</span>
              {badgeText ? (
                <span className="notification-card__badge notification-card__badge--reply">{badgeText}</span>
              ) : null}
            </p>
            {parentCommentText ? (
              <p className="notification-card__reply-parent">
                на Ваш комментарий:{' '}
                <span className="notification-card__reply-parent-text">{parentCommentText}</span>
              </p>
            ) : null}
          </div>
        </div>

        {canDelete ? (
          <button
            type="button"
            className="notification-card__delete"
            aria-label="Удалить уведомление"
            onClick={handleDelete}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </article>
    );
  }

  return (
    <article
      ref={cardRef}
      className={clsx('notification-card', showUnreadDot && 'notification-card--unread')}
    >
      {showUnreadDot ? (
        <span className="notification-card__unread-dot" aria-hidden="true" />
      ) : null}
      <div className="notification-card__header">
        <PostContentHtml
          as="h3"
          className="notification-card__title"
          content={String(notification.title || 'Уведомление')}
        />
        <time className="notification-card__time" dateTime={String(notification.created || '')}>
          {notification.created ? formatRelativeTime(notification.created, now) : ''}
        </time>
      </div>

      {notification.body ? (
        <PostContentHtml
          as="div"
          className="notification-card__body"
          content={String(notification.body)}
        />
      ) : null}

      {badgeText || clickLabel ? (
        <div className="notification-card__meta">
          {badgeText ? <span className="notification-card__badge">{badgeText}</span> : null}
          {clickLabel ? (
            <button type="button" className="notification-card__action" onClick={handleActionClick}>
              {clickLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          className="notification-card__delete"
          aria-label="Удалить уведомление"
          onClick={handleDelete}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </article>
  );
}
