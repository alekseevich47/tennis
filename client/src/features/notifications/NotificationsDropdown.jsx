import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useTrainings } from '../../hooks/useTrainings';
import { clearAllNotifications, deleteNotification } from '../../services/notifications';
import { error } from '../../lib/log';
import NotificationCard from './NotificationCard';
import './NotificationsDropdown.css';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   userId: string,
 *   notifications: Record<string, unknown>[],
 *   onMutate: () => void,
 *   notificationsAnchorRef: React.RefObject<HTMLElement | null>,
 *   onOpenTraining?: (trainingId: string) => void,
 *   onOpenMembership?: () => void
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
  onOpenMembership
}) {
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { data: trainings } = useTrainings();

  const trainingsById = useMemo(() => {
    const map = new Map();
    (trainings || []).forEach((training) => {
      map.set(training.id, training);
    });
    return map;
  }, [trainings]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    return undefined;
  }, [open]);

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
    const top = anchorRect.bottom + 8;

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
    if (clearing || notifications.length === 0) return;
    setClearing(true);
    try {
      await clearAllNotifications(userId);
      onMutate();
    } catch (err) {
      error('clear notifications:', err);
    } finally {
      setClearing(false);
    }
  }, [clearing, notifications.length, onMutate, userId]);

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

  if (!mounted) return null;

  return (
    <div
      ref={dropdownRef}
      className={clsx('notifications-dropdown', isVisible && 'notifications-dropdown--visible')}
      role="dialog"
      aria-label="Уведомления"
      aria-hidden={!open}
      onTransitionEnd={handleDropdownTransitionEnd}
    >
      <div className="notifications-dropdown__toolbar">
        <button
          type="button"
          className="notifications-dropdown__clear"
          aria-label="Удалить все уведомления"
          disabled={clearing || notifications.length === 0}
          onClick={handleClearAll}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>

      {notifications.length === 0 ? (
        <p className="notifications-dropdown__empty">Уведомлений нет</p>
      ) : (
        <div ref={listRef} className="notifications-dropdown__list">
          {notifications.map((notification) => {
            const meta = /** @type {{ trainingId?: string } | undefined} */ (notification.meta);
            const trainingId = meta?.trainingId;
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
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
