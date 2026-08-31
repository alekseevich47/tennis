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
import { useRegisterAddAction } from '../../context/AddActionContext';
import { useMentionNav } from '../../context/MentionNavContext';
import { error } from '../../lib/log';
import { parseDateQuery, isDateQueryParsed, matchesDateQuery } from '../../lib/dateSearch';
import { sortPinnedByCreated, usePinnedBannerIndex } from './usePinnedBannerIndex';
import { subscribeYadiskAlbumCache, toFullscreenAlbumItems } from './yadiskAlbumCache';
import {
  ALBUM_PREVIEW_ALL_RADIUS,
  requestAlbumLazyFocus
} from './yadiskAlbumLazy';
import {
  applyCachedBytesToViewerItems,
  subscribeYadiskMediaCache
} from './yadiskMediaSessionCache';
import { groupPostsByDay } from './commentListLayout';
import DayGroup from './DayGroup';
import './Feed.css';

/**
 * @param {{
 *   user: any,
 *   onDeletedIdsChange?: (ids: string[]) => void,
 *   searchQuery?: string,
 *   searchOpen?: boolean,
 *   commentTargetToOpen?: { postId?: string, commentId?: string } | null,
 *   onCommentTargetOpened?: () => void,
 *   captureMentionTargets?: boolean
 * }} props
 */
function FeedPage({
  user,
  onDeletedIdsChange,
  searchQuery = '',
  searchOpen = false,
  commentTargetToOpen = null,
  onCommentTargetOpened,
  captureMentionTargets = true
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
  const [contextMenuState, setContextMenuState] = useState(
    /** @type {{ postId: string, anchorPoint: { x: number, y: number } } | null} */ (null)
  );
  const { startUpload } = usePostUpload();

  const containerRef = useRef(null);
  const cardRefs = useRef(/** @type {Map<string, HTMLElement>} */ (new Map()));

  useSectionScroll(containerRef);
  useRegisterAddAction(() => setShowAddModal(true), userIsModerator);

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useEffect(() => {
    onDeletedIdsChange?.(deletedPostIds);
  }, [deletedPostIds, onDeletedIdsChange]);

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

  const mentionNav = useMentionNav();

  useEffect(() => {
    if (!commentTargetToOpen?.postId || !posts?.length) return;
    const post = posts.find((item) => item.id === commentTargetToOpen.postId);
    if (!post) return;
    setSelectedPost(post);
    setFocusComment(true);
    setHighlightCommentId(commentTargetToOpen.commentId || null);
    onCommentTargetOpened?.();
  }, [commentTargetToOpen, posts, onCommentTargetOpened]);

  useEffect(() => {
    const target = mentionNav?.postTarget;
    if (!captureMentionTargets) return;
    if (!target || target.collection !== 'posts' || !posts?.length) return;
    const post = posts.find((item) => item.id === target.postId);
    if (!post) {
      mentionNav.clearPostTarget();
      return;
    }
    setSelectedPost(post);
    setFocusComment(false);
    setHighlightCommentId(null);
    mentionNav.clearPostTarget();
  }, [mentionNav, posts, captureMentionTargets]);

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

  const handleOpenFullscreen = useCallback((items, index = 0, originRect = null, originKey = null, meta = null) => {
    setHiddenMediaKey(null);
    if (meta?.albumPublicUrl) {
      requestAlbumLazyFocus(meta.albumPublicUrl, index, {
        radius: ALBUM_PREVIEW_ALL_RADIUS,
        preferFull: true
      });
    }
    setFullscreenMedia({
      items,
      index,
      originRect,
      originKey,
      albumPublicUrl: meta?.albumPublicUrl || null
    });
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenMedia(null);
    setHiddenMediaKey(null);
  }, []);

  const handleFullscreenCloseStart = useCallback((originKey) => {
    setHiddenMediaKey(originKey || null);
  }, []);

  useEffect(() => {
    const albumPublicUrl = fullscreenMedia?.albumPublicUrl;
    if (!albumPublicUrl) return undefined;
    return subscribeYadiskAlbumCache((publicUrl, albumItems) => {
      if (publicUrl !== albumPublicUrl) return;
      const nextItems = toFullscreenAlbumItems(albumItems);
      if (!nextItems.length) return;
      setFullscreenMedia((prev) => {
        if (!prev || prev.albumPublicUrl !== albumPublicUrl) return prev;
        const currentKey = prev.items[prev.index]?.originKey;
        let nextIndex = Math.min(prev.index, nextItems.length - 1);
        if (currentKey) {
          const found = nextItems.findIndex((entry) => entry.originKey === currentKey);
          if (found >= 0) nextIndex = found;
        }
        return {
          ...prev,
          items: nextItems,
          index: Math.max(0, nextIndex)
        };
      });
    });
  }, [fullscreenMedia?.albumPublicUrl]);

  useEffect(() => {
    if (!fullscreenMedia) return undefined;
    return subscribeYadiskMediaCache((publicUrl, path, bytes) => {
      setFullscreenMedia((prev) => {
        if (!prev) return prev;
        const nextItems = applyCachedBytesToViewerItems(prev.items, publicUrl, path, bytes);
        if (nextItems === prev.items) return prev;
        return { ...prev, items: nextItems };
      });
    });
  }, [Boolean(fullscreenMedia)]);

  const handleFullscreenAlbumIndex = useCallback(
    (index) => {
      const albumPublicUrl = fullscreenMedia?.albumPublicUrl;
      if (!albumPublicUrl) return;
      requestAlbumLazyFocus(albumPublicUrl, index, {
        radius: ALBUM_PREVIEW_ALL_RADIUS,
        preferFull: true
      });
      setFullscreenMedia((prev) => (prev ? { ...prev, index } : prev));
    },
    [fullscreenMedia?.albumPublicUrl]
  );

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
        header={
          pinnedPosts.length > 0 && !searchOpen ? (
            <PinnedBanner
              pinnedPosts={pinnedPosts}
              collection="posts"
              activeIndex={activePinnedIndex}
              onOpen={handleOpenPinned}
            />
          ) : null
        }
      >
        <div
          className={clsx(
            'feed-list',
            pinnedPosts.length > 0 && !searchOpen && 'feed-list--has-pinned'
          )}
        >
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

          {groupPostsByDay(filteredPosts).map((group) => (
            <DayGroup key={group.dayKey} label={group.dateLabel} variant="feed">
              {group.items.map((post) => {
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
                    scrollRootRef={containerRef}
                    deferVideoLoad={selectedPost?.id === post.id}
                  />
                );
              })}
            </DayGroup>
          ))}
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
          onActiveIndexChange={
            fullscreenMedia.albumPublicUrl ? handleFullscreenAlbumIndex : undefined
          }
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
