# TASKS_T — Trainings: план реализации

## T-1 · Мультивыбор игроков в UserPickerModal

**Затрагивает:** `UserPickerModal.jsx`, `TrainingsPage.jsx`, `TrainingDetailModal.jsx`, `services/trainings.js`

1. Добавить в `services/trainings.js` функцию `bookUsersToTraining(training, userIds[])` — записывает сразу несколько ID за один `update`.
2. В `UserPickerModal` переключить режим на мультиселект:
   - Добавить локальный state `selectedIds: Set<string>`.
   - Каждая строка пользователя — чекбокс вместо немедленного `onClick`.
   - Кнопка «Записать (N)» в футере модала — активна при `selectedIds.size > 0`.
   - Props: `onSelect(userId: string)` → `onConfirm(userIds: string[])`.
3. Обновить сигнатуру пропов в обоих местах вызова (`TrainingsPage` и `TrainingDetailModal`):
   - `handleSelectBookingUser(userId)` → `handleConfirmBookingUsers(userIds[])`.
   - Вызывать `bookUsersToTraining` вместо `bookUserToTraining`.
4. После подтверждения — `mutate()`, закрыть модал.

---

## T-2 · Увеличить «красный квадрат» (btn-stop)

**Затрагивает:** `Trainings.css`

1. В `.btn-stop` увеличить `font-size` до `20px` (сейчас `12px`).

---

## T-3 · «Запись открыта» / «Запись закрыта» в TrainingCard

**Затрагивает:** `TrainingCard.jsx`

1. В блоке рендера `card-slots-counter` при `!hasLimit`:
   - Если `training.is_closed === true` → текст «Запись закрыта», класс без `no-limit-label` (серый стиль, аналогично «Мест нет»).
   - Иначе → «Запись открыта» (зелёный, как сейчас).

---

## T-4 · Красная кнопка «Восстановить» в TrainingCard

**Затрагивает:** `Trainings.css`

1. В `.text-status-full-label.btn-restore` добавить `background: #e63946 !important` — сейчас `.text-status-full-label` (объявлен позже в файле) перебивает фон `#e9ecef` из-за равной специфичности.

---

## T-5 · Флаш soft-deleted тренировок при смене раздела / перезапуске

**Затрагивает:** `App.jsx`, `TrainingsPage.jsx`, `services/trainings.js` (уже есть `deleteTraining`)

### Подход (зеркалит паттерн постов)

1. **`App.jsx`** — поднять `deletedTrainingIds: string[]` в state App'а (аналог `pendingDeletePostIds`).
   - Передавать в `TrainingsPage` пропом `onDeletedIdsChange`.
   - В `flushPendingDeletes` добавить хард-удаление этих ID через `deleteTraining` (fire-and-forget, `.catch`).
   - Очищать массив сразу после запуска флаша.

2. **SessionStorage-бэкап** (для перезапуска сессии):
   - При добавлении ID в `deletedTrainingIds` — также писать в `sessionStorage('pending_delete_trainings')`.
   - В `flushPendingDeletes` — читать ключ, удалять, очищать.
   - При монтировании `TrainingsPage` (или в `useTrainings`) — проверять ключ и запускать флаш.

3. **`TrainingsPage`** — убрать локальный state `deletedTrainingIds`, использовать проп `onDeletedIdsChange` для передачи изменений наверх; локально держать только зеркальную копию для `filteredTrainings`.
