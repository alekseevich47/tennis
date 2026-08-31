import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import ModalFloatingCloseButton from '../../components/ui/ModalFloatingCloseButton';
import PostMedia from './PostMedia';
import PostContentHtml from './PostContentHtml';
import CommentEditInlineForm from './CommentEditInlineForm';
import CommentComposeForm from './CommentComposeForm';
import CommentListItem from './CommentListItem';
import CommentMediaBody from './CommentMediaBody';
import CommentReplyComposeBar from './CommentReplyComposeBar';
import { mapCommentsWithDaySeparators } from './commentListLayout';
import PostContextMenu from './PostContextMenu';
import { hasVisibleText } from './postRichText';
import {
  findScrollParent,
  keepCommentEditInView
} from './keepCommentEditInView';
import sectionAvatarUrl from '../../assets/sm-avatar.png';
import { useComments } from '../../hooks/useComments';
import { useCommentLikes } from '../../hooks/useCommentLikes';
import { formatPostDate } from '../../lib/format';
import {
  buildCommentMediaReorderFormData,
  createComment,
  hardDeleteComment,
  updateComment
} from '../../services/posts';
import { recordContentView } from '../../services/stats';
import { error } from '../../lib/log';
import { useKeepForModalClose } from '../../hooks/useKeepForModalClose';

const SCROLL_INTO_VIEW_DELAY_MS = 200;
const HIGHLIGHT_MS = 2500;
const COMMENT_COLLECTION = 'comments';

/**
 * @param {{
 *   isOpen: boolean,
 *   post: any | null,
 *   focusComment?: boolean,
 *   highlightCommentId?: string | null,
 *   user: any,
 *   userIsModerator: boolean,
 *   hiddenMediaKey?: string | null,
 *   onOpenFullscreen?: (items: Array<{ filename: string, url: string, isVideo: boolean, originKey: string }>, index: number, originRect?: DOMRect, originKey?: string) => void,
 *   onClose: () => void,
 *   onAfterClose: () => void,
 *   onOpenProfile?: (user: any) => void,
 *   onEdit?: (post: any) => void,
 *   onDelete?: (postId: string) => void,
 *   onTogglePin?: (post: any) => void,
 *   trackView?: boolean
 * }} props
 */
