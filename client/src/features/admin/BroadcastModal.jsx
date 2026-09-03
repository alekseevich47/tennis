import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import UserMultiSelect from './UserMultiSelect';
import SortableMediaPreviewGrid from '../feed/SortableMediaPreviewGrid';
import PostAttachButton from '../feed/PostAttachButton';
import PostRichTextField from '../feed/PostRichTextField';
import PostContentHtml from '../feed/PostContentHtml';
import pb from '../../services/pb';
import {
  listScheduledBroadcasts,
  createScheduledBroadcast,
  updateScheduledBroadcast,
  cancelScheduledBroadcast,
  toDatetimeLocalValue
} from '../../services/admin';
import { formatPostDate } from '../../lib/format';
import { error } from '../../lib/log';
import { compressImage } from '../../lib/compress';
import { MEDIA_BASE_URL } from '../../config';
import { mediaNames, readSelectedFiles } from '../../lib/media';
import { hasVisibleText } from '../feed/postRichText';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { buildSendResultAlert, formatAdminSaveError } from './adminResultAlert';
import './BroadcastModal.css';
import '../feed/Feed.css';

const MAX_BROADCAST_MEDIA_FILES = 5;

function defaultDatetimeLocal() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getAudienceLabel(audience) {
  if (audience === 'all') return 'Все';
  if (audience === 'all_except_banned') return 'Все, кроме заблокированных';
  return 'Выбранные';
}

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
export default function BroadcastModal({ isOpen, onClose }) {
  const { alert } = useAlertDialog();
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [text, setText] = useState('');
  const [audience, setAudience] = useState('all');
  const [recipients, setRecipients] = useState([]);
  const [scheduledAt, setScheduledAt] = useState(defaultDatetimeLocal);
  const [sendNow, setSendNow] = useState(false);
  const [pending, setPending] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [imageFiles, setImageFiles] = useState(/** @type {File[]} */ ([]));
  const [existingMedia, setExistingMedia] = useState(/** @type {string[]} */ ([]));
  const [mediaToDelete, setMediaToDelete] = useState(/** @type {string[]} */ ([]));

  const resetForm = useCallback(() => {
    setText('');
    setAudience('all');
    setRecipients([]);
    setScheduledAt(defaultDatetimeLocal());
    setSendNow(false);
    setEditingId(null);
    setFormError('');
    setFormNotice('');
    setImageFiles([]);
    setExistingMedia([]);
    setMediaToDelete([]);
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const items = await listScheduledBroadcasts();
      setPending(items);
      setEditingId((prevId) => {
        if (prevId && !items.some((item) => item.id === prevId)) {
          // Рассылка уже отправлена (сработал крон/ручная отправка) — редактировать больше нечего.
          setFormNotice('Эта рассылка уже была отправлена, форма переключена в режим создания новой.');
          return null;
        }
        return prevId;
      });
      return items;
    } catch (err) {
      error('load scheduled broadcasts:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }
    loadPending();
  }, [isOpen, resetForm, loadPending]);

  // Real-time удаление из списка запланированных рассылок, когда рассылка
  // отправляется кроном или другим администратором, пока модалка открыта.
  useEffect(() => {
    if (!isOpen) return undefined;

    pb.collection('scheduled_broadcasts')
      .subscribe('*', () => {
        loadPending();
      })
      .catch((err) => {
        error('subscribe scheduled broadcasts:', err);
      });

    return () => {
      pb.collection('scheduled_broadcasts').unsubscribe('*');
    };
  }, [isOpen, loadPending]);

  const handleAudienceChange = useCallback((value) => {
    setAudience(value.audience);
    setRecipients(value.recipients);
  }, []);

  const handleEdit = useCallback((item) => {
    setEditingId(item.id);
    setText(item.text || '');
    setAudience(item.audience || 'all');
    setRecipients(Array.isArray(item.recipients) ? item.recipients : []);
    setScheduledAt(toDatetimeLocalValue(item.scheduled_at) || defaultDatetimeLocal());
    setSendNow(false);
    setFormError('');
    setFormNotice('');
    setImageFiles([]);
    setExistingMedia(mediaNames(item.media));
    setMediaToDelete([]);
  }, []);

  const keptExistingCount = existingMedia.length - mediaToDelete.length;
  const remainingImageSlots = Math.max(0, MAX_BROADCAST_MEDIA_FILES - keptExistingCount - imageFiles.length);

  const previewItems = useMemo(() => {
    const existing = existingMedia
      .filter((filename) => !mediaToDelete.includes(filename))
      .map((filename) => ({
        key: `existing-${filename}`,
        url: `${MEDIA_BASE_URL}/scheduled_broadcasts/${editingId}/${filename}`,
        name: filename,
        isVideo: false,
        status: 'ready'
      }));
    const incoming = imageFiles.map((file) => ({
      key: `${file.name}-${file.lastModified}`,
      url: URL.createObjectURL(file),
      name: file.name,
      isVideo: false,
      status: 'ready'
    }));
    return [...existing, ...incoming];
  }, [existingMedia, mediaToDelete, imageFiles, editingId]);

  useEffect(() => {
    const incoming = previewItems.filter((item) => !item.key.startsWith('existing-'));
    return () => incoming.forEach((item) => URL.revokeObjectURL(item.url));
  }, [previewItems]);

  const handleAddImages = useCallback(
    async (event) => {
      const incoming = readSelectedFiles(event.target.files, remainingImageSlots);
      event.currentTarget.value = '';
      if (!incoming.length) return;
      const compressed = await Promise.all(incoming.map((file) => compressImage(file)));
      setImageFiles((current) =>
        [...current, ...compressed].slice(0, MAX_BROADCAST_MEDIA_FILES - keptExistingCount)
      );
    },
    [keptExistingCount, remainingImageSlots]
  );

  const handleAttachClick = useCallback(() => {
    if (remainingImageSlots <= 0) return;
    fileInputRef.current?.click();
  }, [remainingImageSlots]);

  const handleReorderPreview = useCallback((next) => {
    const nextExistingKept = [];
    const nextFiles = [];
    const fileByKey = new Map(
      imageFiles.map((file) => [`${file.name}-${file.lastModified}`, file])
    );
    next.forEach((item) => {
      if (String(item.key).startsWith('existing-')) {
        nextExistingKept.push(item.name);
        return;
      }
      const file = fileByKey.get(item.key);
      if (file) nextFiles.push(file);
    });
    setExistingMedia((prev) => {
      const deleted = prev.filter((name) => mediaToDelete.includes(name));
      return [...nextExistingKept, ...deleted];
    });
    setImageFiles(nextFiles);
  }, [imageFiles, mediaToDelete]);

  const handleEditClick = useCallback(
    async (item) => {
      await alert({
        title: 'Редактирование рассылки',
        message: `Вы редактируете уже запланированную рассылку (${formatPostDate(item.scheduled_at)}, ${getAudienceLabel(item.audience)}), а не создаёте новую. Внесите изменения в форму выше и сохраните их.`
      });
      handleEdit(item);
    },
    [alert, handleEdit]
  );

  const handleCancel = useCallback(
    async (id) => {
      try {
        await cancelScheduledBroadcast(id);
        if (editingId === id) resetForm();
        await loadPending();
      } catch (err) {
        error('cancel broadcast:', err);
      }
    },
    [editingId, resetForm, loadPending]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!hasVisibleText(text)) {
      setFormError('Введите текст рассылки');
      return;
    }
    if (!sendNow && !scheduledAt) {
      setFormError('Укажите дату и время отправки');
      return;
    }
    if (audience === 'selected' && recipients.length === 0) {
      setFormError('Выберите хотя бы одного получателя');
      return;
    }

    setSubmitting(true);
    setFormError('');

    const payload = {
      text,
      audience,
      recipients,
      sendNow,
      scheduledAt,
      files: imageFiles,
      mediaToDelete
    };

    const wasEditing = Boolean(editingId);

    try {
      const result = wasEditing
        ? await updateScheduledBroadcast(editingId, payload)
        : await createScheduledBroadcast(payload);
      resetForm();
      await loadPending();
      const { title, message } = buildSendResultAlert({
        kind: 'broadcast',
        editing: wasEditing,
        result
      });
      await alert({ title, message });
    } catch (err) {
      error('save broadcast:', err);
      const message = formatAdminSaveError(
        err,
        'Не удалось сохранить рассылку. Проверьте подключение и попробуйте ещё раз.'
      );
      setFormError(message);
      await alert({
        title: 'Рассылка',
        message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = submitting
    ? 'Сохраняем...'
    : sendNow
      ? 'Отправить'
      : editingId
        ? 'Сохранить изменения'
        : 'Запланировать';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Сделать рассылку"
      size="large"
      footer={
        <button
          type="submit"
          form="broadcast-form"
          className="submit-btn-full"
          disabled={submitting}
        >
          {submitLabel}
        </button>
      }
    >
      <form id="broadcast-form" onSubmit={handleSubmit}>
        {formError && <p className="admin-modal__error">{formError}</p>}
        {!formError && formNotice && <p className="admin-modal__notice">{formNotice}</p>}

        <div className="admin-modal__field">
          <label className="admin-modal__label" htmlFor="broadcast-text">
            Текст рассылки
          </label>
          <PostRichTextField
            id="broadcast-text"
            value={text}
            onChange={setText}
            placeholder="Текст сообщения в MAX..."
            aria-label="Текст рассылки"
            enableFrame={false}
            compact
            revealToolbarOnFocus
          />
        </div>

        <div className="admin-modal__field">
          <span className="admin-modal__label">Фотографии</span>
          <input
            ref={fileInputRef}
            id="broadcast-media"
            type="file"
            accept="image/*,.gif"
            multiple
            disabled={remainingImageSlots === 0}
            onChange={(e) => {
              void handleAddImages(e);
            }}
            className="visually-hidden"
          />
          {previewItems.length > 0 ? (
            <div className="create-post-media-strip-wrap">
              <SortableMediaPreviewGrid
                items={previewItems}
                layout="strip"
                className="create-post-preview-strip broadcast-modal-preview-grid"
                onReorder={handleReorderPreview}
                getAction={(item) => (
                  <button
                    type="button"
                    className="media-remove-btn comment-media-remove-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (String(item.key).startsWith('existing-')) {
                        const filename = item.key.slice('existing-'.length);
                        setMediaToDelete((current) =>
                          current.includes(filename) ? current : [...current, filename]
                        );
                        return;
                      }
                      setImageFiles((current) =>
                        current.filter((file) => `${file.name}-${file.lastModified}` !== item.key)
                      );
                    }}
                    aria-label={`Убрать файл ${item.name}`}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                )}
              />
            </div>
          ) : null}
          <div className="broadcast-modal-attach-row">
            <PostAttachButton
              disabled={remainingImageSlots === 0}
              onClick={handleAttachClick}
            />
            <span className="file-name-preview">
              До {MAX_BROADCAST_MEDIA_FILES} фото
              {imageFiles.length > 0 ? ` · выбрано: ${imageFiles.length}` : ''}
            </span>
          </div>
        </div>

        <div className="admin-modal__field">
          <span className="admin-modal__label">Получатели</span>
          <UserMultiSelect
            audience={audience}
            recipients={recipients}
            onChange={handleAudienceChange}
          />
        </div>

        <div className="admin-modal__field">
          <span className="admin-modal__label">Дата и время отправки</span>
          <div className="admin-modal__schedule">
            <input
              type="datetime-local"
              className="admin-modal__datetime"
              value={scheduledAt}
              disabled={sendNow}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
            <label className="admin-modal__now">
              <input
                type="checkbox"
                checked={sendNow}
                onChange={(event) => setSendNow(event.target.checked)}
              />
              Сейчас
            </label>
          </div>
        </div>
      </form>

      <div className="admin-modal__pending">
        <h3 className="admin-modal__pending-title">Запланированные рассылки</h3>
        {pending.length === 0 ? (
          <p className="admin-modal__empty">Нет запланированных рассылок</p>
        ) : (
          <ul className="admin-modal__pending-list">
            {pending.map((item) => (
              <li key={item.id} className="admin-modal__pending-item">
                <div className="admin-modal__pending-text">
                  <PostContentHtml
                    as="div"
                    className="admin-modal__pending-body-html"
                    content={item.text || ''}
                  />
                  <span className="admin-modal__pending-meta">
                    {formatPostDate(item.scheduled_at)} · {getAudienceLabel(item.audience)}
                  </span>
                </div>
                <div className="admin-modal__pending-actions">
                  <button
                    type="button"
                    className="admin-modal__action-btn"
                    onClick={() => handleEditClick(item)}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="admin-modal__action-btn admin-modal__action-btn--danger"
                    onClick={() => handleCancel(item.id)}
                  >
                    Отменить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
