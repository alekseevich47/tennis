import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTrainings } from '../../hooks/useTrainings';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useToast } from '../../components/ui/ToastContext';
import { isModerator } from '../../services/auth';
import {
  addPendingDeleteTrainingId,
  bookTraining,
  bookUsersToTraining,
  cancelTrainingBooking,
  closeTraining,
  readPendingDeleteTrainingIds,
  removePendingDeleteTrainingId,
  reopenTraining,
  restoreTraining,
  softDeleteTraining
} from '../../services/trainings';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import IconButton from '../../components/ui/IconButton';
import CalendarStrip from './CalendarStrip';
import TrainingCard from './TrainingCard';
import CreateTrainingModal from './CreateTrainingModal';
import TrainingDetailModal from './TrainingDetailModal';
import EditTrainingModal from './components/EditTrainingModal';
import UserPickerModal from './components/UserPickerModal';
import ArchiveModal from './components/ArchiveModal';
import {
  canCancelBooking,
  dayKey,
  formatCardDate,
  formatTimeRange,
  generateNextDays,
  isSameDay
} from '../../lib/format';
import { error } from '../../lib/log';
import './Trainings.css';

const DAYS_COUNT = 14;

/**
 * @param {{
 *   user: any,
 *   onDeletedIdsChange?: (ids: string[]) => void,
 *   onFlushPendingDeletes?: () => void
 * }} props
 */
