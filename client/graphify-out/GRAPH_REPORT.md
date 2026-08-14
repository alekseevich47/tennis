# Graph Report - client  (2026-08-14)

## Corpus Check
- 189 files · ~175,537 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 908 nodes · 3234 edges · 18 communities (17 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d435aabb`
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
- ArchiveModal.jsx
- main.jsx

## God Nodes (most connected - your core abstractions)
1. `error` - 123 edges
2. `useAlertDialog()` - 39 edges
3. `Modal()` - 39 edges
4. `ProfileViewModal()` - 36 edges
5. `isModerator()` - 33 edges
6. `pb` - 30 edges
7. `TrainingsPage()` - 26 edges
8. `formatPostDate()` - 24 edges
9. `CompetitionsPage()` - 23 edges
10. `getMediaUrl()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `LongPressRing()` --references--> `react`  [EXTRACTED]
  src/lib/longPress.js → package.json
- `requestCommentReplyNotification()` --calls--> `error`  [EXTRACTED]
  src/services/notifications.js → src/lib/log.js
- `AppInner()` --calls--> `isUserBotBlocked()`  [EXTRACTED]
  src/App.jsx → src/services/auth.js
- `BlockedAppShell()` --calls--> `useMaxCloseGuard()`  [EXTRACTED]
  src/App.jsx → src/hooks/useMaxCloseGuard.js
- `AppMain()` --calls--> `useFavorites()`  [EXTRACTED]
  src/App.jsx → src/context/FavoritesContext.jsx

## Import Cycles
- None detected.

## Communities (18 total, 1 thin omitted)

### Community 0 - "Modal.jsx"
Cohesion: 0.05
Nodes (88): AlertDialogContext, INITIAL_STATE, useAlertDialog(), FOCUSABLE_SELECTORS, Modal(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel() (+80 more)

### Community 1 - "App.jsx"
Cohesion: 0.08
Nodes (59): CalendarStrip(), buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue() (+51 more)

### Community 2 - "PostDetailModal.jsx"
Cohesion: 0.07
Nodes (56): react, react, Avatar(), IconButton, ModalFloatingCloseButton(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer() (+48 more)

### Community 3 - "error"
Cohesion: 0.06
Nodes (64): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+56 more)

### Community 4 - "ProfilePage.jsx"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 5 - "StatsReachModal.jsx"
Cohesion: 0.06
Nodes (78): EmptyState(), MembershipIcon(), Spinner(), formatAdminSaveError(), MODES, StatsAchievementsModal(), hasAnyActivity(), SLICES (+70 more)

### Community 6 - "ProfileViewModal.jsx"
Cohesion: 0.06
Nodes (48): AppInner(), AppMain(), BlockedAppShell(), getInitialFavoriteProductIds(), TAB_TITLES, ADMIN_NAV_ITEM, GALLERY_NAV_ITEM, NAV_ITEMS (+40 more)

### Community 7 - "datePickerUtils.js"
Cohesion: 0.09
Nodes (40): AppHeader(), FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), useFavorites(), computeAnnualEndDate(), getCurrentSessions() (+32 more)

### Community 8 - "dependencies"
Cohesion: 0.05
Nodes (42): clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, dependencies, clsx, date-fns (+34 more)

### Community 9 - "LogsModal.jsx"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

### Community 10 - "postRichText.js"
Cohesion: 0.12
Nodes (33): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame() (+25 more)

### Community 11 - "gestures.js"
Cohesion: 0.23
Nodes (9): AvatarCropModal(), getCropCircle(), getImagePlacement(), resolvePanLimits(), usePinchZoom(), backdropOpacityForDrag(), clamp(), getTouchDistance() (+1 more)

### Community 16 - "ArchiveModal.jsx"
Cohesion: 0.06
Nodes (65): PostUploadContext, PostUploadProvider(), usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), FloatingAddButton(), DEFAULT_PULL_STATE (+57 more)

### Community 19 - "main.jsx"
Cohesion: 0.07
Nodes (42): App(), AlertDialogProvider(), Toast(), ToastContext, ToastProvider(), useToast(), formatCountdownPart(), formatTrainingCountdownBadge() (+34 more)

## Knowledge Gaps
- **76 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+71 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `error` to `Modal.jsx`, `App.jsx`, `PostDetailModal.jsx`, `ProfilePage.jsx`, `StatsReachModal.jsx`, `ProfileViewModal.jsx`, `datePickerUtils.js`, `ArchiveModal.jsx`, `main.jsx`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Why does `react` connect `PostDetailModal.jsx` to `dependencies`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _76 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Modal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05096887844979448 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07989464442493416 - nodes in this community are weakly interconnected._
- **Should `PostDetailModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06530825496342738 - nodes in this community are weakly interconnected._
- **Should `error` be split into smaller, more focused modules?**
  _Cohesion score 0.05949367088607595 - nodes in this community are weakly interconnected._