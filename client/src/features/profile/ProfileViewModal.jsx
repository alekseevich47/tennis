import React, { useEffect, useMemo, useRef, useState } from 'react';
import AchievementsBlock from '../../components/AchievementsBlock';
import FloatingAchievements from '../../components/FloatingAchievements';
import AvatarCropModal from '../../components/AvatarCropModal';
import Avatar from '../../components/ui/Avatar';
import IconButton from '../../components/ui/IconButton';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { usePlayers } from '../../hooks/usePlayers';
import { listTrainings } from '../../services/trainings';
import { updateUserProfile } from '../../services/auth';
import pb from '../../services/pb';
import { error } from '../../lib/log';
import { compressImage } from '../../lib/compress';
import MembershipModal from './MembershipModal';
import './Profile.css';

const DEFAULT_HAND = 'Правая';

function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ru-RU');
}

function normalizeDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function getTrainingTitle(training) {
  return training.type === 'tournament' ? 'Турнир секции' : 'Тренировка';
}

function isModerator(user) {
  return user?.role === 'moderator' || user?.email === 'admin@example.com';
}

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose?: () => void,
 *   targetUser?: any,
 *   currentUser?: any,
 *   onTabChange?: (tabIndex: number) => void,
 *   onMutated?: (user: any) => void
 * }} props
 */
