import React, { memo, useCallback, useMemo } from 'react';
import Avatar from '../../components/ui/Avatar';
import PostMedia from '../feed/PostMedia';
import PostContentHtml from '../feed/PostContentHtml';
import CommentsPreview from '../feed/CommentsPreview';
import TournamentPodium from './TournamentPodium';
import { getParticipantDisplayName, getParticipantPlayer } from './tournamentParticipants';
import sectionAvatarUrl from '../../assets/sm-avatar.png';
import { formatPostDate } from '../../lib/format';
import { usePostViewTracker } from '../../hooks/usePostViewTracker';
import { LongPressRing, useLongPress } from '../../lib/longPress';

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
 *   user?: any,
 *   userIsModerator?: boolean,
 *   isSoftDeleted?: boolean,
 *   onOpenDetail: (post: import('../../services/tournamentPosts').TournamentPostRecord, focusComment?: boolean) => void,
 *   onOpenProfile?: (user: any) => void,
 *   onRestore: (postId: string) => void,
 *   onLongPress?: (post: import('../../services/tournamentPosts').TournamentPostRecord, point: { x: number, y: number }) => void,
 *   cardRef?: (el: HTMLElement | null) => void,
 *   hiddenMediaKey?: string | null,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, thumbUrl: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void,
 *   scrollRootRef?: React.RefObject<HTMLElement | null>
 * }} props
 */
function TournamentPostCard({
  post,
  players = [],
  userIsModerator = false,
  isSoftDeleted = false,
  onOpenDetail,
  onOpenProfile,
  onRestore,
  onLongPress,
  cardRef,
  hiddenMediaKey = null,
  onOpenFullscreen,
  scrollRootRef,
  user = null
}) {
  const participants = Array.isArray(post.participants) ? post.participants : [];

  const playerMap = useMemo(() => {
    const map = new Map();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  const comments = useMemo(
    () => readTournamentComments(post).filter((c) => c.is_deleted !== true),
    [post]
  );
  const previewComments = comments.slice(-2);
  const commentCount = comments.length;

  const trackViews = Boolean(user?.id) && !isSoftDeleted && post?.is_deleted !== true;
  const viewRef = usePostViewTracker({
    objectType: 'tournament_post',
    objectId: post?.id,
    enabled: trackViews,
    scrollRootRef
  });

  const handleLongPress = useCallback(
    (point) => {
      onLongPress?.(post, point);
    },
    [onLongPress, post]
  );

  const { handlers: longPressHandlers, cardStyle, ringProps } = useLongPress({
    enabled: userIsModerator && !isSoftDeleted,
    onLongPress: handleLongPress
  });

  const handleOpenDetail = () => {
    onOpenDetail(post);
  };

  const handleOpenComments = (event) => {
    event.stopPropagation();
    onOpenDetail(post, true);
  };

  const handleCardClick = (event) => {
    // Лайк/комменты/ссылки/медиа — не открывать деталку
    if (
      event.target instanceof Element &&
      event.target.closest(
        'button, a, input, textarea, [role="button"], .post-card-like, .post-card-comment-btn, .comments-preview-trigger, .telegram-post-media-grid'
      )
    ) {
      return;
    }
    longPressHandlers.onClick(event);
    if (event.defaultPrevented) return;
    handleOpenDetail();
  };

  const handlePostTextClick = (event) => {
    if (event.target instanceof Element && event.target.closest('a[href]')) {
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    onOpenDetail(post);
  };

  const handleCommentsPreviewKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleOpenComments(event);
  };

  const handleOpenParticipantProfile = (event, participant) => {
    event.stopPropagation();
    onOpenProfile?.(getParticipantPlayer(participant, playerMap));
  };

  if (isSoftDeleted && userIsModerator) {
    return (
      <div className="feed-card soft-deleted-card">
        <div className="soft-deleted-text-group">
          <p className="soft-deleted-title">Вы удалили публикацию.</p>
          <p className="soft-deleted-subtitle">Но пока всё ещё можете её восстановить</p>
        </div>
        <button
          type="button"
          className="restore-post-btn"
          onClick={() => onRestore(post.id)}
        >
          Восстановить
        </button>
      </div>
    );
  }

  return (
    <>
      <article
        ref={cardRef}
        className="tournament-post-card feed-card"
        onClick={handleCardClick}
        onPointerDown={longPressHandlers.onPointerDown}
        onPointerMove={longPressHandlers.onPointerMove}
        onPointerUp={longPressHandlers.onPointerUp}
        onPointerCancel={longPressHandlers.onPointerCancel}
        onPointerLeave={longPressHandlers.onPointerLeave}
        onContextMenu={longPressHandlers.onContextMenu}
        style={{ cursor: 'pointer', ...cardStyle }}
      >
        <div ref={viewRef} className="post-view-sentinel" aria-hidden="true" />
        <div className="feed-card-header">
          <div className="section-avatar" aria-hidden="true">
            <img className="section-avatar__image" src={sectionAvatarUrl} alt="" decoding="async" />
          </div>
          <div className="section-meta">
            <span className="section-title-name">Секция Миленьких</span>
            <span className="post-date-line">
              <span className="post-date">{formatPostDate(post.created)}</span>
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

        {post.content ? (
          <PostContentHtml
            as="div"
            role="button"
            tabIndex={0}
            className="tournament-post-content"
            onClick={handlePostTextClick}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              if (event.target instanceof Element && event.target.closest('a[href]')) return;
              event.preventDefault();
              onOpenDetail(post);
            }}
            content={post.content}
          />
        ) : null}

        <PostMedia
          post={post}
          collection="tournament_posts"
          variant="card"
          className="tournament-post-media"
          hiddenMediaKey={hiddenMediaKey}
          onOpenFullscreen={onOpenFullscreen}
          scrollRootRef={scrollRootRef}
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
                    onClick={(event) => handleOpenParticipantProfile(event, participant)}
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

        <div
          className="feed-card-footer feed-card-bottom-bar tournament-post-card-footer"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="post-card-comment-btn"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleOpenComments}
            aria-label={`Открыть комментарии к публикации. Комментариев: ${commentCount}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-4.5A8 8 0 1 1 21 12Z" />
            </svg>
            <span className="post-card-comment-btn__count">{commentCount}</span>
          </button>
        </div>

        {previewComments.length > 0 && (
          <div
            role="button"
            tabIndex={0}
            className="comments-preview-trigger"
            onClick={handleOpenComments}
            onKeyDown={handleCommentsPreviewKeyDown}
            aria-label="Открыть комментарии к публикации"
          >
            <CommentsPreview comments={previewComments} />
          </div>
        )}
      </article>

      <LongPressRing {...ringProps} />
    </>
  );
}

export default memo(TournamentPostCard);
