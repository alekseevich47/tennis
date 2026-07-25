# Graph Report - tennis  (2026-07-25)

## Corpus Check
- 185 files · ~179,679 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 944 nodes · 2967 edges · 56 communities (50 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `68a1064f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App Shell Navigation
- Feed and Profile Pages
- Post Upload and UI Kit
- Modal and Alert Dialog
- Gallery Upload Flow
- Admin UI Controls
- Header and Membership
- App.jsx
- NPM Dependencies
- Audit Logs Modal
- LogsModal.jsx
- Stats Library Helpers
- Achievement Badge Assets
- Achievements UI Block
- datePickerUtils.js
- FullscreenImageViewer.jsx
- Audit Diff Library
- Bot Broadcast Library
- Notifications State Lib
- Audit Docs and Feed
- Brand Assets Gallery Docs
- MAX Bridge Auth Docs
- Trainings Finalize Lib
- Competitions Rating Schema
- Admin Broadcast Dispatch
- Shop Cart Docs
- Dropdown UI Snippet
- Search UI Snippet
- Features Folder Structure
- Services Module Split
- Bottom Nav Items
- Touch UI Performance
- log.js

## God Nodes (most connected - your core abstractions)
1. `error` - 117 edges
2. `Modal()` - 35 edges
3. `useAlertDialog()` - 33 edges
4. `isModerator()` - 33 edges
5. `ProfileViewModal()` - 30 edges
6. `pb` - 29 edges
7. `Профиль` - 29 edges
8. `TrainingsPage()` - 25 edges
9. `formatPostDate()` - 24 edges
10. `getMediaUrl()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Brand/logo sm.png` --conceptually_related_to--> `Секция Миленьких Mini App`  [INFERRED]
  client/src/assets/sm.png → README.md
- `Achievement badge tier 1 level 1` --conceptually_related_to--> `Профиль`  [INFERRED]
  client/src/assets/ach/1_1.png → README.md
- `Achievement badge tier 1 level 2` --conceptually_related_to--> `Профиль`  [INFERRED]
  client/src/assets/ach/1_2.png → README.md
- `Achievement badge tier 1 level 3` --conceptually_related_to--> `Профиль`  [INFERRED]
  client/src/assets/ach/1_3.png → README.md
- `Achievement badge tier 1 level 4` --conceptually_related_to--> `Профиль`  [INFERRED]
  client/src/assets/ach/1_4.png → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Mini App feature tabs** — readme_feed, readme_trainings, readme_shop, readme_rating, readme_competitions, readme_gallery, readme_profile [EXTRACTED 1.00]
- **PocketBase collections** — readme_schema_users, readme_schema_posts, readme_schema_comments, readme_schema_trainings, readme_schema_products, readme_schema_championships, readme_schema_matches, readme_schema_gallery [EXTRACTED 1.00]
- **Achievement badge asset set** — client_src_assets_ach_1_1_png_badge, client_src_assets_ach_1_2_png_badge, client_src_assets_ach_1_3_png_badge, client_src_assets_ach_1_4_png_badge, client_src_assets_ach_1_5_png_badge, client_src_assets_ach_2_1_png_badge, client_src_assets_ach_2_2_png_badge, client_src_assets_ach_2_3_png_badge, client_src_assets_ach_2_4_png_badge, client_src_assets_ach_2_5_png_badge, client_src_assets_ach_3_1_png_badge, client_src_assets_ach_3_2_png_badge, client_src_assets_ach_3_3_png_badge, client_src_assets_ach_3_4_png_badge, client_src_assets_ach_3_5_png_badge, client_src_assets_ach_4_1_png_badge, client_src_assets_ach_4_2_png_badge, client_src_assets_ach_4_3_png_badge, client_src_assets_ach_4_4_png_badge, client_src_assets_ach_4_5_png_badge, client_src_assets_ach_5_1_png_badge, client_src_assets_ach_5_2_png_badge, client_src_assets_ach_5_3_png_badge, client_src_assets_ach_5_4_png_badge, client_src_assets_ach_5_5_png_badge [INFERRED 0.85]

## Communities (56 total, 6 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.09
Nodes (66): CalendarStrip(), buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue() (+58 more)

### Community 1 - "Feed and Profile Pages"
Cohesion: 0.25
Nodes (14): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, NotificationCard(), NotificationsDropdown(), pluralize(), clearAllNotifications() (+6 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.17
Nodes (25): buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal(), getAudienceLabel(), NotificationSendModal() (+17 more)

### Community 3 - "Modal and Alert Dialog"
Cohesion: 0.06
Nodes (60): react, PostUploadContext, PostUploadProvider(), usePostUpload(), Avatar(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer() (+52 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.08
Nodes (40): useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider(), useProductUpload(), FavoritesContext, FavoritesProvider(), loadFavoriteProducts() (+32 more)

### Community 5 - "Admin UI Controls"
Cohesion: 0.09
Nodes (38): EmptyState(), InfoTooltip(), Spinner(), Toggle(), AdminPanelPage(), NotificationSettingsModal(), SETTINGS_ROWS, METRICS (+30 more)

### Community 6 - "Header and Membership"
Cohesion: 0.10
Nodes (39): clampPercent(), computeGridLayout(), FloatingAchievements(), hashUnit(), formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings() (+31 more)

### Community 7 - "App.jsx"
Cohesion: 0.10
Nodes (37): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, ADMIN_NAV_ITEM, NAV_ITEMS, CARD_STEPS, getStepSelectors() (+29 more)

### Community 8 - "NPM Dependencies"
Cohesion: 0.05
Nodes (40): dependencies, clsx, date-fns, @daypicker/react, gsap, pocketbase, react-dom, react-error-boundary (+32 more)

### Community 9 - "Audit Logs Modal"
Cohesion: 0.10
Nodes (33): AvatarCropModal(), getCropCircle(), getImagePlacement(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), CompetitionsPage(), TABS (+25 more)

### Community 10 - "LogsModal.jsx"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

### Community 11 - "Stats Library Helpers"
Cohesion: 0.15
Nodes (29): addDaysYmd(), bumpCounter(), calcLevelFromValue(), eachDayInclusive(), emptyBookingCounters(), ensureBookingUser(), getAchievementGrants(), getAchievementsNow() (+21 more)

### Community 12 - "Achievement Badge Assets"
Cohesion: 0.07
Nodes (28): Achievement badge tier 1 level 1, Achievement badge tier 1 level 2, Achievement badge tier 1 level 3, Achievement badge tier 1 level 4, Achievement badge tier 1 level 5, Achievement badge tier 2 level 1, Achievement badge tier 2 level 2, Achievement badge tier 2 level 3 (+20 more)

### Community 13 - "Achievements UI Block"
Cohesion: 0.18
Nodes (20): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), getAchievementLevels() (+12 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.08
Nodes (47): AppHeader(), IconButton, computeAnnualEndDate(), getCurrentSessions(), getModeCopy(), MembershipEditModal(), normalizeDateInput(), MembershipPeriodRangeField() (+39 more)

### Community 15 - "FullscreenImageViewer.jsx"
Cohesion: 0.12
Nodes (24): App(), createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), AlertDialogProvider(), Toast(), ToastContext (+16 more)

### Community 17 - "Audit Diff Library"
Cohesion: 0.18
Nodes (11): buildCommentDetails(), diffFields(), displayName(), fieldValue(), newlyAdded(), newlyRemoved(), normalizeRelationIds(), relationId() (+3 more)

### Community 18 - "Bot Broadcast Library"
Cohesion: 0.27
Nodes (10): broadcastNewPublication(), broadcastToAllUsers(), broadcastToUserIds(), buildCommentBotMessage(), formatDateTimeGmt7(), getCommentPostInfo(), getModeratorMaxIds(), notifyModerators() (+2 more)

### Community 19 - "Notifications State Lib"
Cohesion: 0.30
Nodes (10): applyStateFields(), findTrainingNotification(), getMetaTrainingId(), getStateFields(), isWithinCountdownWindow(), newlyAddedUserIds(), normalizeRelationIds(), parsePbDate() (+2 more)

### Community 20 - "Audit Docs and Feed"
Cohesion: 0.22
Nodes (10): PB filter-injection fix, Modal focus-trap a11y, Audit & Refactor Report, Soft-delete zombie records, SWR data fetching migration, Лента (Feed), PB collection comments, PB collection posts (+2 more)

### Community 21 - "Brand Assets Gallery Docs"
Cohesion: 0.22
Nodes (9): Title Секция Миленьких, Loader SVG asset, Brand/logo sm.png, Галерея, PB collection gallery, PB collection trainings, Секция Миленьких Mini App, React 18 + Vite 5 + SWR (+1 more)

### Community 22 - "MAX Bridge Auth Docs"
Cohesion: 0.25
Nodes (8): AlertDialog replaces native dialogs, useMaxAuth idempotent init, client/index.html entry, max-web-app.js SDK script, MAX Auth /api/max-auth, MAX Bridge, Nginx reverse proxy, PocketBase Backend

### Community 23 - "Trainings Finalize Lib"
Cohesion: 0.46
Nodes (7): finalizeCancelledTrainingRecord(), hasTimeRangeEnded(), isReadyToFinalizePendingDelete(), isUnlimitedMembership(), notifyTrainingCancelled(), parsePbDate(), restoreMembershipSession()

### Community 24 - "Competitions Rating Schema"
Cohesion: 0.40
Nodes (6): Соревнования, Рейтинг, Роли user/moderator, PB collection championships, PB collection matches, PB collection users

### Community 25 - "Admin Broadcast Dispatch"
Cohesion: 0.83
Nodes (3): dispatchScheduledBroadcast(), dispatchScheduledNotification(), resolveAudienceUserIds()

### Community 27 - "Shop Cart Docs"
Cohesion: 0.50
Nodes (4): PB collection products, Магазин, Shopping cart animation snippet, Shopping cart animation

### Community 57 - "log.js"
Cohesion: 0.08
Nodes (65): AlertDialogContext, INITIAL_STATE, useAlertDialog(), FOCUSABLE_SELECTORS, Modal(), useFavorites(), CreateTournamentPostModal(), EditTournamentPostModal() (+57 more)

## Knowledge Gaps
- **107 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+102 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `App Shell Navigation` to `Feed and Profile Pages`, `Post Upload and UI Kit`, `Modal and Alert Dialog`, `Gallery Upload Flow`, `Admin UI Controls`, `Header and Membership`, `App.jsx`, `Audit Logs Modal`, `Achievements UI Block`, `FullscreenImageViewer.jsx`, `log.js`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `react` connect `Modal and Alert Dialog` to `NPM Dependencies`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _107 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.08972972972972973 - nodes in this community are weakly interconnected._
- **Should `Modal and Alert Dialog` be split into smaller, more focused modules?**
  _Cohesion score 0.056802244039270686 - nodes in this community are weakly interconnected._
- **Should `Gallery Upload Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.08156028368794327 - nodes in this community are weakly interconnected._
- **Should `Admin UI Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.08590441621294616 - nodes in this community are weakly interconnected._