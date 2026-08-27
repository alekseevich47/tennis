import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import paperClipUrl from '../../assets/paper-clip.svg';
import photoCameraUrl from '../../assets/photo-camera.svg';
import PostRichTextField from './PostRichTextField';
import { EMOJI_ATTACH_SWAP_MS } from './emoji/EmojiPicker';
import CommentSendButton from './CommentSendButton';
import SortableMediaPreviewGrid from './SortableMediaPreviewGrid';
import FullscreenImageViewer from './FullscreenImageViewer';
import PostContentHtml from './PostContentHtml';
import { useLocalMediaFullscreen } from './useLocalMediaFullscreen';
import { compressImage } from '../../lib/compress';
import { isVideoFile, readSelectedFiles } from '../../lib/media';
import { hasVisibleText } from './postRichText';
import { useLongPress, LongPressRing } from '../../lib/longPress';
import { useOverlayClose } from '../../hooks/useOverlayClose';

export const MAX_COMMENT_MEDIA_FILES = 5;

/**
 * @typedef {{
 *   key: string,
 *   file: File | null,
 *   url: string,
 *   name: string,
 *   isVideo: boolean,
 *   status: 'loading' | 'ready' | 'error',
 *   progress: number | null,
 *   error?: string
 * }} CommentMediaDraft
 */

function AttachButtons({ variant, visible, disabled, onGallery, onCamera }) {
  return (
    <div
      className={clsx(
        'comment-attach-pair',
        `comment-attach-pair--${variant}`,
        visible ? 'is-visible' : 'is-hidden'
      )}
      aria-hidden={!visible}
    >
      <button
        type="button"
        className="comment-attach-btn"
        aria-label="Прикрепить медиа"
        tabIndex={visible ? 0 : -1}
        disabled={disabled || !visible}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onGallery}
      >
        <img
          src={paperClipUrl}
          alt=""
          className="comment-attach-btn__img"
          width="20"
          height="20"
          draggable={false}
        />
      </button>
      <button
        type="button"
        className="comment-attach-btn"
        aria-label="Сделать снимок"
        tabIndex={visible ? 0 : -1}
        disabled={disabled || !visible}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCamera}
      >
        <img
          src={photoCameraUrl}
          alt=""
          className="comment-attach-btn__img"
          width="20"
          height="20"
          draggable={false}
        />
      </button>
    </div>
  );
}

export { AttachButtons };

/**
 * @param {{
 *   id?: string,
 *   value: string,
 *   onChange: (html: string) => void,
 *   fieldRef?: React.Ref<any>,
 *   placeholder?: string,
 *   busy?: boolean,
 *   replySlot?: React.ReactNode,
 *   onSubmit: (payload: {
 *     text: string,
 *     mediaFiles: File[],
 *     captionAbove: boolean
 *   }) => Promise<void> | void,
 *   formClassName?: string
 * }} props
 */
