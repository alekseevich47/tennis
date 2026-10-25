import React, { useCallback, useMemo, useState } from 'react';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useToast } from '../../components/ui/ToastContext';
import { canCancelBooking } from '../../lib/format';
import { error } from '../../lib/log';
import { isModerator } from '../../services/auth';
import { cancelTrainingBooking } from '../../services/trainings';
import TrainingCard from '../trainings/TrainingCard';
import { getTodayTomorrowBookings } from './upcomingTrainings';
import '../trainings/Trainings.css';

/**
 * Блок «Предстоящие тренировки» (сегодня + завтра) — только владелец профиля или модератор.
 *
 * @param {{
 *   userId: string,
 *   trainings: any[] | null | undefined,
 *   currentUserId?: string,
 *   mutateTrainings?: (data?: any, opts?: any) => any,
 *   onOpenTraining?: (training: any) => void
 * }} props
 */
function UpcomingTrainingsBlock({
  userId,
  trainings,
  currentUserId,
  mutateTrainings,
  onOpenTraining
}) {
  const { alert, confirm } = useAlertDialog();
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState(/** @type {string | null} */ (null));

  const viewerIsModerator = isModerator();
  const isOwnProfile = Boolean(userId && currentUserId && userId === currentUserId);
  const canView = viewerIsModerator || isOwnProfile;

  const upcoming = useMemo(
    () => (canView ? getTodayTomorrowBookings(trainings, userId) : []),
    [canView, trainings, userId]
  );

  const handleOpen = useCallback(
    (training) => {
      onOpenTraining?.(training);
    },
    [onOpenTraining]
  );

  const handleCancelBooking = useCallback(
    async (training) => {
      if (!userId || busyId) return;

      const actingAsSelf = Boolean(currentUserId && currentUserId === userId);
      // Лимит «за 1 час» — только для обычного пользователя на своём профиле.
      if (actingAsSelf && !viewerIsModerator && !canCancelBooking(training)) {
        showToast({
          text: 'Невозможно снять запись — до начала тренировки менее 1 часа.'
        });
        return;
      }

      const ok = await confirm({
        title: 'Отмена записи',
        message: actingAsSelf
          ? 'Вы действительно хотите отменить свою запись на тренировку?'
          : 'Снять запись этого пользователя с тренировки?'
      });
      if (!ok) return;

      setBusyId(training.id);
      try {
        await cancelTrainingBooking(training, userId);
        // Сразу убираем из списка; revalidate подтянет серверное состояние.
        mutateTrainings?.(
          (curr = []) =>
            curr.map((t) =>
              t.id === training.id
                ? {
                    ...t,
                    booked_users: (t.booked_users || []).filter((id) => id !== userId)
                  }
                : t
            ),
          false
        );
        void mutateTrainings?.();
      } catch (err) {
        error('cancel upcoming booking:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось отменить запись.' });
        void mutateTrainings?.();
      } finally {
        setBusyId(null);
      }
    },
    [
      userId,
      busyId,
      currentUserId,
      viewerIsModerator,
      confirm,
      showToast,
      mutateTrainings,
      alert
    ]
  );

  if (!canView || upcoming.length === 0) return null;

  return (
    <div className="profile-upcoming-block">
      <h3 className="profile-upcoming-title">Предстоящие тренировки</h3>
      <div className="profile-upcoming-list">
        {upcoming.map((training) => (
          <TrainingCard
            key={training.id}
            training={training}
            userId={userId}
            onOpen={handleOpen}
            onBook={() => {}}
            onCancelBooking={handleCancelBooking}
            hideStatusBadge
            hideSlots
            cancelOnly
            cancelDisabled={busyId === training.id}
          />
        ))}
      </div>
    </div>
  );
}

export default UpcomingTrainingsBlock;
