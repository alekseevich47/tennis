import React, { useCallback, useMemo, useState } from 'react';
import { usePlayers } from '../../hooks/usePlayers';
import { isModerator } from '../../services/auth';
import { createPlayer } from '../../services/catalog';
import EmptyState from '../../components/ui/EmptyState';
import PullToRefresh from '../../components/ui/PullToRefresh';
import { RatingListSkeleton } from '../../components/ui/Skeleton';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import PlayerRow from './PlayerRow';
import PlayerForm from './PlayerForm';
import ProfileViewModal from '../profile/ProfileViewModal';
import { formatAdminSaveError } from '../admin/adminResultAlert';
import { error } from '../../lib/log';
import { buildPlayerRanks, getRatingPoints, isRatingVisible } from '../../lib/rating';
import './Rating.css';
import '../feed/Feed.css';

/**
 * @param {{
 *   user?: any,
 *   onTabChange?: (tab: number) => void,
 *   scrollRef?: React.RefObject<HTMLElement | null>
 * }} props
 */
function RatingPage({ user, onTabChange, scrollRef }) {
  const moderator = isModerator();
  const { alert } = useAlertDialog();
  const { data: players, isLoading, mutate } = usePlayers(
    moderator
      ? undefined
      : 'is_visible = true && is_banned = false && bot_blocked = false'
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);
  const visiblePlayers = useMemo(() => {
    if (!players) return [];
    return players.filter(isRatingVisible);
  }, [players]);

  const hiddenPlayers = useMemo(() => {
    if (!moderator || !players) return [];
    return players.filter(
      (player) => player.is_visible === false && player.is_banned !== true
    );
  }, [players, moderator]);

  const botBlockedPlayers = useMemo(() => {
    if (!moderator || !players) return [];
    return players.filter(
      (player) =>
        player.bot_blocked === true &&
        player.is_banned !== true &&
        player.is_visible !== false
    );
  }, [players, moderator]);

  const bannedPlayers = useMemo(() => {
    if (!moderator || !players) return [];
    return players.filter((player) => player.is_banned === true);
  }, [players, moderator]);

  const playerRanks = useMemo(() => buildPlayerRanks(visiblePlayers), [visiblePlayers]);

  const sortedPlayers = useMemo(() => {
    if (!visiblePlayers.length) return [];

    const sorted = [...visiblePlayers];

    if (sortField === '#') {
      sorted.sort((a, b) => {
        const rankA = playerRanks.get(a.id) || 0;
        const rankB = playerRanks.get(b.id) || 0;
        return sortDir === 'desc' ? rankB - rankA : rankA - rankB;
      });
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
          ? getRatingPoints(b) - getRatingPoints(a)
          : getRatingPoints(a) - getRatingPoints(b)
      );
    }

    return sorted;
  }, [visiblePlayers, playerRanks, sortField, sortDir]);

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
        await alert({
          title: 'Не получилось',
          message: formatAdminSaveError(err, 'Не удалось создать игрока.')
        });
        throw err;
      }
    },
    [alert, mutate]
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
      {scrollRef ? <PullToRefresh scrollRef={scrollRef} onRefresh={handleRefresh} /> : null}
      <div className="rating-action-bar">
        {!isLoading && visiblePlayers.length > 0 && (
          <div className="rating-search-bar">
            <input
              type="text"
              placeholder="Поиск игрока по имени..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="rating-search-input"
            />
          </div>
        )}
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
        <RatingListSkeleton />
      ) : visiblePlayers.length === 0 &&
        (!moderator ||
          (hiddenPlayers.length === 0 &&
            botBlockedPlayers.length === 0 &&
            bannedPlayers.length === 0)) ? (
        <EmptyState title="Пока нет игроков" description="Добавьте первого участника секции." />
      ) : (
        <>
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
            </div>
            {filteredPlayers.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={playerRanks.get(player.id) || index + 1}
                onPlayerClick={setViewingPlayer}
              />
            ))}
          </div>
          {moderator && hiddenPlayers.length > 0 && (
            <div className="rating-hidden-section">
              <div className="rating-hidden-divider">
                Скрытые пользователи ({hiddenPlayers.length})
              </div>
              <div className="players-table">
                {hiddenPlayers.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    rank={null}
                    hidden
                    onPlayerClick={setViewingPlayer}
                  />
                ))}
              </div>
            </div>
          )}
          {moderator && botBlockedPlayers.length > 0 && (
            <div className="rating-bot-blocked-section">
              <div className="rating-bot-blocked-divider">
                Заблокировали бота ({botBlockedPlayers.length})
              </div>
              <div className="players-table">
                {botBlockedPlayers.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    rank={null}
                    botBlocked
                    onPlayerClick={setViewingPlayer}
                  />
                ))}
              </div>
            </div>
          )}
          {moderator && bannedPlayers.length > 0 && (
            <div className="rating-banned-section">
              <div className="rating-banned-divider">
                Заблокированные пользователи ({bannedPlayers.length})
              </div>
              <div className="players-table">
                {bannedPlayers.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    rank={null}
                    banned
                    onPlayerClick={setViewingPlayer}
                  />
                ))}
              </div>
            </div>
          )}
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
