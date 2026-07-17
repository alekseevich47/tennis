import React from 'react';
import Modal from '../../components/ui/Modal';
import './Statistics.css';

/** @typedef {'growth' | 'reach' | 'booking' | 'trainings' | 'achievements'} StatsMetricId */

/** @type {{ id: StatsMetricId, label: string }[]} */
const METRICS = [
  { id: 'growth', label: 'Прирост людей' },
  { id: 'reach', label: 'Охват постов' },
  { id: 'booking', label: 'Записи и посещаемость' },
  { id: 'trainings', label: 'Проведённые тренировки' },
  { id: 'achievements', label: 'Достижения' }
];

/**
 * Хаб раздела «Статистика»: 5 строк → выбор метрики.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSelect: (id: StatsMetricId) => void
 * }} props
 */
export default function StatisticsHubModal({ isOpen, onClose, onSelect }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Статистика" className="stats-hub-modal">
      <ul className="stats-hub__list">
        {METRICS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="stats-hub__item"
              onClick={() => onSelect(item.id)}
            >
              <span className="stats-hub__item-label">{item.label}</span>
              <span className="stats-hub__item-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
