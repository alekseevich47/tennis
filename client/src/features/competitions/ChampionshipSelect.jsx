import React, { memo } from 'react';

/**
 * @param {{
 *   championships: any[],
 *   value: string,
 *   onChange: (id: string) => void,
 *   moderator: boolean,
 *   onCreateMatch: () => void
 * }} props
 */
function ChampionshipSelect({ championships, value, onChange, moderator, onCreateMatch }) {
  return (
    <div className="championship-select">
      <label htmlFor="championship-select" className="visually-hidden">
        Выбор чемпионата
      </label>
      <select
        id="championship-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {championships.length === 0 && <option value="">Нет чемпионатов</option>}
        {championships.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {moderator && value && (
        <button type="button" className="create-match-btn" onClick={onCreateMatch}>
          <span aria-hidden="true">+</span> Создать игру
        </button>
      )}
    </div>
  );
}

export default memo(ChampionshipSelect);
