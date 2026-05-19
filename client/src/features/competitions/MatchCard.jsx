import React, { memo } from 'react';
import clsx from 'clsx';
import IconButton from '../../components/ui/IconButton';
import { formatDateTimeShort } from '../../lib/format';

/**
 * @param {{ match: any, moderator: boolean, onEdit: (match: any) => void }} props
 */
function MatchCard({ match, moderator, onEdit }) {
  const p1 = match.expand?.player1;
  const p2 = match.expand?.player2;
  const isFinished = match.status === 'finished';
  const isCancelled = match.status === 'cancelled';

  return (
    <div className={clsx('match-card', isFinished && 'finished', isCancelled && 'cancelled')}>
      <div className="match-players">
        <div
          className={clsx(
            'player',
            isFinished && match.score_p1 > match.score_p2 && 'winner'
          )}
        >
          {p1?.full_name || p1?.name || 'Игрок 1'}
        </div>
        <div className="match-info">
          <div className="match-date">{formatDateTimeShort(match.date_time)}</div>
          {isFinished && (
            <div className="match-score">
              <span className={match.score_p1 > match.score_p2 ? 'winner-score' : ''}>
                {match.score_p1}
              </span>
              :
              <span className={match.score_p2 > match.score_p1 ? 'winner-score' : ''}>
                {match.score_p2}
              </span>
              {match.sets && <div className="sets">({match.sets})</div>}
            </div>
          )}
          {isCancelled && <div className="cancelled-text">Игра не состоялась</div>}
        </div>
        <div
          className={clsx(
            'player',
            isFinished && match.score_p2 > match.score_p1 && 'winner'
          )}
        >
          {p2?.full_name || p2?.name || 'Игрок 2'}
        </div>
      </div>
      {moderator && !isCancelled && (
        <IconButton
          ariaLabel="Редактировать результат матча"
          variant="ghost"
          size="sm"
          className="edit-match-btn"
          onClick={() => onEdit(match)}
        >
          <span aria-hidden="true">✏️</span>
        </IconButton>
      )}
    </div>
  );
}

export default memo(MatchCard);
