# Graph Report - client  (2026-08-26)

## Corpus Check
- 202 files · ~185,037 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 985 nodes · 3499 edges · 29 communities (27 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `08d03c2c`
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
- ShopPage.jsx
- catalog.js
- ArchiveModal.jsx
- App.jsx
- main.jsx
- main.jsx
- GalleryPage.jsx
- useSectionSwipe.js
- useMaxCloseGuard.js
- AddActionContext.jsx
- vite.config.js
- ProductUploadProvider.jsx
- FavoritesContext.jsx

## God Nodes (most connected - your core abstractions)
1. `error` - 123 edges
2. `Modal()` - 43 edges
3. `useAlertDialog()` - 39 edges
4. `ProfileViewModal()` - 37 edges
5. `isModerator()` - 33 edges
6. `pb` - 31 edges
7. `TrainingsPage()` - 27 edges
8. `CompetitionsPage()` - 24 edges
9. `formatPostDate()` - 24 edges
10. `getMediaUrl()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `LongPressRing()` --references--> `react`  [EXTRACTED]
  src/lib/longPress.js → package.json
- `AppInner()` --calls--> `useMaxAuth()`  [EXTRACTED]
  src/App.jsx → src/hooks/useMaxAuth.js
- `AppInner()` --calls--> `isUserBanned()`  [EXTRACTED]
  src/App.jsx → src/services/auth.js
- `AppInner()` --calls--> `isUserBotBlocked()`  [EXTRACTED]
  src/App.jsx → src/services/auth.js
- `BlockedAppShell()` --calls--> `useMaxCloseGuard()`  [EXTRACTED]
  src/App.jsx → src/hooks/useMaxCloseGuard.js

## Import Cycles
- None detected.

## Communities (29 total, 2 thin omitted)

### Community 0 - "Modal.jsx"
Cohesion: 0.09
Nodes (50): AlertDialogContext, INITIAL_STATE, useAlertDialog(), useFavorites(), CreateTournamentPostModal(), EditTournamentPostModal(), CommentComposeForm(), CommentMediaBody() (+42 more)

### Community 1 - "App.jsx"
Cohesion: 0.06
Nodes (72): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), getTrainingStatusForUser(), getUserPastTrainings(), CalendarStrip(), ArchiveModal(), formatDateRangeLabel() (+64 more)

### Community 2 - "PostDetailModal.jsx"
Cohesion: 0.06
Nodes (57): react, react, Avatar(), ModalFloatingCloseButton(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER (+49 more)

### Community 3 - "error"
Cohesion: 0.11
Nodes (34): buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal(), getAudienceLabel(), NotificationSendModal() (+26 more)

### Community 4 - "ProfilePage.jsx"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 5 - "StatsReachModal.jsx"
Cohesion: 0.06
Nodes (58): EmptyState(), IconButton, InfoTooltip(), FOCUSABLE_SELECTORS, Modal(), Spinner(), Toggle(), ALL_CATEGORY_VALUES (+50 more)

### Community 6 - "ProfileViewModal.jsx"
Cohesion: 0.08
Nodes (61): CLICK_ACTION_LABELS, NotificationCard(), parseCommentReplyParentText(), NotificationsDropdown(), CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS (+53 more)

### Community 7 - "datePickerUtils.js"
Cohesion: 0.10
Nodes (36): AppHeader(), computeAnnualEndDate(), getCurrentSessions(), getModeCopy(), MembershipEditModal(), normalizeDateInput(), MembershipPeriodRangeField(), MembershipStartDateField() (+28 more)

### Community 8 - "dependencies"
Cohesion: 0.05
Nodes (42): clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, dependencies, clsx, date-fns (+34 more)

### Community 9 - "LogsModal.jsx"
Cohesion: 0.11
Nodes (28): AuditEventRow(), useAuditEvents(), CATEGORY_STYLES, COMMENT_OBJECT_TYPES, COMMENT_SECTION_LABELS, COMMENT_TYPE_LABELS, formatAuditEventDetails(), formatAuditEventPreview() (+20 more)

### Community 10 - "postRichText.js"
Cohesion: 0.11
Nodes (36): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame() (+28 more)

### Community 11 - "gestures.js"
Cohesion: 0.36
Nodes (9): AvatarCropModal(), getCropCircle(), getImagePlacement(), resolvePanLimits(), usePinchZoom(), backdropOpacityForDrag(), clamp(), getTouchDistance() (+1 more)

### Community 13 - "FullscreenImageViewer.jsx"
Cohesion: 0.08
Nodes (50): carouselSlideKey(), FullscreenSlideImage(), getOriginRect(), getWindowWidth(), isImagePaintReady(), itemSlideId(), useYadiskLoadProgress(), PinnedBanner() (+42 more)

### Community 14 - "ShopPage.jsx"
Cohesion: 0.20
Nodes (12): ForceUpdateOverlay(), useProductUpload(), CategoryDropdown(), SearchBar(), ShopPage(), useOverlayClose(), useProducts(), registerOverlay() (+4 more)

### Community 15 - "catalog.js"
Cohesion: 0.26
Nodes (11): useGallery(), addGalleryImage(), createGalleryFormData(), createProduct(), deleteGalleryImage(), deleteGalleryImages(), deleteGalleryRelatedRecords(), listGallery() (+3 more)

### Community 16 - "ArchiveModal.jsx"
Cohesion: 0.07
Nodes (55): usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), PullToRefresh(), ScrollToTopButton(), FeedListSkeleton(), RatingListSkeleton() (+47 more)

### Community 17 - "App.jsx"
Cohesion: 0.22
Nodes (12): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, CloseAppConfirmSheet(), AdminPanelPage(), useSessionResetKey(), deleteProduct() (+4 more)

### Community 18 - "main.jsx"
Cohesion: 0.19
Nodes (11): App(), createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), PostUploadContext, PostUploadProvider() (+3 more)

### Community 19 - "main.jsx"
Cohesion: 0.09
Nodes (36): MembershipIcon(), Toast(), ToastContext, ToastProvider(), useToast(), MAX_AUTH_URL, MAX_SELLER_URL, PB_URL (+28 more)

### Community 20 - "GalleryPage.jsx"
Cohesion: 0.32
Nodes (9): GalleryMediaOverlay(), createGalleryUploadItem(), GalleryItemLike(), getAspectClass(), getImageAspectRatio(), getVideoAspectRatio(), useGalleryLikes(), listGalleryLikes() (+1 more)

### Community 21 - "useSectionSwipe.js"
Cohesion: 0.26
Nodes (9): getSwipeableTabs(), getWindowWidth(), IGNORE_SELECTOR, isTextFieldFocused(), shouldIgnoreTarget(), SWIPE_ALLOW_OVERLAY_SUFFIXES, useSectionSwipe(), hasBlockingOverlay() (+1 more)

### Community 23 - "useMaxCloseGuard.js"
Cohesion: 0.36
Nodes (7): BlockedAppShell(), disableMaxVerticalSwipes(), isEditableFocus(), useMaxCloseGuard(), closeTopOverlay(), isSectionScrollAtTop(), scrollSectionToTop()

### Community 24 - "AddActionContext.jsx"
Cohesion: 0.27
Nodes (8): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, AddActionContext, AddActionProvider(), DEFAULT_API, useTriggerAddAction()

### Community 27 - "ProductUploadProvider.jsx"
Cohesion: 0.53
Nodes (5): isProductsKey(), ProductUploadContext, ProductUploadProvider(), createProductWithProgress(), updateProduct()

### Community 28 - "FavoritesContext.jsx"
Cohesion: 0.53
Nodes (5): FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), adjustProductFavoritesCount()

## Knowledge Gaps
- **85 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `ProfileViewModal.jsx` to `Modal.jsx`, `App.jsx`, `PostDetailModal.jsx`, `error`, `ProfilePage.jsx`, `StatsReachModal.jsx`, `datePickerUtils.js`, `FullscreenImageViewer.jsx`, `ShopPage.jsx`, `catalog.js`, `ArchiveModal.jsx`, `App.jsx`, `main.jsx`, `main.jsx`, `GalleryPage.jsx`, `ProductUploadProvider.jsx`, `FavoritesContext.jsx`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `LongPressRing()` connect `PostDetailModal.jsx` to `Modal.jsx`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `react` connect `PostDetailModal.jsx` to `dependencies`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Modal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08691910499139414 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06282271944922548 - nodes in this community are weakly interconnected._
- **Should `PostDetailModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06409601634320736 - nodes in this community are weakly interconnected._