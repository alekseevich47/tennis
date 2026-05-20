import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { usePosts } from '../../hooks/usePosts';
import { updatePost } from '../../services/posts';
import { isModerator } from '../../services/auth';
import { usePostUpload } from '../../components/PostUploadProvider';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import EditPostModal from './EditPostModal';
import PostDetailModal from './PostDetailModal';
import FullscreenImageViewer from './FullscreenImageViewer';
import { error } from '../../lib/log';
import './Feed.css';

const SCROLL_HIDE_DEBOUNCE_MS = 300;

/**
 * @param {{
 *   user: any,
 *   onDeletedIdsChange?: (ids: string[]) => void
 * }} props
 */
function FeedPage({ user, onDeletedIdsChange }) {
  const userIsModerator = isModerator();
  const { data: posts, isLoading, mutate } = usePosts({ includeDeleted: userIsModerator });

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [hiddenMediaKey, setHiddenMediaKey] = useState(null);
  const [deletedPostIds, setDeletedPostIds] = useState([]);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const { startUpload } = usePostUpload();

  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    onDeletedIdsChange?.(deletedPostIds);
  }, [deletedPostIds, onDeletedIdsChange]);

  // Scroll listener: зависит только от модераторского флага (фикс C6).
  useEffect(() => {
    const container = containerRef.current;
    if (!userIsModerator || !container) return undefined;

    const handleScroll = () => {
      setIsButtonVisible(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsButtonVisible(true);
      }, SCROLL_HIDE_DEBOUNCE_MS);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [userIsModerator]);

  const visiblePosts = useMemo(() => {
    if (!posts) return [];
    if (userIsModerator) return posts;
    return posts.filter(
      (p) => !p.is_deleted && !deletedPostIds.includes(p.id)
    );
  }, [posts, userIsModerator, deletedPostIds]);

  const handleDeletePost = useCallback(
    async (postId) => {
      // Optimistic update в SWR-кэше + точечный апдейт без полной перезагрузки (H10).
      setDeletedPostIds((prev) => [...prev, postId]);
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

  const handleOpenDetail = useCallback((post) => {
    setSelectedPost(post);
  }, []);

  const handleOpenEdit = useCallback((post) => {
    if (!userIsModerator) return;
    setEditingPost(post);
  }, [userIsModerator]);

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

  return (
    <div className="feed-scroll-container" ref={containerRef}>
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

      <div className="feed-list">
        {isLoading && <Spinner label="Загрузка ленты…" />}

        {!isLoading && visiblePosts.length === 0 && (
          <EmptyState
            title="Пока ничего нет"
            description="Здесь появятся первые публикации секции."
          />
        )}

        {visiblePosts.map((post) => {
          const isSoftDeleted =
            deletedPostIds.includes(post.id) || post.is_deleted === true;
          return (
            <PostCard
              key={post.id}
              post={post}
              isSoftDeleted={isSoftDeleted}
              userIsModerator={userIsModerator}
              onOpenDetail={handleOpenDetail}
              onOpenEdit={handleOpenEdit}
              onDelete={handleDeletePost}
              onRestore={handleRestorePost}
              hiddenMediaKey={hiddenMediaKey}
              onOpenFullscreen={handleOpenFullscreen}
            />
          );
        })}
      </div>

      <PostDetailModal
        isOpen={Boolean(selectedPost)}
        post={selectedPost}
        user={user}
        userIsModerator={userIsModerator}
        onOpenEdit={handleOpenEdit}
        onDeletePost={handleDeletePost}
        hiddenMediaKey={hiddenMediaKey}
        onOpenFullscreen={handleOpenFullscreen}
        onClose={handleCloseDetail}
        onAfterClose={() => mutate()}
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
    </div>
  );
}

export default FeedPage;
