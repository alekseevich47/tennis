# TASKS_F11 — Рефакторинг UI Ленты (Feed)

## Контекст и справочные файлы

| Роль | Файл |
|------|------|
| Страница | `client/src/features/feed/FeedPage.jsx` |
| Карточка поста | `client/src/features/feed/PostCard.jsx` |
| Модал поста | `client/src/features/feed/PostDetailModal.jsx` |
| Превью комментариев | `client/src/features/feed/CommentsPreview.jsx` |
| Стили ленты | `client/src/features/feed/Feed.css` |
| Эталон лайков Галереи | `client/src/features/gallery/GalleryPage.jsx` (компонент `GalleryItemLike`) |
| Хук лайков Галереи | `client/src/hooks/useGalleryLikes.js` |
| Сервис Галереи | `client/src/services/catalog.js` (`listGalleryLikes`, `toggleGalleryLike`) |
| Стили Галереи | `client/src/features/gallery/Gallery.css` (`.gallery-item-like*`, `.gallery-comment-icon-button*`) |
| Эталон комментариев Галереи | `client/src/features/gallery/GalleryCommentModal.jsx` |

---

## Шаг 1 — Backend: коллекция `post_likes` в PocketBase

**Редактировать:** через Admin UI PocketBase (или миграцию, если есть инфраструктура).

- Создать коллекцию `post_likes` по аналогии с `gallery_likes`:
  - `post` — relation → `posts` (required)
  - `user` — relation → `users` (required)
  - Уникальный индекс `(post, user)`.
- Правила доступа: чтение — публичное; создание/удаление — только авторизованные.

---

## Шаг 2 — Сервис: функции лайков постов

**Редактировать:** `client/src/services/posts.js`

- Добавить `listPostLikes(postId)` — аналог `listGalleryLikes` из `catalog.js`.
- Добавить `togglePostLike(postId, userId)` — аналог `toggleGalleryLike`.

---

## Шаг 3 — Хук `usePostLikes`

**Создать:** `client/src/hooks/usePostLikes.js`

- Точная копия структуры `useGalleryLikes.js`, но через `listPostLikes` / `togglePostLike`.
- Ключ SWR: `['post_likes', postId]`.

---

## Шаг 4 — Компонент `PostCardLike` + иконка-комментарий в `PostCard`

**Редактировать:** `client/src/features/feed/PostCard.jsx`

### 4a. Лайк (левый нижний угол карточки)
- Принять `user` prop в `PostCard` (пробросить из `FeedPage`).
- Добавить встроенный компонент `PostCardLike({ postId, user })` по образцу `GalleryItemLike` из `GalleryPage.jsx` (те же ветки: readonly без userId, кнопка с toggle).
- Разместить под `feed-card-footer` слева в абсолютном позиционировании (или как flex-child в новом `.feed-card-bottom-bar`).

### 4b. Иконка комментария (правый нижний угол)
- Заменить `<button className="comment-btn">💬 Комментарии</button>` на SVG-кнопку без текста (outline speech-bubble).
- Поведение: `onOpenDetail(post, true)` — открытие модалки с `focusComment=true`, **без** `focus()` на поле ввода (см. Шаг 7).
- Расположение: правый нижний угол, симметрично лайку.

### 4c. Иконки карандаш/корзина (шапка карточки)
- Заменить `<span>✎</span>` на outline SVG-карандаш (stroke, fill:none).
- Заменить `<span>🗑</span>` на outline SVG-корзину с красным цветом (stroke, fill:none, color:#ff3b30).
- Использовать те же SVG-пути, что в `GalleryCommentModal.jsx` (строки 168–170 и 181–186).

---

## Шаг 5 — Пробрасываем `user` в `PostCard` из `FeedPage`

**Редактировать:** `client/src/features/feed/FeedPage.jsx`

- Добавить `user={user}` в вызов `<PostCard ... />`.

---

## Шаг 6 — Аватар автора комментария в `PostDetailModal`

**Редактировать:** `client/src/features/feed/PostDetailModal.jsx`

- Импортировать `Avatar` из `../../components/ui/Avatar`.
- В блоке `.comment-header-row` добавить `<Avatar user={c.expand?.author} size="sm" />` слева от имени автора — по аналогии со строками 194–202 `GalleryCommentModal.jsx`.
- Убедиться, что `expand` включает `author` в хуке `useComments` (проверить `client/src/hooks/useComments.js`).

---

## Шаг 7 — Убрать принудительный `focus` клавиатуры при открытии через иконку

**Редактировать:** `client/src/features/feed/PostDetailModal.jsx`

- Текущая логика (строки 71–76): при `focusComment=true` вызывает `.focus()` на поле ввода.
- Оставить скролл к комментариям, но убрать `focus()` (чтобы клавиатура на мобильных не всплывала автоматически).
- `focusComment` теперь используется только как сигнал «проскроллить к комментариям».

---

## Шаг 8 — SVG-иконки карандаш/корзина в `PostDetailModal`

**Редактировать:** `client/src/features/feed/PostDetailModal.jsx`

- Аналогично Шагу 4c: заменить `✏️` и `✕` в `comment-actions-btns` на outline SVG (те же пути, что в `GalleryCommentModal.jsx`).
- Использовать классы по образцу `.gallery-comment-icon-button` / `.gallery-comment-icon-button--delete`.

---

## Шаг 9 — CSS

**Редактировать:** `client/src/features/feed/Feed.css`

- `.feed-card-bottom-bar` — flex-row, space-between, позиция внутри `.feed-card`.
- `.post-card-like` — скопировать стили `.gallery-item-like` из `Gallery.css` (строки 145–206), адаптировать позиционирование под карточку (не абсолютное, а flex-child слева).
- `.post-card-comment-btn` — outline SVG-кнопка справа, без текста, аналог иконки комментария в Галерее.
- `.post-comment-icon-button` / `.post-comment-icon-button--delete` — скопировать из `.gallery-comment-icon-button*` (`Gallery.css` строки 388–428).
- Убедиться, что `.feed-card` имеет `position: relative` (уже есть).

---

## Порядок выполнения

```
Шаг 1 (PocketBase) → Шаг 2 → Шаг 3 → Шаг 4 + Шаг 5 → Шаг 6 → Шаг 7 → Шаг 8 → Шаг 9
```

Шаги 4, 5, 6, 7, 8, 9 можно делать параллельно после Шага 3.
