import React, { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import {
  createProductParamTemplate,
  deleteProductParamTemplate,
  updateProductParamTemplate
} from '../../services/catalog';
import { useProductParamTemplates } from '../../hooks/useProductParamTemplates';

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
function ProductParamTemplatesModal({ isOpen, onClose }) {
  const { confirm } = useAlertDialog();
  const { data: templates = [], mutate } = useProductParamTemplates();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setNewName('');
      setEditingId('');
      setEditingName('');
    }
  }, [isOpen]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await createProductParamTemplate({ name, sort_order: templates.length });
      setNewName('');
      await mutate();
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (template) => {
    setEditingId(template.id);
    setEditingName(template.name);
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditingName('');
  };

  const saveEdit = async () => {
    const name = editingName.trim();
    if (!editingId || !name || busy) return;
    setBusy(true);
    try {
      await updateProductParamTemplate(editingId, { name });
      cancelEdit();
      await mutate();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (template) => {
    const ok = await confirm({
      title: 'Удалить шаблон?',
      message: `«${template.name}» будет удалён.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      confirmVariant: 'danger'
    });
    if (!ok || busy) return;
    setBusy(true);
    try {
      await deleteProductParamTemplate(template.id);
      if (editingId === template.id) cancelEdit();
      await mutate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Шаблоны параметров">
      <div className="product-param-templates">
        <form className="product-param-templates__create" onSubmit={handleCreate}>
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Новый шаблон"
            aria-label="Название нового шаблона"
          />
          <button type="submit" disabled={!newName.trim() || busy}>
            Создать
          </button>
        </form>

        <ul className="product-param-templates__list">
          {templates.map((template) => (
            <li key={template.id} className="product-param-templates__item">
              {editingId === template.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    aria-label="Редактировать шаблон"
                  />
                  <div className="product-param-templates__actions">
                    <button type="button" onClick={saveEdit} disabled={busy}>Сохранить</button>
                    <button type="button" className="is-ghost" onClick={cancelEdit}>Отмена</button>
                  </div>
                </>
              ) : (
                <>
                  <span>{template.name}</span>
                  <div className="product-param-templates__actions">
                    <button type="button" onClick={() => startEdit(template)}>Изменить</button>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => handleDelete(template)}
                      disabled={busy}
                    >
                      Удалить
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {templates.length === 0 && (
            <li className="product-param-templates__empty">Шаблонов пока нет</li>
          )}
        </ul>
      </div>
    </Modal>
  );
}

export default ProductParamTemplatesModal;
