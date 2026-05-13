import React, { useState, useEffect } from 'react';
import Feed from './pages/Feed';
import Trainings from './pages/Trainings';
import Shop from './pages/Shop';
import Rating from './pages/Rating';
import Competitions from './pages/Competitions';
import Gallery from './pages/Gallery';
import BottomNav from './components/BottomNav';
import { isModerator, initMaxAuth } from './services/pocketbase';
import './styles/global.css';

/**
 * Главный компонент приложения
 * Управляет навигацией между разделами через нижнюю панель
 * Инициализирует авторизацию через MAX SDK
 */
function App() {
  // Текущий активный раздел (по умолчанию Лента = 0)
  const [activeTab, setActiveTab] = useState(0);
  // Состояние загрузки авторизации
  const [isLoading, setIsLoading] = useState(true);

  // Инициализация авторизации при запуске приложения
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Проверяем наличие MAX SDK и initData
        if (window.MaxWebApp && window.MaxWebApp.initData) {
          await initMaxAuth(window.MaxWebApp.initData);
        } else if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
          // Fallback для Telegram WebApp (если MAX использует совместимый формат)
          await initMaxAuth(window.Telegram.WebApp.initData);
        }
        // Если нет initData, пользователь будет работать как гость
        // PocketBase позволяет читать публичные данные без авторизации
      } catch (error) {
        console.error('Ошибка инициализации авторизации:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Показываем индикатор загрузки во время инициализации
  if (isLoading) {
    return (
      <div className="app">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  // Рендеринг контента в зависимости от выбранного раздела
  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return <Feed />;
      case 1:
        return <Trainings />;
      case 2:
        return <Shop />;
      case 3:
        return <Rating />;
      case 4:
        return <Competitions />;
      case 5:
        return <Gallery />;
      default:
        return <Feed />;
    }
  };

  return (
    <div className="app">
      {/* Основной контент */}
      <main className="content">
        {renderContent()}
      </main>

      {/* Нижняя навигационная панель */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
