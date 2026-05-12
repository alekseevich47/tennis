import React from 'react';
import './BottomNav.css';

/**
 * Компонент нижней навигационной панели
 * Отображает 6 иконок для переключения между разделами
 * @param {number} activeTab - индекс активной вкладки
 * @param {function} onTabChange - функция изменения активной вкладки
 */
function BottomNav({ activeTab, onTabChange }) {
  // Массив иконок для каждого раздела (SVG)
  const icons = [
    // Лента
    <svg key="feed" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/>
    </svg>,
    // Запись на тренировку
    <svg key="training" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"/>
    </svg>,
    // Магазин
    <svg key="shop" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
    </svg>,
    // Рейтинг
    <svg key="rating" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
    </svg>,
    // Соревнования
    <svg key="competitions" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>,
    // Галерея
    <svg key="gallery" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/>
    </svg>
  ];

  return (
    <nav className="bottom-nav">
      {icons.map((icon, index) => (
        <button
          key={index}
          className={`nav-item ${activeTab === index ? 'active' : ''}`}
          onClick={() => onTabChange(index)}
          aria-label={`Раздел ${index + 1}`}
        >
          {icon}
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
