import React, { memo, useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import IconButton from '../../components/ui/IconButton';
import Spinner from '../../components/ui/Spinner';
import { formatCardDate, formatTimeRange, hasTimeRangeEnded } from '../../lib/format';
import { formatTrainingCountdownBadge } from '../notifications/notificationBadges';
import { isModerator } from '../../services/auth';

const COUNTDOWN_TICK_MS = 30_000;

/**
 * @param {{
 *   training: import('../../services/trainings').TrainingRecord,
 *   userId?: string,
 *   isDeleting?: boolean,
 *   onOpen: (training: any) => void,
 *   onBook: (training: any) => void,
 *   onBookUser?: (training: any) => void,
 *   onCancelBooking: (training: any) => void,
 *   onToggleClose?: (training: any) => void,
 *   onRestore?: (trainingId: string) => void,
 *   canSelfBook?: boolean,
 *   hideStatusBadge?: boolean,
 *   hideSlots?: boolean,
 *   showCountdown?: boolean,
 *   cancelOnly?: boolean,
 *   cancelDisabled?: boolean
 * }} props
 */
function TrainingCard({
  training,
  userId,
  isDeleting = false,
  onOpen,
  onBook,
  onBookUser,
  onCancelBooking,
  onToggleClose,
  onRestore,
  canSelfBook = true,
  hideStatusBadge = false,
  hideSlots = false,
  showCountdown = false,
  cancelOnly = false,
  cancelDisabled = false
}) {
  const userIsModerator = isModerator();
  const handleOpen = useCallback(() => onOpen(training), [onOpen, training]);
  const handleBook = useCallback(
    (e) => {
      e.stopPropagation();
      if (userIsModerator) onBookUser?.(training);
      else onBook(training);
    },
    [onBook, onBookUser, training, userIsModerator]
  );
  const handleCancel = useCallback(
    (e) => {
      e.stopPropagation();
      onCancelBooking(training);
    },
    [onCancelBooking, training]
  );
  const handleRestore = useCallback(
    (e) => {
      e.stopPropagation();
      onRestore?.(training.id);
    },
    [onRestore, training.id]
  );
  const handleToggleClose = useCallback(
    (e) => {
      e.stopPropagation();
      onToggleClose?.(training);
    },
    [onToggleClose, training]
  );
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen(training);
      }
    },
    [onOpen, training]
  );

  const isUserBooked = userId ? training.booked_users?.includes(userId) : false;
  const totalBooked = training.booked_users?.length || 0;
  const hasLimit = training.max_slots !== null && training.max_slots !== undefined && training.max_slots > 0;
  const isFull = hasLimit && totalBooked >= (training.max_slots || 0);
  const isClosed = training.is_closed === true;
  const hasEnded = hasTimeRangeEnded(training.date, training.duration || 0);
  const effectivelyClosed = isClosed || hasEnded;
  const isBookingLocked = effectivelyClosed;

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!showCountdown) return undefined;
    const id = window.setInterval(() => setNowTick(Date.now()), COUNTDOWN_TICK_MS);
    return () => window.clearInterval(id);
  }, [showCountdown, training.id, training.date]);

  const countdownLabel = showCountdown
    ? formatTrainingCountdownBadge(training, new Date(nowTick), userId)
    : null;

  return (
    <div
      className={clsx('training-row-card', `neon-border-${training.type}`, {
        'training-row-card--deleted': training.is_deleted
      })}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Тренировка ${formatCardDate(training.date)}, ${formatTimeRange(training.date, training.duration)}`}
    >
      <div className="card-main-info-col">
        <span className="card-row-date">{formatCardDate(training.date)}</span>
        <span className="card-row-time">{formatTimeRange(training.date, training.duration)}</span>
        <span className="card-row-type-label">
          {training.type === 'group' ? 'Тренировка' : 'Турнир секции'}
          {!hideSlots && (
            <span className="card-row-slots-text">
              {' '}
              ({totalBooked}/{hasLimit ? Math.max(0, (training.max_slots || 0) - totalBooked) : '∞'})
            </span>
          )}
        </span>
      </div>

      <div className="card-actions-info-col">
        {showCountdown && countdownLabel ? (
          <div className="card-slots-row">
            <span className="card-countdown-badge" aria-live="polite">
              {countdownLabel}
            </span>
          </div>
        ) : !hideStatusBadge ? (
          <div className="card-slots-row">
            <span
              className={clsx(
                'card-status-badge',
                effectivelyClosed ? 'card-status-badge--closed' : 'card-status-badge--open'
              )}
            >
              {hasEnded ? 'Тренировка завершена' : (isClosed ? 'Запись закрыта' : 'Запись открыта')}
            </span>
          </div>
        ) : null}

        <div className="card-buttons-wrapper">
          {cancelOnly ? (
            isUserBooked ? (
              <button
                type="button"
                className="training-action-text-btn training-action-text-btn--cancel"
                disabled={cancelDisabled}
                onClick={handleCancel}
              >
                Снять запись
              </button>
            ) : null
          ) : training.is_deleted && userIsModerator ? (
            isDeleting ? (
              <div className="restore-button-spinner" onClick={(e) => e.stopPropagation()}>
                <Spinner label="Удаляем..." inline />
              </div>
            ) : (
              <button
                type="button"
                className="text-status-full-label btn-restore"
                onClick={handleRestore}
              >
                Восстановить
              </button>
            )
          ) : !userIsModerator && isUserBooked && !isBookingLocked ? (
            <button
              type="button"
              className="training-action-text-btn training-action-text-btn--cancel"
              onClick={handleCancel}
            >
              Снять запись
            </button>
          ) : !userIsModerator && isUserBooked ? (
            <span className="text-status-full-label card-booked-status-label">Вы записаны</span>
          ) : isFull ? (
            null
          ) : !userIsModerator ? (
            <button
              type="button"
              className="training-action-text-btn training-action-text-btn--book"
              disabled={isBookingLocked || !canSelfBook}
              onClick={handleBook}
            >
              Записаться
            </button>
          ) : (
            <IconButton
              ariaLabel="Записаться на тренировку"
              variant="ghost"
              size="sm"
              className="action-circle-btn btn-add-plus"
              disabled={isBookingLocked}
              onClick={handleBook}
            >
              <span aria-hidden="true">+</span>
            </IconButton>
          )}

          {!cancelOnly && userIsModerator && !training.is_deleted && !hasEnded && (
            <>
              <IconButton
                ariaLabel={training.is_closed ? 'Открыть запись на тренировку' : 'Закрыть запись на тренировку'}
                variant="ghost"
                size="sm"
                className={clsx('action-circle-btn btn-stop', training.is_closed && 'btn-stop-play')}
                onClick={handleToggleClose}
              >
                {training.is_closed ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M8 5v14l11-7L8 5Z" />
                  </svg>
                ) : (
                  <span aria-hidden="true">■</span>
                )}
              </IconButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(TrainingCard);
