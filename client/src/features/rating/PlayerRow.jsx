import React, { memo } from 'react';
import Avatar from '../../components/ui/Avatar';

/**
 * @param {{ player: any, rank: number, onPlayerClick?: (player: any) => void }} props
 */
function PlayerRow({ player, rank, onPlayerClick }) {
  const handleClick = () => {
    onPlayerClick?.(player);
  };

  return (
    <div className="player-row" onClick={handleClick}>
      <span className="rank">{rank}</span>
      <div className="player-info">
        <Avatar
          user={player}
          size="md"
          alt={player.full_name || player.name}
        />
        <div>
          <div className="player-name">{player.full_name || player.name || 'Без имени'}</div>
        </div>
      </div>
      <span className="rating-points">{player.rating_points || 0}</span>
      <span className="stats">
        {player.games_count || 0}/{player.wins || 0}/{player.losses || 0}
      </span>
    </div>
  );
}

export default memo(PlayerRow);
