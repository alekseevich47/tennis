# Graph Report - tennis  (2026-08-07)

## Corpus Check
- 208 files · ~198,503 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1034 nodes · 3219 edges · 65 communities (58 shown, 7 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `486a985a`
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
- MembershipModal.jsx
- datePickerUtils.js
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
- catalog.js
- App.jsx
- maxauthlib.js
- error
- BottomNav.jsx

## God Nodes (most connected - your core abstractions)
1. `error` - 122 edges
2. `Modal()` - 37 edges
3. `useAlertDialog()` - 33 edges
4. `isModerator()` - 33 edges
5. `ProfileViewModal()` - 31 edges
6. `pb` - 30 edges
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

## Communities (65 total, 7 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.07
Nodes (72): AppMain(), TAB_TITLES, Spinner(), CalendarStrip(), buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm() (+64 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.12
Nodes (29): InfoTooltip(), Toggle(), buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal() (+21 more)

### Community 3 - "notifications.js"
Cohesion: 0.16
Nodes (15): AvatarCropModal(), getCropCircle(), getImagePlacement(), FullscreenImageViewer(), getOriginRect(), getWindowWidth(), isScrollChainAtTop(), shouldSkipAppPull() (+7 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.07
Nodes (45): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+37 more)

### Community 5 - "Admin UI Controls"
Cohesion: 0.10
Nodes (34): EmptyState(), AdminPanelPage(), METRICS, StatisticsHubModal(), MODES, StatsAchievementsModal(), hasAnyActivity(), SLICES (+26 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

### Community 7 - "App.jsx"
Cohesion: 0.07
Nodes (50): PostUploadContext, PostUploadProvider(), usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), ScrollToTopButton(), CompetitionsPage() (+42 more)

### Community 8 - "NPM Dependencies"
Cohesion: 0.05
Nodes (40): dependencies, clsx, date-fns, @daypicker/react, gsap, pocketbase, react-dom, react-error-boundary (+32 more)

### Community 9 - "Audit Logs Modal"
Cohesion: 0.60
Nodes (5): getRelationId(), notifyCommentReply(), relationId(), stripHtmlToPlain(), truncatePlain()

### Community 10 - "LogsModal.jsx"
Cohesion: 0.08
Nodes (53): AppInner(), getInitialFavoriteProductIds(), CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput(), OnboardingTutorial() (+45 more)

### Community 11 - "Stats Library Helpers"
Cohesion: 0.14
Nodes (30): addDaysYmd(), bumpCounter(), calcLevelFromValue(), eachDayInclusive(), emptyBookingCounters(), ensureBookingUser(), getAchievementGrants(), getAchievementsNow() (+22 more)

### Community 12 - "Achievement Badge Assets"
Cohesion: 0.07
Nodes (28): Achievement badge tier 1 level 1, Achievement badge tier 1 level 2, Achievement badge tier 1 level 3, Achievement badge tier 1 level 4, Achievement badge tier 1 level 5, Achievement badge tier 2 level 1, Achievement badge tier 2 level 2, Achievement badge tier 2 level 3 (+20 more)

### Community 13 - "MembershipModal.jsx"
Cohesion: 0.06
Nodes (57): App(), AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText() (+49 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.10
Nodes (34): AppHeader(), MembershipIcon(), computeAnnualEndDate(), getCurrentSessions(), getModeCopy(), MembershipEditModal(), normalizeDateInput(), MembershipPeriodRangeField() (+26 more)

### Community 17 - "Audit Diff Library"
Cohesion: 0.18
Nodes (11): buildCommentDetails(), diffFields(), displayName(), fieldValue(), newlyAdded(), newlyRemoved(), normalizeRelationIds(), relationId() (+3 more)

### Community 18 - "Bot Broadcast Library"
Cohesion: 0.25
Nodes (11): broadcastNewPublication(), broadcastToAllUsers(), broadcastToUserIds(), buildCommentBotMessage(), formatDateTimeGmt7(), getCommentPostInfo(), getModeratorMaxIds(), htmlToMaxMarkdown() (+3 more)

### Community 19 - "Notifications State Lib"
Cohesion: 0.27
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
Cohesion: 0.33
Nodes (12): adjustAttendanceCountTx(), applyBookingSideEffects(), consumeMembershipSessionTx(), dayBoundsIso(), finalizeCancelledTrainingRecord(), hasAnnualBookingSameDay(), hasTimeRangeEnded(), isReadyToFinalizePendingDelete() (+4 more)

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
Cohesion: 0.14
Nodes (27): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame(), applyFormatCommand() (+19 more)

### Community 57 - "log.js"
Cohesion: 0.08
Nodes (55): AlertDialogContext, INITIAL_STATE, useAlertDialog(), Avatar(), CloseAppConfirmSheet(), FOCUSABLE_SELECTORS, Modal(), useFavorites() (+47 more)

### Community 58 - "catalog.js"
Cohesion: 0.07
Nodes (54): react, IconButton, TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments() (+46 more)

### Community 59 - "App.jsx"
Cohesion: 0.20
Nodes (17): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, NotificationCard(), parseCommentReplyParentText(), NotificationsDropdown(), formatRelativeTime() (+9 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.80
Nodes (4): detectMediaKind(), isYadiskPublicUrl(), normalizePublicUrl(), resolvePublicResource()

### Community 66 - "BottomNav.jsx"
Cohesion: 0.40
Nodes (3): ADMIN_NAV_ITEM, GALLERY_NAV_ITEM, NAV_ITEMS

## Knowledge Gaps
- **109 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `LogsModal.jsx` to `App Shell Navigation`, `Post Upload and UI Kit`, `Gallery Upload Flow`, `App.jsx`, `MembershipModal.jsx`, `datePickerUtils.js`, `log.js`, `catalog.js`, `App.jsx`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `react` connect `catalog.js` to `NPM Dependencies`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.07030205827318899 - nodes in this community are weakly interconnected._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Should `Gallery Upload Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.07402597402597402 - nodes in this community are weakly interconnected._
- **Should `Admin UI Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.09954751131221719 - nodes in this community are weakly interconnected._