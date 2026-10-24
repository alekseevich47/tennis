import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { fetchMembershipLedger, settleMembershipDebt } from "../../services/membershipLedger";
import { isModerator } from "../../services/auth";
import { formatDateTimeShort, formatPostDate } from "../../lib/format";
import { error } from "../../lib/log";
const PER_PAGE = 20;
const TRAINING_KIND_LABELS = {
  booking: "\u0417\u0430\u043F\u0438\u0441\u044C",
  unbook: "\u041E\u0442\u043C\u0435\u043D\u0430 \u0437\u0430\u043F\u0438\u0441\u0438",
  training_cancelled: "\u041E\u0442\u043C\u0435\u043D\u0430 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438",
  training_restored: "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438"
};
const BOOKING_DEBT_KINDS = /* @__PURE__ */ new Set(["booking", "training_restored"]);
function relatedLedgerIdFromEntry(entry) {
  if (entry?.related_ledger_id) return String(entry.related_ledger_id);
  const name = String(entry?.actor_name || "");
  const m = name.match(/#([a-z0-9]{15})\s*$/i);
  return m ? m[1] : "";
}
function displayActorName(actorName) {
  return String(actorName || "").replace(/\s*#[a-z0-9]{15}\s*$/i, "").trim() || "\u041C\u043E\u0434\u0435\u0440\u0430\u0442\u043E\u0440";
}
function formatAmount(delta, withinDailyLimit, kind) {
  if (withinDailyLimit) return "\u041B";
  if (kind === "debt_settle") return "";
  const abs = Math.abs(Number(delta) || 0);
  if (delta > 0) return `+${abs}`;
  if (delta < 0) return `\u2212${abs}`;
  return "0";
}
function trainingLabel(trainingType, trainingDate) {
  const typeWord = trainingType === "tournament" ? "\u0442\u0443\u0440\u043D\u0438\u0440" : "\u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430";
  if (trainingDate) {
    return `${typeWord} ${formatDateTimeShort(trainingDate)}`;
  }
  return typeWord;
}
function LedgerDescription({ entry, ownerId, onOpenTraining, relatedEntry }) {
  const isPlus = Number(entry.delta) > 0;
  const actorName = displayActorName(entry.actor_name);
  const byOther = Boolean(entry.actor_id) && entry.actor_id !== ownerId;
  const unpaidNote = entry.unpaid ? isPlus ? " (\u0434\u043E\u043B\u0433 \u0441\u043D\u044F\u0442)" : " (\u0432 \u0434\u043E\u043B\u0433)" : "";
  if (entry.kind === "manual_add") {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, "\u0414\u043E\u0431\u0430\u0432\u0438\u043B: ", actorName);
  }
  if (entry.kind === "manual_subtract") {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, "\u0421\u043F\u0438\u0441\u0430\u043B: ", actorName);
  }
  if (entry.kind === "expired") {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435 \u0441\u0440\u043E\u043A\u0430 \u0430\u0431\u043E\u043D\u0435\u043C\u0435\u043D\u0442\u0430");
  }
  if (entry.kind === "debt_settle") {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, "\u0421\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0434\u043E\u043B\u0433\u0430", relatedEntry?.training_date ? `: ${trainingLabel(relatedEntry.training_type, relatedEntry.training_date)}` : "", actorName ? ` (${actorName})` : "");
  }
  const kindLabel = TRAINING_KIND_LABELS[entry.kind] || "\u0422\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430";
  const actorVerb = entry.unpaid && !isPlus ? "\u0437\u0430\u043F\u0438\u0441\u0430\u043B" : isPlus ? "\u0432\u0435\u0440\u043D\u0443\u043B" : "\u0441\u043F\u0438\u0441\u0430\u043B";
  return /* @__PURE__ */ React.createElement(React.Fragment, null, kindLabel, entry.training_id ? /* @__PURE__ */ React.createElement(React.Fragment, null, ": ", /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "membership-ledger-link",
      onClick: () => onOpenTraining(entry.training_id)
    },
    trainingLabel(entry.training_type, entry.training_date)
  )) : null, unpaidNote, byOther && /* @__PURE__ */ React.createElement("span", { className: "membership-ledger-actor" }, " \xB7 ", actorVerb, ": ", actorName));
}
function MembershipHistory({ enabled, userId, refreshKey, onOpenTraining, onSettled }) {
  const [items, setItems] = useState(
    /** @type {any[]} */
    []
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(
    /** @type {string | null} */
    null
  );
  const requestIdRef = useRef(0);
  const moderator = isModerator();
  const load = useCallback(
    async (nextPage) => {
      if (!userId) return;
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const res = await fetchMembershipLedger(userId, nextPage, PER_PAGE);
        if (requestId !== requestIdRef.current) return;
        setItems((prev) => nextPage === 1 ? res.items : [...prev, ...res.items]);
        setPage(nextPage);
        setTotalPages(res.totalPages);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        error("fetch membership ledger:", err);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [userId]
  );
  useEffect(() => {
    requestIdRef.current += 1;
    setItems([]);
    setPage(1);
    setTotalPages(0);
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    if (!enabled) return;
    void load(1);
  }, [enabled, load, refreshKey]);
  const settledRelatedIds = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    for (const entry of items) {
      if (entry.kind !== "debt_settle") continue;
      const related = relatedLedgerIdFromEntry(entry);
      if (related) set.add(related);
    }
    return set;
  }, [items]);
  const itemsById = useMemo(() => new Map(items.map((e) => [String(e.id), e])), [items]);
  const returnedDebtTrainingIds = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    for (const entry of items) {
      if (entry.unpaid && Number(entry.delta) > 0 && entry.training_id) {
        set.add(String(entry.training_id));
      }
    }
    return set;
  }, [items]);
  const handleDebtToggle = useCallback(
    async (entry, paid) => {
      if (!moderator || !entry?.id || busyId) return;
      setBusyId(entry.id);
      try {
        await settleMembershipDebt({ ledgerId: entry.id, paid, userId });
        await load(1);
        onSettled?.();
      } catch (err) {
        error("settle membership debt:", err);
      } finally {
        setBusyId(null);
      }
    },
    [moderator, busyId, userId, load, onSettled]
  );
  if (!items.length && !loading) return null;
  const firstLoad = loading && !items.length;
  const hasMore = page < totalPages;
  return /* @__PURE__ */ React.createElement("div", { className: "membership-ledger" }, /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("strong", null, "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043F\u043E\u0441\u0435\u0449\u0435\u043D\u0438\u0439:")), firstLoad ? /* @__PURE__ */ React.createElement("ul", { className: "membership-ledger-list", "aria-busy": "true" }, [0, 1, 2].map((i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "membership-ledger-skeleton" }))) : /* @__PURE__ */ React.createElement("ul", { className: "membership-ledger-list" }, items.map((entry, index) => {
    const delta = Number(entry.delta) || 0;
    const withinDailyLimit = Boolean(entry.within_daily_limit);
    const isPlusKind = entry.kind === "unbook" || entry.kind === "training_cancelled" || entry.kind === "manual_add" || delta > 0;
    const amountClass = isPlusKind ? "membership-ledger-amount--plus" : "membership-ledger-amount--minus";
    const isSettled = settledRelatedIds.has(String(entry.id));
    const isReturned = !entry.unpaid && !isSettled && Boolean(entry.training_id) && returnedDebtTrainingIds.has(String(entry.training_id));
    const showDebtDot = BOOKING_DEBT_KINDS.has(entry.kind) && (entry.unpaid || isSettled || isReturned);
    const debtPaid = !entry.unpaid && (isSettled || isReturned);
    const dotInteractive = moderator && !isReturned;
    return /* @__PURE__ */ React.createElement(
      "li",
      {
        key: entry.id,
        className: "membership-ledger-item",
        style: { "--i": index % PER_PAGE }
      },
      showDebtDot && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: clsx(
            "membership-ledger-debt-dot",
            debtPaid ? "membership-ledger-debt-dot--paid" : "membership-ledger-debt-dot--unpaid",
            !dotInteractive && "membership-ledger-debt-dot--readonly"
          ),
          "aria-label": isReturned ? "\u0414\u043E\u043B\u0433 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0451\u043D" : debtPaid ? "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0434\u043E\u043B\u0433\u0430" : "\u0421\u043F\u0438\u0441\u0430\u0442\u044C \u0434\u043E\u043B\u0433",
          disabled: !dotInteractive || busyId === entry.id,
          tabIndex: dotInteractive ? 0 : -1,
          onClick: () => {
            if (!dotInteractive) return;
            void handleDebtToggle(entry, !debtPaid);
          }
        }
      ),
      /* @__PURE__ */ React.createElement("span", { className: "membership-ledger-time" }, formatPostDate(entry.created)),
      /* @__PURE__ */ React.createElement("span", { className: clsx("membership-ledger-amount", amountClass) }, formatAmount(delta, withinDailyLimit, entry.kind)),
      /* @__PURE__ */ React.createElement("span", { className: "membership-ledger-desc" }, /* @__PURE__ */ React.createElement(
        LedgerDescription,
        {
          entry,
          ownerId: userId,
          onOpenTraining,
          relatedEntry: entry.kind === "debt_settle" ? itemsById.get(relatedLedgerIdFromEntry(entry)) : void 0
        }
      ))
    );
  })), hasMore && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "membership-ledger-more",
      onClick: () => void load(page + 1),
      disabled: loading
    },
    loading ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." : "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451"
  ));
}
export default MembershipHistory;
