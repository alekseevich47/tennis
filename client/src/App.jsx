import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMaxAuth } from './hooks/useMaxAuth';
import { useSessionResetKey } from './hooks/useSessionResetKey';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import Spinner from './components/ui/Spinner';
import { ProductUploadProvider } from './components/ProductUploadProvider';
import { CartProvider, useCart } from './context/CartContext';
import FeedPage from './features/feed/FeedPage';
import TrainingsPage from './features/trainings/TrainingsPage';
import MembershipOverviewModal from './features/trainings/components/MembershipOverviewModal';
import ShopPage from './features/shop/ShopPage';
import OrdersModal from './features/shop/OrdersModal';
import RatingPage from './features/rating/RatingPage';
import CompetitionsPage from './features/competitions/CompetitionsPage';
import GalleryPage from './features/gallery/GalleryPage';
import ProfilePage from './features/profile/ProfilePage';
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
  'Рейтинг',
  'Соревнования',
  'Галерея',
  'Мой профиль'
];

const PROFILE_TAB_INDEX = 6;

function AppInner() {
  const [activeTab, setActiveTab] = useState(0);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [cartProductToOpen, setCartProductToOpen] = useState(null);
  const { totalCount: cartCount } = useCart();
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
      setCartDropdownOpen(false);
      setOrdersModalOpen(false);
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

  const headerTitle = TAB_TITLES[activeTab] || TAB_TITLES[0];
  const contentClassName =
    activeTab === 1
      ? 'content-with-header content-with-header--contained'
      : 'content-with-header';

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
        cartCount={cartCount}
        onCartClick={() => setCartDropdownOpen((open) => !open)}
        onOrdersClick={() => setOrdersModalOpen(true)}
        cartDropdownOpen={cartDropdownOpen}
        onCartDropdownClose={() => setCartDropdownOpen(false)}
        onOpenProduct={(product) => {
          setCartProductToOpen(product);
          setCartDropdownOpen(false);
        }}
      />

      <main className={contentClassName}>
        {activeTab === 0 && (
          <FeedPage user={user} onDeletedIdsChange={setPendingDeletePostIds} />
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
              productToOpen={cartProductToOpen}
              onProductOpened={() => setCartProductToOpen(null)}
            />
          </ProductUploadProvider>
        )}
        {activeTab === 3 && (
          <RatingPage key={sessionResetKey} user={user} onTabChange={handleTabChange} />
        )}
        {activeTab === 4 && <CompetitionsPage user={user} />}
        {activeTab === 5 && <GalleryPage user={user} />}
        {activeTab === PROFILE_TAB_INDEX && (
          <ProfilePage user={user} onUpdate={handleUserUpdate} onTabChange={handleTabChange} />
        )}
      </main>

      <OrdersModal
        isOpen={ordersModalOpen}
        onClose={() => setOrdersModalOpen(false)}
      />

      <BottomNav
        activeTab={activeTab === PROFILE_TAB_INDEX ? -1 : activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}

function App() {
  return (
    <CartProvider>
      <AppInner />
    </CartProvider>
  );
}

export default App;
