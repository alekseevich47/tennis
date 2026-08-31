import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CommentEditInlineForm from '../feed/CommentEditInlineForm';
import CommentComposeForm from '../feed/CommentComposeForm';
import CommentListItem from '../feed/CommentListItem';
import CommentMediaBody from '../feed/CommentMediaBody';
import CommentReplyComposeBar from '../feed/CommentReplyComposeBar';
import { groupCommentsByDay } from '../feed/commentListLayout';
import DayGroup from '../feed/DayGroup';
import { hasVisibleText } from '../feed/postRichText';
import {
  keepCommentEditInView
} from '../feed/keepCommentEditInView';
import '../feed/Feed.css';
import { useTournamentComments } from '../../hooks/useTournamentComments';
import { useCommentLikes } from '../../hooks/useCommentLikes';
import {
  buildTournamentCommentMediaReorderFormData,
  createTournamentComment,
  updateTournamentComment,
  PENDING_DELETE_TOURNAMENT_COMMENTS_KEY
} from '../../services/tournamentComments';
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
 *   composeTarget?: HTMLElement | null,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, thumbUrl?: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect | null, originKey?: string) => void
 * }} props
 */
function TournamentCommentsSection({
  postId,
  user,
  userIsModerator,
  onOpenProfile,
  onCommentMutated,
  highlightCommentId = null,
  composeTarget = null,
  onOpenFullscreen
}) {
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [replyTo, setReplyTo] = useState(/** @type {any | null} */ (null));
  const [softDeletedIds, setSoftDeletedIds] = useState([]);
  const [highlightedId, setHighlightedId] = useState(/** @type {string | null} */ (null));

  const isAddingCommentRef = useRef(false);
  const commentFieldRef = useRef(/** @type {{ focus: () => void, clear: () => void } | null} */ (null));
  const editFieldRef = useRef(/** @type {{ focus: () => void, clear: () => void } | null} */ (null));
  const editFormRef = useRef(/** @type {HTMLFormElement | null} */ (null));
  const commentItemRefs = useRef(/** @type {Map<string, HTMLElement>} */ (new Map()));
  const commentsTopRef = useRef(/** @type {HTMLDivElement | null} */ (null));
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
      commentsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const handleAdd = async ({ text, mediaFiles, captionAbove }) => {
    if ((!hasVisibleText(text) && !(mediaFiles?.length > 0)) || !postId || isAddingCommentRef.current) {
      return;
    }
    if (!user?.id) {
      error('Нельзя создавать комментарий без авторизации.');
      return;
    }
    const replyToId = replyTo?.id || null;
    isAddingCommentRef.current = true;
    setIsAddingComment(true);
    setReplyTo(null);
    try {
      await createTournamentComment(postId, text, user.id, replyToId, {
        mediaFiles,
        captionAbove
      });
      await mutateComments();
      onCommentMutated?.();
    } catch (err) {
      error('Ошибка добавления комментария:', err);
      setCommentText(text);
      throw err;
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
    setReplyTo(null);
  };

  const handleSaveEdit = async ({ text, orderedMedia, orderChanged, mediaChanged, originalNames }) => {
    if (!editingId) return;
    if (!hasVisibleText(text) && orderedMedia.length === 0) return;
    try {
      if (mediaChanged ?? orderChanged) {
        const formData = await buildTournamentCommentMediaReorderFormData(
          text,
          originalNames,
          orderedMedia
        );
        await updateTournamentComment(editingId, formData);
      } else {
        await updateTournamentComment(editingId, { text });
      }
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
      <div className="tournament-comments-list modal-comments-list" ref={commentsTopRef}>
        {comments.length === 0 ? (
              <p className="tournament-comments-empty">Пока нет комментариев</p>
            ) : (
              groupCommentsByDay(comments).map((group) => (
                <DayGroup key={group.dayKey} label={group.dateLabel} variant="comments">
                  {group.items.map((c) => {
                    const isOwner = c.author === user?.id;
                    const isSoftDeleted = softDeletedIds.includes(c.id) || c.is_deleted === true;
                    const canReply = user?.can_comment !== false;

                    if (isSoftDeleted) {
                      if (!isOwner && !userIsModerator) return null;
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

                    return (
                      <CommentListItem
                        key={c.id}
                        comment={c}
                        isOwner={isOwner}
                        userIsModerator={userIsModerator}
                        isHighlighted={highlightedId === c.id}
                        isEditing={editingId === c.id}
                        swipeEnabled={canReply && editingId !== c.id}
                        canReply={canReply}
                        canDelete={isOwner || userIsModerator}
                        canEdit={isOwner && editingId !== c.id}
                        likeCount={countsByComment[c.id] || 0}
                        isLiked={userLikedSet.has(c.id)}
                        parentComment={c.expand?.reply_to}
                        userId={user?.id}
                        onReply={() => handleReply(c)}
                        onToggleLike={() => handleToggleLike(c.id)}
                        onStartEdit={() => handleStartEdit(c)}
                        onDelete={() => handleSoftDelete(c.id)}
                        onOpenProfile={onOpenProfile}
                        onFocusParent={() => focusCommentInList(c.expand?.reply_to?.id, 'start')}
                        innerRef={(node) => {
                          if (node) commentItemRefs.current.set(c.id, node);
                          else commentItemRefs.current.delete(c.id);
                        }}
                        editForm={
                          <CommentEditInlineForm
                            comment={c}
                            collection={COMMENT_COLLECTION}
                            formRef={editFormRef}
                            fieldRef={editFieldRef}
                            onSave={handleSaveEdit}
                            onCancel={() => setEditingId(null)}
                          />
                        }
                      >
                        <CommentMediaBody
                          comment={c}
                          collection="tournament_comments"
                          variant={isOwner ? 'own' : 'other'}
                          onOpenMedia={(items, index, event) => {
                            if (!onOpenFullscreen || !items.length) return;
                            const gallery = items.map((item) => ({
                              filename: item.name,
                              url: item.fullUrl || item.url,
                              thumbUrl: item.url,
                              isVideo: item.isVideo,
                              originKey: `t-comment-${c.id}-${item.key}`
                            }));
                            const originRect =
                              event?.currentTarget?.getBoundingClientRect?.() || null;
                            onOpenFullscreen(
                              gallery,
                              index,
                              originRect,
                              gallery[index]?.originKey
                            );
                          }}
                        />
                      </CommentListItem>
                    );
                  })}
                </DayGroup>
              ))
            )}
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
      <CommentComposeForm
        id={`tournament-comment-input-${postId}`}
        value={commentText}
        onChange={setCommentText}
        fieldRef={commentFieldRef}
        busy={isAddingComment}
        onSubmit={handleAdd}
        formClassName="tournament-comment-form modal-comment-form-footer"
        replySlot={
          <CommentReplyComposeBar comment={replyTo} onCancel={() => setReplyTo(null)} />
        }
      />
    );

  return (
    <>
      {listNode}
      {composeTarget && !editingId ? createPortal(composeNode, composeTarget) : null}
    </>
  );
}

export default TournamentCommentsSection;
