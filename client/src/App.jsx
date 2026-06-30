import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMaxAuth } from './hooks/useMaxAuth';
import { useSessionResetKey } from './hooks/useSessionResetKey';
import { isUserBanned } from './services/auth';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import Spinner from './components/ui/Spinner';
import { ProductUploadProvider } from './components/ProductUploadProvider';
import { FavoritesProvider, useFavorites } from './context/FavoritesContext';
import FeedPage from './features/feed/FeedPage';
import TrainingsPage from './features/trainings/TrainingsPage';
import MembershipOverviewModal from './features/trainings/components/MembershipOverviewModal';
import ShopPage from './features/shop/ShopPage';
import CompetitionsPage from './features/competitions/CompetitionsPage';
import GalleryPage from './features/gallery/GalleryPage';
import ProfilePage from './features/profile/ProfilePage';
import BlockedPage from './features/profile/BlockedPage';
import {
  deleteTraining,
  readPendingDeleteTrainingIds,
  writePendingDeleteTrainingIds
} from './services/trainings';
import { deleteProduct } from './services/catalog';
import { hardDeleteComment, hardDeletePost } from './services/posts';
import { error } from './lib/log';
import './styles/global.css';

const TAB_TITLES = [
  'Лента новостей',
  'Тренировки',
  'Магазин',
  'Соревнования',
  'Галерея',
  'Мой профиль'
];

const PROFILE_TAB_INDEX = 5;

