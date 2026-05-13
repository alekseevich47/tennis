import React, { useState, useEffect } from 'react';
import Feed from './pages/Feed';
import Trainings from './pages/Trainings';
import Shop from './pages/Shop';
import Rating from './pages/Rating';
import Competitions from './pages/Competitions';
import Gallery from './pages/Gallery';
import Profile from './pages/Profile'; // Новый компонент профиля
import BottomNav from './components/BottomNav';
import { initMaxAuth, getCurrentUser } from './services/pocketbase';
import './styles/global.css';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Инициализация при старте
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const initData = window.WebApp?.initData;
        if (initData) {
          const loggedUser = await initMaxAuth(initData);
          setUser(loggedUser);
        } else {
          console.warn('MAX SDK не обнаружен. Доступ ограничен гостевым режимом.');
          setUser(getCurrentUser()); // Проверка локальной сессии
        }
      } catch (error) {
        console.error('Ошибка автоматической авторизации:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  // Функция для обновления локального состояния пользователя после редактирования
  // Изменяем функцию, чтобы она принимала обновленный объект пользователя
  const handleUserUpdate = (updatedUser) => {
    if (updatedUser) {
      setUser(updatedUser);
    } else {
      setUser(getCurrentUser());
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111', color: '#fff' }}>
        <div>Инициализация профиля MAX...</div>
      </div>
    );
  }

   // Найди метод renderContent() внутри App.jsx и замени кейс 6:
  const renderContent = () => {
    switch (activeTab) {
      case 0: return <Feed />;
      case 1: return <Trainings />;
      case 2: return <Shop />;
      case 3: return <Rating />;
      case 4: return <Competitions />;
      case 5: return <Gallery />;
      // ПЕРЕДАЕМ объект user в компонент Профиля
      case 6: return <Profile user={user} onUpdate={handleUserUpdate} />; 
      default: return <Feed />;
    }
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
          <div className="profile-avatar-mini">{userInitial}</div>
          <span className="profile-name-mini">{user?.full_name || "Гость"}</span>
        </div>
      </header>

      {/* Основной контент */}
      <main className="content-with-header">{renderContent()}</main>

      {/* Нижняя навигация */}
      <BottomNav activeTab={activeTab === 6 ? -1 : activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
