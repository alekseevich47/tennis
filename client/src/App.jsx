import React, { useState, useEffect } from 'react';
import Feed from './pages/Feed';
import Trainings from './pages/Trainings';
import Shop from './pages/Shop';
import Rating from './pages/Rating';
import Competitions from './pages/Competitions';
import Gallery from './pages/Gallery';
import BottomNav from './components/BottomNav';
import { initMaxAuth } from './services/pocketbase';
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
        // Строго по документации dev.max.ru/docs/webapps/bridge
        const initData = window.WebApp?.initData;

        if (initData) {
          // Если запуск внутри iframe MAX, отправляем строку на валидацию и регистрацию
          await initMaxAuth(initData);
        } else {
          console.warn('Приложение запущено вне мессенджера MAX. Доступен только просмотр.');
        }
      } catch (error) {
        console.error('Ошибка автоматической авторизации:', error);
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