function AppInner() {
  const [activeTab, setActiveTab] = useState(0);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [favoritesDropdownOpen, setFavoritesDropdownOpen] = useState(false);
  const [favoriteProductToOpen, setFavoriteProductToOpen] = useState(null);
  const [feedSearch, setFeedSearch] = useState({ open: false, query: '' });
  const [competitionsSearch, setCompetitionsSearch] = useState({ open: false, query: '' });
  const [gallerySearch, setGallerySearch] = useState({ open: false, query: '' });
  const [competitionsSubTab, setCompetitionsSubTab] = useState('feed');
  const { totalCount: favoritesCount } = useFavorites();
  const sessionResetKey = useSessionResetKey();
  const { user, isLoading, setUser } = useMaxAuth();

  // ID-буферы pending soft-delete. Передаются дочерним фичам через колбэки.
  const [pendingDeletePostIds, setPendingDeletePostIds] = useState([]);
  const [pendingDeleteTrainingIds, setPendingDeleteTrainingIds] = useState([]);
  const [pendingDeleteProductIds, setPendingDeleteProductIds] = useState([]);
  const pendingDeletePostIdsRef = useRef([]);
  const pendingDeleteTrainingIdsRef = useRef([]);
  const pendingDeleteProductIdsRef = useRef([]);
  pendingDeletePostIdsRef.current = pendingDeletePostIds;
  pendingDeleteTrainingIdsRef.current = pendingDeleteTrainingIds;
  pendingDeleteProductIdsRef.current = pendingDeleteProductIds;

  // Окончательное удаление мягко-скрытых сущностей в БД.
  const flushPendingDeletes = useCallback(async () => {
    const postIds = pendingDeletePostIdsRef.current;
    const trainingIds = Array.from(
      new Set([
        ...pendingDeleteTrainingIdsRef.current,
        ...readPendingDeleteTrainingIds()
      ])
    );
    const productIds = pendingDeleteProductIdsRef.current;
    const commentJson = sessionStorage.getItem('pending_delete_comments');

    const tasks = [];

    if (postIds.length > 0) {
      tasks.push(
        ...postIds.map((id) =>
          hardDeletePost(id).catch((e) => error('flush post:', e))
        )
      );
      setPendingDeletePostIds([]);
    }

    if (trainingIds.length > 0) {
      trainingIds.forEach((id) => {
        deleteTraining(id).catch((e) => error('flush training:', e));
      });
      pendingDeleteTrainingIdsRef.current = [];
      setPendingDeleteTrainingIds([]);
      writePendingDeleteTrainingIds([]);
    }

    if (productIds.length > 0) {
      tasks.push(
        ...productIds.map((id) =>
          deleteProduct(id).catch((e) => error('flush product:', e))
        )
      );
      pendingDeleteProductIdsRef.current = [];
      setPendingDeleteProductIds([]);
    }

    if (commentJson) {
      try {
        const commentIds = JSON.parse(commentJson);
        if (Array.isArray(commentIds)) {
          tasks.push(
            ...commentIds.map((id) =>
              hardDeleteComment(id).catch((e) => error('flush comment:', e))
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
      setFavoritesDropdownOpen(false);
      setFeedSearch({ open: false, query: '' });
      setCompetitionsSearch({ open: false, query: '' });
      setGallerySearch({ open: false, query: '' });
      setActiveTab(newTab);
    },
    [flushPendingDeletes]
  );

  const handleCompetitionsSubTabChange = useCallback((subTab) => {
    setCompetitionsSubTab(subTab);
    if (subTab === 'rating') {
      setCompetitionsSearch({ open: false, query: '' });
    }
  }, []);

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

  const handleUserUpdate = useCallback((updated) => {
    setUser(updated);
  }, [setUser]);

  if (isLoading) {
    return (
      <div className="app-boot">
        <Spinner label="Загрузка профиля MAX..." />
      </div>
    );
  }

  if (isUserBanned(user)) {
    return (
      <div className="app">
        <BlockedPage user={user} />
      </div>
    );
  }

  const headerTitle = TAB_TITLES[activeTab] || TAB_TITLES[0];
  const contentClassName =
    activeTab === 1
      ? 'content-with-header content-with-header--contained'
      : 'content-with-header';

  const searchConfig =
    activeTab === 0
      ? {
          open: feedSearch.open,
          query: feedSearch.query,
          onToggle: () => setFeedSearch((s) => ({ ...s, open: !s.open })),
          onChange: (q) => setFeedSearch((s) => ({ ...s, query: q })),
          onClose: () => setFeedSearch({ open: false, query: '' }),
          showDateSearch: true
        }
      : activeTab === 3 && competitionsSubTab === 'feed'
        ? {
            open: competitionsSearch.open,
            query: competitionsSearch.query,
            onToggle: () => setCompetitionsSearch((s) => ({ ...s, open: !s.open })),
            onChange: (q) => setCompetitionsSearch((s) => ({ ...s, query: q })),
            onClose: () => setCompetitionsSearch({ open: false, query: '' }),
            showDateSearch: true
          }
        : activeTab === 4
          ? {
              open: gallerySearch.open,
              query: gallerySearch.query,
              onToggle: () => setGallerySearch((s) => ({ ...s, open: !s.open })),
              onChange: (q) => setGallerySearch((s) => ({ ...s, query: q })),
              onClose: () => setGallerySearch({ open: false, query: '' }),
              showDateSearch: false
            }
          : undefined;

  return (
    <div className="app">
      <AppHeader
        title={headerTitle}
        user={user}
        onProfileClick={() => setActiveTab(PROFILE_TAB_INDEX)}
        onMembershipClick={
          activeTab === 1 && user?.role === 'moderator'
            ? () => setMembershipOpen(true)
            : undefined
        }
        showShopControls={activeTab === 2}
        favoritesCount={favoritesCount}
        onFavoritesClick={() => setFavoritesDropdownOpen((open) => !open)}
        favoritesDropdownOpen={favoritesDropdownOpen}
        onFavoritesDropdownClose={() => setFavoritesDropdownOpen(false)}
        onOpenProduct={(product) => {
          setFavoriteProductToOpen(product);
          setFavoritesDropdownOpen(false);
        }}
        onNotificationsClick={() => {}}
        searchConfig={searchConfig}
      />

      <main className={contentClassName}>
        {activeTab === 0 && (
          <FeedPage
            user={user}
            onDeletedIdsChange={setPendingDeletePostIds}
            searchQuery={feedSearch.query}
          />
        )}
        {activeTab === 1 && (
          <>
            <TrainingsPage
              user={user}
              onDeletedIdsChange={setPendingDeleteTrainingIds}
              onFlushPendingDeletes={flushPendingDeletes}
            />
            <MembershipOverviewModal
              key={sessionResetKey}
              isOpen={membershipOpen}
              onClose={() => setMembershipOpen(false)}
              currentUser={user}
            />
          </>
        )}
        {activeTab === 2 && (
          <ProductUploadProvider>
            <ShopPage
              onDeletedIdsChange={setPendingDeleteProductIds}
              productToOpen={favoriteProductToOpen}
              onProductOpened={() => setFavoriteProductToOpen(null)}
            />
          </ProductUploadProvider>
        )}
        {activeTab === 3 && (
          <CompetitionsPage
            user={user}
            onTabChange={handleTabChange}
            onSubTabChange={handleCompetitionsSubTabChange}
            searchQuery={competitionsSearch.query}
          />
        )}
        {activeTab === 4 && (
          <GalleryPage user={user} searchQuery={gallerySearch.query} />
        )}
        {activeTab === PROFILE_TAB_INDEX && (
          <ProfilePage user={user} onUpdate={handleUserUpdate} onTabChange={handleTabChange} />
        )}
      </main>

      <BottomNav
        activeTab={activeTab === PROFILE_TAB_INDEX ? -1 : activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}

function App() {
  return (
    <FavoritesProvider>
      <AppInner />
    </FavoritesProvider>
  );
}

export default App;
