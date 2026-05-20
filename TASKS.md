# TASKS — Раздел Trainings: план реализации

## Контекст архитектуры

- Данные: SWR `useTrainings` → `listTrainings` → `pb.collection('trainings')`
- UI: `TrainingsPage` → `CalendarStrip` + `TrainingCard` (preview) + `TrainingDetailModal` (модальное окно)
- Роли: `isModerator()` из `services/auth`
- Паттерн soft-delete — как в `FeedPage` (`is_deleted` поле + optimistic SWR update)
- Конвенции: `useAlertDialog`, `Modal`, `IconButton`, `lib/log`

---

## Шаг 1 — Schema _(вносит пользователь вручную)_

Добавить в коллекцию `trainings` в PocketBase Admin UI:

- `is_deleted` — `bool`, default `false`
- `is_closed` — `bool`, default `false`
- `attended_users` — `relation → users`, maxSelect 999

---

## Шаг 2 — `services/trainings.js`: новые функции

- `softDeleteTraining(id)` → `update(id, { is_deleted: true })`
- `restoreTraining(id)` → `update(id, { is_deleted: false })`
- `closeTraining(id)` → `update(id, { is_closed: true })`
- `reopenTraining(id)` → `update(id, { is_closed: false })`
- `bookUserToTraining(training, userId)` — записать произвольного пользователя (для модератора); логика аналогична `bookTraining`, без self-check
- `markAttendance(training, userId)` → добавить в `attended_users`
- `unmarkAttendance(training, userId)` → убрать из `attended_users`
- Обновить `listTrainings`: добавить `expand: 'booked_users,attended_users'`; для обычных пользователей фильтровать `is_deleted != true` (модератор видит все)

---

## Шаг 3 — `services/users.js` (новый файл)

- `listUsers()` → `pb.collection('users').getFullList({ fields: 'id,full_name', sort: 'full_name' })`

---

## Шаг 4 — `CalendarStrip.jsx`: 2 строки по 7 дней

- Разбить `days` (14 шт.) на два массива по 7
- Рендерить два `<div className="calendar-row">` вместо одной полосы
- Убрать горизонтальный scroll; CSS: `grid` или `flex-wrap` на родителе

---

## Шаг 5 — `UserPickerModal.jsx` (новый компонент)

- Пропы: `isOpen`, `onClose`, `onSelect(userId)`, `excludeIds[]`
- Загружает `listUsers()` при открытии (локальный `useState` + `useEffect`)
- Фильтрует `excludeIds` из списка
- Поиск по `full_name` (локальная фильтрация)
- По нажатию на имя → `onSelect(user.id)`, закрывается

---

## Шаг 6 — `EditTrainingModal.jsx` (новый компонент)

- Пропы: `isOpen`, `training`, `onClose`, `onSaved(updatedTraining)`
- Форма: `date`, `duration`, `type` (select group/tournament), `max_slots`, `location`, `description`
- При сабмите → `updateTraining(training.id, patch)` → `onSaved`

---

## Шаг 7 — `TrainingCard.jsx`: новые кнопки (preview)

Порядок кнопок справа (для модератора):

`[+ | ✕]` (запись/отмена — обычный user)  →  `[■ stop]`  →  `[✏️ edit]`  →  `[🗑️ delete]`

Изменения:
- Кнопка `+` для **модератора** → callback `onBookUser(training)` (открыть UserPicker), а не самозапись
- Кнопка `+` для **обычного user** → остаётся `onBook(training)` (самозапись)
- Блокировать `+` если `training.is_closed === true` или `new Date(training.date) <= new Date()`
- Добавить для модератора: `onToggleClose(training)` (кнопка stop — красный квадрат ■)
- Добавить для модератора: `onEdit(training)` (кнопка карандаш)
- Изменить `onDelete`: soft-delete (не `deleteTraining`); показывать deleted-state с кнопкой «Восстановить»

---

## Шаг 8 — `TrainingDetailModal.jsx`: новые секции и кнопки

Порядок кнопок модератора в шапке/футере модального окна:

`[■ stop]`  →  `[✏️ edit]`  →  `[🗑️ delete]`

Изменения:
- Кнопка `+` рядом с заголовком «Записанные игроки» → для модератора открывает `UserPickerModal`; вызывает `bookUserToTraining`
- Добавить кнопки: `onToggleClose`, `onEdit`, `onDelete` (soft-delete) — передаются из `TrainingsPage`
- В списке участников: у каждого игрока — чекбокс/иконка посещаемости; модератор отмечает любого, user — только себя; вызывает `onToggleAttendance(training, userId)`
- Индикатор статуса записи: если `is_closed` или тренировка началась — показать «Запись закрыта»

---

## Шаг 9 — `TrainingsPage.jsx`: новые обработчики

- `handleSoftDelete(trainingId)` — optimistic update `is_deleted: true` в SWR-кэше; показать уведомление «Удалено» с кнопкой «Восстановить» (как FeedPage `deletedPostIds`)
- `handleRestore(trainingId)` — optimistic update `is_deleted: false`
- `handleToggleClose(training)` — `closeTraining` / `reopenTraining` + `mutate`
- `handleEdit(training)` → `setEditingTraining(training)` → открыть `EditTrainingModal`
- `handleBookUser(training)` → `setBookingTraining(training)` → открыть `UserPickerModal`; после выбора → `bookUserToTraining` + `mutate`
- `handleToggleAttendance(training, userId)` → `markAttendance` / `unmarkAttendance` + optimistic SWR update
- Добавить рендер `<EditTrainingModal>` и `<UserPickerModal>` в JSX
- Прокинуть новые пропы в `TrainingCard` и `TrainingDetailModal`

---

## Шаг 10 — `Trainings.css`: стили

- `.calendar-strip` — убрать `overflow-x: scroll`; сделать 2 строки по 7 (grid или flex-wrap)
- `.action-circle-btn.btn-stop` — красный квадрат ■ (аналог `btn-delete-trash`)
- `.action-circle-btn.btn-edit` — карандаш нейтральный цвет
- Стили для `UserPickerModal`: список, строка поиска, элемент пользователя
- Стили для состояния `is_deleted` тренировки в карточке (затемнение + кнопка восстановления)
- Стили для посещаемости: чекбокс/иконка у строки игрока

---

## Порядок реализации (зависимости)

```
1 (schema) → 2, 3 (services)
           → 4 (CalendarStrip — независимо)
2, 3       → 5 (UserPickerModal)
2          → 6 (EditTrainingModal)
5, 6, 2    → 7 (TrainingCard)
5, 6, 2    → 8 (TrainingDetailModal)
7, 8, 5, 6 → 9 (TrainingsPage)
все        → 10 (CSS)
```
