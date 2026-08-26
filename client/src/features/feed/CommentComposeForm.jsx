import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import paperClipUrl from '../../assets/paper-clip.svg';
import photoCameraUrl from '../../assets/photo-camera.svg';
import PostRichTextField from './PostRichTextField';
import CommentSendButton from './CommentSendButton';
import SortableMediaPreviewGrid from './SortableMediaPreviewGrid';
import PostContentHtml from './PostContentHtml';
import { compressImage } from '../../lib/compress';
import { isVideoFile, readSelectedFiles } from '../../lib/media';
import { hasVisibleText } from './postRichText';
import { useLongPress, LongPressRing } from '../../lib/longPress';
import { useOverlayClose } from '../../hooks/useOverlayClose';

gsap.registerPlugin(Flip);

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

function AttachButtons({
  variant,
  visible,
  disabled,
  onGallery,
  onCamera,
  flipGroup
}) {
  return (
    <div
      className={clsx(
        'comment-attach-pair',
        `comment-attach-pair--${variant}`,
        visible ? 'is-visible' : 'is-hidden'
      )}
      data-flip-group={flipGroup}
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
        <img src={paperClipUrl} alt="" className="comment-attach-btn__img" width="20" height="20" draggable={false} />
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
        <img src={photoCameraUrl} alt="" className="comment-attach-btn__img" width="20" height="20" draggable={false} />
      </button>
    </div>
  );
}

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
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const prevAttachSlot = useRef(/** @type {'field' | 'toolbar'} */ ('field'));

  /** @type {[CommentMediaDraft[], React.Dispatch<React.SetStateAction<CommentMediaDraft[]>>]} */
  const [mediaItems, setMediaItems] = useState([]);
  const [captionAbove, setCaptionAbove] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [sendPhase, setSendPhase] = useState(/** @type {'idle' | 'armed' | 'flying'} */ ('idle'));

  const attachInToolbar = hasVisibleText(value);
  const hasMedia = mediaItems.some((item) => item.status === 'ready' && item.file);
  const hasPendingMedia = mediaItems.some((item) => item.status === 'loading');
  const canSend =
    !busy &&
    !hasPendingMedia &&
    sendPhase !== 'flying' &&
    (hasVisibleText(value) || hasMedia);
  const longPressEnabled = hasVisibleText(value) && hasMedia && canSend && !previewOpen;

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

  useLayoutEffect(() => {
    const nextSlot = attachInToolbar ? 'toolbar' : 'field';
    if (prevAttachSlot.current === nextSlot) return;
    const root = rootRef.current;
    if (!root) {
      prevAttachSlot.current = nextSlot;
      return;
    }
    const state = Flip.getState(root.querySelectorAll('[data-flip-group="comment-attach"] .comment-attach-btn'));
    prevAttachSlot.current = nextSlot;
    Flip.from(state, {
      duration: 0.34,
      ease: 'power2.inOut',
      absolute: true,
      nested: true,
      targets: root.querySelectorAll('.comment-attach-pair.is-visible .comment-attach-btn')
    });
  }, [attachInToolbar]);

  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => {
        if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke on unmount
  }, []);

  const ingestFiles = useCallback(async (fileList) => {
    setMediaItems((prev) => {
      const slots = Math.max(0, MAX_COMMENT_MEDIA_FILES - prev.length);
      const incoming = readSelectedFiles(fileList, slots).filter(
        (file) =>
          file.type.startsWith('image/') ||
          file.type.startsWith('video/') ||
          /\.gif$/i.test(file.name)
      );
      if (!incoming.length) return prev;

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
      })();

      return [...prev, ...drafts].slice(0, MAX_COMMENT_MEDIA_FILES);
    });
  }, []);

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
      }, 420);
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
    if (previewOpen) closePreview();
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

  const attachDisabled = busy || mediaItems.length >= MAX_COMMENT_MEDIA_FILES;

  const previewOverlay =
    previewOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={clsx('comment-send-preview-overlay', previewVisible && 'is-visible')}
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closePreview();
            }}
          >
            <div
              className="comment-send-preview-stage"
              role="dialog"
              aria-label="Предпросмотр комментария"
            >
              <div className="comment-send-preview-card">
                {captionAbove ? (
                  <PostContentHtml
                    as="div"
                    className="comment-send-preview-card__text"
                    content={value}
                  />
                ) : null}
                {readyPreviewItems.filter((i) => i.status === 'ready').length > 0 ? (
                  <div className="comment-send-preview-card__media">
                    <SortableMediaPreviewGrid
                      items={readyPreviewItems.filter((i) => i.status === 'ready')}
                      onReorder={() => {}}
                      enabled={false}
                      showCaption={false}
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
            </div>
            <div className="comment-send-preview-sheet">
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
    <div className="comment-compose modal-comment-footer" ref={rootRef}>
      {replySlot}
      <form onSubmit={handleFormSubmit} className={formClassName}>
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

        <div className="comment-compose__field-col">
          <PostRichTextField
            ref={fieldRef}
            id={inputId}
            value={value}
            onChange={onChange}
            enableFrame={false}
            compact
            placeholder={placeholder}
            aria-label={placeholder}
            toolbarExtra={
              <AttachButtons
                variant="toolbar"
                visible={attachInToolbar}
                disabled={attachDisabled}
                flipGroup="comment-attach"
                onGallery={() => galleryInputRef.current?.click()}
                onCamera={() => cameraInputRef.current?.click()}
              />
            }
            editorEnd={
              <AttachButtons
                variant="field"
                visible={!attachInToolbar}
                disabled={attachDisabled}
                flipGroup="comment-attach"
                onGallery={() => galleryInputRef.current?.click()}
                onCamera={() => cameraInputRef.current?.click()}
              />
            }
          />

          {readyPreviewItems.length > 0 ? (
            <SortableMediaPreviewGrid
              items={readyPreviewItems}
              onReorder={(next) => {
                const byKey = new Map(mediaItems.map((item) => [item.key, item]));
                setMediaItems(next.map((item) => byKey.get(item.key)).filter(Boolean));
              }}
              className="comment-compose-media-grid"
              showCaption={false}
              getAction={(item) => (
                <button
                  type="button"
                  className="media-remove-btn comment-media-remove-btn"
                  onClick={() => removeMedia(item.key)}
                  aria-label={`Убрать ${item.name}`}
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            />
          ) : null}
        </div>

        <CommentSendButton
          disabled={!canSend && sendPhase !== 'flying'}
          busy={busy || sendPhase === 'flying'}
          phase={sendPhase}
          badgeCount={previewOpen ? mediaItems.filter((i) => i.status === 'ready').length : 0}
          className={previewOpen ? 'comment-send-btn--elevated' : undefined}
          {...(longPressEnabled ? longPressHandlers : {})}
          {...(previewOpen
            ? {
                onClick: (e) => {
                  e.preventDefault();
                  void runSend();
                }
              }
            : {})}
        />
        <LongPressRing {...ringProps} />
      </form>
      {previewOverlay}
    </div>
  );
}

export default CommentComposeForm;
