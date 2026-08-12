import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { usePosts } from '../../hooks/usePosts';
import { pinPost, unpinPost, updatePost } from '../../services/posts';
import { isModerator } from '../../services/auth';
import { usePostUpload } from '../../components/PostUploadProvider';
import EmptyState from '../../components/ui/EmptyState';
import PullToRefresh from '../../components/ui/PullToRefresh';
import { FeedListSkeleton } from '../../components/ui/Skeleton';
import PostCard from './PostCard';
import PinnedBanner from './PinnedBanner';
import PostContextMenu from './PostContextMenu';
import CreatePostModal from './CreatePostModal';
import EditPostModal from './EditPostModal';
import PostDetailModal from './PostDetailModal';
import FullscreenImageViewer from './FullscreenImageViewer';
import ProfileViewModal from '../profile/ProfileViewModal';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { useSectionScroll } from '../../hooks/useSectionScroll';
import { error } from '../../lib/log';
import { parseDateQuery, isDateQueryParsed, matchesDateQuery } from '../../lib/dateSearch';
import { sortPinnedByCreated, usePinnedBannerIndex } from './usePinnedBannerIndex';
import './Feed.css';

const SCROLL_TOP_THRESHOLD = 8;
const SCROLL_DELTA_THRESHOLD = 4;

/**
 * @param {{
 *   user: any,
 *   onDeletedIdsChange?: (ids: string[]) => void,
 *   searchQuery?: string,
 *   searchOpen?: boolean,
 *   commentTargetToOpen?: { postId?: string, commentId?: string } | null,
 *   onCommentTargetOpened?: () => void
 * }} props
 */
