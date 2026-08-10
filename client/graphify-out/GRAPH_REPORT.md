# Graph Report - client  (2026-08-10)

## Corpus Check
- 177 files · ~164,125 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 847 nodes · 3034 edges · 19 communities (18 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3f415adc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ProfileViewModal.jsx
- useAlertDialog
- Modal.jsx
- CompetitionsPage.jsx
- trainings.js
- catalog.js
- dependencies
- datePickerUtils.js
- LogsModal.jsx
- App.jsx
- postRichText.js
- format.js
- error
- PostDetailModal.jsx
- OnboardingTutorial.jsx
- BOTTOM_NAV_ITEMS

## God Nodes (most connected - your core abstractions)
1. `error` - 123 edges
2. `Modal()` - 38 edges
3. `ProfileViewModal()` - 36 edges
4. `useAlertDialog()` - 35 edges
5. `isModerator()` - 33 edges
6. `pb` - 30 edges
7. `TrainingsPage()` - 26 edges
8. `formatPostDate()` - 24 edges
9. `getMediaUrl()` - 22 edges
10. `ProfilePage()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `LongPressRing()` --references--> `react`  [EXTRACTED]
  src/lib/longPress.js → package.json
- `requestCommentReplyNotification()` --calls--> `error`  [EXTRACTED]
  src/services/notifications.js → src/lib/log.js
- `AppInner()` --calls--> `useMaxAuth()`  [EXTRACTED]
  src/App.jsx → src/hooks/useMaxAuth.js
- `AppInner()` --calls--> `isUserBanned()`  [EXTRACTED]
  src/App.jsx → src/services/auth.js
- `BlockedAppShell()` --calls--> `useMaxCloseGuard()`  [EXTRACTED]
  src/App.jsx → src/hooks/useMaxCloseGuard.js

## Import Cycles
- None detected.

## Communities (19 total, 1 thin omitted)

### Community 0 - "ProfileViewModal.jsx"
Cohesion: 0.07
Nodes (53): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+45 more)

### Community 1 - "useAlertDialog"
Cohesion: 0.11
Nodes (49): AlertDialogContext, INITIAL_STATE, useAlertDialog(), FOCUSABLE_SELECTORS, Modal(), CreateTournamentPostModal(), EditTournamentPostModal(), CreatePostModal() (+41 more)

### Community 2 - "Modal.jsx"
Cohesion: 0.10
Nodes (36): EmptyState(), Spinner(), AdminPanelPage(), METRICS, StatisticsHubModal(), MODES, StatsAchievementsModal(), hasAnyActivity() (+28 more)

### Community 3 - "CompetitionsPage.jsx"
Cohesion: 0.06
Nodes (54): App(), PostUploadContext, PostUploadProvider(), usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), AlertDialogProvider() (+46 more)

### Community 4 - "trainings.js"
Cohesion: 0.07
Nodes (75): AppMain(), IconButton, CalendarStrip(), ArchiveModal(), formatDateRangeLabel(), buildTrainingPatch(), EditTrainingModal(), getFormFromTraining() (+67 more)

### Community 5 - "catalog.js"
Cohesion: 0.09
Nodes (38): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+30 more)

### Community 6 - "dependencies"
Cohesion: 0.05
Nodes (42): clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, dependencies, clsx, date-fns (+34 more)

### Community 7 - "datePickerUtils.js"
Cohesion: 0.08
Nodes (41): AppHeader(), MembershipIcon(), FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), useFavorites(), computeAnnualEndDate() (+33 more)

### Community 8 - "LogsModal.jsx"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

### Community 9 - "App.jsx"
Cohesion: 0.09
Nodes (46): getCollapsedLabel(), isUserChecked(), UserMultiSelect(), formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator() (+38 more)

### Community 10 - "postRichText.js"
Cohesion: 0.14
Nodes (28): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame(), applyFormatCommand() (+20 more)

### Community 11 - "format.js"
Cohesion: 0.20
Nodes (17): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, NotificationCard(), parseCommentReplyParentText(), NotificationsDropdown(), formatRelativeTime() (+9 more)

### Community 12 - "error"
Cohesion: 0.15
Nodes (27): InfoTooltip(), Toggle(), buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal() (+19 more)

### Community 13 - "PostDetailModal.jsx"
Cohesion: 0.06
Nodes (59): react, react, ADMIN_NAV_ITEM, GALLERY_NAV_ITEM, NAV_ITEMS, Avatar(), TournamentCommentsSection(), getParticipantDisplayName() (+51 more)

### Community 15 - "OnboardingTutorial.jsx"
Cohesion: 0.06
Nodes (39): AppInner(), BlockedAppShell(), getInitialFavoriteProductIds(), TAB_TITLES, AvatarCropModal(), getCropCircle(), getImagePlacement(), CloseAppConfirmSheet() (+31 more)

## Knowledge Gaps
- **67 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `error` to `ProfileViewModal.jsx`, `useAlertDialog`, `CompetitionsPage.jsx`, `trainings.js`, `catalog.js`, `datePickerUtils.js`, `App.jsx`, `format.js`, `PostDetailModal.jsx`, `OnboardingTutorial.jsx`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Why does `react` connect `PostDetailModal.jsx` to `dependencies`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ProfileViewModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06946386946386947 - nodes in this community are weakly interconnected._
- **Should `useAlertDialog` be split into smaller, more focused modules?**
  _Cohesion score 0.10588670862643465 - nodes in this community are weakly interconnected._
- **Should `Modal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09764309764309764 - nodes in this community are weakly interconnected._
- **Should `CompetitionsPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06338028169014084 - nodes in this community are weakly interconnected._