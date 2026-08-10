# Graph Report - client  (2026-08-07)

## Corpus Check
- 171 files · ~162,807 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 823 nodes · 2962 edges · 25 communities (24 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `84484566`
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
- achievements.js
- OnboardingTutorial.jsx
- formatPostDate
- AlertDialog.jsx
- posts.js
- GalleryCommentModal.jsx
- Avatar.jsx
- BOTTOM_NAV_ITEMS

## God Nodes (most connected - your core abstractions)
1. `error` - 123 edges
2. `Modal()` - 37 edges
3. `ProfileViewModal()` - 36 edges
4. `useAlertDialog()` - 35 edges
5. `isModerator()` - 33 edges
6. `pb` - 30 edges
7. `TrainingsPage()` - 25 edges
8. `formatPostDate()` - 24 edges
9. `getMediaUrl()` - 22 edges
10. `ProfilePage()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `LongPressRing()` --references--> `react`  [EXTRACTED]
  src/lib/longPress.js → package.json
- `requestCommentReplyNotification()` --calls--> `error`  [EXTRACTED]
  src/services/notifications.js → src/lib/log.js
- `AppMain()` --calls--> `useFavorites()`  [EXTRACTED]
  src/App.jsx → src/context/FavoritesContext.jsx
- `AppMain()` --calls--> `useSessionResetKey()`  [EXTRACTED]
  src/App.jsx → src/hooks/useSessionResetKey.js
- `AppMain()` --calls--> `error`  [EXTRACTED]
  src/App.jsx → src/lib/log.js

## Import Cycles
- None detected.

## Communities (25 total, 1 thin omitted)

### Community 0 - "ProfileViewModal.jsx"
Cohesion: 0.07
Nodes (64): AchievementsBlock(), IconButton, MembershipIcon(), useToast(), AboutAppModal(), openExternalUrl(), formatFreezeLogEntry(), formatMembershipDate() (+56 more)

### Community 1 - "useAlertDialog"
Cohesion: 0.10
Nodes (48): useAlertDialog(), useFavorites(), CreateTournamentPostModal(), EditTournamentPostModal(), CreatePostModal(), EditPostModal(), FullscreenImageViewer(), getOriginRect() (+40 more)

### Community 2 - "Modal.jsx"
Cohesion: 0.08
Nodes (44): EmptyState(), InfoTooltip(), FOCUSABLE_SELECTORS, Modal(), Spinner(), Toggle(), NotificationSettingsModal(), SETTINGS_ROWS (+36 more)

### Community 3 - "CompetitionsPage.jsx"
Cohesion: 0.08
Nodes (47): usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), ScrollToTopButton(), CompetitionsPage(), TABS, FeedPage() (+39 more)

### Community 4 - "trainings.js"
Cohesion: 0.09
Nodes (56): AppMain(), buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue() (+48 more)

### Community 5 - "catalog.js"
Cohesion: 0.07
Nodes (45): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+37 more)

### Community 6 - "dependencies"
Cohesion: 0.04
Nodes (44): clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, dependencies, clsx, date-fns (+36 more)

### Community 7 - "datePickerUtils.js"
Cohesion: 0.11
Nodes (32): AppHeader(), computeAnnualEndDate(), getCurrentSessions(), getModeCopy(), MembershipEditModal(), normalizeDateInput(), MembershipPeriodRangeField(), MembershipStartDateField() (+24 more)

### Community 8 - "LogsModal.jsx"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

### Community 9 - "App.jsx"
Cohesion: 0.14
Nodes (25): AppInner(), getInitialFavoriteProductIds(), TAB_TITLES, CloseAppConfirmSheet(), AdminPanelPage(), BlockedPage(), getInitialUser(), useMaxAuth() (+17 more)

### Community 10 - "postRichText.js"
Cohesion: 0.15
Nodes (26): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame(), applyFormatCommand() (+18 more)

### Community 11 - "format.js"
Cohesion: 0.14
Nodes (24): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, NotificationCard(), parseCommentReplyParentText(), NotificationsDropdown(), CalendarStrip() (+16 more)

### Community 12 - "error"
Cohesion: 0.21
Nodes (24): buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal(), getAudienceLabel(), NotificationSendModal() (+16 more)

### Community 13 - "PostDetailModal.jsx"
Cohesion: 0.18
Nodes (19): TournamentCommentsSection(), CommentReplyButton(), CommentReplyComposeBar(), CommentReplyQuote(), CommentSendButton(), CommentSwipeReply(), findScrollParent(), keepCommentEditInView() (+11 more)

### Community 14 - "achievements.js"
Cohesion: 0.15
Nodes (23): AchievementRow(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent(), computeGridLayout() (+15 more)

### Community 15 - "OnboardingTutorial.jsx"
Cohesion: 0.16
Nodes (20): AvatarCropModal(), getCropCircle(), getImagePlacement(), CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput() (+12 more)

### Community 16 - "formatPostDate"
Cohesion: 0.25
Nodes (15): getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments(), TournamentPostCard(), TournamentPostDetailModal(), PostCard() (+7 more)

### Community 17 - "AlertDialog.jsx"
Cohesion: 0.17
Nodes (10): App(), PostUploadContext, PostUploadProvider(), AlertDialogContext, AlertDialogProvider(), INITIAL_STATE, Toast(), ToastContext (+2 more)

### Community 18 - "posts.js"
Cohesion: 0.23
Nodes (10): PostCardLike(), useCommentLikes(), useComments(), usePostLikes(), createPost(), listCommentLikes(), listCommentsForPost(), listPostLikes() (+2 more)

### Community 19 - "GalleryCommentModal.jsx"
Cohesion: 0.24
Nodes (9): PostContentHtml(), lockAnimFrameWidth(), startAnimFrames(), GalleryCommentModal(), useGalleryComments(), createGalleryComment(), deleteGalleryComment(), listGalleryComments() (+1 more)

### Community 20 - "Avatar.jsx"
Cohesion: 0.20
Nodes (5): ADMIN_NAV_ITEM, GALLERY_NAV_ITEM, NAV_ITEMS, Avatar(), getUserAvatarData()

## Knowledge Gaps
- **66 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+61 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `error` to `ProfileViewModal.jsx`, `useAlertDialog`, `Modal.jsx`, `CompetitionsPage.jsx`, `trainings.js`, `catalog.js`, `datePickerUtils.js`, `App.jsx`, `format.js`, `PostDetailModal.jsx`, `achievements.js`, `OnboardingTutorial.jsx`, `AlertDialog.jsx`, `posts.js`, `GalleryCommentModal.jsx`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Why does `LongPressRing()` connect `formatPostDate` to `dependencies`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `react` connect `dependencies` to `formatPostDate`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _66 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ProfileViewModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07030205827318899 - nodes in this community are weakly interconnected._
- **Should `useAlertDialog` be split into smaller, more focused modules?**
  _Cohesion score 0.10328638497652583 - nodes in this community are weakly interconnected._
- **Should `Modal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0781387181738367 - nodes in this community are weakly interconnected._