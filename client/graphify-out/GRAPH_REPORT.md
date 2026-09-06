# Graph Report - client  (2026-09-06)

## Corpus Check
- 248 files · ~220,520 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1420 nodes · 4635 edges · 68 communities (64 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc5fa8ae`
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
- sw.js
- useMaxCloseGuard.js
- AddActionContext.jsx
- vite.config.js
- useSectionSwipe.js
- overlayStack.js
- ProductUploadProvider.jsx
- posts.js
- Modal.jsx
- ProfileViewModal.jsx
- media.js
- ProductDetail.jsx
- format.js
- getSocketFromFD
- ProductForm.jsx
- intArrayFromString
- abort
- getWasmTableEntry
- PostRichTextField.jsx
- log.js
- ExceptionInfo
- PostContentHtml.jsx
- MediaPreviewGrid.jsx
- yadiskMediaSessionCache.js
- OnboardingTutorial.jsx
- _strftime
- useLongPress
- AppHeader.jsx
- EditTrainingModal.jsx
- tournamentComments.js
- SortableMediaPreviewGrid.jsx
- mentionStatus.js
- normalizeHexColor
- ScheduledPostsModal.jsx
- MembershipOverviewModal.jsx
- callRuntimeCallbacks
- config.js
- FullscreenImageViewer.jsx
- compressImage
- asyncLoad
- useAppVersionCheck.js
- emscripten_realloc_buffer
- getEnvStrings
- FloatingAchievements.jsx

## God Nodes (most connected - your core abstractions)
1. `error` - 139 edges
2. `useAlertDialog()` - 49 edges
3. `Modal()` - 48 edges
4. `ProfileViewModal()` - 38 edges
5. `pb` - 35 edges
6. `isModerator()` - 33 edges
7. `hasVisibleText()` - 29 edges
8. `TrainingsPage()` - 26 edges
9. `useOverlayClose()` - 26 edges
10. `CompetitionsPage()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `ScheduleDateTimeSheet()` --indirect_call--> `base()`  [INFERRED]
  src/features/feed/ScheduleDateTimeSheet.jsx → public/ffmpeg/ffmpeg-core.js
- `CommentEditInlineForm()` --references--> `react`  [EXTRACTED]
  src/features/feed/CommentEditInlineForm.jsx → package.json
- `LongPressRing()` --references--> `react`  [EXTRACTED]
  src/lib/longPress.js → package.json
- `TemplateListButton()` --calls--> `useLongPress()`  [EXTRACTED]
  src/features/admin/SystemTemplatesModal.jsx → src/lib/longPress.js
- `ScheduledPostActionsMenu()` --calls--> `useOverlayClose()`  [EXTRACTED]
  src/features/feed/ScheduledPostsModal.jsx → src/hooks/useOverlayClose.js

## Import Cycles
- None detected.

## Communities (68 total, 4 thin omitted)

### Community 0 - "Modal.jsx"
Cohesion: 0.22
Nodes (22): react, react, useAlertDialog(), CreateTournamentPostModal(), EditTournamentPostModal(), AttachButtons(), CommentComposeForm(), areStringArraysEqual() (+14 more)

### Community 1 - "App.jsx"
Cohesion: 0.13
Nodes (40): IconButton, isUserBookingDisabled(), UserPickerModal(), TrainingCard(), TrainingDetailModal(), TrainingsPage(), canCancelBooking(), formatCardDate() (+32 more)

### Community 2 - "PostDetailModal.jsx"
Cohesion: 0.11
Nodes (30): TournamentCommentsSection(), CommentListItem(), groupCommentsByDay(), isKnownEmptyExpandedComments(), CommentListSkeleton(), CommentReplyButton(), CommentReplyComposeBar(), CommentReplyQuote() (+22 more)

### Community 3 - "error"
Cohesion: 0.07
Nodes (49): App(), createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), getVideoAspectRatio(), isGalleryKey(), prepareGalleryUploadItem(), PostUploadContext (+41 more)

### Community 4 - "ProfilePage.jsx"
Cohesion: 0.29
Nodes (11): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, getNotificationKind(), isMetaObject(), NotificationCard(), parseCommentReplyParentText() (+3 more)

