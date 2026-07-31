import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { usePlayers } from '../../hooks/usePlayers';
import { useTournamentPosts } from '../../hooks/useTournamentPosts';
import pb from '../../services/pb';
import { getCurrentUser, isModerator } from '../../services/auth';
import {
  pinTournamentPost,
  unpinTournamentPost,
  updateTournamentPost
} from '../../services/tournamentPosts';
import { flushPendingTournamentCommentDeletes } from '../../services/tournamentComments';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import CreateTournamentPostModal from './CreateTournamentPostModal';
import EditTournamentPostModal from './EditTournamentPostModal';
import TournamentPostCard from './TournamentPostCard';
import TournamentPostDetailModal from './TournamentPostDetailModal';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import PinnedBanner from '../feed/PinnedBanner';
import PostContextMenu from '../feed/PostContextMenu';
import RatingPage from '../rating/RatingPage';
import ProfileViewModal from '../profile/ProfileViewModal';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { useTournamentPostUpload } from '../../components/TournamentPostUploadProvider';
import { error } from '../../lib/log';
import { parseDateQuery, isDateQueryParsed, matchesDateQuery } from '../../lib/dateSearch';
import {
  sortPinnedByCreated,
  usePinnedBannerIndex
} from '../feed/usePinnedBannerIndex';
import '../feed/Feed.css';
import './Competitions.css';

const TABS = [
  { id: 'feed', label: 'Лента' },
  { id: 'rating', label: 'Рейтинг' }
];

const SCROLL_TOP_THRESHOLD = 8;
/** Накопленный сдвиг вниз, чтобы скрыть chrome */
const SCROLL_HIDE_DELTA = 12;
/** Накопленный сдвиг вверх (больше hide — анти-дребезг при fling) */
const SCROLL_SHOW_DELTA = 28;
/** Игнор scroll-событий после смены видимости (CSS transition + layout) */
const SCROLL_CHROME_LOCK_MS = 280;

/**
 * @param {{
 *   user: any,
 *   onTabChange?: (tab: number) => void,
 *   onSubTabChange?: (subTab: string) => void,
 *   onDeletedIdsChange?: (ids: string[]) => void,
 *   searchQuery?: string,
 *   searchOpen?: boolean,
 *   commentTargetToOpen?: { postId?: string, commentId?: string } | null,
 *   onCommentTargetOpened?: () => void
 * }} props
 */
