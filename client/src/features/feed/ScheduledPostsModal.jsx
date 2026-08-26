import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useToast } from '../../components/ui/ToastContext';
import PostContentHtml from './PostContentHtml';
import PostMedia from './PostMedia';
import ScheduleDateTimeSheet from './ScheduleDateTimeSheet';
import {
  formatScheduleDispatchHeading,
  formatScheduleTimeBadge
} from '../../lib/format';
import { toPlainText } from './postRichText';
import { useLongPress, LongPressRing } from '../../lib/longPress';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import { error } from '../../lib/log';
import './Feed.css';

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.2 11.05 20.4 3.7a1 1 0 0 1 1.35 1.18L15.9 20.7a1 1 0 0 1-1.82.18l-3.2-6.05-6.2-1.55a1 1 0 0 1-.48-1.63Zm3.6.45 4.55 1.14 2.35 4.45 4.15-12.35-11.05 6.76Z"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 8.5V6.2A1.7 1.7 0 0 1 9.7 4.5h8.1A1.7 1.7 0 0 1 19.5 6.2v8.1a1.7 1.7 0 0 1-1.7 1.7H15.5M6.2 8.5h8.1A1.7 1.7 0 0 1 16 10.2v8.1a1.7 1.7 0 0 1-1.7 1.7H6.2A1.7 1.7 0 0 1 4.5 18.3v-8.1A1.7 1.7 0 0 1 6.2 8.5z"
      />
    </svg>
  );
}

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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
      />
    </svg>
  );
}

/**
 * @param {{
 *   post: any,
 *   collection: 'posts' | 'tournament_posts',
 *   onOpenMenu: (post: any, point: { x: number, y: number }) => void
 * }} props
 */
function ScheduledPostRow({ post, collection, onOpenMenu }) {
  const captionAbove = post.caption_above !== false;
  const content = post.content || post.text || '';

  const { handlers, ringProps } = useLongPress({
    enabled: true,
    onLongPress: (point) => onOpenMenu(post, point),
    durationMs: 450
  });

  return (
    <>
      <article className="scheduled-post-card" {...handlers}>
        <div className="scheduled-post-card__meta">
          <span className="scheduled-post-card__heading">
            {formatScheduleDispatchHeading(post.scheduled_at)}
          </span>
          <span className="scheduled-post-card__time">
            {formatScheduleTimeBadge(post.scheduled_at)}
          </span>
        </div>
        <div className="scheduled-post-card__preview">
          {captionAbove && content ? (
            <PostContentHtml as="div" className="scheduled-post-card__text" content={content} />
          ) : null}
          <PostMedia post={post} collection={collection} variant="card" className="scheduled-post-card__media" />
          {!captionAbove && content ? (
            <PostContentHtml as="div" className="scheduled-post-card__text" content={content} />
          ) : null}
        </div>
      </article>
      <LongPressRing {...ringProps} />
    </>
  );
}

/**
 * @param {{
 *   isOpen: boolean,
 *   anchorPoint: { x: number, y: number } | null,
 *   onClose: () => void,
 *   onSendNow: () => void,
 *   onEdit: () => void,
 *   onCopy: () => void,
 *   onChangeTime: () => void,
 *   onDelete: () => void
 * }} props
 */
function ScheduledPostActionsMenu({
  isOpen,
  anchorPoint,
  onClose,
  onSendNow,
  onEdit,
  onCopy,
  onChangeTime,
  onDelete
}) {
  const [visible, setVisible] = useState(false);
  useOverlayClose(isOpen, onClose, 'scheduled-post-actions');

  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const style = anchorPoint
    ? {
        left: Math.min(window.innerWidth - 220, Math.max(12, anchorPoint.x - 40)),
        top: Math.min(window.innerHeight - 280, Math.max(12, anchorPoint.y - 20))
      }
    : undefined;

  return createPortal(
    <div
      className={clsx('scheduled-post-menu-overlay', visible && 'is-visible')}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="comment-send-preview-sheet scheduled-post-menu"
        style={style}
        role="menu"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="comment-send-preview-sheet__action" role="menuitem" onClick={onSendNow}>
          <span className="comment-send-preview-sheet__icon"><PlaneIcon /></span>
          <span>Отправить сейчас</span>
        </button>
        <button type="button" className="comment-send-preview-sheet__action" role="menuitem" onClick={onEdit}>
          <span className="comment-send-preview-sheet__icon"><PencilIcon /></span>
          <span>Редактировать</span>
        </button>
        <button type="button" className="comment-send-preview-sheet__action" role="menuitem" onClick={onCopy}>
          <span className="comment-send-preview-sheet__icon"><CopyIcon /></span>
          <span>Копировать</span>
        </button>
        <button type="button" className="comment-send-preview-sheet__action" role="menuitem" onClick={onChangeTime}>
          <span className="comment-send-preview-sheet__icon"><CalendarIcon /></span>
          <span>Изменить время</span>
        </button>
        <button
          type="button"
          className="comment-send-preview-sheet__action comment-send-preview-sheet__action--danger"
          role="menuitem"
          onClick={onDelete}
        >
          <span className="comment-send-preview-sheet__icon"><TrashIcon /></span>
          <span>Удалить</span>
        </button>
      </div>
    </div>,
    document.body
  );
}

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   kind: 'posts' | 'tournament_posts',
 *   items: any[],
 *   onMutate: () => void,
 *   onEditPost: (post: any) => void,
 *   publishNow: (id: string) => Promise<unknown>,
 *   reschedule: (id: string, iso: string) => Promise<unknown>,
 *   remove: (id: string) => Promise<unknown>
 * }} props
 */
