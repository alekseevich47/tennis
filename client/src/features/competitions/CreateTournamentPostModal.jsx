import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useToast } from '../../components/ui/ToastContext';
import FullscreenImageViewer from '../feed/FullscreenImageViewer';
import MediaPreviewGrid from '../feed/MediaPreviewGrid';
import PostAttachButton from '../feed/PostAttachButton';
import PostScheduleButton from '../feed/PostScheduleButton';
import PostRichTextField from '../feed/PostRichTextField';
import PublishLongPressMenu from '../feed/PublishLongPressMenu';
import ScheduleDateTimeSheet from '../feed/ScheduleDateTimeSheet';
import ScheduledPostsModal from '../feed/ScheduledPostsModal';
import EditTournamentPostModal from './EditTournamentPostModal';
import { useLocalMediaFullscreen } from '../feed/useLocalMediaFullscreen';
import { useYadiskEmbed } from '../feed/useYadiskEmbed';
import { ALBUM_COVER_RADIUS, ALBUM_WINDOW_RADIUS } from '../feed/yadiskAlbumLazy';
import { compressImage } from '../../lib/compress';
import {
  MAX_POST_MEDIA_FILES,
  isVideoFile,
  readSelectedFiles
} from '../../lib/media';
import { BOT_BLOCKED_TOURNAMENT_MESSAGE } from '../../services/auth';
import { hasVisibleText } from '../feed/postRichText';
import { useLongPress, LongPressRing } from '../../lib/longPress';
import { useScheduledPosts } from '../../hooks/useScheduledPosts';
import {
  deleteScheduledTournamentPost,
  publishScheduledTournamentPostNow,
  rescheduleTournamentPost
} from '../../services/tournamentPosts';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   players: any[],
 *   onCreated: (payload: {
 *     content: string,
 *     files: File[],
 *     externalMedia?: unknown,
 *     rawParticipants: Array<{ userId: string, fullName: string, points: number }>,
 *     scheduledAt?: string | null,
 *     captionAbove?: boolean
 *   }) => void
 * }} props
 */
