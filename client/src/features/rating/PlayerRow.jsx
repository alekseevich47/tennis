import React, { memo } from 'react';
import Avatar from '../../components/ui/Avatar';

/**
 * @param {{ player: any, rank: number }} props
 */
function PlayerRow({ player, rank }) {
  return (
    <div className="player-row">
      <span className="rank">{rank}</span>
      <div className="player-info">
        <Avatar
          user={{
            id: player.id,
            collectionId: player.collectionId,
            full_name: player.full_name || player.name,
            avatar: player.avatar
          }}
          size="md"
          alt={player.full_name || player.name}
        />
        <div>
          <div className="player-name">{player.full_name || player.name || 'Без имени'}</div>
          <div className="player-details">
            {player.birth_year && <span>{player.birth_year} г.р.</span>}
            {player.hand && <span>• {player.hand}</span>}
          </div>
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
