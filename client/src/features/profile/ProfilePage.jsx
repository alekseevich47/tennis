import React, { useEffect, useMemo, useState } from 'react';
import Avatar from '../../components/ui/Avatar';
import IconButton from '../../components/ui/IconButton';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { usePlayers } from '../../hooks/usePlayers';
import { useTrainings } from '../../hooks/useTrainings';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { isModerator, updateUserProfile } from '../../services/auth';
import pb from '../../services/pb';
import { error } from '../../lib/log';
import MembershipModal from './MembershipModal';
import './Profile.css';

const DEFAULT_HAND = 'Правая';

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU');
}

function normalizeDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

/**
 * @param {{ user: any, onUpdate?: (user: any) => void, onTabChange?: (tabIndex: number) => void }} props
 */
function ProfilePage({ user, onUpdate, onTabChange }) {
  const { alert } = useAlertDialog();
  const { data: players } = usePlayers();
  const { data: trainings, isLoading: trainingsLoading } = useTrainings();
  const canEditSectionStartDate = isModerator();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [birthDate, setBirthDate] = useState(normalizeDateInput(user?.birth_date));
  const [dominantHand, setDominantHand] = useState(user?.dominant_hand || DEFAULT_HAND);
  const [sectionStartDate, setSectionStartDate] = useState(normalizeDateInput(user?.section_start_date));
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name || '');
    setBirthDate(normalizeDateInput(user?.birth_date));
    setDominantHand(user?.dominant_hand || DEFAULT_HAND);
    setSectionStartDate(normalizeDateInput(user?.section_start_date));
    setAvatarFile(null);
  }, [user?.id, user?.full_name, user?.birth_date, user?.dominant_hand, user?.section_start_date]);

  // Профильный список — производное от SWR-данных (H4).
  const myTrainings = useMemo(() => {
    if (!trainings || !user?.id) return [];
    return trainings.filter((t) => t.booked_users && t.booked_users.includes(user.id));
  }, [trainings, user?.id]);

  const ratingPosition = players && user?.id
    ? players.findIndex((p) => p.id === user.id) + 1
    : null;

  const handleMembershipMutated = async () => {
    if (!user?.id) return;

    try {
      const updated = await pb.collection('users').getOne(user.id);
      onUpdate?.(updated);
    } catch (err) {
      error('refresh membership user:', err);
    }
  };

  const resetEditForm = () => {
    setFullName(user?.full_name || '');
    setBirthDate(normalizeDateInput(user?.birth_date));
    setDominantHand(user?.dominant_hand || DEFAULT_HAND);
    setSectionStartDate(normalizeDateInput(user?.section_start_date));
    setAvatarFile(null);
  };

  const handleEditToggle = () => {
    if (isEditing) resetEditForm();
    setIsEditing((prev) => !prev);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || saving) return;
    const nextProfile = {
      full_name: fullName,
      birth_date: birthDate || null,
      dominant_hand: dominantHand
    };
    let patch = {};

    if (nextProfile.full_name !== (user.full_name || '')) {
      patch.full_name = nextProfile.full_name;
    }

    if (birthDate !== normalizeDateInput(user.birth_date)) {
      patch.birth_date = nextProfile.birth_date;
    }

    if (nextProfile.dominant_hand !== (user.dominant_hand || DEFAULT_HAND)) {
      patch.dominant_hand = nextProfile.dominant_hand;
    }

    if (canEditSectionStartDate && sectionStartDate !== normalizeDateInput(user.section_start_date)) {
      patch.section_start_date = sectionStartDate || null;
    }

    if (Object.keys(patch).length === 0 && !avatarFile) {
      setIsEditing(false);
      return;
    }

    if (avatarFile) {
      const fd = new FormData();
      Object.entries(patch).forEach(([key, value]) => {
        fd.append(key, value == null ? '' : value);
      });
      fd.append('avatar', avatarFile);
      patch = fd;
    }

    setSaving(true);
    try {
      const updated = await updateUserProfile(user.id, patch);
      setIsEditing(false);
      setAvatarFile(null);
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
      {!isEditing && (
        <IconButton
          ariaLabel="Открыть абонемент"
          variant="ghost"
          size="md"
          className="membership-btn"
          onClick={() => setMembershipOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" aria-hidden="true">
            <path d="M4 8h16v8H4z" />
            <path d="M4 8a2 2 0 100-4v4z" />
            <path d="M20 8a2 2 0 110-4v4z" />
            <path d="M4 16a2 2 0 100 4v-4z" />
            <path d="M20 16a2 2 0 110 4v-4z" />
          </svg>
        </IconButton>
      )}

      <IconButton
        ariaLabel={isEditing ? 'Отменить редактирование профиля' : 'Редактировать профиль'}
        variant="ghost"
        size="md"
        className="edit-profile-btn"
        onClick={handleEditToggle}
      >
        {isEditing ? (
          <span aria-hidden="true">✕</span>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M4 20h4.2L19.3 8.9a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
            <path d="m13.7 6.1 4.2 4.2" />
          </svg>
        )}
      </IconButton>

      {isEditing ? (
        <form onSubmit={handleSave} className="profile-edit-form">
          <div className="avatar-wrapper-large">
            <Avatar user={user} size="lg" alt="Большой аватар" />
          </div>

          <div className="form-group">
            <label htmlFor="profile-avatar">Фотография</label>
            <input
              id="profile-avatar"
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            />
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
            <label htmlFor="profile-birth-date">Дата рождения</label>
            <input
              id="profile-birth-date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
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

          {canEditSectionStartDate && (
            <div className="form-group">
              <label htmlFor="profile-section-start-date">В секции с</label>
              <input
                id="profile-section-start-date"
                type="date"
                value={sectionStartDate}
                onChange={(e) => setSectionStartDate(e.target.value)}
              />
            </div>
          )}

          <button type="submit" className="save-profile-btn" disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </form>
      ) : (
        <div className="profile-view">
          <div className="avatar-wrapper-large">
            <Avatar user={user} size="lg" alt="Большой аватар" />
          </div>

          <h2 className="profile-user-name">
            {user.full_name}
            <span
              className="profile-rating-badge"
              onClick={() => onTabChange?.(3)}
              role="button"
              tabIndex={0}
            >
              #{ratingPosition || '—'}
            </span>
          </h2>

          <div className="profile-meta-info">
            <p><strong>Дата рождения:</strong> {formatDate(user.birth_date) || 'Не указана'}</p>
            <p><strong>В секции с:</strong> {formatDate(user.section_start_date || user.created) || 'Не указана'}</p>
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
            <h3>Посещенные тренировки ({myTrainings.length})</h3>
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

      <MembershipModal
        isOpen={membershipOpen}
        onClose={() => setMembershipOpen(false)}
        user={user}
        onMutated={handleMembershipMutated}
      />
    </div>
  );
}

export default ProfilePage;
