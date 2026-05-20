import React, { useEffect, useId, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { listUsers } from '../../../services/users';
import { error } from '../../../lib/log';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSelect: (userId: string) => void,
 *   excludeIds?: string[]
 * }} props
 */
function UserPickerModal({ isOpen, onClose, onSelect, excludeIds = [] }) {
  const searchId = useId();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setErrorMessage('');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setErrorMessage('');

    listUsers()
      .then((nextUsers) => {
        if (!cancelled) setUsers(nextUsers);
      })
      .catch((err) => {
        if (cancelled) return;
        error('load users:', err);
        setUsers([]);
        setErrorMessage('Не удалось загрузить список игроков.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const excludedUserIds = useMemo(() => new Set(excludeIds), [excludeIds]);
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (excludedUserIds.has(user.id)) return false;
      const fullName = user.full_name || '';
      return !query || fullName.toLowerCase().includes(query);
    });
  }, [excludedUserIds, search, users]);

  const handleSelect = (userId) => {
    onSelect(userId);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Выберите игрока" size="tall">
      <div className="user-picker-modal">
        <div className="form-group-row">
          <label htmlFor={searchId}>Поиск по имени</label>
          <input
            id={searchId}
            type="search"
            placeholder="Начните вводить имя..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="user-picker-list" aria-live="polite">
          {loading ? (
            <p className="user-picker-status">Загружаем игроков...</p>
          ) : errorMessage ? (
            <p className="user-picker-status user-picker-status-error">{errorMessage}</p>
          ) : filteredUsers.length === 0 ? (
            <p className="user-picker-status">Подходящих игроков нет.</p>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                className="user-picker-option"
                onClick={() => handleSelect(user.id)}
              >
                <span className="player-avatar-mini" aria-hidden="true">👤</span>
                <span>{user.full_name || 'Теннисист'}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

export default UserPickerModal;
