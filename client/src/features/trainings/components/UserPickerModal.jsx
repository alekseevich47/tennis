import React, { useEffect, useId, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Avatar from '../../../components/ui/Avatar';
import pb from '../../../services/pb';
import { error } from '../../../lib/log';

function isUserBookingDisabled(user) {
  const membershipType = user.membership_type || 'regular';
  const noSessions =
    membershipType === 'regular' && (user.available_sessions ?? 0) <= 0;
  return user.membership_frozen === true || noSessions;
}

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onConfirm: (userIds: string[], users?: Array<{ id: string, full_name?: string }>) => void | Promise<void>,
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

    pb.collection('users').getFullList({
      fields: 'id,full_name,avatar,avatar_url,available_sessions,membership_type,membership_frozen',
      sort: 'full_name'
    })
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
    const matched = users.filter((user) => {
      if (excludedUserIds.has(user.id)) return false;
      const fullName = user.full_name || '';
      return !query || fullName.toLowerCase().includes(query);
    });
    const available = [];
    const disabled = [];
    for (const user of matched) {
      if (isUserBookingDisabled(user)) disabled.push(user);
      else available.push(user);
    }
    return [...available, ...disabled];
  }, [excludedUserIds, search, users]);

  const selectedCount = selectedIds.size;

  const handleToggleUser = (userId, disabled) => {
    if (disabled) return;
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
      const selectedUserIds = Array.from(selectedIds);
      const usersById = new Map(users.map((user) => [user.id, user]));
      await onConfirm(
        selectedUserIds,
        selectedUserIds.map((userId) => usersById.get(userId)).filter(Boolean)
      );
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
            filteredUsers.map((user) => {
              const membershipType = user.membership_type || 'regular';
              const noSessions =
                membershipType === 'regular' && (user.available_sessions ?? 0) <= 0;
              const isFrozen = user.membership_frozen === true;
              const isDisabled = isUserBookingDisabled(user);

              return (
              <label
                key={user.id}
                className={`user-picker-option${selectedIds.has(user.id) ? ' is-selected' : ''}${isDisabled ? ' is-disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(user.id)}
                  disabled={isDisabled}
                  onChange={() => handleToggleUser(user.id, isDisabled)}
                />
                <Avatar
                  user={user}
                  size="sm"
                  className="training-player-avatar"
                  alt={user.full_name || 'Теннисист'}
                />
                <span>
                  {user.full_name || 'Теннисист'}
                  {noSessions ? ' — нет посещений' : ''}
                  {isFrozen ? ' — абонемент заморожен' : ''}
                </span>
              </label>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

export default UserPickerModal;
