import React from 'react';
import '../Statistics.css';

/**
 * Заголовок модалки метрики: серая стрелка «назад» + название.
 *
 * @param {{
 *   children: React.ReactNode,
 *   onBack: () => void
 * }} props
 */
export default function StatsMetricTitle({ children, onBack }) {
  return (
    <span className="stats-metric-title">
      <button
        type="button"
        className="stats-metric-back"
        aria-label="Назад"
        onClick={onBack}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className="stats-metric-title__text">{children}</span>
    </span>
  );
}
