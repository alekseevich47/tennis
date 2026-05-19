import React, { useCallback, useEffect, useState } from 'react';
import { useChampionships } from '../../hooks/useChampionships';
import { useMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { isModerator } from '../../services/auth';
import { createMatch, updateMatchResult } from '../../services/catalog';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import ChampionshipSelect from './ChampionshipSelect';
import CreateChampionshipModal from './CreateChampionshipModal';
import CreateMatchForm from './CreateMatchForm';
import EditMatchForm from './EditMatchForm';
import MatchCard from './MatchCard';
import { error } from '../../lib/log';
import './Competitions.css';

function CompetitionsPage() {
  const moderator = isModerator();

  // Параллельная загрузка через SWR — устраняет H1.
  const { data: championships, mutate: mutateChamps } = useChampionships();
  const { data: players } = usePlayers();

  const [selectedChampionshipId, setSelectedChampionshipId] = useState('');
  const [showAddChamp, setShowAddChamp] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);

  // Авто-выбор первого чемпионата после загрузки.
  useEffect(() => {
    if (championships && championships.length > 0 && !selectedChampionshipId) {
      setSelectedChampionshipId(championships[0].id);
    }
  }, [championships, selectedChampionshipId]);

  const { data: matches, isLoading: matchesLoading, mutate: mutateMatches } = useMatches(
    selectedChampionshipId
  );

  const handleCreateMatch = useCallback(
    async (payload) => {
      try {
        await createMatch(payload);
        setShowAddMatch(false);
        mutateMatches();
      } catch (err) {
        error('create match:', err);
      }
    },
    [mutateMatches]
  );

  const handleUpdateMatch = useCallback(
    async (payload) => {
      if (!editingMatch) return;
      try {
        await updateMatchResult(editingMatch.id, payload);
        setEditingMatch(null);
        mutateMatches();
      } catch (err) {
        error('update match:', err);
      }
    },
    [editingMatch, mutateMatches]
  );

  const handleCreateChampionship = useCallback(() => {
    setShowAddChamp(false);
    mutateChamps();
  }, [mutateChamps]);

  return (
    <section className="competitions" aria-label="Соревнования">
      <div className="competitions-action-bar">
        {moderator && (
          <button
            type="button"
            className="competitions-add-btn"
            onClick={() => setShowAddChamp(true)}
            aria-label="Создать чемпионат"
          >
            <span aria-hidden="true">+</span> Новый чемпионат
          </button>
        )}
      </div>

      <ChampionshipSelect
        championships={championships || []}
        value={selectedChampionshipId}
        onChange={setSelectedChampionshipId}
        moderator={moderator}
        onCreateMatch={() => setShowAddMatch(true)}
      />

      {matchesLoading ? (
        <Spinner label="Загрузка матчей..." />
      ) : !matches || matches.length === 0 ? (
        <EmptyState title="Нет матчей" description="Запланированных игр пока нет." />
      ) : (
        <div className="matches-list">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              moderator={moderator}
              onEdit={setEditingMatch}
            />
          ))}
        </div>
      )}

      <CreateChampionshipModal
        isOpen={showAddChamp}
        onClose={() => setShowAddChamp(false)}
        onCreated={handleCreateChampionship}
      />

      <CreateMatchForm
        isOpen={showAddMatch}
        championshipId={selectedChampionshipId}
        players={players || []}
        onClose={() => setShowAddMatch(false)}
        onSubmit={handleCreateMatch}
      />

      <EditMatchForm
        isOpen={Boolean(editingMatch)}
        match={editingMatch}
        onClose={() => setEditingMatch(null)}
        onSubmit={handleUpdateMatch}
      />
    </section>
  );
}

export default CompetitionsPage;
