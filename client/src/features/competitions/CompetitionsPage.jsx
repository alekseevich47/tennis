import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { usePlayers } from '../../hooks/usePlayers';
import { useTournamentPosts } from '../../hooks/useTournamentPosts';
import { isModerator } from '../../services/auth';
import { updateTournamentPost } from '../../services/tournamentPosts';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import CreateTournamentPostModal from './CreateTournamentPostModal';
import EditTournamentPostModal from './EditTournamentPostModal';
import TournamentPostCard from './TournamentPostCard';
import TournamentPostDetailModal from './TournamentPostDetailModal';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import RatingPage from '../rating/RatingPage';
import ProfileViewModal from '../profile/ProfileViewModal';
import { useTournamentPostUpload } from '../../components/TournamentPostUploadProvider';
import { error } from '../../lib/log';
import { parseDateQuery, isDateQueryParsed, matchesDateQuery } from '../../lib/dateSearch';
import '../feed/Feed.css';
import './Competitions.css';

const TABS = [
  { id: 'feed', label: 'Лента' },
  { id: 'rating', label: 'Рейтинг' }
];

const SCROLL_TOP_THRESHOLD = 8;
const SCROLL_DELTA_THRESHOLD = 4;

function CompetitionsPage({ user, onTabChange, onSubTabChange, searchQuery = '' }) {
  const moderator = isModerator();
  const { data: players } = usePlayers();
  const { data: posts, isLoading: postsLoading, mutate: mutatePosts } = useTournamentPosts({
    includeDeleted: moderator
  });
  const [activeTab, setActiveTab] = useState('feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [hiddenMediaKey, setHiddenMediaKey] = useState(null);
  const [isButtonVisible, setIsButtonVisible] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [openedPost, setOpenedPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [deletedPostIds, setDeletedPostIds] = useState([]);
  const containerRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const { startUpload } = useTournamentPostUpload();

  const visiblePosts = useMemo(() => {
    if (!posts) return [];
    if (moderator) return posts;
    return posts.filter(
      (p) => !p.is_deleted && !deletedPostIds.includes(p.id)
    );
  }, [posts, moderator, deletedPostIds]);

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
      setActiveTab(tabId);
      onSubTabChange?.(tabId);
    },
    [onSubTabChange]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!moderator || !container || activeTab !== 'feed') return undefined;

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
  }, [moderator, activeTab]);

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
  }, []);

  const handleOpenEdit = useCallback((post) => {
    if (!moderator) return;
    setEditingPost(post);
  }, [moderator]);

  const handleCloseEdit = useCallback(() => {
    setEditingPost(null);
  }, []);

  const handlePostSaved = useCallback(
    (updatedPost) => {
      mutatePosts(
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
    [mutatePosts]
  );

  const handleDeletePost = useCallback(
    async (postId) => {
      setDeletedPostIds((prev) => [...prev, postId]);
      try {
        await updateTournamentPost(postId, { is_deleted: true });
        mutatePosts(
          (curr = []) =>
            curr.map((p) => (p.id === postId ? { ...p, is_deleted: true } : p)),
          false
        );
      } catch (err) {
        error('soft delete tournament post:', err);
      }
    },
    [mutatePosts]
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
        mutatePosts(
          (curr = []) =>
            curr.map((p) => (p.id === postId ? { ...p, is_deleted: false } : p)),
          false
        );
      } catch (err) {
        error('restore tournament post:', err);
      }
    },
    [mutatePosts]
  );

  return (
    <section className="competitions" aria-label="Турнир">
      <div className="competitions-tabs" role="tablist" aria-label="Разделы соревнований">
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
                className={clsx('floating-add-btn', isButtonVisible ? 'visible' : 'hidden')}
                onClick={() => setShowCreatePost(true)}
              >
                Добавить
              </button>
            </div>
          )}

          {postsLoading ? (
            <Spinner label="Загрузка ленты..." />
          ) : filteredPosts.length === 0 ? (
            <EmptyState
              title={isSearchActive ? 'Ничего не найдено' : 'Пока нет итогов'}
              description={
                isSearchActive
                  ? 'Попробуйте другой запрос.'
                  : 'Здесь появятся результаты турниров секции.'
              }
            />
          ) : (
            <div className="competitions-feed-list">
              {filteredPosts.map((post) => {
                const isSoftDeleted =
                  deletedPostIds.includes(post.id) || post.is_deleted === true;
                return (
                  <TournamentPostCard
                    key={post.id}
                    post={post}
                    players={players || []}
                    userIsModerator={moderator}
                    isSoftDeleted={isSoftDeleted}
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
          )}
        </div>
      )}

      {activeTab === 'rating' && (
        <RatingPage user={user} onTabChange={onTabChange} />
      )}

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
        onClose={() => setOpenedPost(null)}
        onOpenEdit={handleOpenEdit}
        onOpenProfile={setViewingPlayer}
        hiddenMediaKey={hiddenMediaKey}
        onOpenFullscreen={handleOpenFullscreen}
      />

      <ProfileViewModal
        isOpen={Boolean(viewingPlayer)}
        targetUser={viewingPlayer}
        currentUser={user}
        onTabChange={onTabChange}
        onClose={() => setViewingPlayer(null)}
      />
    </section>
  );
}

export default CompetitionsPage;
