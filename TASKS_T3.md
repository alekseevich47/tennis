# TASKS_T3 — Раздел «Магазин»: план реализации

---

## 0. Изменения в БД (вручную)

### Новая коллекция `product_categories`
| Поле | Тип | Параметры |
|---|---|---|
| `name` | text | required |

- `listRule` / `viewRule`: `""` (все)
- `createRule` / `updateRule` / `deleteRule`: `@request.auth.id != "" && @request.auth.role = "moderator"`
- Сидировать записями: «Ракетки», «Аксессуары», «Одежда», «Обувь»

### Добавить в коллекцию `products`
| Поле | Тип | Параметры |
|---|---|---|
| `categories` | relation → `product_categories` | maxSelect: unlimited |
| `out_of_stock` | bool | default false |
| `is_deleted` | bool | default false |

### Контакт модератора (кнопка «Купить»)
- В публичной документации MAX нет подтверждённого клиентского deep link для открытия личного чата по `max_id`; `max://user/{user_id}` описан только как формат mention в сообщениях бота.
- Для клиентской кнопки «Купить» использовать документированный шеринг: `window.WebApp.shareMaxContent({ text })`, fallback deep link `https://max.ru/:share?text={text}` через `window.WebApp.openMaxLink(url)` / `window.open(url)`. Добавить константу `MAX_SHARE_URL_TEMPLATE` в `client/src/config.js`.
- Если понадобится автоматическая отправка именно модератору, делать это серверно через Bot API `POST https://platform-api.max.ru/messages?user_id={max_id}` с токеном бота; токен не хранить в клиенте.

---

## 1. Сервисный слой — `catalog.js`

**Читать:** `client/src/services/catalog.js`, `client/src/services/posts.js`  
**Редактировать:** `client/src/services/catalog.js`

- Добавить `ProductCategoryRecord` typedef.
- Расширить `ProductRecord`: поля `categories`, `out_of_stock`, `is_deleted`.
- Добавить `listProductCategories({ signal? })` — `getFullList` коллекции `product_categories`, sort: `name`.
- В `listProducts`: добавить фильтр `is_deleted = false` (базово), параметр `categoryId?` для фильтрации.
- Добавить `softDeleteProduct(id)` — `update(id, { is_deleted: true })` вместо физического delete.
- Добавить `createProductWithProgress(payload, { signal, onProgress })` по образцу `createPostWithProgress` из `posts.js`.

---

## 2. Хуки

**Читать:** `client/src/hooks/useProducts.js`, `client/src/hooks/usePosts.js`  
**Редактировать:** `client/src/hooks/useProducts.js`  
**Создать:** `client/src/hooks/useProductCategories.js`

- `useProducts({ categoryId? })` — SWR ключ `['products', categoryId]`.
- `useProductCategories()` — SWR ключ `['product_categories']`.

---

## 3. ProductUploadProvider

**Читать:** `client/src/components/PostUploadProvider.jsx`, `client/src/components/PostUploadProvider.css`  
**Создать:** `client/src/components/ProductUploadProvider.jsx`, `client/src/components/ProductUploadProvider.css`

- Полный аналог `PostUploadProvider` для товаров.
- Контекст: `startUpload(payload, productId?)` — создание и редактирование (при редактировании invalidate нужный SWR-ключ).
- После успеха: `mutate` ключей `['products', *]`.

**Редактировать:** `client/src/App.jsx`  
- Обернуть shop-часть в `<ProductUploadProvider>` (рядом с `<PostUploadProvider>`).

---

## 4. ShopPage

**Читать:** `client/src/features/feed/FeedPage.jsx`, `client/src/features/shop/ShopPage.jsx`  
**Редактировать:** `client/src/features/shop/ShopPage.jsx`

- Добавить `selectedCategoryId` state + хук `useProductCategories()`.
- Кастомный дропдаун категорий (не `<select>`, а кнопка + выпадающий список в стиле приложения) — вариант «Все категории» плюс список из БД.
- Добавить `deletedProductIds` state — буфер soft-delete (аналог `deletedPostIds` в FeedPage).
- Передавать `onDelete` / `onRestore` в `ProductCard`.
- `handleCreate` и `handleEdit` — закрывать модал сразу, вызывать `startUpload` из `useProductUpload`.
- `handleDelete(productId)` — добавлять в `deletedProductIds` + вызывать `softDeleteProduct` без confirm-диалога.
- Передавать `onOpenFullscreen` / `fullscreenMedia` state в `ProductCard` и `ProductDetail`; рендерить `<FullscreenImageViewer>` как в FeedPage.

