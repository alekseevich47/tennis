import React, { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { formatCardDate, formatTimeRange } from '../../lib/format';
import { updateTraining, bookUserToTraining } from '../../services/trainings';
import { getCurrentUser } from '../../services/auth';
import { error } from '../../lib/log';
import UserPickerModal from './components/UserPickerModal';

/**
 * @param {{
 *   isOpen: boolean,
 *   training: any | null,
 *   userId?: string,
 *   userIsModerator: boolean,
 *   onClose: () => void,
 *   onMutated: () => void,
 *   onToggleClose?: (training: any) => void,
 *   onEdit?: (training: any) => void,
 *   onDelete?: (trainingId: string) => void,
 *   onToggleAttendance?: (training: any, userId: string) => void
 * }} props
 */
function TrainingDetailModal({
  isOpen,
  training,
  userId,
  userIsModerator,
  onClose,
  onMutated,
  onToggleClose,
  onEdit,
  onDelete,
  onToggleAttendance
}) {
  const { confirm, alert } = useAlertDialog();
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) setIsUserPickerOpen(false);
  }, [isOpen]);

  if (!training) return null;

  const currentUserId = userId || getCurrentUser()?.id;
  const bookedUserIds = training.booked_users || [];
  const attendedUserIds = training.attended_users || [];
  const hasLimit = training.max_slots !== null && training.max_slots !== undefined && training.max_slots > 0;
  const isFull = hasLimit && bookedUserIds.length >= (training.max_slots || 0);
  const isBookingLocked = training.is_closed === true || new Date(training.date) <= new Date();

  const handleKick = async (userId) => {
    const ok = await confirm({
      title: 'Исключение',
      message: 'Отменить запись этого игрока принудительно?'
    });
    if (!ok) return;
    try {
      const currentBooked = training.booked_users || [];
      await updateTraining(training.id, {
        booked_users: currentBooked.filter((id) => id !== userId)
      });
      onMutated();
    } catch (err) {
      error('kick player:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось исключить участника.' });
    }
  };

  const handleSelectUser = async (selectedUserId) => {
    try {
      await bookUserToTraining(training, selectedUserId);
      setIsUserPickerOpen(false);
      onMutated();
    } catch (err) {
      error('book user to training:', err);
      await alert({
        title: 'Ошибка',
        message: /** @type {Error} */ (err).message || 'Не удалось записать игрока.'
      });
    }
  };

  const moderatorActions = userIsModerator && !training.is_deleted ? (
    <div className="card-buttons-wrapper">
      <IconButton
        ariaLabel={training.is_closed ? 'Открыть запись на тренировку' : 'Закрыть запись на тренировку'}
        variant="ghost"
        size="sm"
        className="action-circle-btn btn-stop"
        disabled={!onToggleClose}
        onClick={() => onToggleClose?.(training)}
      >
        <span aria-hidden="true">■</span>
      </IconButton>
      <IconButton
        ariaLabel="Редактировать тренировку"
        variant="ghost"
        size="sm"
        className="action-circle-btn btn-edit"
        disabled={!onEdit}
        onClick={() => onEdit?.(training)}
      >
        <span aria-hidden="true">✏️</span>
      </IconButton>
      <IconButton
        ariaLabel="Удалить тренировку"
        variant="ghost"
        size="sm"
        className="action-circle-btn btn-delete-trash"
        disabled={!onDelete}
        onClick={() => onDelete?.(training.id)}
      >
        <span aria-hidden="true">🗑️</span>
      </IconButton>
    </div>
  ) : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="tall"
        ariaLabel="Детали тренировки и список участников"
        footer={moderatorActions}
      >
        <span className="detail-badge-type">
          {training.type === 'group' ? 'Групповой сбор' : 'Турнирная сетка'}
        </span>
        <h2 className="detail-title-date">{formatCardDate(training.date)}</h2>
        <p className="detail-time-range">
          <span aria-hidden="true">⏱️</span> {formatTimeRange(training.date, training.duration)}
        </p>
        <p className="detail-location-text">
          <span aria-hidden="true">📍</span> {training.location}
        </p>

        {training.description && (
          <div className="detail-desc-box">
            <h3>Описание от организатора</h3>
            <p>{training.description}</p>
          </div>
        )}

        <div className="detail-participants-section">
          <h3>
            Записанные игроки ({bookedUserIds.length})
            {userIsModerator && (
              <IconButton
                ariaLabel="Записать игрока на тренировку"
                variant="ghost"
                size="sm"
                className="action-circle-btn btn-add-plus"
                disabled={isBookingLocked || isFull}
                onClick={() => setIsUserPickerOpen(true)}
              >
                <span aria-hidden="true">+</span>
              </IconButton>
            )}
          </h3>
          {isBookingLocked && <p className="no-players-text">Запись закрыта</p>}
          <div className="participants-list-wrapper">
            {!training.expand?.booked_users || training.expand.booked_users.length === 0 ? (
              <p className="no-players-text">На эту тренировку пока никто не записался.</p>
            ) : (
              training.expand.booked_users.map((player) => {
                const canToggleAttendance = userIsModerator || player.id === currentUserId;
                return (
                  <div key={player.id} className="player-list-row">
                    <div className="player-meta-left">
                      <input
                        type="checkbox"
                        checked={attendedUserIds.includes(player.id)}
                        disabled={!canToggleAttendance || !onToggleAttendance}
                        onChange={() => onToggleAttendance?.(training, player.id)}
                        aria-label={`Посещение: ${player.full_name || 'Теннисист'}`}
                      />
                      <div className="player-avatar-mini" aria-hidden="true">👤</div>
                      <span className="player-name-label">{player.full_name || 'Теннисист'}</span>
                    </div>
                    {userIsModerator && (
                      <button
                        type="button"
                        className="kick-player-btn"
                        onClick={() => handleKick(player.id)}
                      >
                        Отменить запись
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      <UserPickerModal
        isOpen={isUserPickerOpen}
        onClose={() => setIsUserPickerOpen(false)}
        onSelect={handleSelectUser}
        excludeIds={bookedUserIds}
      />
    </>
  );
}

export default TrainingDetailModal;
