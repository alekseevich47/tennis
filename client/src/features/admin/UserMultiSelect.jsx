import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { usePlayers } from '../../hooks/usePlayers';
import './UserMultiSelect.css';

function getCollapsedLabel(audience, recipients) {
  if (audience === 'all') return 'Все';
  if (audience === 'all_except_banned') return 'Все, кроме заблокированных';
  return `Выбрано: ${recipients.length}`;
}

function isUserChecked(user, audience, recipients) {
  if (audience === 'all') return true;
  if (audience === 'all_except_banned') return !user.is_banned;
  return recipients.includes(user.id);
}

/**
 * @param {{
 *   audience: string,
 *   recipients: string[],
 *   onChange: (value: { audience: string, recipients: string[] }) => void,
 *   className?: string
 * }} props
 */
export default function UserMultiSelect({ audience, recipients, onChange, className }) {
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const { data: players = [], isLoading } = usePlayers();

  const users = useMemo(
    () => [...players].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ru')),
    [players]
  );

  const collapsedLabel = getCollapsedLabel(audience, recipients);

  const handleSelectAll = useCallback(() => {
    if (audience === 'all') {
      onChange({ audience: 'selected', recipients: [] });
      return;
    }
    onChange({ audience: 'all', recipients: [] });
  }, [audience, onChange]);

  const handleSelectAllExceptBanned = useCallback(() => {
    if (audience === 'all_except_banned') {
      onChange({ audience: 'selected', recipients: [] });
      return;
    }
    onChange({ audience: 'all_except_banned', recipients: [] });
  }, [audience, onChange]);

  const handleUserToggle = useCallback(
    (userId) => {
      const user = users.find((entry) => entry.id === userId);
      if (!user) return;

      if (audience === 'all') {
        onChange({
          audience: 'selected',
          recipients: users.map((entry) => entry.id).filter((id) => id !== userId)
        });
        return;
      }

      if (audience === 'all_except_banned') {
        if (user.is_banned) {
          onChange({ audience: 'selected', recipients: [userId] });
          return;
        }

        onChange({
          audience: 'selected',
          recipients: users.filter((entry) => !entry.is_banned).map((entry) => entry.id).filter((id) => id !== userId)
        });
        return;
      }

      if (recipients.includes(userId)) {
        onChange({
          audience: 'selected',
          recipients: recipients.filter((id) => id !== userId)
        });
      } else {
        onChange({
          audience: 'selected',
          recipients: [...recipients, userId]
        });
      }
    },
    [audience, recipients, users, onChange]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={rootRef} className={clsx('user-multi-select', isOpen && 'open', className)}>
      <button
        type="button"
        className="user-multi-select__trigger"
        onClick={() => setIsOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {collapsedLabel}
      </button>

      {isOpen && (
        <ul className="user-multi-select__list" role="listbox" aria-label="Получатели">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={audience === 'all'}
              className={clsx(
                'user-multi-select__option',
                'user-multi-select__option--preset',
                audience === 'all' && 'active'
              )}
              onClick={handleSelectAll}
            >
              <span className="user-multi-select__check" aria-hidden="true">
                {audience === 'all' ? '✓' : ''}
              </span>
              Все
            </button>
          </li>
          <li>
            <button
              type="button"
              role="option"
              aria-selected={audience === 'all_except_banned'}
              className={clsx(
                'user-multi-select__option',
                'user-multi-select__option--preset',
                audience === 'all_except_banned' && 'active'
              )}
              onClick={handleSelectAllExceptBanned}
            >
              <span className="user-multi-select__check" aria-hidden="true">
                {audience === 'all_except_banned' ? '✓' : ''}
              </span>
              Все, кроме заблокированных
            </button>
          </li>
          {isLoading && <li className="user-multi-select__loading">Загрузка...</li>}
          {users.map((user) => {
            const checked = isUserChecked(user, audience, recipients);
            return (
              <li key={user.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  className={clsx('user-multi-select__option', checked && 'active')}
                  onClick={() => handleUserToggle(user.id)}
                >
                  <span className="user-multi-select__check" aria-hidden="true">
                    {checked ? '✓' : ''}
                  </span>
                  <span className={clsx(user.is_banned && 'user-multi-select__name--banned')}>
                    {user.full_name || 'Без имени'}
                    {user.is_banned ? ' (заблокирован)' : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
