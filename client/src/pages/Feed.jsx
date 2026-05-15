import React, { useState, useEffect } from 'react';
import { getPosts, createPost, addComment, getCurrentUser, isModerator } from '../services/pocketbase';
import './Feed.css';

/**
 * Компонент ленты новостей
 * Отображает посты в стиле Instagram с возможностью прокрутки свайпом
 */
function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState(null);
  const moderator = isModerator();

  // Загрузка постов при монтировании компонента
  useEffect(() => {
    loadPosts();
  }, []);

  /**
   * Загрузка списка постов из базы данных
   */
  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await getPosts();
      setPosts(data);
    } catch (error) {
      console.error('Ошибка загрузки постов:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Создание нового поста
   */
  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !newPostMedia) return;

    try {
      const formData = new FormData();
      formData.append('content', newPostContent);
      if (newPostMedia) {
        formData.append('media', newPostMedia);
      }
      formData.append('author', getCurrentUser().id);

      await createPost(formData);
      setNewPostContent('');
      setNewPostMedia(null);
      setShowAddModal(false);
      loadPosts();
    } catch (error) {
      console.error('Ошибка создания поста:', error);
      alert('Не удалось создать пост');
    }
  };

  /**
   * Добавление комментария к посту
   */
  const handleAddComment = async (postId, text) => {
    if (!text.trim()) return;

    try {
      await addComment(postId, text);
      loadPosts();
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
    }
  };

  return (
    <div className="feed">
      {/* Список постов */}
      <div className="posts-container">
        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : posts.length === 0 ? (
          <div className="empty">Нет постов</div>
        ) : (
          posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              onAddComment={handleAddComment}
            />
          ))
        )}
      </div>

      {/* Модальное окно создания поста */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Новый пост</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <textarea
              placeholder="Что нового?"
              value={newPostContent}
              onChange={e => setNewPostContent(e.target.value)}
              rows={4}
            />
            <input
              type="file"
              accept="image/*,video/*"
              onChange={e => setNewPostMedia(e.target.files[0])}
            />
            {newPostMedia && (
              <div className="preview">
                {newPostMedia.type.startsWith('video') ? (
                  <video src={URL.createObjectURL(newPostMedia)} controls />
                ) : (
                  <img src={URL.createObjectURL(newPostMedia)} alt="Preview" />
                )}
              </div>
            )}
            <button className="submit-btn" onClick={handleCreatePost}>
              Опубликовать
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Компонент карточки поста
 */
function PostCard({ post, onAddComment }) {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const currentUser = getCurrentUser();

  return (
    <article className="post-card">
      {/* Автор поста */}
      <div className="post-author">
        {post.expand?.author?.avatar ? (
          <img 
            src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${post.collectionId}/${post.expand.author.id}/${post.expand.author.avatar}`} 
            alt="Avatar" 
            className="avatar"
          />
        ) : (
          <div className="avatar-placeholder">{post.expand?.author?.name?.[0] || '?'}</div>
        )}
        <span className="author-name">
          {post.expand?.author?.name || 'Аноним'}
        </span>
      </div>

      {/* Контент поста */}
      {post.media && post.media.length > 0 && (
        <div className="post-media">
          {post.media.map((media, index) => (
            media.endsWith('.mp4') || media.endsWith('.mov') ? (
              <video key={index} src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${post.collectionId}/${post.id}/${media}`} controls />
            ) : (
              <img key={index} src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${post.collectionId}/${post.id}/${media}`} alt="Post media" />
            )
          ))}
        </div>
      )}

      {post.content && (
        <p className="post-content">{post.content}</p>
      )}

      {/* Действия */}
      <div className="post-actions">
        <button className="action-btn">❤️</button>
        <button className="action-btn" onClick={() => setShowComments(!showComments)}>
          💬 {post.expand?.comments?.length || 0}
        </button>
      </div>

      {/* Комментарии */}
      {showComments && (
        <div className="comments-section">
          {post.expand?.comments?.map(comment => (
            <div key={comment.id} className="comment">
              <strong>{comment.expand?.author?.name || 'Аноним'}:</strong>
              <span>{comment.text}</span>
            </div>
          ))}
          <div className="add-comment">
            <input
              type="text"
              placeholder="Добавить комментарий..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && (onAddComment(post.id, commentText), setCommentText(''))}
            />
            <button onClick={() => { onAddComment(post.id, commentText); setCommentText(''); }}>
              ➤
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default Feed;
