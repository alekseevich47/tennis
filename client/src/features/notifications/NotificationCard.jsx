import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { formatPostDate } from '../../lib/format';
import { markNotificationRead } from '../../services/notifications';
import { formatTrainingCountdownBadge } from './notificationBadges';
import './NotificationCard.css';

const CLICK_ACTION_LABELS = {
  open_training: 'Перейти к тренировке',
  open_membership: 'Перейти к абонементу'
};

const READ_VISIBLE_DELAY_MS = 1200;

/**
 * @param {{
 *   notification: Record<string, unknown>,
 *   userId: string,
 *   training?: Record<string, unknown> | null,
 *   scrollRootRef: React.RefObject<HTMLElement | null>,
 *   onMarkRead?: () => void,
 *   onDelete: (id: string) => void,
 *   onOpenTraining?: (trainingId: string) => void,
 *   onOpenMembership?: () => void
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
  onOpenMembership
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
  const meta = /** @type {{ trainingId?: string } | undefined} */ (notification.meta);

  useEffect(() => {
    if (badgeDynamicType !== 'training_countdown') return undefined;
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [badgeDynamicType]);

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

  const clickLabel = clickAction ? CLICK_ACTION_LABELS[clickAction] : null;

  const handleActionClick = useCallback(() => {
    if (clickAction === 'open_training' && meta?.trainingId) {
      onOpenTraining?.(meta.trainingId);
      return;
    }
    if (clickAction === 'open_membership') {
      onOpenMembership?.();
    }
  }, [clickAction, meta?.trainingId, onOpenMembership, onOpenTraining]);

  const handleDelete = useCallback(
    (event) => {
      event.stopPropagation();
      onDelete(id);
    },
    [id, onDelete]
  );

  return (
    <article
      ref={cardRef}
      className={clsx('notification-card', showUnreadDot && 'notification-card--unread')}
    >
      {showUnreadDot ? (
        <span className="notification-card__unread-dot" aria-hidden="true" />
      ) : null}
      <div className="notification-card__header">
        <h3 className="notification-card__title">{notification.title || 'Уведомление'}</h3>
        <time className="notification-card__time" dateTime={String(notification.created || '')}>
          {notification.created ? formatPostDate(notification.created) : ''}
        </time>
      </div>

      {notification.body ? <p className="notification-card__body">{notification.body}</p> : null}

      {badgeText ? <span className="notification-card__badge">{badgeText}</span> : null}

      {clickLabel ? (
        <button type="button" className="notification-card__action" onClick={handleActionClick}>
          {clickLabel}
        </button>
      ) : null}

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
    </article>
  );
}
