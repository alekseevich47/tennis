import React, { memo, useMemo } from 'react';
import Avatar from '../../components/ui/Avatar';
import PostMedia from '../feed/PostMedia';
import TournamentPodium from './TournamentPodium';
import TournamentCommentsSection from './TournamentCommentsSection';
import { formatPostDate } from '../../lib/format';

/**
 * @param {{
 *   post: import('../../services/tournamentPosts').TournamentPostRecord,
 *   players?: any[],
 *   user?: any,
 *   userIsModerator?: boolean,
 *   onOpenProfile?: (user: any) => void,
 *   hiddenMediaKey?: string | null,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, thumbUrl: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void
 * }} props
 */
function TournamentPostCard({
  post,
  players = [],
  user = null,
  userIsModerator = false,
  onOpenProfile,
  hiddenMediaKey = null,
  onOpenFullscreen
}) {
  const participants = Array.isArray(post.participants) ? post.participants : [];

  const playerMap = useMemo(() => {
    const map = new Map();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

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

      <TournamentCommentsSection
        postId={post.id}
        user={user}
        userIsModerator={userIsModerator}
        onOpenProfile={onOpenProfile}
      />
    </article>
  );
}

export default memo(TournamentPostCard);
