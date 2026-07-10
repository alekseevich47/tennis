import React, { useEffect, useMemo, useRef, useState } from 'react';
import IconButton from '../../components/ui/IconButton';
import Avatar from '../../components/ui/Avatar';
import { useTournamentComments } from '../../hooks/useTournamentComments';
import { useCommentLikes } from '../../hooks/useCommentLikes';
import { toggleCommentLike } from '../../services/posts';
import {
  createTournamentComment,
  updateTournamentComment,
  PENDING_DELETE_TOURNAMENT_COMMENTS_KEY
} from '../../services/tournamentComments';
import { formatPostDate } from '../../lib/format';
import { error } from '../../lib/log';

const COMMENT_COLLECTION = 'tournament_comments';

/**
 * @param {{
 *   postId: string,
 *   user: any,
 *   userIsModerator: boolean,
 *   onOpenProfile?: (user: any) => void,
 *   onCommentMutated?: () => void
 * }} props
 */
function TournamentCommentsSection({ postId, user, userIsModerator, onOpenProfile, onCommentMutated }) {
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [softDeletedIds, setSoftDeletedIds] = useState([]);
  const [togglingLikeId, setTogglingLikeId] = useState(null);

  const isAddingCommentRef = useRef(false);

  const { data: comments = [], mutate: mutateComments } = useTournamentComments(postId);

  const activeCommentIds = useMemo(
    () =>
      comments
        .filter((c) => !softDeletedIds.includes(c.id) && c.is_deleted !== true)
        .map((c) => c.id),
    [comments, softDeletedIds]
  );

  const { countsByComment, userLikedSet, mutateLikes } = useCommentLikes(
    activeCommentIds,
    COMMENT_COLLECTION,
    user?.id
  );

  useEffect(() => {
    setEditingId(null);
    setEditingText('');
    setIsAddingComment(false);
    isAddingCommentRef.current = false;
    setSoftDeletedIds([]);
  }, [postId]);

  const persistPendingDeletes = (idsList) => {
    if (idsList.length > 0) {
      sessionStorage.setItem(PENDING_DELETE_TOURNAMENT_COMMENTS_KEY, JSON.stringify(idsList));
    } else {
      sessionStorage.removeItem(PENDING_DELETE_TOURNAMENT_COMMENTS_KEY);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !postId || isAddingCommentRef.current) return;
    if (!user?.id) {
      error('Нельзя создавать комментарий без авторизации.');
      return;
    }
    isAddingCommentRef.current = true;
    setIsAddingComment(true);
    try {
      await createTournamentComment(postId, text, user.id);
      setCommentText('');
      await mutateComments();
      onCommentMutated?.();
    } catch (err) {
      error('Ошибка добавления комментария:', err);
    } finally {
      isAddingCommentRef.current = false;
      setIsAddingComment(false);
    }
  };

  const handleSoftDelete = async (commentId) => {
    setSoftDeletedIds((prev) => {
      const next = [...prev, commentId];
      persistPendingDeletes(next);
      return next;
    });
    try {
      await updateTournamentComment(commentId, { is_deleted: true });
      await mutateComments();
      onCommentMutated?.();
    } catch (err) {
      error('soft delete tournament comment:', err);
    }
  };

  const handleRestore = async (commentId) => {
    setSoftDeletedIds((prev) => {
      const next = prev.filter((id) => id !== commentId);
      persistPendingDeletes(next);
      return next;
    });
    try {
      await updateTournamentComment(commentId, { is_deleted: false });
      await mutateComments();
    } catch (err) {
      error('restore tournament comment:', err);
    }
  };

  const handleStartEdit = (comment) => {
    setEditingId(comment.id);
    setEditingText(comment.text || '');
  };

  const handleSaveEdit = async (commentId, e) => {
    e.preventDefault();
    if (!editingText.trim()) return;
    try {
      await updateTournamentComment(commentId, { text: editingText });
      setEditingId(null);
      await mutateComments();
    } catch (err) {
      error('save edit tournament comment:', err);
    }
  };

  const handleToggleLike = async (commentId) => {
    if (!user?.id || togglingLikeId) return;
    setTogglingLikeId(commentId);
    try {
      await toggleCommentLike(commentId, COMMENT_COLLECTION, user.id);
      await mutateLikes();
    } catch (err) {
      error('toggle comment like:', err);
    } finally {
      setTogglingLikeId(null);
    }
  };

  return (
    <div className="tournament-comments">
      <div className="tournament-comments-list">
        {comments.length === 0 ? (
              <p className="tournament-comments-empty">Пока нет комментариев</p>
            ) : (
              comments.map((c) => {
                const isOwner = c.author === user?.id;
                const isSoftDeleted = softDeletedIds.includes(c.id) || c.is_deleted === true;

                if (isSoftDeleted) {
                  if (isOwner || userIsModerator) {
                    return (
                      <div key={c.id} className="modal-comment-item comment-soft-deleted">
                        <span className="soft-del-msg">Вы удалили комментарий. </span>
                        <button
                          type="button"
                          className="soft-restore-link"
                          onClick={() => handleRestore(c.id)}
                        >
                          Восстановить
                        </button>
                      </div>
                    );
                  }
                  return null;
                }

                const canDelete = isOwner || userIsModerator;
                const likeCount = countsByComment[c.id] || 0;
                const isLiked = userLikedSet.has(c.id);

                return (
                  <div key={c.id} className="modal-comment-item">
                    <div className="comment-header-row">
                      <button
                        type="button"
                        className="comment-author-profile-link"
                        onClick={() => onOpenProfile?.(c.expand?.author)}
                        aria-label={`Открыть профиль ${c.expand?.author?.full_name || 'игрока'}`}
                      >
                        <Avatar user={c.expand?.author} size="sm" />
                        <span className="comment-author-name">
                          {c.expand?.author?.full_name || 'Игрок секции'}
                        </span>
                      </button>
                      <div className="comment-actions-btns">
                        {isOwner && editingId !== c.id && (
                          <IconButton
                            ariaLabel="Редактировать комментарий"
                            size="sm"
                            variant="ghost"
                            className="post-comment-icon-button post-comment-icon-button--edit"
                            onClick={() => handleStartEdit(c)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              focusable="false"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 20h4.2L19.3 8.9a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
                              <path d="m13.7 6.1 4.2 4.2" />
                            </svg>
                          </IconButton>
                        )}
                        {canDelete && (
                          <IconButton
                            ariaLabel="Удалить комментарий"
                            size="sm"
                            variant="danger"
                            className="post-comment-icon-button post-comment-icon-button--delete"
                            onClick={() => handleSoftDelete(c.id)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              focusable="false"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 7h16" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M6 7l1 13h10l1-13" />
                              <path d="M9 7V4h6v3" />
                            </svg>
                          </IconButton>
                        )}
                      </div>
                    </div>

                    {editingId === c.id ? (
                      <form
                        onSubmit={(e) => handleSaveEdit(c.id, e)}
                        className="comment-edit-inline-form"
                      >
                        <label htmlFor={`edit-tournament-comment-${c.id}`} className="visually-hidden">
                          Редактирование комментария
                        </label>
                        <input
                          id={`edit-tournament-comment-${c.id}`}
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          required
                        />
                        <button type="submit">ОК</button>
                        <button type="button" onClick={() => setEditingId(null)}>
                          Отмена
                        </button>
                      </form>
                    ) : (
                      <>
                        <p className="comment-content-text">{c.text}</p>
                        <div className="comment-footer-row">
                          <button
                            type="button"
                            className={`comment-like-btn${isLiked ? ' comment-like-btn--active' : ''}`}
                            onClick={() => handleToggleLike(c.id)}
                            disabled={!user?.id || togglingLikeId === c.id}
                            aria-label={isLiked ? 'Убрать лайк' : 'Поставить лайк'}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                            {likeCount > 0 && (
                              <span className="comment-like-count">{likeCount}</span>
                            )}
                          </button>
                          <span className="comment-timestamp-text">{formatPostDate(c.created)}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
      </div>

      {user?.can_comment === false ? (
        <div className="comment-restricted-message tournament-comments-restricted">
          Вы запрещено оставлять комментарии по причине:{' '}
          {user.comment_restriction_reason || 'не указана'}. Свяжитесь с администратором.
        </div>
      ) : (
        <form onSubmit={handleAdd} className="tournament-comment-form">
          <label htmlFor={`tournament-comment-input-${postId}`} className="visually-hidden">
            Написать комментарий
          </label>
          <input
            id={`tournament-comment-input-${postId}`}
            type="text"
            name="tournament-comment"
            autoComplete="off"
            placeholder="Написать комментарий…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={isAddingComment}
            required
          />
          <button type="submit" disabled={isAddingComment || !commentText.trim()}>
            {isAddingComment ? '…' : 'Отправить'}
          </button>
        </form>
      )}
    </div>
  );
}

export default TournamentCommentsSection;
