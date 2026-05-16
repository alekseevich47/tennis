import React, { useState, useEffect } from 'react';
import Feed from './pages/Feed';
import Trainings from './pages/Trainings';
import Shop from './pages/Shop';
import Rating from './pages/Rating';
import Competitions from './pages/Competitions';
import Gallery from './pages/Gallery';
import Profile from './pages/Profile'; // Новый компонент профиля
import BottomNav from './components/BottomNav';
import pb, { initMaxAuth, getCurrentUser, getUserAvatarData } from './services/pocketbase';
import './styles/global.css';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);

  // Инициализация при старте
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Забираем initData строго по спецификации MAX Bridge
        const initData = window.WebApp?.initData;

        if (initData) {
          // Ждем завершения записи токена в СУБД
          const loggedUser = await initMaxAuth(initData);
          setUser(loggedUser);
        } else {
          console.warn('Запуск вне мессенджера MAX. Используем локальную сессию.');
          setUser(getCurrentUser());
        }
      } catch (error) {
        console.error('Критическая ошибка инициализации сессии:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Функция для обновления локального состояния пользователя после редактирования
  // Изменяем функцию, чтобы она принимала обновленный объект пользователя
   const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser || getCurrentUser());
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#ffffff', color: '#1a1a1a' }}>
        <div style={{ fontSize: '16px', fontWeight: '600' }}>Загрузка профиля MAX...</div>
      </div>
    );
  }

   // Найди метод renderContent() внутри App.jsx и замени кейс 6:
  const renderContent = () => {
    switch (activeTab) {
      case 0: return <Feed user={user} onDeletedIdsChange={setPendingDeleteIds} />;
      case 1: return <Trainings user={user} />;
      case 2: return <Shop user={user} />;
      case 3: return <Rating user={user} />;
      case 4: return <Competitions user={user} />;
      case 5: return <Gallery user={user} />;
      case 6: return <Profile user={user} onUpdate={handleUserUpdate} />;
      default: return <Feed user={user} />;
    }
  };

  const handleTabChange = async (newTab) => {
  // Если модератор уходит из ленты и у него есть скрытые посты — стираем их из БД навсегда
  if (pendingDeleteIds.length > 0) {
    pendingDeleteIds.forEach((postId) => {
      pb.collection('posts').delete(postId).catch((err) => {
        console.error('Критическая ошибка окончательной зачистки поста:', err);
      });
    });
    // Очищаем буфер
    setPendingDeleteIds([]);
  }

  // 2. ФИКС: Физическое безвозвратное удаление скрытых комментариев из ленты
    // Мы добавим глобальный буфер для скрытых комментариев, чтобы чистить их при смене вкладок
    const savedCommentsJson = sessionStorage.getItem('pending_delete_comments');
    if (savedCommentsJson) {
      try {
        const commentIds = JSON.parse(savedCommentsJson);
        commentIds.forEach((commentId) => {
          pb.collection('comments').delete(commentId).catch((err) => {
            console.error('Ошибка зачистки комментария при смене таба:', err);
          });
        });
        sessionStorage.removeItem('pending_delete_comments');
      } catch (e) {
        console.error(e);
      }
    }

  // Переключаем вкладку
  setActiveTab(newTab);
};

  // Получаем первую букву для дефолтной аватарки
  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="app">
      {/* Сквозной Header по ТЗ */}
      <header className="app-header">
        <h1 className="header-title">
          {activeTab === 0 && "Лента новостей"}
          {activeTab === 1 && "Тренировки"}
          {activeTab === 2 && "Магазин"}
          {activeTab === 3 && "Рейтинг"}
          {activeTab === 4 && "Соревнования"}
          {activeTab === 5 && "Галерея"}
          {activeTab === 6 && "Мой профиль"}
        </h1>
        
          <div className="header-profile-badge" onClick={() => setActiveTab(6)}>
          <div className="avatar-wrapper-mini">
            {(() => {
              const av = getUserAvatarData(user);
              return av.hasAvatar ? (
                <img src={av.src} alt="Avatar" className="profile-avatar-mini" />
              ) : (
                <div className="profile-avatar-mini text-fallback-avatar">{av.initial}</div>
              );
            })()}
          </div>
          <span className="profile-name-mini">{user?.full_name || "Гость"}</span>
        </div>
      </header>

      {/* Основной контент */}
      <main className="content-with-header">{renderContent()}</main>

      {/* Нижняя навигация */}
      <BottomNav activeTab={activeTab === 6 ? -1 : activeTab} onTabChange={handleTabChange} />
    </div>
  );
}

export default App;
