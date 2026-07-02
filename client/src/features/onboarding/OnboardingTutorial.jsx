import React, { useCallback, useEffect, useRef, useState } from 'react';
import AvatarCropModal from '../../components/AvatarCropModal';
import Avatar from '../../components/ui/Avatar';
import { useOnboarding } from '../../hooks/useOnboarding';
import { updateUserProfile } from '../../services/auth';
import { compressImage } from '../../lib/compress';
import { error } from '../../lib/log';
import './OnboardingTutorial.css';

const DEFAULT_HAND = 'Правая';
const HIGHLIGHT_PADDING = 8;
const SPOTLIGHT_DELAY_MS = 280;
const SCROLL_LOCK_CLASS = 'onboarding-scroll-locked';

const SPOTLIGHT_STEPS = {
  2: {
    tab: 5,
    selector: '.membership-btn',
    text: 'Кнопка "Абонемент" — здесь ваш тип абонемента, количество оставшихся занятий и период действия.'
  },
  3: {
    tab: 0,
    selector: '.feed-card',
    text: 'Лента — мы очень рады делиться с Вами нашими новостями! Ставьте лайки ♥ и пишите комментарии 💬.',
    placement: 'top'
  },
  4: {
    tab: 1,
    selector: '.calendar-strip',
    text: 'Выберите день в полосе, откройте тренировку и нажмите "Записаться". Снять запись возможно — не позднее чем за 1 час до начала.'
  },
  5: {
    tab: 2,
    selector: '.product-card',
    text: 'Магазин секции: открывайте карточку товара и добавляйте в избранное ♥. Если хотите узнать о товаре — нажимайте на кнопку "Купить"',
    placement: 'top'
  },
  6: {
    tab: 3,
    selector: '.tournament-post-card',
    text: 'Здесь — результаты соревнований. Комментируйте публикации 💬 и ставьте лайки.',
    placement: 'top'
  },
  7: {
    tab: 4,
    selector: '.gallery-grid, .gallery-grid-item',
    text: 'Галерея: фото и видео секции. Ставьте лайки ♥ на медиа.',
    placement: 'top',
    scrollBlock: 'start'
  }
};

const CARD_STEPS = new Set([0, 1, 8]);
const NAV_STEPS = new Set([2, 3, 4, 5, 6, 7]);
const TOTAL_STEPS = 9;

function scrollTargetIntoView(target, scrollBlock = 'center') {
  const margin = scrollBlock === 'start' ? 12 : null;
  let node = target.parentElement;

  while (node) {
    const style = window.getComputedStyle(node);
    const canScroll =
      /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;

    if (canScroll) {
      const nodeRect = node.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset =
        margin != null
          ? targetRect.top - nodeRect.top - margin
          : targetRect.top - nodeRect.top - (nodeRect.height - targetRect.height) / 2;
      node.scrollTop += offset;
    }

    node = node.parentElement;
  }

  target.scrollIntoView({ block: scrollBlock, inline: 'nearest', behavior: 'instant' });
}

/**
 * @param {{ top: number, left: number, width: number, height: number } | null} rect
 * @param {'top' | 'bottom'} placement
 */
function getTooltipStyle(rect, placement) {
  if (!rect) return { top: '72px', left: '16px', right: '16px', width: 'auto' };

  const tooltipGap = 12;
  if (placement === 'top') {
    return {
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 356)),
      top: Math.max(72, rect.top - tooltipGap),
      transform: 'translateY(-100%)',
      bottom: 'auto'
    };
  }

  return {
    left: Math.max(16, Math.min(rect.left, window.innerWidth - 356)),
    top: rect.top + rect.height + tooltipGap
  };
}

/**
 * @param {{ user: import('../../services/auth').UserRecord, onUpdate?: (user: import('../../services/auth').UserRecord) => void, onComplete: () => void | Promise<void>, onTabChange: (tabIndex: number) => void }} props
 */
