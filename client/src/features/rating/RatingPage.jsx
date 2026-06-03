import React, { useCallback, useMemo, useState } from 'react';
import { usePlayers } from '../../hooks/usePlayers';
import { isModerator } from '../../services/auth';
import { createPlayer } from '../../services/catalog';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import PlayerRow from './PlayerRow';
import PlayerForm from './PlayerForm';
import ProfileViewModal from '../profile/ProfileViewModal';
import { error } from '../../lib/log';
import './Rating.css';

function RatingPage({ user, onTabChange }) {
  const { data: players, isLoading, mutate } = usePlayers();
  const moderator = isModerator();
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const sortedPlayers = useMemo(() => {
    if (!players) return [];

    const sorted = [...players];

    if (sortField === '#') {
      sorted.sort((a, b) =>
        sortDir === 'desc'
          ? (b.rating_points || 0) - (a.rating_points || 0)
          : (a.rating_points || 0) - (b.rating_points || 0)
      );
    }

    if (sortField === 'name') {
      sorted.sort((a, b) =>
        sortDir === 'desc'
          ? (b.full_name || '').localeCompare(a.full_name || '')
          : (a.full_name || '').localeCompare(b.full_name || '')
      );
    }

    if (sortField === 'points') {
      sorted.sort((a, b) =>
        sortDir === 'desc'
          ? (b.rating_points || 0) - (a.rating_points || 0)
          : (a.rating_points || 0) - (b.rating_points || 0)
      );
    }

    return sorted;
  }, [players, sortField, sortDir]);

  const filteredPlayers = useMemo(() => {
    if (!sortedPlayers) return [];
    if (!searchQuery.trim()) return sortedPlayers;

    const q = searchQuery.toLowerCase();
    return sortedPlayers.filter((player) => (player.full_name || '').toLowerCase().includes(q));
  }, [sortedPlayers, searchQuery]);

  const handleCreate = useCallback(
    async (data) => {
      try {
        await createPlayer(data);
        setShowAddModal(false);
        mutate();
      } catch (err) {
        error('create player:', err);
      }
    },
    [mutate]
  );

  const handleProfileTabChange = useCallback(
    (tabIndex) => {
      setViewingPlayer(null);
      onTabChange?.(tabIndex);
    },
    [onTabChange]
  );

  const handleProfileMutated = useCallback(
    (updatedPlayer) => {
      if (updatedPlayer?.id) setViewingPlayer(updatedPlayer);
      mutate();
    },
    [mutate]
  );

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

  return (
    <section className="rating" aria-label="Рейтинг игроков">
      <div className="rating-action-bar">
        {moderator && (
          <button
            type="button"
            className="rating-add-btn rating-add-btn--circle"
            onClick={() => setShowAddModal(true)}
            aria-label="Добавить игрока"
          >
            <span aria-hidden="true">+</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <Spinner label="Загрузка рейтинга..." />
      ) : !players || players.length === 0 ? (
        <EmptyState title="Пока нет игроков" description="Добавьте первого участника секции." />
      ) : (
        <>
          <div className="rating-search-bar">
            <input
              type="text"
              placeholder="Поиск игрока по имени..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="rating-search-input"
            />
          </div>
          <div className="players-table">
            <div className="table-header" role="row">
              <button type="button" className="sortable" onClick={() => handleSort('#')}>
                # {renderSortIcon('#')}
              </button>
              <button type="button" className="sortable" onClick={() => handleSort('name')}>
                Игрок {renderSortIcon('name')}
              </button>
              <button type="button" className="sortable" onClick={() => handleSort('points')}>
                Очки {renderSortIcon('points')}
              </button>
              <span role="columnheader">И/В/П</span>
            </div>
            {filteredPlayers.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={index + 1}
                onPlayerClick={setViewingPlayer}
              />
            ))}
          </div>
        </>
      )}

      <PlayerForm
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreate}
      />

      <ProfileViewModal
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
        targetUser={viewingPlayer}
        currentUser={user}
        onTabChange={handleProfileTabChange}
        onMutated={handleProfileMutated}
      />
    </section>
  );
}

export default RatingPage;
