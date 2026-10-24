import React, { useEffect, useId, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Avatar from '../../../components/ui/Avatar';
import pb from '../../../services/pb';
import { error } from '../../../lib/log';

function isUserBookingDisabled(user) {
  return (
    user.bot_blocked === true ||
    user.membership_frozen === true ||
    user.membership_stopped === true
  );
}

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onConfirm: (userIds: string[], users?: Array<{ id: string, full_name?: string, avatar?: string, avatar_url?: string }>) => void | Promise<void>,
 *   excludeIds?: string[],
 *   initialSelectedIds?: string[],
 *   variant?: 'booking' | 'coaches'
 * }} props
 */
function UserPickerModal({
  isOpen,
  onClose,
  onConfirm,
  excludeIds = [],
  initialSelectedIds = [],
  variant = 'booking'
}) {
  const isCoaches = variant === 'coaches';
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

    setSelectedIds(new Set(initialSelectedIds));

    let cancelled = false;
    setLoading(true);
    setErrorMessage('');

    pb.collection('users').getFullList({
      fields: 'id,full_name,avatar,avatar_url,available_sessions,membership_type,membership_frozen,membership_stopped,bot_blocked',
      sort: 'full_name'
    })
      .then((nextUsers) => {
        if (!cancelled) setUsers(nextUsers);
      })
      .catch((err) => {
        if (cancelled) return;
        error('load users:', err);
        setUsers([]);
        setErrorMessage(
          isCoaches
            ? 'Не удалось загрузить список пользователей.'
            : 'Не удалось загрузить список игроков.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // initialSelectedIds captured on open; omit from deps to avoid resetting mid-session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isCoaches]);

  useEffect(() => {
    if (!isOpen || isCoaches) return undefined;

    const unsubscribe = pb.collection('users').subscribe('*', (event) => {
      if (event.action !== 'update' || !event.record) return;
      const record = event.record;
      setUsers((prev) =>
        prev.map((user) =>
          user.id === record.id
            ? {
                ...user,
                bot_blocked: record.bot_blocked,
                membership_frozen: record.membership_frozen,
                membership_stopped: record.membership_stopped,
                available_sessions: record.available_sessions,
                membership_type: record.membership_type
              }
            : user
        )
      );
      if (
        record.bot_blocked === true ||
        record.membership_frozen === true ||
        record.membership_stopped === true
      ) {
        setSelectedIds((prev) => {
          if (!prev.has(record.id)) return prev;
          const next = new Set(prev);
          next.delete(record.id);
          return next;
        });
      }
    });

    return () => {
      void unsubscribe;
    };
  }, [isOpen, isCoaches]);

  const excludedUserIds = useMemo(() => new Set(excludeIds), [excludeIds]);
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = users.filter((user) => {
      if (excludedUserIds.has(user.id)) return false;
      const fullName = user.full_name || '';
      return !query || fullName.toLowerCase().includes(query);
    });
    if (isCoaches) return matched;

    const available = [];
    const disabled = [];
    for (const user of matched) {
      if (isUserBookingDisabled(user)) disabled.push(user);
      else available.push(user);
    }
    return [...available, ...disabled];
  }, [excludedUserIds, isCoaches, search, users]);

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
    if (confirming) return;
    if (!isCoaches && selectedIds.size === 0) return;
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
      title={isCoaches ? 'Выберите тренеров' : 'Выберите игроков'}
      size="tall"
      footer={
        <button
          type="button"
          className="submit-btn-full user-picker-confirm-btn"
          disabled={(!isCoaches && selectedCount === 0) || confirming}
          onClick={handleConfirm}
        >
          {confirming
            ? (isCoaches ? 'Добавляем...' : 'Записываем...')
            : (isCoaches
              ? (selectedCount === 0 ? 'Очистить список' : `Добавить (${selectedCount})`)
              : `Записать (${selectedCount})`)}
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
            <p className="user-picker-status">
              {isCoaches ? 'Загружаем пользователей...' : 'Загружаем игроков...'}
            </p>
          ) : errorMessage ? (
            <p className="user-picker-status user-picker-status-error">{errorMessage}</p>
          ) : filteredUsers.length === 0 ? (
            <p className="user-picker-status">Подходящих игроков нет.</p>
          ) : (
            filteredUsers.map((user) => {
              const isFrozen = user.membership_frozen === true;
              const isStopped = user.membership_stopped === true;
              const isBotBlocked = user.bot_blocked === true;
              const isDisabled = !isCoaches && isUserBookingDisabled(user);
              let statusSuffix = '';
              if (!isCoaches) {
                if (isBotBlocked) statusSuffix = ' — заблокировал бота';
                else if (isStopped) statusSuffix = ' — абонемент остановлен';
                else if (isFrozen) statusSuffix = ' — абонемент заморожен';
              }

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
                  {statusSuffix}
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
