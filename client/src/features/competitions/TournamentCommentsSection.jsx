import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import IconButton from '../../components/ui/IconButton';
import Avatar from '../../components/ui/Avatar';
import PostContentHtml from '../feed/PostContentHtml';
import PostRichTextField from '../feed/PostRichTextField';
import CommentSendButton from '../feed/CommentSendButton';
import CommentReplyButton from '../feed/CommentReplyButton';
import CommentReplyComposeBar from '../feed/CommentReplyComposeBar';
import CommentReplyQuote from '../feed/CommentReplyQuote';
import CommentSwipeReply from '../feed/CommentSwipeReply';
import { hasVisibleText, toDisplayHtml } from '../feed/postRichText';
import {
  findScrollParent,
  keepCommentEditInView,
  restoreAndKeepCommentEditInView
} from '../feed/keepCommentEditInView';
import '../feed/Feed.css';
import { useTournamentComments } from '../../hooks/useTournamentComments';
import { useCommentLikes } from '../../hooks/useCommentLikes';
import {
  createTournamentComment,
  updateTournamentComment,
  PENDING_DELETE_TOURNAMENT_COMMENTS_KEY
} from '../../services/tournamentComments';
import { formatPostDate } from '../../lib/format';
import { error } from '../../lib/log';

const COMMENT_COLLECTION = 'tournament_comments';
const SCROLL_INTO_VIEW_DELAY_MS = 200;
const HIGHLIGHT_MS = 2500;

/**
 * @param {{
 *   postId: string,
 *   user: any,
 *   userIsModerator: boolean,
 *   onOpenProfile?: (user: any) => void,
 *   onCommentMutated?: () => void,
 *   highlightCommentId?: string | null,
 *   composeTarget?: HTMLElement | null
 * }} props
 */
