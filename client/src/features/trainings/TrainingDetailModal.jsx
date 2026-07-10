import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import Avatar from '../../components/ui/Avatar';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { formatCardDate, formatTimeRange, hasTimeRangeEnded } from '../../lib/format';
import {
  bookUsersToTraining,
  markAttendance,
  removeUsersFromTraining,
  unmarkAttendance
} from '../../services/trainings';
import { BOT_BLOCKED_BOOKING_MESSAGE } from '../../services/auth';
import { error } from '../../lib/log';
import UserPickerModal from './components/UserPickerModal';
import ProfileViewModal from '../profile/ProfileViewModal';

/**
 * @param {{
 *   isOpen: boolean,
 *   training: any | null,
 *   userIsModerator: boolean,
 *   onClose: () => void,
 *   onMutated: () => void,
 *   onToggleClose?: (training: any) => void,
 *   onEdit?: (training: any) => void,
 *   onDelete?: (trainingId: string) => void,
 *   currentUser?: any
 * }} props
 */
function TrainingDetailModal({
  isOpen,
  training,
  userIsModerator,
  onClose,
  onMutated,
  onToggleClose,
  onEdit,
  onDelete,
  currentUser
}) {
  const { confirm, alert } = useAlertDialog();
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setIsUserPickerOpen(false);
      setViewingPlayer(null);
    }
  }, [isOpen]);

  const handleProfileMutated = useCallback(
    (updatedPlayer) => {
      if (updatedPlayer?.id) setViewingPlayer(updatedPlayer);
      onMutated();
    },
    [onMutated]
  );

  if (!training) return null;

  const bookedUserIds = training.booked_users || [];
  const bookedUserIdSet = new Set(bookedUserIds);
  const restoreInsufficientPlayers = training.expand?.restore_insufficient_users || [];
  const restoreInsufficientIdSet = new Set(restoreInsufficientPlayers.map((p) => p.id));
  const unbookedPlayers = (training.expand?.unbooked_users || []).filter(
    (player) => !bookedUserIdSet.has(player.id) && !restoreInsufficientIdSet.has(player.id)
  );
  const hasLimit = training.max_slots !== null && training.max_slots !== undefined && training.max_slots > 0;
  const isFull = hasLimit && bookedUserIds.length >= (training.max_slots || 0);
  const isClosed = training.is_closed === true;
  const hasEnded = hasTimeRangeEnded(training.date, training.duration || 0);
  const effectivelyClosed = isClosed || hasEnded;

  const handleKick = async (userId) => {
    const ok = await confirm({
      title: 'Исключение',
      message: 'Отменить запись этого игрока принудительно?'
    });
    if (!ok) return;
    try {
      await removeUsersFromTraining(training, [userId]);
      onMutated();
    } catch (err) {
      error('kick player:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось исключить участника.' });
    }
  };

  const handleAttendanceChange = async (playerId, checked) => {
    try {
      if (checked) {
        await markAttendance(training, playerId);
      } else {
        await unmarkAttendance(training, playerId);
      }
      onMutated();
    } catch (err) {
      error('toggle attendance:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось обновить посещаемость.' });
    }
  };

  const handleConfirmBookingUsers = async (selectedUserIds, selectedUsers) => {
    try {
      await bookUsersToTraining(training, selectedUserIds, selectedUsers);
      onMutated();
      setIsUserPickerOpen(false);
    } catch (err) {
      if (/** @type {{ code?: string }} */ (err).code === 'BOT_BLOCKED') {
        await alert({ title: 'Запись невозможна', message: BOT_BLOCKED_BOOKING_MESSAGE });
        return;
      }
      if (/** @type {{ code?: string }} */ (err).code === 'MEMBERSHIP_FROZEN') {
        await alert({ title: 'Запись невозможна', message: /** @type {Error} */ (err).message });
        return;
      }
      if (/** @type {{ code?: string }} */ (err).code === 'NO_AVAILABLE_SESSIONS') {
        await alert({ title: 'Запись невозможна', message: 'Нет доступных посещений.' });
        return;
      }
      if (/** @type {{ code?: string }} */ (err).code === 'ANNUAL_DAILY_LIMIT') {
        const ok = await confirm({
          title: 'Годовой абонемент',
          message: 'Один или несколько игроков уже записаны на тренировку в этот день (лимит: 1 в день). Записать принудительно?',
          confirmText: 'Записать',
          cancelText: 'Отмена'
        });
        if (!ok) return;
        await bookUsersToTraining(training, selectedUserIds, selectedUsers, { overrideAnnualLimit: true });
        onMutated();
        setIsUserPickerOpen(false);
        return;
      }
      error('book users to training:', err);
      await alert({
        title: 'Ошибка',
        message: /** @type {Error} */ (err).message || 'Не удалось записать игрока.'
      });
    }
  };

  const handleCopyTrainingId = async () => {
    try {
      await navigator.clipboard.writeText(training.id);
      await alert({ title: 'Скопировано', message: 'ID тренировки скопирован в буфер обмена.' });
    } catch {
      await alert({ title: 'Не получилось', message: 'Скопируйте ID вручную.' });
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="tall"
        ariaLabel="Детали тренировки и список участников"
        showCloseButton={false}
      >
        <div className="detail-header-row">
          <span className="detail-badge-type">
            {training.type === 'group' ? 'Групповой сбор' : 'Турнирная сетка'}
          </span>
          <div className="detail-header-actions">
            {userIsModerator && !training.is_deleted && (
              <>
                {!hasEnded && (
                  <IconButton
                    ariaLabel={training.is_closed ? 'Открыть запись на тренировку' : 'Закрыть запись на тренировку'}
                    variant="ghost"
                    size="sm"
                    className={clsx('action-circle-btn btn-stop', training.is_closed && 'btn-stop-play')}
                    disabled={!onToggleClose}
                    onClick={() => onToggleClose?.(training)}
                  >
                    {training.is_closed ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M8 5v14l11-7L8 5Z" />
                      </svg>
                    ) : (
                      <span aria-hidden="true">■</span>
                    )}
                  </IconButton>
                )}
                <IconButton
                  ariaLabel="Редактировать тренировку"
                  variant="ghost"
                  size="sm"
                  className="action-circle-btn btn-edit"
                  disabled={!onEdit}
                  onClick={() => onEdit?.(training)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M4 20h4.2L19.3 8.9a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
                    <path d="m13.7 6.1 4.2 4.2" />
                  </svg>
                </IconButton>
                <IconButton
                  ariaLabel="Удалить тренировку"
                  variant="ghost"
                  size="sm"
                  className="action-circle-btn btn-delete-trash"
                  disabled={!onDelete}
                  onClick={() => onDelete?.(training.id)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M4 7h16" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M6 7l1 13h10l1-13" />
                    <path d="M9 7V4h6v3" />
                  </svg>
                </IconButton>
              </>
            )}
            <IconButton
              type="button"
              className="ui-modal-close"
              ariaLabel="Закрыть"
              onClick={onClose}
            >
              <span aria-hidden="true">✕</span>
            </IconButton>
          </div>
        </div>
        <h2 className="detail-title-date">{formatCardDate(training.date)}</h2>
        <p className="detail-time-range">
          <span aria-hidden="true">⏱️</span> {formatTimeRange(training.date, training.duration)}
        </p>
        <p className="detail-location-text">
          <span aria-hidden="true">📍</span> {training.location}
        </p>
        {userIsModerator && (
          <button
            type="button"
            className="training-detail-id"
            onClick={handleCopyTrainingId}
          >
            ID: {training.id} <span aria-hidden="true">📋</span>
          </button>
        )}

        {training.description && (
          <div className="detail-desc-box">
            <h3>Описание от организатора</h3>
            <p>{training.description}</p>
          </div>
        )}

        <div className="detail-participants-section">
          <div className="detail-booking-status-row">
            {!isFull && (
              <span
                className={clsx(
                  'card-status-badge',
                  effectivelyClosed ? 'card-status-badge--closed' : 'card-status-badge--open'
                )}
              >
                {hasEnded ? 'Тренировка завершена' : effectivelyClosed ? 'Запись закрыта' : 'Запись открыта'}
              </span>
            )}
            {hasLimit && (
              <>
                <span className="card-slots-counter">
                  {bookedUserIds.length} / {training.max_slots} мест
                </span>
                {isFull && <span className="card-slots-badge-full">Мест нет</span>}
              </>
            )}
          </div>
          <h3>
            Записанные игроки ({bookedUserIds.length})
            {userIsModerator && (
              <IconButton
                ariaLabel="Записать игрока на тренировку"
                variant="ghost"
                size="sm"
                className="action-circle-btn btn-add-plus"
                disabled={isFull || training.is_deleted}
                onClick={() => setIsUserPickerOpen(true)}
              >
                <span aria-hidden="true">+</span>
              </IconButton>
            )}
          </h3>
          <div className="participants-list-wrapper">
            {!training.expand?.booked_users || training.expand.booked_users.length === 0 ? (
              <p className="no-players-text">На эту тренировку пока никто не записался.</p>
            ) : (
              training.expand.booked_users.map((player) => (
                <div key={player.id} className="player-list-row">
                  <div className="player-meta-left">
                    {userIsModerator && !training.is_deleted && (
                      <input
                        type="checkbox"
                        className="attendance-checkbox"
                        checked={training.attended_users?.includes(player.id) || false}
                        aria-label={`Отметить посещение: ${player.full_name || 'Теннисист'}`}
                        onChange={(event) => handleAttendanceChange(player.id, event.target.checked)}
                      />
                    )}
                    <button
                      type="button"
                      className="training-player-profile-link"
                      onClick={() => setViewingPlayer(player)}
                    >
                      <Avatar
                        user={player}
                        size="sm"
                        className="training-player-avatar"
                        alt={player.full_name || 'Теннисист'}
                      />
                      <span className="player-name-label">{player.full_name || 'Теннисист'}</span>
                    </button>
                  </div>
                  {userIsModerator && !training.is_deleted && (
                    <button
                      type="button"
                      className="kick-player-btn"
                      onClick={() => handleKick(player.id)}
                    >
                      Отменить запись
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          {userIsModerator && unbookedPlayers.length > 0 && (
            <>
              <h3>Снявшие запись ({unbookedPlayers.length})</h3>
              <div className="participants-list-wrapper">
                {unbookedPlayers.map((player) => (
                  <div key={player.id} className="player-list-row player-row--unbooked">
                    <div className="player-meta-left">
                      <Avatar
                        user={player}
                        size="sm"
                        className="training-player-avatar"
                        alt={player.full_name || 'Теннисист'}
                      />
                      <span className="player-name-label">{player.full_name || 'Теннисист'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {userIsModerator && restoreInsufficientPlayers.length > 0 && (
            <>
              <h3>Не хватило посещений для восстановления ({restoreInsufficientPlayers.length})</h3>
              <div className="participants-list-wrapper">
                {restoreInsufficientPlayers.map((player) => (
                  <div key={player.id} className="player-list-row">
                    <div className="player-meta-left">
                      <Avatar
                        user={player}
                        size="sm"
                        className="training-player-avatar"
                        alt={player.full_name || 'Теннисист'}
                      />
                      <span className="player-name-label">{player.full_name || 'Теннисист'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      <UserPickerModal
        isOpen={isUserPickerOpen}
        onClose={() => setIsUserPickerOpen(false)}
        onConfirm={handleConfirmBookingUsers}
        excludeIds={bookedUserIds}
      />

      <ProfileViewModal
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
        targetUser={viewingPlayer}
        currentUser={currentUser}
        onMutated={handleProfileMutated}
      />
    </>
  );
}

export default TrainingDetailModal;