### Community 5 - "StatsReachModal.jsx"
Cohesion: 0.07
Nodes (45): Avatar(), EmptyState(), ModalFloatingCloseButton(), Spinner(), MODES, StatsAchievementsModal(), hasAnyActivity(), SLICES (+37 more)

### Community 6 - "ProfileViewModal.jsx"
Cohesion: 0.13
Nodes (26): AvatarCropModal(), getCropCircle(), getImagePlacement(), useRegisterAddAction(), getCollapsedLabel(), isUserChecked(), UserMultiSelect(), formatDate() (+18 more)

### Community 7 - "datePickerUtils.js"
Cohesion: 0.14
Nodes (26): AppHeader(), MembershipPeriodRangeField(), MembershipStartDateField(), ProfileSingleDateField(), DatePickerModal(), DateRangeModal(), formatRangeHint(), getDefaultDateRange() (+18 more)

### Community 8 - "dependencies"
Cohesion: 0.04
Nodes (44): clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, dependencies, clsx, date-fns (+36 more)

### Community 9 - "LogsModal.jsx"
Cohesion: 0.11
Nodes (31): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+23 more)

### Community 10 - "FullscreenImageViewer.jsx"
Cohesion: 0.19
Nodes (25): publishAlbums(), useResolvedExternalMedia(), useYadiskEmbed(), setYadiskAlbumCache(), createAlbumWindowController(), createPriorityQueue(), fetchAlbumMemberBytes(), focusListeners (+17 more)

### Community 11 - "gestures.js"
Cohesion: 0.38
Nodes (7): useGalleryNavigation(), resolvePanLimits(), usePinchZoom(), backdropOpacityForDrag(), clamp(), getTouchDistance(), maxPanLimits()

### Community 13 - "FullscreenImageViewer.jsx"
Cohesion: 0.05
Nodes (53): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), SystemTemplatesModal() (+45 more)

### Community 14 - "PostRichTextField.jsx"
Cohesion: 0.19
Nodes (19): buildUserMentionEl(), deleteAdjacentMention(), ensureMentionCarets(), ensureMentionEditorChrome(), ensureMentionRemoveButton(), escapeHtml(), findAdjacentMention(), findMentionInSelectionRange() (+11 more)

### Community 15 - "ShopPage.jsx"
Cohesion: 0.21
Nodes (4): ForceUpdateOverlay(), CommentContextMenu(), PostContextMenu(), useOverlayClose()

### Community 16 - "ArchiveModal.jsx"
Cohesion: 0.05
Nodes (71): prefetchLazyTabPages(), usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), PullToRefresh(), ScrollToTopButton(), FeedListSkeleton() (+63 more)

### Community 17 - "App.jsx"
Cohesion: 0.17
Nodes (15): AppInner(), AppMain(), getInitialFavoriteProductIds(), LazyAdminPanelPage, LazyCompetitionsPage, LazyGalleryPage, LazyOnboardingTutorial, LazyProfilePage (+7 more)

### Community 18 - "useMaxAuth.js"
Cohesion: 0.23
Nodes (19): CreateTrainingModal(), INITIAL_FORM, getInitialUser(), useMaxAuth(), error, buildBannedUser(), clearBanInfo(), finalizeBannedUser() (+11 more)

### Community 19 - "main.jsx"
Cohesion: 0.21
Nodes (16): Toast(), ToastContext, useToast(), formatFreezeLogEntry(), formatMembershipDate(), getMembershipTypeLabel(), MembershipModal(), parseFreezeLog() (+8 more)

### Community 20 - "GalleryPage.jsx"
Cohesion: 0.06
Nodes (57): useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider(), useProductUpload(), GalleryMediaOverlay(), createGalleryUploadItem(), GalleryItemLike() (+49 more)

### Community 21 - "useSectionSwipe.js"
Cohesion: 0.22
Nodes (10): DEFAULT_FREQUENT_EMOJIS, EMOJI_CATEGORIES, CATEGORY_ICONS, EmojiPicker(), prefersReducedMotion(), pushRecentEmoji(), readRecentEmojis(), MentionSuggestPopup() (+2 more)

