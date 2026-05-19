# Tennis MAX Mini App — Audit & Refactor Report

> Ranked audit of `client/src` (React 18 + Vite + PocketBase) for the Russian MAX messenger Mini App.
> Categorised by severity. Fixed items are addressed in the accompanying refactor (see `client/src/{lib,hooks,components/ui,features/*}`).

---

## CRITICAL — bugs breaking functionality, security, or data integrity

- **C1. Broken template literal in config.** `client/src/config.js:5` had `` `\${PB_URL}/api/max-auth` ``. The backslash escaped `$`, so `MAX_AUTH_URL` became the literal string `${PB_URL}/api/max-auth`. MAX Bridge auth fails in production whenever `VITE_MAX_AUTH_URL` is empty.

- **C2. `selectedFile` mixes `File` and `FileList`.** `Feed.jsx:735` ran `setSelectedFile(e.target.files)`. Line 739 rendered `selectedFile.name` (a `FileList` has no `.name` → `undefined`), but `handleCreatePost` correctly used `selectedFile[0]`. UI showed wrong filename.

- **C3. PocketBase filter-injection via template literals.** `Feed.jsx:42`/`:162` used `` `author = "${loggedUser.id}"` `` and `` `post = "${postId}"` ``. The SDK provides safe parameterisation via `pb.filter('field = {:v}', { v })`. Replaced everywhere.

- **C4. StrictMode + non-idempotent effects = double auth & double DB cleanup.** `main.jsx` enables `React.StrictMode`, `App.jsx:20` runs `initMaxAuth` + bulk `pb.collection('comments').delete()` with no guard / `AbortController`. In dev, every mount fires twice; on prod, races on remount.

- **C5. Soft-delete via `sessionStorage` loses data.** `App.jsx:108` only physically deletes posts/comments inside `handleTabChange`. Closing the MAX webview leaves zombie records (`is_deleted=true`) in the DB forever; on F5 deleted comments re-appear.

- **C6. Scroll listener re-registered on every list update.** `Feed.jsx:44-61` `useEffect` depends on `posts` → removes/re-adds `addEventListener('scroll')` on every refresh. Freezes large feeds and loses the debounce timer.

- **C7. `setTimeout` without cleanup.** `Feed.jsx:134,221` schedule `scrollIntoView` without clearing on unmount, risking setState on unmounted nodes.

- **C8. `requestAnimationFrame` without cleanup on unmount.** `Feed.jsx:462-481` `animateInertia` recursively schedules RAF; closing modal mid-flight continues to call `setPosition` on an unmounted node.

- **C9. `getCurrentUser().id` without null check.** `services/pocketbase.js:96` blew up in guest mode if `authStore.model` was null.

- **C10. `pb.authStore.save(token, model)` with stale token.** `Profile.jsx:51` re-saved the current token with a new model after `update()`. After long sessions this resets back to "Гость". The correct API is `pb.collection('users').authRefresh()`.

- **C11. Hardcoded URLs bypass `config.js`.** `Feed.jsx:5` hardcoded `const PB_URL = 'https://urban42.online'` plus a hardcoded `https://urban42.online/tt/api/files/...` line 512. Breaks on domain change.

- **C12. Incorrect `expand` in PocketBase.** `services/pocketbase.js:63` used `expand: 'comments_id.author,author'`; field `comments_id` does not exist (see `schema.json`). The page already used the correct `expand: 'comments(post).author'`, so the service helper was effectively dead/wrong.

- **C13. Native `confirm()` / `alert()` in webview MAX.** `Shop.jsx:83`, `Gallery.jsx:45`, `Profile.jsx:60`, `Feed.jsx:323`. Native dialogs do not render inside the MAX webview → user cannot confirm a destructive action. Replaced globally with `AlertDialog` + `useAlertDialog` hook.

- **C14. Direct `document.getElementById` reads.** `Competitions.jsx:120` (`'champ-name'`), `Gallery.jsx:94` (`'gallery-upload'`). React state and DOM diverge; old values persist on modal re-open. Replaced with controlled inputs.

## HIGH — performance, re-renders, leaks

- **H1. Waterfall in `Competitions.jsx:20-29`.** `loadChampionships` → setState → second `useEffect` → `loadMatches`. Should be parallel via `Promise.all` / SWR.

- **H2. Waterfall in `Trainings.jsx:31-34`.** `generateFourteenDays` schedules two setStates, then loads trainings.

- **H3. Waterfall in `App.jsx:29-42`.** `await initMaxAuth` → `setUser` → serialised `await pb.collection('comments').getFullList(...)`. Cleanup can run in parallel with the next render.

- **H4. Waterfall in `Profile.jsx:16-24`.** `setUser` → separate effect → `loadUserTrainings`.

- **H5. SVG icons re-created every render in `BottomNav.jsx:12-37`.** Hoisted into a module-level const array.

