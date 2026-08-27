# Graph Report - client  (2026-08-27)

## Corpus Check
- 219 files · ~203,294 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1101 nodes · 3915 edges · 32 communities (30 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cad880ff`
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
- gestures.js
- BroadcastModal.jsx
- FullscreenImageViewer.jsx
- PostRichTextField.jsx
- GalleryPage.jsx
- ArchiveModal.jsx
- main.jsx
- main.jsx
- GalleryPage.jsx
- useSectionSwipe.js
- useMaxAuth.js
- error
- vite.config.js
- tournamentPosts.js
- App.jsx
- EditTrainingModal.jsx
- useMaxCloseGuard.js
- AddActionContext.jsx
- main.jsx
- GalleryUploadProvider.jsx

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
- `EmojiPicker()` --indirect_call--> `onPointerDown()`  [INFERRED]
  src/features/feed/emoji/EmojiPicker.jsx → src/lib/modalOrigin.js
- `requestCommentReplyNotification()` --calls--> `error`  [EXTRACTED]
  src/services/notifications.js → src/lib/log.js
- `AppInner()` --calls--> `useMaxAuth()`  [EXTRACTED]
  src/App.jsx → src/hooks/useMaxAuth.js

## Import Cycles
- None detected.

## Communities (32 total, 2 thin omitted)

### Community 0 - "Modal.jsx"
Cohesion: 0.06
Nodes (65): react, react, ForceUpdateOverlay(), AlertDialogContext, INITIAL_STATE, useAlertDialog(), SystemTemplatesModal(), TemplateListButton() (+57 more)

### Community 1 - "App.jsx"
Cohesion: 0.15
Nodes (33): TrainingsPage(), useTrainings(), canCancelBooking(), getCurrentUser(), isModerator(), addPendingDeleteTrainingId(), assertMembershipSessionAvailable(), assertNotBotBlocked() (+25 more)

### Community 2 - "PostDetailModal.jsx"
Cohesion: 0.06
Nodes (63): ModalFloatingCloseButton(), MentionNavContext, MentionNavProvider(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium() (+55 more)

### Community 3 - "error"
Cohesion: 0.24
Nodes (20): buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal(), getAudienceLabel(), NotificationSendModal() (+12 more)

### Community 4 - "ProfilePage.jsx"
Cohesion: 0.08
Nodes (42): applyMentionMissingStatuses(), isPostMissing(), postInflight, postMissingCache, resolvePostMissing(), resolveUserMissing(), userInflight, userMissingCache (+34 more)

### Community 5 - "StatsReachModal.jsx"
Cohesion: 0.07
Nodes (50): InfoTooltip(), FOCUSABLE_SELECTORS, Modal(), Toggle(), AdminPanelPage(), NotificationSettingsModal(), SETTINGS_ROWS, METRICS (+42 more)

### Community 6 - "ProfileViewModal.jsx"
Cohesion: 0.07
Nodes (60): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), EmptyState() (+52 more)

### Community 7 - "datePickerUtils.js"
Cohesion: 0.14
Nodes (26): AppHeader(), MembershipPeriodRangeField(), MembershipStartDateField(), ProfileSingleDateField(), DatePickerModal(), DateRangeModal(), formatRangeHint(), getDefaultDateRange() (+18 more)

### Community 8 - "dependencies"
Cohesion: 0.05
Nodes (42): clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, dependencies, clsx, date-fns (+34 more)

### Community 9 - "LogsModal.jsx"
Cohesion: 0.10
Nodes (35): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), htmlToReadableText(), looksLikeRichHtml() (+27 more)

### Community 11 - "gestures.js"
Cohesion: 0.13
Nodes (21): AvatarCropModal(), getCropCircle(), getImagePlacement(), CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput() (+13 more)

### Community 13 - "FullscreenImageViewer.jsx"
Cohesion: 0.07
Nodes (47): clampPercent(), computeGridLayout(), FloatingAchievements(), hashUnit(), FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount() (+39 more)

### Community 14 - "PostRichTextField.jsx"
Cohesion: 0.06
Nodes (63): Avatar(), EMOJI_CATEGORIES, EmojiPicker(), prefersReducedMotion(), pushRecentEmoji(), readRecentEmojis(), FrameColorPicker(), hexToHsv() (+55 more)

### Community 15 - "GalleryPage.jsx"
Cohesion: 0.21
Nodes (15): GalleryMediaOverlay(), createGalleryUploadItem(), GalleryItemLike(), GalleryPage(), getAspectClass(), getImageAspectRatio(), getVideoAspectRatio(), useGallery() (+7 more)

### Community 16 - "ArchiveModal.jsx"
Cohesion: 0.06
Nodes (78): PostUploadContext, PostUploadProvider(), usePostUpload(), useTournamentPostUpload(), PullToRefresh(), ScrollToTopButton(), FeedListSkeleton(), useRegisterAddAction() (+70 more)

### Community 18 - "main.jsx"
Cohesion: 0.33
Nodes (7): AboutAppModal(), openExternalUrl(), useAppVersionCheck(), APP_BUILD, APP_DISPLAY_VERSION, fetchRemoteAppVersion(), getVersionManifestUrl()

### Community 19 - "main.jsx"
Cohesion: 0.07
Nodes (43): Toast(), ToastContext, ToastProvider(), useToast(), MAX_AUTH_URL, MAX_SELLER_URL, PB_URL, useFetchedOriginal() (+35 more)

### Community 20 - "GalleryPage.jsx"
Cohesion: 0.13
Nodes (23): isProductsKey(), ProductUploadContext, ProductUploadProvider(), useProductUpload(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton(), SearchBar() (+15 more)

### Community 21 - "useSectionSwipe.js"
Cohesion: 0.26
Nodes (9): getSwipeableTabs(), getWindowWidth(), IGNORE_SELECTOR, isTextFieldFocused(), shouldIgnoreTarget(), SWIPE_ALLOW_OVERLAY_SUFFIXES, useSectionSwipe(), hasBlockingOverlay() (+1 more)

### Community 23 - "useMaxAuth.js"
Cohesion: 0.30
Nodes (14): getInitialUser(), useMaxAuth(), buildBannedUser(), clearBanInfo(), finalizeBannedUser(), initMaxAuth(), isUserBanned(), loadBanInfo() (+6 more)

### Community 24 - "error"
Cohesion: 0.27
Nodes (11): isUserBookingDisabled(), UserPickerModal(), CreateTrainingModal(), INITIAL_FORM, TrainingDetailModal(), formatCardDate(), error, createTraining() (+3 more)

### Community 27 - "tournamentPosts.js"
Cohesion: 0.27
Nodes (13): applyTournamentPostSideEffects(), buildTournamentPostPayload(), deleteScheduledTournamentPost(), invalidateTournamentCaches(), pinTournamentPost(), publishScheduledTournamentPostNow(), publishTournamentPost(), publishTournamentPostWithProgress() (+5 more)

### Community 29 - "App.jsx"
Cohesion: 0.27
Nodes (9): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, CloseAppConfirmSheet(), useSessionResetKey(), deleteProduct(), hardDeletePost() (+1 more)

### Community 30 - "EditTrainingModal.jsx"
Cohesion: 0.29
Nodes (10): buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue(), areTrainingValuesEqual() (+2 more)

### Community 31 - "useMaxCloseGuard.js"
Cohesion: 0.36
Nodes (7): BlockedAppShell(), disableMaxVerticalSwipes(), isEditableFocus(), useMaxCloseGuard(), closeTopOverlay(), isSectionScrollAtTop(), scrollSectionToTop()

### Community 32 - "AddActionContext.jsx"
Cohesion: 0.27
Nodes (8): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, AddActionContext, AddActionProvider(), DEFAULT_API, useTriggerAddAction()

### Community 34 - "main.jsx"
Cohesion: 0.33
Nodes (4): App(), TournamentPostUploadContext, TournamentPostUploadProvider(), AlertDialogProvider()

### Community 35 - "GalleryUploadProvider.jsx"
Cohesion: 0.43
Nodes (6): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), createGalleryItemWithProgress()

## Knowledge Gaps
- **92 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+87 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `error` to `Modal.jsx`, `App.jsx`, `PostDetailModal.jsx`, `error`, `ProfilePage.jsx`, `StatsReachModal.jsx`, `ProfileViewModal.jsx`, `gestures.js`, `FullscreenImageViewer.jsx`, `GalleryPage.jsx`, `ArchiveModal.jsx`, `main.jsx`, `GalleryPage.jsx`, `useMaxAuth.js`, `tournamentPosts.js`, `App.jsx`, `EditTrainingModal.jsx`, `main.jsx`, `GalleryUploadProvider.jsx`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `react` connect `Modal.jsx` to `dependencies`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `Modal.jsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Modal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06309454474859251 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14714714714714713 - nodes in this community are weakly interconnected._
- **Should `PostDetailModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05701754385964912 - nodes in this community are weakly interconnected._