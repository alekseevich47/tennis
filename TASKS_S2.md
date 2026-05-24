# TASKS_S2 — Галерея: полный редизайн

## Читать при генерации кода
- `client/src/features/gallery/GalleryPage.jsx` — текущий код галереи
- `client/src/features/gallery/Gallery.css` — текущие стили
- `client/src/features/feed/FullscreenImageViewer.jsx` — переиспользуемый вьювер (читать, минимально менять)
- `client/src/features/feed/FeedPage.jsx` — паттерн floating-btn, fullscreenMedia state, scroll-hide
- `client/src/features/shop/ShopPage.jsx` — второй пример того же паттерна
- `client/src/components/ProductUploadProvider.jsx` — образец провайдера загрузки
- `client/src/components/PostUploadProvider.jsx` — второй образец
- `client/src/services/catalog.js` — существующие gallery-функции + образец createProductWithProgress (стр. 128–189)
- `client/src/features/feed/PostDetailModal.jsx` — образец модального окна с комментариями
- `client/src/App.jsx` — монтирование GalleryPage (стр. 160–166), подключение провайдеров

---

## 0. Изменения в БД (сделать вручную в PocketBase)

### Коллекция `gallery` — добавить поля:
| Поле | Тип | Обязательное | Примечание |
|------|-----|---|---|
| `aspect_ratio` | number (float) | нет | ширина / высота файла; вычисляется на клиенте перед загрузкой |
| `media_type` | text | нет | значения: `image` \| `video`; если пусто — считать `image` |
| `video` | file (single) | нет | для видеофайлов; поле `image` остаётся для изображений |

### Новая коллекция `gallery_likes`:
| Поле | Тип | Обязательное |
|------|-----|---|
| `media_id` | relation → `gallery`, required | да |
| `user` | relation → `users`, required | да |

- Уникальный индекс на пару `(media_id, user)`.
- API rules: list/view — `@request.auth.id != ""`; create — `@request.auth.id != ""`; delete — `@request.auth.id = user`.

### Новая коллекция `gallery_comments`:
| Поле | Тип | Обязательное |
|------|-----|---|
| `media_id` | relation → `gallery`, required | да |
| `author` | relation → `users`, required | да |
| `text` | text | да |
| `is_deleted` | bool, default `false` | нет |

- API rules: аналогично коллекции `comments` (list/view/create — authenticated, update/delete — `@request.auth.id = author`).

---

## Задачи

---

### 1. Прямой выбор файлов (без модального окна)

**Редактировать:** `client/src/features/gallery/GalleryPage.jsx`

- Удалить импорт и использование `AddImageModal`, `addGalleryImage`, `showAddModal` state.
- Добавить `const fileInputRef = useRef(null)`.
- Добавить скрытый `<input type="file" ref={fileInputRef} multiple accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />`.
- Кнопка "Добавить" → `fileInputRef.current.click()`.
- `handleFileChange(event)`:
  1. Перебирает `[...event.target.files]`.
  2. Для каждого файла вычисляет `aspect_ratio` и `media_type`:
     - `media_type = file.type.startsWith('video/') ? 'video' : 'image'`
     - Для изображений: `new Image()` + `URL.createObjectURL(file)` + `onload` → `img.naturalWidth / img.naturalHeight`.
     - Для видео: `document.createElement('video')` + `src = URL.createObjectURL(file)` + `onloadedmetadata` → `video.videoWidth / video.videoHeight`.
     - После получения размеров — `URL.revokeObjectURL(...)`.
  3. Передаёт `startUpload(items)` в `GalleryUploadProvider` (задача 2).
  4. Сбрасывает `event.target.value = ''`.
- Добавить импорт `useGalleryUpload` из провайдера.

---

### 2. Фоновая загрузка с прогресс-баром

**Создать:** `client/src/components/GalleryUploadProvider.jsx`
**Создать:** `client/src/components/GalleryUploadProvider.css`

Паттерн один в один с `ProductUploadProvider`. Особенности:
- `startUpload(items: Array<{ file: File, aspect_ratio: number, media_type: string }>)` — загружает файлы последовательно (один за другим, чтобы не перегружать канал).
- Прогресс-сообщение: `"Загрузка 2 из 5: 67%"`.
- После каждого успешного файла: `mutate((key) => Array.isArray(key) && key[0] === 'gallery')` для добавления нового элемента в начало кэша.
- После всех файлов: `"Добавлено N фото/видео"`, исчезает через 1400 мс.
- Экспортирует `GalleryUploadProvider` и `useGalleryUpload`.

**Редактировать:** `client/src/services/catalog.js`

Добавить функцию `createGalleryItemWithProgress(payload: FormData, { signal, onProgress })`:
- XHR-реализация аналогично `createProductWithProgress` (строки 128–189).
- POST на `/api/collections/gallery/records`.

Обновить `addGalleryImage`: принимает `{ file, aspect_ratio, media_type }`, формирует `FormData` с полями `image` (или `video` если видео), `aspect_ratio`, `media_type`.