export default function ScheduledPostsModal({
  isOpen,
  onClose,
  kind,
  items,
  onMutate,
  onEditPost,
  publishNow,
  reschedule,
  remove
}) {
  const { confirm } = useAlertDialog();
  const { showToast } = useToast();
  const [menuPost, setMenuPost] = useState(null);
  const [menuPoint, setMenuPoint] = useState(null);
  const [reschedulePost, setReschedulePost] = useState(null);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      ),
    [items]
  );

  const closeMenu = useCallback(() => {
    setMenuPost(null);
    setMenuPoint(null);
  }, []);

  const handleOpenMenu = useCallback((post, point) => {
    setMenuPost(post);
    setMenuPoint(point || null);
  }, []);

  const handleCopy = useCallback(async () => {
    const text = toPlainText(menuPost?.content || menuPost?.text || '');
    closeMenu();
    try {
      await navigator.clipboard.writeText(text);
      showToast({ text: 'Текст скопирован' });
    } catch (err) {
      error('clipboard copy scheduled post:', err);
      showToast({ text: 'Не удалось скопировать' });
    }
  }, [menuPost, closeMenu, showToast]);

  const handleSendNow = useCallback(async () => {
    const id = menuPost?.id;
    closeMenu();
    if (!id) return;
    try {
      await publishNow(id);
      onMutate();
      showToast({ text: 'Публикация отправлена' });
    } catch (err) {
      error('publish scheduled now:', err);
      showToast({ text: 'Не удалось отправить' });
    }
  }, [menuPost, closeMenu, publishNow, onMutate, showToast]);

  const handleEdit = useCallback(() => {
    const post = menuPost;
    closeMenu();
    if (post) onEditPost(post);
  }, [menuPost, closeMenu, onEditPost]);

  const handleChangeTime = useCallback(() => {
    const post = menuPost;
    closeMenu();
    if (post) setReschedulePost(post);
  }, [menuPost, closeMenu]);

  const handleDelete = useCallback(async () => {
    const post = menuPost;
    closeMenu();
    if (!post?.id) return;
    const ok = await confirm({
      title: 'Удалить запланированную публикацию?',
      message: 'Публикация будет удалена из очереди и не отправится.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      confirmVariant: 'danger'
    });
    if (!ok) return;
    try {
      await remove(post.id);
      onMutate();
      showToast({ text: 'Публикация удалена' });
    } catch (err) {
      error('delete scheduled post:', err);
      showToast({ text: 'Не удалось удалить' });
    }
  }, [menuPost, closeMenu, confirm, remove, onMutate, showToast]);

  const handleRescheduleConfirm = useCallback(
    async (date) => {
      const post = reschedulePost;
      setReschedulePost(null);
      if (!post?.id) return;
      try {
        await reschedule(post.id, date.toISOString());
        onMutate();
        showToast({ text: 'Время обновлено' });
      } catch (err) {
        error('reschedule post:', err);
        showToast({ text: 'Не удалось изменить время' });
      }
    },
    [reschedulePost, reschedule, onMutate, showToast]
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Запланированные"
        className="scheduled-posts-modal"
      >
        {sorted.length === 0 ? (
          <p className="scheduled-posts-empty">Нет запланированных публикаций</p>
        ) : (
          <div className="scheduled-posts-list">
            {sorted.map((post) => (
              <ScheduledPostRow
                key={post.id}
                post={post}
                collection={kind}
                onOpenMenu={handleOpenMenu}
              />
            ))}
          </div>
        )}
      </Modal>

      <ScheduledPostActionsMenu
        isOpen={Boolean(menuPost)}
        anchorPoint={menuPoint}
        onClose={closeMenu}
        onSendNow={() => void handleSendNow()}
        onEdit={handleEdit}
        onCopy={() => void handleCopy()}
        onChangeTime={handleChangeTime}
        onDelete={() => void handleDelete()}
      />

      <ScheduleDateTimeSheet
        isOpen={Boolean(reschedulePost)}
        initialDate={reschedulePost?.scheduled_at ? new Date(reschedulePost.scheduled_at) : null}
        onClose={() => setReschedulePost(null)}
        onConfirm={(date) => void handleRescheduleConfirm(date)}
      />
    </>
  );
}
