import React, { memo, useMemo } from 'react';
import IconButton from '../../components/ui/IconButton';
import Avatar from '../../components/ui/Avatar';
import PostMedia from '../feed/PostMedia';
import CommentsPreview from '../feed/CommentsPreview';
import TournamentPodium from './TournamentPodium';
import sectionAvatarUrl from '../../assets/sm-avatar.png';
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
 *   userIsModerator?: boolean,
 *   isSoftDeleted?: boolean,
 *   onOpenDetail: (post: import('../../services/tournamentPosts').TournamentPostRecord) => void,
 *   onOpenEdit: (post: import('../../services/tournamentPosts').TournamentPostRecord) => void,
 *   onDelete: (postId: string) => void,
 *   onRestore: (postId: string) => void,
 *   hiddenMediaKey?: string | null,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, thumbUrl: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void
 * }} props
 */
function TournamentPostCard({
  post,
  players = [],
  userIsModerator = false,
  isSoftDeleted = false,
  onOpenDetail,
  onOpenEdit,
  onDelete,
  onRestore,
  hiddenMediaKey = null,
  onOpenFullscreen
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

  const handleOpenDetail = () => {
    onOpenDetail(post);
  };

  const handleOpenEdit = (event) => {
    event.stopPropagation();
    onOpenEdit(post);
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    onDelete(post.id);
  };

  const handleCommentsPreviewKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleOpenDetail();
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
    <article
      className="tournament-post-card feed-card"
      onClick={handleOpenDetail}
      style={{ cursor: 'pointer' }}
    >
      <div className="feed-card-header">
        <div className="section-avatar" aria-hidden="true">
          <img className="section-avatar__image" src={sectionAvatarUrl} alt="" decoding="async" />
        </div>
        <div className="section-meta">
          <span className="section-title-name">Секция Миленьких</span>
          <span className="post-date-line">
            <span className="post-date">{formatPostDate(post.created)}</span>
            {post.post_number ? <span className="post-number">#{post.post_number}</span> : null}
          </span>
        </div>
        {userIsModerator && (
          <div className="post-card-actions" role="group" aria-label="Действия с публикацией">
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
            <IconButton
              ariaLabel="Удалить публикацию"
              variant="danger"
              size="sm"
              className="delete-post-btn"
              onClick={handleDelete}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 7h16" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M6 7l1 13h10l1-13" />
                <path d="M9 7V4h6v3" />
              </svg>
            </IconButton>
          </div>
        )}
      </div>

      {post.content ? <p className="tournament-post-content">{post.content}</p> : null}

      <div onClick={(event) => event.stopPropagation()}>
        <PostMedia
          post={post}
          collection="tournament_posts"
          variant="card"
          className="tournament-post-media"
          hiddenMediaKey={hiddenMediaKey}
          onOpenFullscreen={onOpenFullscreen}
        />
      </div>

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

      <button
        type="button"
        className="post-card-comment-btn"
        aria-label={`Комментариев: ${commentCount}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-4.5A8 8 0 1 1 21 12Z" />
        </svg>
        <span className="post-card-comment-btn__count">{commentCount}</span>
      </button>

      {previewComments.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          className="comments-preview-trigger"
          onClick={(event) => {
            event.stopPropagation();
            handleOpenDetail();
          }}
          onKeyDown={handleCommentsPreviewKeyDown}
          aria-label="Открыть комментарии к публикации"
        >
          <CommentsPreview comments={previewComments} />
        </div>
      )}
    </article>
  );
}

export default memo(TournamentPostCard);
