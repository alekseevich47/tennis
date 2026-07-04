import React, { useMemo, useState } from 'react';
import EmptyState from '../../../components/ui/EmptyState';
import IconButton from '../../../components/ui/IconButton';
import Modal from '../../../components/ui/Modal';
import { isDateQueryParsed, matchesDateQuery, parseDateQuery } from '../../../lib/dateSearch';
import { formatCardDateWithYear, formatTimeRange } from '../../../lib/format';
import '../Trainings.css';

/** @typedef {'all' | 'completed' | 'cancelled'} ArchiveCategory */

/**
 * @param {{
 *   isOpen: boolean,
 *   trainings: any[],
 *   onClose: () => void,
 *   onOpenDetail: (training: any) => void
 * }} props
 */
function ArchiveModal({ isOpen, trainings, onClose, onOpenDetail }) {
  const [searchQuery, setSearchQuery] = useState('');
  /** @type {[ArchiveCategory, React.Dispatch<React.SetStateAction<ArchiveCategory>>]} */
  const [category, setCategory] = useState(/** @type {ArchiveCategory} */ ('all'));

  const filtered = useMemo(() => {
    const byCategory = trainings.filter((training) => {
      if (category === 'cancelled') return training.is_cancelled === true;
      if (category === 'completed') return training.is_cancelled !== true;
      return true;
    });

    if (!searchQuery.trim()) return byCategory;

    const q = searchQuery.trim();
    const parsed = parseDateQuery(q);
    if (isDateQueryParsed(parsed)) {
      return byCategory.filter((training) => matchesDateQuery(training.date, parsed));
    }

    const qLower = q.toLowerCase();
    return byCategory.filter((training) =>
      formatCardDateWithYear(training.date).toLowerCase().includes(qLower)
    );
  }, [trainings, searchQuery, category]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Архив тренировок"
      ariaLabel="Список прошедших тренировок"
    >
      <div className="archive-search-wrapper">
        <div className="archive-search-field">
          <input
            type="text"
            className="archive-search-input"
            placeholder="Поиск по дате..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Поиск тренировок по дате"
          />
          {searchQuery ? (
            <IconButton
              ariaLabel="Очистить поиск"
              variant="ghost"
              size="sm"
              className="archive-search-clear"
              onClick={() => setSearchQuery('')}
            >
              <span aria-hidden="true">✕</span>
            </IconButton>
          ) : null}
        </div>
        <select
          className="archive-category-select"
          value={category}
          onChange={(e) => setCategory(/** @type {ArchiveCategory} */ (e.target.value))}
          aria-label="Фильтр по категории"
        >
          <option value="all">Все</option>
          <option value="completed">Завершённые</option>
          <option value="cancelled">Отменённые</option>
        </select>
      </div>
      <div className="archive-list">
        {filtered.length === 0 ? (
          <EmptyState title="Пусто" description="Прошедших тренировок пока нет." />
        ) : (
          filtered.map((training) => {
            const isCancelled = training.is_cancelled === true;
            return (
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
                aria-label={`Тренировка ${formatCardDateWithYear(training.date)}, ${formatTimeRange(training.date, training.duration)}`}
              >
                <div className="card-main-info-col">
                  <span className="card-row-date">{formatCardDateWithYear(training.date)}</span>
                  <span className="card-row-time">
                    {formatTimeRange(training.date, training.duration)}
                  </span>
                  <span className="card-row-type-label">
                    {training.type === 'group' ? 'Тренировка' : 'Турнир секции'}
                  </span>
                </div>

                <div className="card-actions-info-col">
                  <span
                    className={
                      isCancelled
                        ? 'card-status-badge card-status-badge--cancelled'
                        : 'card-status-badge card-status-badge--closed'
                    }
                  >
                    {isCancelled ? 'Отменена' : 'Тренировка завершена'}
                  </span>
                  <span className="card-slots-counter">
                    {training.booked_users?.length || 0} участников
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}

export default ArchiveModal;