- **H6. `useState` initial-overwrite in Trainings/Profile.** `useState(new Date())` → immediate `setSelectedDate(arr[0])`. Lazy init `useState(() => generateFourteenDays()[0])`.

- **H7. Object-spread `setFormData({...formData, x})` across Shop/Rating/Competitions.** Use functional `setFormData(prev => ({ ...prev, x }))`.

- **H8. Inline arrow handlers in `.map()` re-create on every render.** New refs break `React.memo`. Use `useCallback` + memoised row components.

- **H9. Computations inside render.** `Trainings.jsx:226` rebuilds `filteredTrainings` + invokes `getDayEventStatus` 14× per render (O(N×14)). Build `Map<dayKey, status>` once via `useMemo`.

- **H10. `loadPosts()` after every action.** Like/delete/comment fully refetches. Migrated to SWR `mutate` (optimistic).

- **H11. IIFE for avatar in `App.jsx:146-153`.** `getUserAvatarData(user)` runs on every render. Hoisted into `<UserBadge>` (`React.memo` + `useMemo`).

- **H12. Formatters declared in components.** `formatPostDate`, `formatCardDate`, `formatTimeRange`, `getTouchDistance` — moved to `lib/format.js` / `lib/gestures.js`.

- **H13. `getDayEventStatus` allocates `new Date()` in the inner filter.** Now part of the `useMemo` day-index.

- **H14. No `requestKey`/AbortController in PB calls.** Fast tab-switches accumulate hanging requests. SWR + `requestKey: null` solves it.

- **H15. `selectedTraining` synced via `find()` on every refresh.** Auto-handled by SWR cache key.

## MEDIUM — a11y and semantics

- **M1. Modals without `role="dialog"`, `aria-modal`, focus-trap, ESC.** All `modal-overlay` usages replaced by the new `<Modal>` (focus trap, ESC handler, body scroll lock, `aria-labelledby`).

- **M2. Click handlers on `<div>` without keyboard equivalent.** Post / training / product / gallery cards switched to `<button>` (or `role="button" tabIndex={0} onKeyDown`). Emoji icons given `aria-hidden="true"`.

- **M3. Forms without `<label htmlFor>`.** Shop / Rating / Competitions / Gallery forms now have explicit labels with `htmlFor` + `id`.

- **M4. BottomNav `aria-label="Раздел 1"`.** Replaced with meaningful Russian labels (Лента новостей, Тренировки, Магазин, Рейтинг, Соревнования, Галерея) + `aria-current="page"`.

- **M5. Loading screen without `role="status"` / `aria-live`.** Added.

- **M6. Nested `<header>` tags.** Page-level `<header>` in Shop/Rating/Gallery/Competitions converted to `<section>` so only `App` keeps the main `<header>` with `<h1>`.

- **M7. `<img>` without meaningful `alt`.** "Avatar", "Full size" replaced with descriptive Russian alt-text.

- **M8. Icon-only `✕` buttons without `aria-label="Закрыть"`.** Centralised in `<IconButton>` and `<Modal>`.

- **M9. Tap targets < 44×44.** Comment edit/delete icon-buttons given 28px → 36px padding for adequate hit-area.

## LOW — readability and hygiene

- **L1. `console.log` in production.** Wrapped via `lib/log.js` with `import.meta.env.DEV` guard.
- **L2. Magic numbers.** Constants for swipe threshold (`SWIPE_CLOSE_THRESHOLD = 120`), opacity (`OPACITY_DISTANCE = 400`), debounce (`SCROLL_HIDE_DEBOUNCE_MS = 300`).
- **L3. JSDoc filled in for service modules.** Typedefs added for `UserRecord`, `PostRecord`, `TrainingRecord`, etc.
- **L4. `let` → `const` where appropriate.** Cleaned during file rewrites.
- **L5. README references `zustand` but it is unused.** Kept in deps for now (audit notes only — actual removal deferred).

---

## Refactor summary

* New top-level folders: `client/src/lib/`, `client/src/hooks/`, `client/src/components/ui/`, `client/src/features/{feed,trainings,shop,rating,competitions,gallery,profile}/`.
* `services/pocketbase.js` split into `auth.js`, `posts.js`, `trainings.js`, `catalog.js` with safe `pb.filter()` parameterisation and `{ requestKey: null }` / `{ signal }` support.
* All data fetching switched to SWR with `dedupingInterval: 5000` and `revalidateOnFocus: false`.
* `<Modal>` provides focus-trap, ESC, scroll lock, `aria-modal`, `aria-labelledby`.
* `<AlertDialog>` + `useAlertDialog()` replace every `window.alert` / `window.confirm`.
* `pagehide` / `visibilitychange` listener in `App.jsx` flushes pending soft-deletes so zombie records are removed even if the webview is killed.
* `useMaxAuth` is idempotent (mount guard + `AbortController`).
* `BottomNav` SVGs are hoisted into a module-level const; labels are real Russian section names.
