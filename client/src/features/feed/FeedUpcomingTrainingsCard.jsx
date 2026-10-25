import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useToast } from '../../components/ui/ToastContext';
import { canCancelBooking } from '../../lib/format';
import { error } from '../../lib/log';
import { isModerator } from '../../services/auth';
import { cancelTrainingBooking } from '../../services/trainings';
import TrainingCard from '../trainings/TrainingCard';
import { getTodayTomorrowBookings } from '../profile/upcomingTrainings';
import sectionAvatarUrl from '../../assets/sm-avatar.png';
import '../trainings/Trainings.css';

/**
 * Персональная карточка «предстоящие тренировки» вверху ленты (сегодня + завтра).
 * Свернуто — только ближайшая; «сетка» справа раскрывает весь список.
 *
 * @param {{
 *   user: { id?: string } | null | undefined,
 *   trainings: any[] | null | undefined,
 *   mutateTrainings?: (data?: any, opts?: any) => any,
 *   onOpenTraining?: (training: any) => void
 * }} props
 */
function FeedUpcomingTrainingsCard({ user, trainings, mutateTrainings, onOpenTraining }) {
  const { alert, confirm } = useAlertDialog();
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState(/** @type {string | null} */ (null));
  const [expanded, setExpanded] = useState(false);

  const userId = user?.id;
  const viewerIsModerator = isModerator();

  const upcoming = useMemo(
    () => (userId ? getTodayTomorrowBookings(trainings, userId) : []),
    [trainings, userId]
  );

  const nearest = upcoming[0] || null;
  const rest = useMemo(() => upcoming.slice(1), [upcoming]);
  const canExpand = rest.length > 0;

  useEffect(() => {
    if (!canExpand && expanded) setExpanded(false);
  }, [canExpand, expanded]);

  const handleOpen = useCallback(
    (training) => {
      onOpenTraining?.(training);
    },
    [onOpenTraining]
  );

  const handleToggleExpand = useCallback((event) => {
    event.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  const handleCancelBooking = useCallback(
    async (training) => {
      if (!userId || busyId) return;

      if (!viewerIsModerator && !canCancelBooking(training)) {
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

      setBusyId(training.id);
      try {
        await cancelTrainingBooking(training, userId);
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
        error('cancel feed upcoming booking:', err);
        await alert({ title: 'Ошибка', message: 'Не удалось отменить запись.' });
        void mutateTrainings?.();
      } finally {
        setBusyId(null);
      }
    },
    [userId, busyId, viewerIsModerator, confirm, showToast, mutateTrainings, alert]
  );

  const renderTraining = useCallback(
    (training) => (
      <TrainingCard
        key={training.id}
        training={training}
        userId={userId}
        onOpen={handleOpen}
        onBook={() => {}}
        onCancelBooking={handleCancelBooking}
        hideStatusBadge
        showCountdown
        cancelOnly
        cancelDisabled={busyId === training.id}
      />
    ),
    [userId, handleOpen, handleCancelBooking, busyId]
  );

  if (!userId || !nearest) return null;

  return (
    <article className="feed-card feed-upcoming-card" aria-label="Предстоящие тренировки">
      <div className="feed-card-header feed-upcoming-card__header">
        <div className="section-avatar" aria-hidden="true">
          <img className="section-avatar__image" src={sectionAvatarUrl} alt="" decoding="async" />
        </div>
        <div className="section-meta">
          <span className="section-title-name">Секция Миленьких</span>
          <span className="post-date-line">
            <span className="feed-upcoming-card__subtitle">Ваши запланированные тренировки</span>
          </span>
        </div>
        {canExpand ? (
          <button
            type="button"
            className={clsx(
              'feed-upcoming-card__expand',
              expanded && 'feed-upcoming-card__expand--open'
            )}
            aria-expanded={expanded}
            aria-label={expanded ? 'Свернуть список тренировок' : 'Показать все тренировки'}
            onClick={handleToggleExpand}
          >
            <span className="feed-upcoming-card__expand-grid" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
          </button>
        ) : null}
      </div>

      <div className="feed-upcoming-card__list">
        {renderTraining(nearest)}
        {canExpand ? (
          <div
            className={clsx(
              'feed-upcoming-card__extra',
              expanded && 'feed-upcoming-card__extra--open'
            )}
          >
            <div className="feed-upcoming-card__extra-inner">
              <div className="feed-upcoming-card__extra-list">
                {rest.map((training) => renderTraining(training))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default FeedUpcomingTrainingsCard;
