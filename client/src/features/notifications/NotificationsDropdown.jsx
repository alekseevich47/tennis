import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useTrainings } from '../../hooks/useTrainings';
import { clearAllNotifications, deleteNotification, isDeletableNotification } from '../../services/notifications';
import { error } from '../../lib/log';
import NotificationCard from './NotificationCard';
import './NotificationsDropdown.css';

const BROW_CLOSE_THRESHOLD = 56;
const BROW_DRAG_DEADZONE = 6;
const BROW_CLOSE_MS = 200;

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   userId: string,
 *   notifications: Record<string, unknown>[],
 *   onMutate: () => void,
 *   notificationsAnchorRef: React.RefObject<HTMLElement | null>,
 *   onOpenTraining?: (trainingId: string) => void,
 *   onOpenMembership?: () => void,
 *   onOpenBooking?: () => void,
 *   onOpenComment?: (meta: Record<string, unknown>) => void
 * }} props
 */
export default function NotificationsDropdown({
  open,
  onClose,
  userId,
  notifications,
  onMutate,
  notificationsAnchorRef,
  onOpenTraining,
  onOpenMembership,
  onOpenBooking,
  onOpenComment
}) {
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const browGestureRef = useRef(/** @type {null | {
    startY: number,
    startX: number,
    offsetY: number,
    active: boolean,
    isHorizontal: boolean
  }} */ (null));
  const pullYRef = useRef(0);
  const browClosingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [browDragging, setBrowDragging] = useState(false);
  const { data: trainings } = useTrainings();

  const trainingsById = useMemo(() => {
    const map = new Map();
    (trainings || []).forEach((training) => {
      map.set(training.id, training);
    });
    return map;
  }, [trainings]);

  const deletableCount = useMemo(
    () => notifications.filter(isDeletableNotification).length,
    [notifications]
  );

  const clearDropdownInlineStyles = useCallback(() => {
    const el = dropdownRef.current;
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
  }, []);

  useEffect(() => {
    if (open) {
      browClosingRef.current = false;
      pullYRef.current = 0;
      setBrowDragging(false);
      setMounted(true);
      const frame = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    setBrowDragging(false);

    if (browClosingRef.current) {
      browClosingRef.current = false;
      clearDropdownInlineStyles();
      pullYRef.current = 0;
      setMounted(false);
    }

    return undefined;
  }, [open, clearDropdownInlineStyles]);

  const handleDropdownTransitionEnd = useCallback((event) => {
    if (event.target !== dropdownRef.current) return;
    if (event.propertyName !== 'opacity') return;
    if (open) return;
    setMounted(false);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const anchor = notificationsAnchorRef.current;
    const dropdown = dropdownRef.current;
    if (!anchor || !dropdown) return;

    const anchorRect = anchor.getBoundingClientRect();
    const top = anchorRect.bottom + 2;

    dropdown.style.top = `${top}px`;
  }, [open, notificationsAnchorRef, notifications.length]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (dropdownRef.current?.contains(target)) return;
      if (notificationsAnchorRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, onClose, notificationsAnchorRef]);

  const applyBrowPull = useCallback((offsetY, withTransition) => {
    const el = dropdownRef.current;
    if (!el) return;
    el.style.transition = withTransition ? `transform ${BROW_CLOSE_MS}ms ease` : 'none';
    el.style.transform = `translateY(${-offsetY}px)`;
  }, []);

  const resetBrowPull = useCallback(
    (withTransition) => {
      applyBrowPull(0, withTransition);
      if (withTransition) {
        window.setTimeout(() => {
          if (browClosingRef.current) return;
          clearDropdownInlineStyles();
        }, BROW_CLOSE_MS);
      } else {
        clearDropdownInlineStyles();
      }
      pullYRef.current = 0;
      setBrowDragging(false);
    },
    [applyBrowPull, clearDropdownInlineStyles]
  );

  const commitCloseFromBrow = useCallback(() => {
    if (browClosingRef.current) return;
    browClosingRef.current = true;
    setBrowDragging(false);

    const el = dropdownRef.current;
    const y = Math.max(pullYRef.current, BROW_CLOSE_THRESHOLD);
    if (el) {
      el.style.transition = 'none';
      el.style.transform = `translateY(${-y}px)`;
      void el.offsetHeight;
      el.style.transition = `transform ${BROW_CLOSE_MS}ms ease`;
      el.style.transform = `translateY(${-(y + 48)}px)`;
    }

    window.setTimeout(() => {
      onClose();
    }, BROW_CLOSE_MS);
  }, [onClose]);

  const handleBrowTouchStart = useCallback((event) => {
    if (browClosingRef.current) return;
    const touch = event.touches[0];
    if (!touch) return;
    browGestureRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      offsetY: 0,
      active: false,
      isHorizontal: false
    };
  }, []);

  const handleBrowTouchMove = useCallback(
    (event) => {
      const gesture = browGestureRef.current;
      const touch = event.touches[0];
      if (!gesture || !touch || browClosingRef.current) return;

      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      if (!gesture.active) {
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          gesture.isHorizontal = true;
          return;
        }
        if (Math.abs(deltaY) < BROW_DRAG_DEADZONE) return;
        // Только тяга вверх
        if (deltaY > 0) {
          gesture.isHorizontal = true;
          return;
        }
        gesture.active = true;
        setBrowDragging(true);
      }

      if (gesture.isHorizontal) return;

      const offsetY = Math.max(0, -deltaY);
      gesture.offsetY = offsetY;
      pullYRef.current = offsetY;
      applyBrowPull(offsetY, false);
    },
    [applyBrowPull]
  );

  const handleBrowTouchEnd = useCallback(() => {
    const gesture = browGestureRef.current;
    browGestureRef.current = null;
    if (!gesture || browClosingRef.current) return;

    if (gesture.isHorizontal || !gesture.active) {
      setBrowDragging(false);
      return;
    }

    if (gesture.offsetY >= BROW_CLOSE_THRESHOLD) {
      commitCloseFromBrow();
      return;
    }

    resetBrowPull(true);
  }, [commitCloseFromBrow, resetBrowPull]);

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteNotification(id);
        onMutate();
      } catch (err) {
        error('delete notification:', err);
      }
    },
    [onMutate]
  );

  const handleClearAll = useCallback(async () => {
    if (clearing || deletableCount === 0) return;
    setClearing(true);
    try {
      await clearAllNotifications(userId);
      onMutate();
    } catch (err) {
      error('clear notifications:', err);
    } finally {
      setClearing(false);
    }
  }, [clearing, deletableCount, onMutate, userId]);

  const handleOpenTraining = useCallback(
    (trainingId) => {
      onOpenTraining?.(trainingId);
      onClose();
    },
    [onClose, onOpenTraining]
  );

  const handleOpenMembership = useCallback(() => {
    onOpenMembership?.();
    onClose();
  }, [onClose, onOpenMembership]);

  const handleOpenBooking = useCallback(() => {
    onOpenBooking?.();
    onClose();
  }, [onClose, onOpenBooking]);

  const handleOpenComment = useCallback(
    (meta) => {
      onOpenComment?.(meta);
      onClose();
    },
    [onClose, onOpenComment]
  );

  if (!mounted) return null;

  return (
    <div
      ref={dropdownRef}
      className={clsx(
        'notifications-dropdown',
        isVisible && 'notifications-dropdown--visible',
        browDragging && 'notifications-dropdown--brow-dragging'
      )}
      role="dialog"
      aria-label="Уведомления"
      aria-hidden={!open}
      onTransitionEnd={handleDropdownTransitionEnd}
    >
      {notifications.length === 0 ? (
        <p className="notifications-dropdown__empty">Уведомлений нет</p>
      ) : (
        <div ref={listRef} className="notifications-dropdown__list">
          {notifications.map((notification) => {
            const meta = /** @type {{ trainingId?: string } | undefined} */ (notification.meta);
            const trainingId = notification.training_id || meta?.trainingId;
            return (
              <NotificationCard
                key={String(notification.id)}
                notification={notification}
                userId={userId}
                training={trainingId ? trainingsById.get(trainingId) : null}
                scrollRootRef={listRef}
                onMarkRead={onMutate}
                onDelete={handleDelete}
                onOpenTraining={handleOpenTraining}
                onOpenMembership={handleOpenMembership}
                onOpenBooking={handleOpenBooking}
                onOpenComment={handleOpenComment}
              />
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="notifications-dropdown__clear"
        aria-label="Удалить все уведомления"
        disabled={clearing || deletableCount === 0}
        onClick={handleClearAll}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>

      <div
        className="notifications-dropdown__brow"
        role="button"
        tabIndex={0}
        aria-label="Закрыть уведомления"
        onTouchStart={handleBrowTouchStart}
        onTouchMove={handleBrowTouchMove}
        onTouchEnd={handleBrowTouchEnd}
        onTouchCancel={handleBrowTouchEnd}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <span className="notifications-dropdown__brow-bar" aria-hidden="true" />
      </div>
    </div>
  );
}
