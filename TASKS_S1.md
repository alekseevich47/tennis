# TASKS_S1 — Shop: кликабельная карточка + фикс поиска

## Контекст

| Роль | Файл |
|------|------|
| Читать (логика) | `client/src/features/shop/ShopPage.jsx` |
| Читать (карточка) | `client/src/features/shop/ProductCard.jsx` |
| Читать (модалка) | `client/src/features/shop/ProductDetail.jsx` |
| Редактировать | `client/src/features/shop/ProductCard.jsx` |
| Редактировать | `client/src/features/shop/ShopPage.jsx` |
| Редактировать (при нужде) | `client/src/features/shop/Shop.css` |

---

## Задача 1 — Клик по любой части карточки открывает модалку

**Проблема:** `openProduct` вызывается только кнопкой заголовка (`product-card-title-btn`). Остальная часть `.product-info` (цена, категории, бейдж) не кликабельна.

**Решение:** добавить `onClick={openProduct}` на `div.product-info`, не трогая блок `.product-image`.

### Шаги

1. **`ProductCard.jsx`** — добавить `onClick={openProduct}` на `div.product-info` (строки ~206–223):
   - убрать отдельную кнопку-обёртку вокруг заголовка (`product-card-title-btn`); заменить `<button>` на `<span>` (или оставить кнопку — тогда `stopPropagation` не нужен, т.к. `openProduct` одинаковый).
   - Проще: оставить `<button>` как есть, а на `div.product-info` тоже повесить `onClick={openProduct}`. Дублирующий клик не страшен — React не вызовет handler дважды при всплытии вверх от той же кнопки (потому что `openProduct` тот же ref).
   - Добавить `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) на `div.product-info` для доступности.

2. **`Shop.css`** — добавить `cursor: pointer` на `.product-info`.

---

## Задача 2 — Фикс поиска: английские буквы и цифры дают ложные совпадения

**Причина:** поиск ведётся и по `product.id` (PocketBase-ID — 15-символьная строка вида `abc123xyz...`). Любая буква a–z или цифра находит случайное совпадение в ID.

**Решение:** разделить семантику поиска:
- Если запрос начинается с `#` → искать только по `id` (убрать `#` из запроса).
- Иначе → искать только по `title`.

### Шаги

1. **`ShopPage.jsx`** — изменить фильтр `visibleProducts` (строки ~65–78):

   ```js
   const normalizedQuery = searchQuery.trim().toLowerCase();
   if (!normalizedQuery) return baseProducts;

   if (normalizedQuery.startsWith('#')) {
     const idQuery = normalizedQuery.slice(1);
     return baseProducts.filter((p) =>
       String(p.id || '').toLowerCase().includes(idQuery)
     );
   }
   return baseProducts.filter((p) =>
     String(p.title || '').toLowerCase().includes(normalizedQuery)
   );
   ```

2. **`ShopPage.jsx`** — обновить `placeholder` у `<input>` (строка ~239):
   - было: `"Поиск по названию или ID"`
   - стало: `"Поиск по названию или #артикулу"`

---

## Задача 3 — Лента: кликабельная карточка поста + фокус на комментарии

**Проблема:**
- Клик по посту работает только через `button.post-text` (текст публикации). Шапка (аватар, имя, дата) не кликабельна.
- Кнопка «Комментировать» открывает модалку, но без фокуса на поле ввода комментария.
- `CommentsPreview` (превью последних комментариев под постом) вообще не кликабелен.

**Решение:**
- `article.feed-card` делаем кликабельным через `onClick`.
- Из зоны клика исключаем через `e.stopPropagation()`: медиа (`PostMedia`), кнопку «Комментировать», превью комментариев (`CommentsPreview`), кнопки модератора.
- Кнопка «Комментировать» и `CommentsPreview` → открывают модалку с фокусом на поле ввода.
- `PostDetailModal` получает новый prop `focusComment`, по которому автоматически фокусирует поле ввода при открытии.

