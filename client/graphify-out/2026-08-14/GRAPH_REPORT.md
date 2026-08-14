# Graph Report - client  (2026-08-10)

## Corpus Check
- 178 files · ~164,838 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 850 nodes · 3038 edges · 20 communities (19 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6d397a04`
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
- PostContextMenu.jsx
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
- `AppInner()` --calls--> `isUserBotBlocked()`  [EXTRACTED]
  src/App.jsx → src/services/auth.js
- `BlockedAppShell()` --calls--> `useMaxCloseGuard()`  [EXTRACTED]
  src/App.jsx → src/hooks/useMaxCloseGuard.js
- `AppMain()` --calls--> `useFavorites()`  [EXTRACTED]
  src/App.jsx → src/context/FavoritesContext.jsx

## Import Cycles
- None detected.

## Communities (20 total, 1 thin omitted)

### Community 0 - "ProfileViewModal.jsx"
Cohesion: 0.07
Nodes (55): Toast(), ToastContext, ToastProvider(), useToast(), formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS (+47 more)

### Community 1 - "useAlertDialog"
Cohesion: 0.09
Nodes (54): AlertDialogContext, INITIAL_STATE, useAlertDialog(), FOCUSABLE_SELECTORS, Modal(), useFavorites(), CreateTournamentPostModal(), EditTournamentPostModal() (+46 more)

### Community 2 - "Modal.jsx"
Cohesion: 0.10
Nodes (35): EmptyState(), Spinner(), AdminPanelPage(), METRICS, StatisticsHubModal(), MODES, StatsAchievementsModal(), hasAnyActivity() (+27 more)

### Community 3 - "CompetitionsPage.jsx"
Cohesion: 0.08
Nodes (43): PostUploadContext, PostUploadProvider(), usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), PullToRefresh(), ScrollToTopButton() (+35 more)

### Community 4 - "trainings.js"
Cohesion: 0.08
Nodes (65): CalendarStrip(), buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue() (+57 more)

### Community 5 - "catalog.js"
Cohesion: 0.06
Nodes (49): App(), createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext (+41 more)

### Community 6 - "dependencies"
Cohesion: 0.05
Nodes (42): clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, dependencies, clsx, date-fns (+34 more)

### Community 7 - "datePickerUtils.js"
Cohesion: 0.08
Nodes (43): AppHeader(), IconButton, MembershipIcon(), MembershipPeriodRangeField(), MembershipStartDateField(), ProfileSingleDateField(), filterProfileTrainings(), formatDateRangeLabel() (+35 more)

### Community 8 - "LogsModal.jsx"
Cohesion: 0.10
Nodes (32): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+24 more)

### Community 9 - "App.jsx"
Cohesion: 0.08
Nodes (44): CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput(), OnboardingTutorial(), padHighlightRect(), scrollTargetIntoView() (+36 more)

### Community 10 - "postRichText.js"
Cohesion: 0.14
Nodes (28): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame(), applyFormatCommand() (+20 more)

### Community 11 - "format.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 12 - "error"
Cohesion: 0.14
Nodes (30): InfoTooltip(), Toggle(), buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal() (+22 more)

### Community 13 - "PostDetailModal.jsx"
Cohesion: 0.08
Nodes (50): react, react, Avatar(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium() (+42 more)

### Community 14 - "PostContextMenu.jsx"
Cohesion: 0.23
Nodes (10): AvatarCropModal(), getCropCircle(), getImagePlacement(), PostContextMenu(), resolvePanLimits(), usePinchZoom(), backdropOpacityForDrag(), clamp() (+2 more)

### Community 15 - "OnboardingTutorial.jsx"
Cohesion: 0.08
Nodes (34): AppInner(), AppMain(), BlockedAppShell(), getInitialFavoriteProductIds(), TAB_TITLES, ADMIN_NAV_ITEM, GALLERY_NAV_ITEM, NAV_ITEMS (+26 more)

## Knowledge Gaps
- **67 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `error` to `ProfileViewModal.jsx`, `useAlertDialog`, `CompetitionsPage.jsx`, `trainings.js`, `catalog.js`, `App.jsx`, `format.js`, `PostDetailModal.jsx`, `OnboardingTutorial.jsx`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Why does `react` connect `PostDetailModal.jsx` to `dependencies`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ProfileViewModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0654490106544901 - nodes in this community are weakly interconnected._
- **Should `useAlertDialog` be split into smaller, more focused modules?**
  _Cohesion score 0.08903908316191596 - nodes in this community are weakly interconnected._
- **Should `Modal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10105580693815988 - nodes in this community are weakly interconnected._
- **Should `CompetitionsPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08020050125313283 - nodes in this community are weakly interconnected._