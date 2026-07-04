import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import IconButton from '../../../components/ui/IconButton';
import Spinner from '../../../components/ui/Spinner';
import Avatar from '../../../components/ui/Avatar';
import { usePlayers } from '../../../hooks/usePlayers';
import { useTrainings } from '../../../hooks/useTrainings';
import ProfileViewModal from '../../profile/ProfileViewModal';
import DateRangeModal from './DateRangeModal';
import '../../rating/Rating.css';
import '../Trainings.css';

function formatDateRangeLabel(start, end) {
  const fmt = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };
  return `${fmt(start)} — ${fmt(end)}`;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/**
 * @param {{ isOpen: boolean, onClose: () => void, currentUser?: any }} props
 */
function MembershipOverviewModal({ isOpen, onClose, currentUser }) {
  const { data: players, isLoading: playersLoading, mutate: mutatePlayers } = usePlayers();
  const { data: trainings, isLoading: trainingsLoading } = useTrainings();

  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState(null);

  useEffect(() => {
    if (isOpen) return;
    setSortField(null);
    setSortDir('desc');
  }, [isOpen]);

  const isLoading = playersLoading || trainingsLoading;
  const hasDateFilter = Boolean(dateRange?.start && dateRange?.end);

  const periodAttendanceCounts = useMemo(() => {
    if (!hasDateFilter || !trainings) return null;

    const { start, end } = dateRange;
    const counts = new Map();

    for (const training of trainings) {
      const date = training.date?.slice(0, 10);
      if (!date || date < start || date > end) continue;

      for (const userId of training.attended_users || []) {
        counts.set(userId, (counts.get(userId) ?? 0) + 1);
      }
    }

    return counts;
  }, [trainings, dateRange, hasDateFilter]);

  const playersWithStats = useMemo(() => {
    if (!players) return [];

    return players.map((player) => ({
      ...player,
      availableSessions: Number(player.available_sessions ?? 0),
      usedSessions: periodAttendanceCounts
        ? (periodAttendanceCounts.get(player.id) ?? 0)
        : Number(player.used_sessions ?? 0)
    }));
  }, [players, periodAttendanceCounts]);

  const sortedPlayers = useMemo(() => {
    if (!sortField) return [...playersWithStats];

    const sorted = [...playersWithStats];

    if (sortField === 'name') {
      sorted.sort((a, b) =>
        sortDir === 'desc'
          ? (b.full_name || '').localeCompare(a.full_name || '')
          : (a.full_name || '').localeCompare(b.full_name || '')
      );
    }

    if (sortField === 'available') {
      sorted.sort((a, b) =>
        sortDir === 'desc'
          ? b.availableSessions - a.availableSessions
          : a.availableSessions - b.availableSessions
      );
    }

    if (sortField === 'used') {
      sorted.sort((a, b) =>
        sortDir === 'desc' ? b.usedSessions - a.usedSessions : a.usedSessions - b.usedSessions
      );
    }

    return sorted;
  }, [playersWithStats, sortField, sortDir]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return sortedPlayers;

    const q = searchQuery.toLowerCase();
    return sortedPlayers.filter((player) => (player.full_name || '').toLowerCase().includes(q));
  }, [sortedPlayers, searchQuery]);

  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDir((currentDir) => (currentDir === 'asc' ? 'desc' : 'asc'));
        return;
      }

      setSortField(field);
      setSortDir('desc');
    },
    [sortField]
  );

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;

    return (
      <span className="sort-icon" aria-hidden="true">
        {sortDir === 'desc' ? '▼' : '▲'}
      </span>
    );
  };

  const handleProfileMutated = useCallback(
    (updatedPlayer) => {
      if (updatedPlayer?.id) setViewingPlayer(updatedPlayer);
      mutatePlayers();
    },
    [mutatePlayers]
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Абонемент"
        size="tall"
        className="membership-overview-modal"
      >
        <div className="membership-search-row">
          <input
            type="text"
            placeholder="Поиск игрока по имени…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="rating-search-input"
          />
          {hasDateFilter ? (
            <>
              <span className="membership-date-range-label">
                {formatDateRangeLabel(dateRange.start, dateRange.end)}
              </span>
              <IconButton
                type="button"
                ariaLabel="Сбросить фильтр по датам"
                variant="ghost"
                size="sm"
                className="membership-date-reset-btn"
                onClick={() => setDateRange(null)}
              >
                <span aria-hidden="true">✕</span>
              </IconButton>
            </>
          ) : (
            <IconButton
              type="button"
              ariaLabel="Выбрать период"
              aria-expanded={showDateModal}
              variant="ghost"
              className="membership-calendar-btn"
              onClick={() => setShowDateModal(true)}
            >
              <CalendarIcon />
            </IconButton>
          )}
        </div>

        {isLoading ? (
          <Spinner label="Загрузка участников..." />
        ) : (
          <div className="players-table membership-overview-table">
            <div className="table-header" role="row">
              <button type="button" className="sortable" onClick={() => handleSort('name')}>
                Игрок {renderSortIcon('name')}
              </button>
              <button type="button" className="sortable" onClick={() => handleSort('available')}>
                Д/П {renderSortIcon('available')}
              </button>
              <button type="button" className="sortable" onClick={() => handleSort('used')}>
                И/П {renderSortIcon('used')}
              </button>
            </div>
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                className="player-row membership-player-row"
                role="button"
                tabIndex={0}
                onClick={() => setViewingPlayer(player)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setViewingPlayer(player);
                  }
                }}
              >
                <div className="player-info">
                  <Avatar user={player} size="md" alt={player.full_name || 'Игрок'} />
                  <div className="player-name">{player.full_name || 'Без имени'}</div>
                </div>
                <span className="membership-col-num">{player.availableSessions}</span>
                <span className="membership-col-num">{player.usedSessions}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <DateRangeModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        onConfirm={(range) => setDateRange(range)}
      />

      <ProfileViewModal
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
        targetUser={viewingPlayer}
        currentUser={currentUser}
        onMutated={handleProfileMutated}
      />
    </>
  );
}

export default MembershipOverviewModal;
