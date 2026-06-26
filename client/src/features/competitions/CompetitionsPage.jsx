import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { usePlayers } from '../../hooks/usePlayers';
import { useTournamentPosts } from '../../hooks/useTournamentPosts';
import { isModerator } from '../../services/auth';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import CreateTournamentPostModal from './CreateTournamentPostModal';
import TournamentPostCard from './TournamentPostCard';
import './Competitions.css';

const TABS = [
  { id: 'feed', label: 'Лента' },
  { id: 'games', label: 'Игры' }
];

function CompetitionsPage() {
  const moderator = isModerator();
  const { data: players } = usePlayers();
  const { data: posts, isLoading: postsLoading, mutate: mutatePosts } = useTournamentPosts();
  const [activeTab, setActiveTab] = useState('feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const containerRef = useRef(null);

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
        <div className="competitions-feed-scroll" ref={containerRef}>
          {moderator && (
            <div className="floating-btn-wrapper">
              <button
                type="button"
                className="floating-add-btn visible"
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
                <TournamentPostCard key={post.id} post={post} players={players || []} />
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
    </section>
  );
}

export default CompetitionsPage;
