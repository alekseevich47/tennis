import React, { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import AvatarCropModal from '../../components/AvatarCropModal';
import { exportAvatarFile } from '../../lib/avatar';
import { error } from '../../lib/log';

const INITIAL = {
  name: '',
  birth_date: '',
  dominant_hand: 'Правая',
  rating_points: '0',
  avatar: /** @type {File | null} */ (null)
};

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSubmit: (data: FormData) => Promise<void> | void
 * }} props
 */
function PlayerForm({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(/** @type {File | null} */ (null));
  const [cropModalOpen, setCropModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) return;
    setForm(INITIAL);
    setPendingAvatarFile(null);
    setCropModalOpen(false);
    setSubmitting(false);
  }, [isOpen]);

  const updateField = (key) => (value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAvatarPick = (file) => {
    if (!file) {
      setForm((prev) => ({ ...prev, avatar: null }));
      return;
    }
    setPendingAvatarFile(file);
    setCropModalOpen(true);
  };

  const handleAvatarCropConfirm = async (croppedBlob) => {
    try {
      const nextAvatarFile = await exportAvatarFile(croppedBlob);
      setForm((prev) => ({ ...prev, avatar: nextAvatarFile }));
    } catch (err) {
      error('export player avatar:', err);
      setForm((prev) => ({
        ...prev,
        avatar: new File([croppedBlob], 'avatar.png', { type: 'image/png' })
      }));
    }
    setPendingAvatarFile(null);
    setCropModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('full_name', form.name);
      data.append('birth_date', form.birth_date);
      data.append('dominant_hand', form.dominant_hand);
      data.append('rating_points', String(parseInt(form.rating_points, 10) || 0));
      if (form.avatar) data.append('avatar', form.avatar);
      await onSubmit(data);
      setForm(INITIAL);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Добавить игрока">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="player-name">Фамилия Имя</label>
            <input
              id="player-name"
              type="text"
              value={form.name}
              onChange={(e) => updateField('name')(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="player-birth-date">Дата рождения</label>
            <input
              id="player-birth-date"
              type="date"
              value={form.birth_date}
              onChange={(e) => updateField('birth_date')(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="player-hand">Ведущая рука</label>
            <select
              id="player-hand"
              value={form.dominant_hand}
              onChange={(e) => updateField('dominant_hand')(e.target.value)}
            >
              <option value="Правая">Правая</option>
              <option value="Левая">Левая</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="player-rating">Рейтинговые очки</label>
            <input
              id="player-rating"
              type="number"
              value={form.rating_points}
              onChange={(e) => updateField('rating_points')(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="player-avatar">Аватар</label>
            <input
              id="player-avatar"
              type="file"
              accept="image/*"
              onChange={(e) => {
                handleAvatarPick(e.target.files?.[0] ?? null);
                e.currentTarget.value = '';
              }}
            />
            {form.avatar ? (
              <span className="avatar-pick-name">{form.avatar.name}</span>
            ) : null}
          </div>

          <button type="submit" className="submit-btn-full" disabled={submitting}>
            {submitting ? 'Сохраняем...' : 'Создать'}
          </button>
        </form>
      </Modal>

      <AvatarCropModal
        isOpen={cropModalOpen}
        file={pendingAvatarFile}
        onConfirm={handleAvatarCropConfirm}
        onCancel={() => {
          setPendingAvatarFile(null);
          setCropModalOpen(false);
        }}
      />
    </>
  );
}

export default PlayerForm;
