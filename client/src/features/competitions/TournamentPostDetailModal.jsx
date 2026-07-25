import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import PostMedia from '../feed/PostMedia';
import PostContextMenu from '../feed/PostContextMenu';
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
 *   onEdit?: (post: any) => void,
 *   onDelete?: (postId: string) => void,
 *   onTogglePin?: (post: any) => void,
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
  onEdit,
  onDelete,
  onTogglePin,
  hiddenMediaKey = null,
  onOpenFullscreen,
  onCommentMutated,
  trackView = true
}) {
  const participants = Array.isArray(post?.participants) ? post.participants : [];
  const postId = post?.id || null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchorRect, setMenuAnchorRect] = useState(
    /** @type {{ left: number, top: number, right: number, bottom: number, width: number, height: number } | null} */ (null)
  );
  const menuBtnRef = useRef(/** @type {HTMLButtonElement | null} */ (null));

  const playerMap = useMemo(() => {
    const map = new Map();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  useEffect(() => {
    if (!isOpen) {
      setMenuOpen(false);
      setMenuAnchorRect(null);
    }
  }, [isOpen, postId]);

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
    setMenuOpen(false);
    onClose();
    flushPendingTournamentCommentDeletes();
  };

  const handleToggleMenu = () => {
    const btn = menuBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuAnchorRect({
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    });
    setMenuOpen((open) => !open);
  };

  return (
    <>
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
                {post.is_pinned ? (
                  <svg
                    className="post-pin-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-label="Закреплено"
                    role="img"
                  >
                    <path d="M16 3H8v2h1v5.2L7 14v2h4.2V21h1.6v-5H17v-2l-2-3.8V5h1V3z" />
                  </svg>
                ) : null}
              </span>
            </div>
          </div>
          <div className="tournament-post-detail-actions">
            {userIsModerator ? (
              <IconButton
                ref={menuBtnRef}
                type="button"
                ariaLabel="Действия с публикацией"
                aria-expanded={menuOpen}
                variant="ghost"
                size="md"
                className="post-detail-menu-btn"
                onClick={handleToggleMenu}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </IconButton>
            ) : null}
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

      <PostContextMenu
        isOpen={menuOpen && Boolean(menuAnchorRect)}
        anchorRect={menuAnchorRect}
        origin="end"
        isPinned={Boolean(post.is_pinned)}
        onTogglePin={() => onTogglePin?.(post)}
        onEdit={() => {
          setMenuOpen(false);
          onEdit?.(post);
        }}
        onDelete={() => {
          setMenuOpen(false);
          onDelete?.(post.id);
        }}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}

export default TournamentPostDetailModal;
