import React, { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import AchievementsBlock from '../../components/AchievementsBlock';
import FloatingAchievements from '../../components/FloatingAchievements';
import AvatarCropModal from '../../components/AvatarCropModal';
import Avatar from '../../components/ui/Avatar';
import IconButton from '../../components/ui/IconButton';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { usePlayers } from '../../hooks/usePlayers';
import { useTrainings } from '../../hooks/useTrainings';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { isModerator, updateUserProfile } from '../../services/auth';
import { listCancelledTrainingsForUser } from '../../services/trainings';
import pb from '../../services/pb';
import { error } from '../../lib/log';
import { getPlayerRatingRank } from '../../lib/rating';
import { compressImage } from '../../lib/compress';
import { formatCardDateWithYear, formatTimeRange, hasTimeRangeEnded } from '../../lib/format';
import MembershipModal from './MembershipModal';
import ProfileSingleDateField from './ProfileSingleDateField';
import ProfileTrainingsSearch, { filterProfileTrainings } from './ProfileTrainingsSearch';
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

function getTrainingTitle(training) {
  return training.type === 'tournament' ? 'Турнир секции' : 'Тренировка';
}

function getTrainingStatusForUser(training, userId) {
  const kicked = training.moderator_kicked_users || [];
  if (kicked.includes(userId)) return 'kicked';
  if (!hasTimeRangeEnded(training.date, training.duration || 0)) return 'booked';
  return (training.attended_users || []).includes(userId) ? 'attended' : 'missed';
}

function getUserPastTrainings(trainings, userId) {
  if (!userId) return [];
  return trainings
    .filter((training) => {
      if (training.is_deleted === true) return false;
      const ended = hasTimeRangeEnded(training.date, training.duration || 0);
      const booked = training.booked_users || [];
      const unbooked = training.unbooked_users || [];
      const kicked = training.moderator_kicked_users || [];
      if (ended) {
        return booked.includes(userId) || unbooked.includes(userId) || kicked.includes(userId);
      }
      return booked.includes(userId) || kicked.includes(userId);
    })
    .map((training) => ({
      ...training,
      status: getTrainingStatusForUser(training, userId)
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const TRAINING_BADGE = {
  cancelled: { className: 'training-attendance-badge--cancelled', label: 'Отмена' },
  kicked: { className: 'training-attendance-badge--kicked', label: 'Снят модератором' },
  booked: { className: 'training-attendance-badge--booked', label: 'Записан' },
  attended: { className: 'training-attendance-badge--attended', label: 'Посетил' },
  missed: { className: 'training-attendance-badge--missed', label: 'Не посетил' }
};

/**
 * @param {{ user: any, onUpdate?: (user: any) => void, onTabChange?: (tabIndex: number) => void }} props
 */
function ProfilePage({
  user,
  onUpdate,
  onTabChange,
  openMembershipFromNotification = false,
  onMembershipOpened
}) {
  const { alert } = useAlertDialog();
  const { data: players } = usePlayers();
  const { data: trainings, isLoading: trainingsLoading } = useTrainings();
  const { data: cancelledTrainings, isLoading: cancelledLoading } = useSWR(
    user?.id ? ['cancelled-trainings', user.id] : null,
    () => listCancelledTrainingsForUser(user.id)
  );
  const canEditSectionStartDate = isModerator();
  const avatarInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [birthDate, setBirthDate] = useState(normalizeDateInput(user?.birth_date));
  const [dominantHand, setDominantHand] = useState(user?.dominant_hand || DEFAULT_HAND);
  const [sectionStartDate, setSectionStartDate] = useState(normalizeDateInput(user?.section_start_date));
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [trainingsExpanded, setTrainingsExpanded] = useState(false);
  const [searchDate, setSearchDate] = useState('');
  const [trainingsDateRange, setTrainingsDateRange] = useState(null);

  useEffect(() => {
    if (!openMembershipFromNotification) return;
    setMembershipOpen(true);
    onMembershipOpened?.();
  }, [openMembershipFromNotification, onMembershipOpened]);

  useEffect(() => {
    setFullName(user?.full_name || '');
    setBirthDate(normalizeDateInput(user?.birth_date));
    setDominantHand(user?.dominant_hand || DEFAULT_HAND);
    setSectionStartDate(normalizeDateInput(user?.section_start_date));
    setAvatarFile(null);
    setPendingAvatarFile(null);
    setCropModalOpen(false);
  }, [user?.id, user?.full_name, user?.birth_date, user?.dominant_hand, user?.section_start_date]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;

    pb.collection('users')
      .getOne(user.id)
      .then((fresh) => {
        if (!cancelled) onUpdate?.(fresh);
      })
      .catch((err) => {
        error('refresh profile user:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, onUpdate]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return undefined;
    }

    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  // Профильный список — производное от SWR-данных (H4).
  const myTrainings = useMemo(() => {
    if (!user?.id) return [];
    const past = getUserPastTrainings(trainings || [], user.id);
    const cancelled = (cancelledTrainings || []).map((t) => ({
      ...t,
      status: 'cancelled'
    }));
    return [...past, ...cancelled].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [trainings, cancelledTrainings, user?.id]);

  const filteredTrainings = useMemo(
    () => filterProfileTrainings(myTrainings, { searchDate, dateRange: trainingsDateRange }),
    [myTrainings, searchDate, trainingsDateRange]
  );

  const ratingPosition = useMemo(
    () => getPlayerRatingRank(players, user?.id),
    [players, user?.id]
  );

  const handleMembershipMutated = async (updated) => {
    if (!user?.id) return;

    if (updated) {
      onUpdate?.(updated);
      return;
    }

    try {
      const fresh = await pb.collection('users').getOne(user.id);
      onUpdate?.(fresh);
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
    setPendingAvatarFile(null);
    setCropModalOpen(false);
  };

  const handleEditToggle = () => {
    if (isEditing) resetEditForm();
    setIsEditing((prev) => !prev);
  };

  const handleAvatarInputChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!file) return;

    setPendingAvatarFile(file);
    setCropModalOpen(true);
  };

  const handleAvatarCropCancel = () => {
    setPendingAvatarFile(null);
    setCropModalOpen(false);
  };

  const handleAvatarCropConfirm = async (croppedBlob) => {
    const croppedFile = new File([croppedBlob], 'avatar.png', { type: 'image/png' });
    let nextAvatarFile = croppedFile;

    try {
      nextAvatarFile = await compressImage(croppedFile);
    } catch (err) {
      error('compress cropped avatar:', err);
    }

    setAvatarFile(nextAvatarFile);
    setPendingAvatarFile(null);
    setCropModalOpen(false);
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

    if (
      canEditSectionStartDate &&
      nextProfile.full_name !== (user.full_name || '')
    ) {
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
      fd.append('avatar_url', '');
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
          <svg viewBox="0 0 24 24" fill="#007aff" aria-hidden="true">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" />
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
            {avatarPreview ? (
              <div className="ui-avatar ui-avatar--lg">
                <img
                  src={avatarPreview}
                  alt="Предпросмотр выбранного аватара"
                  className="ui-avatar-img"
                />
              </div>
            ) : (
              <Avatar user={user} size="lg" alt="Большой аватар" />
            )}
          </div>

          <div className="form-group">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarInputChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="avatar-pick-btn"
              onClick={() => avatarInputRef.current?.click()}
            >
              Изменить фото
            </button>
            {avatarFile ? <span className="avatar-pick-name">{avatarFile.name}</span> : null}
          </div>

          <div className="form-group">
            <label htmlFor="profile-name">Имя фамилия</label>
            <input
              id="profile-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!canEditSectionStartDate}
              required
            />
          </div>

          <ProfileSingleDateField
            id="profile-birth-date"
            label="Дата рождения"
            value={birthDate}
            onChange={setBirthDate}
          />

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

          {canEditSectionStartDate ? (
            <ProfileSingleDateField
              id="profile-section-start-date"
              label="В секции с"
              value={sectionStartDate}
              onChange={setSectionStartDate}
            />
          ) : null}

          <button type="submit" className="save-profile-btn" disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </form>
      ) : (
        <div className="profile-view">
          <div className="profile-view-hero">
            <FloatingAchievements userId={user.id} />

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
          </div>

          <AchievementsBlock userId={user.id} collapsible />

          <div className="profile-trainings-block">
            <button
              type="button"
              className="profile-trainings-toggle"
              onClick={() => setTrainingsExpanded((v) => !v)}
              aria-expanded={trainingsExpanded}
            >
              <h3>Посещенные тренировки ({myTrainings.length})</h3>
              <span className="profile-trainings-arrow" aria-hidden="true">
                {trainingsExpanded ? '▲' : '▼'}
              </span>
            </button>
            {trainingsExpanded && (
              trainingsLoading || cancelledLoading ? (
                <Spinner label="Загрузка тренировок..." inline />
              ) : myTrainings.length === 0 ? (
                <p className="no-data-text">Вы ещё не посещали тренировки</p>
              ) : (
                <>
                  <ProfileTrainingsSearch
                    searchDate={searchDate}
                    onSearchDateChange={setSearchDate}
                    dateRange={trainingsDateRange}
                    onDateRangeChange={setTrainingsDateRange}
                  />
                  {filteredTrainings.length === 0 ? (
                    <p className="no-data-text">Ничего не найдено</p>
                  ) : (
                <div className="profile-trainings-list">
                  {filteredTrainings.map((t) => {
                    const badge = TRAINING_BADGE[t.status] || TRAINING_BADGE.missed;
                    return (
                      <div key={t.id} className="profile-training-card">
                        <div className="profile-training-card__info">
                          <span className="training-date">{formatCardDateWithYear(t.date)}</span>
                          <span className="training-time">
                            {formatTimeRange(t.date, t.duration || 0)}
                          </span>
                          <span className="training-title">{getTrainingTitle(t)}</span>
                        </div>
                        <span className={`training-attendance-badge ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                  )}
                </>
              )
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

      <AvatarCropModal
        isOpen={cropModalOpen}
        file={pendingAvatarFile}
        onConfirm={handleAvatarCropConfirm}
        onCancel={handleAvatarCropCancel}
      />
    </div>
  );
}

export default ProfilePage;
