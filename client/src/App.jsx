import React, { useCallback, useEffect, useRef, useState } from 'react';
import pb from './services/pb';
import { useMaxAuth } from './hooks/useMaxAuth';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import Spinner from './components/ui/Spinner';
import FeedPage from './features/feed/FeedPage';
import TrainingsPage from './features/trainings/TrainingsPage';
import ShopPage from './features/shop/ShopPage';
import RatingPage from './features/rating/RatingPage';
import CompetitionsPage from './features/competitions/CompetitionsPage';
import GalleryPage from './features/gallery/GalleryPage';
import ProfilePage from './features/profile/ProfilePage';
import { error } from './lib/log';
import './styles/global.css';

const TAB_TITLES = [
  'Лента новостей',
  'Тренировки',
  'Магазин',
  'Рейтинг',
  'Соревнования',
  'Галерея',
  'Мой профиль'
];

const PROFILE_TAB_INDEX = 6;

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const { user, isLoading } = useMaxAuth();

  // ID-буферы pending soft-delete. Передаются дочерним фичам через колбэки.
  const [pendingDeletePostIds, setPendingDeletePostIds] = useState([]);
  const pendingDeletePostIdsRef = useRef([]);
  pendingDeletePostIdsRef.current = pendingDeletePostIds;

  // Окончательное удаление мягко-скрытых постов / комментариев в БД.
  const flushPendingDeletes = useCallback(async () => {
    const postIds = pendingDeletePostIdsRef.current;
    const commentJson = sessionStorage.getItem('pending_delete_comments');

    const tasks = [];

    if (postIds.length > 0) {
      tasks.push(
        ...postIds.map((id) =>
          pb.collection('posts').delete(id).catch((e) => error('flush post:', e))
        )
      );
      setPendingDeletePostIds([]);
    }

    if (commentJson) {
      try {
        const commentIds = JSON.parse(commentJson);
        if (Array.isArray(commentIds)) {
          tasks.push(
            ...commentIds.map((id) =>
              pb.collection('comments').delete(id).catch((e) => error('flush comment:', e))
            )
          );
        }
      } catch (e) {
        error('Не удалось распарсить pending_delete_comments:', e);
      }
      sessionStorage.removeItem('pending_delete_comments');
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }, []);

  // Очистка при смене таба (старое поведение) + при закрытии webview (фикс C5).
  const handleTabChange = useCallback(
    (newTab) => {
      flushPendingDeletes();
      setActiveTab(newTab);
    },
    [flushPendingDeletes]
  );

  useEffect(() => {
    const onHide = () => {
      // Используется `keepalive: true`-style: запросы уходят, мы их не дожидаемся.
      flushPendingDeletes();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onHide();
    });
    return () => {
      window.removeEventListener('pagehide', onHide);
    };
  }, [flushPendingDeletes]);

  const handleUserUpdate = useCallback(() => {
    // useMaxAuth слушает pb.authStore.onChange — состояние обновится автоматически.
  }, []);

  if (isLoading) {
    return (
      <div className="app-boot">
        <Spinner label="Загрузка профиля MAX..." />
      </div>
    );
  }

  const headerTitle = TAB_TITLES[activeTab] || TAB_TITLES[0];

  return (
    <div className="app">
      <AppHeader
        title={headerTitle}
        user={user}
        onProfileClick={() => setActiveTab(PROFILE_TAB_INDEX)}
      />

      <main className="content-with-header">
        {activeTab === 0 && (
          <FeedPage user={user} onDeletedIdsChange={setPendingDeletePostIds} />
        )}
        {activeTab === 1 && <TrainingsPage user={user} />}
        {activeTab === 2 && <ShopPage user={user} />}
        {activeTab === 3 && <RatingPage user={user} />}
        {activeTab === 4 && <CompetitionsPage user={user} />}
        {activeTab === 5 && <GalleryPage user={user} />}
        {activeTab === PROFILE_TAB_INDEX && (
          <ProfilePage user={user} onUpdate={handleUserUpdate} />
        )}
      </main>

      <BottomNav
        activeTab={activeTab === PROFILE_TAB_INDEX ? -1 : activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}

export default App;
