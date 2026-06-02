import React from 'react';
import EmptyState from '../../../components/ui/EmptyState';
import Modal from '../../../components/ui/Modal';
import { formatCardDate, formatTimeRange } from '../../../lib/format';
import '../Trainings.css';

/**
 * @param {{
 *   isOpen: boolean,
 *   trainings: any[],
 *   onClose: () => void,
 *   onOpenDetail: (training: any) => void
 * }} props
 */
function ArchiveModal({ isOpen, trainings, onClose, onOpenDetail }) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Архив тренировок"
      ariaLabel="Список прошедших тренировок"
    >
      <div className="archive-list">
        {trainings.length === 0 ? (
          <EmptyState title="Пусто" description="Прошедших тренировок пока нет." />
        ) : (
          trainings.map((training) => (
            <div
              key={training.id}
              className="training-row-card archive-card"
              onClick={() => onOpenDetail(training)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenDetail(training);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Тренировка ${formatCardDate(training.date)}, ${formatTimeRange(training.date, training.duration)}`}
            >
              <div className="card-main-info-col">
                <span className="card-row-date">{formatCardDate(training.date)}</span>
                <span className="card-row-time">
                  {formatTimeRange(training.date, training.duration)}
                </span>
                <span className="card-row-type-label">
                  {training.type === 'group' ? 'Групповая тренировка' : 'Турнир секции'}
                </span>
              </div>

              <div className="card-actions-info-col">
                <span className="card-status-badge card-status-badge--closed">
                  Тренировка завершена
                </span>
                <span className="card-slots-counter">
                  {training.booked_users?.length || 0} участников
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

export default ArchiveModal;
