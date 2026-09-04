import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useLongPress, LongPressRing } from '../../lib/longPress';
import { listSystemTemplates, updateSystemTemplate } from '../../services/systemTemplates';
import { error } from '../../lib/log';
import './AdminPanelPage.css';
import './SystemTemplatesModal.css';

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 20h4.2L19.3 8.9a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
      <path d="m13.7 6.1 4.2 4.2" />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 2v10" strokeLinecap="round" />
      <path d="M6.3 6.3a8 8 0 1 0 11.4 0" strokeLinecap="round" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

/**
 * @param {{
 *   open: boolean,
 *   item: Record<string, unknown> | null,
 *   x: number,
 *   y: number,
 *   origin?: 'start' | 'end',
 *   onClose: () => void,
 *   onEdit: (item: Record<string, unknown>) => void,
 *   onToggle: (item: Record<string, unknown>) => void
 * }} props
 */
function TemplateActionsMenu({
  open,
  item,
  x,
  y,
  origin = 'start',
  onClose,
  onEdit,
  onToggle
}) {
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const itemRef = useRef(item);
  if (open && item) itemRef.current = item;

  useEffect(() => {
    if (open && item) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    return undefined;
  }, [open, item]);

  const handleTransitionEnd = useCallback(
    (event) => {
      if (event.target !== menuRef.current) return;
      if (event.propertyName !== 'opacity') return;
      if (open) return;
      setMounted(false);
    },
    [open]
  );

  if (!mounted || !itemRef.current) return null;

  const displayItem = itemRef.current;

  return createPortal(
    <div className="system-templates-menu-root">
      <button
        type="button"
        className={clsx(
          'system-templates-menu-backdrop',
          visible && 'system-templates-menu-backdrop--visible'
        )}
        aria-label="Закрыть меню"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className={clsx(
          'system-templates-menu',
          origin === 'end' && 'system-templates-menu--from-end',
          visible && 'system-templates-menu--visible'
        )}
        style={{
          left: Math.min(Math.max(8, x), window.innerWidth - 200),
          top: Math.min(Math.max(8, y), window.innerHeight - 120)
        }}
        role="menu"
        onTransitionEnd={handleTransitionEnd}
      >
        <button
          type="button"
          className="system-templates-menu__btn"
          onClick={() => onEdit(displayItem)}
        >
          <PencilIcon />
          Редактировать
        </button>
        <button
          type="button"
          className="system-templates-menu__btn"
          onClick={() => onToggle(displayItem)}
        >
          <PowerIcon />
          {displayItem.enabled === false ? 'Включить' : 'Отключить'}
        </button>
      </div>
    </div>,
    document.body
  );
}

/**
 * @param {{
 *   item: Record<string, unknown>,
 *   onTap: () => void,
 *   onLongPress: (point: { x: number, y: number }) => void
 * }} props
 */
function TemplateListButton({ item, onTap, onLongPress }) {
  const enabled = item.enabled !== false;
  const { handlers, ringProps } = useLongPress({
    onLongPress: (point) => onLongPress(point)
  });

  return (
    <>
      <button
        type="button"
        className={`admin-panel__item system-templates__item${enabled ? '' : ' system-templates__item--disabled'}`}
        {...handlers}
        onClick={(e) => {
          handlers.onClick?.(e);
          if (e.defaultPrevented) return;
          onTap();
        }}
      >
        {String(item.name || item.key || 'Шаблон')}
      </button>
      <LongPressRing {...ringProps} />
    </>
  );
}

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   channel: 'bot' | 'app',
 *   title: string
 * }} props
 */
