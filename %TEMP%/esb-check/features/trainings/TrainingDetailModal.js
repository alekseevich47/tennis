import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import Modal from "../../components/ui/Modal";
import IconButton from "../../components/ui/IconButton";
import Avatar from "../../components/ui/Avatar";
import { useAlertDialog } from "../../components/ui/AlertDialog";
import { formatCardDate, formatTimeRange, hasTimeRangeEnded } from "../../lib/format";
import {
  bookUsersToTraining,
  findUsersOverDailyLimit,
  markAttendance,
  removeUsersFromTraining,
  unmarkAttendance
} from "../../services/trainings";
import { BOT_BLOCKED_BOOKING_MESSAGE } from "../../services/auth";
import { error } from "../../lib/log";
import UserPickerModal from "./components/UserPickerModal";
import ProfileViewModal from "../profile/ProfileViewModal";
import { useKeepForModalClose } from "../../hooks/useKeepForModalClose";
function TrainingDetailModal({
  isOpen,
  training: trainingProp,
  userIsModerator,
  onClose,
  onMutated,
  onToggleClose,
  onEdit,
  onDelete,
  currentUser
}) {
  const training = useKeepForModalClose(isOpen, trainingProp);
  const { confirm, alert } = useAlertDialog();
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  useEffect(() => {
    if (!isOpen) {
      setIsUserPickerOpen(false);
      setViewingPlayer(null);
    }
  }, [isOpen]);
  const handleProfileMutated = useCallback(
    (updatedPlayer) => {
      if (updatedPlayer?.id) setViewingPlayer(updatedPlayer);
      onMutated();
    },
    [onMutated]
  );
  if (!training) return null;
  const bookedUserIds = training.booked_users || [];
  const bookedUserIdSet = new Set(bookedUserIds);
  const restoreInsufficientPlayers = training.expand?.restore_insufficient_users || [];
  const restoreInsufficientIdSet = new Set(restoreInsufficientPlayers.map((p) => p.id));
  const unbookedPlayers = (training.expand?.unbooked_users || []).filter(
    (player) => !bookedUserIdSet.has(player.id) && !restoreInsufficientIdSet.has(player.id)
  );
  const hasLimit = training.max_slots !== null && training.max_slots !== void 0 && training.max_slots > 0;
  const isFull = hasLimit && bookedUserIds.length >= (training.max_slots || 0);
  const isClosed = training.is_closed === true;
  const hasEnded = hasTimeRangeEnded(training.date, training.duration || 0);
  const effectivelyClosed = isClosed || hasEnded;
  const handleKick = async (userId) => {
    const ok = await confirm({
      title: "\u0418\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435",
      message: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u044D\u0442\u043E\u0433\u043E \u0438\u0433\u0440\u043E\u043A\u0430 \u043F\u0440\u0438\u043D\u0443\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E?"
    });
    if (!ok) return;
    try {
      await removeUsersFromTraining(training, [userId]);
      onMutated();
    } catch (err) {
      error("kick player:", err);
      await alert({ title: "\u041E\u0448\u0438\u0431\u043A\u0430", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0441\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430." });
    }
  };
  const handleAttendanceChange = async (playerId, checked) => {
    try {
      if (checked) {
        await markAttendance(training, playerId);
      } else {
        await unmarkAttendance(training, playerId);
      }
      onMutated();
    } catch (err) {
      error("toggle attendance:", err);
      await alert({ title: "\u041E\u0448\u0438\u0431\u043A\u0430", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u043E\u0441\u0435\u0449\u0430\u0435\u043C\u043E\u0441\u0442\u044C." });
    }
  };
  const handleConfirmBookingUsers = async (selectedUserIds, selectedUsers) => {
    try {
      const over = await findUsersOverDailyLimit(selectedUserIds, training.date, training.id);
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
      await bookUsersToTraining(training, selectedUserIds, selectedUsers);
      onMutated();
      setIsUserPickerOpen(false);
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
  };
  const handleCopyTrainingId = async () => {
    try {
      await navigator.clipboard.writeText(training.id);
      await alert({ title: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E", message: "ID \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D \u0432 \u0431\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0435\u043D\u0430." });
    } catch {
      await alert({ title: "\u041D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E\u0441\u044C", message: "\u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 ID \u0432\u0440\u0443\u0447\u043D\u0443\u044E." });
    }
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    Modal,
    {
      isOpen,
      onClose,
      size: "tall",
      ariaLabel: "\u0414\u0435\u0442\u0430\u043B\u0438 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438 \u0438 \u0441\u043F\u0438\u0441\u043E\u043A \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432",
      showCloseButton: false
    },
    /* @__PURE__ */ React.createElement("div", { className: "detail-header-row" }, /* @__PURE__ */ React.createElement("span", { className: "detail-badge-type" }, training.type === "group" ? "\u0413\u0440\u0443\u043F\u043F\u043E\u0432\u043E\u0439 \u0441\u0431\u043E\u0440" : "\u0422\u0443\u0440\u043D\u0438\u0440\u043D\u0430\u044F \u0441\u0435\u0442\u043A\u0430"), /* @__PURE__ */ React.createElement("div", { className: "detail-header-actions" }, userIsModerator && !training.is_deleted && /* @__PURE__ */ React.createElement(React.Fragment, null, !hasEnded && /* @__PURE__ */ React.createElement(
      IconButton,
      {
        ariaLabel: training.is_closed ? "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0430 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443" : "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0430 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443",
        variant: "ghost",
        size: "sm",
        className: clsx("action-circle-btn btn-stop", training.is_closed && "btn-stop-play"),
        disabled: !onToggleClose,
        onClick: () => onToggleClose?.(training)
      },
      training.is_closed ? /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, /* @__PURE__ */ React.createElement("path", { d: "M8 5v14l11-7L8 5Z" })) : /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u25A0")
    ), /* @__PURE__ */ React.createElement(
      IconButton,
      {
        ariaLabel: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443",
        variant: "ghost",
        size: "sm",
        className: "action-circle-btn btn-edit",
        disabled: !onEdit,
        onClick: () => onEdit?.(training)
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, /* @__PURE__ */ React.createElement("path", { d: "M4 20h4.2L19.3 8.9a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" }), /* @__PURE__ */ React.createElement("path", { d: "m13.7 6.1 4.2 4.2" }))
    ), /* @__PURE__ */ React.createElement(
      IconButton,
      {
        ariaLabel: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443",
        variant: "ghost",
        size: "sm",
        className: "action-circle-btn btn-delete-trash",
        disabled: !onDelete,
        onClick: () => onDelete?.(training.id)
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, /* @__PURE__ */ React.createElement("path", { d: "M4 7h16" }), /* @__PURE__ */ React.createElement("path", { d: "M10 11v6" }), /* @__PURE__ */ React.createElement("path", { d: "M14 11v6" }), /* @__PURE__ */ React.createElement("path", { d: "M6 7l1 13h10l1-13" }), /* @__PURE__ */ React.createElement("path", { d: "M9 7V4h6v3" }))
    )), /* @__PURE__ */ React.createElement(
      IconButton,
      {
        type: "button",
        className: "ui-modal-close",
        ariaLabel: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
        onClick: onClose
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2715")
    ))),
    /* @__PURE__ */ React.createElement("h2", { className: "detail-title-date" }, formatCardDate(training.date)),
    /* @__PURE__ */ React.createElement("p", { className: "detail-time-range" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u23F1\uFE0F"), " ", formatTimeRange(training.date, training.duration)),
    /* @__PURE__ */ React.createElement("p", { className: "detail-location-text" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4CD}"), " ", training.location),
    userIsModerator && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "training-detail-id",
        onClick: handleCopyTrainingId
      },
      "ID: ",
      training.id,
      " ",
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4CB}")
    ),
    training.description && /* @__PURE__ */ React.createElement("div", { className: "detail-desc-box" }, /* @__PURE__ */ React.createElement("h3", null, "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043E\u0442 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u0430"), /* @__PURE__ */ React.createElement("p", null, training.description)),
    /* @__PURE__ */ React.createElement("div", { className: "detail-participants-section" }, /* @__PURE__ */ React.createElement("div", { className: "detail-booking-status-row" }, !isFull && /* @__PURE__ */ React.createElement(
      "span",
      {
        className: clsx(
          "card-status-badge",
          effectivelyClosed ? "card-status-badge--closed" : "card-status-badge--open"
        )
      },
      hasEnded ? "\u0422\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430" : effectivelyClosed ? "\u0417\u0430\u043F\u0438\u0441\u044C \u0437\u0430\u043A\u0440\u044B\u0442\u0430" : "\u0417\u0430\u043F\u0438\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u0430"
    ), hasLimit && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "card-slots-counter" }, bookedUserIds.length, " / ", training.max_slots, " \u043C\u0435\u0441\u0442"), isFull && /* @__PURE__ */ React.createElement("span", { className: "card-slots-badge-full" }, "\u041C\u0435\u0441\u0442 \u043D\u0435\u0442"))), /* @__PURE__ */ React.createElement("h3", null, "\u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043D\u044B\u0435 \u0438\u0433\u0440\u043E\u043A\u0438 (", bookedUserIds.length, ")", userIsModerator && /* @__PURE__ */ React.createElement(
      IconButton,
      {
        ariaLabel: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0438\u0433\u0440\u043E\u043A\u0430 \u043D\u0430 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443",
        variant: "ghost",
        size: "sm",
        className: "action-circle-btn btn-add-plus",
        disabled: isFull || training.is_deleted,
        onClick: () => setIsUserPickerOpen(true)
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "+")
    )), /* @__PURE__ */ React.createElement("div", { className: "participants-list-wrapper" }, !training.expand?.booked_users || training.expand.booked_users.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "no-players-text" }, "\u041D\u0430 \u044D\u0442\u0443 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443 \u043F\u043E\u043A\u0430 \u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043B\u0441\u044F.") : training.expand.booked_users.map((player) => /* @__PURE__ */ React.createElement("div", { key: player.id, className: "player-list-row" }, /* @__PURE__ */ React.createElement("div", { className: "player-meta-left" }, userIsModerator && !training.is_deleted && /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        className: "attendance-checkbox",
        checked: training.attended_users?.includes(player.id) || false,
        "aria-label": `\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043F\u043E\u0441\u0435\u0449\u0435\u043D\u0438\u0435: ${player.full_name || "\u0422\u0435\u043D\u043D\u0438\u0441\u0438\u0441\u0442"}`,
        onChange: (event) => handleAttendanceChange(player.id, event.target.checked)
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "training-player-profile-link",
        onClick: () => setViewingPlayer(player)
      },
      /* @__PURE__ */ React.createElement(
        Avatar,
        {
          user: player,
          size: "sm",
          className: "training-player-avatar",
          alt: player.full_name || "\u0422\u0435\u043D\u043D\u0438\u0441\u0438\u0441\u0442"
        }
      ),
      /* @__PURE__ */ React.createElement("span", { className: "player-name-label" }, player.full_name || "\u0422\u0435\u043D\u043D\u0438\u0441\u0438\u0441\u0442")
    )), userIsModerator && !training.is_deleted && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "kick-player-btn",
        onClick: () => handleKick(player.id)
      },
      "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C"
    )))), userIsModerator && unbookedPlayers.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", null, "\u0421\u043D\u044F\u0432\u0448\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u044C (", unbookedPlayers.length, ")"), /* @__PURE__ */ React.createElement("div", { className: "participants-list-wrapper" }, unbookedPlayers.map((player) => /* @__PURE__ */ React.createElement("div", { key: player.id, className: "player-list-row player-row--unbooked" }, /* @__PURE__ */ React.createElement("div", { className: "player-meta-left" }, /* @__PURE__ */ React.createElement(
      Avatar,
      {
        user: player,
        size: "sm",
        className: "training-player-avatar",
        alt: player.full_name || "\u0422\u0435\u043D\u043D\u0438\u0441\u0438\u0441\u0442"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "player-name-label" }, player.full_name || "\u0422\u0435\u043D\u043D\u0438\u0441\u0438\u0441\u0442")))))), userIsModerator && restoreInsufficientPlayers.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", null, "\u041D\u0435 \u0445\u0432\u0430\u0442\u0438\u043B\u043E \u043F\u043E\u0441\u0435\u0449\u0435\u043D\u0438\u0439 \u0434\u043B\u044F \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F (", restoreInsufficientPlayers.length, ")"), /* @__PURE__ */ React.createElement("div", { className: "participants-list-wrapper" }, restoreInsufficientPlayers.map((player) => /* @__PURE__ */ React.createElement("div", { key: player.id, className: "player-list-row" }, /* @__PURE__ */ React.createElement("div", { className: "player-meta-left" }, /* @__PURE__ */ React.createElement(
      Avatar,
      {
        user: player,
        size: "sm",
        className: "training-player-avatar",
        alt: player.full_name || "\u0422\u0435\u043D\u043D\u0438\u0441\u0438\u0441\u0442"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "player-name-label" }, player.full_name || "\u0422\u0435\u043D\u043D\u0438\u0441\u0438\u0441\u0442")))))))
  ), /* @__PURE__ */ React.createElement(
    UserPickerModal,
    {
      isOpen: isUserPickerOpen,
      onClose: () => setIsUserPickerOpen(false),
      onConfirm: handleConfirmBookingUsers,
      excludeIds: bookedUserIds
    }
  ), /* @__PURE__ */ React.createElement(
    ProfileViewModal,
    {
      isOpen: !!viewingPlayer,
      onClose: () => setViewingPlayer(null),
      targetUser: viewingPlayer,
      currentUser,
      onMutated: handleProfileMutated
    }
  ));
}
export default TrainingDetailModal;