function TrainingsPage({ user, onDeletedIdsChange, onFlushPendingDeletes }) {
  const userIsModerator = isModerator();
  const { data: trainings, isLoading, mutate } = useTrainings();
  const { alert, confirm } = useAlertDialog();
  const { showToast } = useToast();

  // Lazy init — устраняет H2/H6.
  const days = useMemo(() => generateNextDays(DAYS_COUNT), []);
  const [selectedDate, setSelectedDate] = useState(() => days[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState(null);
  const [editingTraining, setEditingTraining] = useState(null);
  const [bookingTraining, setBookingTraining] = useState(null);
  const [deletingTrainingIds, setDeletingTrainingIds] = useState(() => new Set());
  const [hiddenDeletedTrainingIds, setHiddenDeletedTrainingIds] = useState(() =>
    readPendingDeleteTrainingIds()
  );

  useEffect(() => {
    onDeletedIdsChange?.(hiddenDeletedTrainingIds);
  }, [hiddenDeletedTrainingIds, onDeletedIdsChange]);

  useEffect(() => {
    if (hiddenDeletedTrainingIds.length === 0) return;
    onFlushPendingDeletes?.();
  }, []);

  // Индекс «день → статус» построен один раз на массив тренировок (H9, H13).
  const dayStatusMap = useMemo(() => {
    /** @type {Map<string, { hasGroup: boolean, hasTournament: boolean, isEmpty: boolean }>} */
    const map = new Map();
    if (!trainings) return map;
    for (const t of trainings) {
      const k = dayKey(t.date);
      const entry = map.get(k) || { hasGroup: false, hasTournament: false, isEmpty: false };
      entry.isEmpty = false;
      if (t.type === 'group') entry.hasGroup = true;
      else if (t.type === 'tournament') entry.hasTournament = true;
      map.set(k, entry);
    }
    return map;
  }, [trainings]);

  const filteredTrainings = useMemo(() => {
    if (!trainings) return [];
    return trainings.filter((t) => {
      if (!isSameDay(new Date(t.date), selectedDate)) return false;
      if (userIsModerator) return true;
      return !t.is_deleted && !hiddenDeletedTrainingIds.includes(t.id);
    });
  }, [hiddenDeletedTrainingIds, trainings, selectedDate, userIsModerator]);

  const pastTrainings = useMemo(() => {
    if (!trainings) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return trainings
      .filter((t) => {
        if (t.is_deleted) return false;
        return new Date(t.date) < today;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trainings]);

  // Selected training всегда актуален из SWR-кэша (H15).
  const selectedTraining = useMemo(() => {
    if (!selectedTrainingId || !trainings) return null;
    return trainings.find((t) => t.id === selectedTrainingId) || null;
  }, [selectedTrainingId, trainings]);

  const handleSelectDate = useCallback((date) => setSelectedDate(date), []);

  const handleOpenDetail = useCallback((training) => {
    setSelectedTrainingId(training.id);
  }, []);

  const handleOpenArchiveDetail = useCallback((training) => {
    setShowArchiveModal(false);
    setSelectedTrainingId(training.id);
  }, []);

  const handleCloseDetail = useCallback(() => setSelectedTrainingId(null), []);

  const handleBook = useCallback(
    async (training) => {
      if (user?.membership_frozen === true) {
        showToast({
          text: 'Ваш абонемент заморожен. Запись на тренировку недоступна.'
        });
        return;
      }
      try {
        await bookTraining(training, user?.id);
        mutate();
        showToast({
          text: `Вы записаны на тренировку ${formatCardDate(training.date)}, ${formatTimeRange(training.date, training.duration)}. Снять запись можно не позднее, чем за 1 час до начала.`
        });
      } catch (err) {
        if (/** @type {{ code?: string }} */ (err).code === 'ANNUAL_DAILY_LIMIT') {
          showToast({ text: 'Годовой абонемент: только одна тренировка в день.' });
          return;
        }
        error('book training:', err);
        await alert({
          title: 'Ошибка',
          message: /** @type {Error} */ (err).message || 'Не удалось записаться.'
        });
      }
    },
    [user?.id, user?.membership_frozen, mutate, alert, showToast]
  );

  const handleCancelBooking = useCallback(
    async (training) => {
      if (!userIsModerator && !canCancelBooking(training)) {
        showToast({
          text: 'Невозможно снять запись — до начала тренировки менее 1 часа.'
        });
        return;
      }
      const ok = await confirm({
        title: 'Отмена записи',
        message: 'Вы действительно хотите отменить свою запись на тренировку?'
      });
      if (!ok) return;
      try {
        await cancelTrainingBooking(training, user?.id);
        mutate();
        await alert({
          title: 'Запись отменена',
          message: 'Вы успешно выписались из состава участников.'
        });
      } catch (err) {
        error('cancel booking:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось отменить запись.' });
      }
    },
    [user?.id, userIsModerator, mutate, alert, confirm, showToast]
  );

  const handleRestore = useCallback(
    async (trainingId) => {
      removePendingDeleteTrainingId(trainingId);
      setHiddenDeletedTrainingIds((prev) => prev.filter((id) => id !== trainingId));
      mutate(
        (curr = []) =>
          curr.map((t) => (t.id === trainingId ? { ...t, is_deleted: false } : t)),
        false
      );
      try {
        await restoreTraining(trainingId);
      } catch (err) {
        addPendingDeleteTrainingId(trainingId);
        setHiddenDeletedTrainingIds((prev) =>
          prev.includes(trainingId) ? prev : [...prev, trainingId]
        );
        mutate(
          (curr = []) =>
            curr.map((t) => (t.id === trainingId ? { ...t, is_deleted: true } : t)),
          false
        );
        error('restore training:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось восстановить тренировку.' });
      }
    },
    [mutate, alert]
  );

  const handleSoftDelete = useCallback(
    async (trainingId) => {
      setSelectedTrainingId(null);
      setDeletingTrainingIds((prev) => new Set(prev).add(trainingId));
      addPendingDeleteTrainingId(trainingId);
      setHiddenDeletedTrainingIds((prev) =>
        prev.includes(trainingId) ? prev : [...prev, trainingId]
      );
      mutate(
        (curr = []) =>
          curr.map((t) => (t.id === trainingId ? { ...t, is_deleted: true } : t)),
        false
      );
      try {
        await softDeleteTraining(trainingId);
      } catch (err) {
        removePendingDeleteTrainingId(trainingId);
        setHiddenDeletedTrainingIds((prev) => prev.filter((id) => id !== trainingId));
        mutate(
          (curr = []) =>
            curr.map((t) => (t.id === trainingId ? { ...t, is_deleted: false } : t)),
          false
        );
        error('soft delete training:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось удалить тренировку.' });
      } finally {
        setDeletingTrainingIds((prev) => {
          const next = new Set(prev);
          next.delete(trainingId);
          return next;
        });
      }
    },
    [mutate, alert]
  );

  const handleToggleClose = useCallback(
    async (training) => {
      const nextIsClosed = !training.is_closed;
      mutate(
        (curr = []) =>
          curr.map((t) => (t.id === training.id ? { ...t, is_closed: nextIsClosed } : t)),
        false
      );
      try {
        if (nextIsClosed) await closeTraining(training.id);
        else await reopenTraining(training.id);
        mutate();
      } catch (err) {
        mutate(
          (curr = []) =>
            curr.map((t) => (t.id === training.id ? { ...t, is_closed: training.is_closed } : t)),
          false
        );
        error('toggle training close:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось изменить статус записи.' });
      }
    },
    [mutate, alert]
  );

  const handleEdit = useCallback((training) => {
    setEditingTraining(training);
  }, []);

  const handleSaved = useCallback(
    (updatedTraining) => {
      mutate(
        (curr = []) =>
          curr.map((t) =>
            t.id === updatedTraining.id ? { ...t, ...updatedTraining } : t
          ),
        false
      );
      setEditingTraining(null);
    },
    [mutate]
  );

  const handleBookUser = useCallback((training) => {
    setBookingTraining(training);
  }, []);

  const handleConfirmBookingUsers = useCallback(
    async (userIds, selectedUsers) => {
      if (!bookingTraining) return;
      try {
        await bookUsersToTraining(bookingTraining, userIds, selectedUsers);
        mutate();
        setBookingTraining(null);
      } catch (err) {
        if (/** @type {{ code?: string }} */ (err).code === 'MEMBERSHIP_FROZEN') {
          await alert({ title: 'Запись невозможна', message: /** @type {Error} */ (err).message });
          return;
        }
        if (/** @type {{ code?: string }} */ (err).code === 'ANNUAL_DAILY_LIMIT') {
          const ok = await confirm({
            title: 'Годовой абонемент',
            message: 'Один или несколько игроков уже записаны на тренировку в этот день (лимит: 1 в день). Записать принудительно?',
            confirmText: 'Записать',
            cancelText: 'Отмена'
          });
          if (!ok) return;
          await bookUsersToTraining(bookingTraining, userIds, selectedUsers, { overrideAnnualLimit: true });
          mutate();
          setBookingTraining(null);
          return;
        }
        error('book users to training:', err);
        await alert({
          title: 'Ошибка',
          message: /** @type {Error} */ (err).message || 'Не удалось записать игрока.'
        });
      }
    },
    [bookingTraining, mutate, alert, confirm]
  );

  return (
    <div className="trainings-container">
      <CalendarStrip
        days={days}
        selectedDate={selectedDate}
        onSelect={handleSelectDate}
        dayStatusMap={dayStatusMap}
        keyOf={dayKey}
      />

      <div className="selected-day-header">
        <h2>
          {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
        </h2>
        {userIsModerator && (
          <div className="selected-day-actions">
            <IconButton
              ariaLabel="Архив прошедших тренировок"
              variant="soft"
              size="sm"
              className="archive-training-btn"
              onClick={() => setShowArchiveModal(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 8h14" />
                <path d="M7 8v11h10V8" />
                <path d="M9 5h6l2 3H7l2-3Z" />
                <path d="M10 12h4" />
              </svg>
            </IconButton>
            <IconButton
              ariaLabel="Добавить тренировку на выбранный день"
              variant="soft"
              size="sm"
              className="add-training-context-btn"
              onClick={() => setShowAddModal(true)}
            >
              <span aria-hidden="true">+</span>
            </IconButton>
          </div>
        )}
      </div>

      <div className="trainings-list-layout">
        {isLoading && <Spinner label="Загрузка расписания..." />}

        {!isLoading && filteredTrainings.length === 0 && (
          <EmptyState
            title="Свободный день"
            description="На этот день тренировок пока не запланировано."
          />
        )}

        {filteredTrainings.map((training) => (
          <TrainingCard
            key={training.id}
            training={training}
            userId={user?.id}
            userIsModerator={userIsModerator}
            onOpen={handleOpenDetail}
            onBook={handleBook}
            onBookUser={handleBookUser}
            onCancelBooking={handleCancelBooking}
            onToggleClose={handleToggleClose}
            onRestore={handleRestore}
            isDeleting={deletingTrainingIds.has(training.id)}
          />
        ))}
      </div>

      <CreateTrainingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        selectedDate={selectedDate}
        onCreated={() => {
          setShowAddModal(false);
          mutate();
        }}
      />

      <ArchiveModal
        isOpen={showArchiveModal}
        trainings={pastTrainings}
        onClose={() => setShowArchiveModal(false)}
        onOpenDetail={handleOpenArchiveDetail}
      />

      <TrainingDetailModal
        isOpen={Boolean(selectedTraining)}
        training={selectedTraining}
        userIsModerator={userIsModerator}
        onClose={handleCloseDetail}
        onMutated={() => mutate()}
        onToggleClose={handleToggleClose}
        onEdit={handleEdit}
        onDelete={handleSoftDelete}
      />

      <EditTrainingModal
        isOpen={Boolean(editingTraining)}
        training={editingTraining}
        onClose={() => setEditingTraining(null)}
        onSaved={handleSaved}
      />

      <UserPickerModal
        isOpen={Boolean(bookingTraining)}
        onClose={() => setBookingTraining(null)}
        onConfirm={handleConfirmBookingUsers}
        excludeIds={bookingTraining?.booked_users || []}
      />
    </div>
  );
}

export default TrainingsPage;