function CommentComposeForm({
  id,
  value,
  onChange,
  fieldRef,
  placeholder = 'Написать комментарий…',
  busy = false,
  replySlot = null,
  onSubmit,
  formClassName = 'modal-comment-form-footer'
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const galleryInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const cameraInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const internalFieldRef = useRef(null);
  const resolvedFieldRef = fieldRef || internalFieldRef;

  /** @type {[CommentMediaDraft[], React.Dispatch<React.SetStateAction<CommentMediaDraft[]>>]} */
  const [mediaItems, setMediaItems] = useState([]);
  const [captionAbove, setCaptionAbove] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [sendPhase, setSendPhase] = useState(/** @type {'idle' | 'armed' | 'flying'} */ ('idle'));

  const hasText = hasVisibleText(value);
  const [toolbarAttachVisible, setToolbarAttachVisible] = useState(() => hasText);
  const [fieldAttachVisible, setFieldAttachVisible] = useState(() => !hasText);

  useEffect(() => {
    if (hasText) {
      setFieldAttachVisible(false);
      setToolbarAttachVisible(true);
      return undefined;
    }
    setToolbarAttachVisible(false);
    const timer = window.setTimeout(() => setFieldAttachVisible(true), EMOJI_ATTACH_SWAP_MS);
    return () => window.clearTimeout(timer);
  }, [hasText]);

  const hasMedia = mediaItems.some((item) => item.status === 'ready' && item.file);
  const hasPendingMedia = mediaItems.some((item) => item.status === 'loading');
  const canSend =
    !busy &&
    !hasPendingMedia &&
    sendPhase !== 'flying' &&
    (hasText || hasMedia);
  const longPressEnabled = hasText && hasMedia && canSend && !previewOpen;
  const readyCount = mediaItems.filter((i) => i.status === 'ready').length;

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
    window.setTimeout(() => setPreviewOpen(false), 220);
  }, []);

  useOverlayClose(previewOpen, closePreview, 'comment-compose-preview');

  useEffect(() => {
    if (!previewOpen) return;
    const frame = requestAnimationFrame(() => setPreviewVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [previewOpen]);

  useEffect(() => {
    const next = hasVisibleText(value) || hasMedia ? 'armed' : 'idle';
    setSendPhase((prev) => (prev === 'flying' ? prev : next));
  }, [value, hasMedia]);

  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => {
        if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke on unmount
  }, []);

  const ingestFiles = useCallback(async (fileList) => {
    const field = /** @type {{ saveSelection?: () => void, restoreSelection?: () => void, focus?: (o?: any) => void } | null} */ (
      resolvedFieldRef && typeof resolvedFieldRef === 'object' && 'current' in resolvedFieldRef
        ? resolvedFieldRef.current
        : null
    );
    field?.saveSelection?.();

    setMediaItems((prev) => {
      const slots = Math.max(0, MAX_COMMENT_MEDIA_FILES - prev.length);
      const incoming = readSelectedFiles(fileList, slots).filter(
        (file) =>
          file.type.startsWith('image/') ||
          file.type.startsWith('video/') ||
          /\.gif$/i.test(file.name)
      );
      if (!incoming.length) {
        requestAnimationFrame(() => {
          field?.restoreSelection?.();
        });
        return prev;
      }

      const drafts = incoming.map((file) => ({
        key: `m-${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file: null,
        url: '',
        name: file.name,
        isVideo: isVideoFile(file),
        status: /** @type {'loading'} */ ('loading'),
        progress: 0
      }));

      void (async () => {
        for (let i = 0; i < incoming.length; i += 1) {
          const file = incoming[i];
          const key = drafts[i].key;
          try {
            setMediaItems((cur) =>
              cur.map((item) => (item.key === key ? { ...item, progress: 20 } : item))
            );
            const prepared = file.type.startsWith('image/') ? await compressImage(file) : file;
            setMediaItems((cur) =>
              cur.map((item) => (item.key === key ? { ...item, progress: 70 } : item))
            );
            const url = URL.createObjectURL(prepared);
            setMediaItems((cur) =>
              cur.map((item) =>
                item.key === key
                  ? {
                      key,
                      file: prepared,
                      url,
                      name: prepared.name,
                      isVideo: isVideoFile(prepared),
                      status: 'ready',
                      progress: 100
                    }
                  : item
              )
            );
          } catch {
            setMediaItems((cur) =>
              cur.map((item) =>
                item.key === key
                  ? {
                      key,
                      file: null,
                      url: '',
                      name: item.name,
                      isVideo: item.isVideo,
                      status: 'error',
                      progress: null,
                      error: 'Ошибка'
                    }
                  : item
              )
            );
          }
        }
        requestAnimationFrame(() => {
          field?.focus?.({ restoreSaved: true });
          field?.restoreSelection?.();
        });
      })();

      return [...prev, ...drafts].slice(0, MAX_COMMENT_MEDIA_FILES);
    });
  }, [resolvedFieldRef]);

  const openGallery = useCallback(() => {
    const field = /** @type {{ saveSelection?: () => void } | null} */ (
      resolvedFieldRef && typeof resolvedFieldRef === 'object' && 'current' in resolvedFieldRef
        ? resolvedFieldRef.current
        : null
    );
    field?.saveSelection?.();
    galleryInputRef.current?.click();
  }, [resolvedFieldRef]);

  const openCamera = useCallback(() => {
    const field = /** @type {{ saveSelection?: () => void } | null} */ (
      resolvedFieldRef && typeof resolvedFieldRef === 'object' && 'current' in resolvedFieldRef
        ? resolvedFieldRef.current
        : null
    );
    field?.saveSelection?.();
    cameraInputRef.current?.click();
  }, [resolvedFieldRef]);

  const removeMedia = useCallback((key) => {
    setMediaItems((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target?.url?.startsWith('blob:')) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.key !== key);
    });
  }, []);

  const clearMedia = useCallback(() => {
    setMediaItems((prev) => {
      prev.forEach((item) => {
        if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
      });
      return [];
    });
  }, []);

  const runSend = useCallback(async () => {
    if (!canSend) return;
    const text = value;
    const files = mediaItems
      .filter((item) => item.status === 'ready' && item.file)
      .map((item) => /** @type {File} */ (item.file));
    const caption = captionAbove;
    setSendPhase('flying');
    if (previewOpen) closePreview();
    onChange('');
    clearMedia();
    setCaptionAbove(false);
    if (fieldRef && typeof fieldRef !== 'function' && fieldRef.current?.clear) {
      fieldRef.current.clear();
    }
    try {
      await onSubmit({ text, mediaFiles: files, captionAbove: caption });
    } catch {
      onChange(text);
    } finally {
      window.setTimeout(() => {
        setSendPhase((prev) => (prev === 'flying' ? 'idle' : prev));
      }, 1500);
    }
  }, [
    canSend,
    value,
    mediaItems,
    captionAbove,
    previewOpen,
    closePreview,
    onChange,
    clearMedia,
    fieldRef,
    onSubmit
  ]);

  const { handlers: longPressHandlers, ringProps } = useLongPress({
    enabled: longPressEnabled,
    onLongPress: () => setPreviewOpen(true),
    durationMs: 450
  });

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (previewOpen) {
      closePreview();
      return;
    }
    void runSend();
  };

  const readyPreviewItems = mediaItems.map((item) => ({
    key: item.key,
    url: item.url,
    name: item.name,
    isVideo: item.isVideo,
    status: item.status,
    progress: item.progress,
    error: item.error
  }));

  const {
    openItem: openPreviewMedia,
    fullscreen: previewFullscreen,
    close: closePreviewFullscreen,
    onCloseStart: handlePreviewCloseStart,
    handleActiveIndexChange: handlePreviewIndexChange
  } = useLocalMediaFullscreen(
    readyPreviewItems.filter((item) => item.status === 'ready' && item.url),
    'comment-compose'
  );

  const attachDisabled = busy || mediaItems.length >= MAX_COMMENT_MEDIA_FILES;

  const sendButtonProps = {
    disabled: !canSend && sendPhase !== 'flying',
    busy: busy || sendPhase === 'flying',
    phase: sendPhase
  };

  const previewOverlay =
    previewOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={clsx('comment-send-preview-overlay', previewVisible && 'is-visible')}
            role="presentation"
            onClick={closePreview}
          >
            <div
              className="comment-send-preview-stage"
              role="dialog"
              aria-label="Предпросмотр комментария"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="comment-send-preview-card">
                {captionAbove ? (
                  <PostContentHtml
                    as="div"
                    className="comment-send-preview-card__text"
                    content={value}
                  />
                ) : null}
                {readyCount > 0 ? (
                  <div className="comment-send-preview-card__media">
                    <SortableMediaPreviewGrid
                      items={readyPreviewItems.filter((i) => i.status === 'ready')}
                      onReorder={() => {}}
                      enabled={false}
                      layout="grid"
                      className="comment-send-preview-grid"
                    />
                  </div>
                ) : null}
                {!captionAbove ? (
                  <PostContentHtml
                    as="div"
                    className="comment-send-preview-card__text"
                    content={value}
                  />
                ) : null}
              </div>
              <CommentSendButton
                {...sendButtonProps}
                type="button"
                className="comment-send-btn--preview"
                onClick={(e) => {
                  e.stopPropagation();
                  void runSend();
                }}
              />
            </div>
            <div
              className="comment-send-preview-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="comment-send-preview-sheet__action"
                onClick={() => setCaptionAbove((v) => !v)}
              >
                <span className="comment-send-preview-sheet__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path
                      fill="currentColor"
                      d="M4 7h12v2H4V7zm0 4h16v2H4v-2zm0 4h10v2H4v-2zm14-9v10l5-5-5-5z"
                    />
                  </svg>
                </span>
                <span>
                  {captionAbove ? 'Перенести текст вниз' : 'Перенести текст наверх'}
                </span>
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="comment-compose modal-comment-footer">
      {replySlot}
      <form onSubmit={handleFormSubmit} className={clsx(formClassName, 'comment-compose__form')}>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*,.gif"
          multiple
          className="visually-hidden"
          tabIndex={-1}
          onChange={(e) => {
            void ingestFiles(e.target.files);
            e.currentTarget.value = '';
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="visually-hidden"
          tabIndex={-1}
          onChange={(e) => {
            void ingestFiles(e.target.files);
            e.currentTarget.value = '';
          }}
        />

        <div className="comment-compose__row">
          <div className="comment-compose__field-col">
            <PostRichTextField
              ref={resolvedFieldRef}
              id={inputId}
              value={value}
              onChange={onChange}
              enableFrame={false}
              compact
              fieldEmojiMode="after-text"
              placeholder={placeholder}
              aria-label={placeholder}
              toolbarExtra={
                <AttachButtons
                  variant="toolbar"
                  visible={toolbarAttachVisible}
                  disabled={attachDisabled}
                  onGallery={openGallery}
                  onCamera={openCamera}
                />
              }
              editorEnd={
                <AttachButtons
                  variant="field"
                  visible={fieldAttachVisible}
                  disabled={attachDisabled}
                  onGallery={openGallery}
                  onCamera={openCamera}
                />
              }
            />
          </div>

          {!previewOpen ? (
            <CommentSendButton
              {...sendButtonProps}
              {...(longPressEnabled ? longPressHandlers : {})}
            />
          ) : (
            <span className="comment-send-btn comment-send-btn--spacer" aria-hidden="true" />
          )}
          <LongPressRing {...ringProps} />
        </div>

        {readyPreviewItems.length > 0 ? (
          <div className="comment-compose__media">
            <SortableMediaPreviewGrid
              items={readyPreviewItems}
              layout="strip"
              onReorder={(next) => {
                const byKey = new Map(mediaItems.map((item) => [item.key, item]));
                setMediaItems(
                  next.map((item) => byKey.get(item.key)).filter(Boolean)
                );
              }}
              onItemClick={(item, index, event) => {
                if (item.status !== 'ready' || !item.url) return;
                openPreviewMedia(item, index, event);
              }}
              onRemove={(key) => removeMedia(key)}
              className="comment-compose-media-strip"
            />
          </div>
        ) : null}
      </form>
      {previewOverlay}
      {previewFullscreen ? (
        <FullscreenImageViewer
          items={previewFullscreen.items}
          initialIndex={previewFullscreen.index}
          originRect={previewFullscreen.originRect}
          originKey={previewFullscreen.originKey}
          onCloseStart={handlePreviewCloseStart}
          onActiveIndexChange={handlePreviewIndexChange}
          onClose={closePreviewFullscreen}
        />
      ) : null}
    </div>
  );
}

export default CommentComposeForm;
