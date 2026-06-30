import React, { useMemo } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import PostMedia from '../feed/PostMedia';
import TournamentPodium from './TournamentPodium';
import TournamentCommentsSection from './TournamentCommentsSection';
import Avatar from '../../components/ui/Avatar';
import sectionAvatarUrl from '../../assets/sm-avatar.png';
import { formatPostDate } from '../../lib/format';

/**
 * @param {{
 *   isOpen: boolean,
 *   post: import('../../services/tournamentPosts').TournamentPostRecord | null,
 *   players?: any[],
 *   user?: any,
 *   userIsModerator?: boolean,
 *   onClose: () => void,
 *   onOpenEdit?: (post: import('../../services/tournamentPosts').TournamentPostRecord) => void,
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
  onOpenEdit,
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

  const handleOpenEdit = () => {
    onOpenEdit?.(post);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Просмотр итогов турнира и комментариев"
      size="large"
      showCloseButton={false}
    >
      <div className="tournament-post-detail-header">
        <div className="feed-card-header tournament-post-detail-card-header">
          <div className="section-avatar" aria-hidden="true">
            <img className="section-avatar__image" src={sectionAvatarUrl} alt="" decoding="async" />
          </div>
          <div className="section-meta">
            <span className="section-title-name">Секция Миленьких</span>
            <span className="post-date-line">
              <time className="post-date" dateTime={post.created}>
                {formatPostDate(post.created)}
              </time>
              {post.post_number ? <span className="post-number">#{post.post_number}</span> : null}
            </span>
          </div>
        </div>
        <div className="tournament-post-detail-actions">
          {userIsModerator && onOpenEdit ? (
            <IconButton
              ariaLabel="Редактировать публикацию"
              variant="ghost"
              size="sm"
              className="edit-post-btn"
              onClick={handleOpenEdit}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 20h4.2L19.3 8.9a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
                <path d="m13.7 6.1 4.2 4.2" />
              </svg>
            </IconButton>
          ) : null}
          <IconButton
            type="button"
            className="ui-modal-close"
            ariaLabel="Закрыть"
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </IconButton>
        </div>
      </div>

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
