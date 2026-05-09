import React, { useState } from 'react';
import Feed from './pages/Feed';
import Trainings from './pages/Trainings';
import Shop from './pages/Shop';
import Rating from './pages/Rating';
import Competitions from './pages/Competitions';
import Gallery from './pages/Gallery';
import BottomNav from './components/BottomNav';
import { isModerator } from './services/pocketbase';
import './styles/global.css';

/**
 * Главный компонент приложения
 * Управляет навигацией между разделами через нижнюю панель
 */
function App() {
  // Текущий активный раздел (по умолчанию Лента = 0)
  const [activeTab, setActiveTab] = useState(0);

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
