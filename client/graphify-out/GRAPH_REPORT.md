# Graph Report - client  (2026-08-26)

## Corpus Check
- 207 files · ~190,603 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1023 nodes · 3655 edges · 22 communities (20 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2112327b`
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
- FullscreenImageViewer.jsx
- ArchiveModal.jsx
- main.jsx
- main.jsx
- GalleryPage.jsx
- useSectionSwipe.js
- vite.config.js

## God Nodes (most connected - your core abstractions)
1. `error` - 127 edges
2. `Modal()` - 44 edges
3. `useAlertDialog()` - 41 edges
4. `ProfileViewModal()` - 37 edges
5. `isModerator()` - 33 edges
6. `pb` - 31 edges
7. `TrainingsPage()` - 27 edges
8. `CompetitionsPage()` - 24 edges
9. `hasVisibleText()` - 24 edges
10. `useOverlayClose()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `LongPressRing()` --references--> `react`  [EXTRACTED]
  src/lib/longPress.js → package.json
- `ScheduledPostActionsMenu()` --calls--> `useOverlayClose()`  [EXTRACTED]
  src/features/feed/ScheduledPostsModal.jsx → src/hooks/useOverlayClose.js
- `AppInner()` --calls--> `isUserBotBlocked()`  [EXTRACTED]
  src/App.jsx → src/services/auth.js
- `BlockedAppShell()` --calls--> `useMaxCloseGuard()`  [EXTRACTED]
  src/App.jsx → src/hooks/useMaxCloseGuard.js
- `AppMain()` --calls--> `useFavorites()`  [EXTRACTED]
  src/App.jsx → src/context/FavoritesContext.jsx

## Import Cycles
- None detected.

## Communities (22 total, 2 thin omitted)

### Community 0 - "Modal.jsx"
Cohesion: 0.06
Nodes (73): ForceUpdateOverlay(), useAlertDialog(), CreateTournamentPostModal(), EditTournamentPostModal(), CommentComposeForm(), CommentMediaBody(), CreatePostModal(), EditPostModal() (+65 more)

### Community 1 - "App.jsx"
Cohesion: 0.05
Nodes (102): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, PostUploadContext, PostUploadProvider(), CloseAppConfirmSheet(), PostCardLike() (+94 more)

### Community 2 - "PostDetailModal.jsx"
Cohesion: 0.08
Nodes (44): Avatar(), ModalFloatingCloseButton(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments() (+36 more)

### Community 3 - "error"
Cohesion: 0.13
Nodes (29): InfoTooltip(), Toggle(), buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal() (+21 more)

### Community 4 - "ProfilePage.jsx"
Cohesion: 0.10
Nodes (26): PAD, ScheduleDateTimeSheet(), ScheduledPostActionsMenu(), ScheduledPostRow(), formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS (+18 more)

### Community 5 - "StatsReachModal.jsx"
Cohesion: 0.08
Nodes (44): FOCUSABLE_SELECTORS, Modal(), AdminPanelPage(), METRICS, StatisticsHubModal(), MODES, StatsAchievementsModal(), hasAnyActivity() (+36 more)

### Community 6 - "ProfileViewModal.jsx"
Cohesion: 0.07
Nodes (62): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), IconButton (+54 more)

### Community 7 - "datePickerUtils.js"
Cohesion: 0.08
Nodes (43): AppHeader(), AlertDialogContext, AlertDialogProvider(), INITIAL_STATE, FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount() (+35 more)

### Community 8 - "dependencies"
Cohesion: 0.04
Nodes (44): clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, dependencies, clsx, date-fns (+36 more)

### Community 9 - "LogsModal.jsx"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

### Community 10 - "postRichText.js"
Cohesion: 0.11
Nodes (36): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame() (+28 more)

### Community 11 - "gestures.js"
Cohesion: 0.36
Nodes (9): AvatarCropModal(), getCropCircle(), getImagePlacement(), resolvePanLimits(), usePinchZoom(), backdropOpacityForDrag(), clamp(), getTouchDistance() (+1 more)

### Community 13 - "FullscreenImageViewer.jsx"
Cohesion: 0.10
Nodes (40): PinnedBanner(), usePinnedThumbUrl(), useFetchedOriginal(), publishAlbums(), useResolvedExternalMedia(), setYadiskAlbumCache(), createAlbumWindowController(), createPriorityQueue() (+32 more)

### Community 16 - "ArchiveModal.jsx"
Cohesion: 0.06
Nodes (64): usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), EmptyState(), PullToRefresh(), ScrollToTopButton(), FeedListSkeleton() (+56 more)

### Community 18 - "main.jsx"
Cohesion: 0.29
Nodes (8): App(), AboutAppModal(), openExternalUrl(), useAppVersionCheck(), APP_BUILD, APP_DISPLAY_VERSION, fetchRemoteAppVersion(), getVersionManifestUrl()

### Community 19 - "main.jsx"
Cohesion: 0.08
Nodes (41): clampPercent(), computeGridLayout(), FloatingAchievements(), hashUnit(), Toast(), ToastContext, ToastProvider(), useToast() (+33 more)

### Community 20 - "GalleryPage.jsx"
Cohesion: 0.09
Nodes (39): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+31 more)

### Community 21 - "useSectionSwipe.js"
Cohesion: 0.10
Nodes (24): BlockedAppShell(), ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, AddActionContext, AddActionProvider(), DEFAULT_API (+16 more)

## Knowledge Gaps
- **87 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+82 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `App.jsx` to `Modal.jsx`, `PostDetailModal.jsx`, `error`, `ProfilePage.jsx`, `ProfileViewModal.jsx`, `datePickerUtils.js`, `FullscreenImageViewer.jsx`, `ArchiveModal.jsx`, `main.jsx`, `GalleryPage.jsx`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `LongPressRing()` connect `Modal.jsx` to `dependencies`, `PostDetailModal.jsx`, `ProfilePage.jsx`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _87 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Modal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05910838911835921 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050980392156862744 - nodes in this community are weakly interconnected._
- **Should `PostDetailModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0776255707762557 - nodes in this community are weakly interconnected._
- **Should `error` be split into smaller, more focused modules?**
  _Cohesion score 0.13363363363363365 - nodes in this community are weakly interconnected._