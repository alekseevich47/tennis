import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import PostContentHtml from './PostContentHtml';
import MediaPreviewGrid from './MediaPreviewGrid';
import { hasVisibleText } from './postRichText';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import './Feed.css';

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3.5v3M17 3.5v3M4.5 8.5h15M6 5.5h12a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5z"
      />
    </svg>
  );
}

function MoveTextIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 7h12v2H4V7zm0 4h16v2H4v-2zm0 4h10v2H4v-2zm14-9v10l5-5-5-5z"
      />
    </svg>
  );
}

/**
 * Long-press меню «Опубликовать» / «Сохранить»: превью + перенос текста (+ опционально отправить позже).
 *
 * @param {{
 *   isOpen: boolean,
 *   text: string,
 *   previewItems: Array<{ key: string, url: string, name: string, isVideo?: boolean }>,
 *   captionAbove: boolean,
 *   canMoveText: boolean,
 *   publishLabel?: string,
 *   showSendLater?: boolean,
 *   onToggleCaption: () => void,
 *   onSendLater?: () => void,
 *   onPublishNow: () => void,
 *   onClose: () => void
 * }} props
 */
export default function PublishLongPressMenu({
  isOpen,
  text,
  previewItems,
  captionAbove,
  canMoveText,
  publishLabel = 'Опубликовать',
  showSendLater = true,
  onToggleCaption,
  onSendLater,
  onPublishNow,
  onClose
}) {
  const [visible, setVisible] = useState(false);
  useOverlayClose(isOpen, onClose, 'publish-long-press');

  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const showText = hasVisibleText(text);
  const showMedia = previewItems.length > 0;
  const showSheet = canMoveText || (showSendLater && typeof onSendLater === 'function');

  return createPortal(
    <div
      className={clsx('comment-send-preview-overlay publish-longpress-overlay', visible && 'is-visible')}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="comment-send-preview-stage publish-longpress-stage"
        role="dialog"
        aria-label="Предпросмотр публикации"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="comment-send-preview-card publish-longpress-card">
          {captionAbove && showText ? (
            <PostContentHtml as="div" className="comment-send-preview-card__text" content={text} />
          ) : null}
          {showMedia ? (
            <div className="comment-send-preview-card__media">
              <MediaPreviewGrid
                items={previewItems}
                className="publish-longpress-media-grid"
                showCaption={false}
              />
            </div>
          ) : null}
          {!captionAbove && showText ? (
            <PostContentHtml as="div" className="comment-send-preview-card__text" content={text} />
          ) : null}
        </div>
        <button
          type="button"
          className="submit-btn-full publish-longpress-publish"
          onClick={(e) => {
            e.stopPropagation();
            onPublishNow();
          }}
        >
          {publishLabel}
        </button>
      </div>

      {showSheet ? (
        <div className="comment-send-preview-sheet" onClick={(e) => e.stopPropagation()}>
          {canMoveText ? (
            <button
              type="button"
              className="comment-send-preview-sheet__action"
              onClick={onToggleCaption}
            >
              <span className="comment-send-preview-sheet__icon" aria-hidden="true">
                <MoveTextIcon />
              </span>
              <span>{captionAbove ? 'Перенести текст вниз' : 'Перенести текст наверх'}</span>
            </button>
          ) : null}
          {showSendLater && typeof onSendLater === 'function' ? (
            <button
              type="button"
              className="comment-send-preview-sheet__action"
              onClick={onSendLater}
            >
              <span className="comment-send-preview-sheet__icon" aria-hidden="true">
                <CalendarIcon />
              </span>
              <span>Отправить позже</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>,
    document.body
  );
}
