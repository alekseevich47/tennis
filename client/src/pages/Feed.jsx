import React, { useState, useEffect, useRef } from 'react';
import pb, { getPosts, isModerator } from '../services/pocketbase';
import './Feed.css';

const PB_URL = 'https://urban42.online';

function Feed({ user, onDeletedIdsChange }) {
  const [posts, setPosts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  
  // Состояния для полноэкранного просмотра фото с зумом и перемещением
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const startTouchRef = useRef({ x: 0, y: 0 });
  const startDistRef = useRef(0);
  const isDraggingRef = useRef(false);

  const [deletedPostIds, setDeletedPostIds] = useState([]);
  // Новый массив-буфер, который будет хранить полные копии объектов постов на случай восстановления
  const [backupPosts, setBackupPosts] = useState({});
  
  const userIsModerator = isModerator();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      // ИСПРАВЛЕНИЕ ОТОБРАЖЕНИЯ: загружаем только те посты, которые НЕ удалены модератором.
      // Для обычных пользователей скрытые посты отсекаются прямо на уровне СУБД.
      const filterString = userIsModerator ? "" : "is_deleted = false";
      
      const data = await pb.collection('posts').getFullList({
        sort: '-created',
        filter: filterString
      });
      setPosts(data);
    } catch (error) {
      console.error('Ошибка загрузки ленты:', error);
    }
  };

  // Синхронизируем список удаленных ID с родительским компонентом App.jsx
  useEffect(() => {
    if (onDeletedIdsChange) {
      onDeletedIdsChange(deletedPostIds);
    }
  }, [deletedPostIds, onDeletedIdsChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!userIsModerator || !container) return;

    const handleScroll = () => {
      setIsButtonVisible(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsButtonVisible(true);
      }, 200);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [userIsModerator, posts]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    try {
      const formData = new FormData();
      formData.append('content', newPostText);
      formData.append('author', user?.id || '');
      
      if (selectedFile && selectedFile.length > 0) {
        formData.append('media', selectedFile[0]); 
      }

      await pb.collection('posts').create(formData);
      
      setNewPostText('');
      setSelectedFile(null);
      setShowAddModal(false);
      loadPosts();
    } catch (error) {
      console.error('Ошибка публикации:', error);
    }
  };

  const handleCancelPublish = () => {
    if (newPostText.trim() || selectedFile) {
      if (!window.confirm('Отменить создание публикации?')) return;
    }
    setNewPostText('');
    setSelectedFile(null);
    setShowAddModal(false);
  };

  // Мягкое удаление: выставляем флаг is_deleted = true в PocketBase
  const handleDeletePost = async (postId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    
    // Мгновенно скрываем в интерфейсе
    setDeletedPostIds((prev) => [...prev, postId]);

    try {
      // Обновляем запись в базе данных, включая флаг скрытия
      await pb.collection('posts').update(postId, { is_deleted: true });
    } catch (error) {
      console.error('Ошибка мягкого удаления поста:', error);
    }
  };


   // Мгновенное восстановление: просто снимаем флаг скрытия (is_deleted = false)
  const handleRestorePost = async (postId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    try {
      // Возвращаем статус видимости посту в БД
      await pb.collection('posts').update(postId, { is_deleted: false });
      
      // Убираем из массива удаленных и обновляем ленту
      setDeletedPostIds((prev) => prev.filter(id => id !== postId));
      loadPosts();
    } catch (error) {
      console.error('Ошибка восстановления поста:', error);
      alert('Не удалось восстановить публикацию');
    }
  };  

  const handleLike = async (post, e) => {
    e.stopPropagation();
    try {
      const currentLikes = post.likes_count || 0;
      await pb.collection('posts').update(post.id, { likes_count: currentLikes + 1 });
      loadPosts();
    } catch (error) {
      console.error('Ошибка лайка:', error);
    }
  };

  // --- МАТЕМАТИКА ЖЕСТОВ ДЛЯ СДВИГА И ЗУМА (TOUCH PAN & ZOOM) ---
  
  const getTouchDistance = (t1, t2) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      // Один палец — активируем режим перетаскивания (сдвига)
      isDraggingRef.current = true;
      startTouchRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      };
    } else if (e.touches.length === 2) {
      // Два пальца — переходим в режим Pinch-to-Zoom
      isDraggingRef.current = false;
      startDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDraggingRef.current && scale > 1) {
      // Сдвигаем фото, только если масштаб увеличен (scale > 1)
      const nextX = e.touches[0].clientX - startTouchRef.current.x;
      const nextY = e.touches[0].clientY - startTouchRef.current.y;
      
      // Ограничиваем сдвиг, чтобы фото не улетало далеко за пределы экрана
      const limit = (scale - 1) * 200;
      setPosition({
        x: Math.min(Math.max(nextX, -limit), limit),
        y: Math.min(Math.max(nextY, -limit), limit)
      });
    } else if (e.touches.length === 2 && startDistRef.current > 0) {
      // Логика зума двумя пальцами
      const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
      const factor = currentDist / startDistRef.current;
      const newScale = Math.min(Math.max(scale * factor, 1), 4);
      
      setScale(newScale);
      startDistRef.current = currentDist;

      // Если вернулись к масштабу 1:1, сбрасываем координаты сдвига в центр
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    startDistRef.current = 0;
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
    setScale(1);
    setPosition({ x: 0, y: 0 }); // Полный сброс параметров
  };

  return (
    <div className="feed-scroll-container" ref={containerRef}>
      {userIsModerator && (
        <div className="floating-btn-wrapper">
          <button 
            className={`floating-add-btn ${isButtonVisible ? 'visible' : 'hidden'}`}
            onClick={() => setShowAddModal(true)}
          >
            Добавить
          </button>
        </div>
      )}

      <div className="feed-list">
        {posts.map((post) => {
          
          // ИСПРАВЛЕНИЕ ФАНТОМНЫХ КАРТИНОК: Проверяем, что media существует и не является пустой структурой
          const hasImage = post.media && post.media !== "" && (!Array.isArray(post.media) || post.media.length > 0);
          // ЭТАЛОННАЯ ССЫЛКА С ПРЕФИКСОМ /tt
          const imageUrl = hasImage
            ? `https://urban42.online/tt/api/files/posts/${post.id}/${post.media}`
            : null;

           // Пост считается удаленным, если его ID в локальном массиве ИЛИ если у него в БД взведен флаг is_deleted
          const isSoftDeleted = deletedPostIds.includes(post.id) || post.is_deleted === true;
          
          if (isSoftDeleted && !userIsModerator) return null;

          if (isSoftDeleted && userIsModerator) {
            return (
              <div key={post.id} className="feed-card soft-deleted-card">
                <div className="soft-deleted-text-group">
                  <p className="soft-deleted-title">Вы удалили публикацию.</p>
                  <p className="soft-deleted-subtitle">Но пока всё ещё можете её восстановить</p>
                </div>
                <button className="restore-post-btn" onClick={(e) => handleRestorePost(post.id, e)}>
                  Восстановить
                </button>
              </div>
            );
          }

          return (
            <div key={post.id} className="feed-card">
              <div className="feed-card-header">
                <div className="section-avatar">🎾</div>
                <div className="section-meta">
                  <span className="section-title-name">Секция Миленьких</span>
                  <span className="post-date">{new Date(post.created).toLocaleDateString()}</span>
                </div>
                {userIsModerator && (
                <button className="delete-post-btn" onClick={(e) => handleDeletePost(post.id, e)}>✕</button>
              )}
              </div>
              
              <div className="feed-card-body">
                <p className="post-text">{post.content || post.text}</p>
                {imageUrl && (
                  <img 
                    src={imageUrl} 
                    alt="Медиа" 
                    className="post-media-img clickable" 
                    onClick={() => setFullscreenImage(imageUrl)}
                  />
                )}
              </div>

              <div className="feed-card-footer">
                <button className="like-btn" onClick={(e) => handleLike(post, e)}>
                  ❤️ {post.likes_count || 0}
                </button>
                <button className="comment-btn" onClick={() => alert('Раздел комментариев в разработке')}>
                  💬 {post.comments_count || 0}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={handleCancelPublish}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-x" onClick={handleCancelPublish}>✕</button>
            <h3>Новая публикация</h3>
            <form onSubmit={handleCreatePost}>
              <textarea 
                placeholder="Что нового в секции?" 
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                required
              />
              <div className="media-upload-group">
                <label className="media-input-label">
                  📸 {selectedFile ? 'Фото выбрано' : 'Добавить фото'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setSelectedFile(e.target.files)} 
                    style={{ display: 'none' }} 
                  />
                </label>
                {selectedFile && <span className="file-name-preview">{selectedFile.name}</span>}
              </div>
              <div className="modal-actions">
                <button type="submit" className="submit-btn-full">Опубликовать</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ПОЛНОЭКРАННЫЙ ОВЕРЛЕЙ ПРОСМОТРА ФОТО С ЗУМОМ И ПЕРЕМЕЩЕНИЕМ */}
      {fullscreenImage && (
        <div className="fullscreen-overlay" onClick={closeFullscreen}>
          <button className="fullscreen-close-btn" onClick={closeFullscreen}>✕</button>
          <div 
            className="fullscreen-image-wrapper"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img 
              src={fullscreenImage} 
              alt="Full" 
              className="fullscreen-target-img" 
              // Одновременно масштабируем и сдвигаем по осям X и Y
              style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Feed;
