# Graph Report - client  (2026-08-27)

## Corpus Check
- 219 files · ~204,780 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1106 nodes · 3924 edges · 22 communities (20 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5eb59217`
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
- FullscreenImageViewer.jsx
- gestures.js
- BroadcastModal.jsx
- FullscreenImageViewer.jsx
- PostRichTextField.jsx
- ArchiveModal.jsx
- main.jsx
- GalleryPage.jsx
- useSectionSwipe.js
- vite.config.js

## God Nodes (most connected - your core abstractions)
1. `error` - 131 edges
2. `useAlertDialog()` - 45 edges
3. `Modal()` - 45 edges
4. `ProfileViewModal()` - 38 edges
5. `pb` - 35 edges
6. `isModerator()` - 33 edges
7. `hasVisibleText()` - 27 edges
8. `TrainingsPage()` - 27 edges
9. `getMediaUrl()` - 26 edges
10. `CompetitionsPage()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `CommentEditInlineForm()` --references--> `react`  [EXTRACTED]
  src/features/feed/CommentEditInlineForm.jsx → package.json
- `LongPressRing()` --references--> `react`  [EXTRACTED]
  src/lib/longPress.js → package.json
- `TemplateListButton()` --calls--> `useLongPress()`  [EXTRACTED]
  src/features/admin/SystemTemplatesModal.jsx → src/lib/longPress.js
- `EmojiPicker()` --indirect_call--> `onPointerDown()`  [INFERRED]
  src/features/feed/emoji/EmojiPicker.jsx → src/lib/modalOrigin.js
- `requestCommentReplyNotification()` --calls--> `error`  [EXTRACTED]
  src/services/notifications.js → src/lib/log.js

## Import Cycles
- None detected.

## Communities (22 total, 2 thin omitted)

### Community 0 - "Modal.jsx"
Cohesion: 0.07
Nodes (70): react, react, AlertDialogContext, INITIAL_STATE, useAlertDialog(), useToast(), CreateTournamentPostModal(), EditTournamentPostModal() (+62 more)

### Community 1 - "App.jsx"
Cohesion: 0.07
Nodes (80): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm() (+72 more)

### Community 2 - "PostDetailModal.jsx"
Cohesion: 0.05
Nodes (62): Avatar(), ModalFloatingCloseButton(), MentionNavContext, MentionNavProvider(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER (+54 more)

### Community 3 - "error"
Cohesion: 0.24
Nodes (20): buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal(), getAudienceLabel(), NotificationSendModal() (+12 more)

### Community 4 - "ProfilePage.jsx"
Cohesion: 0.08
Nodes (42): applyMentionMissingStatuses(), isPostMissing(), postInflight, postMissingCache, resolvePostMissing(), resolveUserMissing(), userInflight, userMissingCache (+34 more)

### Community 5 - "StatsReachModal.jsx"
Cohesion: 0.06
Nodes (56): CloseAppConfirmSheet(), InfoTooltip(), FOCUSABLE_SELECTORS, Modal(), Spinner(), Toggle(), AdminPanelPage(), NotificationSettingsModal() (+48 more)

### Community 6 - "ProfileViewModal.jsx"
Cohesion: 0.07
Nodes (57): MembershipIcon(), getCollapsedLabel(), isUserChecked(), UserMultiSelect(), CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS (+49 more)

### Community 7 - "datePickerUtils.js"
Cohesion: 0.14
Nodes (26): AppHeader(), MembershipPeriodRangeField(), MembershipStartDateField(), ProfileSingleDateField(), DatePickerModal(), DateRangeModal(), formatRangeHint(), getDefaultDateRange() (+18 more)

### Community 8 - "dependencies"
Cohesion: 0.05
Nodes (42): clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, dependencies, clsx, date-fns (+34 more)

### Community 9 - "LogsModal.jsx"
Cohesion: 0.10
Nodes (35): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), htmlToReadableText(), looksLikeRichHtml() (+27 more)

### Community 10 - "FullscreenImageViewer.jsx"
Cohesion: 0.07
Nodes (52): carouselSlideKey(), FullscreenSlideImage(), getOriginRect(), getWindowWidth(), isImagePaintReady(), itemSlideId(), useYadiskLoadProgress(), PinnedBanner() (+44 more)

### Community 11 - "gestures.js"
Cohesion: 0.10
Nodes (24): App(), AvatarCropModal(), getCropCircle(), getImagePlacement(), PostUploadContext, PostUploadProvider(), AlertDialogProvider(), Toast() (+16 more)

### Community 13 - "FullscreenImageViewer.jsx"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 14 - "PostRichTextField.jsx"
Cohesion: 0.08
Nodes (52): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), buildPostMentionEl(), buildUserMentionEl(), deleteAdjacentMention() (+44 more)

### Community 16 - "ArchiveModal.jsx"
Cohesion: 0.06
Nodes (66): usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), EmptyState(), PullToRefresh(), ScrollToTopButton(), FeedListSkeleton() (+58 more)

### Community 19 - "main.jsx"
Cohesion: 0.07
Nodes (42): IconButton, MAX_AUTH_URL, MAX_SELLER_URL, PB_URL, FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount() (+34 more)

### Community 20 - "GalleryPage.jsx"
Cohesion: 0.07
Nodes (43): ForceUpdateOverlay(), createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext (+35 more)

### Community 21 - "useSectionSwipe.js"
Cohesion: 0.07
Nodes (34): BlockedAppShell(), ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, AddActionContext, AddActionProvider(), DEFAULT_API (+26 more)

## Knowledge Gaps
- **93 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `App.jsx` to `Modal.jsx`, `PostDetailModal.jsx`, `error`, `ProfilePage.jsx`, `StatsReachModal.jsx`, `ProfileViewModal.jsx`, `FullscreenImageViewer.jsx`, `gestures.js`, `FullscreenImageViewer.jsx`, `ArchiveModal.jsx`, `main.jsx`, `GalleryPage.jsx`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `react` connect `Modal.jsx` to `dependencies`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `Modal.jsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Modal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06563706563706563 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06872370266479663 - nodes in this community are weakly interconnected._
- **Should `PostDetailModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05412371134020619 - nodes in this community are weakly interconnected._