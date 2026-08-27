import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { formatRelativeTime } from '../../lib/format';
import { SWIPE_CLOSE_THRESHOLD } from '../../lib/gestures';
import { markNotificationRead, isDeletableNotification } from '../../services/notifications';
import PostContentHtml from '../feed/PostContentHtml';
import Avatar from '../../components/ui/Avatar';
import { formatTrainingCountdownBadge } from './notificationBadges';
import '../feed/Feed.css';
import './NotificationCard.css';

const CLICK_ACTION_LABELS = {
  open_training: 'Перейти к тренировке',
  open_membership: 'Перейти к абонементу',
  open_seller_chat: 'Продлить абонемент'
};

const READ_VISIBLE_DELAY_MS = 1200;
const EXIT_MS = 220;
const DRAG_DEADZONE = 8;

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
 *   onOpenComment?: (meta: Record<string, unknown>) => void,
 *   onOpenSellerChat?: () => void
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
  onOpenComment,
  onOpenSellerChat
}) {
  const cardRef = useRef(null);
  const markedRef = useRef(false);
  const readTimeoutRef = useRef(null);
  const gestureRef = useRef(/** @type {null | {
    startX: number,
    startY: number,
    deltaX: number,
    isVertical: boolean,
    active: boolean
  }} */ (null));
  const dismissingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [now, setNow] = useState(() => new Date());
  const [readLocally, setReadLocally] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(false);

  const id = String(notification.id);
  const isRead = Boolean(notification.is_read);
  const showUnreadDot = !isRead && !readLocally;
  const clickAction = notification.click_action;
  const badgeDynamicType = notification.badge_dynamic_type;
  const meta = /** @type {Record<string, unknown> | undefined} */ (notification.meta);
  const isCommentReply =
    clickAction === 'open_comment' ||
    (meta && typeof meta === 'object' && meta.kind === 'comment_reply');
  const canDelete = isDeletableNotification(notification);

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

  const applyTransform = useCallback((x, opacity, withTransition) => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = withTransition
      ? `transform ${EXIT_MS}ms ease, opacity ${EXIT_MS}ms ease`
      : 'none';
    el.style.transform = `translate3d(${x}px,0,0)`;
    el.style.opacity = String(opacity);
  }, []);

  const commitDelete = useCallback(
    (direction = -1) => {
      if (dismissingRef.current || !canDelete) return;
      dismissingRef.current = true;
      setExiting(true);
      setDragging(false);
      const width = cardRef.current?.offsetWidth || window.innerWidth;
      applyTransform(direction * (width + 32), 0, true);
      window.setTimeout(() => {
        onDelete(id);
      }, EXIT_MS);
    },
    [applyTransform, canDelete, id, onDelete]
  );

  const handleTouchStart = useCallback(
    (event) => {
      if (!canDelete || exiting || dismissingRef.current) return;
      const touch = event.touches[0];
      if (!touch) return;
      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        deltaX: 0,
        isVertical: false,
        active: false
      };
    },
    [canDelete, exiting]
  );

  const handleTouchMove = useCallback(
    (event) => {
      const gesture = gestureRef.current;
      const touch = event.touches[0];
      if (!gesture || !touch || !canDelete || exiting || dismissingRef.current) return;

      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;
      gesture.deltaX = deltaX;

      if (!gesture.active) {
        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
          gesture.isVertical = true;
          return;
        }
        if (Math.abs(deltaX) < DRAG_DEADZONE) return;
        gesture.active = true;
        setDragging(true);
      }

      if (gesture.isVertical) return;

      const opacity = Math.max(0.35, 1 - Math.abs(deltaX) / (SWIPE_CLOSE_THRESHOLD * 1.5));
      applyTransform(deltaX, opacity, false);
    },
    [applyTransform, canDelete, exiting]
  );

  const handleTouchEnd = useCallback(() => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (!gesture || exiting || dismissingRef.current) return;

    if (gesture.isVertical || !gesture.active) {
      setDragging(false);
      return;
    }

    suppressClickRef.current = true;
    const { deltaX } = gesture;
    if (Math.abs(deltaX) >= SWIPE_CLOSE_THRESHOLD) {
      commitDelete(deltaX > 0 ? 1 : -1);
      return;
    }

    setDragging(false);
    applyTransform(0, 1, true);
  }, [applyTransform, commitDelete, exiting]);

  const badgeText = (() => {
    if (badgeDynamicType === 'training_countdown') {
      return formatTrainingCountdownBadge(training, now, userId);
    }
    return notification.badge_text || null;
  })();

  const trainingState = notification.training_state;
  const clickLabel = (() => {
    if (clickAction === 'open_seller_chat') {
      const metaLabel =
        meta && typeof meta === 'object' && meta.action_label != null
          ? String(meta.action_label)
          : '';
      return metaLabel || CLICK_ACTION_LABELS.open_seller_chat;
    }
    if (clickAction === 'open_booking') {
      if (trainingState === 'farewell') return 'Записаться на тренировку';
      if (trainingState === 'completed') return 'Записаться ещё';
      return null;
    }
    return clickAction && CLICK_ACTION_LABELS[clickAction] ? CLICK_ACTION_LABELS[clickAction] : null;
  })();

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
    if (clickAction === 'open_seller_chat') {
      onOpenSellerChat?.();
      return;
    }
    if ((clickAction === 'open_comment' || (meta && meta.kind === 'comment_reply')) && meta) {
      onOpenComment?.(meta);
    }
  }, [clickAction, meta, onOpenBooking, onOpenComment, onOpenMembership, onOpenSellerChat, onOpenTraining]);

  const handleDelete = useCallback(
    (event) => {
      event.stopPropagation();
      commitDelete(-1);
    },
    [commitDelete]
  );

  const handleCardClick = useCallback(() => {
    if (suppressClickRef.current || dismissingRef.current || exiting) {
      suppressClickRef.current = false;
      return;
    }
    if (isCommentReply) handleActionClick();
  }, [exiting, handleActionClick, isCommentReply]);

  const cardClassName = clsx(
    'notification-card',
    isCommentReply && 'notification-card--comment-reply',
    showUnreadDot && 'notification-card--unread',
    dragging && 'notification-card--dragging',
    exiting && 'notification-card--exiting'
  );

  const swipeHandlers = canDelete
    ? {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchEnd
      }
    : {};

  if (isCommentReply) {
    const actor = /** @type {import('../../lib/avatar').UserAvatarLike | undefined} */ (
      meta && typeof meta === 'object' ? meta.actor : undefined
    );
    const actorName = String(notification.title || actor?.full_name || 'Игрок секции');
    const parentCommentText = parseCommentReplyParentText(String(notification.body || ''));

    return (
      <article
        ref={cardRef}
        className={cardClassName}
        onClick={handleCardClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardClick();
          }
        }}
        role="button"
        tabIndex={0}
        {...swipeHandlers}
      >
        {showUnreadDot ? (
          <span className="notification-card__unread-dot" aria-hidden="true" />
        ) : null}

        <div className="notification-card__reply-layout">
          <Avatar user={actor || { full_name: actorName }} size="sm" className="notification-card__reply-avatar" />
          <div className="notification-card__reply-content">
            <div className="notification-card__reply-header">
              <time
                className="notification-card__time notification-card__time--reply"
                dateTime={String(notification.created || '')}
              >
                {notification.created ? formatRelativeTime(notification.created, now) : ''}
              </time>
              <p className="notification-card__reply-sentence">
                <span className="notification-card__reply-name">{actorName}</span>
                {' '}
                ответил(а):
                {badgeText ? (
                  <>
                    {' '}
                    <span className="notification-card__reply-text">«{badgeText}»</span>
                  </>
                ) : null}
                {parentCommentText ? (
                  <>
                    {' '}
                    на Ваш комментарий:{' '}
                    <span className="notification-card__reply-parent-text">
                      «{parentCommentText}»
                    </span>
                  </>
                ) : null}
              </p>
            </div>
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
    <article ref={cardRef} className={cardClassName} {...swipeHandlers}>
      {showUnreadDot ? (
        <span className="notification-card__unread-dot" aria-hidden="true" />
      ) : null}
      <div className="notification-card__header">
        <time className="notification-card__time" dateTime={String(notification.created || '')}>
          {notification.created ? formatRelativeTime(notification.created, now) : ''}
        </time>
        <PostContentHtml
          as="h3"
          className="notification-card__title"
          content={String(notification.title || 'Уведомление')}
        />
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