function CompetitionsPage({
  user,
  onTabChange,
  onSubTabChange,
  onDeletedIdsChange,
  searchQuery = '',
  searchOpen = false,
  commentTargetToOpen = null,
  onCommentTargetOpened
}) {
  const moderator = isModerator();
  const { data: players } = usePlayers();
  const { data: posts, isLoading: postsLoading, mutate: mutateTournamentPosts } = useTournamentPosts({
    includeDeleted: moderator
  });
  const [activeTab, setActiveTab] = useState('feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [hiddenMediaKey, setHiddenMediaKey] = useState(null);
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [openedPost, setOpenedPost] = useState(null);
  const [highlightCommentId, setHighlightCommentId] = useState(/** @type {string | null} */ (null));
  const [editingPost, setEditingPost] = useState(null);
  const [deletedPostIds, setDeletedPostIds] = useState([]);
  const [contextMenuState, setContextMenuState] = useState(
    /** @type {{ postId: string, anchorPoint: { x: number, y: number } } | null} */ (null)
  );
  const containerRef = useRef(null);
  const ratingScrollRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const isChromeVisibleRef = useRef(true);
  const chromeLockUntilRef = useRef(0);
  const accumDeltaRef = useRef(0);
  const cardRefs = useRef(/** @type {Map<string, HTMLElement>} */ (new Map()));
  const { startUpload } = useTournamentPostUpload();

  useEffect(() => {
    onDeletedIdsChange?.(deletedPostIds);
  }, [deletedPostIds, onDeletedIdsChange]);

  const visiblePosts = useMemo(() => {
    if (!posts) return [];
    if (moderator) return posts;
    return posts.filter(
      (p) => !p.is_deleted && !deletedPostIds.includes(p.id)
    );
  }, [posts, moderator, deletedPostIds]);

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
    enabled: activeTab === 'feed' && !searchOpen
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

  const handleSubTabClick = useCallback(
    (tabId) => {
      if (tabId !== activeTab) {
        setOpenedPost(null);
        setContextMenuState(null);
        flushPendingTournamentCommentDeletes();
      }
      isChromeVisibleRef.current = true;
      chromeLockUntilRef.current = 0;
      accumDeltaRef.current = 0;
      setIsChromeVisible(true);
      setActiveTab(tabId);
      onSubTabChange?.(tabId);
    },
    [activeTab, onSubTabChange]
  );

  useEffect(() => {
    const container =
      activeTab === 'feed' ? containerRef.current : ratingScrollRef.current;
    if (!container) return undefined;

    const applyChromeVisible = (visible) => {
      if (isChromeVisibleRef.current === visible) return;
      isChromeVisibleRef.current = visible;
      setIsChromeVisible(visible);
      accumDeltaRef.current = 0;
      chromeLockUntilRef.current = performance.now() + SCROLL_CHROME_LOCK_MS;
      requestAnimationFrame(() => {
        lastScrollTopRef.current = container.scrollTop;
      });
    };

    const syncVisibility = (scrollTop, delta) => {
      if (scrollTop <= SCROLL_TOP_THRESHOLD) {
        accumDeltaRef.current = 0;
        applyChromeVisible(true);
        return;
      }
      if (performance.now() < chromeLockUntilRef.current) return;
      if (delta === 0) return;

      if (
        accumDeltaRef.current !== 0
        && Math.sign(accumDeltaRef.current) !== Math.sign(delta)
      ) {
        accumDeltaRef.current = delta;
      } else {
        accumDeltaRef.current += delta;
      }

      if (accumDeltaRef.current >= SCROLL_HIDE_DELTA) {
        applyChromeVisible(false);
      } else if (accumDeltaRef.current <= -SCROLL_SHOW_DELTA) {
        applyChromeVisible(true);
      }
    };

    lastScrollTopRef.current = container.scrollTop;
    accumDeltaRef.current = 0;
    chromeLockUntilRef.current = 0;
    syncVisibility(container.scrollTop, 0);

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const delta = scrollTop - lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;
      syncVisibility(scrollTop, delta);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  useEffect(() => {
    if (!getCurrentUser()?.id) return undefined;

    pb.collection('tournament_comments')
      .subscribe('*', () => {
        mutateTournamentPosts();
      })
      .catch((e) => {
        error('Ошибка подписки на комментарии турнира:', e);
      });

    return () => {
      pb.collection('tournament_comments').unsubscribe('*');
    };
  }, [mutateTournamentPosts]);

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

  const handleOpenDetail = useCallback((post) => {
    setOpenedPost(post);
    setHighlightCommentId(null);
  }, []);

  useEffect(() => {
    if (!commentTargetToOpen?.postId || !posts?.length) return;
    const post = posts.find((item) => item.id === commentTargetToOpen.postId);
    if (!post) return;
    setActiveTab('feed');
    onSubTabChange?.('feed');
    setOpenedPost(post);
    setHighlightCommentId(commentTargetToOpen.commentId || null);
    onCommentTargetOpened?.();
  }, [commentTargetToOpen, posts, onCommentTargetOpened, onSubTabChange]);

  const handleOpenEdit = useCallback((post) => {
    if (!moderator) return;
    setEditingPost(post);
  }, [moderator]);

  const handleTogglePin = useCallback(
    async (post) => {
      if (!moderator || !post?.id) return;
      const nextPinned = !post.is_pinned;
      const pinnedAt = nextPinned ? new Date().toISOString() : null;
      mutateTournamentPosts(
        (curr = []) =>
          curr.map((p) =>
            p.id === post.id ? { ...p, is_pinned: nextPinned, pinned_at: pinnedAt } : p
          ),
        false
      );
      setOpenedPost((current) =>
        current?.id === post.id
          ? { ...current, is_pinned: nextPinned, pinned_at: pinnedAt }
          : current
      );
      try {
        if (nextPinned) await pinTournamentPost(post.id);
        else await unpinTournamentPost(post.id);
      } catch (err) {
        error('toggle pin tournament post:', err);
        mutateTournamentPosts();
      }
    },
    [moderator, mutateTournamentPosts]
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
      mutateTournamentPosts(
        (curr = []) =>
          curr.map((post) =>
            post.id === updatedPost.id ? { ...post, ...updatedPost } : post
          ),
        false
      );
      setOpenedPost((current) =>
        current?.id === updatedPost.id ? { ...current, ...updatedPost } : current
      );
      setEditingPost(null);
    },
    [mutateTournamentPosts]
  );

  const handleDeletePost = useCallback(
    async (postId) => {
      setDeletedPostIds((prev) => [...prev, postId]);
      setContextMenuState(null);
      try {
        await updateTournamentPost(postId, { is_deleted: true });
        mutateTournamentPosts(
          (curr = []) =>
            curr.map((p) => (p.id === postId ? { ...p, is_deleted: true } : p)),
          false
        );
      } catch (err) {
        error('soft delete tournament post:', err);
      }
    },
    [mutateTournamentPosts]
  );

  const handleCreated = useCallback(
    (payload) => {
      setShowCreatePost(false);
      startUpload(payload);
    },
    [startUpload]
  );

  const handleRestorePost = useCallback(
    async (postId) => {
      setDeletedPostIds((prev) => prev.filter((id) => id !== postId));
      try {
        await updateTournamentPost(postId, { is_deleted: false });
        mutateTournamentPosts(
          (curr = []) =>
            curr.map((p) => (p.id === postId ? { ...p, is_deleted: false } : p)),
          false
        );
      } catch (err) {
        error('restore tournament post:', err);
      }
    },
    [mutateTournamentPosts]
  );

  const contextMenuPost = useMemo(() => {
    if (!contextMenuState) return null;
    return visiblePosts.find((p) => p.id === contextMenuState.postId) || null;
  }, [contextMenuState, visiblePosts]);

  return (
    <section className="competitions" aria-label="Турнир">
      <div
        className={clsx('competitions-tabs', !isChromeVisible && 'competitions-tabs--hidden')}
        role="tablist"
        aria-label="Разделы соревнований"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={clsx('competitions-tab', activeTab === tab.id && 'competitions-tab--active')}
            onClick={() => handleSubTabClick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'feed' && (
        <div className="competitions-scroll-container" ref={containerRef}>
          {moderator && (
            <div className="floating-btn-wrapper">
              <button
                type="button"
                className={clsx('floating-add-btn', isChromeVisible ? 'visible' : 'hidden')}
                onClick={() => setShowCreatePost(true)}
              >
                Добавить
              </button>
            </div>
          )}

          {pinnedPosts.length > 0 && !searchOpen && (
            <PinnedBanner
              pinnedPosts={pinnedPosts}
              collection="tournament_posts"
              activeIndex={activePinnedIndex}
              onOpen={handleOpenPinned}
            />
          )}

          <div className="competitions-feed-list">
            {postsLoading && <Spinner label="Загрузка ленты..." />}

            {!postsLoading && filteredPosts.length === 0 && (
              <EmptyState
                title={isSearchActive ? 'Ничего не найдено' : 'Пока нет итогов'}
                description={
                  isSearchActive
                    ? 'Попробуйте другой запрос.'
                    : 'Здесь появятся результаты турниров секции.'
                }
              />
            )}

            {!postsLoading &&
              filteredPosts.map((post) => {
                const isSoftDeleted =
                  deletedPostIds.includes(post.id) || post.is_deleted === true;
                return (
                  <TournamentPostCard
                    key={post.id}
                    post={post}
                    players={players || []}
                    user={user}
                    userIsModerator={moderator}
                    isSoftDeleted={isSoftDeleted}
                    onOpenDetail={handleOpenDetail}
                    onRestore={handleRestorePost}
                    onLongPress={handleLongPress}
                    cardRef={handleRegisterCardRef(post.id)}
                    hiddenMediaKey={hiddenMediaKey}
                    onOpenFullscreen={handleOpenFullscreen}
                    onOpenProfile={setViewingPlayer}
                    scrollRootRef={containerRef}
                  />
                );
              })}
          </div>
        </div>
      )}

      {activeTab === 'rating' && (
        <div className="competitions-rating-scroll" ref={ratingScrollRef}>
          <RatingPage user={user} onTabChange={onTabChange} />
        </div>
      )}

      <PostContextMenu
        isOpen={Boolean(contextMenuPost && contextMenuState)}
        anchorPoint={contextMenuState?.anchorPoint ?? null}
        isPinned={Boolean(contextMenuPost?.is_pinned)}
        onTogglePin={() => contextMenuPost && handleTogglePin(contextMenuPost)}
        onEdit={() => contextMenuPost && handleOpenEdit(contextMenuPost)}
        onDelete={() => contextMenuPost && handleDeletePost(contextMenuPost.id)}
        onClose={handleCloseContextMenu}
      />

      <CreateTournamentPostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        players={players || []}
        onCreated={handleCreated}
      />

      <EditTournamentPostModal
        isOpen={Boolean(editingPost)}
        post={editingPost}
        onClose={handleCloseEdit}
        onSaved={handlePostSaved}
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

      <TournamentPostDetailModal
        isOpen={Boolean(openedPost)}
        post={openedPost}
        players={players || []}
        user={user}
        userIsModerator={moderator}
        highlightCommentId={highlightCommentId}
        onClose={() => {
          setOpenedPost(null);
          setHighlightCommentId(null);
        }}
        onOpenProfile={setViewingPlayer}
        onEdit={(post) => {
          setOpenedPost(null);
          handleOpenEdit(post);
        }}
        onDelete={(postId) => {
          setOpenedPost(null);
          handleDeletePost(postId);
        }}
        onTogglePin={handleTogglePin}
        hiddenMediaKey={hiddenMediaKey}
        onOpenFullscreen={handleOpenFullscreen}
        onCommentMutated={mutateTournamentPosts}
      />

      <ProfileViewModal
        isOpen={Boolean(viewingPlayer)}
        targetUser={viewingPlayer}
        currentUser={user}
        onTabChange={onTabChange}
        onClose={() => setViewingPlayer(null)}
      />

      {activeTab === 'feed' && <ScrollToTopButton scrollRef={containerRef} />}
    </section>
  );
}

export default CompetitionsPage;
