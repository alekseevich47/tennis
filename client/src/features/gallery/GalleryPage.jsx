import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useGallery } from '../../hooks/useGallery';
import { useGalleryLikes } from '../../hooks/useGalleryLikes';
import { deleteGalleryImage, deleteGalleryImages } from '../../services/catalog';
import { isModerator } from '../../services/auth';
import { useGalleryUpload } from '../../components/GalleryUploadProvider';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import GalleryMediaOverlay from './GalleryMediaOverlay';
import GalleryCommentModal from './GalleryCommentModal';
import ProfileViewModal from '../profile/ProfileViewModal';
import { getMediaThumbUrl, getMediaUrl, MEDIA_CARD_THUMB, videoPreviewUrl } from '../../lib/media';
import { error } from '../../lib/log';
import './Gallery.css';

const SCROLL_HIDE_DEBOUNCE_MS = 300;
const LONG_PRESS_MS = 300;
const LONG_PRESS_MOVE_TOLERANCE = 8;

function getImageAspectRatio(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img.naturalWidth / img.naturalHeight);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось прочитать размеры изображения'));
    };
    img.src = objectUrl;
  });
}

function getVideoAspectRatio(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.videoWidth / video.videoHeight);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось прочитать размеры видео'));
    };
    video.src = objectUrl;
  });
}

async function createGalleryUploadItem(file) {
  const media_type = file.type.startsWith('video/') ? 'video' : 'image';
  const aspect_ratio = media_type === 'video'
    ? await getVideoAspectRatio(file)
    : await getImageAspectRatio(file);

  return { file, aspect_ratio, media_type };
}

function getAspectClass(ratio) {
  if (!ratio) return 'gallery-item--square';
  if (ratio < 0.8) return 'gallery-item--portrait';
  if (ratio > 1.25) return 'gallery-item--landscape';
  return 'gallery-item--square';
}

