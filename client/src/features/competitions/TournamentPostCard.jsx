import React, { memo, useMemo } from 'react';
import Avatar from '../../components/ui/Avatar';
import PostMedia from '../feed/PostMedia';
import TournamentPodium from './TournamentPodium';
import { formatPostDate } from '../../lib/format';

/**
 * @param {import('../../services/tournamentPosts').TournamentPostRecord} post
 */
function readTournamentComments(post) {
  if (!post || !post.expand) return [];
  const list = post.expand['tournament_comments(post)'];
  if (!list) return [];
  return Array.isArray(list) ? list : [list];
}

/**
 * @param {{
 *   post: import('../../services/tournamentPosts').TournamentPostRecord,
 *   players?: any[],
 *   onOpenComments: (post: import('../../services/tournamentPosts').TournamentPostRecord) => void,
 *   hiddenMediaKey?: string | null,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, thumbUrl: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void
 * }} props
 */
function TournamentPostCard({
  post,
  players = [],
  onOpenComments,
  hiddenMediaKey = null,
  onOpenFullscreen
}) {
  const participants = Array.isArray(post.participants) ? post.participants : [];

  const playerMap = useMemo(() => {
    const map = new Map();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  const commentCount = useMemo(
    () => readTournamentComments(post).filter((c) => c.is_deleted !== true).length,
    [post]
  );

  return (
    <article className="tournament-post-card">
      <time className="tournament-post-date" dateTime={post.created}>
        {formatPostDate(post.created)}
      </time>

      {post.content ? <p className="tournament-post-content">{post.content}</p> : null}

      <PostMedia
        post={post}
        collection="tournament_posts"
        variant="card"
        className="tournament-post-media"
        hiddenMediaKey={hiddenMediaKey}
        onOpenFullscreen={onOpenFullscreen}
      />

      {participants.length > 0 ? (
        <TournamentPodium participants={participants} players={players} />
      ) : null}

      {participants.length > 0 ? (
        <ol className="tournament-results-list">
          {participants.map((participant) => {
            const user = playerMap.get(participant.userId) || {
              id: participant.userId,
              full_name: participant.fullName
            };

            return (
              <li key={participant.userId} className="tournament-results-row">
                <span className="tournament-results-place">{participant.place}</span>
                <Avatar user={user} size="sm" />
                <span className="tournament-results-name">{participant.fullName}</span>
                <span className="tournament-results-points">+{participant.points}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="feed-card-footer feed-card-bottom-bar">
        <button
          type="button"
          className="post-card-comment-btn"
          onClick={() => onOpenComments(post)}
          aria-label={`Открыть комментарии к публикации. Комментариев: ${commentCount}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-4.5A8 8 0 1 1 21 12Z" />
          </svg>
          <span className="post-card-comment-btn__count">{commentCount}</span>
        </button>
      </div>
    </article>
  );
}

export default memo(TournamentPostCard);
