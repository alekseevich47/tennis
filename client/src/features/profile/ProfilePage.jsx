import React, { useEffect, useMemo, useState } from 'react';
import Avatar from '../../components/ui/Avatar';
import IconButton from '../../components/ui/IconButton';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { useTrainings } from '../../hooks/useTrainings';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { updateUserProfile } from '../../services/auth';
import { error } from '../../lib/log';
import './Profile.css';

const DEFAULT_HAND = 'Правая';

function normalizeAge(value) {
  return value != null && value !== '' ? Number(value) : null;
}

/**
 * @param {{ user: any, onUpdate?: (user: any) => void }} props
 */
function ProfilePage({ user, onUpdate }) {
  const { alert } = useAlertDialog();
  const { data: trainings, isLoading: trainingsLoading } = useTrainings();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [age, setAge] = useState(user?.age != null ? String(user.age) : '');
  const [dominantHand, setDominantHand] = useState(user?.dominant_hand || DEFAULT_HAND);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name || '');
    setAge(user?.age != null ? String(user.age) : '');
    setDominantHand(user?.dominant_hand || DEFAULT_HAND);
  }, [user?.id, user?.full_name, user?.age, user?.dominant_hand]);

  // Профильный список — производное от SWR-данных (H4).
  const myTrainings = useMemo(() => {
    if (!trainings || !user?.id) return [];
    return trainings.filter((t) => t.booked_users && t.booked_users.includes(user.id));
  }, [trainings, user?.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || saving) return;
    const nextProfile = {
      full_name: fullName,
      age: age ? parseInt(age, 10) : null,
      dominant_hand: dominantHand
    };
    const patch = {};

    if (nextProfile.full_name !== (user.full_name || '')) {
      patch.full_name = nextProfile.full_name;
    }

    if (nextProfile.age !== normalizeAge(user.age)) {
      patch.age = nextProfile.age;
    }

    if (nextProfile.dominant_hand !== (user.dominant_hand || DEFAULT_HAND)) {
      patch.dominant_hand = nextProfile.dominant_hand;
    }

    if (Object.keys(patch).length === 0) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUserProfile(user.id, patch);
      setIsEditing(false);
      onUpdate?.(updated);
    } catch (err) {
      error('save profile:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось сохранить изменения.' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-container">
        <EmptyState
          title="Пользователь не авторизован"
          description="Войдите в приложение через MAX, чтобы увидеть профиль."
        />
      </div>
    );
  }

  return (
    <div className="profile-container">
      <IconButton
        ariaLabel={isEditing ? 'Отменить редактирование профиля' : 'Редактировать профиль'}
        variant="ghost"
        size="md"
        className="edit-profile-btn"
        onClick={() => setIsEditing((prev) => !prev)}
      >
        <span aria-hidden="true">{isEditing ? '✕' : '✏️'}</span>
      </IconButton>

      {isEditing ? (
        <form onSubmit={handleSave} className="profile-edit-form">
          <div className="avatar-wrapper-large">
            <Avatar user={user} size="lg" alt="Большой аватар" />
          </div>

          <div className="form-group">
            <label htmlFor="profile-name">Имя фамилия</label>
            <input
              id="profile-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-age">Возраст</label>
            <input
              id="profile-age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min="1"
              max="100"
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-hand">Ведущая рука</label>
            <select
              id="profile-hand"
              value={dominantHand}
              onChange={(e) => setDominantHand(e.target.value)}
            >
              <option value="Правая">Правая</option>
              <option value="Левая">Левая</option>
              <option value="Амбидекстр">Амбидекстр</option>
            </select>
          </div>

          <button type="submit" className="save-profile-btn" disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </form>
      ) : (
        <div className="profile-view">
          <div className="avatar-wrapper-large">
            <Avatar user={user} size="lg" alt="Большой аватар" />
          </div>

          <h2 className="profile-user-name">{user.full_name}</h2>

          <div className="profile-meta-info">
            <p><strong>Возраст:</strong> {user.age ? `${user.age} лет` : 'Не указан'}</p>
            <p><strong>Рука:</strong> {user.dominant_hand || 'Не указана'}</p>
          </div>

          <div className="profile-stats-block">
            <h3>Статистика игр</h3>
            <div className="stats-counter">
              {user.games_count || 0} / {user.wins || 0} / {user.losses || 0}
            </div>
            <div className="stats-labels">
              <span>Игры</span>
              <span>Победы</span>
              <span>Поражения</span>
            </div>
          </div>

          <div className="profile-trainings-block">
            <h3>Мои тренировки ({myTrainings.length})</h3>
            {trainingsLoading ? (
              <Spinner label="Загрузка тренировок..." inline />
            ) : myTrainings.length === 0 ? (
              <p className="no-data-text">Вы ещё не записаны на тренировки</p>
            ) : (
              <div className="profile-trainings-list">
                {myTrainings.map((t) => (
                  <div key={t.id} className="profile-training-card">
                    <span className="training-date">
                      {new Date(t.date).toLocaleDateString('ru-RU')}
                    </span>
                    <span className="training-title">
                      {t.type === 'tournament' ? 'Турнир секции' : 'Групповая тренировка'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
