import React, { memo, useMemo } from 'react';
import Avatar from '../../components/ui/Avatar';

const PODIUM_ORDER = [
  { place: 2, medal: '🥈', className: 'tournament-podium-column--second' },
  { place: 1, medal: '🥇', className: 'tournament-podium-column--first' },
  { place: 3, medal: '🥉', className: 'tournament-podium-column--third' }
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

        return (
          <div
            key={place}
            className={`tournament-podium-column ${className}`}
          >
            {participant ? (
              <div className="tournament-podium-top">
                <span className="tournament-podium-medal" aria-hidden="true">
                  {medal}
                </span>
                <Avatar
                  user={
                    playerMap.get(participant.userId) || {
                      id: participant.userId,
                      full_name: participant.fullName
                    }
                  }
                  size="md"
                />
                <span className="tournament-podium-name">{participant.fullName}</span>
                <span className="tournament-podium-place">{place}-е место</span>
              </div>
            ) : (
              <div className="tournament-podium-top tournament-podium-top--empty" aria-hidden="true" />
            )}
            <div
              className={`tournament-podium-pedestal tournament-podium-pedestal--${place}`}
              aria-hidden="true"
            />
          </div>
        );
      })}
    </div>
  );
}

export default memo(TournamentPodium);
