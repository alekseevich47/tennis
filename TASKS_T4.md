# TASKS_T4 — Улучшения раздела «Тренировки»

## Задача 1. Авто-закрытие записи при начале тренировки + бейдж

**Проблема.** Когда `date <= now`, `isBookingLocked = true` уже в коде, но бейдж «Запись закрыта»
не отображается — кнопка просто становится `disabled`.

### Шаги

1. **`TrainingCard.jsx`** — вычислять флаг `isStarted = new Date(training.date) <= new Date()`.
   Переопределить `effectivelyClosed = isClosed || isStarted`.

2. **`TrainingCard.jsx` → `card-slots-row`** — унифицировать логику отображения бейджа статуса
   (см. Задачу 4 ниже, реализуется совместно).

3. **PocketBase hook** (`pb_hooks/trainings_auto_close.pb.js`) — `onRecordBeforeUpdate` / `onRecordView`:
   при запросе тренировки, у которой `date <= now && !is_closed`, автоматически проставлять
   `is_closed = true` через `$app.dao().saveRecord(...)`.
   > Альтернатива: не писать хук, доверять клиентской логике `effectivelyClosed`.
   > Хук нужен для консистентности при обращении к API из других клиентов.

---

## Задача 2. Модератор может добавить игрока после закрытия (при наличии мест)

**Проблема.** При `isBookingLocked = true` кнопка `+` рендерится с `disabled={true}`.
Модератор лишён возможности дозаписать игрока даже если есть свободные места.

### Шаги

1. **`TrainingCard.jsx`** — в условии `disabled` для кнопки «+» (`btn-add-plus`) убрать ограничение
   для модератора: `disabled={!userIsModerator && isBookingLocked}`.

2. **`services/trainings.js` → `bookUsersToTraining`** — убедиться, что сервисный слой не блокирует
   запись на закрытую тренировку на стороне клиента (проверить, нет ли guard-а перед `pb.collection`).

3. **PocketBase updateRule для `trainings`** — если нужна серверная защита: разрешить запись
   только модераторам после закрытия (опционально, зависит от бизнес-требований).

---

## Задача 3. Прокрутка списка тренировок

**Проблема.** `.trainings-list-layout` имеет `overflow-y: auto` и `flex: 1`, но прокрутка
не работает — список сжимается. Причина: у `.trainings-container` нет `min-height: 0`,
а flex-родитель (таб-контейнер в `App.jsx`) не ограничивает высоту жёстко.

### Шаги

1. **`Trainings.css`** — добавить `min-height: 0` к `.trainings-container`:
   ```css
   .trainings-container {
     min-height: 0;
   }
   ```

2. **`Trainings.css`** — убедиться, что `.trainings-list-layout` не имеет `min-height: 0`
   конфликтующего с `flex: 1`. При необходимости заменить `flex: 1` на `flex: 1 1 0`.

3. **`App.jsx` / глобальный CSS** — проверить, что таб-контейнер, внутри которого рендерится
   `<TrainingsPage>`, имеет `overflow: hidden` и `height: 100%` (или `flex: 1 1 0`).
   При необходимости добавить `min-height: 0` к цепочке flex-потомков.

4. **Webview-специфика** — убедиться, что на корневом элементе страницы нет `overflow: hidden`
   без явной высоты, блокирующего нативный скролл MAX WebView.

---

## Задача 4. Бейдж «Запись открыта» / «Запись закрыта» при ограниченном количестве мест

**Проблема.** При `hasLimit = true` (задан `max_slots`) бейдж статуса не отображается.
Бейдж должен стоять **слева** от счётчика мест.

### Шаги

1. **`TrainingCard.jsx`** — ввести вычисляемый `effectivelyClosed` (объединяет `is_closed` и `isStarted`,
   см. Задачу 1).

2. **`TrainingCard.jsx` → `card-slots-row`** — вынести рендер бейджа статуса в отдельный фрагмент,
   показывать его всегда (независимо от `hasLimit`), размещать перед счётчиком:

   ```jsx
   {!isFull && (
     <span className={clsx('card-status-badge', effectivelyClosed
       ? 'card-status-badge--closed'
       : 'card-status-badge--open')}>
       {effectivelyClosed ? 'Запись закрыта' : 'Запись открыта'}
     </span>
   )}
   {hasLimit && (
     <>
       <span className="card-slots-counter">{totalBooked} / {training.max_slots} мест</span>
       {isFull && <span className="card-slots-badge-full">Мест нет</span>}
     </>
   )}
   ```

3. **`Trainings.css`** — добавить стили для `.card-status-badge--open` (зелёный, как текущий
   `.no-limit-label`) и `.card-status-badge--closed` (серый / красный). Удалить устаревший
   модификатор `.no-limit-label` после переноса логики.

4. **`TrainingDetailModal.jsx`** — проверить, отображается ли статус записи в детальной карточке;
   при необходимости применить ту же логику `effectivelyClosed`.
