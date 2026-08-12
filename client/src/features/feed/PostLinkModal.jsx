import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from '../../components/ui/Modal';
import { normalizeHref } from './postRichText';

/**
 * Модалка вставки/правки гиперссылки в rich-text.
 * Рендерится в `document.body` (portal), без `<form>` — иначе внутри create/edit
 * вложенный submit уходит в родительскую форму и «публикует» пост / сбрасывает раздел.
 *
 * @param {{
 *   isOpen: boolean,
 *   initialTitle?: string,
 *   initialHref?: string,
 *   onClose: () => void,
 *   onSubmit: (payload: { title: string, href: string }) => void
 * }} props
 */
function PostLinkModal({
  isOpen,
  initialTitle = '',
  initialHref = '',
  onClose,
  onSubmit
}) {
  const titleId = useId();
  const hrefId = useId();
  const [title, setTitle] = useState(initialTitle);
  const [href, setHref] = useState(initialHref);
  const [hrefError, setHrefError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialTitle);
    setHref(initialHref);
    setHrefError('');
  }, [isOpen, initialTitle, initialHref]);

  const canSubmit = title.trim().length > 0 && href.trim().length > 0;

  const handleInsert = () => {
    if (!canSubmit) return;
    const normalized = normalizeHref(href);
    if (!normalized) {
      setHrefError('Введите корректную ссылку');
      return;
    }
    setHrefError('');
    onSubmit({ title: title.trim(), href: normalized });
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ссылка"
      size="default"
      overlayClassName="post-link-modal-overlay"
    >
      <div className="post-link-form">
        <label htmlFor={titleId} className="post-link-form__label">
          Название ссылки
        </label>
        <input
          id={titleId}
          type="text"
          className="post-link-form__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Текст ссылки"
          autoComplete="off"
          autoFocus
        />

        <label htmlFor={hrefId} className="post-link-form__label">
          Ссылка
        </label>
        <input
          id={hrefId}
          type="text"
          className="post-link-form__input"
          value={href}
          onChange={(e) => {
            setHref(e.target.value);
            if (hrefError) setHrefError('');
          }}
          placeholder="example.com или https://…"
          autoComplete="off"
          inputMode="url"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleInsert();
            }
          }}
        />
        {hrefError ? <p className="post-link-form__error">{hrefError}</p> : null}

        <div className="modal-actions post-link-form__actions">
          <button type="button" className="post-link-form__cancel" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="submit-btn-full post-link-form__submit"
            disabled={!canSubmit}
            onClick={handleInsert}
          >
            Вставить
          </button>
        </div>
      </div>
    </Modal>,
    document.body
  );
}

export default PostLinkModal;