### Community 23 - "useMaxCloseGuard.js"
Cohesion: 0.26
Nodes (8): BlockedAppShell(), disableMaxVerticalSwipes(), isEditableFocus(), useMaxCloseGuard(), closeTopOverlay(), stack, isSectionScrollAtTop(), scrollSectionToTop()

### Community 24 - "AddActionContext.jsx"
Cohesion: 0.27
Nodes (8): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, AddActionContext, AddActionProvider(), DEFAULT_API, useTriggerAddAction()

### Community 27 - "useSectionSwipe.js"
Cohesion: 0.36
Nodes (8): getSwipeableTabs(), getWindowWidth(), IGNORE_SELECTOR, isTextFieldFocused(), shouldIgnoreTarget(), SWIPE_ALLOW_OVERLAY_SUFFIXES, useSectionSwipe(), hasBlockingOverlay()

### Community 28 - "overlayStack.js"
Cohesion: 0.04
Nodes (19): bigintToI53Checked(), doCallback(), done(), doReadv(), doWritev(), _emscripten_asm_const_int(), exec(), exitJS() (+11 more)

### Community 29 - "ProductUploadProvider.jsx"
Cohesion: 0.16
Nodes (23): ALLOWED_ATTRS, ALLOWED_TAGS, AUTOLINK_RE, AUTOLINK_TLDS, DEFAULT_PRESETS, escapeHtml(), getEditorHtml(), getFirstLine() (+15 more)

### Community 30 - "posts.js"
Cohesion: 0.15
Nodes (19): useScheduledPosts(), prepareMediaInBody(), prepareUploadMedia(), prepareUploadMediaList(), createComment(), createCommentWithProgress(), createPost(), createPostWithProgress() (+11 more)

### Community 31 - "Modal.jsx"
Cohesion: 0.17
Nodes (16): AlertDialogContext, INITIAL_STATE, FOCUSABLE_SELECTORS, Modal(), METRICS, StatisticsHubModal(), AboutAppModal(), openExternalUrl() (+8 more)

### Community 32 - "ProfileViewModal.jsx"
Cohesion: 0.21
Nodes (17): MembershipIcon(), formatDate(), getTrainingTitle(), isModerator(), normalizeDateInput(), ProfileViewModal(), TRAINING_BADGE, banUser() (+9 more)

### Community 33 - "media.js"
Cohesion: 0.27
Nodes (14): buildEditMediaItems(), CommentMediaBody(), PinnedBanner(), usePinnedThumbUrl(), PostDetailVideoPreview(), PostMedia(), useInFeedViewport(), getYadiskAlbumCache() (+6 more)

### Community 34 - "ProductDetail.jsx"
Cohesion: 0.20
Nodes (12): CategoryDropdown(), ProductCard, normalizeProductCategoryIds(), ProductDetail(), carouselSlideKey(), ProductGallery(), slideId(), normalizeVariantMode() (+4 more)

### Community 35 - "format.js"
Cohesion: 0.19
Nodes (16): base(), PAD, ScheduleDateTimeSheet(), CalendarStrip(), DAYS_FULL, DAYS_SHORT, formatCommentTime(), formatDateTimeShort() (+8 more)

### Community 36 - "getSocketFromFD"
Cohesion: 0.14
Nodes (19): alignMemory(), _getaddrinfo(), getSocketAddress(), getSocketFromFD(), inetPton4(), inetPton6(), jstoi_q(), mmapAlloc() (+11 more)

### Community 37 - "ProductForm.jsx"
Cohesion: 0.25
Nodes (14): areStringArraysEqual(), areStringSetsEqual(), INITIAL, parseOptionalOldPrice(), parsePrice(), ProductForm(), areProductColorsEqual(), areProductParametersEqual() (+6 more)

### Community 38 - "intArrayFromString"
Cohesion: 0.15
Nodes (13): _getnameinfo(), inetNtop4(), inetNtop6(), intArrayFromString(), LazyUint8Array(), lengthBytesUTF8(), readSockaddr(), stringToNewUTF8() (+5 more)