function GalleryItemLike({ itemId, user }) {
  const { count, isLiked, toggle, isLoading } = useGalleryLikes(itemId);
  const userId = user?.id;
  const liked = isLiked(userId);

  const icon = (
    <>
      <span className="gallery-item-like__icon" aria-hidden="true">
        {liked ? '♥' : '♡'}
      </span>
      <span className="gallery-item-like__count">{count}</span>
    </>
  );

  if (!userId) {
    return (
      <div className="gallery-item-like gallery-item-like--readonly" aria-label={`Лайков: ${count}`}>
        {icon}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={clsx('gallery-item-like', liked && 'gallery-item-like--liked')}
      onClick={(event) => {
        event.stopPropagation();
        toggle(itemId, userId);
      }}
      disabled={isLoading}
      aria-pressed={liked}
      aria-label={liked ? 'Убрать лайк' : 'Поставить лайк'}
    >
      {icon}
    </button>
  );
}

function GalleryPage({
  user,
  searchQuery = '',
  commentTargetToOpen = null,
  onCommentTargetOpened
}) {
  const moderator = isModerator();
  const { data: images, isLoading, mutate } = useGallery();
  const { startUpload } = useGalleryUpload();
  const { alert, confirm } = useAlertDialog();
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const gridRef = useRef(null);
  const floatingButtonRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const longPressRef = useRef(null);
  const suppressClickRef = useRef(null);
  const videoElRef = useRef(null);
  const [videoBottomOffset, setVideoBottomOffset] = useState(0);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [hiddenMediaKey, setHiddenMediaKey] = useState(null);
  const [activeViewerIndex, setActiveViewerIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentOnlyMedia, setCommentOnlyMedia] = useState(null);
  const [highlightCommentId, setHighlightCommentId] = useState(/** @type {string | null} */ (null));
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [isDeletingFullscreen, setIsDeletingFullscreen] = useState(false);

  const selectedCount = selectedIds.size;
  const isDeleteButton = isSelectMode && selectedCount > 0;

  const clearSelection = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressRef.current?.timerId) {
      window.clearTimeout(longPressRef.current.timerId);
    }
    longPressRef.current = null;
  }, []);

  const [activeVideoEl, setActiveVideoEl] = useState(null);

  const handleActiveVideoRef = useCallback((el) => {
    videoElRef.current = el;
    setActiveVideoEl(el);
    if (el) {
      setIsVideoPlaying(true);
      el.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!activeVideoEl) {
      setVideoBottomOffset(0);
      return undefined;
    }

    const measure = () => {
      setVideoBottomOffset(window.innerHeight - activeVideoEl.getBoundingClientRect().bottom);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(activeVideoEl);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [activeVideoEl]);

  useEffect(() => {
    const item = fullscreenMedia?.items[activeViewerIndex];
    setIsVideoPlaying(item?.isVideo === true);
  }, [activeViewerIndex, fullscreenMedia]);

  useEffect(() => {
    if (!fullscreenMedia) {
      setIsVideoPlaying(false);
      return undefined;
    }

    const handlePlay = (event) => {
      if (event.target === videoElRef.current) {
        setIsVideoPlaying(true);
      }
    };
    const handlePause = (event) => {
      if (event.target === videoElRef.current) {
        setIsVideoPlaying(false);
      }
    };

    document.addEventListener('play', handlePlay, true);
    document.addEventListener('pause', handlePause, true);
    return () => {
      document.removeEventListener('play', handlePlay, true);
      document.removeEventListener('pause', handlePause, true);
    };
  }, [fullscreenMedia]);

  const toggleSelectedId = useCallback((id) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectGalleryItem = useCallback((id) => {
    setIsSelectMode(true);
    setSelectedIds((previous) => {
      const next = new Set(previous);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isSelectMode || selectedIds.size > 0) return undefined;
    setIsSelectMode(false);
    return undefined;
  }, [isSelectMode, selectedIds]);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  useEffect(() => {
    if (!isSelectMode) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (gridRef.current?.contains(target) || floatingButtonRef.current?.contains(target)) return;
      clearSelection();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [clearSelection, isSelectMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!moderator || !container) return undefined;

    const handleScroll = () => {
      setIsButtonVisible(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsButtonVisible(true);
      }, SCROLL_HIDE_DEBOUNCE_MS);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [moderator]);

  useEffect(() => {
    if (!commentModalOpen) return undefined;

    const handleViewerKeys = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setCommentModalOpen(false);
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleViewerKeys, true);
    return () => document.removeEventListener('keydown', handleViewerKeys, true);
  }, [commentModalOpen]);

  const filteredImages = useMemo(() => {
    if (!images) return [];
    if (!searchQuery.trim()) return images;
    const q = searchQuery.trim().replace('#', '');
    const num = parseInt(q, 10);
    if (!Number.isNaN(num)) {
      return images.filter((img) => img.post_number === num);
    }
    return images;
  }, [images, searchQuery]);

  const isSearchActive = searchQuery.trim().length > 0;

  const galleryItems = useMemo(() => {
    if (!filteredImages.length) return [];

    return filteredImages.flatMap((img) => {
      const isVideo = img.media_type === 'video';
      const mediaFile = isVideo ? img.video : img.image;
      const filename = img.image || img.video;
      const url = getMediaUrl(img, 'gallery', mediaFile);
      if (!filename || !url) return [];
      const thumbUrl = isVideo
        ? url
        : getMediaThumbUrl(img, 'gallery', mediaFile, MEDIA_CARD_THUMB) || url;

      return [{
        id: img.id,
        filename,
        url,
        thumbUrl,
        previewUrl: thumbUrl,
        isVideo,
        aspectRatio: img.aspect_ratio,
        originKey: img.id,
        postNumber: img.post_number
      }];
    });
  }, [filteredImages]);

  const handleFileChange = useCallback(
    async (event) => {
      const input = event.currentTarget;
      const files = [...(input.files || [])];

      if (files.length === 0) {
        input.value = '';
        return;
      }

      try {
        const items = [];
        for (const file of files) {
          items.push(await createGalleryUploadItem(file));
        }
        startUpload(items);
      } catch (err) {
        error('prepare gallery upload:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось подготовить файл для загрузки.' });
      } finally {
        input.value = '';
      }
    },
    [startUpload, alert]
  );

  const handleOpenFullscreen = useCallback((items, index = 0, originRect = null, originKey = null) => {
    clearSelection();
    setHiddenMediaKey(null);
    setActiveViewerIndex(index);
    setFullscreenMedia({ items, index, originRect, originKey });
    setIsVideoPlaying(items[index]?.isVideo === true);
  }, [clearSelection]);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenMedia(null);
    setHiddenMediaKey(null);
    setActiveViewerIndex(0);
    setIsVideoPlaying(false);
    setCommentModalOpen(false);
  }, []);

  const handleFullscreenCloseStart = useCallback((originKey) => {
    setHiddenMediaKey(originKey || null);
  }, []);

  const handleGalleryItemPointerDown = useCallback(
    (event, itemId) => {
      if (!moderator || event.button !== 0) return;
      clearLongPressTimer();

      longPressRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        timerId: window.setTimeout(() => {
          suppressClickRef.current = itemId;
          selectGalleryItem(itemId);
        }, LONG_PRESS_MS)
      };
    },
    [clearLongPressTimer, moderator, selectGalleryItem]
  );

  const handleGalleryItemPointerMove = useCallback(
    (event) => {
      const press = longPressRef.current;
      if (!press || press.pointerId !== event.pointerId) return;

      const moved = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
      if (moved > LONG_PRESS_MOVE_TOLERANCE) {
        clearLongPressTimer();
      }
    },
    [clearLongPressTimer]
  );

  const handleGalleryItemPointerEnd = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handleDeleteSelected = useCallback(async () => {
    if (!moderator || isDeletingSelected || selectedIds.size === 0) return;

    const ids = [...selectedIds];
    const ok = await confirm({
      title: 'Удалить медиа?',
      message: `Выбранные файлы будут удалены: ${ids.length}.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена'
    });
    if (!ok) return;

    setIsDeletingSelected(true);
    try {
      await deleteGalleryImages(ids);
      await mutate();
      clearSelection();
    } catch (err) {
      error('delete gallery images:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось удалить выбранные медиа.' });
    } finally {
      setIsDeletingSelected(false);
    }
  }, [alert, clearSelection, confirm, isDeletingSelected, moderator, mutate, selectedIds]);

  const activeGalleryItem = fullscreenMedia
    ? fullscreenMedia.items[activeViewerIndex] ?? null
    : null;
  const activeGalleryRecord = activeGalleryItem
    ? images?.find((img) => img.id === activeGalleryItem.originKey) ?? null
    : null;
  const commentModalMedia = commentOnlyMedia || activeGalleryRecord;

  useEffect(() => {
    if (!commentTargetToOpen?.mediaId || !images?.length) return;
    const media = images.find((item) => item.id === commentTargetToOpen.mediaId);
    if (!media) return;
    setCommentOnlyMedia(media);
    setHighlightCommentId(commentTargetToOpen.commentId || null);
    setCommentModalOpen(true);
    onCommentTargetOpened?.();
  }, [commentTargetToOpen, images, onCommentTargetOpened]);

  const handleDeleteFullscreen = useCallback(async () => {
    if (!moderator || isDeletingFullscreen || !activeGalleryRecord?.id) return;

    const ok = await confirm({
      title: 'Удалить медиа?',
      message: 'Файл будет удалён из галереи.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      overlayClassName: 'gallery-fullscreen-confirm-overlay'
    });
    if (!ok) return;

    setIsDeletingFullscreen(true);
    try {
      await deleteGalleryImage(activeGalleryRecord.id);
      await mutate();
      handleCloseFullscreen();
    } catch (err) {
      error('delete gallery image:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось удалить медиа.' });
    } finally {
      setIsDeletingFullscreen(false);
    }
  }, [
    activeGalleryRecord?.id,
    alert,
    confirm,
    handleCloseFullscreen,
    isDeletingFullscreen,
    moderator,
    mutate
  ]);

  return (
    <section className="gallery" ref={containerRef} aria-label="Галерея фотографий">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {moderator && (
        <div className="floating-btn-wrapper" ref={floatingButtonRef}>
          <button
            type="button"
            className={clsx(
              'floating-add-btn',
              isDeleteButton && 'floating-add-btn--delete',
              isButtonVisible ? 'visible' : 'hidden'
            )}
            onClick={isDeleteButton ? handleDeleteSelected : () => fileInputRef.current?.click()}
            disabled={isDeleteButton && isDeletingSelected}
            aria-label={isDeleteButton ? `Удалить выбранные медиа: ${selectedCount}` : 'Добавить файлы в галерею'}
          >
            {isDeleteButton ? `Удалить (${selectedCount})` : 'Добавить'}
          </button>
        </div>
      )}

      {isLoading ? (
        <Spinner label="Загрузка галереи..." />
      ) : galleryItems.length === 0 ? (
        <EmptyState
          title={isSearchActive ? 'Ничего не найдено' : 'Нет фотографий'}
          description={
            isSearchActive
              ? 'Попробуйте другой номер.'
              : 'Загрузите первое фото секции.'
          }
        />
      ) : (
        <div className="gallery-grid" ref={gridRef}>
          {galleryItems.map((item, index) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id || item.filename}
                className={clsx('gallery-item-shell', getAspectClass(item.aspectRatio))}
                style={hiddenMediaKey === item.originKey ? { visibility: 'hidden' } : undefined}
              >
                <button
                  type="button"
                  className={clsx('gallery-item', isSelected && 'gallery-item--selected')}
                  data-media-origin-key={item.originKey}
                  onPointerDown={(event) => handleGalleryItemPointerDown(event, item.id)}
                  onPointerMove={handleGalleryItemPointerMove}
                  onPointerUp={handleGalleryItemPointerEnd}
                  onPointerCancel={handleGalleryItemPointerEnd}
                  onClick={(event) => {
                    if (suppressClickRef.current === item.id) {
                      suppressClickRef.current = null;
                      return;
                    }

                    if (isSelectMode) {
                      toggleSelectedId(item.id);
                      return;
                    }

                    handleOpenFullscreen(
                      galleryItems,
                      index,
                      event.currentTarget.getBoundingClientRect(),
                      item.originKey
                    );
                  }}
                  aria-pressed={isSelectMode ? isSelected : undefined}
                  aria-label={isSelectMode
                    ? isSelected
                      ? 'Убрать медиа из выбранных'
                      : 'Выбрать медиа'
                    : item.isVideo
                      ? 'Открыть видео на весь экран'
                      : 'Открыть фото на весь экран'}
                >
                  {item.isVideo ? (
                    <video
                      src={videoPreviewUrl(item.url)}
                      preload="metadata"
                      muted
                      playsInline
                      aria-label="Видео из галереи секции"
                    />
                  ) : (
                    <img src={item.url} alt="Фотография из галереи секции" />
                  )}
                </button>
                {!isSelectMode && (
                  <GalleryItemLike itemId={item.id} user={user} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {fullscreenMedia && (
        <>
          <FullscreenImageViewer
            items={fullscreenMedia.items}
            initialIndex={fullscreenMedia.index}
            originRect={fullscreenMedia.originRect}
            originKey={fullscreenMedia.originKey}
            onCloseStart={handleFullscreenCloseStart}
            onActiveIndexChange={setActiveViewerIndex}
            onClose={handleCloseFullscreen}
            onActiveVideoRef={handleActiveVideoRef}
          />
          <GalleryMediaOverlay
            key={activeGalleryRecord?.id}
            mediaId={activeGalleryRecord?.id ?? null}
            user={user}
            onCommentOpen={() => setCommentModalOpen(true)}
            canDelete={moderator}
            onDelete={isDeletingFullscreen ? undefined : handleDeleteFullscreen}
            bottomOffset={videoBottomOffset}
            hidden={isVideoPlaying}
          />
        </>
      )}

      <GalleryCommentModal
        isOpen={commentModalOpen}
        mediaItem={commentModalMedia}
        user={user}
        userIsModerator={moderator}
        highlightCommentId={highlightCommentId}
        onClose={() => {
          setCommentModalOpen(false);
          setCommentOnlyMedia(null);
          setHighlightCommentId(null);
        }}
        onOpenProfile={setViewingPlayer}
      />

      <ProfileViewModal
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
        targetUser={viewingPlayer}
        currentUser={user}
      />
    </section>
  );
}

export default GalleryPage;
