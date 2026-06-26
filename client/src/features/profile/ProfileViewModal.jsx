import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
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
import {
  banUser,
  hideFromRating,
  restrictComments,
  showInRating,
  unbanUser,
  unrestrictComments,
  updateUserProfile
} from '../../services/auth';
import pb from '../../services/pb';
import { error } from '../../lib/log';
import { getPlayerRatingRank } from '../../lib/rating';
import { compressImage } from '../../lib/compress';
import { formatCardDate, formatTimeRange, hasTimeRangeEnded } from '../../lib/format';
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

function getUserPastTrainings(trainings, userId) {
  if (!userId) return [];
  return trainings
    .filter((training) => {
      if (!hasTimeRangeEnded(training.date, training.duration || 0)) return false;
      const booked = training.booked_users || [];
      const unbooked = training.unbooked_users || [];
      return booked.includes(userId) || unbooked.includes(userId);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
  const menuBtnRef = useRef(null);
  const menuDropdownRef = useRef(null);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [banReasonDialogOpen, setBanReasonDialogOpen] = useState(false);
  const [restrictReasonDialogOpen, setRestrictReasonDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [restrictReason, setRestrictReason] = useState('');

  const targetUserId = targetUser?.id;
  const currentUserId = currentUser?.id;
  const isOwnProfile = Boolean(targetUserId && targetUserId === currentUserId);
  const canEditSectionStartDate = isModerator(currentUser);
  const canManageProfile = Boolean(isOwnProfile || canEditSectionStartDate);
  const displayName = displayUser?.full_name || displayUser?.name || 'Профиль';

  const ratingPosition = useMemo(
    () => getPlayerRatingRank(players, targetUserId),
    [players, targetUserId]
  );

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
      setMenuOpen(false);
      setMenuMounted(false);
      setMenuVisible(false);
      setBanReasonDialogOpen(false);
      setRestrictReasonDialogOpen(false);
      setBanReason('');
      setRestrictReason('');
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

  const userTrainings = useMemo(
    () => getUserPastTrainings(trainings, targetUserId),
    [targetUserId, trainings]
  );

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      setMenuMounted(true);
      const frame = requestAnimationFrame(() => setMenuVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setMenuVisible(false);
    return undefined;
  }, [menuOpen]);

  const handleMenuTransitionEnd = useCallback((event) => {
    if (event.target !== menuDropdownRef.current) return;
    if (event.propertyName !== 'opacity') return;
    if (menuOpen) return;
    setMenuMounted(false);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuDropdownRef.current?.contains(target)) return;
      if (menuBtnRef.current?.contains(target)) return;
      closeMenu();
    };

    const handleScroll = () => {
      closeMenu();
    };

    const modalBody = menuBtnRef.current?.closest('.ui-modal-overlay')?.querySelector('.ui-modal-body');

    document.addEventListener('pointerdown', handlePointerDown);
    modalBody?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      modalBody?.removeEventListener('scroll', handleScroll);
    };
  }, [menuOpen, closeMenu]);

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

    if (
      canEditSectionStartDate &&
      nextProfile.full_name !== (displayUser.full_name || '')
    ) {
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

  const applyProfileMutation = (updated) => {
    setDisplayUser(updated);
    onMutated?.(updated);
  };

  const handleHideFromRating = async () => {
    try {
      const updated = await hideFromRating(targetUserId);
      applyProfileMutation(updated);
      setMenuOpen(false);
    } catch (err) {
      error('hide from rating:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось скрыть пользователя из рейтинга.' });
    }
  };

  const handleShowInRating = async () => {
    try {
      const updated = await showInRating(targetUserId);
      applyProfileMutation(updated);
      setMenuOpen(false);
    } catch (err) {
      error('show in rating:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось вернуть пользователя в рейтинг.' });
    }
  };

  const handleUnrestrictComments = async () => {
    try {
      const updated = await unrestrictComments(targetUserId);
      applyProfileMutation(updated);
      setMenuOpen(false);
    } catch (err) {
      error('unrestrict comments:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось снять ограничение комментариев.' });
    }
  };

  const handleUnban = async () => {
    try {
      const updated = await unbanUser(targetUserId);
      applyProfileMutation(updated);
      setMenuOpen(false);
    } catch (err) {
      error('unban user:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось разблокировать пользователя.' });
    }
  };

  const handleBanConfirm = async () => {
    try {
      const updated = await banUser(targetUserId, banReason);
      applyProfileMutation(updated);
      setBanReasonDialogOpen(false);
      setBanReason('');
      setMenuOpen(false);
    } catch (err) {
      error('ban user:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось заблокировать пользователя.' });
    }
  };

  const handleRestrictConfirm = async () => {
    try {
      const updated = await restrictComments(targetUserId, restrictReason);
      applyProfileMutation(updated);
      setRestrictReasonDialogOpen(false);
      setRestrictReason('');
      setMenuOpen(false);
    } catch (err) {
      error('restrict comments:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось ограничить комментарии.' });
    }
  };

  if (!targetUser) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        showCloseButton={false}
        ariaLabel={isOwnProfile ? 'Мой профиль' : 'Профиль'}
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

            {canManageProfile && !isEditing && !isOwnProfile && (
              <>
                <IconButton
                  ref={menuBtnRef}
                  ariaLabel="Действия модератора"
                  ariaExpanded={menuOpen}
                  variant="ghost"
                  size="md"
                  className="profile-menu-btn"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </IconButton>

                {menuMounted && (
                  <div
                    ref={menuDropdownRef}
                    className={clsx(
                      'profile-menu-dropdown',
                      menuVisible && 'profile-menu-dropdown--visible'
                    )}
                    role="menu"
                    aria-hidden={!menuOpen}
                    onTransitionEnd={handleMenuTransitionEnd}
                  >
                    <button
                      type="button"
                      className="profile-menu-item"
                      role="menuitem"
                      onClick={
                        displayUser?.is_visible === false
                          ? handleShowInRating
                          : handleHideFromRating
                      }
                    >
                      {displayUser?.is_visible === false
                        ? 'Показать в рейтинге'
                        : 'Скрыть из рейтинга'}
                    </button>

                    <button
                      type="button"
                      className="profile-menu-item"
                      role="menuitem"
                      onClick={
                        displayUser?.can_comment === false
                          ? handleUnrestrictComments
                          : () => {
                              setMenuOpen(false);
                              setRestrictReasonDialogOpen(true);
                            }
                      }
                    >
                      {displayUser?.can_comment === false
                        ? 'Разрешить комментарии'
                        : 'Ограничить комментарии'}
                    </button>

                    <button
                      type="button"
                      className={`profile-menu-item ${
                        displayUser?.is_banned === true
                          ? 'profile-menu-item--success'
                          : 'profile-menu-item--danger'
                      }`}
                      role="menuitem"
                      onClick={
                        displayUser?.is_banned === true
                          ? handleUnban
                          : () => {
                              setMenuOpen(false);
                              setBanReasonDialogOpen(true);
                            }
                      }
                    >
                      {displayUser?.is_banned === true ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                  </div>
                )}
              </>
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

            <IconButton
              ariaLabel="Закрыть"
              variant="ghost"
              size="md"
              className="profile-view-close-btn"
              onClick={onClose}
            >
              <span aria-hidden="true">✕</span>
            </IconButton>
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
                  disabled={!canEditSectionStartDate}
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

              <AchievementsBlock userId={targetUserId} collapsible />

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
                      {userTrainings.map((training) => {
                        const attended = (training.attended_users || []).includes(targetUserId);
                        return (
                          <div key={training.id} className="profile-training-card">
                            <div className="profile-training-card__info">
                              <span className="training-date">{formatCardDate(training.date)}</span>
                              <span className="training-time">
                                {formatTimeRange(training.date, training.duration || 0)}
                              </span>
                              <span className="training-title">{getTrainingTitle(training)}</span>
                            </div>
                            <span
                              className={clsx(
                                'training-attendance-badge',
                                attended
                                  ? 'training-attendance-badge--attended'
                                  : 'training-attendance-badge--missed'
                              )}
                            >
                              {attended ? 'Посетил' : 'Не посетил'}
                            </span>
                          </div>
                        );
                      })}
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

      <Modal
        isOpen={banReasonDialogOpen}
        onClose={() => {
          setBanReasonDialogOpen(false);
          setBanReason('');
        }}
        title="Причина блокировки"
        footer={
          <div className="profile-reason-dialog-footer">
            <button
              type="button"
              className="profile-reason-dialog-btn profile-reason-dialog-btn--secondary"
              onClick={() => {
                setBanReasonDialogOpen(false);
                setBanReason('');
              }}
            >
              Отменить
            </button>
            <button
              type="button"
              className="profile-reason-dialog-btn profile-reason-dialog-btn--primary"
              onClick={handleBanConfirm}
            >
              Подтвердить
            </button>
          </div>
        }
      >
        <textarea
          className="profile-reason-textarea"
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
          placeholder="Укажите причину блокировки"
          rows={4}
          maxLength={500}
        />
      </Modal>

      <Modal
        isOpen={restrictReasonDialogOpen}
        onClose={() => {
          setRestrictReasonDialogOpen(false);
          setRestrictReason('');
        }}
        title="Причина ограничения"
        footer={
          <div className="profile-reason-dialog-footer">
            <button
              type="button"
              className="profile-reason-dialog-btn profile-reason-dialog-btn--secondary"
              onClick={() => {
                setRestrictReasonDialogOpen(false);
                setRestrictReason('');
              }}
            >
              Отменить
            </button>
            <button
              type="button"
              className="profile-reason-dialog-btn profile-reason-dialog-btn--primary"
              onClick={handleRestrictConfirm}
            >
              Подтвердить
            </button>
          </div>
        }
      >
        <textarea
          className="profile-reason-textarea"
          value={restrictReason}
          onChange={(e) => setRestrictReason(e.target.value)}
          placeholder="Укажите причину ограничения комментариев"
          rows={4}
          maxLength={500}
        />
      </Modal>
    </>
  );
}

export default ProfileViewModal;