function TournamentCommentsSection({
  postId,
  user,
  userIsModerator,
  onOpenProfile,
  onCommentMutated,
  highlightCommentId = null,
  composeTarget = null
}) {
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [replyTo, setReplyTo] = useState(/** @type {any | null} */ (null));
  const [softDeletedIds, setSoftDeletedIds] = useState([]);
  const [highlightedId, setHighlightedId] = useState(/** @type {string | null} */ (null));

  const isAddingCommentRef = useRef(false);
  const commentFieldRef = useRef(/** @type {{ focus: () => void, clear: () => void } | null} */ (null));
  const editFieldRef = useRef(/** @type {{ focus: () => void, clear: () => void } | null} */ (null));
  const editFormRef = useRef(/** @type {HTMLFormElement | null} */ (null));
  const editScrollTopBeforeFocusRef = useRef(/** @type {number | null} */ (null));
  const commentItemRefs = useRef(/** @type {Map<string, HTMLElement>} */ (new Map()));
  const commentsBottomRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const scrollTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const highlightClearRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const skipInitialScrollRef = useRef(true);

  const { data: comments = [], mutate: mutateComments } = useTournamentComments(postId);

  const activeCommentIds = useMemo(
    () =>
      comments
        .filter((c) => !softDeletedIds.includes(c.id) && c.is_deleted !== true)
        .map((c) => c.id),
    [comments, softDeletedIds]
  );

  const { countsByComment, userLikedSet, toggle: toggleLike } = useCommentLikes(
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
    setReplyTo(null);
    setHighlightedId(null);
    skipInitialScrollRef.current = true;
  }, [postId]);

  useEffect(() => {
    if (!postId || comments.length === 0 || highlightCommentId) return undefined;
    // Не прыгать вниз при первом открытии модалки / смене поста.
    if (skipInitialScrollRef.current) {
      skipInitialScrollRef.current = false;
      return undefined;
    }
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = window.setTimeout(() => {
      commentsBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, SCROLL_INTO_VIEW_DELAY_MS);
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, [postId, comments.length, highlightCommentId]);

  const focusCommentInList = (commentId, align = 'start') => {
    if (!commentId) return;
    setHighlightedId(commentId);
    if (highlightClearRef.current) clearTimeout(highlightClearRef.current);
    window.setTimeout(() => {
      commentItemRefs.current.get(commentId)?.scrollIntoView({
        behavior: 'smooth',
        block: align
      });
    }, SCROLL_INTO_VIEW_DELAY_MS);
    highlightClearRef.current = window.setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
  };

  useEffect(() => {
    if (!highlightCommentId || !postId) return undefined;
    focusCommentInList(highlightCommentId, 'center');
    return () => {
      if (highlightClearRef.current) clearTimeout(highlightClearRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только внешний highlight
  }, [highlightCommentId, postId, comments.length]);

  useLayoutEffect(() => {
    if (!editingId) return;
    editFieldRef.current?.focus();
    keepCommentEditInView(editFormRef.current);
  }, [editingId]);

  useEffect(() => {
    if (!editingId) return undefined;
    const onViewportChange = () => keepCommentEditInView(editFormRef.current);
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('scroll', onViewportChange);
    };
  }, [editingId]);

  const persistPendingDeletes = (idsList) => {
    if (idsList.length > 0) {
      sessionStorage.setItem(PENDING_DELETE_TOURNAMENT_COMMENTS_KEY, JSON.stringify(idsList));
    } else {
      sessionStorage.removeItem(PENDING_DELETE_TOURNAMENT_COMMENTS_KEY);
    }
  };

  const handleReply = (comment) => {
    setReplyTo(comment);
    setEditingId(null);
    // Синхронно в жесте + после layout превью ответа (sticky footer / клавиатура в webview).
    commentFieldRef.current?.focus();
    requestAnimationFrame(() => {
      commentFieldRef.current?.focus();
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!hasVisibleText(commentText) || !postId || isAddingCommentRef.current) return;
    if (!user?.id) {
      error('Нельзя создавать комментарий без авторизации.');
      return;
    }
    const text = commentText;
    const replyToId = replyTo?.id || null;
    isAddingCommentRef.current = true;
    setIsAddingComment(true);
    setCommentText('');
    setReplyTo(null);
    commentFieldRef.current?.clear();
    try {
      await createTournamentComment(postId, text, user.id, replyToId);
      await mutateComments();
      onCommentMutated?.();
    } catch (err) {
      error('Ошибка добавления комментария:', err);
      setCommentText(text);
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
    setEditingText(toDisplayHtml(comment.text || ''));
    setReplyTo(null);
  };

  const handleSaveEdit = async (commentId, e) => {
    e.preventDefault();
    if (!hasVisibleText(editingText)) return;
    try {
      await updateTournamentComment(commentId, { text: editingText });
      setEditingId(null);
      await mutateComments();
    } catch (err) {
      error('save edit tournament comment:', err);
    }
  };

  const handleToggleLike = (commentId) => {
    if (!user?.id) return;
    toggleLike(commentId);
  };

  const listNode = (
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
                const parentComment = c.expand?.reply_to;
                const canReply = user?.can_comment !== false;
                const swipeEnabled = canReply && editingId !== c.id;

                return (
                  <CommentSwipeReply
                    key={c.id}
                    className={`modal-comment-item${highlightedId === c.id ? ' modal-comment-item--highlight' : ''}`}
                    enabled={swipeEnabled}
                    onReply={() => handleReply(c)}
                    innerRef={(node) => {
                      if (node) commentItemRefs.current.set(c.id, node);
                      else commentItemRefs.current.delete(c.id);
                    }}
                  >
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
                        ref={editFormRef}
                        onSubmit={(e) => handleSaveEdit(c.id, e)}
                        className="comment-edit-inline-form"
                        onPointerDownCapture={() => {
                          const sp = findScrollParent(editFormRef.current);
                          editScrollTopBeforeFocusRef.current = sp?.scrollTop ?? null;
                        }}
                      >
                        <label htmlFor={`edit-tournament-comment-${c.id}`} className="visually-hidden">
                          Редактирование комментария
                        </label>
                        <PostRichTextField
                          ref={editFieldRef}
                          id={`edit-tournament-comment-${c.id}`}
                          value={editingText}
                          onChange={setEditingText}
                          enableFrame={false}
                          compact
                          placeholder="Текст комментария…"
                          aria-label="Редактирование комментария"
                          onFocus={() => {
                            restoreAndKeepCommentEditInView(
                              editFormRef.current,
                              editScrollTopBeforeFocusRef.current
                            );
                          }}
                        />
                        <div className="comment-edit-inline-form__actions">
                          <button type="submit" disabled={!hasVisibleText(editingText)}>
                            Изменить
                          </button>
                          <button type="button" onClick={() => setEditingId(null)}>
                            Отмена
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="comment-body-indent">
                          {parentComment ? (
                            <CommentReplyQuote
                              author={parentComment.expand?.author || null}
                              text={parentComment.text}
                              onOpenProfile={onOpenProfile}
                              onActivate={() => focusCommentInList(parentComment.id, 'start')}
                            />
                          ) : null}
                          <PostContentHtml as="p" className="comment-content-text" content={c.text} />
                        </div>
                        <div className="comment-footer-row">
                          <div className="comment-footer-actions">
                            <button
                              type="button"
                              className={`comment-like-btn${isLiked ? ' comment-like-btn--active' : ''}`}
                              onClick={() => handleToggleLike(c.id)}
                              disabled={!user?.id}
                              aria-label={isLiked ? 'Убрать лайк' : 'Поставить лайк'}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                              {likeCount > 0 && (
                                <span className="comment-like-count">{likeCount}</span>
                              )}
                            </button>
                            {canReply ? (
                              <CommentReplyButton onClick={() => handleReply(c)} />
                            ) : null}
                          </div>
                          <span className="comment-timestamp-text">{formatPostDate(c.created)}</span>
                        </div>
                      </>
                    )}
                  </CommentSwipeReply>
                );
              })
            )}
        <div ref={commentsBottomRef} />
      </div>
    </div>
  );

  const composeNode =
    user?.can_comment === false ? (
      <div className="comment-restricted-message tournament-comments-restricted">
        Вы запрещено оставлять комментарии по причине:{' '}
        {user.comment_restriction_reason || 'не указана'}. Свяжитесь с администратором.
      </div>
    ) : (
      <div className="modal-comment-footer">
        <CommentReplyComposeBar comment={replyTo} onCancel={() => setReplyTo(null)} />
        <form onSubmit={handleAdd} className="tournament-comment-form">
          <label htmlFor={`tournament-comment-input-${postId}`} className="visually-hidden">
            Написать комментарий
          </label>
          <PostRichTextField
            ref={commentFieldRef}
            id={`tournament-comment-input-${postId}`}
            value={commentText}
            onChange={setCommentText}
            enableFrame={false}
            compact
            placeholder="Написать комментарий…"
            aria-label="Написать комментарий"
          />
          <CommentSendButton
            disabled={isAddingComment || !hasVisibleText(commentText)}
            busy={isAddingComment}
          />
        </form>
      </div>
    );

  return (
    <>
      {listNode}
      {composeTarget && !editingId ? createPortal(composeNode, composeTarget) : null}
    </>
  );
}

export default TournamentCommentsSection;