export default function OnboardingTutorial({ user, onUpdate, onComplete, onTabChange }) {
  const { completeOnboarding, canEditName } = useOnboarding(user, onUpdate);
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const [tooltipPlacement, setTooltipPlacement] = useState(/** @type {'top' | 'bottom'} */ ('bottom'));
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [birthDate, setBirthDate] = useState(normalizeDateInput(user?.birth_date));
  const [dominantHand, setDominantHand] = useState(user?.dominant_hand || DEFAULT_HAND);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const avatarInputRef = useRef(null);

  const spotlightConfig = SPOTLIGHT_STEPS[step];
  const isCardStep = CARD_STEPS.has(step);
  const isSpotlightStep = Boolean(spotlightConfig);
  const showNav = NAV_STEPS.has(step);

  const measureTarget = useCallback((selector, forcedPlacement, scrollBlock = 'center') => {
    const target = document.querySelector(selector);
    if (!target) {
      setHighlightRect(null);
      return;
    }

    scrollTargetIntoView(target, scrollBlock);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const padded = {
          top: rect.top - HIGHLIGHT_PADDING,
          left: rect.left - HIGHLIGHT_PADDING,
          width: rect.width + HIGHLIGHT_PADDING * 2,
          height: rect.height + HIGHLIGHT_PADDING * 2
        };

        setHighlightRect(padded);

        if (forcedPlacement) {
          setTooltipPlacement(forcedPlacement);
          return;
        }

        const spaceBelow = window.innerHeight - (padded.top + padded.height);
        setTooltipPlacement(spaceBelow < 160 && padded.top > 160 ? 'top' : 'bottom');
      });
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.add(SCROLL_LOCK_CLASS);
    return () => {
      document.documentElement.classList.remove(SCROLL_LOCK_CLASS);
    };
  }, []);

  useEffect(() => {
    const main = document.querySelector('main.content-with-header');
    if (!main) return undefined;

    if (step === 1) {
      main.classList.remove(SCROLL_LOCK_CLASS);
      return () => main.classList.remove(SCROLL_LOCK_CLASS);
    }

    main.classList.add(SCROLL_LOCK_CLASS);
    return () => main.classList.remove(SCROLL_LOCK_CLASS);
  }, [step]);

  useEffect(() => {
    if (!isSpotlightStep || !spotlightConfig) {
      setHighlightRect(null);
      return undefined;
    }

    onTabChange(spotlightConfig.tab);

    const timer = window.setTimeout(() => {
      measureTarget(spotlightConfig.selector, spotlightConfig.placement, spotlightConfig.scrollBlock);
    }, SPOTLIGHT_DELAY_MS);

    const handleLayoutChange = () => {
      measureTarget(spotlightConfig.selector, spotlightConfig.placement, spotlightConfig.scrollBlock);
    };
    window.addEventListener('resize', handleLayoutChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', handleLayoutChange);
    };
  }, [step, isSpotlightStep, spotlightConfig, onTabChange, measureTarget]);

  useEffect(() => {
    setFullName(user?.full_name || '');
  }, [user?.full_name]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return undefined;
    }

    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await completeOnboarding();
      await onComplete();
    } catch (err) {
      error('onboarding finish:', err);
    } finally {
      setFinishing(false);
    }
  };

  const handleAvatarInputChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!file) return;
    setPendingAvatarFile(file);
    setCropModalOpen(true);
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

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!user?.id || saving) return;

    const trimmedName = fullName.trim();
    const currentName = (user.full_name || '').trim();
    const nameChanged = trimmedName !== currentName;
    const patch = {};

    if (nameChanged && canEditName) {
      patch.full_name = trimmedName;
      patch.name_set_in_onboarding = true;
    }

    if (birthDate !== normalizeDateInput(user.birth_date)) {
      patch.birth_date = birthDate || null;
    }

    if (dominantHand !== (user.dominant_hand || DEFAULT_HAND)) {
      patch.dominant_hand = dominantHand;
    }

    if (Object.keys(patch).length === 0 && !avatarFile) {
      setStep(2);
      return;
    }

    setSaving(true);
    try {
      let payload = patch;
      if (avatarFile) {
        const fd = new FormData();
        Object.entries(patch).forEach(([key, value]) => {
          fd.append(key, value == null ? '' : value);
        });
        fd.append('avatar_url', '');
        fd.append('avatar', avatarFile);
        payload = fd;
      }

      const updated = await updateUserProfile(user.id, payload);
      setAvatarFile(null);
      onUpdate?.(updated);
      setStep(2);
    } catch (err) {
      error('onboarding profile save:', err);
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const tooltipPlacementResolved = spotlightConfig?.placement || tooltipPlacement;

  return (
    <>
      <div
        className={`onboarding-overlay${isCardStep ? ' onboarding-overlay--blocking onboarding-overlay--fullscreen' : ' onboarding-overlay--blocking onboarding-overlay--main'}`}
        aria-hidden="true"
      />

      {isSpotlightStep && highlightRect && (
        <div
          className="onboarding-highlight"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height
          }}
          aria-hidden="true"
        />
      )}

      {step === 0 && (
        <div className="onboarding-card onboarding-card--welcome" role="dialog" aria-modal="true">
          <h2>Вас приветствует Секция Миленьких! 🎾</h2>
          <p>Мы рады, что вы с нами. Давайте познакомимся!</p>
          <div className="onboarding-card-actions">
            <button type="button" className="onboarding-btn onboarding-btn--primary" onClick={goNext}>
              Далее
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="onboarding-card" role="dialog" aria-modal="true">
          <h2>Ваш профиль</h2>
          <p className="onboarding-hint">
            {canEditName
              ? 'Данные видны только участникам секции. Имя можно сменить только сейчас. Указывайте свои реальные данные.'
              : 'Данные видны только участникам секции. Имя уже задано и не может быть изменено.'}
          </p>
          <form className="onboarding-form" onSubmit={handleProfileSave}>
            <div className="onboarding-avatar-block">
              {avatarPreview ? (
                <div className="ui-avatar ui-avatar--lg">
                  <img src={avatarPreview} alt="Предпросмотр аватара" className="ui-avatar-img" />
                </div>
              ) : (
                <Avatar user={user} size="lg" alt="Аватар" />
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarInputChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="onboarding-avatar-pick-btn"
                onClick={() => avatarInputRef.current?.click()}
              >
                Загрузить фото
              </button>
              {avatarFile ? <span className="onboarding-avatar-pick-name">{avatarFile.name}</span> : null}
            </div>

            <div className="form-group">
              <label htmlFor="onboarding-name">Имя фамилия</label>
              <input
                id="onboarding-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!canEditName}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="onboarding-birth-date">Дата рождения</label>
              <input
                id="onboarding-birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="onboarding-hand">Ведущая рука</label>
              <select
                id="onboarding-hand"
                value={dominantHand}
                onChange={(e) => setDominantHand(e.target.value)}
              >
                <option value="Правая">Правая</option>
                <option value="Левая">Левая</option>
                <option value="Амбидекстр">Амбидекстр</option>
              </select>
            </div>

            <button type="submit" className="onboarding-btn onboarding-btn--primary" disabled={saving} style={{ width: '100%', marginTop: 8 }}>
              {saving ? 'Сохраняем...' : 'Сохранить и продолжить'}
            </button>
          </form>
        </div>
      )}

      {isSpotlightStep && spotlightConfig && (
        <div
          className={`onboarding-tooltip${tooltipPlacementResolved === 'top' ? ' onboarding-tooltip--top' : ''}`}
          role="dialog"
          aria-modal="true"
          style={getTooltipStyle(highlightRect, tooltipPlacementResolved)}
        >
          <p>{spotlightConfig.text}</p>
        </div>
      )}

      {step === 8 && (
        <div className="onboarding-card onboarding-card--welcome" role="dialog" aria-modal="true">
          <h2>Всё готово! Добро пожаловать в Секцию Миленьких 🎾</h2>
          <div className="onboarding-card-actions">
            <button
              type="button"
              className="onboarding-btn onboarding-btn--primary"
              onClick={handleFinish}
              disabled={finishing}
            >
              {finishing ? 'Загрузка...' : 'Начать'}
            </button>
          </div>
        </div>
      )}

      {showNav && (
        <nav className="onboarding-nav" aria-label="Навигация по обучению">
          {step > 2 ? (
            <button type="button" className="onboarding-btn onboarding-btn--secondary" onClick={goBack}>
              Назад
            </button>
          ) : (
            <span className="onboarding-nav-spacer" aria-hidden="true" />
          )}
          <button
            type="button"
            className="onboarding-btn onboarding-btn--primary"
            onClick={goNext}
            disabled={isSpotlightStep && !highlightRect}
          >
            Далее
          </button>
        </nav>
      )}

      <AvatarCropModal
        isOpen={cropModalOpen}
        file={pendingAvatarFile}
        onCancel={() => {
          setPendingAvatarFile(null);
          setCropModalOpen(false);
        }}
        onConfirm={handleAvatarCropConfirm}
      />
    </>
  );
}
