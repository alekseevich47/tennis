# Graph Report - tennis  (2026-08-26)

## Corpus Check
- 247 files · ~226,774 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1256 nodes · 3864 edges · 80 communities (71 shown, 9 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 138 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `987b1c7b`
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
- media.js
- GalleryCommentModal.jsx
- GalleryPage.jsx
- claimlib.js
- tournamentComments.js
- useSectionSwipe.js
- tournamentPosts.js
- AboutAppModal.jsx
- useMaxCloseGuard.js
- videoPreviewUrl
- yadiskMediaSessionCache.js

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

## Communities (80 total, 9 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.05
Nodes (109): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, NotificationCard(), parseCommentReplyParentText(), NotificationsDropdown(), formatDate() (+101 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.15
Nodes (18): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), isProductsKey(), ProductUploadContext, ProductUploadProvider(), useProducts() (+10 more)

### Community 3 - "notifications.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.06
Nodes (62): InfoTooltip(), Spinner(), Toggle(), AdminPanelPage(), buildSendResultAlert(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel() (+54 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

### Community 7 - "App.jsx"
Cohesion: 0.67
Nodes (3): DEBIAN_FRONTEND, server-bootstrap.sh script, wait_pb()

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
Cohesion: 0.13
Nodes (21): AvatarCropModal(), getCropCircle(), getImagePlacement(), PostContextMenu(), CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS (+13 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.05
Nodes (64): AppHeader(), CloseAppConfirmSheet(), IconButton, MembershipIcon(), FOCUSABLE_SELECTORS, Modal(), computeAnnualEndDate(), getCurrentSessions() (+56 more)

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
Nodes (35): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame() (+27 more)

### Community 57 - "log.js"
Cohesion: 0.22
Nodes (18): formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput(), ProfileViewModal(), TRAINING_BADGE (+10 more)

### Community 58 - "achievements.js"
Cohesion: 0.18
Nodes (27): PB_URL, PinnedBanner(), usePinnedThumbUrl(), publishAlbums(), useResolvedExternalMedia(), useYadiskEmbed(), setYadiskAlbumCache(), createAlbumWindowController() (+19 more)

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.22
Nodes (18): AlertDialogContext, INITIAL_STATE, useAlertDialog(), CreateTournamentPostModal(), EditTournamentPostModal(), CommentComposeForm(), CreatePostModal(), EditPostModal() (+10 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.20
Nodes (21): useFavorites(), CommentMediaBody(), FavoritesDropdown(), FavoritesDropdownItem(), getProductCategoryIds(), ProductCard(), getProductCategoryIds(), ProductDetail() (+13 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.14
Nodes (18): useProductUpload(), EmptyState(), PullToRefresh(), ScrollToTopButton(), FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton() (+10 more)

### Community 67 - "media.js"
Cohesion: 0.28
Nodes (8): formatAdminSaveError(), RatingPage(), usePlayers(), buildPlayerRanks(), getPlayerRatingRank(), getRatingPoints(), isRatingVisible(), listPlayers()

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.06
Nodes (61): react, Avatar(), ModalFloatingCloseButton(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium() (+53 more)

### Community 70 - "GalleryPage.jsx"
Cohesion: 0.20
Nodes (16): useGalleryUpload(), GalleryMediaOverlay(), createGalleryUploadItem(), GalleryItemLike(), GalleryPage(), getAspectClass(), getImageAspectRatio(), getVideoAspectRatio() (+8 more)

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 76 - "useSectionSwipe.js"
Cohesion: 0.43
Nodes (6): useFetchedOriginal(), blobFromResponse(), blobUrlCache, fetchBlobUrlWithProgress(), getCachedMediaBlobUrl(), inflight

### Community 77 - "tournamentPosts.js"
Cohesion: 0.14
Nodes (22): TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), CompetitionsPage(), applyPinFocusHighlight(), computePinnedBannerIndex(), pinHighlightTimers, sortPinnedByCreated() (+14 more)

### Community 78 - "AboutAppModal.jsx"
Cohesion: 0.10
Nodes (25): PostUploadContext, PostUploadProvider(), usePostUpload(), AlertDialogProvider(), Toast(), ToastContext, ToastProvider(), useToast() (+17 more)

### Community 80 - "useMaxCloseGuard.js"
Cohesion: 0.05
Nodes (49): App(), AppInner(), AppMain(), BlockedAppShell(), getInitialFavoriteProductIds(), TAB_TITLES, ADMIN_NAV_ITEM, BottomNav() (+41 more)

### Community 83 - "videoPreviewUrl"
Cohesion: 0.17
Nodes (9): MediaPreviewAlbumItem(), MediaPreviewGrid(), MediaProgressRing(), PostMedia(), SortableMediaPreviewGrid(), useInFeedViewport(), useSwipeGallery(), getYadiskAlbumCache() (+1 more)

### Community 85 - "yadiskMediaSessionCache.js"
Cohesion: 0.11
Nodes (30): FeedPage(), carouselSlideKey(), FullscreenImageViewer(), FullscreenSlideImage(), getOriginRect(), getWindowWidth(), isImagePaintReady(), itemSlideId() (+22 more)

## Knowledge Gaps
- **132 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+127 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `App Shell Navigation` to `ProfilePage.jsx`, `Post Upload and UI Kit`, `media.js`, `GalleryCommentModal.jsx`, `Admin UI Controls`, `GalleryPage.jsx`, `notifications.js`, `tournamentPosts.js`, `AboutAppModal.jsx`, `gestures.js`, `useMaxCloseGuard.js`, `datePickerUtils.js`, `yadiskMediaSessionCache.js`, `log.js`, `achievements.js`, `yadiskAlbumLazy.js`, `catalog.js`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `LongPressRing()` connect `GalleryCommentModal.jsx` to `yadiskAlbumLazy.js`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `react` connect `GalleryCommentModal.jsx` to `NPM Dependencies`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _132 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.05008944543828265 - nodes in this community are weakly interconnected._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.1471861471861472 - nodes in this community are weakly interconnected._
- **Should `notifications.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._