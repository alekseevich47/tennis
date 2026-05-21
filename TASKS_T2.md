# TASKS_T2 — Улучшения раздела Trainings

## T2-1. Прокрутка списка тренировок

**Проблема:** `.trainings-list-layout` использует механизм expand/collapse через wheel/swipe —
на ПК колесо мыши переключает состояние вместо прокрутки; карточки сжимаются при нехватке высоты.

**Решение:** убрать логику `isListExpanded` / `handleListWheel` / `handleListTouchStart` / `handleListTouchEnd`.
Контейнер списка должен просто скроллиться:

- CSS: `.trainings-list-layout` — убрать `max-height` и `transition`, задать `flex: 1; overflow-y: auto; overscroll-behavior: contain;`
- `TrainingsPage.jsx`: удалить state `isListExpanded`, refs `listTouchStartYRef`, все три handler-а (wheel, touchStart, touchEnd), `LIST_SWIPE_THRESHOLD`.
- Убрать `clsx` с `trainings-list-layout--expanded` и сам класс-модификатор из CSS.

---

## T2-2. Бейдж «Мест нет» в превью карточки

**Проблема:** «Мест нет» отображается как кнопка справа; нужно — компактным бейджем рядом со счётчиком `X / Y мест` (слева в карточке), для обеих ролей.

**Решение** (`TrainingCard.jsx`):

- В блоке `card-slots-counter` добавить условный бейдж рядом: если `isFull` — рендерить `<span className="card-slots-badge-full">Мест нет</span>` сразу после счётчика мест (вне `card-buttons-wrapper`).
- Из логики кнопок убрать ветку `isFull ? <button disabled>Мест нет</button>` — теперь при заполненной тренировке пользователь просто не видит кнопку «+».
- CSS: добавить `.card-slots-badge-full` — стиль аналогичен `.card-slots-counter`, но с красным акцентом (`color: #e63946; background: #fff0f1`).
- Обернуть счётчик и бейдж в общий flex-контейнер (`.card-slots-row`) с `gap: 6px; align-items: center;`.

---

## T2-3. Удаление checkbox посещаемости

**Затронутые файлы:** `TrainingDetailModal.jsx`, `TrainingsPage.jsx`, `Trainings.css`, `services/trainings.js`.

**Шаги:**

1. `TrainingDetailModal.jsx`: убрать `<input type="checkbox">` из `player-list-row`; убрать prop `onToggleAttendance`; убрать переменную `attendedUserIds`; убрать `canToggleAttendance`.
2. `TrainingsPage.jsx`: удалить `handleToggleAttendance`, импорты `markAttendance` / `unmarkAttendance`, передачу `onToggleAttendance` в `<TrainingDetailModal>`.
3. `services/trainings.js`: можно оставить функции `markAttendance`/`unmarkAttendance` (поле `attended_users` в схеме остаётся), но если нигде не используются — удалить импорты в page.
4. `Trainings.css`: удалить блоки `.player-meta-left input[type='checkbox']` (три правила: базовый, `:disabled`, `:focus-visible`).

---

## T2-4. Блокировка отмены записи после начала тренировки (user)

**Проблема:** `isBookingLocked` проверяется только для кнопки «+»; кнопка «✕» отмены доступна пользователю даже когда тренировка уже началась.

**Решение** (`TrainingCard.jsx`):

- Условие рендера кнопки отмены изменить с:
  ```
  !userIsModerator && isUserBooked
  ```
  на:
  ```
  !userIsModerator && isUserBooked && !isBookingLocked
  ```
  (`isBookingLocked` уже вычислен: `isClosed || new Date(training.date) <= new Date()`).
- Модератор: кнопка «Отменить запись» (kick) в `TrainingDetailModal` остаётся без ограничений.
- Дополнительно: если пользователь записан, но отмена заблокирована — показывать нейтральный бейдж «Вы записаны» в `card-buttons-wrapper` (опционально, по дизайну).
