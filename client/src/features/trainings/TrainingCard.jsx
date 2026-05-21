import React, { memo, useCallback } from 'react';
import clsx from 'clsx';
import IconButton from '../../components/ui/IconButton';
import Spinner from '../../components/ui/Spinner';
import { formatCardDate, formatTimeRange } from '../../lib/format';
import { isModerator } from '../../services/auth';

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
 *   onEdit?: (training: any) => void,
 *   onDelete: (trainingId: string) => void,
 *   onRestore?: (trainingId: string) => void
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
  onEdit,
  onDelete,
  onRestore
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
  const handleDelete = useCallback(
    (e) => {
      e.stopPropagation();
      onDelete(training.id);
    },
    [onDelete, training.id]
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
  const handleEdit = useCallback(
    (e) => {
      e.stopPropagation();
      onEdit?.(training);
    },
    [onEdit, training]
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
  const isBookingLocked = isClosed || new Date(training.date) <= new Date();

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
          {training.type === 'group' ? 'Групповая тренировка' : 'Турнир секции'}
        </span>
      </div>

      <div className="card-actions-info-col">
        <div className="card-slots-row">
          {hasLimit ? (
            <>
              <span className="card-slots-counter">
                {totalBooked} / {training.max_slots} мест
              </span>
              {isFull && <span className="card-slots-badge-full">Мест нет</span>}
            </>
          ) : (
            <span className={clsx('card-slots-counter', { 'no-limit-label': !isClosed })}>
              {isClosed ? 'Запись закрыта' : 'Запись открыта'}
            </span>
          )}
        </div>

        <div className="card-buttons-wrapper">
          {training.is_deleted && userIsModerator ? (
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
            <IconButton
              ariaLabel="Отменить запись на тренировку"
              variant="ghost"
              size="sm"
              className="action-circle-btn btn-cancel-cross"
              onClick={handleCancel}
            >
              <span aria-hidden="true">✕</span>
            </IconButton>
          ) : !userIsModerator && isUserBooked ? (
            <span className="text-status-full-label card-booked-status-label">Вы записаны</span>
          ) : isFull ? (
            null
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

          {userIsModerator && !training.is_deleted && (
            <>
              <IconButton
                ariaLabel={training.is_closed ? 'Открыть запись на тренировку' : 'Закрыть запись на тренировку'}
                variant="ghost"
                size="sm"
                className="action-circle-btn btn-stop"
                onClick={handleToggleClose}
              >
                <span aria-hidden="true">■</span>
              </IconButton>
              <IconButton
                ariaLabel="Редактировать тренировку"
                variant="ghost"
                size="sm"
                className="action-circle-btn btn-edit"
                onClick={handleEdit}
              >
                <span aria-hidden="true">✏️</span>
              </IconButton>
              <IconButton
                ariaLabel="Удалить тренировку"
                variant="ghost"
                size="sm"
                className="action-circle-btn btn-delete-trash"
                onClick={handleDelete}
              >
                <span aria-hidden="true">🗑️</span>
              </IconButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(TrainingCard);
