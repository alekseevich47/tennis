# Graph Report - tennis  (2026-08-15)

## Corpus Check
- 241 files · ~221,731 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1232 nodes · 3783 edges · 78 communities (69 shown, 9 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 137 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d4078d62`
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
- Stats Library Helpers
- Achievement Badge Assets
- gestures.js
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
- Vite Config
- Touch UI Performance
- PostDetailModal.jsx
- log.js
- achievements.js
- yadiskAlbumLazy.js
- maxauthlib.js
- error
- catalog.js
- ProfilePage.jsx
- media.js
- ShopPage.jsx
- GalleryCommentModal.jsx
- ArchiveModal.jsx
- GalleryPage.jsx
- error
- claimlib.js
- tournamentComments.js
- useMaxCloseGuard.js
- AddActionContext.jsx

## God Nodes (most connected - your core abstractions)
1. `error` - 123 edges
2. `Modal()` - 43 edges
3. `useAlertDialog()` - 39 edges
4. `ProfileViewModal()` - 37 edges
5. `isModerator()` - 33 edges
6. `pb` - 31 edges
7. `Профиль` - 29 edges
8. `TrainingsPage()` - 27 edges
9. `CompetitionsPage()` - 24 edges
10. `formatPostDate()` - 24 edges

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

## Communities (78 total, 9 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.06
Nodes (91): AppMain(), formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, NotificationCard(), parseCommentReplyParentText(), NotificationsDropdown() (+83 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.17
Nodes (25): buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal(), getAudienceLabel(), NotificationSendModal() (+17 more)

### Community 3 - "notifications.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.08
Nodes (40): InfoTooltip(), Spinner(), Toggle(), AdminPanelPage(), NotificationSettingsModal(), SETTINGS_ROWS, METRICS, StatisticsHubModal() (+32 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.10
Nodes (32): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+24 more)

### Community 7 - "App.jsx"
Cohesion: 0.19
Nodes (16): TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), useTournamentPosts(), applyTournamentPostSideEffects(), buildTournamentPostPayload(), hardDeleteTournamentPost(), invalidateTournamentCaches() (+8 more)

### Community 8 - "NPM Dependencies"
Cohesion: 0.05
Nodes (42): dependencies, clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, pocketbase, react-dom (+34 more)

### Community 9 - "Audit Logs Modal"
Cohesion: 0.60
Nodes (5): getRelationId(), notifyCommentReply(), relationId(), stripHtmlToPlain(), truncatePlain()

### Community 11 - "Stats Library Helpers"
Cohesion: 0.14
Nodes (30): addDaysYmd(), bumpCounter(), calcLevelFromValue(), eachDayInclusive(), emptyBookingCounters(), ensureBookingUser(), getAchievementGrants(), getAchievementsNow() (+22 more)

### Community 12 - "Achievement Badge Assets"
Cohesion: 0.07
Nodes (28): Achievement badge tier 1 level 1, Achievement badge tier 1 level 2, Achievement badge tier 1 level 3, Achievement badge tier 1 level 4, Achievement badge tier 1 level 5, Achievement badge tier 2 level 1, Achievement badge tier 2 level 2, Achievement badge tier 2 level 3 (+20 more)

### Community 13 - "gestures.js"
Cohesion: 0.16
Nodes (8): ForceUpdateOverlay(), PullToRefresh(), PostContextMenu(), CategoryDropdown(), useOverlayClose(), hasOpenOverlay(), registerOverlay(), stack

### Community 14 - "datePickerUtils.js"
Cohesion: 0.11
Nodes (28): AppHeader(), MembershipIcon(), computeAnnualEndDate(), getCurrentSessions(), getModeCopy(), MembershipEditModal(), normalizeDateInput(), MembershipPeriodRangeField() (+20 more)

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
Cohesion: 0.30
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
Cohesion: 0.11
Nodes (36): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame() (+28 more)

### Community 57 - "log.js"
Cohesion: 0.07
Nodes (58): AppInner(), BlockedAppShell(), getInitialFavoriteProductIds(), TAB_TITLES, CloseAppConfirmSheet(), CARD_STEPS, getStepSelectors(), getTooltipStyle() (+50 more)

### Community 58 - "achievements.js"
Cohesion: 0.08
Nodes (49): FullscreenSlideImage(), isImagePaintReady(), useYadiskLoadProgress(), PinnedBanner(), usePinnedThumbUrl(), useFetchedOriginal(), publishAlbums(), useResolvedExternalMedia() (+41 more)

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.06
Nodes (71): AvatarCropModal(), getCropCircle(), getImagePlacement(), AlertDialogContext, INITIAL_STATE, useAlertDialog(), FOCUSABLE_SELECTORS, Modal() (+63 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.08
Nodes (37): App(), PostUploadContext, PostUploadProvider(), AlertDialogProvider(), Toast(), ToastContext, ToastProvider(), useToast() (+29 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.22
Nodes (18): usePostUpload(), useRegisterAddAction(), CompetitionsPage(), FeedPage(), applyPinFocusHighlight(), computePinnedBannerIndex(), pinHighlightTimers, sortPinnedByCreated() (+10 more)

### Community 67 - "ShopPage.jsx"
Cohesion: 0.18
Nodes (13): useProductUpload(), AddActionContext, AddActionProvider(), DEFAULT_API, SearchBar(), ShopPage(), useProducts(), useSectionScroll() (+5 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.07
Nodes (58): react, Avatar(), IconButton, ModalFloatingCloseButton(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER (+50 more)

### Community 69 - "ArchiveModal.jsx"
Cohesion: 0.25
Nodes (14): filterProfileTrainings(), formatDateRangeLabel(), ProfileTrainingsSearch(), ArchiveModal(), formatDateRangeLabel(), getArchiveDefaultDateRange(), findRussianMonth(), isDateQueryParsed() (+6 more)

### Community 70 - "GalleryPage.jsx"
Cohesion: 0.09
Nodes (36): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+28 more)

### Community 71 - "error"
Cohesion: 0.21
Nodes (7): EmptyState(), ScrollToTopButton(), FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton(), TABS

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 77 - "useMaxCloseGuard.js"
Cohesion: 0.20
Nodes (13): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, useTriggerAddAction(), getSwipeableTabs(), getWindowWidth(), IGNORE_SELECTOR (+5 more)

### Community 78 - "AddActionContext.jsx"
Cohesion: 0.24
Nodes (9): INITIAL, PlayerForm(), RatingPage(), usePlayers(), buildPlayerRanks(), getPlayerRatingRank(), getRatingPoints(), isRatingVisible() (+1 more)

## Knowledge Gaps
- **131 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+126 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `App Shell Navigation` to `ProfilePage.jsx`, `Post Upload and UI Kit`, `ShopPage.jsx`, `GalleryCommentModal.jsx`, `Admin UI Controls`, `GalleryPage.jsx`, `App.jsx`, `error`, `notifications.js`, `AddActionContext.jsx`, `datePickerUtils.js`, `log.js`, `achievements.js`, `yadiskAlbumLazy.js`, `catalog.js`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `react` connect `GalleryCommentModal.jsx` to `NPM Dependencies`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _131 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.057805469020422294 - nodes in this community are weakly interconnected._
- **Should `notifications.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._
- **Should `Admin UI Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.08087431693989071 - nodes in this community are weakly interconnected._
- **Should `auditEventFormat.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10241820768136557 - nodes in this community are weakly interconnected._