function CreateTournamentPostModal({ isOpen, onClose, players, onCreated }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState(/** @type {File[]} */ ([]));
  const [previewItems, setPreviewItems] = useState([]);
  const [search, setSearch] = useState('');
  const [pointsByUserId, setPointsByUserId] = useState(/** @type {Record<string, string>} */ ({}));
  const [captionAbove, setCaptionAbove] = useState(true);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [scheduledListOpen, setScheduledListOpen] = useState(false);
  const [editingScheduled, setEditingScheduled] = useState(null);
  const fileInputId = useId();
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const { confirm } = useAlertDialog();
  const { showToast } = useToast();
  const { items: scheduledItems, count: scheduledCount, mutate: mutateScheduled } =
    useScheduledPosts('tournament_posts', { enabled: isOpen });

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

  const albumExpandedRef = useRef(false);

  const handleAlbumFocus = useCallback(
    (index, focusOptions) => {
      if (!yadisk.albumPublicUrl) return;
      if (index !== 0) albumExpandedRef.current = true;
      const radius =
        typeof focusOptions?.radius === 'number'
          ? focusOptions.radius
          : albumExpandedRef.current
            ? ALBUM_WINDOW_RADIUS
            : ALBUM_COVER_RADIUS;
      yadisk.setAlbumFocus(yadisk.albumPublicUrl, index, {
        radius,
        preferFull: albumExpandedRef.current || focusOptions?.preferFull === true
      });
    },
    [yadisk]
  );

  const allPreviewItems = yadisk.albumMode
    ? yadisk.previewItems
    : [...previewItems, ...yadisk.previewItems];
  const {
    openItem: openPreviewMedia,
    fullscreen: previewFullscreen,
    close: closePreviewFullscreen,
    hiddenMediaKey,
    onCloseStart: handlePreviewCloseStart,
    handleActiveIndexChange: handlePreviewAlbumIndex
  } = useLocalMediaFullscreen(allPreviewItems, 'create-tournament-post', {
    onAlbumFocus: handleAlbumFocus
  });

  const handleAlbumIndexChange = useCallback(
    (_item, index) => {
      handleAlbumFocus(index);
    },
    [handleAlbumFocus]
  );

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
  const hasMedia = files.length > 0 || yadisk.readyCount > 0;
  const fileSlotsLeft = yadisk.albumMode
    ? 0
    : Math.max(0, MAX_POST_MEDIA_FILES - files.length - yadisk.count);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((player) => (player.full_name || '').toLowerCase().includes(q));
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

  const canPublish = hasText && selectedParticipants.length >= 2 && !yadisk.hasPending;
  const canMoveText = hasText && hasMedia;

  const reset = () => {
    setText('');
    setFiles([]);
    setSearch('');
    setPointsByUserId({});
    setCaptionAbove(true);
    setPreviewMenuOpen(false);
    setScheduleSheetOpen(false);
    albumExpandedRef.current = false;
    yadisk.reset();
  };

  const handleClose = async () => {
    if (hasText || files.length > 0 || yadisk.count > 0 || selectedParticipants.length > 0) {
      const ok = await confirm({
        title: 'Отменить публикацию?',
        message: 'Введённый текст и выбранные файлы будут потеряны.',
        confirmText: 'Отменить',
        cancelText: 'Продолжить',
        confirmVariant: 'danger'
      });
      if (!ok) return;
    }
    reset();
    onClose();
  };

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

  const submitPublish = useCallback(
    async (scheduledAt = /** @type {string | null} */ (null)) => {
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
        rawParticipants: selectedParticipants,
        scheduledAt,
        captionAbove
      });
      reset();
      onClose();
      if (scheduledAt) mutateScheduled();
    },
    // reset/yadisk intentionally from render closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      hasText,
      yadisk.hasPending,
      yadisk.albumMode,
      yadisk.storedMedia,
      selectedParticipants,
      showToast,
      files,
      text,
      captionAbove,
      onCreated,
      onClose,
      mutateScheduled
    ]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (previewMenuOpen) {
      setPreviewMenuOpen(false);
      return;
    }
    await submitPublish(null);
  };

  const { handlers: longPressHandlers, ringProps } = useLongPress({
    enabled: canPublish && !previewMenuOpen && !scheduleSheetOpen,
    onLongPress: () => setPreviewMenuOpen(true),
    durationMs: 450
  });

  const mediaBlock = (
    <MediaPreviewGrid
      items={allPreviewItems}
      className="create-tournament-post-preview-grid"
      showCaption={false}
      originKeyPrefix="create-tournament-post"
      hiddenMediaKey={hiddenMediaKey}
      onItemClick={openPreviewMedia}
      onAlbumIndexChange={handleAlbumIndexChange}
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
  );

  const textBlock = (
    <>
      <label htmlFor="tournament-post-text" className="visually-hidden">
        Текст поста
      </label>
      <PostRichTextField
        id="tournament-post-text"
        value={text}
        onChange={setText}
        placeholder="Опишите итоги турнира…"
      />
    </>
  );

  return (
    <>
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

          {captionAbove ? textBlock : null}
          {mediaBlock}
          {!captionAbove ? textBlock : null}

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
            {scheduledCount > 0 ? (
              <PostScheduleButton
                count={scheduledCount}
                onClick={() => setScheduledListOpen(true)}
              />
            ) : null}
            <button
              type="submit"
              className="submit-btn-full create-post-form__publish"
              disabled={!canPublish}
              {...(canPublish ? longPressHandlers : {})}
            >
              {yadisk.hasPending ? 'Загружаем превью…' : 'Опубликовать'}
            </button>
            <LongPressRing {...ringProps} />
          </div>
        </form>

        {previewFullscreen ? (
          <FullscreenImageViewer
            items={previewFullscreen.items}
            initialIndex={previewFullscreen.index}
            originRect={previewFullscreen.originRect}
            originKey={previewFullscreen.originKey}
            onCloseStart={handlePreviewCloseStart}
            onActiveIndexChange={
              previewFullscreen.isAlbum ? handlePreviewAlbumIndex : undefined
            }
            onClose={closePreviewFullscreen}
          />
        ) : null}
      </Modal>

      <PublishLongPressMenu
        isOpen={previewMenuOpen}
        text={text}
        previewItems={allPreviewItems}
        captionAbove={captionAbove}
        canMoveText={canMoveText}
        onToggleCaption={() => setCaptionAbove((v) => !v)}
        onSendLater={() => {
          setPreviewMenuOpen(false);
          setScheduleSheetOpen(true);
        }}
        onPublishNow={() => {
          setPreviewMenuOpen(false);
          void submitPublish(null);
        }}
        onClose={() => setPreviewMenuOpen(false)}
      />

      <ScheduleDateTimeSheet
        isOpen={scheduleSheetOpen}
        onClose={() => setScheduleSheetOpen(false)}
        onConfirm={(date) => {
          setScheduleSheetOpen(false);
          void submitPublish(date.toISOString());
        }}
      />

      <ScheduledPostsModal
        isOpen={scheduledListOpen}
        onClose={() => setScheduledListOpen(false)}
        kind="tournament_posts"
        items={scheduledItems}
        onMutate={() => mutateScheduled()}
        onEditPost={(post) => {
          setScheduledListOpen(false);
          setEditingScheduled(post);
        }}
        publishNow={publishScheduledTournamentPostNow}
        reschedule={rescheduleTournamentPost}
        remove={deleteScheduledTournamentPost}
      />

      <EditTournamentPostModal
        isOpen={Boolean(editingScheduled)}
        post={editingScheduled}
        onClose={() => setEditingScheduled(null)}
        onSaved={() => {
          setEditingScheduled(null);
          mutateScheduled();
        }}
      />
    </>
  );
}

export default CreateTournamentPostModal;
