import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMaxAuth } from './hooks/useMaxAuth';
import { useMaxCloseGuard } from './hooks/useMaxCloseGuard';
import { useSessionResetKey } from './hooks/useSessionResetKey';
import { useOverlayClose } from './hooks/useOverlayClose';
import { useSectionSwipe } from './hooks/useSectionSwipe';
import { isUserBanned, isUserBotBlocked, isModerator, completeOnboarding } from './services/auth';
import OnboardingTutorial from './features/onboarding/OnboardingTutorial';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import Spinner from './components/ui/Spinner';
import CloseAppConfirmSheet from './components/ui/CloseAppConfirmSheet';
import ForceUpdateOverlay from './components/ForceUpdateOverlay';
import { useAppVersionCheck } from './hooks/useAppVersionCheck';
import { ProductUploadProvider } from './components/ProductUploadProvider';
import { FavoritesProvider, useFavorites } from './context/FavoritesContext';
import { AddActionProvider } from './context/AddActionContext';
import { MentionNavProvider } from './context/MentionNavContext';
import FeedPage from './features/feed/FeedPage';
import TrainingsPage from './features/trainings/TrainingsPage';
import MembershipOverviewModal from './features/trainings/components/MembershipOverviewModal';
import ShopPage from './features/shop/ShopPage';
import CompetitionsPage from './features/competitions/CompetitionsPage';
import GalleryPage from './features/gallery/GalleryPage';
import ProfilePage from './features/profile/ProfilePage';
import BlockedPage from './features/profile/BlockedPage';
import AdminPanelPage from './features/admin/AdminPanelPage';
import {
  ADMIN_TAB_INDEX,
  GALLERY_TAB_INDEX,
  PROFILE_TAB_INDEX
} from './components/BottomNav';
import {
  finalizeCancelledTraining,
  readPendingDeleteTrainingIds,
  writePendingDeleteTrainingIds
} from './services/trainings';
import { useNotifications } from './services/notifications';
import { deleteProduct } from './services/catalog';
import { hardDeleteComment, hardDeletePost } from './services/posts';
import { hardDeleteTournamentPost } from './services/tournamentPosts';
import { flushPendingTournamentCommentDeletes } from './services/tournamentComments';
import { error } from './lib/log';
import './styles/global.css';

const TAB_TITLES = [
  'Лента',
  'Запись',
  'Магазин',
  'Турнир',
  'Галерея',
  'Мой профиль',
  'Админ'
];

function getInitialFavoriteProductIds(user) {
  const favorites = user?.favorite_products;
  if (!Array.isArray(favorites)) return [];
  return favorites
    .map((entry) => (typeof entry === 'string' ? entry : entry?.id))
    .filter(Boolean);
}

function AppInner() {
  const { user, isLoading, setUser } = useMaxAuth();
  const flushBeforeCloseRef = useRef(/** @type {null | (() => Promise<void>)} */ (null));

  const onBeforeClose = useCallback(async () => {
    await flushBeforeCloseRef.current?.();
  }, []);

  if (isLoading) {
    return (
      <div className="app-boot">
        <Spinner label="Загрузка профиля MAX..." />
      </div>
    );
  }

  if (isUserBanned(user) || isUserBotBlocked(user)) {
    return (
      <BlockedAppShell user={user} onBeforeClose={onBeforeClose} />
    );
  }

  return (
    <FavoritesProvider
      userId={user?.id}
      initialProductIds={getInitialFavoriteProductIds(user)}
    >
      <AddActionProvider>
        <AppMain
          user={user}
          setUser={setUser}
          flushBeforeCloseRef={flushBeforeCloseRef}
          onBeforeClose={onBeforeClose}
        />
      </AddActionProvider>
    </FavoritesProvider>
  );
}

