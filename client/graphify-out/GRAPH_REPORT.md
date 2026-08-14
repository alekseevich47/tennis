# Graph Report - client  (2026-08-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 934 nodes · 3319 edges · 25 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `58484c5b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Modal.jsx
- App.jsx
- PostDetailModal.jsx
- error
- ProfilePage.jsx
- StatsReachModal.jsx
- ProfileViewModal.jsx
- datePickerUtils.js
- dependencies
- LogsModal.jsx
- postRichText.js
- gestures.js
- BroadcastModal.jsx
- tournamentPosts.js
- FeedPage.jsx
- ArchiveModal.jsx
- useSectionScroll
- main.jsx
- CompetitionsPage.jsx
- usePinnedBannerIndex.js

## God Nodes (most connected - your core abstractions)
1. `error` - 123 edges
2. `useAlertDialog()` - 39 edges
3. `Modal()` - 39 edges
4. `ProfileViewModal()` - 36 edges
5. `isModerator()` - 33 edges
6. `pb` - 30 edges
7. `TrainingsPage()` - 26 edges
8. `formatPostDate()` - 24 edges
9. `getMediaUrl()` - 22 edges
10. `videoPreviewUrl()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `BroadcastModal()` --calls--> `useAlertDialog()`  [EXTRACTED]
  src/features/admin/BroadcastModal.jsx → src/components/ui/AlertDialog.jsx
- `NotificationSendModal()` --calls--> `useAlertDialog()`  [EXTRACTED]
  src/features/admin/NotificationSendModal.jsx → src/components/ui/AlertDialog.jsx
- `GalleryPage()` --calls--> `useAlertDialog()`  [EXTRACTED]
  src/features/gallery/GalleryPage.jsx → src/components/ui/AlertDialog.jsx
- `MembershipEditModal()` --calls--> `useAlertDialog()`  [EXTRACTED]
  src/features/profile/MembershipEditModal.jsx → src/components/ui/AlertDialog.jsx
- `ProfilePage()` --calls--> `useAlertDialog()`  [EXTRACTED]
  src/features/profile/ProfilePage.jsx → src/components/ui/AlertDialog.jsx

## Import Cycles
- None detected.

## Communities (25 total, 0 thin omitted)

### Community 0 - "Modal.jsx"
Cohesion: 0.06
Nodes (86): AlertDialogContext, INITIAL_STATE, useAlertDialog(), FOCUSABLE_SELECTORS, Modal(), CreateTournamentPostModal(), EditTournamentPostModal(), CreatePostModal() (+78 more)

### Community 1 - "App.jsx"
Cohesion: 0.06
Nodes (83): AppMain(), TAB_TITLES, ADMIN_NAV_ITEM, ADMIN_TAB_INDEX, BOTTOM_NAV_ITEMS, GALLERY_NAV_ITEM, GALLERY_TAB_INDEX, NAV_ITEMS (+75 more)

### Community 2 - "PostDetailModal.jsx"
Cohesion: 0.08
Nodes (53): Avatar(), IconButton, ModalFloatingCloseButton(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium() (+45 more)

### Community 3 - "error"
Cohesion: 0.07
Nodes (56): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+48 more)

### Community 4 - "ProfilePage.jsx"
Cohesion: 0.07
Nodes (53): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+45 more)

### Community 5 - "StatsReachModal.jsx"
Cohesion: 0.08
Nodes (40): InfoTooltip(), Spinner(), Toggle(), AdminPanelPage(), NotificationSettingsModal(), SETTINGS_ROWS, METRICS, StatisticsHubModal() (+32 more)

### Community 6 - "ProfileViewModal.jsx"
Cohesion: 0.08
Nodes (51): AppInner(), getInitialFavoriteProductIds(), CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput(), OnboardingTutorial() (+43 more)

### Community 7 - "datePickerUtils.js"
Cohesion: 0.08
Nodes (41): AppHeader(), MembershipIcon(), FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), useFavorites(), computeAnnualEndDate() (+33 more)

### Community 8 - "dependencies"
Cohesion: 0.04
Nodes (44): clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, dependencies, clsx, date-fns (+36 more)

### Community 9 - "LogsModal.jsx"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

### Community 10 - "postRichText.js"
Cohesion: 0.12
Nodes (34): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame() (+26 more)

### Community 11 - "gestures.js"
Cohesion: 0.16
Nodes (17): AvatarCropModal(), getCropCircle(), getImagePlacement(), Toast(), resolvePanLimits(), usePinchZoom(), backdropOpacityForDrag(), clamp() (+9 more)

### Community 12 - "BroadcastModal.jsx"
Cohesion: 0.08
Nodes (41): FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton(), buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal() (+33 more)

### Community 14 - "tournamentPosts.js"
Cohesion: 0.26
Nodes (14): CompetitionsPage(), useTournamentPosts(), applyTournamentPostSideEffects(), buildTournamentPostPayload(), hardDeleteTournamentPost(), invalidateTournamentCaches(), listTournamentPosts(), pinTournamentPost() (+6 more)

### Community 15 - "FeedPage.jsx"
Cohesion: 0.22
Nodes (14): usePostUpload(), FeedPage(), PostCardLike(), sortPinnedByCreated(), subscribeYadiskAlbumCache(), usePostLikes(), usePosts(), createPost() (+6 more)

### Community 16 - "ArchiveModal.jsx"
Cohesion: 0.25
Nodes (14): filterProfileTrainings(), formatDateRangeLabel(), ProfileTrainingsSearch(), ArchiveModal(), formatDateRangeLabel(), getArchiveDefaultDateRange(), findRussianMonth(), isDateQueryParsed() (+6 more)

### Community 17 - "useSectionScroll"
Cohesion: 0.21
Nodes (10): BlockedAppShell(), disableMaxVerticalSwipes(), isEditableFocus(), useMaxCloseGuard(), useSectionScroll(), closeTopOverlay(), stack, isSectionScrollAtTop() (+2 more)

### Community 19 - "main.jsx"
Cohesion: 0.21
Nodes (9): App(), PostUploadContext, PostUploadProvider(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), AlertDialogProvider(), ToastProvider() (+1 more)

### Community 20 - "CompetitionsPage.jsx"
Cohesion: 0.23
Nodes (9): EmptyState(), FloatingAddButton(), DEFAULT_PULL_STATE, PullToRefresh(), PullToRefreshStateContext, usePullToRefreshState(), ScrollToTopButton(), TABS (+1 more)

### Community 21 - "usePinnedBannerIndex.js"
Cohesion: 0.32
Nodes (7): applyPinFocusHighlight(), computePinnedBannerIndex(), PIN_FOCUS_HIGHLIGHT_CLASS, PIN_FOCUS_HIGHLIGHT_MS, pinHighlightTimers, PINNED_BANNER_OFFSET_PX, usePinnedBannerIndex()

## Knowledge Gaps
- **91 isolated node(s):** `AlertDialogContext`, `INITIAL_STATE`, `FOCUSABLE_SELECTORS`, `cache`, `listeners` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `error` to `Modal.jsx`, `App.jsx`, `PostDetailModal.jsx`, `ProfilePage.jsx`, `StatsReachModal.jsx`, `ProfileViewModal.jsx`, `datePickerUtils.js`, `BroadcastModal.jsx`, `tournamentPosts.js`, `FeedPage.jsx`, `main.jsx`, `CompetitionsPage.jsx`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `Modal()` connect `Modal.jsx` to `App.jsx`, `PostDetailModal.jsx`, `ProfilePage.jsx`, `StatsReachModal.jsx`, `ProfileViewModal.jsx`, `datePickerUtils.js`, `LogsModal.jsx`, `postRichText.js`, `gestures.js`, `BroadcastModal.jsx`, `ArchiveModal.jsx`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `pb` connect `ProfilePage.jsx` to `Modal.jsx`, `App.jsx`, `PostDetailModal.jsx`, `error`, `StatsReachModal.jsx`, `ProfileViewModal.jsx`, `datePickerUtils.js`, `LogsModal.jsx`, `BroadcastModal.jsx`, `tournamentPosts.js`, `FeedPage.jsx`, `CompetitionsPage.jsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `AlertDialogContext`, `INITIAL_STATE`, `FOCUSABLE_SELECTORS` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Modal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05703225806451613 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055964653902798235 - nodes in this community are weakly interconnected._
- **Should `PostDetailModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07531645569620253 - nodes in this community are weakly interconnected._