import React, { useEffect, useId, useState } from 'react';
import Modal from '../../components/ui/Modal';

/**
 * Модалка вставки/правки гиперссылки в rich-text.
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

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialTitle);
    setHref(initialHref);
  }, [isOpen, initialTitle, initialHref]);

  const canSubmit = title.trim().length > 0 && href.trim().length > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ title: title.trim(), href: href.trim() });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ссылка"
      size="default"
      overlayClassName="post-link-modal-overlay"
    >
      <form onSubmit={handleSubmit} className="post-link-form">
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
          type="url"
          className="post-link-form__input"
          value={href}
          onChange={(e) => setHref(e.target.value)}
          placeholder="https://…"
          autoComplete="off"
          inputMode="url"
        />

        <div className="modal-actions post-link-form__actions">
          <button type="button" className="post-link-form__cancel" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="submit-btn-full post-link-form__submit" disabled={!canSubmit}>
            Вставить
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default PostLinkModal;
