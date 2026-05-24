# TASKS_G1 — Gallery: удаление медиа, улучшение комментариев, лайки в превью

---

## Задача 1 — Мультиселект и удаление медиа (модератор)

### 1.1 Состояние выбора в GalleryPage

**Читать:** `GalleryPage.jsx`  
**Редактировать:** `GalleryPage.jsx`

- Добавить состояния: `selectedIds: Set<string>`, `isSelectMode: boolean`
- На каждый `<button class="gallery-item">` повесить `onLongPress` (300 мс через `pointerdown` + `pointermove` cancel + `pointerup`/`pointercancel`)
- В режиме выбора: клик по превью — toggle выбора вместо открытия полноэкрана
- Выбранный элемент — добавить класс `gallery-item--selected` (чекбокс-оверлей через CSS)
- Отменить режим выбора при переходе в полноэкран или клике вне сетки

### 1.2 Кнопка «Добавить» → «Удалить»

**Читать:** `GalleryPage.jsx`, `Gallery.css`  
**Редактировать:** `GalleryPage.jsx`, `Gallery.css`

- Если `isSelectMode && selectedIds.size > 0` — `floating-add-btn` рендерится красным с текстом «Удалить (N)»
- CSS-класс `floating-add-btn--delete` для красного варианта

### 1.3 Сервисный метод и хук

**Читать:** `services/catalog.js`, `hooks/useGallery.js`  
**Редактировать:** `services/catalog.js`

- `deleteGalleryImage(imageId)` уже есть → добавить `deleteGalleryImages(ids: string[])` — `Promise.all` по массиву
- В `GalleryPage` вызвать `deleteGalleryImages`, после — `mutate()` из `useGallery`, выйти из `isSelectMode`

### 1.4 CSS: выделение ячейки

**Редактировать:** `Gallery.css`

- `.gallery-item--selected`: overlay с чекбоком (псевдоэлемент `::after`) + полупрозрачный фон

---

## Задача 2 — Кнопка удаления медиа в полноэкранном режиме

**Читать:** `GalleryMediaOverlay.jsx`, `GalleryPage.jsx`, `Gallery.css`  
**Редактировать:** `GalleryMediaOverlay.jsx`, `GalleryPage.jsx`, `Gallery.css`

- Добавить prop `onDelete?: () => void` и `canDelete: boolean` в `GalleryMediaOverlay`
- Рендерить красную иконку-корзинку (SVG outline) между лайком и комментарием только если `canDelete`
- По клику — `useAlertDialog` (`alert`/`confirm`) с подтверждением → вызов `deleteGalleryImage(mediaId)` → `mutate()` → `onClose()` fullscreen
- В `GalleryPage` передавать `canDelete={moderator}` и `onDelete` реализовать там же

---

## Задача 3 — Редизайн комментариев

**Читать:** `GalleryCommentModal.jsx`, `Gallery.css`  
**Редактировать:** `GalleryCommentModal.jsx`, `Gallery.css`

### 3.1 Дата → правый нижний угол

- Переместить `gallery-comment-item__date` из хедера в низ карточки, `text-align: right`
- Обновить CSS: flexbox-карточка с `flex-direction: column`, дата внутри футера карточки

### 3.2 Кнопка «Удалить» → иконка корзинки (outline, красная), правый верхний угол

- Убрать кнопку-текст, добавить абсолютно позиционированный SVG `trash` outline в верхний правый угол карточки
- Видима только модератору (`userIsModerator`)
- Стейт `deletingId` остаётся, иконка disabled во время удаления

### 3.3 Иконка карандашика (редактирование), слева от корзинки

**Читать:** `services/catalog.js`  
**Редактировать:** `GalleryCommentModal.jsx`, `services/catalog.js`, `Gallery.css`

- Показывать карандашик автору своего комментария (`comment.author === user?.id`) или модератору
- При клике — inline-режим редактирования: `textarea` вместо `<p>` с кнопками «Сохранить» / «Отмена»
- Добавить `updateGalleryComment(commentId, text)` в `catalog.js` → `pb.collection('gallery_comments').update(commentId, { text })`
- Состояние: `editingId: string | null`, `editText: string`

### 3.4 Разрешение на удаление любого комментария модератором

- Уже реализовано через `userIsModerator` — убедиться, что корзинка видна для **всех** комментариев при `userIsModerator`, независимо от `comment.author`

---

## Задача 4 — Аватарка автора комментария

**Читать:** `GalleryCommentModal.jsx`, `components/ui/Avatar.jsx`, `lib/avatar.js`, `services/catalog.js`  
**Редактировать:** `GalleryCommentModal.jsx`, `Gallery.css`

- `expand: 'author'` уже есть в `listGalleryComments`; поле `avatar` есть в PocketBase `users`
- Добавить `<Avatar user={comment.expand?.author} size="sm" />` слева от имени автора
- CSS: flex-row, аватарка 28px, имя — `font-weight: 600`
- `Avatar` поддерживает fallback-инициал — работает без изменений

---

## Задача 5 — Лайк в превью галереи

**Читать:** `GalleryPage.jsx`, `hooks/useGalleryLikes.js`, `Gallery.css`  
**Редактировать:** `GalleryPage.jsx`, `Gallery.css`

- Создать компонент `GalleryItemLike` (или inline в `GalleryPage`) — использует `useGalleryLikes(item.id)` для одного элемента
- Рендерить поверх каждого `gallery-item` абсолютно позиционированный блок: иконка ♡/♥ + счётчик лайков (правый нижний угол превью)
- Клик по блоку лайка — `toggle(item.id, user?.id)`, **не** открывает полноэкран (`.stopPropagation()`)
- Блок скрыт в режиме мультиселекта
- Если `!user?.id` — показывать иконку без интерактивности (только счётчик)

> **Важно:** `useGalleryLikes` вызывается для каждого элемента — в большой галерее это N запросов. Можно оптимизировать позже через суммарный список лайков, но для первой итерации — приемлемо.

---

## Порядок реализации

1. Задача 3 (комментарии) — изолирована, не зависит от других
2. Задача 4 (аватарки) — после 3
3. Задача 1 (мультиселект) — изолирована
4. Задача 2 (удаление в fullscreen) — после 1
5. Задача 5 (лайки в превью) — изолирована

---

## Справочник файлов

| Файл | Роль |
|---|---|
| `features/gallery/GalleryPage.jsx` | Основной компонент, грид, fullscreen, селект |
| `features/gallery/GalleryMediaOverlay.jsx` | Лайк + комментарий + (новая) корзинка в fullscreen |
| `features/gallery/GalleryCommentModal.jsx` | Список и форма комментариев |
| `features/gallery/Gallery.css` | Все стили галереи |
| `hooks/useGallery.js` | SWR-хук списка медиа |
| `hooks/useGalleryLikes.js` | SWR-хук лайков с optimistic update |
| `hooks/useGalleryComments.js` | SWR-хук комментариев |
| `services/catalog.js` | API-методы PocketBase (deleteGalleryImage, listGalleryComments, createGalleryComment, deleteGalleryComment) |
| `components/ui/Avatar.jsx` | Готовый компонент аватарки |
| `lib/avatar.js` | Утилита `getUserAvatarData` |
| `components/ui/AlertDialog` | `useAlertDialog` для confirm-диалогов |