### Community 39 - "abort"
Cohesion: 0.15
Nodes (15): abort(), createWasm(), _dlopen(), ___dlsym(), getBinary(), getBinaryPromise(), getValue(), initRandomFill() (+7 more)

### Community 40 - "getWasmTableEntry"
Cohesion: 0.13
Nodes (15): getWasmTableEntry(), invoke_i(), invoke_ii(), invoke_iii(), invoke_iiii(), invoke_iiiii(), invoke_iiiiii(), invoke_iiiiiiiii() (+7 more)

### Community 41 - "PostRichTextField.jsx"
Cohesion: 0.17
Nodes (11): PostFormatToolbar(), PostLinkModal(), buildPostMentionEl(), searchMentionPosts(), searchMentionUsers(), applyAnimFrame(), applyFormatCommand(), applyHyperlink() (+3 more)

### Community 42 - "log.js"
Cohesion: 0.28
Nodes (10): NotificationsDropdown(), useTrainings(), clearAllNotifications(), deleteNotification(), isDeletableNotification(), listNotifications(), requestCommentReplyNotification(), SESSIONS_LEFT_COPY (+2 more)

### Community 44 - "PostContentHtml.jsx"
Cohesion: 0.23
Nodes (10): MentionNavContext, MentionNavProvider(), useMentionNav(), commentHasAttachments(), CommentsPreview(), handleContentCopy(), plainTextFromRange(), PostContentHtml() (+2 more)

### Community 45 - "MediaPreviewGrid.jsx"
Cohesion: 0.20
Nodes (5): FeedVideoPreview(), MediaPreviewAlbumItem(), MediaPreviewGrid(), useSwipeGallery(), videoPreviewUrl()

### Community 46 - "yadiskMediaSessionCache.js"
Cohesion: 0.23
Nodes (12): useYadiskLoadProgress(), cache, getMemberLoadProgress(), listeners, loadProgress, memberCacheKey(), notify(), patchCachedMemberBytes() (+4 more)

### Community 47 - "OnboardingTutorial.jsx"
Cohesion: 0.27
Nodes (12): CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput(), OnboardingTutorial(), padHighlightRect(), scrollTargetIntoView() (+4 more)

### Community 48 - "_strftime"
Cohesion: 0.15
Nodes (13): addDays(), arraySum(), ___assert_fail(), __gmtime_js(), isLeapYear(), __localtime_js(), __mktime_js(), readI53FromI64() (+5 more)

### Community 49 - "useLongPress"
Cohesion: 0.27
Nodes (10): PostCard(), PostCardLike(), readComments(), usePostLikes(), getLongPressCardStyle(), isLongPressIgnoredTarget(), LONG_PRESS_IGNORE_SELECTOR, useLongPress() (+2 more)

### Community 50 - "AppHeader.jsx"
Cohesion: 0.32
Nodes (8): FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), useFavorites(), FavoriteIcon(), FavoritesDropdown(), adjustProductFavoritesCount()

### Community 51 - "EditTrainingModal.jsx"
Cohesion: 0.29
Nodes (10): buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue(), areTrainingValuesEqual() (+2 more)

### Community 52 - "tournamentComments.js"
Cohesion: 0.33
Nodes (8): PB_URL, useTournamentComments(), createTournamentComment(), createTournamentCommentWithProgress(), flushPendingTournamentCommentDeletes(), hardDeleteTournamentComment(), listCommentsForTournamentPost(), listRecentCommentsForTournamentPost()

### Community 53 - "SortableMediaPreviewGrid.jsx"
Cohesion: 0.36
Nodes (8): MediaProgressRing(), computeGridDropIndex(), computeStripDropIndex(), findStripScrollParent(), isTouchPointer(), moveKeyToIndex(), prefersReducedMotion(), SortableMediaPreviewGrid()

### Community 54 - "mentionStatus.js"
Cohesion: 0.27
Nodes (9): applyMentionMissingStatuses(), isPostMissing(), postInflight, postMissingCache, resolvePostMissing(), resolveUserMissing(), userInflight, userMissingCache (+1 more)

