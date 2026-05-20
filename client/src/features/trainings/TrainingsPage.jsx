import React, { useCallback, useMemo, useState } from 'react';
import { useTrainings } from '../../hooks/useTrainings';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { isModerator } from '../../services/auth';
import {
  bookTraining,
  bookUserToTraining,
  cancelTrainingBooking,
  closeTraining,
  markAttendance,
  reopenTraining,
  restoreTraining,
  softDeleteTraining,
  unmarkAttendance
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
import { dayKey, generateNextDays, isSameDay } from '../../lib/format';
import { error } from '../../lib/log';
import './Trainings.css';

const DAYS_COUNT = 14;

/**
 * @param {{ user: any }} props
 */
function TrainingsPage({ user }) {
  const userIsModerator = isModerator();
  const { data: trainings, isLoading, mutate } = useTrainings();
  const { alert, confirm } = useAlertDialog();

  // Lazy init — устраняет H2/H6.
  const days = useMemo(() => generateNextDays(DAYS_COUNT), []);
  const [selectedDate, setSelectedDate] = useState(() => days[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState(null);
  const [editingTraining, setEditingTraining] = useState(null);
  const [bookingTraining, setBookingTraining] = useState(null);
  const [deletedTrainingIds, setDeletedTrainingIds] = useState([]);

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
      return !t.is_deleted && !deletedTrainingIds.includes(t.id);
    });
  }, [deletedTrainingIds, trainings, selectedDate, userIsModerator]);

  // Selected training всегда актуален из SWR-кэша (H15).
  const selectedTraining = useMemo(() => {
    if (!selectedTrainingId || !trainings) return null;
    return trainings.find((t) => t.id === selectedTrainingId) || null;
  }, [selectedTrainingId, trainings]);

  const handleSelectDate = useCallback((date) => setSelectedDate(date), []);

  const handleOpenDetail = useCallback((training) => {
    setSelectedTrainingId(training.id);
  }, []);

  const handleCloseDetail = useCallback(() => setSelectedTrainingId(null), []);

  const handleBook = useCallback(
    async (training) => {
      try {
        await bookTraining(training, user?.id);
        mutate();
        await alert({
          title: 'Запись успешна',
          message: 'Вы записаны на тренировку!'
        });
      } catch (err) {
        error('book training:', err);
        await alert({
          title: 'Ошибка',
          message: /** @type {Error} */ (err).message || 'Не удалось записаться.'
        });
      }
    },
    [user?.id, mutate, alert]
  );

  const handleCancelBooking = useCallback(
    async (training) => {
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
    [user?.id, mutate, alert, confirm]
  );

  const handleRestore = useCallback(
    async (trainingId) => {
      setDeletedTrainingIds((prev) => prev.filter((id) => id !== trainingId));
      mutate(
        (curr = []) =>
          curr.map((t) => (t.id === trainingId ? { ...t, is_deleted: false } : t)),
        false
      );
      try {
        await restoreTraining(trainingId);
      } catch (err) {
        setDeletedTrainingIds((prev) =>
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
      setDeletedTrainingIds((prev) =>
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
        setDeletedTrainingIds((prev) => prev.filter((id) => id !== trainingId));
        mutate(
          (curr = []) =>
            curr.map((t) => (t.id === trainingId ? { ...t, is_deleted: false } : t)),
          false
        );
        error('soft delete training:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось удалить тренировку.' });
        return;
      }

      const shouldRestore = await confirm({
        title: 'Удалено',
        message: 'Тренировка удалена из расписания.',
        confirmText: 'Восстановить',
        cancelText: 'ОК'
      });
      if (shouldRestore) await handleRestore(trainingId);
    },
    [mutate, alert, confirm, handleRestore]
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

  const handleSelectBookingUser = useCallback(
    async (userId) => {
      if (!bookingTraining) return;
      try {
        await bookUserToTraining(bookingTraining, userId);
        setBookingTraining(null);
        mutate();
      } catch (err) {
        error('book user to training:', err);
        await alert({
          title: 'Ошибка',
          message: /** @type {Error} */ (err).message || 'Не удалось записать игрока.'
        });
      }
    },
    [bookingTraining, mutate, alert]
  );

  const handleToggleAttendance = useCallback(
    async (training, userId) => {
      const attendedUserIds = training.attended_users || [];
      const nextAttendedUserIds = attendedUserIds.includes(userId)
        ? attendedUserIds.filter((id) => id !== userId)
        : [...attendedUserIds, userId];
      mutate(
        (curr = []) =>
          curr.map((t) =>
            t.id === training.id ? { ...t, attended_users: nextAttendedUserIds } : t
          ),
        false
      );
      try {
        if (attendedUserIds.includes(userId)) await unmarkAttendance(training, userId);
        else await markAttendance(training, userId);
        mutate();
      } catch (err) {
        mutate(
          (curr = []) =>
            curr.map((t) =>
              t.id === training.id ? { ...t, attended_users: attendedUserIds } : t
            ),
          false
        );
        error('toggle attendance:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось изменить посещаемость.' });
      }
    },
    [mutate, alert]
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
          <IconButton
            ariaLabel="Добавить тренировку на выбранный день"
            variant="soft"
            size="sm"
            className="add-training-context-btn"
            onClick={() => setShowAddModal(true)}
          >
            <span aria-hidden="true">+</span>
          </IconButton>
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
            onEdit={handleEdit}
            onDelete={handleSoftDelete}
            onRestore={handleRestore}
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

      <TrainingDetailModal
        isOpen={Boolean(selectedTraining)}
        training={selectedTraining}
        userId={user?.id}
        userIsModerator={userIsModerator}
        onClose={handleCloseDetail}
        onMutated={() => mutate()}
        onToggleClose={handleToggleClose}
        onEdit={handleEdit}
        onDelete={handleSoftDelete}
        onToggleAttendance={handleToggleAttendance}
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
        onSelect={handleSelectBookingUser}
        excludeIds={bookingTraining?.booked_users || []}
      />
    </div>
  );
}

export default TrainingsPage;
