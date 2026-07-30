# Graph Report - tennis  (2026-07-30)

## Corpus Check
- 194 files · ~188,902 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 982 nodes · 3095 edges · 59 communities (53 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 113 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bfc587a8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App Shell Navigation
- AvatarCropModal.jsx
- Post Upload and UI Kit
- notifications.js
- Gallery Upload Flow
- Admin UI Controls
- auditEventFormat.js
- App.jsx
- NPM Dependencies
- Audit Logs Modal
- LogsModal.jsx
- Stats Library Helpers
- Achievement Badge Assets
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
- PostDetailModal.jsx
- log.js
- postRichText.js

## God Nodes (most connected - your core abstractions)
1. `error` - 118 edges
2. `Modal()` - 36 edges
3. `useAlertDialog()` - 33 edges
4. `isModerator()` - 33 edges
5. `ProfileViewModal()` - 31 edges
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

## Communities (59 total, 6 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.07
Nodes (79): EmptyState(), IconButton, Spinner(), formatDayTitle(), StatsTrainingsCountModal(), formatDate(), getTrainingStatusForUser(), getTrainingTitle() (+71 more)

### Community 1 - "AvatarCropModal.jsx"
Cohesion: 0.07
Nodes (48): App(), PostUploadContext, PostUploadProvider(), usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), AlertDialogProvider() (+40 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.10
Nodes (41): InfoTooltip(), Toggle(), buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal() (+33 more)

### Community 3 - "notifications.js"
Cohesion: 0.23
Nodes (10): AvatarCropModal(), getCropCircle(), getImagePlacement(), PostContextMenu(), resolvePanLimits(), usePinchZoom(), backdropOpacityForDrag(), clamp() (+2 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.08
Nodes (41): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+33 more)

### Community 5 - "Admin UI Controls"
Cohesion: 0.11
Nodes (30): AdminPanelPage(), METRICS, StatisticsHubModal(), MODES, StatsAchievementsModal(), hasAnyActivity(), SLICES, StatsBookingModal() (+22 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

### Community 7 - "App.jsx"
Cohesion: 0.06
Nodes (55): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, ADMIN_NAV_ITEM, NAV_ITEMS, CARD_STEPS, getStepSelectors() (+47 more)

### Community 8 - "NPM Dependencies"
Cohesion: 0.05
Nodes (42): dependencies, clsx, date-fns, @daypicker/react, gsap, pocketbase, react, react-dom (+34 more)

### Community 9 - "Audit Logs Modal"
Cohesion: 0.60
Nodes (5): getRelationId(), notifyCommentReply(), relationId(), stripHtmlToPlain(), truncatePlain()

### Community 10 - "LogsModal.jsx"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 11 - "Stats Library Helpers"
Cohesion: 0.14
Nodes (30): addDaysYmd(), bumpCounter(), calcLevelFromValue(), eachDayInclusive(), emptyBookingCounters(), ensureBookingUser(), getAchievementGrants(), getAchievementsNow() (+22 more)

### Community 12 - "Achievement Badge Assets"
Cohesion: 0.07
Nodes (28): Achievement badge tier 1 level 1, Achievement badge tier 1 level 2, Achievement badge tier 1 level 3, Achievement badge tier 1 level 4, Achievement badge tier 1 level 5, Achievement badge tier 2 level 1, Achievement badge tier 2 level 2, Achievement badge tier 2 level 3 (+20 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.11
Nodes (33): AppHeader(), useAlertDialog(), computeAnnualEndDate(), getCurrentSessions(), getModeCopy(), MembershipEditModal(), normalizeDateInput(), MembershipPeriodRangeField() (+25 more)

### Community 15 - "FullscreenImageViewer.jsx"
Cohesion: 0.08
Nodes (43): useToast(), FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked() (+35 more)

### Community 17 - "Audit Diff Library"
Cohesion: 0.18
Nodes (11): buildCommentDetails(), diffFields(), displayName(), fieldValue(), newlyAdded(), newlyRemoved(), normalizeRelationIds(), relationId() (+3 more)

### Community 18 - "Bot Broadcast Library"
Cohesion: 0.25
Nodes (11): broadcastNewPublication(), broadcastToAllUsers(), broadcastToUserIds(), buildCommentBotMessage(), formatDateTimeGmt7(), getCommentPostInfo(), getModeratorMaxIds(), htmlToMaxMarkdown() (+3 more)

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
Cohesion: 0.42
Nodes (8): finalizeCancelledTrainingRecord(), hasTimeRangeEnded(), isReadyToFinalizePendingDelete(), isUnlimitedMembership(), notifyTrainingCancelled(), parsePbDate(), restoreMembershipSession(), validateBookingAdditions()

### Community 24 - "Competitions Rating Schema"
Cohesion: 0.40
Nodes (6): Соревнования, Рейтинг, Роли user/moderator, PB collection championships, PB collection matches, PB collection users

### Community 25 - "Admin Broadcast Dispatch"
Cohesion: 0.83
Nodes (3): dispatchScheduledBroadcast(), dispatchScheduledNotification(), resolveAudienceUserIds()

### Community 27 - "Shop Cart Docs"
Cohesion: 0.50
Nodes (4): PB collection products, Магазин, Shopping cart animation snippet, Shopping cart animation

### Community 56 - "PostDetailModal.jsx"
Cohesion: 0.08
Nodes (48): TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments(), TournamentPostCard(), TournamentPostDetailModal() (+40 more)

### Community 57 - "log.js"
Cohesion: 0.10
Nodes (45): AlertDialogContext, INITIAL_STATE, Avatar(), FOCUSABLE_SELECTORS, Modal(), useFavorites(), TABS, CreateTournamentPostModal() (+37 more)

### Community 58 - "postRichText.js"
Cohesion: 0.14
Nodes (27): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame(), applyFormatCommand() (+19 more)

## Knowledge Gaps
- **108 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+103 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `Post Upload and UI Kit` to `App Shell Navigation`, `AvatarCropModal.jsx`, `Gallery Upload Flow`, `App.jsx`, `LogsModal.jsx`, `FullscreenImageViewer.jsx`, `PostDetailModal.jsx`, `log.js`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `LongPressRing()` connect `PostDetailModal.jsx` to `NPM Dependencies`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `react` connect `NPM Dependencies` to `PostDetailModal.jsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _108 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.0665842094413523 - nodes in this community are weakly interconnected._
- **Should `AvatarCropModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06557377049180328 - nodes in this community are weakly interconnected._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.09803921568627451 - nodes in this community are weakly interconnected._