Обновить `GalleryRecord` typedef: добавить поля `aspect_ratio`, `media_type`, `video`.

**Редактировать:** `client/src/App.jsx`

Обернуть `<GalleryPage user={user} />` в `<GalleryUploadProvider>` (строка 166), по аналогии с `ProductUploadProvider` для `ShopPage` (строки 160–163).

---

### 3. Плавающая кнопка "Добавить"

**Редактировать:** `client/src/features/gallery/GalleryPage.jsx`

- Удалить `<div className="gallery-action-bar">` и `<button className="gallery-add-btn">`.
- Добавить `const containerRef = useRef(null)` и `const [isButtonVisible, setIsButtonVisible] = useState(true)`.
- Scroll-listener на `containerRef.current` (точная копия паттерна из `ShopPage`, строки 43–63).
- `ref={containerRef}` на корневой `<section>`.
- Плавающая кнопка (только для `moderator`):
  ```jsx
  <div className="floating-btn-wrapper">
    <button
      type="button"
      className={clsx('floating-add-btn', isButtonVisible ? 'visible' : 'hidden')}
      onClick={() => fileInputRef.current?.click()}
    >
      Добавить
    </button>
  </div>
  ```
- Добавить импорт `clsx`.

---

### 4. Подключить `FullscreenImageViewer`

**Редактировать:** `client/src/features/gallery/GalleryPage.jsx`

- Добавить состояния `fullscreenMedia` (`{ items, index, originRect, originKey }`), `hiddenMediaKey`, `activeViewerIndex`.
- Хелперы `handleOpenFullscreen`, `handleCloseFullscreen`, `handleFullscreenCloseStart` — идентично `ShopPage`.
- При клике на `.gallery-item`:
  - `originKey = img.id`
  - `originRect = event.currentTarget.getBoundingClientRect()`
  - `items` — весь массив `images`, каждый элемент: `{ filename: img.image || img.video, url: getMediaUrl(img, 'gallery', img.media_type === 'video' ? img.video : img.image), isVideo: img.media_type === 'video', originKey: img.id }`
  - Вызвать `handleOpenFullscreen(items, clickedIndex, originRect, originKey)`.
- Добавить `data-media-origin-key={img.id}` на каждый `<button className="gallery-item">`.
- Удалить старый `{selectedImage && <div className="fullscreen-image">…</div>}` и состояния `selectedImage`, `selectedUrl`.
- Передать `onActiveIndexChange={setActiveViewerIndex}` в `<FullscreenImageViewer>`.
- Импорт: `import FullscreenImageViewer from '../feed/FullscreenImageViewer'`.
- Убрать импорт `IconButton` если не используется.

**Редактировать:** `client/src/features/feed/FullscreenImageViewer.jsx`

Добавить один опциональный prop: `onActiveIndexChange?: (index: number) => void`.
Вызывать его внутри `goTo()` после того как `activeIndex` меняется:
- В ветке с анимацией — вызвать после `slideTimerRef.current = window.setTimeout(...)` внутри таймера, перед `reset()`.
- В ветке без анимации — вызвать сразу после `setActiveIndex(normalizedIndex)`.

---

### 5. Сетка с оригинальными пропорциями

**Редактировать:** `client/src/features/gallery/GalleryPage.jsx`

Функция-хелпер `getAspectClass(ratio)`:
- `ratio < 0.8` → `'gallery-item--portrait'`
- `ratio > 1.25` → `'gallery-item--landscape'`
- иначе → `'gallery-item--square'`
- Нет `aspect_ratio` в записи → `'gallery-item--square'`

Применить класс: `className={clsx('gallery-item', getAspectClass(img.aspect_ratio))}`.

**Редактировать:** `client/src/features/gallery/Gallery.css`

Убрать `aspect-ratio: 1` из `.gallery-item`. Добавить:
```css
.gallery-item--square    { aspect-ratio: 1 / 1; }
.gallery-item--portrait  { aspect-ratio: 3 / 4; }
.gallery-item--landscape { aspect-ratio: 4 / 3; }
```

---

### 6. Лайки и комментарии в полноэкранном режиме

**Новые файлы:**
- `client/src/features/gallery/GalleryMediaOverlay.jsx`
- `client/src/features/gallery/GalleryCommentModal.jsx`
- `client/src/hooks/useGalleryLikes.js`
- `client/src/hooks/useGalleryComments.js`

**Редактировать:** `client/src/services/catalog.js`, `client/src/features/gallery/GalleryPage.jsx`, `client/src/features/gallery/Gallery.css`

#### Сервисы в `catalog.js`

```js
listGalleryLikes(mediaId)
// → GET gallery_likes, filter: media_id = mediaId, expand: user

toggleGalleryLike(mediaId, userId)
// → сначала ищет существующий лайк текущего пользователя
// → если есть — удаляет; если нет — создаёт { media_id: mediaId, user: userId }

listGalleryComments(mediaId)
// → GET gallery_comments, filter: media_id = mediaId && is_deleted = false, sort: created, expand: author

createGalleryComment({ mediaId, authorId, text })
// → создаёт запись { media_id, author, text }

deleteGalleryComment(commentId)
// → помечает is_deleted: true (soft delete)
```