---

## 5. ProductCard

**Читать:** `client/src/features/feed/PostCard.jsx`, `client/src/lib/gestures.js`, `client/src/features/shop/ProductCard.jsx`  
**Редактировать:** `client/src/features/shop/ProductCard.jsx`

- Свайп-галерея фото (left/right): `currentImageIndex` state, touch-handlers из `lib/gestures.js`.
- Точки-индикаторы под изображением (только если фото > 1).
- Нажатие на фото → `onOpenFullscreen(images, index)`.
- Пропс `isSoftDeleted`: overlay «Удалено» + кнопка «Восстановить» поверх карточки.
- Красный крестик (×) в правом верхнем углу (только moderator) — вызывает `onDelete(product.id)`.
- Отображение `out_of_stock` — бейдж «Нет в наличии» под ценой.
- Отображение категорий — чипы под заголовком (опционально, если не загромождает).

---

## 6. ProductForm (рефакторинг)

**Читать:** `client/src/features/feed/EditPostModal.jsx`, `client/src/features/feed/MediaPreviewGrid.jsx`, `client/src/features/feed/CreatePostModal.jsx`, `client/src/features/shop/ProductForm.jsx`  
**Редактировать:** `client/src/features/shop/ProductForm.jsx`

- При открытии на редактирование: предзаполнять все поля из `product` prop, в т.ч. существующие фото.
- Существующие фото: показывать через `getMediaUrl` в `MediaPreviewGrid`; крестик на фото добавляет имя файла в `imagesToDelete[]` (будет передан в FormData как `images-`).
- Новые фото: выбор через file input → `readSelectedFiles` → preview через `MediaPreviewGrid` с крестиком удаления.
- Выбор категорий: кастомный мульти-селект (список чекбоксов в дропдауне) — категории из `useProductCategories()`.
- Чекбокс «Нет в наличии» (`out_of_stock`).
- `handleSubmit`: собирать FormData (включая `imagesToDelete`, новые фото, `categories[]`, `out_of_stock`), вызывать `onSubmit(formData)` и сразу закрывать модал (загрузка в фоне).
- Не блокировать интерфейс прогрессом — прогресс-бар в `ProductUploadProvider`.

---

## 7. ProductDetail (рефакторинг)

**Читать:** `client/src/features/feed/PostDetailModal.jsx`, `client/src/features/feed/FullscreenImageViewer.jsx`, `client/src/features/shop/ProductDetail.jsx`, `client/src/services/auth.js`  
**Редактировать:** `client/src/features/shop/ProductDetail.jsx`

- Стилизовать в едином стиле с PostDetailModal (классы из `Feed.css` как образец для `Shop.css`).
- Галерея фото со свайпом + нажатие → `onOpenFullscreen(images, index)` (prop из ShopPage).
- Отображение `out_of_stock`: красный текст «Нет в наличии» под ценой.
- Категории: чипы под заголовком/описанием.
- Кнопка «Купить»: сформировать сообщение `"Хочу купить: ${product.title} #${product.id}"`, вызвать `window.WebApp?.shareMaxContent({ text })`; если метода нет — открыть `MAX_SHARE_URL_TEMPLATE` с URL-encoded `{text}` через `window.WebApp?.openMaxLink(url)` или `window.open(url)`.
- Кнопка «Удалить» (для moderator): сразу вызывает `onDelete()` без confirm → модал закрывается.
- Убрать `useAlertDialog` для подтверждения удаления.

---

## 8. Shop.css

**Читать:** `client/src/features/feed/Feed.css`, `client/src/components/PostUploadProvider.css`, `client/src/features/shop/Shop.css`  
**Редактировать:** `client/src/features/shop/Shop.css`

- Стили кастомного дропдауна категорий (фильтр и мульти-селект в форме).
- Стили свайп-галереи в карточке (индикаторы, контейнер).
- Overlay soft-delete на карточке + красный крестик moderator.
- Бейдж «Нет в наличии».
- Стили модального окна ProductDetail в стиле Ленты.
- Чипы категорий.

---

## Порядок реализации

1. Шаг 0 (DB) → вручную
2. Шаг 1 (`catalog.js`)
3. Шаг 2 (хуки)
4. Шаг 3 (`ProductUploadProvider` + `App.jsx`)
5. Шаги 6+7 (`ProductForm`, `ProductDetail`) — параллельно со стилями
6. Шаги 4+5 (`ShopPage`, `ProductCard`)
7. Шаг 8 (`Shop.css`) — итеративно по мере реализации
