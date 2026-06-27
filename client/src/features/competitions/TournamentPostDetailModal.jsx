import React, { useMemo } from 'react';
import Modal from '../../components/ui/Modal';
import PostMedia from '../feed/PostMedia';
import TournamentPodium from './TournamentPodium';
import TournamentCommentsSection from './TournamentCommentsSection';
import Avatar from '../../components/ui/Avatar';
import { formatPostDate } from '../../lib/format';

/**
 * @param {{
 *   isOpen: boolean,
 *   post: import('../../services/tournamentPosts').TournamentPostRecord | null,
 *   players?: any[],
 *   user?: any,
 *   userIsModerator?: boolean,
 *   onClose: () => void,
 *   onOpenProfile?: (user: any) => void,
 *   hiddenMediaKey?: string | null,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, thumbUrl: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void
 * }} props
 */
function TournamentPostDetailModal({
  isOpen,
  post,
  players = [],
  user = null,
  userIsModerator = false,
  onClose,
  onOpenProfile,
  hiddenMediaKey = null,
  onOpenFullscreen
}) {
  const participants = Array.isArray(post?.participants) ? post.participants : [];

  const playerMap = useMemo(() => {
    const map = new Map();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  if (!post) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Просмотр итогов турнира и комментариев"
      size="large"
    >
      <time className="tournament-post-date" dateTime={post.created}>
        {formatPostDate(post.created)}
      </time>

      {post.content ? <p className="tournament-post-content">{post.content}</p> : null}

      <PostMedia
        post={post}
        collection="tournament_posts"
        variant="detail"
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
            const player = playerMap.get(participant.userId) || {
              id: participant.userId,
              full_name: participant.fullName
            };

            return (
              <li key={participant.userId} className="tournament-results-row">
                <span className="tournament-results-place">{participant.place}</span>
                <Avatar user={player} size="sm" />
                <span className="tournament-results-name">{participant.fullName}</span>
                <span className="tournament-results-points">+{participant.points}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="tournament-post-detail-divider" role="separator" />

      <h3 className="tournament-comments-modal-title">Комментарии</h3>

      <TournamentCommentsSection
        postId={post.id}
        user={user}
        userIsModerator={userIsModerator}
        onOpenProfile={onOpenProfile}
      />
    </Modal>
  );
}

export default TournamentPostDetailModal;