### Community 55 - "normalizeHexColor"
Cohesion: 0.53
Nodes (7): FrameColorPicker(), hexToHsv(), hsvToHex(), loadFramePresets(), normalizeHexColor(), saveFramePresets(), ProductVariantFields()

### Community 56 - "ScheduledPostsModal.jsx"
Cohesion: 0.25
Nodes (3): ScheduledPostActionsMenu(), ScheduledPostRow(), formatScheduleDispatchHeading()

### Community 57 - "MembershipOverviewModal.jsx"
Cohesion: 0.33
Nodes (7): getTrainingStatusForUser(), getUserPastTrainings(), formatDateRangeLabel(), MembershipOverviewModal(), trainingCountsAsUsedSession(), hasTimeRangeEnded(), finalizeCancelledTraining()

### Community 58 - "callRuntimeCallbacks"
Cohesion: 0.25
Nodes (8): addOnPostRun(), addOnPreRun(), callRuntimeCallbacks(), initRuntime(), postRun(), preRun(), run(), setTimeout()

### Community 59 - "config.js"
Cohesion: 0.32
Nodes (4): MAX_AUTH_URL, MAX_SELLER_URL, BlockedPage(), isUserBotBlocked()

### Community 60 - "FullscreenImageViewer.jsx"
Cohesion: 0.39
Nodes (6): FullscreenImageViewer(), FullscreenSlideImage(), getOriginRect(), getWindowWidth(), isImagePaintReady(), isTouchNavDevice()

### Community 61 - "compressImage"
Cohesion: 0.43
Nodes (4): AddImageModal(), compressImage(), hasTransparency(), withExtension()

### Community 62 - "asyncLoad"
Cohesion: 0.38
Nodes (7): addRunDependency(), assert(), asyncLoad(), FS_createPreloadedFile(), getUniqueRunDependency(), handleMessage(), removeRunDependency()

### Community 63 - "useAppVersionCheck.js"
Cohesion: 0.60
Nodes (4): useAppVersionCheck(), APP_BUILD, fetchRemoteAppVersion(), getVersionManifestUrl()

### Community 64 - "emscripten_realloc_buffer"
Cohesion: 0.40
Nodes (5): _emscripten_get_heap_max(), emscripten_realloc_buffer(), _emscripten_resize_heap(), getHeapMax(), updateMemoryViews()

### Community 65 - "getEnvStrings"
Cohesion: 0.40
Nodes (5): _environ_get(), _environ_sizes_get(), getEnvStrings(), getExecutableName(), stringToAscii()

### Community 66 - "FloatingAchievements.jsx"
Cohesion: 0.70
Nodes (4): clampPercent(), computeGridLayout(), FloatingAchievements(), hashUnit()

## Knowledge Gaps
- **104 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScheduleDateTimeSheet()` connect `format.js` to `Modal.jsx`, `ScheduledPostsModal.jsx`, `ShopPage.jsx`?**
  _High betweenness centrality (0.259) - this node is a cross-community bridge._
- **Why does `base()` connect `format.js` to `overlayStack.js`?**
  _High betweenness centrality (0.257) - this node is a cross-community bridge._
- **Why does `error` connect `useMaxAuth.js` to `Modal.jsx`, `App.jsx`, `PostDetailModal.jsx`, `error`, `ProfileViewModal.jsx`, `FullscreenImageViewer.jsx`, `FullscreenImageViewer.jsx`, `ArchiveModal.jsx`, `App.jsx`, `main.jsx`, `GalleryPage.jsx`, `posts.js`, `ProfileViewModal.jsx`, `ProductDetail.jsx`, `log.js`, `OnboardingTutorial.jsx`, `useLongPress`, `AppHeader.jsx`, `EditTrainingModal.jsx`, `tournamentComments.js`, `ScheduledPostsModal.jsx`, `MembershipOverviewModal.jsx`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12588652482269502 - nodes in this community are weakly interconnected._
- **Should `PostDetailModal.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11414141414141414 - nodes in this community are weakly interconnected._
- **Should `error` be split into smaller, more focused modules?**
  _Cohesion score 0.06927551560021153 - nodes in this community are weakly interconnected._