function BlockedAppShell({ user, onBeforeClose }) {
  const {
    confirmOpen,
    confirming,
    cancelCloseConfirm,
    confirmCloseApp
  } = useMaxCloseGuard({ enabled: true, onBeforeClose });

  return (
    <div className="app">
      <BlockedPage user={user} />
      <CloseAppConfirmSheet
        isOpen={confirmOpen}
        confirming={confirming}
        onCancel={cancelCloseConfirm}
        onConfirm={confirmCloseApp}
      />
    </div>
  );
}

function AppMain({ user, setUser, flushBeforeCloseRef, onBeforeClose }) {
  const [activeTab, setActiveTab] = useState(0);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [trainingsReady, setTrainingsReady] = useState(false);
  const [favoritesDropdownOpen, setFavoritesDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [favoriteProductToOpen, setFavoriteProductToOpen] = useState(null);
  const [notificationTrainingId, setNotificationTrainingId] = useState(null);
  const [notificationMembershipOpen, setNotificationMembershipOpen] = useState(false);
  const [notificationCommentTarget, setNotificationCommentTarget] = useState(
    /** @type {{ collection: string, postId?: string, mediaId?: string, commentId?: string } | null} */ (null)
  );
  const [feedSearch, setFeedSearch] = useState({ open: false, query: '' });
  const [competitionsSearch, setCompetitionsSearch] = useState({ open: false, query: '' });
  const [gallerySearch, setGallerySearch] = useState({ open: false, query: '' });
  const [competitionsSubTab, setCompetitionsSubTab] = useState('feed');
  const { totalCount: favoritesCount } = useFavorites();
  const { data: notifications = [], mutate: mutateNotifications } = useNotifications(user?.id);
  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const sessionResetKey = useSessionResetKey();

  const supportsScrollThenClose =
    activeTab === 0 ||
    activeTab === 1 ||
    activeTab === 2 ||
    (activeTab === 3 && competitionsSubTab === 'feed');
  const leaveSectionOnBack =
    activeTab === GALLERY_TAB_INDEX ||
    activeTab === PROFILE_TAB_INDEX ||
    activeTab === ADMIN_TAB_INDEX ||
    (activeTab === 3 && competitionsSubTab === 'rating');

  const handleLeaveSection = useCallback(() => {
    setFavoritesDropdownOpen(false);
    setNotificationsOpen(false);
    setFeedSearch({ open: false, query: '' });
    setCompetitionsSearch({ open: false, query: '' });
    setGallerySearch({ open: false, query: '' });
    setActiveTab(0);
  }, []);

  const {
    confirmOpen,
    confirming,
    cancelCloseConfirm,
    confirmCloseApp
  } = useMaxCloseGuard({
    enabled: true,
    onBeforeClose,
    supportsScrollThenClose,
    leaveSectionOnBack,
    onLeaveSection: handleLeaveSection
  });

  useOverlayClose(favoritesDropdownOpen, () => setFavoritesDropdownOpen(false), 'favorites');
  useOverlayClose(notificationsOpen, () => setNotificationsOpen(false), 'notifications');

  const headerSearchOpen =
    (activeTab === 0 && feedSearch.open) ||
    (activeTab === 3 && competitionsSubTab === 'feed' && competitionsSearch.open) ||
    (activeTab === GALLERY_TAB_INDEX && gallerySearch.open);

  const closeHeaderSearch = useCallback(() => {
    if (activeTab === 0) setFeedSearch({ open: false, query: '' });
    else if (activeTab === 3) setCompetitionsSearch({ open: false, query: '' });
    else if (activeTab === GALLERY_TAB_INDEX) setGallerySearch({ open: false, query: '' });
  }, [activeTab]);

  useOverlayClose(headerSearchOpen, closeHeaderSearch, 'header-search');

  // ID-буферы pending soft-delete. Передаются дочерним фичам через колбэки.
  const [pendingDeletePostIds, setPendingDeletePostIds] = useState([]);
  const [pendingDeleteTournamentPostIds, setPendingDeleteTournamentPostIds] = useState([]);
  const [pendingDeleteTrainingIds, setPendingDeleteTrainingIds] = useState([]);
  const [pendingDeleteProductIds, setPendingDeleteProductIds] = useState([]);
  const pendingDeletePostIdsRef = useRef([]);
  const pendingDeleteTournamentPostIdsRef = useRef([]);
  const pendingDeleteTrainingIdsRef = useRef([]);
  const pendingDeleteProductIdsRef = useRef([]);
  pendingDeletePostIdsRef.current = pendingDeletePostIds;
  pendingDeleteTournamentPostIdsRef.current = pendingDeleteTournamentPostIds;
  pendingDeleteTrainingIdsRef.current = pendingDeleteTrainingIds;
  pendingDeleteProductIdsRef.current = pendingDeleteProductIds;

  // Финализация soft-delete: посты/товары/комменты — hard-delete; тренировки — is_cancelled.
  const flushPendingDeletes = useCallback(async () => {
    const postIds = pendingDeletePostIdsRef.current;
    const tournamentPostIds = pendingDeleteTournamentPostIdsRef.current;
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

    if (tournamentPostIds.length > 0) {
      tasks.push(
        ...tournamentPostIds.map((id) =>
          hardDeleteTournamentPost(id).catch((e) => error('flush tournament post:', e))
        )
      );
      setPendingDeleteTournamentPostIds([]);
    }

    if (trainingIds.length > 0) {
      trainingIds.forEach((id) => {
        finalizeCancelledTraining(id).catch((e) => error('flush training:', e));
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

    tasks.push(flushPendingTournamentCommentDeletes());

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }, []);

  useEffect(() => {
    if (!flushBeforeCloseRef) return undefined;
    flushBeforeCloseRef.current = flushPendingDeletes;
    return () => {
      if (flushBeforeCloseRef.current === flushPendingDeletes) {
        flushBeforeCloseRef.current = null;
      }
    };
  }, [flushBeforeCloseRef, flushPendingDeletes]);

  // Очистка при смене таба (старое поведение) + при закрытии webview (фикс C5).
  const userIsModerator = isModerator();

  const handleTabChange = useCallback(
    (newTab) => {
      if (newTab === ADMIN_TAB_INDEX && !userIsModerator) return;
      flushPendingDeletes();
      setFavoritesDropdownOpen(false);
      setNotificationsOpen(false);
      setFeedSearch({ open: false, query: '' });
      setCompetitionsSearch({ open: false, query: '' });
      setGallerySearch({ open: false, query: '' });
      setActiveTab(newTab);
    },
    [flushPendingDeletes, userIsModerator]
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

  // Тяжёлый TrainingsPage монтируем на следующий кадр после переключения на «Запись»,
  // чтобы кнопка абонемента в хедере успела отрисоваться без задержки.
  useEffect(() => {
    if (activeTab !== 1) {
      setTrainingsReady(false);
      return undefined;
    }
    const id = requestAnimationFrame(() => setTrainingsReady(true));
    return () => cancelAnimationFrame(id);
  }, [activeTab]);

  const headerTitle = TAB_TITLES[activeTab] || TAB_TITLES[0];
  const viewportRef = useRef(/** @type {HTMLElement | null} */ (null));
  const trackRef = useRef(/** @type {HTMLElement | null} */ (null));
  const [swipePeek, setSwipePeek] = useState(
    /** @type {{ tab: number, direction: -1 | 1 } | null} */ (null)
  );
  const sectionSwipeEnabled = Boolean(user?.onboarding_completed);

  useSectionSwipe({
    enabled: sectionSwipeEnabled,
    activeTab,
    showAdmin: userIsModerator,
    onTabChange: handleTabChange,
    viewportRef,
    trackRef,
    onPeekChange: setSwipePeek
  });

  // При peek на «Запись» монтируем TrainingsPage сразу (без rAF-задержки).
  useEffect(() => {
    if (swipePeek?.tab === 1) setTrainingsReady(true);
  }, [swipePeek]);

  // Prev-peek: до paint выставить -width, чтобы был виден current, а не prev.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || swipePeek?.direction !== -1) return;
    const width = window.innerWidth || document.documentElement.clientWidth || 360;
    track.style.transition = 'none';
    track.style.transform = `translate3d(${-width}px, 0, 0)`;
  }, [swipePeek]);

  const renderTabPage = (tab, { isPrimary = false } = {}) => {
    switch (tab) {
      case 0:
        return (
          <FeedPage
            user={user}
            onDeletedIdsChange={setPendingDeletePostIds}
            searchQuery={feedSearch.query}
            searchOpen={feedSearch.open}
            captureMentionTargets={isPrimary}
            commentTargetToOpen={
              isPrimary && notificationCommentTarget?.collection === 'comments'
                ? notificationCommentTarget
                : null
            }
            onCommentTargetOpened={() => setNotificationCommentTarget(null)}
          />
        );
      case 1:
        return (
          <>
            {trainingsReady ? (
              <TrainingsPage
                user={user}
                onDeletedIdsChange={setPendingDeleteTrainingIds}
                onFlushPendingDeletes={flushPendingDeletes}
                trainingIdToOpen={isPrimary ? notificationTrainingId : null}
                onTrainingOpened={() => setNotificationTrainingId(null)}
              />
            ) : null}
            <MembershipOverviewModal
              key={sessionResetKey}
              isOpen={membershipOpen}
              onClose={() => setMembershipOpen(false)}
              currentUser={user}
            />
          </>
        );
      case 2:
        return (
          <ProductUploadProvider>
            <ShopPage
              onDeletedIdsChange={setPendingDeleteProductIds}
              productToOpen={isPrimary ? favoriteProductToOpen : null}
              onProductOpened={() => setFavoriteProductToOpen(null)}
            />
          </ProductUploadProvider>
        );
      case 3:
        return (
          <CompetitionsPage
            user={user}
            onTabChange={handleTabChange}
            onSubTabChange={handleCompetitionsSubTabChange}
            onDeletedIdsChange={setPendingDeleteTournamentPostIds}
            searchQuery={competitionsSearch.query}
            searchOpen={competitionsSearch.open}
            captureMentionTargets={isPrimary}
            commentTargetToOpen={
              isPrimary && notificationCommentTarget?.collection === 'tournament_comments'
                ? notificationCommentTarget
                : null
            }
            onCommentTargetOpened={() => setNotificationCommentTarget(null)}
          />
        );
      case GALLERY_TAB_INDEX:
        return (
          <GalleryPage
            user={user}
            searchQuery={gallerySearch.query}
            commentTargetToOpen={
              isPrimary && notificationCommentTarget?.collection === 'gallery_comments'
                ? notificationCommentTarget
                : null
            }
            onCommentTargetOpened={() => setNotificationCommentTarget(null)}
          />
        );
      case PROFILE_TAB_INDEX:
        return (
          <ProfilePage
            user={user}
            onUpdate={handleUserUpdate}
            onTabChange={handleTabChange}
            openMembershipFromNotification={isPrimary ? notificationMembershipOpen : false}
            onMembershipOpened={() => setNotificationMembershipOpen(false)}
          />
        );
      case ADMIN_TAB_INDEX:
        return userIsModerator ? <AdminPanelPage /> : null;
      default:
        return null;
    }
  };

  const panelClassForTab = (tab) =>
    tab === 1 ? 'section-swipe-panel section-swipe-panel--contained' : 'section-swipe-panel';

  const peekPrev = swipePeek?.direction === -1 ? swipePeek.tab : null;
  const peekNext = swipePeek?.direction === 1 ? swipePeek.tab : null;

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
        : activeTab === GALLERY_TAB_INDEX
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
    <MentionNavProvider
      currentUser={user}
      onOpenFeedPost={() => {
        setActiveTab(0);
      }}
      onOpenTournamentPost={() => {
        setCompetitionsSubTab('feed');
        setActiveTab(3);
      }}
    >
    <div className={`app${user && !user.onboarding_completed ? ' onboarding-active' : ''}`}>
      {user && !user.onboarding_completed && (
        <OnboardingTutorial
          user={user}
          onUpdate={handleUserUpdate}
          onComplete={async () => {
            const updated = await completeOnboarding(user.id);
            handleUserUpdate(updated);
            setActiveTab(0);
          }}
          onTabChange={setActiveTab}
        />
      )}

      <AppHeader
        title={headerTitle}
        onMembershipClick={
          userIsModerator ? () => setMembershipOpen(true) : undefined
        }
        membershipVisible={activeTab === 1}
        membershipActive={membershipOpen}
        showShopControls={activeTab === 2}
        favoritesCount={favoritesCount}
        onFavoritesClick={() => setFavoritesDropdownOpen((open) => !open)}
        favoritesDropdownOpen={favoritesDropdownOpen}
        onFavoritesDropdownClose={() => setFavoritesDropdownOpen(false)}
        onOpenProduct={(product) => {
          setFavoriteProductToOpen(product);
          setFavoritesDropdownOpen(false);
        }}
        onNotificationsClick={() => setNotificationsOpen((open) => !open)}
        unreadCount={unreadCount}
        hasUnread={unreadCount > 0}
        notificationsDropdownOpen={notificationsOpen}
        onNotificationsDropdownClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onNotificationsMutate={mutateNotifications}
        userId={user?.id}
        onOpenTrainingFromNotification={(trainingId) => {
          setActiveTab(1);
          setNotificationTrainingId(trainingId);
        }}
        onOpenMembershipFromNotification={() => {
          setActiveTab(PROFILE_TAB_INDEX);
          setNotificationMembershipOpen(true);
        }}
        onOpenBookingFromNotification={() => setActiveTab(1)}
        onOpenCommentFromNotification={(meta) => {
          const collection = String(meta?.collection || '');
          const commentId = meta?.commentId ? String(meta.commentId) : undefined;
          if (collection === 'comments' && meta?.postId) {
            setActiveTab(0);
            setNotificationCommentTarget({
              collection,
              postId: String(meta.postId),
              commentId
            });
            return;
          }
          if (collection === 'tournament_comments' && meta?.postId) {
            setCompetitionsSubTab('feed');
            setActiveTab(3);
            setNotificationCommentTarget({
              collection,
              postId: String(meta.postId),
              commentId
            });
            return;
          }
          if (collection === 'gallery_comments' && meta?.mediaId) {
            setActiveTab(GALLERY_TAB_INDEX);
            setNotificationCommentTarget({
              collection,
              mediaId: String(meta.mediaId),
              commentId
            });
          }
        }}
        searchConfig={searchConfig}
      />

      <main ref={viewportRef} className="section-swipe-viewport">
        <div ref={trackRef} className="section-swipe-track">
          {peekPrev != null && (
            <div
              key={`section-${peekPrev}`}
              className={panelClassForTab(peekPrev)}
              aria-hidden="true"
            >
              {renderTabPage(peekPrev)}
            </div>
          )}
          <div key={`section-${activeTab}`} className={panelClassForTab(activeTab)}>
            {renderTabPage(activeTab, { isPrimary: true })}
          </div>
          {peekNext != null && (
            <div
              key={`section-${peekNext}`}
              className={panelClassForTab(peekNext)}
              aria-hidden="true"
            >
              {renderTabPage(peekNext)}
            </div>
          )}
        </div>
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showAdmin={userIsModerator}
        showAdd={userIsModerator}
        user={user}
      />

      <CloseAppConfirmSheet
        isOpen={confirmOpen}
        confirming={confirming}
        onCancel={cancelCloseConfirm}
        onConfirm={confirmCloseApp}
      />
    </div>
    </MentionNavProvider>
  );
}

function App() {
  const needsUpdate = useAppVersionCheck();
  return (
    <>
      <AppInner />
      <ForceUpdateOverlay open={needsUpdate} />
    </>
  );
}

export default App;
