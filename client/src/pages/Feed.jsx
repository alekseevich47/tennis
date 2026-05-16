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
  const [deletedPostIds, setDeletedPostIds] = useState([]);

  // Состояния для полноэкранного просмотра фото с зумом и перемещением
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Стейты для детального просмотра поста и комментариев
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [activeComments, setActiveComments] = useState([]);
  const [deletedCommentIds, setDeletedCommentIds] = useState([]);

  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const startTouchRef = useRef({ x: 0, y: 0 });
  const startDistRef = useRef(0);
  const isDraggingRef = useRef(false);
  const userIsModerator = isModerator();
  const commentsBottomRef = useRef(null);

  useEffect(() => {
    loadPosts();
  }, []);

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
      setIsButtomVisible(false);
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

    const formatPostDate = (dateString) => {
      const d = new Date(dateString);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes} ${day}.${month}.${year}`;
  };

    const loadPosts = async () => {
    try {
      // ИСПРАВЛЕНИЕ ОТОБРАЖЕНИЯ: загружаем только те посты, которые НЕ удалены модератором.
      // Для обычных пользователей скрытые посты отсекаются прямо на уровне СУБД.
      const filterString = userIsModerator ? "" : "is_deleted = false";
      
      const data = await pb.collection('posts').getFullList({
        sort: '-created',
        filter: filterString,
        expand: 'comments(post).author'
      });
      setPosts(data);
    } catch (error) {
      console.error('Ошибка загрузки ленты:', error);
    }
  };

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

   // --- ЛОГИКА КОММЕНТАРИЕВ ---

  const handleOpenPostModal = async (post) => {
    setSelectedPost(post);
    setShowPostModal(true);
    setShowAllComments(false);
    setDeletedCommentIds([]);
    
    // Мгновенно запрашиваем комментарии напрямую из таблицы comments
    await loadCommentsForPost(post.id);

    setTimeout(() => {
      commentsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  // Окончательная очистка комментариев при закрытии модального окна крестиком
  const handleClosePostModal = async () => {
    setShowPostModal(false);
    
    // Если были мягко удаленные комменты — стираем их из БД физически прямо сейчас
    if (deletedCommentIds.length > 0) {
      const deletePromises = deletedCommentIds.map(id => 
        pb.collection('comments').delete(id).catch(err => console.error(err))
      );
      await Promise.all(deletePromises);
    }
    
    // Чистим массивы
    setDeletedCommentIds([]);
    setSelectedPost(null);
    
    // Перезагружаем ленту, чтобы отобразить актуальные данные
    await loadPosts();
  };

   const loadCommentsForPost = async (postId) => {
    try {
      const res = await pb.collection('comments').getFullList({
        filter: `post = "${postId}"`,
        sort: 'created', // Сортируем от старых к новым
        expand: 'author' // Подтягиваем профили авторов (full_name)
      });
      setActiveComments(res);
      setPosts((prevPosts) => 
        prevPosts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              expand: {
                ...p.expand,
                'comments(post)': res
              }
            };
          }
          return p;
        })
      );
      return res;
    } catch (error) {
      console.error('Ошибка загрузки комментариев из БД:', error);
      return [];
    }
  };

   const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedPost) return;

    try {
      const createdComment = await pb.collection('comments').create({
        text: commentText, // Передаем строго в колонку text по структуре твоей БД
        post: selectedPost.id,
        author: user?.id || ''
      });

      setCommentText('');
      
      // Скачиваем обновленный список комментариев из базы данных
      const freshComments = await loadCommentsForPost(selectedPost.id);
      
      // Напрямую мутируем массив комментариев внутри posts в оперативной памяти.
      // Это исключает задержку PocketBase кэша отношений и выводит коммент в ленту СРАЗУ.
      setPosts((prevPosts) => 
        prevPosts.map((p) => {
          if (p.id === selectedPost.id) {
            return {
              ...p,
              expand: {
                ...p.expand,
                'comments(post)': freshComments
              }
            };
          }
          return p;
        })
      );

      setTimeout(() => {
        commentsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
    }
  };

   // Мягкое скрытие комментария по ТЗ
  const handleDeleteComment = async (commentId, e) => {
    e.stopPropagation();
    setDeletedCommentIds((prev) => [...prev, commentId]);

    // Синхронизируем с sessionStorage для App.jsx на случай, если юзер переключит табы, не закрыв модалку
    const currentDeleted = JSON.parse(sessionStorage.getItem('pending_delete_comments') || '[]');
    sessionStorage.setItem('pending_delete_comments', JSON.stringify([...currentDeleted, commentId]));

    try {
      await pb.collection('comments').update(commentId, { is_deleted: true });
      // Синхронизируем локальный стейт, чтобы убрать из превью ленты
      await loadCommentsForPost(selectedPost.id);
    } catch (error) {
      console.error(error);
    }
  };

  // Восстановление комментария кликом по ссылке
  const handleRestoreComment = async (commentId, e) => {
    e.stopPropagation();
    setDeletedCommentIds((prev) => prev.filter(id => id !== commentId));

    const currentDeleted = JSON.parse(sessionStorage.getItem('pending_delete_comments') || '[]');
    sessionStorage.setItem('pending_delete_comments', JSON.stringify(currentDeleted.filter(id => id !== commentId)));

    try {
      await pb.collection('comments').update(commentId, { is_deleted: false });
      await loadCommentsForPost(selectedPost.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStartEditComment = (comment, e) => {
    e.stopPropagation();
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content || comment.text || '');
  };

  const handleSaveEditComment = async (commentId, e) => {
    e.preventDefault();
    if (!editingCommentText.trim()) return;
    try {
      // КРИТИЧЕСКИЙ ФИКС: передаем ключ "text", а не "content", чтобы СУБД обновила ячейку
      await pb.collection('comments').update(commentId, { 
        text: editingCommentText 
      });
      setEditingCommentId(null);
      await loadCommentsForPost(selectedPost.id);
    } catch (error) {
      console.error('Ошибка сохранения комментария:', error);
    }
  };

  // Вспомогательная функция получения массива комментариев для поста
  // СТРОГО ТАК (Защищаем массив от пустых объектов expand в PocketBase v0.23+):
  // Хелпер безопасной сборки массива комментариев из expand отношения
  const getPostComments = (postObj) => {
    if (!postObj || !postObj.expand) return [];
    const list = postObj.expand['comments(post)'];
    if (!list) return [];
    return Array.isArray(list) ? list : [list];
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

          const allComments = getPostComments(post).filter(c => !c.is_deleted);
          const previewComments = allComments.slice(-2); // Строго последние 2 записи

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
                   <span className="post-date">{formatPostDate(post.created)}</span>
                </div>
                {userIsModerator && (
                <button className="delete-post-btn" onClick={(e) => handleDeletePost(post.id, e)}>✕</button>
              )}
              </div>
              
              <div className="feed-card-body">
                <p className="post-text" onClick={() => handleOpenPostModal(post)}>
                  {post.content || post.text}
                </p>
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
                
                <button 
                  className="comment-btn" 
                  onClick={(e) => {
                    e.stopPropagation(); // Изолируем клик от карточки
                    handleOpenPostModal(post); // Принудительно открываем окно поста
                  }}
                >
                  💬 Комментарии
              </button>
              </div>

              {/* Отображение последних 2 комментариев прямо в ленте */}
              {previewComments.length > 0 && (
                <div className="feed-comments-preview" onClick={(e) => e.stopPropagation()}>
                  {previewComments.map(c => (
                    <div key={c.id} className="preview-comment-row">
                      <span className="preview-comment-author">{c.expand?.author?.full_name || 'Игрок'}:</span>
                      <span className="preview-comment-text">{c.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* МОДАЛЬНОЕ ОКНО ПРОСМОТРА ПОСТА И ВСЕХ КОММЕНТАРИЕВ */}
      {showPostModal && selectedPost && (
        <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="modal-content post-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-x" onClick={() => setShowPostModal(false)}>✕</button>
            
            <div className="modal-scroll-area">
              <div className="feed-card-header">
                <div className="section-avatar">🎾</div>
                <div className="section-meta">
                  <span className="section-title-name">Секция Миленьких</span>
                  <span className="post-date">{formatPostDate(selectedPost.created)}</span>
                </div>
              </div>
              
              <p className="post-text-detail">{selectedPost.content || selectedPost.text}</p>
                {(() => {
                  // Безопасно извлекаем имя файла, если PocketBase вернул его массивом [ "имя_файла.png" ]
                  const mediaField = selectedPost.media;
                  const fileName = Array.isArray(mediaField) && mediaField.length > 0 
                    ? mediaField[0] 
                    : (typeof mediaField === 'string' ? mediaField : null);

                  return fileName ? (
                    <img 
                      src={`https://urban42.online/tt/api/files/posts/${selectedPost.id}/${fileName}`} 
                      alt="Медиа" 
                      className="post-media-img-detail" 
                    />
                  ) : null;
                })()}

               {/* Блок комментариев в модалке */}
              <div className="modal-comments-section">
                <h4>Комментарии ({activeComments.length})</h4>
                
                {(() => {
                  // Берем данные из нашего надежного стейта activeComments
                  const displayed = showAllComments ? activeComments : activeComments.slice(-2);
                  
                  return (
                    <>
                      {activeComments.length > 2 && !showAllComments && (
                        <button type="button" className="show-more-comments-btn" onClick={() => setShowAllComments(true)}>
                          Показать ещё ({activeComments.length - 2})
                        </button>
                      )}

                      <div className="modal-comments-list">
                        {displayed.map((c) => {
                          const isCommentSoftDeleted = deletedCommentIds.includes(c.id) || c.is_deleted === true;
                           // Если комментарий скрыт и юзер не модератор — убираем из верстки совсем
                          if (isCommentSoftDeleted && !userIsModerator) return null;

                          // ТЗ: Текстовая плашка мягкого удаления для модератора/владельца
                          if (isCommentSoftDeleted && userIsModerator) {
                            return (
                              <div key={c.id} className="modal-comment-item comment-soft-deleted">
                                <span className="soft-del-msg">Вы удалили комментарий. </span>
                                <span className="soft-restore-link" onClick={(e) => handleRestoreComment(c.id, e)}>Восстановить</span>
                              </div>
                            );
                          }

                          const isCommentOwner = c.author === user?.id;
                          const canDelete = isCommentOwner || userIsModerator;

                          return (
                            <div key={c.id} className="modal-comment-item">
                              <div className="comment-header-row">
                                <span className="comment-author-name">
                                  {c.expand?.author?.full_name || 'Игрок секции'}
                                </span>
                                <div className="comment-actions-btns">
                                  {isCommentOwner && editingCommentId !== c.id && (
                                    <button className="comment-edit-icon" onClick={(e) => handleStartEditComment(c, e)}>✏️</button>
                                  )}
                                  {canDelete && (
                                    <button className="comment-delete-icon" onClick={(e) => handleDeleteComment(c.id, e)}>✕</button>
                                  )}
                                </div>
                              </div>

                              {editingCommentId === c.id ? (
                                <form onSubmit={(e) => handleSaveEditComment(c.id, e)} className="comment-edit-inline-form">
                                  <input type="text" value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} required />
                                  <button type="submit">ОК</button>
                                  <button type="button" onClick={() => setEditingCommentId(null)}>✕</button>
                                </form>
                              ) : (
                               <>
                                  <p className="comment-content-text">{c.text}</p>
                                  <span className="comment-timestamp-text">{formatPostDate(c.created)}</span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
                <div ref={commentsBottomRef} />
              </div>
            </div>

            {/* Фиксированная форма ввода внизу модалки */}
            <form onSubmit={handleAddComment} className="modal-comment-form-footer">
              <input 
                type="text" 
                placeholder="Написать комментарий..." 
                value={commentText} 
                onChange={(e) => setCommentText(e.target.value)} 
                required 
              />
              <button type="submit">Отправить</button>
            </form>
          </div>
        </div>
      )}

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
