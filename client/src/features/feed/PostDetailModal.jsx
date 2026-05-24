import React, { useEffect, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import PostMedia from './PostMedia';
import { useComments } from '../../hooks/useComments';
import { formatPostDate } from '../../lib/format';
import {
  createComment,
  updateComment
} from '../../services/posts';
import pb from '../../services/pb';
import { error } from '../../lib/log';

const SCROLL_INTO_VIEW_DELAY_MS = 200;
const FOCUS_COMMENT_DELAY_MS = 150;

/**
 * @param {{
 *   isOpen: boolean,
 *   post: any | null,
 *   focusComment?: boolean,
 *   user: any,
 *   userIsModerator: boolean,
 *   onOpenEdit: (post: any) => void,
 *   onDeletePost: (postId: string) => void,
 *   hiddenMediaKey?: string | null,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void,
 *   onClose: () => void,
 *   onAfterClose: () => void
 * }} props
 */
function PostDetailModal({
  isOpen,
  post,
  focusComment = false,
  user,
  userIsModerator,
  onOpenEdit,
  onDeletePost,
  hiddenMediaKey,
  onOpenFullscreen,
  onClose,
  onAfterClose
}) {
  const postId = post?.id || null;
  const { data: comments = [], mutate: mutateComments } = useComments(postId);

  const [showAll, setShowAll] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  // Soft-удалённые в рамках текущей сессии модалки. Стираются в БД при закрытии.
  const [softDeletedIds, setSoftDeletedIds] = useState([]);

  const commentsBottomRef = useRef(null);
  const isAddingCommentRef = useRef(false);
  const scrollTimerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setShowAll(false);
    setEditingId(null);
    setEditingText('');
    setIsAddingComment(false);
    isAddingCommentRef.current = false;
    setSoftDeletedIds([]);
  }, [isOpen, postId]);

  useEffect(() => {
    if (!isOpen || !focusComment) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById('post-detail-comment-input')?.focus();
    }, FOCUS_COMMENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isOpen, focusComment, postId]);

  // Cleanup таймера scrollIntoView при закрытии (фикс C7).
  useEffect(() => {
    if (!isOpen || comments.length === 0) return undefined;
    scrollTimerRef.current = window.setTimeout(() => {
      commentsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, SCROLL_INTO_VIEW_DELAY_MS);
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, [isOpen, comments.length]);

  const persistPendingDeletes = (idsList) => {
    sessionStorage.setItem('pending_delete_comments', JSON.stringify(idsList));
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
      await createComment({ postId, authorId: user.id, text });
      setCommentText('');
      await mutateComments();
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
      await updateComment(commentId, { is_deleted: true });
      await mutateComments();
    } catch (err) {
      error('soft delete comment:', err);
    }
  };

  const handleRestore = async (commentId) => {
    setSoftDeletedIds((prev) => {
      const next = prev.filter((id) => id !== commentId);
      persistPendingDeletes(next);
      return next;
    });
    try {
      await updateComment(commentId, { is_deleted: false });
      await mutateComments();
    } catch (err) {
      error('restore comment:', err);
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
      await updateComment(commentId, { text: editingText });
      setEditingId(null);
      await mutateComments();
    } catch (err) {
      error('save edit comment:', err);
    }
  };

  const handleClose = async () => {
    onClose();
    // Окончательное удаление soft-deleted комментов после закрытия.
    const ids = softDeletedIds;
    if (ids.length > 0) {
      try {
        await Promise.all(
          ids.map((id) =>
            pb.collection('comments').delete(id).catch((e) => error('hard delete comment:', e))
          )
        );
      } finally {
        sessionStorage.removeItem('pending_delete_comments');
      }
    }
    onAfterClose();
  };

  if (!post) return null;

  const displayed = showAll ? comments : comments.slice(-2);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabel="Просмотр поста и комментариев"
      size="large"
      showCloseButton={false}
      footer={
        <form onSubmit={handleAdd} className="modal-comment-form-footer">
          <label htmlFor="post-detail-comment-input" className="visually-hidden">
            Написать комментарий
          </label>
          <input
            id="post-detail-comment-input"
            type="text"
            name="post-comment"
            autoComplete="off"
            placeholder="Написать комментарий…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={isAddingComment}
            required
          />
          <button type="submit" disabled={isAddingComment || !commentText.trim()}>
            {isAddingComment ? 'Отправляем…' : 'Отправить'}
          </button>
        </form>
      }
    >
      <div className="feed-card-header">
        <div className="section-avatar" aria-hidden="true">🎾</div>
        <div className="section-meta">
          <span className="section-title-name">Секция Миленьких</span>
          <span className="post-date">{formatPostDate(post.created)}</span>
        </div>
        {userIsModerator && (
          <div className="post-card-actions" role="group" aria-label="Действия с публикацией">
            <IconButton
              ariaLabel="Редактировать публикацию"
              variant="ghost"
              size="sm"
              className="edit-post-btn"
              onClick={() => {
                onOpenEdit(post);
                handleClose();
              }}
            >
              <span aria-hidden="true">✎</span>
            </IconButton>
            <IconButton
              ariaLabel="Удалить публикацию"
              variant="danger"
              size="sm"
              className="delete-post-btn"
              onClick={() => {
                onDeletePost(post.id);
                handleClose();
              }}
            >
              <span aria-hidden="true">🗑</span>
            </IconButton>
          </div>
        )}
      </div>

      <p className="post-text-detail">{post.content || post.text}</p>
      <PostMedia
        post={post}
        variant="detail"
        hiddenMediaKey={hiddenMediaKey}
        onOpenFullscreen={onOpenFullscreen}
      />

      <div className="modal-comments-section">
        <h3>Комментарии ({comments.length})</h3>

        {comments.length > 2 && !showAll && (
          <button
            type="button"
            className="show-more-comments-btn"
            onClick={() => setShowAll(true)}
          >
            Показать ещё ({comments.length - 2})
          </button>
        )}

        <div className="modal-comments-list">
          {displayed.map((c) => {
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

            return (
              <div key={c.id} className="modal-comment-item">
                <div className="comment-header-row">
                  <span className="comment-author-name">
                    {c.expand?.author?.full_name || 'Игрок секции'}
                  </span>
                  <div className="comment-actions-btns">
                    {isOwner && editingId !== c.id && (
                      <IconButton
                        ariaLabel="Редактировать комментарий"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(c)}
                      >
                        <span aria-hidden="true">✏️</span>
                      </IconButton>
                    )}
                    {canDelete && (
                      <IconButton
                        ariaLabel="Удалить комментарий"
                        size="sm"
                        variant="danger"
                        onClick={() => handleSoftDelete(c.id)}
                      >
                        <span aria-hidden="true">✕</span>
                      </IconButton>
                    )}
                  </div>
                </div>

                {editingId === c.id ? (
                  <form
                    onSubmit={(e) => handleSaveEdit(c.id, e)}
                    className="comment-edit-inline-form"
                  >
                    <label
                      htmlFor={`edit-comment-${c.id}`}
                      className="visually-hidden"
                    >
                      Редактирование комментария
                    </label>
                    <input
                      id={`edit-comment-${c.id}`}
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
                    <span className="comment-timestamp-text">{formatPostDate(c.created)}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div ref={commentsBottomRef} />
      </div>
    </Modal>
  );
}

export default PostDetailModal;