function PostDetailModal({
  isOpen,
  post: postProp,
  focusComment = false,
  highlightCommentId = null,
  user,
  userIsModerator,
  hiddenMediaKey,
  onOpenFullscreen,
  onClose,
  onAfterClose,
  onOpenProfile,
  onEdit,
  onDelete,
  onTogglePin,
  trackView = true
}) {
  const post = useKeepForModalClose(isOpen, postProp);
  const postId = post?.id || null;
  const { data: comments = [], mutate: mutateComments } = useComments(postId);

  const [showAll, setShowAll] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [replyTo, setReplyTo] = useState(/** @type {any | null} */ (null));
  // Soft-удалённые в рамках текущей сессии модалки. Стираются в БД при закрытии.
  const [softDeletedIds, setSoftDeletedIds] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchorRect, setMenuAnchorRect] = useState(
    /** @type {{ left: number, top: number, right: number, bottom: number, width: number, height: number } | null} */ (null)
  );
  const [highlightedId, setHighlightedId] = useState(/** @type {string | null} */ (null));

  const commentsBottomRef = useRef(null);
  const commentItemRefs = useRef(/** @type {Map<string, HTMLElement>} */ (new Map()));
  const commentFieldRef = useRef(/** @type {{ focus: () => void, clear: () => void } | null} */ (null));
  const editFieldRef = useRef(/** @type {{ focus: () => void, clear: () => void } | null} */ (null));
  const editFormRef = useRef(/** @type {HTMLFormElement | null} */ (null));
  const isAddingCommentRef = useRef(false);
  const scrollTimerRef = useRef(null);
  const highlightClearRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const expandAnchorRef = useRef(
    /** @type {{ id: string, offsetTop: number, scrollTop: number, scrollParent: HTMLElement } | null} */ (null)
  );
  const menuBtnRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const closeBtnRef = useRef(/** @type {HTMLButtonElement | null} */ (null));

  const activeCommentIds = useMemo(
    () =>
      comments
        .filter((c) => !softDeletedIds.includes(c.id) && c.is_deleted !== true)
        .map((c) => c.id),
    [comments, softDeletedIds]
  );

  const { countsByComment, userLikedSet, toggle: toggleLike } = useCommentLikes(
    isOpen ? activeCommentIds : [],
    COMMENT_COLLECTION,
    user?.id
  );

  useEffect(() => {
    if (!isOpen) return;
    setShowAll(false);
    setEditingId(null);
    setIsAddingComment(false);
    isAddingCommentRef.current = false;
    setSoftDeletedIds([]);
    setReplyTo(null);
    setCommentText('');
    setMenuOpen(false);
    setMenuAnchorRect(null);
    setHighlightedId(null);
    expandAnchorRef.current = null;
  }, [isOpen, postId]);

  useEffect(() => {
    if (!trackView || !isOpen || !postId || !user?.id) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      void recordContentView({
        objectType: 'post',
        objectId: postId,
        source: 'modal'
      }).catch(() => {});
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trackView, isOpen, postId, user?.id]);

  const focusCommentInList = (commentId, align = 'start') => {
    if (!commentId) return;
    setShowAll(true);
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
    if (!isOpen || !highlightCommentId) return undefined;
    focusCommentInList(highlightCommentId, 'center');
    return () => {
      if (highlightClearRef.current) clearTimeout(highlightClearRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только внешний highlight
  }, [isOpen, highlightCommentId, comments.length]);

  // Открытие «на начало поста» — сброс скролла body; к комментариям — только focusComment.
  useLayoutEffect(() => {
    if (!isOpen || focusComment || highlightCommentId) return;
    const body = closeBtnRef.current?.closest('.ui-modal-body');
    if (body instanceof HTMLElement) body.scrollTop = 0;
  }, [isOpen, postId, focusComment, highlightCommentId]);

  useEffect(() => {
    if (!isOpen || !focusComment || highlightCommentId) return undefined;
    const timer = window.setTimeout(() => {
      commentsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, SCROLL_INTO_VIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isOpen, focusComment, highlightCommentId, postId]);

  // После подгрузки комментариев доскроллить только если открыли с фокусом на них.
  useEffect(() => {
    if (!isOpen || !focusComment || comments.length === 0 || highlightCommentId) {
      return undefined;
    }
    scrollTimerRef.current = window.setTimeout(() => {
      commentsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, SCROLL_INTO_VIEW_DELAY_MS);
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, [isOpen, focusComment, comments.length, highlightCommentId]);

  useLayoutEffect(() => {
    const anchor = expandAnchorRef.current;
    if (!showAll || !anchor) return;
    expandAnchorRef.current = null;
    const el = commentItemRefs.current.get(anchor.id);
    if (!el || !anchor.scrollParent) return;
    const delta = el.offsetTop - anchor.offsetTop;
    anchor.scrollParent.scrollTop = anchor.scrollTop + delta;
  }, [showAll, comments]);

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
    sessionStorage.setItem('pending_delete_comments', JSON.stringify(idsList));
  };

  const handleShowMore = () => {
    const firstVisible = (showAll || highlightCommentId ? comments : comments.slice(-2))[0];
    if (firstVisible) {
      const el = commentItemRefs.current.get(firstVisible.id);
      const scrollParent = findScrollParent(el);
      if (el && scrollParent) {
        expandAnchorRef.current = {
          id: firstVisible.id,
          offsetTop: el.offsetTop,
          scrollTop: scrollParent.scrollTop,
          scrollParent
        };
      }
    }
    setShowAll(true);
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

  const handleReply = (comment) => {
    setReplyTo(comment);
    setEditingId(null);
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
      await createComment({
        postId,
        authorId: user.id,
        text,
        replyToId,
        mediaFiles,
        captionAbove
      });
      await mutateComments();
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
    setReplyTo(null);
  };

  const handleSaveEdit = async ({ text, orderedMedia, orderChanged, mediaChanged, originalNames }) => {
    if (!editingId) return;
    if (!hasVisibleText(text) && orderedMedia.length === 0) return;
    try {
      if (mediaChanged ?? orderChanged) {
        const formData = await buildCommentMediaReorderFormData(text, originalNames, orderedMedia);
        await updateComment(editingId, formData);
      } else {
        await updateComment(editingId, { text });
      }
      setEditingId(null);
      await mutateComments();
    } catch (err) {
      error('save edit comment:', err);
    }
  };

  const handleToggleLike = (commentId) => {
    if (!user?.id) return;
    toggleLike(commentId);
  };

  const handleClose = async () => {
    setMenuOpen(false);
    onClose();
    const ids = softDeletedIds;
    if (ids.length > 0) {
      try {
        await Promise.all(
          ids.map((id) =>
            hardDeleteComment(id, postId).catch((e) => error('hard delete comment:', e))
          )
        );
      } finally {
        sessionStorage.removeItem('pending_delete_comments');
      }
    }
    onAfterClose();
  };

  if (!post) return null;

  const displayed = showAll || highlightCommentId ? comments : comments.slice(-2);
  const canReply = user?.can_comment !== false;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        ariaLabel="Просмотр поста и комментариев"
        size="large"
        showCloseButton={false}
        footer={
          editingId ? null : user?.can_comment === false ? (
            <div className="comment-restricted-message">
              Вы запрещено оставлять комментарии по причине:{' '}
              {user.comment_restriction_reason || 'не указана'}. Свяжитесь с администратором.
            </div>
          ) : (
            <CommentComposeForm
              id="post-detail-comment-input"
              value={commentText}
              onChange={setCommentText}
              fieldRef={commentFieldRef}
              busy={isAddingComment}
              onSubmit={handleAdd}
              replySlot={
                <CommentReplyComposeBar comment={replyTo} onCancel={() => setReplyTo(null)} />
              }
            />
          )
        }
      >
        <div className="post-detail-header">
          <div className="feed-card-header post-detail-card-header">
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
          <div className="post-detail-actions">
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
              ref={closeBtnRef}
              type="button"
              className="ui-modal-close"
              ariaLabel="Закрыть"
              onClick={handleClose}
            >
              <span aria-hidden="true">✕</span>
            </IconButton>
          </div>
        </div>

        <ModalFloatingCloseButton
          isOpen={isOpen}
          anchorRef={closeBtnRef}
          onClose={handleClose}
        />

        {post.caption_above !== false ? (
          <PostContentHtml
            as="p"
            className="post-text-detail"
            content={post.content || post.text}
          />
        ) : null}
        <PostMedia
          post={post}
          variant="detail"
          hiddenMediaKey={hiddenMediaKey}
          onOpenFullscreen={onOpenFullscreen}
        />
        {post.caption_above === false ? (
          <PostContentHtml
            as="p"
            className="post-text-detail"
            content={post.content || post.text}
          />
        ) : null}

        <div className="modal-comments-section">
          <h3>Комментарии ({comments.length})</h3>

          {comments.length > 2 && !showAll && !highlightCommentId && (
            <button
              type="button"
              className="show-more-comments-btn"
              onClick={handleShowMore}
            >
              Показать ещё ({comments.length - 2})
            </button>
          )}

          <div className="modal-comments-list">
            {mapCommentsWithDaySeparators(displayed).map(({ comment: c, showDateSeparator, dateLabel }) => {
              const isOwner = c.author === user?.id;
              const isSoftDeleted = softDeletedIds.includes(c.id) || c.is_deleted === true;

              return (
                <React.Fragment key={c.id}>
                  {showDateSeparator ? (
                    <div className="comment-day-separator" role="separator">
                      {dateLabel}
                    </div>
                  ) : null}

                  {isSoftDeleted ? (
                    isOwner || userIsModerator ? (
                      <div className="modal-comment-item comment-soft-deleted">
                        <span className="soft-del-msg">Вы удалили комментарий. </span>
                        <button
                          type="button"
                          className="soft-restore-link"
                          onClick={() => handleRestore(c.id)}
                        >
                          Восстановить
                        </button>
                      </div>
                    ) : null
                  ) : (
                    <CommentListItem
                      comment={c}
                      isOwner={isOwner}
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
                        collection="comments"
                        variant={isOwner ? 'own' : 'other'}
                        onOpenMedia={(items, index, event) => {
                          if (!onOpenFullscreen || !items.length) return;
                          const gallery = items.map((item) => ({
                            filename: item.name,
                            url: item.fullUrl || item.url,
                            thumbUrl: item.url,
                            isVideo: item.isVideo,
                            originKey: `comment-${c.id}-${item.key}`
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
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div ref={commentsBottomRef} />
        </div>
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

export default PostDetailModal;
