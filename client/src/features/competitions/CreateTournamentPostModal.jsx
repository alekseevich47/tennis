import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useToast } from '../../components/ui/ToastContext';
import MediaPreviewGrid from '../feed/MediaPreviewGrid';
import { compressImage } from '../../lib/compress';
import {
  MAX_POST_MEDIA_FILES,
  isVideoFile,
  readSelectedFiles
} from '../../lib/media';
import { publishTournamentPost } from '../../services/tournamentPosts';
import { error } from '../../lib/log';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   players: any[],
 *   onCreated: () => void
 * }} props
 */
function CreateTournamentPostModal({ isOpen, onClose, players, onCreated }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState(/** @type {File[]} */ ([]));
  const [previewItems, setPreviewItems] = useState([]);
  const [search, setSearch] = useState('');
  const [pointsByUserId, setPointsByUserId] = useState(/** @type {Record<string, string>} */ ({}));
  const [popupPlayerId, setPopupPlayerId] = useState(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [submitting, setSubmitting] = useState(false);
  const popupRef = useRef(null);
  const { confirm } = useAlertDialog();
  const { showToast } = useToast();

  useEffect(() => {
    const items = files.map((file) => ({
      key: `${file.name}-${file.lastModified}`,
      url: URL.createObjectURL(file),
      name: file.name,
      isVideo: isVideoFile(file)
    }));
    setPreviewItems(items);
    return () => items.forEach((item) => URL.revokeObjectURL(item.url));
  }, [files]);

  const reset = () => {
    setText('');
    setFiles([]);
    setSearch('');
    setPointsByUserId({});
    setPopupPlayerId(null);
  };

  const handleClose = async () => {
    if (text.trim() || files.length > 0 || Object.keys(pointsByUserId).length > 0) {
      const ok = await confirm({
        title: 'Отменить публикацию?',
        message: 'Введённые данные будут потеряны.',
        confirmText: 'Отменить',
        cancelText: 'Продолжить'
      });
      if (!ok) return;
    }
    reset();
    onClose();
  };

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players.filter((player) => {
      const fullName = player.full_name || '';
      return !query || fullName.toLowerCase().includes(query);
    });
  }, [players, search]);

  const selectedParticipants = useMemo(() => {
    return Object.entries(pointsByUserId)
      .map(([userId, value]) => ({
        userId,
        points: Number(value),
        fullName: players.find((player) => player.id === userId)?.full_name || ''
      }))
      .filter((item) => Number.isFinite(item.points) && item.points >= 0);
  }, [pointsByUserId, players]);

  const updatePopupPos = (playerId) => {
    const row = document.querySelector(`[data-player-id="${playerId}"]`);
    if (row) {
      const rect = row.getBoundingClientRect();
      setPopupPos({ top: rect.top, left: rect.right });
    }
  };

  const handleTogglePlayer = (playerId, checked) => {
    if (!checked && popupPlayerId === playerId) {
      setPopupPlayerId(null);
    }

    setPointsByUserId((current) => {
      const next = { ...current };
      if (checked) {
        next[playerId] = current[playerId] ?? '0';
      } else {
        delete next[playerId];
      }
      return next;
    });

    if (checked) {
      updatePopupPos(playerId);
      setPopupPlayerId(playerId);
    }
  };

  useEffect(() => {
    if (!popupPlayerId) return;

    updatePopupPos(popupPlayerId);

    const handlePointerDown = (event) => {
      const target = event.target;
      if (popupRef.current?.contains(target)) return;
      const row = target.closest('[data-player-id]');
      if (row?.getAttribute('data-player-id') === popupPlayerId) return;
      setPopupPlayerId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [popupPlayerId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    if (selectedParticipants.length < 2) {
      showToast({ text: 'Выберите минимум двух участников с очками.' });
      return;
    }

    setSubmitting(true);
    try {
      const preparedFiles = await Promise.all(
        files.map((file) => (isVideoFile(file) ? file : compressImage(file)))
      );
      await publishTournamentPost({
        content: text.trim(),
        files: preparedFiles,
        rawParticipants: selectedParticipants
      });
      showToast({ text: 'Итоги турнира опубликованы.' });
      reset();
      onCreated();
    } catch (err) {
      error('publish tournament post:', err);
      showToast({ text: 'Не удалось опубликовать итоги турнира.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Итоги турнира" size="tall">
      <form onSubmit={handleSubmit} className="create-tournament-post-form">
        <div className="media-upload-group">
          <label htmlFor="tournament-post-media" className="media-input-label">
            <span aria-hidden="true">📎</span>{' '}
            {files.length > 0 ? `Выбрано: ${files.length}` : 'Добавить медиа'}
            <input
              id="tournament-post-media"
              name="tournament-post-media"
              type="file"
              accept="image/*,video/mp4"
              multiple
              onChange={(event) => {
                setFiles(readSelectedFiles(event.target.files, MAX_POST_MEDIA_FILES));
                event.currentTarget.value = '';
              }}
              className="visually-hidden"
            />
          </label>
          <span className="file-name-preview">До {MAX_POST_MEDIA_FILES} файлов</span>
        </div>

        <MediaPreviewGrid
          items={previewItems}
          className="create-tournament-post-preview-grid"
          getAction={(item) => (
            <button
              type="button"
              className="media-remove-btn"
              onClick={() =>
                setFiles((current) =>
                  current.filter((file) => `${file.name}-${file.lastModified}` !== item.key)
                )
              }
              aria-label={`Убрать файл ${item.name}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        />

        <label htmlFor="tournament-post-text" className="visually-hidden">
          Текст поста
        </label>
        <textarea
          id="tournament-post-text"
          name="tournament-post-content"
          autoComplete="off"
          placeholder="Опишите итоги турнира…"
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
        />

        <div className="create-tournament-post-participants">
          <h3 className="create-tournament-post-participants-title">Участники</h3>
          <input
            type="search"
            className="create-tournament-post-search"
            placeholder="Поиск по имени…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
          />

          <div className="create-tournament-post-players">
            {filteredPlayers.map((player) => {
              const checked = player.id in pointsByUserId;
              return (
                <div
                  key={player.id}
                  className="create-tournament-post-player-row"
                  data-player-id={player.id}
                >
                  <label className="create-tournament-post-player-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => handleTogglePlayer(player.id, event.target.checked)}
                    />
                    <Avatar user={player} size="sm" />
                    <span>{player.full_name}</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="submit"
            className="submit-btn-full"
            disabled={submitting || !text.trim() || selectedParticipants.length < 2}
          >
            {submitting ? 'Публикация…' : 'Опубликовать'}
          </button>
        </div>
      </form>

      {popupPlayerId &&
        ReactDOM.createPortal(
          <div
            ref={popupRef}
            className="player-points-popup"
            style={{ top: popupPos.top, left: popupPos.left }}
          >
            <span className="player-points-popup-label">Очки</span>
            <input
              type="number"
              min="0"
              autoFocus
              value={pointsByUserId[popupPlayerId] ?? '0'}
              onChange={(e) =>
                setPointsByUserId((curr) => ({ ...curr, [popupPlayerId]: e.target.value }))
              }
              aria-label={`Очки для ${players.find((p) => p.id === popupPlayerId)?.full_name}`}
            />
          </div>,
          document.body
        )}
    </Modal>
  );
}

export default CreateTournamentPostModal;
