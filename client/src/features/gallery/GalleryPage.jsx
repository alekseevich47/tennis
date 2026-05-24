import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useGallery } from '../../hooks/useGallery';
import { isModerator } from '../../services/auth';
import { useGalleryUpload } from '../../components/GalleryUploadProvider';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import GalleryMediaOverlay from './GalleryMediaOverlay';
import GalleryCommentModal from './GalleryCommentModal';
import { getMediaUrl, videoPreviewUrl } from '../../lib/media';
import { error } from '../../lib/log';
import './Gallery.css';

const SCROLL_HIDE_DEBOUNCE_MS = 300;

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

function GalleryPage({ user }) {
  const moderator = isModerator();
  const { data: images, isLoading } = useGallery();
  const { startUpload } = useGalleryUpload();
  const { alert } = useAlertDialog();
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [hiddenMediaKey, setHiddenMediaKey] = useState(null);
  const [activeViewerIndex, setActiveViewerIndex] = useState(0);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [commentModalOpen, setCommentModalOpen] = useState(false);

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

  const galleryItems = useMemo(() => {
    if (!images) return [];

    return images.flatMap((img) => {
      const isVideo = img.media_type === 'video';
      const mediaFile = isVideo ? img.video : img.image;
      const filename = img.image || img.video;
      const url = getMediaUrl(img, 'gallery', mediaFile);
      if (!filename || !url) return [];

      return [{
        id: img.id,
        filename,
        url,
        isVideo,
        aspectRatio: img.aspect_ratio,
        originKey: img.id
      }];
    });
  }, [images]);

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
    setHiddenMediaKey(null);
    setActiveViewerIndex(index);
    setFullscreenMedia({ items, index, originRect, originKey });
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenMedia(null);
    setHiddenMediaKey(null);
    setActiveViewerIndex(0);
    setCommentModalOpen(false);
  }, []);

  const handleFullscreenCloseStart = useCallback((originKey) => {
    setHiddenMediaKey(originKey || null);
  }, []);

  const activeGalleryItem = fullscreenMedia
    ? fullscreenMedia.items[activeViewerIndex] ?? null
    : null;
  const activeGalleryRecord = activeGalleryItem
    ? images?.find((img) => img.id === activeGalleryItem.originKey) ?? null
    : null;

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
        <div className="floating-btn-wrapper">
          <button
            type="button"
            className={clsx('floating-add-btn', isButtonVisible ? 'visible' : 'hidden')}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Добавить файлы в галерею"
          >
            Добавить
          </button>
        </div>
      )}

      {isLoading ? (
        <Spinner label="Загрузка галереи..." />
      ) : galleryItems.length === 0 ? (
        <EmptyState title="Нет фотографий" description="Загрузите первое фото секции." />
      ) : (
        <div className="gallery-grid">
          {galleryItems.map((item, index) => {
            return (
              <button
                key={item.id || item.filename}
                type="button"
                className={clsx('gallery-item', getAspectClass(item.aspectRatio))}
                style={hiddenMediaKey === item.originKey ? { visibility: 'hidden' } : undefined}
                data-media-origin-key={item.originKey}
                onClick={(event) => {
                  handleOpenFullscreen(
                    galleryItems,
                    index,
                    event.currentTarget.getBoundingClientRect(),
                    item.originKey
                  );
                }}
                aria-label={item.isVideo ? 'Открыть видео на весь экран' : 'Открыть фото на весь экран'}
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
          />
          <GalleryMediaOverlay
            key={activeGalleryRecord?.id}
            mediaId={activeGalleryRecord?.id ?? null}
            user={user}
            onCommentOpen={() => setCommentModalOpen(true)}
          />
        </>
      )}

      <GalleryCommentModal
        isOpen={commentModalOpen}
        mediaItem={activeGalleryRecord}
        user={user}
        userIsModerator={moderator}
        onClose={() => setCommentModalOpen(false)}
      />
    </section>
  );
}

export default GalleryPage;