function FeedPage({
  user,
  onDeletedIdsChange,
  searchQuery = '',
  searchOpen = false,
  commentTargetToOpen = null,
  onCommentTargetOpened
}) {
  const userIsModerator = isModerator();
  const { data: posts, isLoading, mutate } = usePosts({ includeDeleted: userIsModerator });

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [focusComment, setFocusComment] = useState(false);
  const [highlightCommentId, setHighlightCommentId] = useState(/** @type {string | null} */ (null));
  const [editingPost, setEditingPost] = useState(null);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [hiddenMediaKey, setHiddenMediaKey] = useState(null);
  const [deletedPostIds, setDeletedPostIds] = useState([]);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [contextMenuState, setContextMenuState] = useState(
    /** @type {{ postId: string, anchorPoint: { x: number, y: number } } | null} */ (null)
  );
  const { startUpload } = usePostUpload();

  const containerRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const cardRefs = useRef(/** @type {Map<string, HTMLElement>} */ (new Map()));

  useSectionScroll(containerRef);

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useEffect(() => {
    onDeletedIdsChange?.(deletedPostIds);
  }, [deletedPostIds, onDeletedIdsChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!userIsModerator || !container) return undefined;

    const syncVisibility = (scrollTop, delta) => {
      if (scrollTop <= SCROLL_TOP_THRESHOLD) {
        setIsButtonVisible(true);
      } else if (delta < -SCROLL_DELTA_THRESHOLD) {
        setIsButtonVisible(true);
      } else if (delta > SCROLL_DELTA_THRESHOLD) {
        setIsButtonVisible(false);
      }
    };

    lastScrollTopRef.current = container.scrollTop;
    syncVisibility(container.scrollTop, 0);

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const delta = scrollTop - lastScrollTopRef.current;
      syncVisibility(scrollTop, delta);
      lastScrollTopRef.current = scrollTop;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [userIsModerator]);

  const visiblePosts = useMemo(() => {
    if (!posts) return [];
    // Модератору — карточки «Восстановить» только для soft-delete этой сессии;
    // чужие/старые is_deleted не показываем (их чистит purgeAbandonedPosts).
    return posts.filter(
      (p) => !p.is_deleted || deletedPostIds.includes(p.id)
    );
  }, [posts, deletedPostIds]);

  const pinnedPosts = useMemo(
    () =>
      sortPinnedByCreated(
        visiblePosts.filter(
          (p) => p.is_pinned && !p.is_deleted && !deletedPostIds.includes(p.id)
        )
      ),
    [visiblePosts, deletedPostIds]
  );

  const {
    activeIndex: activePinnedIndex,
    openPinned: handleOpenPinned
  } = usePinnedBannerIndex({
    pinnedPosts,
    containerRef,
    cardRefs,
    enabled: !searchOpen
  });

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return visiblePosts;
    const q = searchQuery.trim().toLowerCase();

    if (/^#?\d+$/.test(q)) {
      const num = parseInt(q.replace('#', ''), 10);
      return visiblePosts.filter((p) => p.post_number === num);
    }

    const dateQ = parseDateQuery(q);
    if (isDateQueryParsed(dateQ)) {
      return visiblePosts.filter((p) => matchesDateQuery(p.created, dateQ));
    }

    return visiblePosts.filter((p) =>
      (p.content || p.text || '').toLowerCase().includes(q)
    );
  }, [visiblePosts, searchQuery]);

  const isSearchActive = searchQuery.trim().length > 0;

  const handleDeletePost = useCallback(
    async (postId) => {
      // Optimistic update в SWR-кэше + точечный апдейт без полной перезагрузки (H10).
      setDeletedPostIds((prev) => [...prev, postId]);
      setContextMenuState(null);
      try {
        await updatePost(postId, { is_deleted: true });
        mutate(
          (curr = []) =>
            curr.map((p) => (p.id === postId ? { ...p, is_deleted: true } : p)),
          false
        );
      } catch (err) {
        error('soft delete post:', err);
      }
    },
    [mutate]
  );

  const handleRestorePost = useCallback(
    async (postId) => {
      setDeletedPostIds((prev) => prev.filter((id) => id !== postId));
      try {
        await updatePost(postId, { is_deleted: false });
        mutate(
          (curr = []) =>
            curr.map((p) => (p.id === postId ? { ...p, is_deleted: false } : p)),
          false
        );
      } catch (err) {
        error('restore post:', err);
      }
    },
    [mutate]
  );

  const handleOpenDetail = useCallback((post, shouldFocusComment = false) => {
    setSelectedPost(post);
    setFocusComment(shouldFocusComment);
    setHighlightCommentId(null);
  }, []);

  useEffect(() => {
    if (!commentTargetToOpen?.postId || !posts?.length) return;
    const post = posts.find((item) => item.id === commentTargetToOpen.postId);
    if (!post) return;
    setSelectedPost(post);
    setFocusComment(true);
    setHighlightCommentId(commentTargetToOpen.commentId || null);
    onCommentTargetOpened?.();
  }, [commentTargetToOpen, posts, onCommentTargetOpened]);

  const handleOpenEdit = useCallback((post) => {
    if (!userIsModerator) return;
    setEditingPost(post);
  }, [userIsModerator]);

  const handleTogglePin = useCallback(
    async (post) => {
      if (!userIsModerator || !post?.id) return;
      const nextPinned = !post.is_pinned;
      const pinnedAt = nextPinned ? new Date().toISOString() : null;
      mutate(
        (curr = []) =>
          curr.map((p) =>
            p.id === post.id ? { ...p, is_pinned: nextPinned, pinned_at: pinnedAt } : p
          ),
        false
      );
      setSelectedPost((current) =>
        current?.id === post.id
          ? { ...current, is_pinned: nextPinned, pinned_at: pinnedAt }
          : current
      );
      try {
        if (nextPinned) await pinPost(post.id);
        else await unpinPost(post.id);
      } catch (err) {
        error('toggle pin post:', err);
        mutate();
      }
    },
    [mutate, userIsModerator]
  );

  const handleLongPress = useCallback((post, point) => {
    if (!post?.id || !point) return;
    setContextMenuState({ postId: post.id, anchorPoint: point });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuState(null);
  }, []);

  const handleRegisterCardRef = useCallback((postId) => (el) => {
    if (el) cardRefs.current.set(postId, el);
    else cardRefs.current.delete(postId);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingPost(null);
  }, []);

  const handlePostSaved = useCallback(
    (updatedPost) => {
      mutate(
        (curr = []) =>
          curr.map((post) =>
            post.id === updatedPost.id ? { ...post, ...updatedPost } : post
          ),
        false
      );
      setSelectedPost((current) =>
        current?.id === updatedPost.id ? { ...current, ...updatedPost } : current
      );
      setEditingPost(null);
    },
    [mutate]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedPost(null);
    setFocusComment(false);
    setHighlightCommentId(null);
  }, []);

  const handleOpenFullscreen = useCallback((items, index = 0, originRect = null, originKey = null) => {
    setHiddenMediaKey(null);
    setFullscreenMedia({ items, index, originRect, originKey });
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenMedia(null);
    setHiddenMediaKey(null);
  }, []);

  const handleFullscreenCloseStart = useCallback((originKey) => {
    setHiddenMediaKey(originKey || null);
  }, []);

  const handleCreated = useCallback(
    (payload) => {
      setShowAddModal(false);
      startUpload(payload);
    },
    [startUpload]
  );

  const contextMenuPost = useMemo(() => {
    if (!contextMenuState) return null;
    return visiblePosts.find((p) => p.id === contextMenuState.postId) || null;
  }, [contextMenuState, visiblePosts]);

  return (
    <div className="feed-scroll-container" ref={containerRef}>
      <PullToRefresh
        scrollRef={containerRef}
        onRefresh={handleRefresh}
        header={(
          <>
            {userIsModerator && (
              <div className="floating-btn-wrapper">
                <button
                  type="button"
                  className={clsx('floating-add-btn', isButtonVisible ? 'visible' : 'hidden')}
                  onClick={() => setShowAddModal(true)}
                >
                  Добавить
                </button>
              </div>
            )}

            {pinnedPosts.length > 0 && !searchOpen && (
              <PinnedBanner
                pinnedPosts={pinnedPosts}
                collection="posts"
                activeIndex={activePinnedIndex}
                onOpen={handleOpenPinned}
              />
            )}
          </>
        )}
      >
        <div className="feed-list">
          {isLoading && <FeedListSkeleton />}

          {!isLoading && filteredPosts.length === 0 && (
            <EmptyState
              title={isSearchActive ? 'Ничего не найдено' : 'Пока ничего нет'}
              description={
                isSearchActive
                  ? 'Попробуйте другой запрос.'
                  : 'Здесь появятся первые публикации секции.'
              }
            />
          )}

          {filteredPosts.map((post) => {
            const isSoftDeleted =
              deletedPostIds.includes(post.id) || post.is_deleted === true;
            return (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                isSoftDeleted={isSoftDeleted}
                userIsModerator={userIsModerator}
                onOpenDetail={handleOpenDetail}
                onRestore={handleRestorePost}
                onLongPress={handleLongPress}
                cardRef={handleRegisterCardRef(post.id)}
                hiddenMediaKey={hiddenMediaKey}
                onOpenFullscreen={handleOpenFullscreen}
                scrollRootRef={containerRef}
              />
            );
          })}
        </div>
      </PullToRefresh>

      <PostContextMenu
        isOpen={Boolean(contextMenuPost && contextMenuState)}
        anchorPoint={contextMenuState?.anchorPoint ?? null}
        isPinned={Boolean(contextMenuPost?.is_pinned)}
        onTogglePin={() => contextMenuPost && handleTogglePin(contextMenuPost)}
        onEdit={() => contextMenuPost && handleOpenEdit(contextMenuPost)}
        onDelete={() => contextMenuPost && handleDeletePost(contextMenuPost.id)}
        onClose={handleCloseContextMenu}
      />

      <PostDetailModal
        isOpen={Boolean(selectedPost)}
        post={selectedPost}
        focusComment={focusComment}
        highlightCommentId={highlightCommentId}
        user={user}
        userIsModerator={userIsModerator}
        hiddenMediaKey={hiddenMediaKey}
        onOpenFullscreen={handleOpenFullscreen}
        onClose={handleCloseDetail}
        onAfterClose={() => mutate()}
        onOpenProfile={setViewingPlayer}
        onEdit={(post) => {
          handleCloseDetail();
          handleOpenEdit(post);
        }}
        onDelete={(postId) => {
          handleCloseDetail();
          handleDeletePost(postId);
        }}
        onTogglePin={handleTogglePin}
      />

      <EditPostModal
        isOpen={Boolean(editingPost)}
        post={editingPost}
        onClose={handleCloseEdit}
        onSaved={handlePostSaved}
      />

      <CreatePostModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={handleCreated}
        user={user}
      />

      {fullscreenMedia && (
        <FullscreenImageViewer
          items={fullscreenMedia.items}
          initialIndex={fullscreenMedia.index}
          originRect={fullscreenMedia.originRect}
          originKey={fullscreenMedia.originKey}
          onCloseStart={handleFullscreenCloseStart}
          onClose={handleCloseFullscreen}
        />
      )}

      <ProfileViewModal
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
        targetUser={viewingPlayer}
        currentUser={user}
      />

      <ScrollToTopButton scrollRef={containerRef} />
    </div>
  );
}

export default FeedPage;