| Роль | Файл |
|------|------|
| Читать (карточка) | `client/src/features/feed/PostCard.jsx` |
| Читать (превью комментов) | `client/src/features/feed/CommentsPreview.jsx` |
| Читать (модалка) | `client/src/features/feed/PostDetailModal.jsx` |
| Читать (медиа) | `client/src/features/feed/PostMedia.jsx` |
| Читать (страница ленты) | `client/src/features/feed/FeedPage.jsx` |
| Редактировать | `client/src/features/feed/PostCard.jsx` |
| Редактировать | `client/src/features/feed/CommentsPreview.jsx` |
| Редактировать | `client/src/features/feed/PostDetailModal.jsx` |
| Редактировать | `client/src/features/feed/PostMedia.jsx` |
| Редактировать (при нужде) | `client/src/features/feed/Feed.css` |

### Шаги

1. **`PostDetailModal.jsx`** — добавить prop `focusComment?: boolean`:

   ```js
   // новый useEffect после существующих
   useEffect(() => {
     if (!isOpen || !focusComment) return;
     const timer = setTimeout(() => {
       document.getElementById('post-detail-comment-input')?.focus();
     }, 150);
     return () => clearTimeout(timer);
   }, [isOpen, focusComment]);
   ```

   Передать `focusComment` в объявлении `function PostDetailModal({ ..., focusComment, ... })`.

2. **`FeedPage.jsx`** — найти, как вызывается `onOpenDetail` / открывается `PostDetailModal`, и передать туда `focusComment` на основе того, каким способом пришёл открывающий вызов.
   - Добавить состояние `focusComment` (boolean), сбрасывать в `false` при закрытии.
   - Передать `focusComment` пропом в `<PostDetailModal>`.

3. **`PostCard.jsx`**:

   a. Добавить на `article.feed-card` (строка ~66):
   ```jsx
   onClick={() => onOpenDetail(post)}
   style={{ cursor: 'pointer' }}
   ```

   b. Убрать `onClick` с `button.post-text` — клик теперь обрабатывает родительский `article`. Чтобы кнопка не вызвала двойной обработчик, добавить `e.stopPropagation()`:
   ```jsx
   <button ... onClick={(e) => { e.stopPropagation(); onOpenDetail(post); }}>
   ```
   Или заменить на `<p className="post-text">` (без `button`, если доступность не требует).

   c. Кнопки модератора (строки ~75–93) — добавить `e.stopPropagation()`:
   ```jsx
   onClick={(e) => { e.stopPropagation(); onOpenEdit(post); }}
   onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
   ```

   d. Кнопку `comment-btn` (строка ~113–119) — изменить onClick:
   ```jsx
   onClick={(e) => { e.stopPropagation(); onOpenDetail(post, true); }}
   ```
   где второй аргумент — сигнал `focusComment: true`.

   e. `CommentsPreview` (строка ~122) — обернуть:
   ```jsx
   <div
     role="button"
     tabIndex={0}
     style={{ cursor: 'pointer' }}
     onClick={(e) => { e.stopPropagation(); onOpenDetail(post, true); }}
     onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onOpenDetail(post, true); } }}
   >
     <CommentsPreview comments={previewComments} />
   </div>
   ```

4. **`PostMedia.jsx`** — в `openFullscreen` (строка ~29) добавить `event.stopPropagation()`:
   ```js
   const openFullscreen = (event, index) => {
     event.stopPropagation();
     // ... остальное без изменений
   };
   ```

5. **`FeedPage.jsx`** — обновить сигнатуру хэндлера, переданного в `PostCard` как `onOpenDetail`, чтобы он принимал второй аргумент `focusComment`:
   ```js
   const handleOpenDetail = (post, focusComment = false) => {
     setSelectedPost(post);
     setFocusComment(focusComment);
     setDetailOpen(true);
   };
   ```
