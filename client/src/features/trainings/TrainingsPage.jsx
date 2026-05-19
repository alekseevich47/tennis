import React, { useCallback, useMemo, useState } from 'react';
import { useTrainings } from '../../hooks/useTrainings';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { isModerator } from '../../services/auth';
import {
  bookTraining,
  cancelTrainingBooking,
  deleteTraining
} from '../../services/trainings';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import IconButton from '../../components/ui/IconButton';
import CalendarStrip from './CalendarStrip';
import TrainingCard from './TrainingCard';
import CreateTrainingModal from './CreateTrainingModal';
import TrainingDetailModal from './TrainingDetailModal';
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
    return trainings.filter((t) => isSameDay(new Date(t.date), selectedDate));
  }, [trainings, selectedDate]);

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

  const handleDelete = useCallback(
    async (trainingId) => {
      const ok = await confirm({
        title: 'Удаление',
        message: 'Удалить эту тренировку из расписания навсегда?',
        confirmText: 'Удалить'
      });
      if (!ok) return;
      try {
        await deleteTraining(trainingId);
        mutate();
      } catch (err) {
        error('delete training:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось удалить тренировку.' });
      }
    },
    [mutate, alert, confirm]
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
            onCancelBooking={handleCancelBooking}
            onDelete={handleDelete}
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
        userIsModerator={userIsModerator}
        onClose={handleCloseDetail}
        onMutated={() => mutate()}
      />
    </div>
  );
}

export default TrainingsPage;
