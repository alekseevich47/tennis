import React, { useCallback, useState } from 'react';
import { usePlayers } from '../../hooks/usePlayers';
import { isModerator } from '../../services/auth';
import { createPlayer } from '../../services/catalog';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import PlayerRow from './PlayerRow';
import PlayerForm from './PlayerForm';
import { error } from '../../lib/log';
import './Rating.css';

function RatingPage() {
  const { data: players, isLoading, mutate } = usePlayers();
  const moderator = isModerator();
  const [showAddModal, setShowAddModal] = useState(false);

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

  return (
    <section className="rating" aria-label="Рейтинг игроков">
      <div className="rating-action-bar">
        {moderator && (
          <button
            type="button"
            className="rating-add-btn"
            onClick={() => setShowAddModal(true)}
            aria-label="Добавить игрока"
          >
            <span aria-hidden="true">+</span> Новый игрок
          </button>
        )}
      </div>

      {isLoading ? (
        <Spinner label="Загрузка рейтинга..." />
      ) : !players || players.length === 0 ? (
        <EmptyState title="Пока нет игроков" description="Добавьте первого участника секции." />
      ) : (
        <div className="players-table">
          <div className="table-header" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">Игрок</span>
            <span role="columnheader">Очки</span>
            <span role="columnheader">И/П/П</span>
          </div>
          {players.map((player, index) => (
            <PlayerRow key={player.id} player={player} rank={index + 1} />
          ))}
        </div>
      )}

      <PlayerForm
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreate}
      />
    </section>
  );
}

export default RatingPage;
