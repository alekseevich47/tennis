import React, { useCallback, useState } from 'react';
import Avatar from '../../../components/ui/Avatar';
import UserPickerModal from './UserPickerModal';

/**
 * @typedef {{ id: string, full_name?: string, avatar?: string, avatar_url?: string }} CoachUser
 */

/**
 * @param {{
 *   coachPool: CoachUser[],
 *   activeCoachIds: string[],
 *   onChange: (next: { coachPool: CoachUser[], activeCoachIds: string[] }) => void
 * }} props
 */
function TrainingCoachesField({ coachPool, activeCoachIds, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const activeSet = new Set(activeCoachIds);

  const handlePickerConfirm = useCallback(
    (userIds, users = []) => {
      const prevPoolIds = new Set(coachPool.map((u) => u.id));
      const prevActive = new Set(activeCoachIds);
      const nextActive = new Set();
      for (const id of userIds) {
        if (prevActive.has(id) || !prevPoolIds.has(id)) nextActive.add(id);
      }
      onChange({
        coachPool: users,
        activeCoachIds: Array.from(nextActive)
      });
      setPickerOpen(false);
    },
    [activeCoachIds, coachPool, onChange]
  );

  const handleToggleActive = useCallback(
    (userId) => {
      const next = new Set(activeCoachIds);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      onChange({ coachPool, activeCoachIds: Array.from(next) });
    },
    [activeCoachIds, coachPool, onChange]
  );

  return (
    <div className="form-group-row training-coaches-field">
      <div className="training-coaches-field__header">
        <span className="training-coaches-field__title">Тренеры</span>
        <button
          type="button"
          className="training-coaches-field__add"
          aria-label="Добавить тренеров"
          onClick={() => setPickerOpen(true)}
        >
          +
        </button>
      </div>

      {coachPool.length > 0 && (
        <ul className="training-coaches-field__list">
          {coachPool.map((coach) => (
            <li key={coach.id}>
              <label className="training-coaches-field__option">
                <input
                  type="checkbox"
                  checked={activeSet.has(coach.id)}
                  onChange={() => handleToggleActive(coach.id)}
                />
                <Avatar
                  user={coach}
                  size="sm"
                  className="training-player-avatar"
                  alt={coach.full_name || 'Тренер'}
                />
                <span>{coach.full_name || 'Тренер'}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <UserPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={handlePickerConfirm}
        variant="coaches"
        initialSelectedIds={coachPool.map((u) => u.id)}
      />
    </div>
  );
}

export default TrainingCoachesField;
