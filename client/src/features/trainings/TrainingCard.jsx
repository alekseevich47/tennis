import React, { memo, useCallback } from 'react';
import clsx from 'clsx';
import IconButton from '../../components/ui/IconButton';
import { formatCardDate, formatTimeRange } from '../../lib/format';

/**
 * @param {{
 *   training: import('../../services/trainings').TrainingRecord,
 *   userId?: string,
 *   userIsModerator: boolean,
 *   onOpen: (training: any) => void,
 *   onBook: (training: any) => void,
 *   onCancelBooking: (training: any) => void,
 *   onDelete: (trainingId: string) => void
 * }} props
 */
function TrainingCard({ training, userId, userIsModerator, onOpen, onBook, onCancelBooking, onDelete }) {
  const handleOpen = useCallback(() => onOpen(training), [onOpen, training]);
  const handleBook = useCallback(
    (e) => {
      e.stopPropagation();
      onBook(training);
    },
    [onBook, training]
  );
  const handleCancel = useCallback(
    (e) => {
      e.stopPropagation();
      onCancelBooking(training);
    },
    [onCancelBooking, training]
  );
  const handleDelete = useCallback(
    (e) => {
      e.stopPropagation();
      onDelete(training.id);
    },
    [onDelete, training.id]
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

  return (
    <div
      className={clsx('training-row-card', `neon-border-${training.type}`)}
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
          {training.type === 'group' ? 'Групповая тренировка' : 'Турнир секции'}
        </span>
      </div>

      <div className="card-actions-info-col">
        {hasLimit ? (
          <span className="card-slots-counter">
            {totalBooked} / {training.max_slots} мест
          </span>
        ) : (
          <span className="card-slots-counter no-limit-label">Запись открыта</span>
        )}

        <div className="card-buttons-wrapper">
          {isUserBooked ? (
            <IconButton
              ariaLabel="Отменить запись на тренировку"
              variant="ghost"
              size="sm"
              className="action-circle-btn btn-cancel-cross"
              onClick={handleCancel}
            >
              <span aria-hidden="true">✕</span>
            </IconButton>
          ) : isFull ? (
            <button type="button" className="text-status-full-label" disabled>
              Мест нет
            </button>
          ) : (
            <IconButton
              ariaLabel="Записаться на тренировку"
              variant="ghost"
              size="sm"
              className="action-circle-btn btn-add-plus"
              onClick={handleBook}
            >
              <span aria-hidden="true">+</span>
            </IconButton>
          )}

          {userIsModerator && (
            <IconButton
              ariaLabel="Удалить тренировку"
              variant="ghost"
              size="sm"
              className="action-circle-btn btn-delete-trash"
              onClick={handleDelete}
            >
              <span aria-hidden="true">🗑️</span>
            </IconButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(TrainingCard);
