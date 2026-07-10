import React, { useEffect, useMemo, useState } from 'react';
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
import { BOT_BLOCKED_TOURNAMENT_MESSAGE } from '../../services/auth';
/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   players: any[],
 *   onCreated: (payload: { content: string, files: File[], rawParticipants: Array<{ userId: string, fullName: string, points: number }> }) => void
 * }} props
 */
function CreateTournamentPostModal({ isOpen, onClose, players, onCreated }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState(/** @type {File[]} */ ([]));
  const [previewItems, setPreviewItems] = useState([]);
  const [search, setSearch] = useState('');
  const [pointsByUserId, setPointsByUserId] = useState(/** @type {Record<string, string>} */ ({}));
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
    const matched = players.filter((player) => {
      const fullName = player.full_name || '';
      return !query || fullName.toLowerCase().includes(query);
    });
    const available = [];
    const disabled = [];
    for (const player of matched) {
      if (player.bot_blocked === true) disabled.push(player);
      else available.push(player);
    }
    return [...available, ...disabled];
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

  const handleTogglePlayer = (player, checked) => {
    if (player.bot_blocked === true) {
      showToast({ text: BOT_BLOCKED_TOURNAMENT_MESSAGE });
      return;
    }
    setPointsByUserId((current) => {
      const next = { ...current };
      if (checked) {
        next[player.id] = current[player.id] ?? '0';
      } else {
        delete next[player.id];
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    if (selectedParticipants.length < 2) {
      showToast({ text: 'Выберите минимум двух участников с очками.' });
      return;
    }

    const preparedFiles = await Promise.all(
      files.map((file) => (isVideoFile(file) ? file : compressImage(file)))
    );
    onCreated({
      content: text.trim(),
      files: preparedFiles,
      rawParticipants: selectedParticipants
    });
    reset();
    onClose();
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
          showCaption={false}
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
              const isBotBlocked = player.bot_blocked === true;
              return (
                <div
                  key={player.id}
                  className={`create-tournament-post-player-row${isBotBlocked ? ' is-disabled' : ''}`}
                  data-player-id={player.id}
                >
                  <label className="create-tournament-post-player-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isBotBlocked}
                      onChange={(event) => handleTogglePlayer(player, event.target.checked)}
                    />
                    <Avatar user={player} size="sm" />
                    <span>
                      {player.full_name}
                      {isBotBlocked ? ' — заблокировал бота' : ''}
                    </span>
                  </label>
                  <div className="player-points-slot" aria-hidden={!checked}>
                    {checked ? (
                      <>
                        <span className="player-points-inline-label">Очки</span>
                        <input
                          type="number"
                          className="player-points-inline-input"
                          min="0"
                          max="99"
                          inputMode="numeric"
                          autoFocus
                          value={pointsByUserId[player.id] ?? '0'}
                          onChange={(event) =>
                            setPointsByUserId((current) => ({
                              ...current,
                              [player.id]: event.target.value
                            }))
                          }
                          aria-label={`Очки для ${player.full_name}`}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="submit"
            className="submit-btn-full"
            disabled={!text.trim() || selectedParticipants.length < 2}
          >
            Опубликовать
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateTournamentPostModal;
