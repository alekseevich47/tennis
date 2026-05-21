# TASKS_T5 — Shop: поиск + плавающая кнопка «Добавить»

## Контекст

- Данные товаров: `products` (поля `title`, `id`; нет поля `sku`/артикул — поиск по `title` и `id`).
- Фильтрация: текущий `listProducts` работает на стороне PocketBase с `filter`.
- Роли: `isModerator()` из `services/auth`.
- Плавающая кнопка ленты: `floating-btn-wrapper` / `floating-add-btn` в `Feed.css` + логика скролла в `FeedPage`.

---

## Шаги

### 1. Поле `sku` / поиск по артикулу (опционально, schema)

> Решение: поиск только по `title` + `id` — артикул отсутствует в `schema.json`.
> Если нужен отдельный артикул — добавить поле `sku` (text) в коллекцию `products` и обновить `schema.json`.
> **Для MVP — искать по `title` и `id` на клиенте без изменений бэкенда.**

### 2. Кнопка «Лупа» и строка поиска — `ShopPage.jsx`

- Добавить `useState`: `searchQuery` (строка) и `isSearchOpen` (bool).
- В `shop-header-bar` — рядом с `shop-category-filter` разместить квадратную кнопку `shop-search-btn` (иконка `🔍` или SVG).
- При `isSearchOpen === true` под хедером (или инлайн) показывать `<input>` с `autoFocus`.
- Повторное нажатие на кнопку лупы — скрывает строку и сбрасывает `searchQuery`.

### 3. Клиентская фильтрация по запросу — `ShopPage.jsx`

- Расширить `visibleProducts` (`useMemo`): если `searchQuery` не пустой — фильтровать по `product.title` и `product.id` (`toLowerCase().includes`).
- Сортировка и категорийная фильтрация сохраняются (категория — через SWR/PB, поиск — поверх результата).

### 4. Стили кнопки «Лупа» — `Shop.css`

- Добавить `.shop-search-btn`: квадратная, те же размеры и цвет, что `.shop-add-btn` (`background: #007aff`, `border-radius: 10px`, `min-height: 44px`, `width: 44px`).
- Добавить `.shop-search-input`: `input` с анимацией появления (`max-width` transition или `opacity`/`transform`).
- Кнопка и поле — в одной flex-строке с `shop-category-filter`.

### 5. Плавающая кнопка «Добавить» — `ShopPage.jsx`

- Убрать текущую кнопку `.shop-add-btn` из `shop-header-bar`.
- Добавить `useRef(containerRef)` на корневой элемент `<section>` (аналог `FeedPage`).
- Добавить `useState(isButtonVisible, true)`.
- Добавить `useEffect` с `scroll`-листенером + debounce (`SCROLL_HIDE_DEBOUNCE_MS = 300`) — идентично `FeedPage`.
- Рендерить `floating-btn-wrapper` / `floating-add-btn` (переиспользовать существующие классы из `Feed.css`) только если `moderator === true`.
- Текст кнопки: «Добавить», `onClick → setShowAddModal(true)`.

### 6. Стили плавающей кнопки — `Shop.css`

- Для `<section class="shop">` добавить `overflow-y: auto` и убедиться, что скролл идёт на секции, а не на родителе (иначе `scroll`-листенер не сработает).
- Если `floating-btn-wrapper` / `floating-add-btn` вынесены в общий CSS — импортировать `Feed.css` не нужно; продублировать нужные правила в `Shop.css` с теми же именами классов либо создать общий `floating-btn.css`.

### 7. Cleanup

- Убедиться, что при закрытии вкладки/смене таба таймаут скролла очищается (`clearTimeout` в return `useEffect`).
- Проверить, что `shop-add-btn` CSS-класс не остался без использования (удалить или оставить для возможного переиспользования).
- Прогнать `ReadLints` по изменённым файлам.

---

## Порядок реализации

1. Шаги 2–3 (логика поиска в `ShopPage.jsx`)
2. Шаг 4 (стили поиска в `Shop.css`)
3. Шаги 5–6 (плавающая кнопка)
4. Шаг 7 (cleanup + lint)