function ProfileViewModal({ isOpen, onClose, targetUser, currentUser, onTabChange, onMutated }) {
  const { alert } = useAlertDialog();
  const { data: players } = usePlayers();
  const avatarInputRef = useRef(null);
  const [trainings, setTrainings] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [displayUser, setDisplayUser] = useState(targetUser || null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(targetUser?.full_name || '');
  const [birthDate, setBirthDate] = useState(normalizeDateInput(targetUser?.birth_date));
  const [dominantHand, setDominantHand] = useState(targetUser?.dominant_hand || DEFAULT_HAND);
  const [sectionStartDate, setSectionStartDate] = useState(
    normalizeDateInput(targetUser?.section_start_date)
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trainingsExpanded, setTrainingsExpanded] = useState(false);

  const targetUserId = targetUser?.id;
  const currentUserId = currentUser?.id;
  const isOwnProfile = Boolean(targetUserId && targetUserId === currentUserId);
  const canEditSectionStartDate = isModerator(currentUser);
  const canManageProfile = Boolean(isOwnProfile || canEditSectionStartDate);
  const displayName = displayUser?.full_name || displayUser?.name || 'Профиль';

  const ratingPosition = useMemo(() => {
    if (!players || !targetUserId) return null;
    const position = players.findIndex((player) => player.id === targetUserId);
    return position >= 0 ? position + 1 : null;
  }, [players, targetUserId]);

  useEffect(() => {
    const nextUser = targetUser || null;
    setDisplayUser(nextUser);
    setIsEditing(false);
    setAvatarFile(null);
    setPendingAvatarFile(null);
    setCropModalOpen(false);
    setFullName(nextUser?.full_name || '');
    setBirthDate(normalizeDateInput(nextUser?.birth_date));
    setDominantHand(nextUser?.dominant_hand || DEFAULT_HAND);
    setSectionStartDate(normalizeDateInput(nextUser?.section_start_date));
  }, [targetUser]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return undefined;
    }

    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  useEffect(() => {
    if (!isOpen) {
      setMembershipOpen(false);
      setIsEditing(false);
      setAvatarFile(null);
      setPendingAvatarFile(null);
      setCropModalOpen(false);
      return undefined;
    }

    if (!targetUserId) {
      setTrainings([]);
      return undefined;
    }

    const controller = new AbortController();

    pb.collection('users')
      .getOne(targetUserId, { signal: controller.signal })
      .then((fresh) => {
        if (controller.signal.aborted) return;
        setDisplayUser(fresh);
        setFullName(fresh.full_name || '');
        setBirthDate(normalizeDateInput(fresh.birth_date));
        setDominantHand(fresh.dominant_hand || DEFAULT_HAND);
        setSectionStartDate(normalizeDateInput(fresh.section_start_date));
      })
      .catch((err) => {
        if (err && err.name === 'AbortError') return;
        error('load profile view user:', err);
      });

    setLoadingDetails(true);

    listTrainings({ signal: controller.signal })
      .then((trainingRecords) => {
        if (controller.signal.aborted) return;
        setTrainings(trainingRecords);
      })
      .catch((err) => {
        if (err && err.name === 'AbortError') return;
        error('load profile view details:', err);
        setTrainings([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDetails(false);
      });

    return () => controller.abort();
  }, [isOpen, targetUserId]);

  const userTrainings = useMemo(() => {
    if (!targetUserId) return [];
    return trainings.filter((training) => {
      const attendedUsers = training.attended_users || [];
      return attendedUsers.includes(targetUserId);
    });
  }, [targetUserId, trainings]);

  const handleRatingClick = () => {
    onTabChange?.(3);
  };

  const handleRatingKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRatingClick();
    }
  };

  const handleMembershipMutated = async (updated) => {
    if (!targetUserId) return;

    if (updated) {
      setDisplayUser(updated);
      onMutated?.(updated);
      return;
    }

    try {
      const fresh = await pb.collection('users').getOne(targetUserId);
      setDisplayUser(fresh);
      onMutated?.(fresh);
    } catch (err) {
      error('refresh profile view membership:', err);
    }
  };

  const resetEditForm = () => {
    setFullName(displayUser?.full_name || '');
    setBirthDate(normalizeDateInput(displayUser?.birth_date));
    setDominantHand(displayUser?.dominant_hand || DEFAULT_HAND);
    setSectionStartDate(normalizeDateInput(displayUser?.section_start_date));
    setAvatarFile(null);
    setPendingAvatarFile(null);
    setCropModalOpen(false);
  };

  const handleEditToggle = () => {
    if (!canManageProfile || saving) return;
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
      error('compress cropped profile view avatar:', err);
    }

    setAvatarFile(nextAvatarFile);
    setPendingAvatarFile(null);
    setCropModalOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!displayUser?.id || saving) return;

    const nextProfile = {
      full_name: fullName,
      birth_date: birthDate || null,
      dominant_hand: dominantHand
    };
    let patch = {};

    if (nextProfile.full_name !== (displayUser.full_name || '')) {
      patch.full_name = nextProfile.full_name;
    }

    if (birthDate !== normalizeDateInput(displayUser.birth_date)) {
      patch.birth_date = nextProfile.birth_date;
    }

    if (nextProfile.dominant_hand !== (displayUser.dominant_hand || DEFAULT_HAND)) {
      patch.dominant_hand = nextProfile.dominant_hand;
    }

    if (
      canEditSectionStartDate &&
      sectionStartDate !== normalizeDateInput(displayUser.section_start_date)
    ) {
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
      const updated = await updateUserProfile(displayUser.id, patch);
      setDisplayUser(updated);
      setIsEditing(false);
      setAvatarFile(null);
      onMutated?.(updated);
    } catch (err) {
      error('save profile view:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось сохранить изменения.' });
    } finally {
      setSaving(false);
    }
  };

  if (!targetUser) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isOwnProfile ? 'Мой профиль' : displayName}
        size="large"
      >
        <div className="profile-container">
          <div className="profile-view-actions">
            {!isEditing && canManageProfile && (
              <IconButton
                ariaLabel="Открыть абонемент"
                variant="ghost"
                size="md"
                className="membership-btn profile-view-membership-btn"
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

            {canManageProfile && (
              <IconButton
                ariaLabel={isEditing ? 'Отменить редактирование профиля' : 'Редактировать профиль'}
                variant="ghost"
                size="md"
                className="edit-profile-btn profile-view-edit-btn"
                onClick={handleEditToggle}
                disabled={saving}
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
            )}
          </div>

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
                  <Avatar user={displayUser} size="lg" alt="Большой аватар" />
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
                <label htmlFor="profile-view-name">Имя фамилия</label>
                <input
                  id="profile-view-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-view-birth-date">Дата рождения</label>
                <input
                  id="profile-view-birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-view-hand">Ведущая рука</label>
                <select
                  id="profile-view-hand"
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
                  <label htmlFor="profile-view-section-start-date">В секции с</label>
                  <input
                    id="profile-view-section-start-date"
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
              <div className="profile-view-hero">
                <FloatingAchievements userId={targetUserId} />

                <div className="avatar-wrapper-large">
                  <Avatar user={displayUser} size="lg" alt="Большой аватар" />
                </div>

                <h2 className="profile-user-name">
                  {displayName}
                  <span
                    className="profile-rating-badge"
                    onClick={handleRatingClick}
                    onKeyDown={handleRatingKeyDown}
                    role="button"
                    tabIndex={0}
                  >
                    #{ratingPosition || '—'}
                  </span>
                </h2>

                <div className="profile-meta-info">
                  <p><strong>Дата рождения:</strong> {formatDate(displayUser?.birth_date) || 'Не указана'}</p>
                  <p><strong>Рука:</strong> {displayUser?.dominant_hand || displayUser?.hand || 'Не указана'}</p>
                  <p><strong>В секции с:</strong> {formatDate(displayUser?.section_start_date || displayUser?.created) || 'Не указана'}</p>
                </div>
              </div>

              <div className="profile-stats-block">
                <h3>Статистика игр</h3>
                <div className="stats-counter">
                  {displayUser?.games_count || 0} / {displayUser?.wins || 0} / {displayUser?.losses || 0}
                </div>
                <div className="stats-labels">
                  <span>Игры</span>
                  <span>Победы</span>
                  <span>Поражения</span>
                </div>
              </div>

              <AchievementsBlock userId={targetUserId} />

              <div className="profile-trainings-block">
                <button
                  type="button"
                  className="profile-trainings-toggle"
                  onClick={() => setTrainingsExpanded((v) => !v)}
                  aria-expanded={trainingsExpanded}
                >
                  <h3>Посещенные тренировки ({userTrainings.length})</h3>
                  <span className="profile-trainings-arrow" aria-hidden="true">
                    {trainingsExpanded ? '▲' : '▼'}
                  </span>
                </button>
                {trainingsExpanded && (
                  loadingDetails ? (
                    <Spinner label="Загрузка тренировок..." inline />
                  ) : userTrainings.length > 0 ? (
                    <div className="profile-trainings-list">
                      {userTrainings.map((training) => (
                        <div key={training.id} className="profile-training-card">
                          <span className="training-date">
                            {formatDate(training.date) || 'Дата не указана'}
                          </span>
                          <span className="training-title">{getTrainingTitle(training)}</span>
                        </div>
                      ))}
                    </div>
                  ) : isOwnProfile ? (
                    <p className="no-data-text">Вы ещё не посещали тренировки</p>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <MembershipModal
        isOpen={membershipOpen}
        onClose={() => setMembershipOpen(false)}
        user={displayUser}
        onMutated={handleMembershipMutated}
      />

      <AvatarCropModal
        isOpen={cropModalOpen}
        file={pendingAvatarFile}
        onConfirm={handleAvatarCropConfirm}
        onCancel={handleAvatarCropCancel}
      />
    </>
  );
}

export default ProfileViewModal;
