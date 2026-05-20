import React, { useEffect, useId, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { listUsers } from '../../../services/users';
import { error } from '../../../lib/log';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onConfirm: (userIds: string[]) => void | Promise<void>,
 *   excludeIds?: string[]
 * }} props
 */
function UserPickerModal({ isOpen, onClose, onConfirm, excludeIds = [] }) {
  const searchId = useId();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setErrorMessage('');
      setSelectedIds(new Set());
      setConfirming(false);
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

  const selectedCount = selectedIds.size;

  const handleToggleUser = (userId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0 || confirming) return;
    setConfirming(true);
    try {
      await onConfirm(Array.from(selectedIds));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Выберите игроков"
      size="tall"
      footer={
        <button
          type="button"
          className="submit-btn-full user-picker-confirm-btn"
          disabled={selectedCount === 0 || confirming}
          onClick={handleConfirm}
        >
          {confirming ? 'Записываем...' : `Записать (${selectedCount})`}
        </button>
      }
    >
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
              <label
                key={user.id}
                className={`user-picker-option${selectedIds.has(user.id) ? ' is-selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(user.id)}
                  onChange={() => handleToggleUser(user.id)}
                />
                <span className="player-avatar-mini" aria-hidden="true">👤</span>
                <span>{user.full_name || 'Теннисист'}</span>
              </label>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

export default UserPickerModal;
