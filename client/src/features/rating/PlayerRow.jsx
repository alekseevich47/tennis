import React, { memo } from 'react';
import Avatar from '../../components/ui/Avatar';

function StopSignIcon() {
  return (
    <svg
      className="rank-stop-icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <polygon
        points="8,1 13.5,3 15.5,8 13.5,13 8,15 2.5,13 0.5,8 2.5,3"
        fill="#e53935"
      />
      <rect x="4" y="6.5" width="8" height="3" rx="0.5" fill="#fff" />
    </svg>
  );
}

/**
 * @param {{ player: any, rank: number | null, hidden?: boolean, banned?: boolean, onPlayerClick?: (player: any) => void }} props
 */
function PlayerRow({ player, rank, hidden = false, banned = false, onPlayerClick }) {
  const handleClick = () => {
    onPlayerClick?.(player);
  };

  const rowClass = [
    'player-row',
    hidden ? 'player-row--hidden' : '',
    banned ? 'player-row--banned' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const rankContent = banned ? (
    <span className="rank rank--banned" aria-label="Заблокирован">
      <StopSignIcon />
    </span>
  ) : (
    <span className="rank">{hidden ? '—' : rank}</span>
  );

  return (
    <div className={rowClass} onClick={handleClick}>
      {rankContent}
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
    </div>
  );
}

export default memo(PlayerRow);
