import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { usePlayers } from '../../hooks/usePlayers';
import { useTournamentPosts } from '../../hooks/useTournamentPosts';
import { isModerator } from '../../services/auth';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import CreateTournamentPostModal from './CreateTournamentPostModal';
import TournamentPostCard from './TournamentPostCard';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import '../feed/Feed.css';
import './Competitions.css';

const TABS = [
  { id: 'feed', label: 'Лента' },
  { id: 'games', label: 'Игры' }
];

const SCROLL_TOP_THRESHOLD = 8;
const SCROLL_DELTA_THRESHOLD = 4;

function CompetitionsPage() {
  const moderator = isModerator();
  const { data: players } = usePlayers();
  const { data: posts, isLoading: postsLoading, mutate: mutatePosts } = useTournamentPosts();
  const [activeTab, setActiveTab] = useState('feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [hiddenMediaKey, setHiddenMediaKey] = useState(null);
  const [isButtonVisible, setIsButtonVisible] = useState(false);
  const containerRef = useRef(null);
  const lastScrollTopRef = useRef(0);

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

  return (
    <section className="competitions" aria-label="Соревнования">
      <div className="competitions-tabs" role="tablist" aria-label="Разделы соревнований">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={clsx('competitions-tab', activeTab === tab.id && 'competitions-tab--active')}
            onClick={() => setActiveTab(tab.id)}
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
          ) : !posts || posts.length === 0 ? (
            <EmptyState
              title="Пока нет итогов"
              description="Здесь появятся результаты турниров секции."
            />
          ) : (
            <div className="competitions-feed-list">
              {posts.map((post) => (
                <TournamentPostCard
                  key={post.id}
                  post={post}
                  players={players || []}
                  hiddenMediaKey={hiddenMediaKey}
                  onOpenFullscreen={handleOpenFullscreen}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'games' && (
        <div className="competitions-stub">
          <p>Раздел в разработке</p>
        </div>
      )}

      <CreateTournamentPostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        players={players || []}
        onCreated={() => {
          mutatePosts();
          setShowCreatePost(false);
        }}
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
    </section>
  );
}

export default CompetitionsPage;
