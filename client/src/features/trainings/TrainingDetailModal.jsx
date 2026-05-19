import React from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { formatCardDate, formatTimeRange } from '../../lib/format';
import { updateTraining } from '../../services/trainings';
import { error } from '../../lib/log';

/**
 * @param {{
 *   isOpen: boolean,
 *   training: any | null,
 *   userIsModerator: boolean,
 *   onClose: () => void,
 *   onMutated: () => void
 * }} props
 */
function TrainingDetailModal({ isOpen, training, userIsModerator, onClose, onMutated }) {
  const { confirm, alert } = useAlertDialog();

  if (!training) return null;

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="tall"
      ariaLabel="Детали тренировки и список участников"
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
        <h3>Записанные игроки ({training.booked_users?.length || 0})</h3>
        <div className="participants-list-wrapper">
          {!training.expand?.booked_users || training.expand.booked_users.length === 0 ? (
            <p className="no-players-text">На эту тренировку пока никто не записался.</p>
          ) : (
            training.expand.booked_users.map((player) => (
              <div key={player.id} className="player-list-row">
                <div className="player-meta-left">
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
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

export default TrainingDetailModal;
