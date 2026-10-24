import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTrainings } from "../../hooks/useTrainings";
import { useAlertDialog } from "../../components/ui/AlertDialog";
import { useToast } from "../../components/ui/ToastContext";
import { BOT_BLOCKED_BOOKING_MESSAGE, isModerator } from "../../services/auth";
import {
  addPendingDeleteTrainingId,
  bookTraining,
  bookUsersToTraining,
  cancelTrainingBooking,
  closeTraining,
  findUsersOverDailyLimit,
  readPendingDeleteTrainingIds,
  readShowDeletedTrainingsPreference,
  removePendingDeleteTrainingId,
  writeShowDeletedTrainingsPreference,
  reopenTraining,
  restoreTraining,
  softDeleteTraining
} from "../../services/trainings";
import EmptyState from "../../components/ui/EmptyState";
import IconButton from "../../components/ui/IconButton";
import PullToRefresh from "../../components/ui/PullToRefresh";
import { TrainingListSkeleton } from "../../components/ui/Skeleton";
import CalendarStrip from "./CalendarStrip";
import TrainingCard from "./TrainingCard";
import CreateTrainingModal from "./CreateTrainingModal";
import TrainingDetailModal from "./TrainingDetailModal";
import EditTrainingModal from "./components/EditTrainingModal";
import UserPickerModal from "./components/UserPickerModal";
import ArchiveModal from "./components/ArchiveModal";
import {
  canCancelBooking,
  dayKey,
  formatCardDate,
  formatTimeRange,
  generateNextDays,
  isSameDay
} from "../../lib/format";
import { error } from "../../lib/log";
import { useSectionScroll } from "../../hooks/useSectionScroll";
import { useRegisterAddAction } from "../../context/AddActionContext";
import "./Trainings.css";
const DAYS_COUNT = 14;
function TrainingsPage({
  user,
  onDeletedIdsChange,
  onFlushPendingDeletes,
  trainingIdToOpen = null,
  onTrainingOpened
}) {
  const userIsModerator = isModerator();
  const canSelfBook = useMemo(() => {
    if (!user) return false;
    if (user.bot_blocked === true) return false;
    if (user.membership_frozen === true) return false;
    if (user.membership_stopped === true) return false;
    return true;
  }, [user]);
  const { data: trainings, isLoading, mutate } = useTrainings();
  const { alert, confirm } = useAlertDialog();
  const { showToast } = useToast();
  const listScrollRef = useRef(null);
  useSectionScroll(listScrollRef);
  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);
  const days = useMemo(() => generateNextDays(DAYS_COUNT), []);
  const [selectedDate, setSelectedDate] = useState(() => days[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState(null);
  const [editingTraining, setEditingTraining] = useState(null);
  const [bookingTraining, setBookingTraining] = useState(null);
  const [deletingTrainingIds, setDeletingTrainingIds] = useState(() => /* @__PURE__ */ new Set());
  const [hiddenDeletedTrainingIds, setHiddenDeletedTrainingIds] = useState(
    () => readPendingDeleteTrainingIds()
  );
  const [showDeletedTrainings, setShowDeletedTrainings] = useState(
    () => readShowDeletedTrainingsPreference()
  );
  useRegisterAddAction(() => setShowAddModal(true), userIsModerator);
  useEffect(() => {
    onDeletedIdsChange?.(hiddenDeletedTrainingIds);
  }, [hiddenDeletedTrainingIds, onDeletedIdsChange]);
  useEffect(() => {
    if (!trainingIdToOpen || !trainings) return;
    const training = trainings.find((item) => item.id === trainingIdToOpen);
    if (!training) return;
    const trainingDay = new Date(training.date);
    trainingDay.setHours(0, 0, 0, 0);
    setSelectedDate(trainingDay);
    setSelectedTrainingId(training.id);
    onTrainingOpened?.();
  }, [trainingIdToOpen, trainings, onTrainingOpened]);
  useEffect(() => {
    if (hiddenDeletedTrainingIds.length === 0) return;
    onFlushPendingDeletes?.();
  }, []);
  const dayStatusMap = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    if (!trainings) return map;
    for (const t of trainings) {
      const k = dayKey(t.date);
      const entry = map.get(k) || { hasGroup: false, hasTournament: false, isEmpty: false };
      entry.isEmpty = false;
      if (t.type === "group") entry.hasGroup = true;
      else if (t.type === "tournament") entry.hasTournament = true;
      map.set(k, entry);
    }
    return map;
  }, [trainings]);
  const filteredTrainings = useMemo(() => {
    if (!trainings) return [];
    return trainings.filter((t) => {
      if (!isSameDay(new Date(t.date), selectedDate)) return false;
      if (userIsModerator) {
        if (t.is_deleted) return showDeletedTrainings;
        return true;
      }
      return !t.is_deleted && !hiddenDeletedTrainingIds.includes(t.id);
    });
  }, [hiddenDeletedTrainingIds, trainings, selectedDate, userIsModerator, showDeletedTrainings]);
  const pastTrainings = useMemo(() => {
    if (!trainings) return [];
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    return trainings.filter((t) => {
      if (t.is_cancelled === true) return true;
      if (t.is_deleted) return false;
      return new Date(t.date) < today;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trainings]);
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
      if (user?.bot_blocked === true) {
        showToast({ text: BOT_BLOCKED_BOOKING_MESSAGE });
        return;
      }
      if (user?.membership_stopped === true) {
        showToast({
          text: "\u0412\u0430\u0448 \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D. \u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0430 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430."
        });
        return;
      }
      if (user?.membership_frozen === true) {
        showToast({
          text: "\u0412\u0430\u0448 \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442 \u0437\u0430\u043C\u043E\u0440\u043E\u0436\u0435\u043D. \u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0430 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430."
        });
        return;
      }
      try {
        if (user?.id) {
          const over = await findUsersOverDailyLimit([user.id], training.date, training.id);
          if (over.length > 0) {
            const ok = await confirm({
              title: "\u0421\u0432\u0435\u0440\u0445 \u043B\u0438\u043C\u0438\u0442\u0430",
              message: "\u042D\u0442\u043E \u0437\u0430\u043D\u044F\u0442\u0438\u0435 \u043D\u0435 \u0432\u0445\u043E\u0434\u0438\u0442 \u0432 \u043B\u0438\u043C\u0438\u0442 (1 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430 \u0432 \u0434\u0435\u043D\u044C) \u0438 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E. \u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F?",
              confirmText: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F",
              cancelText: "\u041E\u0442\u043C\u0435\u043D\u0430"
            });
            if (!ok) return;
          }
        }
        await bookTraining(training, user?.id);
        mutate();
        showToast({
          text: `\u0412\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u044B \u043D\u0430 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443 ${formatCardDate(training.date)}, ${formatTimeRange(training.date, training.duration)}. \u0421\u043D\u044F\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u043C\u043E\u0436\u043D\u043E \u043D\u0435 \u043F\u043E\u0437\u0434\u043D\u0435\u0435, \u0447\u0435\u043C \u0437\u0430 1 \u0447\u0430\u0441 \u0434\u043E \u043D\u0430\u0447\u0430\u043B\u0430.`
        });
      } catch (err) {
        if (
          /** @type {{ code?: string }} */
          err.code === "BOT_BLOCKED"
        ) {
          showToast({ text: BOT_BLOCKED_BOOKING_MESSAGE });
          return;
        }
        error("book training:", err);
        await alert({
          title: "\u041E\u0448\u0438\u0431\u043A\u0430",
          message: (
            /** @type {Error} */
            err.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F."
          )
        });
      }
    },
    [user?.id, user?.bot_blocked, user?.membership_frozen, user?.membership_stopped, mutate, alert, confirm, showToast]
  );
  const handleCancelBooking = useCallback(
    async (training) => {
      if (!userIsModerator && !canCancelBooking(training)) {
        showToast({
          text: "\u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u0441\u043D\u044F\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u2014 \u0434\u043E \u043D\u0430\u0447\u0430\u043B\u0430 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438 \u043C\u0435\u043D\u0435\u0435 1 \u0447\u0430\u0441\u0430."
        });
        return;
      }
      const ok = await confirm({
        title: "\u041E\u0442\u043C\u0435\u043D\u0430 \u0437\u0430\u043F\u0438\u0441\u0438",
        message: "\u0412\u044B \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0441\u0432\u043E\u044E \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0430 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443?"
      });
      if (!ok) return;
      try {
        await cancelTrainingBooking(training, user?.id);
        mutate();
        await alert({
          title: "\u0417\u0430\u043F\u0438\u0441\u044C \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430",
          message: "\u0412\u044B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0432\u044B\u043F\u0438\u0441\u0430\u043B\u0438\u0441\u044C \u0438\u0437 \u0441\u043E\u0441\u0442\u0430\u0432\u0430 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432."
        });
      } catch (err) {
        error("cancel booking:", err);
        await alert({ title: "\u041E\u0448\u0438\u0431\u043A\u0430", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C." });
      }
    },
    [user?.id, userIsModerator, mutate, alert, confirm, showToast]
  );
  const handleRestore = useCallback(
    async (trainingId) => {
      removePendingDeleteTrainingId(trainingId);
      setHiddenDeletedTrainingIds((prev) => prev.filter((id) => id !== trainingId));
      mutate(
        (curr = []) => curr.map((t) => t.id === trainingId ? { ...t, is_deleted: false } : t),
        false
      );
      try {
        const { record, insufficientUsers } = await restoreTraining(trainingId);
        mutate(
          (curr = []) => curr.map((t) => t.id === trainingId ? record : t),
          false
        );
        if (insufficientUsers.length > 0) {
          const fullNamesJoined = insufficientUsers.map((u) => u.fullName).join(", ");
          showToast({
            text: "\u0423 " + fullNamesJoined + " \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u043F\u043E\u0441\u0435\u0449\u0435\u043D\u0438\u0439 \u0434\u043B\u044F \u0437\u0430\u043F\u0438\u0441\u0438 \u043D\u0430 \u044D\u0442\u0443 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443."
          });
        }
      } catch (err) {
        addPendingDeleteTrainingId(trainingId);
        setHiddenDeletedTrainingIds(
          (prev) => prev.includes(trainingId) ? prev : [...prev, trainingId]
        );
        mutate(
          (curr = []) => curr.map((t) => t.id === trainingId ? { ...t, is_deleted: true } : t),
          false
        );
        error("restore training:", err);
        await alert({ title: "\u041E\u0448\u0438\u0431\u043A\u0430", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443." });
      }
    },
    [mutate, alert, showToast]
  );
  const handleSoftDelete = useCallback(
    async (trainingId) => {
      setSelectedTrainingId(null);
      setDeletingTrainingIds((prev) => new Set(prev).add(trainingId));
      addPendingDeleteTrainingId(trainingId);
      setHiddenDeletedTrainingIds(
        (prev) => prev.includes(trainingId) ? prev : [...prev, trainingId]
      );
      mutate(
        (curr = []) => curr.map((t) => t.id === trainingId ? { ...t, is_deleted: true } : t),
        false
      );
      try {
        await softDeleteTraining(trainingId);
      } catch (err) {
        removePendingDeleteTrainingId(trainingId);
        setHiddenDeletedTrainingIds((prev) => prev.filter((id) => id !== trainingId));
        mutate(
          (curr = []) => curr.map((t) => t.id === trainingId ? { ...t, is_deleted: false } : t),
          false
        );
        error("soft delete training:", err);
        await alert({ title: "\u041E\u0448\u0438\u0431\u043A\u0430", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443." });
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
        (curr = []) => curr.map((t) => t.id === training.id ? { ...t, is_closed: nextIsClosed } : t),
        false
      );
      try {
        if (nextIsClosed) await closeTraining(training.id);
        else await reopenTraining(training.id);
        mutate();
      } catch (err) {
        mutate(
          (curr = []) => curr.map((t) => t.id === training.id ? { ...t, is_closed: training.is_closed } : t),
          false
        );
        error("toggle training close:", err);
        await alert({ title: "\u041E\u0448\u0438\u0431\u043A\u0430", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u043F\u0438\u0441\u0438." });
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
        (curr = []) => curr.map(
          (t) => t.id === updatedTraining.id ? { ...t, ...updatedTraining } : t
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
        const over = await findUsersOverDailyLimit(
          userIds,
          bookingTraining.date,
          bookingTraining.id
        );
        if (over.length > 0) {
          const names = over.map((id) => (selectedUsers || []).find((u) => u.id === id)?.full_name || "\u0418\u0433\u0440\u043E\u043A").join(", ");
          const ok = await confirm({
            title: "\u0421\u0432\u0435\u0440\u0445 \u043B\u0438\u043C\u0438\u0442\u0430",
            message: `\u0414\u043B\u044F: ${names}. \u042D\u0442\u043E \u0437\u0430\u043D\u044F\u0442\u0438\u0435 \u043D\u0435 \u0432\u0445\u043E\u0434\u0438\u0442 \u0432 \u043B\u0438\u043C\u0438\u0442 (1 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430 \u0432 \u0434\u0435\u043D\u044C) \u0438 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E. \u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C?`,
            confirmText: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C",
            cancelText: "\u041E\u0442\u043C\u0435\u043D\u0430"
          });
          if (!ok) return;
        }
        await bookUsersToTraining(bookingTraining, userIds, selectedUsers);
        mutate();
        setBookingTraining(null);
      } catch (err) {
        if (
          /** @type {{ code?: string }} */
          err.code === "BOT_BLOCKED"
        ) {
          await alert({ title: "\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430", message: BOT_BLOCKED_BOOKING_MESSAGE });
          return;
        }
        if (
          /** @type {{ code?: string }} */
          err.code === "MEMBERSHIP_FROZEN" || /** @type {{ code?: string }} */
          err.code === "MEMBERSHIP_STOPPED"
        ) {
          await alert({ title: "\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430", message: (
            /** @type {Error} */
            err.message
          ) });
          return;
        }
        error("book users to training:", err);
        await alert({
          title: "\u041E\u0448\u0438\u0431\u043A\u0430",
          message: (
            /** @type {Error} */
            err.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0438\u0433\u0440\u043E\u043A\u0430."
          )
        });
      }
    },
    [bookingTraining, mutate, alert, confirm]
  );
  return /* @__PURE__ */ React.createElement("div", { className: "trainings-container" }, /* @__PURE__ */ React.createElement(
    CalendarStrip,
    {
      days,
      selectedDate,
      onSelect: handleSelectDate,
      dayStatusMap,
      keyOf: dayKey
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "selected-day-header" }, /* @__PURE__ */ React.createElement("h2", null, selectedDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })), userIsModerator && /* @__PURE__ */ React.createElement("div", { className: "selected-day-actions" }, /* @__PURE__ */ React.createElement(
    IconButton,
    {
      ariaLabel: showDeletedTrainings ? "\u0421\u043A\u0440\u044B\u0442\u044C \u0443\u0434\u0430\u043B\u0451\u043D\u043D\u044B\u0435 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438" : "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0443\u0434\u0430\u043B\u0451\u043D\u043D\u044B\u0435 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438",
      variant: "soft",
      size: "sm",
      className: "show-deleted-training-btn",
      onClick: () => {
        const next = !showDeletedTrainings;
        setShowDeletedTrainings(next);
        writeShowDeletedTrainingsPreference(next);
      }
    },
    showDeletedTrainings ? /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, /* @__PURE__ */ React.createElement("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" })) : /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, /* @__PURE__ */ React.createElement("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" }), /* @__PURE__ */ React.createElement("path", { d: "m3 3 18 18" }))
  ), /* @__PURE__ */ React.createElement(
    IconButton,
    {
      ariaLabel: "\u0410\u0440\u0445\u0438\u0432 \u043F\u0440\u043E\u0448\u0435\u0434\u0448\u0438\u0445 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043E\u043A",
      variant: "soft",
      size: "sm",
      className: "archive-training-btn",
      onClick: () => setShowArchiveModal(true)
    },
    /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, /* @__PURE__ */ React.createElement("path", { d: "M5 8h14" }), /* @__PURE__ */ React.createElement("path", { d: "M7 8v11h10V8" }), /* @__PURE__ */ React.createElement("path", { d: "M9 5h6l2 3H7l2-3Z" }), /* @__PURE__ */ React.createElement("path", { d: "M10 12h4" }))
  ))), /* @__PURE__ */ React.createElement("div", { className: "trainings-list-layout", ref: listScrollRef }, /* @__PURE__ */ React.createElement(PullToRefresh, { scrollRef: listScrollRef, onRefresh: handleRefresh }, isLoading && /* @__PURE__ */ React.createElement(TrainingListSkeleton, null), !isLoading && filteredTrainings.length === 0 && /* @__PURE__ */ React.createElement(
    EmptyState,
    {
      title: "\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0439 \u0434\u0435\u043D\u044C",
      description: "\u041D\u0430 \u044D\u0442\u043E\u0442 \u0434\u0435\u043D\u044C \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043E\u043A \u043F\u043E\u043A\u0430 \u043D\u0435 \u0437\u0430\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043E."
    }
  ), filteredTrainings.map((training) => /* @__PURE__ */ React.createElement(
    TrainingCard,
    {
      key: training.id,
      training,
      userId: user?.id,
      userIsModerator,
      canSelfBook,
      onOpen: handleOpenDetail,
      onBook: handleBook,
      onBookUser: handleBookUser,
      onCancelBooking: handleCancelBooking,
      onToggleClose: handleToggleClose,
      onRestore: handleRestore,
      isDeleting: deletingTrainingIds.has(training.id)
    }
  )))), /* @__PURE__ */ React.createElement(
    CreateTrainingModal,
    {
      isOpen: showAddModal,
      onClose: () => setShowAddModal(false),
      selectedDate,
      onCreated: () => {
        setShowAddModal(false);
        mutate();
      }
    }
  ), /* @__PURE__ */ React.createElement(
    ArchiveModal,
    {
      isOpen: showArchiveModal,
      trainings: pastTrainings,
      onClose: () => setShowArchiveModal(false),
      onOpenDetail: handleOpenArchiveDetail
    }
  ), /* @__PURE__ */ React.createElement(
    TrainingDetailModal,
    {
      isOpen: Boolean(selectedTraining),
      training: selectedTraining,
      userIsModerator,
      currentUser: user,
      onClose: handleCloseDetail,
      onMutated: () => mutate(),
      onToggleClose: handleToggleClose,
      onEdit: handleEdit,
      onDelete: handleSoftDelete
    }
  ), /* @__PURE__ */ React.createElement(
    EditTrainingModal,
    {
      isOpen: Boolean(editingTraining),
      training: editingTraining,
      onClose: () => setEditingTraining(null),
      onSaved: handleSaved
    }
  ), /* @__PURE__ */ React.createElement(
    UserPickerModal,
    {
      isOpen: Boolean(bookingTraining),
      onClose: () => setBookingTraining(null),
      onConfirm: handleConfirmBookingUsers,
      excludeIds: bookingTraining?.booked_users || []
    }
  ));
}
export default TrainingsPage;
