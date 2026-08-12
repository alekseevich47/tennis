import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useToast } from '../../components/ui/ToastContext';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import MediaPreviewGrid from '../feed/MediaPreviewGrid';
import PostAttachButton from '../feed/PostAttachButton';
import PostRichTextField from '../feed/PostRichTextField';
import { useLocalMediaFullscreen } from '../feed/useLocalMediaFullscreen';
import { useYadiskEmbed } from '../feed/useYadiskEmbed';
import { compressImage } from '../../lib/compress';
import {
  MAX_POST_MEDIA_FILES,
  isVideoFile,
  readSelectedFiles
} from '../../lib/media';
import { BOT_BLOCKED_TOURNAMENT_MESSAGE } from '../../services/auth';
import { hasVisibleText } from '../feed/postRichText';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   players: any[],
 *   onCreated: (payload: {
 *     content: string,
 *     files: File[],
 *     externalMedia?: unknown,
 *     rawParticipants: Array<{ userId: string, fullName: string, points: number }>
 *   }) => void
 * }} props
 */
function CreateTournamentPostModal({ isOpen, onClose, players, onCreated }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState(/** @type {File[]} */ ([]));
  const [previewItems, setPreviewItems] = useState([]);
  const [search, setSearch] = useState('');
  const [pointsByUserId, setPointsByUserId] = useState(/** @type {Record<string, string>} */ ({}));
  const fileInputId = useId();
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const { confirm } = useAlertDialog();
  const { showToast } = useToast();

  const onAlbumConflict = useCallback(
    () =>
      confirm({
        title: 'Заменить медиа альбомом?',
        message: 'В публикации может быть только один альбом Яндекс.Диска. Текущие медиа будут удалены.',
        confirmText: 'Заменить',
        cancelText: 'Отмена'
      }),
    [confirm]
  );

  const onSinglesConflict = useCallback(
    () =>
      confirm({
        title: 'Заменить альбом?',
        message: 'Альбом Яндекс.Диска будет удалён, вместо него можно добавить одиночные медиа.',
        confirmText: 'Заменить',
        cancelText: 'Отмена'
      }),
    [confirm]
  );

  const clearLocalMedia = useCallback(() => {
    setFiles([]);
  }, []);

  const yadiskSlots = Math.max(0, MAX_POST_MEDIA_FILES - files.length);
  const yadisk = useYadiskEmbed({
    text,
    setText,
    remainingSlots: yadiskSlots,
    enabled: isOpen,
    hasLocalMedia: files.length > 0,
    onClearLocalMedia: clearLocalMedia,
    onAlbumConflict,
    onSinglesConflict
  });

  const allPreviewItems = yadisk.albumMode
    ? yadisk.previewItems
    : [...previewItems, ...yadisk.previewItems];
  const {
    openItem: openPreviewMedia,
    fullscreen: previewFullscreen,
    close: closePreviewFullscreen,
    hiddenMediaKey,
    onCloseStart: handlePreviewCloseStart
  } = useLocalMediaFullscreen(allPreviewItems, 'create-tournament-post');

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

  const hasText = hasVisibleText(text);
  const fileSlotsLeft = yadisk.albumMode
    ? 0
    : Math.max(0, MAX_POST_MEDIA_FILES - files.length - yadisk.count);

  const reset = () => {
    setText('');
    setFiles([]);
    setSearch('');
    setPointsByUserId({});
    yadisk.reset();
  };

  const handleClose = async () => {
    if (hasText || files.length > 0 || yadisk.count > 0 || Object.keys(pointsByUserId).length > 0) {
      const ok = await confirm({
        title: 'Отменить публикацию?',
        message: 'Введённые данные будут потеряны.',
        confirmText: 'Отменить',
        cancelText: 'Продолжить',
        confirmVariant: 'danger'
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

  const handleAttachClick = async () => {
    if (yadisk.albumMode) {
      const ok = await onSinglesConflict();
      if (!ok) return;
      yadisk.reset();
    }
    fileInputRef.current?.click();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasText || yadisk.hasPending) return;
    if (selectedParticipants.length < 2) {
      showToast({ text: 'Выберите минимум двух участников с очками.' });
      return;
    }

    const preparedFiles = yadisk.albumMode
      ? []
      : await Promise.all(files.map((file) => (isVideoFile(file) ? file : compressImage(file))));
    onCreated({
      content: text,
      files: preparedFiles,
      externalMedia: yadisk.storedMedia,
      rawParticipants: selectedParticipants
    });
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Итоги турнира" size="tall">
      <form onSubmit={handleSubmit} className="create-tournament-post-form">
        <input
          ref={fileInputRef}
          id={fileInputId}
          name="tournament-post-media"
          type="file"
          accept="image/*,video/mp4"
          multiple
          disabled={fileSlotsLeft === 0 && !yadisk.albumMode}
          onChange={(event) => {
            const incoming = readSelectedFiles(event.target.files, fileSlotsLeft);
            setFiles((current) => [...current, ...incoming]);
            event.currentTarget.value = '';
          }}
          className="visually-hidden"
        />

        <MediaPreviewGrid
          items={allPreviewItems}
          className="create-tournament-post-preview-grid"
          showCaption={false}
          originKeyPrefix="create-tournament-post"
          hiddenMediaKey={hiddenMediaKey}
          onItemClick={openPreviewMedia}
          getAction={(item) => (
            <button
              type="button"
              className="media-remove-btn"
              onClick={(event) => {
                event.stopPropagation();
                if (String(item.key).startsWith('yadisk-')) {
                  yadisk.removeItem(item.key);
                  return;
                }
                setFiles((current) =>
                  current.filter((file) => `${file.name}-${file.lastModified}` !== item.key)
                );
              }}
              aria-label={`Убрать файл ${item.name}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        />

        <label htmlFor="tournament-post-text" className="visually-hidden">
          Текст поста
        </label>
        <PostRichTextField
          id="tournament-post-text"
          value={text}
          onChange={setText}
          placeholder="Опишите итоги турнира…"
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

        <div className="modal-actions create-post-form__actions--with-attach">
          <PostAttachButton
            disabled={fileSlotsLeft === 0 && !yadisk.albumMode}
            onClick={handleAttachClick}
          />
          <button
            type="submit"
            className="submit-btn-full create-post-form__publish"
            disabled={!hasText || selectedParticipants.length < 2 || yadisk.hasPending}
          >
            {yadisk.hasPending ? 'Загружаем превью…' : 'Опубликовать'}
          </button>
        </div>
      </form>

      {previewFullscreen ? (
        <FullscreenImageViewer
          items={previewFullscreen.items}
          initialIndex={previewFullscreen.index}
          originRect={previewFullscreen.originRect}
          originKey={previewFullscreen.originKey}
          onCloseStart={handlePreviewCloseStart}
          onClose={closePreviewFullscreen}
        />
      ) : null}
    </Modal>
  );
}

export default CreateTournamentPostModal;
