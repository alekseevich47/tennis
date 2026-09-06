# Graph Report - client  (2026-08-27)

## Corpus Check
- 219 files · ~204,616 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1105 nodes · 3923 edges · 30 communities (28 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0f1c1a04`
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
- ShopPage.jsx
- ArchiveModal.jsx
- App.jsx
- useMaxAuth.js
- main.jsx
- GalleryPage.jsx
- useSectionSwipe.js
- useMaxCloseGuard.js
- AddActionContext.jsx
- vite.config.js
- useSectionSwipe.js
- overlayStack.js
- ProductUploadProvider.jsx

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
- `ScheduledPostActionsMenu()` --calls--> `useOverlayClose()`  [EXTRACTED]
  src/features/feed/ScheduledPostsModal.jsx → src/hooks/useOverlayClose.js
- `EmojiPicker()` --indirect_call--> `onPointerDown()`  [INFERRED]
  src/features/feed/emoji/EmojiPicker.jsx → src/lib/modalOrigin.js

## Import Cycles
- None detected.

## Communities (30 total, 2 thin omitted)

### Community 0 - "Modal.jsx"
Cohesion: 0.06
Nodes (80): react, react, AlertDialogContext, INITIAL_STATE, useAlertDialog(), useFavorites(), CreateTournamentPostModal(), EditTournamentPostModal() (+72 more)

### Community 1 - "App.jsx"
Cohesion: 0.06
Nodes (69): IconButton, PAD, ScheduleDateTimeSheet(), CalendarStrip(), ArchiveModal(), formatDateRangeLabel(), buildTrainingPatch(), EditTrainingModal() (+61 more)

### Community 2 - "PostDetailModal.jsx"
Cohesion: 0.06
Nodes (56): Avatar(), ModalFloatingCloseButton(), MentionNavContext, MentionNavProvider(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER (+48 more)

### Community 3 - "error"
Cohesion: 0.16
Nodes (27): InfoTooltip(), Toggle(), buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal() (+19 more)

### Community 4 - "ProfilePage.jsx"
Cohesion: 0.12
Nodes (28): applyMentionMissingStatuses(), isPostMissing(), postInflight, postMissingCache, resolvePostMissing(), resolveUserMissing(), userInflight, userMissingCache (+20 more)

### Community 5 - "StatsReachModal.jsx"
Cohesion: 0.07
Nodes (49): CloseAppConfirmSheet(), EmptyState(), FOCUSABLE_SELECTORS, Modal(), Spinner(), AdminPanelPage(), METRICS, StatisticsHubModal() (+41 more)

### Community 6 - "ProfileViewModal.jsx"
Cohesion: 0.07
Nodes (52): MAX_AUTH_URL, getCollapsedLabel(), isUserChecked(), UserMultiSelect(), CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS (+44 more)

### Community 7 - "datePickerUtils.js"
Cohesion: 0.12
Nodes (29): AppHeader(), MembershipIcon(), MembershipPeriodRangeField(), MembershipStartDateField(), ProfileSingleDateField(), FavoriteIcon(), DatePickerModal(), DateRangeModal() (+21 more)

### Community 8 - "dependencies"
Cohesion: 0.05
Nodes (42): clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, dependencies, clsx, date-fns (+34 more)

### Community 9 - "LogsModal.jsx"
Cohesion: 0.10
Nodes (36): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), htmlToReadableText(), looksLikeRichHtml() (+28 more)

### Community 10 - "FullscreenImageViewer.jsx"
Cohesion: 0.09
Nodes (46): FullscreenSlideImage(), isImagePaintReady(), useYadiskLoadProgress(), PinnedBanner(), usePinnedThumbUrl(), useFetchedOriginal(), publishAlbums(), useResolvedExternalMedia() (+38 more)

### Community 11 - "gestures.js"
Cohesion: 0.36
Nodes (9): AvatarCropModal(), getCropCircle(), getImagePlacement(), resolvePanLimits(), usePinchZoom(), backdropOpacityForDrag(), clamp(), getTouchDistance() (+1 more)

### Community 13 - "FullscreenImageViewer.jsx"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 14 - "PostRichTextField.jsx"
Cohesion: 0.08
Nodes (53): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), buildPostMentionEl(), buildUserMentionEl(), deleteAdjacentMention() (+45 more)

### Community 15 - "ShopPage.jsx"
Cohesion: 0.22
Nodes (11): ForceUpdateOverlay(), useProductUpload(), CategoryDropdown(), SearchBar(), ShopPage(), useOverlayClose(), useProducts(), incrementProductViews() (+3 more)

### Community 16 - "ArchiveModal.jsx"
Cohesion: 0.05
Nodes (68): App(), PostUploadContext, PostUploadProvider(), usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), AlertDialogProvider() (+60 more)

### Community 17 - "App.jsx"
Cohesion: 0.26
Nodes (12): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, useSessionResetKey(), isUserBotBlocked(), deleteProduct(), hardDeleteComment() (+4 more)

### Community 18 - "useMaxAuth.js"
Cohesion: 0.34
Nodes (13): getInitialUser(), useMaxAuth(), clearBanInfo(), finalizeBannedUser(), getCurrentUser(), initMaxAuth(), isUserBanned(), loadBanInfo() (+5 more)

### Community 19 - "main.jsx"
Cohesion: 0.07
Nodes (48): Toast(), ToastContext, useToast(), MAX_SELLER_URL, PB_URL, AboutAppModal(), openExternalUrl(), BlockedPage() (+40 more)

### Community 20 - "GalleryPage.jsx"
Cohesion: 0.09
Nodes (36): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), FavoritesContext, FavoritesProvider(), loadFavoriteProducts() (+28 more)

### Community 21 - "useSectionSwipe.js"
Cohesion: 0.29
Nodes (7): DEFAULT_FREQUENT_EMOJIS, EMOJI_CATEGORIES, CATEGORY_ICONS, EmojiPicker(), prefersReducedMotion(), pushRecentEmoji(), readRecentEmojis()

### Community 23 - "useMaxCloseGuard.js"
Cohesion: 0.36
Nodes (7): BlockedAppShell(), disableMaxVerticalSwipes(), isEditableFocus(), useMaxCloseGuard(), closeTopOverlay(), isSectionScrollAtTop(), scrollSectionToTop()

### Community 24 - "AddActionContext.jsx"
Cohesion: 0.27
Nodes (8): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, AddActionContext, AddActionProvider(), DEFAULT_API, useTriggerAddAction()

### Community 27 - "useSectionSwipe.js"
Cohesion: 0.36
Nodes (8): getSwipeableTabs(), getWindowWidth(), IGNORE_SELECTOR, isTextFieldFocused(), shouldIgnoreTarget(), SWIPE_ALLOW_OVERLAY_SUFFIXES, useSectionSwipe(), hasBlockingOverlay()

### Community 28 - "overlayStack.js"
Cohesion: 0.43
Nodes (4): MentionSuggestPopup(), prefersReducedMotion(), registerOverlay(), stack

### Community 29 - "ProductUploadProvider.jsx"
Cohesion: 0.53
Nodes (5): isProductsKey(), ProductUploadContext, ProductUploadProvider(), createProductWithProgress(), updateProduct()

## Knowledge Gaps
- **93 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `error` to `Modal.jsx`, `App.jsx`, `PostDetailModal.jsx`, `ProfilePage.jsx`, `StatsReachModal.jsx`, `ProfileViewModal.jsx`, `FullscreenImageViewer.jsx`, `FullscreenImageViewer.jsx`, `ShopPage.jsx`, `ArchiveModal.jsx`, `App.jsx`, `useMaxAuth.js`, `main.jsx`, `GalleryPage.jsx`, `ProductUploadProvider.jsx`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `react` connect `Modal.jsx` to `dependencies`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `Modal.jsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Modal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05647145669291338 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06310958118187034 - nodes in this community are weakly interconnected._
- **Should `PostDetailModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0560875512995896 - nodes in this community are weakly interconnected._