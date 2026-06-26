import React, { memo, useMemo } from 'react';
import Avatar from '../../components/ui/Avatar';

const PODIUM_ORDER = [
  { place: 2, medal: '🥈', className: 'tournament-podium-slot--second' },
  { place: 1, medal: '🥇', className: 'tournament-podium-slot--first' },
  { place: 3, medal: '🥉', className: 'tournament-podium-slot--third' }
];

/**
 * @param {{
 *   participants: Array<{ userId: string, fullName: string, place: number }>,
 *   players?: any[]
 * }} props
 */
function TournamentPodium({ participants, players = [] }) {
  const playerMap = useMemo(() => {
    const map = new Map();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  const topThree = useMemo(
    () => participants.filter((participant) => participant.place <= 3),
    [participants]
  );

  if (!topThree.length) return null;

  return (
    <div className="tournament-podium" aria-label="Подиум">
      {PODIUM_ORDER.map(({ place, medal, className }) => {
        const participant = topThree.find((item) => item.place === place);
        if (!participant) {
          return <div key={place} className={`tournament-podium-slot ${className} tournament-podium-slot--empty`} />;
        }

        const user = playerMap.get(participant.userId) || {
          id: participant.userId,
          full_name: participant.fullName
        };

        return (
          <div key={place} className={`tournament-podium-slot ${className}`}>
            <span className="tournament-podium-medal" aria-hidden="true">
              {medal}
            </span>
            <Avatar user={user} size="md" />
            <span className="tournament-podium-name">{participant.fullName}</span>
            <span className="tournament-podium-place">{place}-е место</span>
          </div>
        );
      })}
    </div>
  );
}

export default memo(TournamentPodium);