#### `useGalleryLikes.js`

```js
export function useGalleryLikes(mediaId) {
  // SWR по ключу ['gallery_likes', mediaId]
  // Возвращает: { likes, count, isLiked(userId), toggle, isLoading }
}
```

#### `useGalleryComments.js`

```js
export function useGalleryComments(mediaId) {
  // SWR по ключу ['gallery_comments', mediaId]
  // Возвращает: { comments, mutate, isLoading }
}
```

#### `GalleryMediaOverlay.jsx`

Props: `{ mediaId: string | null, user: any, onCommentOpen: () => void }`

- Корневой `div`: `position: fixed; bottom: 0; left: 0; right: 0; z-index: 3100; pointer-events: none; padding: 24px 20px;`
- Внутри — flex row, `justify-content: space-between; align-items: flex-end`.
- **Кнопка лайк** (слева, `pointer-events: auto`):
  - Иконка сердечка: `♡` (пустое, серое) / `♥` (заполненное, `#ff3b30`) — в зависимости от `isLiked(user?.id)`.
  - Рядом цифра `count`.
  - Нажатие → `toggle(mediaId, user?.id)` + optimistic update в SWR.
  - Только для авторизованных; неавторизованным — кнопка видна, но при нажатии ничего не делает.
- **Кнопка комментарий** (справа, `pointer-events: auto`):
  - Иконка `💬` (или SVG-контур облачка).
  - Нажатие → `onCommentOpen()`.
- При `mediaId === null` — не рендерить ничего.

#### `GalleryCommentModal.jsx`

Props: `{ isOpen: bool, mediaItem: GalleryRecord | null, user: any, userIsModerator: bool, onClose: () => void }`

- Использует `Modal` из `client/src/components/ui/Modal.jsx`.
- Вверху — превью медиа: `<img>` или `<video controls>`, `max-height: 40vh; object-fit: contain`.
- Ниже — список комментариев из `useGalleryComments(mediaItem?.id)`.
- Каждый комментарий: имя автора (`expand.author.name`), текст, дата.
- Модератор видит кнопку удаления комментария.
- Форма добавления (только при `user?.id`): `<textarea>` + кнопка "Отправить".
- Структура аналогична `PostDetailModal.jsx`; читать как образец.

#### Подключение в `GalleryPage.jsx`

```jsx
// Новые состояния:
const [commentModalOpen, setCommentModalOpen] = useState(false);

// Текущий активный элемент галереи:
const activeGalleryItem = fullscreenMedia
  ? fullscreenMedia.items[activeViewerIndex] ?? null
  : null;
const activeGalleryRecord = activeGalleryItem
  ? images.find((img) => img.id === activeGalleryItem.originKey) ?? null
  : null;

// В JSX — рендерить когда viewer открыт:
{fullscreenMedia && (
  <GalleryMediaOverlay
    key={activeGalleryRecord?.id}
    mediaId={activeGalleryRecord?.id ?? null}
    user={user}
    onCommentOpen={() => setCommentModalOpen(true)}
  />
)}

<GalleryCommentModal
  isOpen={commentModalOpen}
  mediaItem={activeGalleryRecord}
  user={user}
  userIsModerator={moderator}
  onClose={() => setCommentModalOpen(false)}
/>
```

---

### 7. Очистка CSS

**Редактировать:** `client/src/features/gallery/Gallery.css`

- Удалить: `.gallery-action-bar`, `.gallery-add-btn`, `.fullscreen-image`, `.fullscreen-image img`, `.close-fullscreen`, `.delete-photo`.
- Добавить на `.gallery`: `height: 100%; overflow-y: auto; position: relative;` (чтобы sticky-кнопка работала).
- `.floating-btn-wrapper` и `.floating-add-btn` уже определены в `Feed.css` — CSS не дублировать.
- Добавить стили для `GalleryMediaOverlay` (лайк/комментарий кнопки) в `Gallery.css`.

---

### 8. Итоговые изменения импортов в `GalleryPage.jsx`

Добавить:
- `clsx`
- `useRef` (в деструктуризацию React)
- `FullscreenImageViewer` из `'../feed/FullscreenImageViewer'`
- `GalleryMediaOverlay` из `'./GalleryMediaOverlay'`
- `GalleryCommentModal` из `'./GalleryCommentModal'`
- `useGalleryUpload` из `'../../components/GalleryUploadProvider'`

Удалить:
- `import AddImageModal from './AddImageModal'`
- `import { addGalleryImage } from '../../services/catalog'`
- `import IconButton from '../../components/ui/IconButton'`

---

## Не трогать
- `AddImageModal.jsx` — только убрать импорт из GalleryPage; сам файл не удалять.
- `Feed.css` — только читать.
- `PostDetailModal.jsx` — только читать как образец.
- `ProductUploadProvider.jsx` / `PostUploadProvider.jsx` — только читать как образец.