export default function SystemTemplatesModal({ isOpen, onClose, channel, title }) {
  const { alert } = useAlertDialog();
  const kebabRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const [items, setItems] = useState(/** @type {Record<string, unknown>[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState(
    /** @type {null | { item: Record<string, unknown>, x: number, y: number, origin?: 'start' | 'end' }} */ (null)
  );
  const [infoItem, setInfoItem] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [editItem, setEditItem] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editAction, setEditAction] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listSystemTemplates(channel);
      setItems(list);
    } catch (err) {
      error('list system templates:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось загрузить шаблоны.' });
    } finally {
      setLoading(false);
    }
  }, [alert, channel]);

  useEffect(() => {
    if (!isOpen) {
      setMenu(null);
      setInfoItem(null);
      setEditItem(null);
      return;
    }
    load();
  }, [isOpen, load]);

  const closeMenu = useCallback(() => setMenu(null), []);

  const handleToggleEnabled = async (item) => {
    setMenu(null);
    const next = item.enabled === false;
    try {
      const updated = await updateSystemTemplate({
        id: String(item.id),
        enabled: next
      });
      setItems((prev) =>
        prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
      );
      setInfoItem((prev) =>
        prev && prev.id === updated.id ? { ...prev, ...updated } : prev
      );
    } catch (err) {
      error('toggle template:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось изменить статус.' });
    }
  };

  const openEdit = (item) => {
    setMenu(null);
    setEditItem(item);
    setEditTitle(String(item.title || ''));
    setEditBody(String(item.body || ''));
    setEditAction(String(item.action_label || ''));
  };

  const openHeaderMenu = () => {
    if (!infoItem) return;
    const rect = kebabRef.current?.getBoundingClientRect();
    if (rect) {
      setMenu({
        item: infoItem,
        x: rect.right - 188,
        y: rect.bottom + 6,
        origin: 'end'
      });
      return;
    }
    setMenu({
      item: infoItem,
      x: window.innerWidth - 208,
      y: 56,
      origin: 'end'
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editItem?.id || saving) return;
    setSaving(true);
    try {
      /** @type {{ id: string, title?: string, body?: string, action_label?: string }} */
      const patch = {
        id: String(editItem.id),
        body: editBody
      };
      if (channel === 'app') {
        patch.title = editTitle;
        patch.action_label = editAction;
      }
      const updated = await updateSystemTemplate(patch);
      setItems((prev) =>
        prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
      );
      setInfoItem((prev) =>
        prev && prev.id === updated.id ? { ...prev, ...updated } : prev
      );
      setEditItem(null);
    } catch (err) {
      error('save template:', err);
      await alert({ title: 'Ошибка', message: 'Не удалось сохранить.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="system-templates">
          {loading ? (
            <p className="system-templates__status">Загрузка…</p>
          ) : items.length === 0 ? (
            <p className="system-templates__status">Шаблоны не найдены. Перезапустите PocketBase после обновления схемы.</p>
          ) : (
            <ul className="admin-panel__list system-templates__list">
              {items.map((item) => (
                <li key={String(item.id || item.key)}>
                  <TemplateListButton
                    item={item}
                    onTap={() => setInfoItem(item)}
                    onLongPress={(point) => setMenu({ item, x: point.x, y: point.y, origin: 'start' })}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <TemplateActionsMenu
        open={Boolean(menu)}
        item={menu?.item ?? null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        origin={menu?.origin ?? 'start'}
        onClose={closeMenu}
        onEdit={openEdit}
        onToggle={handleToggleEnabled}
      />

      <Modal
        isOpen={Boolean(infoItem)}
        onClose={() => {
          setMenu(null);
          setInfoItem(null);
        }}
        title={String(infoItem?.name || 'Информация')}
        headerActions={(
          <IconButton
            ref={kebabRef}
            type="button"
            className="system-templates-kebab"
            ariaLabel="Действия с шаблоном"
            variant="ghost"
            onClick={openHeaderMenu}
          >
            <KebabIcon />
          </IconButton>
        )}
      >
        {infoItem && (
          <div className="system-templates-info">
            <p className="system-templates-info__label">Когда отправляется</p>
            <p>{String(infoItem.description || '—')}</p>
            {channel === 'app' && infoItem.title ? (
              <>
                <p className="system-templates-info__label">Заголовок</p>
                <p>{String(infoItem.title)}</p>
              </>
            ) : null}
            <p className="system-templates-info__label">Текст</p>
            <p className="system-templates-info__body">{String(infoItem.body || '—')}</p>
            {infoItem.action_label ? (
              <>
                <p className="system-templates-info__label">Кнопка / бейдж</p>
                <p>{String(infoItem.action_label)}</p>
              </>
            ) : null}
            <p className="system-templates-info__meta">
              Статус: {infoItem.enabled === false ? 'отключено' : 'включено'}
            </p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(editItem)}
        onClose={() => setEditItem(null)}
        title="Редактировать шаблон"
      >
        {editItem && (
          <form className="profile-edit-form" onSubmit={saveEdit}>
            {channel === 'app' && (
              <div className="form-group">
                <label htmlFor="tpl-title">Заголовок</label>
                <input
                  id="tpl-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="tpl-body">Текст</label>
              <textarea
                id="tpl-body"
                className="profile-reason-textarea"
                rows={5}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
              />
            </div>
            {channel === 'app' && (
              <div className="form-group">
                <label htmlFor="tpl-action">Текст кнопки / бейджа</label>
                <input
                  id="tpl-action"
                  value={editAction}
                  onChange={(e) => setEditAction(e.target.value)}
                />
              </div>
            )}
            <button type="submit" className="save-profile-btn" disabled={saving}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
