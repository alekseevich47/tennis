import React, { useEffect, useMemo } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import PostMedia from '../feed/PostMedia';
import TournamentPodium from './TournamentPodium';
import TournamentCommentsSection from './TournamentCommentsSection';
import Avatar from '../../components/ui/Avatar';
import sectionAvatarUrl from '../../assets/sm-avatar.png';
import { formatPostDate } from '../../lib/format';
import { flushPendingTournamentCommentDeletes } from '../../services/tournamentComments';
import { getParticipantDisplayName, getParticipantPlayer } from './tournamentParticipants';
import { recordContentView } from '../../services/stats';

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
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, thumbUrl: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void,
 *   onCommentMutated?: () => void,
 *   trackView?: boolean
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
  onOpenFullscreen,
  onCommentMutated,
  trackView = true
}) {
  const participants = Array.isArray(post?.participants) ? post.participants : [];
  const postId = post?.id || null;

  const playerMap = useMemo(() => {
    const map = new Map();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  useEffect(() => {
    if (!trackView || !isOpen || !postId || !user?.id) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      void recordContentView({
        objectType: 'tournament_post',
        objectId: postId,
        source: 'modal'
      }).catch(() => {});
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trackView, isOpen, postId, user?.id]);

  if (!post) return null;

  const handleOpenParticipantProfile = (participant) => {
    onOpenProfile?.(getParticipantPlayer(participant, playerMap));
  };

  const handleClose = () => {
    onClose();
    flushPendingTournamentCommentDeletes();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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
          <IconButton
            type="button"
            className="ui-modal-close"
            ariaLabel="Закрыть"
            onClick={handleClose}
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
        <TournamentPodium
          participants={participants}
          players={players}
          onOpenProfile={onOpenProfile}
        />
      ) : null}

      {participants.length > 0 ? (
        <ol className="tournament-results-list">
          {participants.map((participant) => {
            const player = getParticipantPlayer(participant, playerMap);
            const displayName = getParticipantDisplayName(participant, playerMap);

            return (
              <li key={participant.userId} className="tournament-results-row">
                <span className="tournament-results-place">{participant.place}</span>
                <button
                  type="button"
                  className="tournament-participant-profile-link tournament-participant-profile-link--list"
                  onClick={() => handleOpenParticipantProfile(participant)}
                  aria-label={`Открыть профиль ${displayName}`}
                >
                  <Avatar user={player} size="sm" />
                  <span className="tournament-results-name">{displayName}</span>
                </button>
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
        onCommentMutated={onCommentMutated}
      />
    </Modal>
  );
}

export default TournamentPostDetailModal;
