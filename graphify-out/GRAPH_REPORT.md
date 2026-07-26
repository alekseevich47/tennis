# Graph Report - tennis  (2026-07-26)

## Corpus Check
- 190 files · ~184,560 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 970 nodes · 3069 edges · 62 communities (56 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7ca2657c`
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
- Achievements UI Block
- datePickerUtils.js
- FullscreenImageViewer.jsx
- StatsGrowthModal.jsx
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
- DateRangeModal.jsx
- ProfilePage.jsx
- Modal.jsx
- RatingPage.jsx

## God Nodes (most connected - your core abstractions)
1. `error` - 118 edges
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

## Communities (62 total, 6 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.08
Nodes (62): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CalendarStrip(), buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm() (+54 more)

### Community 1 - "AvatarCropModal.jsx"
Cohesion: 0.11
Nodes (24): react, AvatarCropModal(), getCropCircle(), getImagePlacement(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium() (+16 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.17
Nodes (25): buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal(), getAudienceLabel(), NotificationSendModal() (+17 more)

### Community 3 - "notifications.js"
Cohesion: 0.21
Nodes (13): AlertDialogContext, INITIAL_STATE, useAlertDialog(), AddImageModal(), computeAnnualEndDate(), getCurrentSessions(), getModeCopy(), MembershipEditModal() (+5 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.09
Nodes (39): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+31 more)

### Community 5 - "Admin UI Controls"
Cohesion: 0.09
Nodes (38): EmptyState(), InfoTooltip(), Spinner(), Toggle(), AdminPanelPage(), NotificationSettingsModal(), SETTINGS_ROWS, METRICS (+30 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

### Community 7 - "App.jsx"
Cohesion: 0.25
Nodes (14): formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput(), ProfileViewModal(), TRAINING_BADGE (+6 more)

### Community 8 - "NPM Dependencies"
Cohesion: 0.05
Nodes (40): dependencies, clsx, date-fns, @daypicker/react, gsap, pocketbase, react-dom, react-error-boundary (+32 more)

### Community 9 - "Audit Logs Modal"
Cohesion: 0.25
Nodes (12): formatDateRangeLabel(), ProfileTrainingsSearch(), ArchiveModal(), formatDateRangeLabel(), getArchiveDefaultDateRange(), findRussianMonth(), isDateQueryParsed(), matchesDateQuery() (+4 more)

### Community 10 - "LogsModal.jsx"
Cohesion: 0.06
Nodes (65): App(), AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, ADMIN_NAV_ITEM, NAV_ITEMS, TournamentPostUploadContext (+57 more)

### Community 11 - "Stats Library Helpers"
Cohesion: 0.15
Nodes (29): addDaysYmd(), bumpCounter(), calcLevelFromValue(), eachDayInclusive(), emptyBookingCounters(), ensureBookingUser(), getAchievementGrants(), getAchievementsNow() (+21 more)

### Community 12 - "Achievement Badge Assets"
Cohesion: 0.07
Nodes (28): Achievement badge tier 1 level 1, Achievement badge tier 1 level 2, Achievement badge tier 1 level 3, Achievement badge tier 1 level 4, Achievement badge tier 1 level 5, Achievement badge tier 2 level 1, Achievement badge tier 2 level 2, Achievement badge tier 2 level 3 (+20 more)

### Community 13 - "Achievements UI Block"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.20
Nodes (15): AppHeader(), MembershipPeriodRangeField(), MembershipStartDateField(), consumeDay(), consumeMonth(), consumeYear(), formatDateDisplay(), formatDateForSearch() (+7 more)

### Community 15 - "FullscreenImageViewer.jsx"
Cohesion: 0.20
Nodes (16): Toast(), ToastContext, useToast(), formatFreezeLogEntry(), formatMembershipDate(), getMembershipTypeLabel(), MembershipModal(), parseFreezeLog() (+8 more)

### Community 16 - "StatsGrowthModal.jsx"
Cohesion: 0.52
Nodes (6): getRelationId(), handleReplyCreate(), notifyCommentReply(), relationId(), stripHtmlToPlain(), truncatePlain()

### Community 17 - "Audit Diff Library"
Cohesion: 0.18
Nodes (11): buildCommentDetails(), diffFields(), displayName(), fieldValue(), newlyAdded(), newlyRemoved(), normalizeRelationIds(), relationId() (+3 more)

### Community 18 - "Bot Broadcast Library"
Cohesion: 0.24
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

### Community 56 - "PostDetailModal.jsx"
Cohesion: 0.07
Nodes (62): PostUploadContext, PostUploadProvider(), usePostUpload(), TournamentCommentsSection(), CommentReplyButton(), CommentReplyComposeBar(), CommentReplyQuote(), CommentSendButton() (+54 more)

### Community 57 - "log.js"
Cohesion: 0.07
Nodes (70): Avatar(), FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), useFavorites(), CreateTournamentPostModal(), EditTournamentPostModal() (+62 more)

### Community 58 - "DateRangeModal.jsx"
Cohesion: 0.25
Nodes (11): ProfileSingleDateField(), DatePickerModal(), DateRangeModal(), formatRangeHint(), getDefaultDateRange(), DateRangePicker(), MONTH_LABELS, startOfDecadePage() (+3 more)

### Community 59 - "ProfilePage.jsx"
Cohesion: 0.23
Nodes (13): formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), normalizeDateInput(), ProfilePage(), TRAINING_BADGE, filterProfileTrainings() (+5 more)

### Community 60 - "Modal.jsx"
Cohesion: 0.28
Nodes (8): IconButton, FOCUSABLE_SELECTORS, Modal(), formatDateRangeLabel(), MembershipOverviewModal(), trainingCountsAsUsedSession(), isUserBookingDisabled(), UserPickerModal()

### Community 61 - "RatingPage.jsx"
Cohesion: 0.27
Nodes (8): INITIAL, PlayerForm(), RatingPage(), buildPlayerRanks(), getPlayerRatingRank(), getRatingPoints(), isRatingVisible(), createPlayer()

## Knowledge Gaps
- **108 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+103 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `PostDetailModal.jsx` to `App Shell Navigation`, `Post Upload and UI Kit`, `notifications.js`, `Gallery Upload Flow`, `Admin UI Controls`, `App.jsx`, `LogsModal.jsx`, `Achievements UI Block`, `FullscreenImageViewer.jsx`, `log.js`, `ProfilePage.jsx`, `Modal.jsx`, `RatingPage.jsx`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `LongPressRing()` connect `AvatarCropModal.jsx` to `PostDetailModal.jsx`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `react` connect `AvatarCropModal.jsx` to `NPM Dependencies`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _108 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.08184143222506395 - nodes in this community are weakly interconnected._
- **Should `AvatarCropModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11379800853485064 - nodes in this community are weakly interconnected._
- **Should `Gallery Upload Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.0851063829787234 - nodes in this community are weakly interconnected._