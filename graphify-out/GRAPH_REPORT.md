# Graph Report - tennis  (2026-09-06)

## Corpus Check
- 317 files · ~295,570 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1821 nodes · 5202 edges · 148 communities (123 shown, 25 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 177 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `476c0d5d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App Shell Navigation
- AvatarCropModal.jsx
- Post Upload and UI Kit
- notifications.js
- Gallery Upload Flow
- Admin UI Controls
- auditEventFormat.js
- App.jsx
- NPM Dependencies
- Audit Logs Modal
- Stats Library Helpers
- Achievement Badge Assets
- gestures.js
- datePickerUtils.js
- Audit Diff Library
- Bot Broadcast Library
- Notifications State Lib
- Audit Docs and Feed
- Brand Assets Gallery Docs
- MAX Bridge Auth Docs
- Trainings Finalize Lib
- Competitions Rating Schema
- Admin Broadcast Dispatch
- Shop Cart Docs
- Service Worker Media
- Dropdown UI Snippet
- Search UI Snippet
- Features Folder Structure
- Services Module Split
- Bottom Nav Items
- Vite Config
- Touch UI Performance
- PostDetailModal.jsx
- log.js
- achievements.js
- yadiskAlbumLazy.js
- maxauthlib.js
- error
- catalog.js
- ProfilePage.jsx
- media.js
- media.js
- GalleryCommentModal.jsx
- useFetchedOriginal.js
- claimlib.js
- tournamentComments.js
- NotificationSettingsModal.jsx
- tournamentPosts.js
- isModerator
- useMaxCloseGuard.js
- PostUploadProvider.jsx
- yadiskAlbumLazy.js
- ArchiveModal.jsx
- PullToRefresh.jsx
- @ffmpeg/ffmpeg
- buyMessage.js
- format.js
- usePlayers
- postRichText.js
- gestures.js
- @fontsource-variable/nunito
- commentListLayout.js
- mention_notifications_lib.js
- pocketbase
- react-dom
- Avatar.jsx
- react-error-boundary
- EditTrainingModal.jsx
- swr
- intArrayFromString
- useAlertDialog
- CreateTournamentPostModal.jsx
- backup_common.sh
- TournamentPostDetailModal.jsx
- _strftime
- ProfileTrainingsSearch.jsx
- yadiskMediaSessionCache.js
- PostUploadProvider.jsx
- SortableMediaPreviewGrid.jsx
- callRuntimeCallbacks
- useLongPress
- Avatar.jsx
- Бэкапы и восстановление PocketBase
- asyncLoad
- PullToRefresh.jsx
- EditTrainingModal.jsx
- useComments.js
- emscripten_realloc_buffer
- getEnvStrings
- usePinnedBannerIndex.js
- useSectionSwipe.js
- CommentListItem.jsx
- AboutAppModal.jsx
- useSectionSwipe.js
- useSectionSwipe.js
- UTF8ToString
- overlayStack.js
- Skeleton.jsx
- BottomNav.jsx
- FavoritesContext.jsx
- backuplib.js
- backup_db_to_yandex.sh
- backup_storage_to_yandex.sh
- install_backup_cron.sh
- restore_db_from_yandex.sh
- restore_storage_from_yandex.sh
- BottomNav.jsx
- DateRangePicker.jsx
- compressImage
- SortableMediaPreviewGrid.jsx
- MembershipOverviewModal.jsx
- StatsLineChart.jsx
- PlayerRow.jsx
- admin_backup_runner.sh

## God Nodes (most connected - your core abstractions)
1. `error` - 139 edges
2. `useAlertDialog()` - 49 edges
3. `Modal()` - 48 edges
4. `ProfileViewModal()` - 38 edges
5. `pb` - 35 edges
6. `isModerator()` - 33 edges
7. `hasVisibleText()` - 29 edges
8. `Профиль` - 29 edges
9. `TrainingsPage()` - 26 edges
10. `useOverlayClose()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Brand/logo sm.png` --conceptually_related_to--> `Секция Миленьких Mini App`  [INFERRED]
  client/src/assets/sm.png → README.md
- `Achievement badge tier 1 level 1` --conceptually_related_to--> `Профиль`  [INFERRED]
  client/src/assets/ach/1_1.png → README.md
- `Achievement badge tier 1 level 2` --conceptually_related_to--> `Профиль`  [INFERRED]
  client/src/assets/ach/1_2.png → README.md
- `Achievement badge tier 1 level 3` --conceptually_related_to--> `Профиль`  [INFERRED]
  client/src/assets/ach/1_3.png → README.md
- `Achievement badge tier 1 level 4` --conceptually_related_to--> `Профиль`  [INFERRED]
  client/src/assets/ach/1_4.png → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Mini App feature tabs** — readme_feed, readme_trainings, readme_shop, readme_rating, readme_competitions, readme_gallery, readme_profile [EXTRACTED 1.00]
- **PocketBase collections** — readme_schema_users, readme_schema_posts, readme_schema_comments, readme_schema_trainings, readme_schema_products, readme_schema_championships, readme_schema_matches, readme_schema_gallery [EXTRACTED 1.00]
- **Achievement badge asset set** — client_src_assets_ach_1_1_png_badge, client_src_assets_ach_1_2_png_badge, client_src_assets_ach_1_3_png_badge, client_src_assets_ach_1_4_png_badge, client_src_assets_ach_1_5_png_badge, client_src_assets_ach_2_1_png_badge, client_src_assets_ach_2_2_png_badge, client_src_assets_ach_2_3_png_badge, client_src_assets_ach_2_4_png_badge, client_src_assets_ach_2_5_png_badge, client_src_assets_ach_3_1_png_badge, client_src_assets_ach_3_2_png_badge, client_src_assets_ach_3_3_png_badge, client_src_assets_ach_3_4_png_badge, client_src_assets_ach_3_5_png_badge, client_src_assets_ach_4_1_png_badge, client_src_assets_ach_4_2_png_badge, client_src_assets_ach_4_3_png_badge, client_src_assets_ach_4_4_png_badge, client_src_assets_ach_4_5_png_badge, client_src_assets_ach_5_1_png_badge, client_src_assets_ach_5_2_png_badge, client_src_assets_ach_5_3_png_badge, client_src_assets_ach_5_4_png_badge, client_src_assets_ach_5_5_png_badge [INFERRED 0.85]

## Communities (148 total, 25 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.29
Nodes (17): autoUnfreezeUser(), createAppNotification(), formatDayMonthBoldRu(), getEffectiveEndDate(), gmt7Hour(), notifyFreeze(), notifyTopUp(), pad2() (+9 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.06
Nodes (60): FullscreenSlideImage(), isImagePaintReady(), useYadiskLoadProgress(), FullscreenSlideVideo(), stopVideoLoad(), PinnedBanner(), usePinnedThumbUrl(), getFirstLine() (+52 more)

### Community 3 - "notifications.js"
Cohesion: 0.50
Nodes (7): groupCommentsByDay(), groupItemsByDay(), mapCommentsWithDaySeparators(), mapItemsWithDaySeparators(), mapPostsWithDaySeparators(), dayKey(), formatCommentDaySeparator()

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.26
Nodes (13): diffNewFiles(), ensurePosterForVideo(), ffmpegBin(), ffmpegExtractPoster(), getMediaTarget(), isVideoFilename(), normalizeFileList(), processRecordField() (+5 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.22
Nodes (13): ALL_CATEGORY_VALUES, formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), addDaysToDateInput(), auditEventToCsvRow() (+5 more)

### Community 7 - "App.jsx"
Cohesion: 0.67
Nodes (3): DEBIAN_FRONTEND, server-bootstrap.sh script, wait_pb()

### Community 8 - "NPM Dependencies"
Cohesion: 0.05
Nodes (42): dependencies, clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, pocketbase, react-dom (+34 more)

### Community 9 - "Audit Logs Modal"
Cohesion: 0.60
Nodes (5): getRelationId(), notifyCommentReply(), relationId(), stripHtmlToPlain(), truncatePlain()

### Community 11 - "Stats Library Helpers"
Cohesion: 0.14
Nodes (30): addDaysYmd(), bumpCounter(), calcLevelFromValue(), eachDayInclusive(), emptyBookingCounters(), ensureBookingUser(), getAchievementGrants(), getAchievementsNow() (+22 more)

### Community 12 - "Achievement Badge Assets"
Cohesion: 0.07
Nodes (28): Achievement badge tier 1 level 1, Achievement badge tier 1 level 2, Achievement badge tier 1 level 3, Achievement badge tier 1 level 4, Achievement badge tier 1 level 5, Achievement badge tier 2 level 1, Achievement badge tier 2 level 2, Achievement badge tier 2 level 3 (+20 more)

### Community 13 - "gestures.js"
Cohesion: 0.22
Nodes (12): MembershipIcon(), formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), normalizeDateInput(), ProfilePage(), TRAINING_BADGE (+4 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.22
Nodes (13): IconButton, FOCUSABLE_SELECTORS, Modal(), formatDateRangeLabel(), MembershipOverviewModal(), trainingCountsAsUsedSession(), ensureModalOriginTracking(), getLastPointerOrigin() (+5 more)

### Community 17 - "Audit Diff Library"
Cohesion: 0.18
Nodes (11): buildCommentDetails(), diffFields(), displayName(), fieldValue(), newlyAdded(), newlyRemoved(), normalizeRelationIds(), relationId() (+3 more)

### Community 18 - "Bot Broadcast Library"
Cohesion: 0.20
Nodes (15): broadcastNewPublication(), broadcastToAllUsers(), broadcastToUserIds(), buildBroadcastImageAttachments(), buildCommentBotMessage(), formatDateTimeGmt7(), getCommentPostInfo(), getModeratorMaxIds() (+7 more)

### Community 19 - "Notifications State Lib"
Cohesion: 0.27
Nodes (10): applyStateFields(), findTrainingNotification(), getMetaTrainingId(), getStateFields(), isWithinCountdownWindow(), newlyAddedUserIds(), normalizeRelationIds(), parsePbDate() (+2 more)

### Community 20 - "Audit Docs and Feed"
Cohesion: 0.22
Nodes (10): PB filter-injection fix, Modal focus-trap a11y, Audit & Refactor Report, Soft-delete zombie records, SWR data fetching migration, Лента (Feed), PB collection comments, PB collection posts (+2 more)

### Community 21 - "Brand Assets Gallery Docs"
Cohesion: 0.22
Nodes (9): Title Секция Миленьких, Loader SVG asset, Brand/logo sm.png, Галерея, PB collection gallery, PB collection trainings, Секция Миленьких Mini App, React 18 + Vite 5 + SWR (+1 more)

### Community 22 - "MAX Bridge Auth Docs"
Cohesion: 0.25
Nodes (8): AlertDialog replaces native dialogs, useMaxAuth idempotent init, client/index.html entry, max-web-app.js SDK script, MAX Auth /api/max-auth, MAX Bridge, Nginx reverse proxy, PocketBase Backend

### Community 23 - "Trainings Finalize Lib"
Cohesion: 0.28
Nodes (13): adjustAttendanceCountTx(), applyBookingSideEffects(), consumeMembershipSessionTx(), dayBoundsIso(), finalizeCancelledTrainingRecord(), hasDailyBookingSameDay(), hasTimeRangeEnded(), isDailyLimitedMembership() (+5 more)

### Community 24 - "Competitions Rating Schema"
Cohesion: 0.40
Nodes (6): Соревнования, Рейтинг, Роли user/moderator, PB collection championships, PB collection matches, PB collection users

### Community 25 - "Admin Broadcast Dispatch"
Cohesion: 0.83
Nodes (3): dispatchScheduledBroadcast(), dispatchScheduledNotification(), resolveAudienceUserIds()

### Community 27 - "Shop Cart Docs"
Cohesion: 0.50
Nodes (4): PB collection products, Магазин, Shopping cart animation snippet, Shopping cart animation

### Community 56 - "PostDetailModal.jsx"
Cohesion: 0.18
Nodes (14): AvatarCropModal(), getCropCircle(), getImagePlacement(), CommentContextMenu(), carouselSlideKey(), ProductGallery(), slideId(), useGalleryNavigation() (+6 more)

### Community 57 - "log.js"
Cohesion: 0.13
Nodes (37): TrainingCard(), TrainingDetailModal(), TrainingsPage(), canCancelBooking(), formatCardDate(), formatTimeRange(), hasTimeRangeEnded(), addPendingDeleteTrainingId() (+29 more)

### Community 58 - "achievements.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.04
Nodes (19): bigintToI53Checked(), doCallback(), done(), doReadv(), doWritev(), _emscripten_asm_const_int(), exec(), exitJS() (+11 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.13
Nodes (27): AppHeader(), MembershipPeriodRangeField(), MembershipStartDateField(), ProfileSingleDateField(), FavoriteIcon(), DatePickerModal(), DateRangeModal(), formatRangeHint() (+19 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.12
Nodes (32): EmptyState(), Spinner(), MODES, StatsAchievementsModal(), hasAnyActivity(), SLICES, StatsBookingModal(), formatBirthDate() (+24 more)

### Community 67 - "media.js"
Cohesion: 0.06
Nodes (61): useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider(), useProductUpload(), FavoritesContext, FavoritesProvider(), loadFavoriteProducts() (+53 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.24
Nodes (7): CommentListSkeleton(), CommentSendButton(), DayGroup(), DaySeparator(), useCommentLikes(), listCommentLikes(), toggleCommentLike()

### Community 70 - "useFetchedOriginal.js"
Cohesion: 0.14
Nodes (22): PostUploadContext, PostUploadProvider(), prependPostToFeed(), revalidatePosts(), usePosts(), prepareMediaInBody(), createComment(), createCommentWithProgress() (+14 more)

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 77 - "NotificationSettingsModal.jsx"
Cohesion: 0.20
Nodes (5): FeedVideoPreview(), MediaPreviewAlbumItem(), MediaPreviewGrid(), useSwipeGallery(), videoPreviewUrl()

### Community 78 - "tournamentPosts.js"
Cohesion: 0.14
Nodes (19): alignMemory(), _getaddrinfo(), getSocketAddress(), getSocketFromFD(), inetPton4(), inetPton6(), jstoi_q(), mmapAlloc() (+11 more)

### Community 79 - "isModerator"
Cohesion: 0.16
Nodes (19): TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), useTournamentPosts(), applyTournamentPostSideEffects(), buildTournamentPostPayload(), deleteScheduledTournamentPost(), hardDeleteTournamentPost() (+11 more)

### Community 80 - "useMaxCloseGuard.js"
Cohesion: 0.52
Nodes (5): getCollapsedLabel(), isUserChecked(), UserMultiSelect(), usePlayers(), listPlayers()

### Community 81 - "PostUploadProvider.jsx"
Cohesion: 0.22
Nodes (21): prefetchLazyTabPages(), usePostUpload(), ScrollToTopButton(), useRegisterAddAction(), MentionNavContext, useMentionNav(), CompetitionsPage(), TABS (+13 more)

### Community 83 - "yadiskAlbumLazy.js"
Cohesion: 0.07
Nodes (43): base(), ForceUpdateOverlay(), AuditEventRow(), htmlToReadableText(), looksLikeRichHtml(), toPlainText(), PAD, ScheduleDateTimeSheet() (+35 more)

### Community 84 - "ArchiveModal.jsx"
Cohesion: 0.30
Nodes (10): ModalFloatingCloseButton(), findScrollParent(), keepCommentEditInView(), restoreAndKeepCommentEditInView(), PostDetailModal(), useKeepForModalClose(), toFullscreenMediaItem(), buildCommentMediaReorderFormData() (+2 more)

### Community 85 - "PullToRefresh.jsx"
Cohesion: 0.22
Nodes (16): applyRegularPeriodAuto(), computeTwoMonthEndDate(), computeYearEndDate(), getCurrentSessions(), getModeCopy(), getUnpaidSessions(), MembershipEditModal(), normalizeDateInput() (+8 more)

### Community 86 - "@ffmpeg/ffmpeg"
Cohesion: 0.25
Nodes (14): filterProfileTrainings(), formatDateRangeLabel(), ProfileTrainingsSearch(), ArchiveModal(), formatDateRangeLabel(), getArchiveDefaultDateRange(), findRussianMonth(), isDateQueryParsed() (+6 more)

### Community 87 - "buyMessage.js"
Cohesion: 0.27
Nodes (12): CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput(), OnboardingTutorial(), padHighlightRect(), scrollTargetIntoView() (+4 more)

### Community 88 - "format.js"
Cohesion: 0.29
Nodes (11): Avatar(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments(), TournamentPostCard(), TournamentPostDetailModal() (+3 more)

### Community 89 - "usePlayers"
Cohesion: 0.05
Nodes (72): FrameColorPicker(), hexToHsv(), hsvToHex(), applyMentionMissingStatuses(), isPostMissing(), postInflight, postMissingCache, resolvePostMissing() (+64 more)

### Community 90 - "postRichText.js"
Cohesion: 0.22
Nodes (18): formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput(), ProfileViewModal(), TRAINING_BADGE (+10 more)

### Community 91 - "gestures.js"
Cohesion: 0.18
Nodes (13): AppInner(), getInitialFavoriteProductIds(), LazyAdminPanelPage, LazyCompetitionsPage, LazyGalleryPage, LazyOnboardingTutorial, LazyProfilePage, LazyShopPage (+5 more)

### Community 92 - "@fontsource-variable/nunito"
Cohesion: 0.12
Nodes (16): getWasmTableEntry(), invoke_i(), invoke_ii(), invoke_iii(), invoke_iiii(), invoke_iiiii(), invoke_iiiiii(), invoke_iiiiiiiii() (+8 more)

### Community 93 - "commentListLayout.js"
Cohesion: 0.05
Nodes (53): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), getVideoAspectRatio(), isGalleryKey(), prepareGalleryUploadItem(), AlertDialogContext, AlertDialogProvider() (+45 more)

### Community 94 - "mention_notifications_lib.js"
Cohesion: 0.44
Nodes (10): alreadyNotified(), buildActorMeta(), diffNewIds(), extractUserMentionIds(), getRelationId(), notifyCommentMentions(), notifyMentionsForRecord(), notifyPostMentions() (+2 more)

### Community 95 - "pocketbase"
Cohesion: 0.43
Nodes (4): MentionSuggestPopup(), prefersReducedMotion(), registerOverlay(), stack

### Community 98 - "react-error-boundary"
Cohesion: 0.15
Nodes (15): abort(), createWasm(), _dlopen(), ___dlsym(), getBinary(), getBinaryPromise(), getValue(), initRandomFill() (+7 more)

### Community 101 - "intArrayFromString"
Cohesion: 0.18
Nodes (12): _getnameinfo(), inetNtop4(), inetNtop6(), intArrayFromString(), LazyUint8Array(), lengthBytesUTF8(), readSockaddr(), stringToNewUTF8() (+4 more)

### Community 103 - "useAlertDialog"
Cohesion: 0.23
Nodes (19): CreateTrainingModal(), INITIAL_FORM, getInitialUser(), useMaxAuth(), error, buildBannedUser(), clearBanInfo(), finalizeBannedUser() (+11 more)

### Community 104 - "CreateTournamentPostModal.jsx"
Cohesion: 0.29
Nodes (7): CommentReplyComposeBar(), CommentReplyQuote(), handleContentCopy(), plainTextFromRange(), PostContentHtml(), lockAnimFrameWidth(), startAnimFrames()

### Community 105 - "backup_common.sh"
Cohesion: 0.13
Nodes (3): db_fingerprint(), save_db_fingerprint(), backup_common.sh script

### Community 106 - "TournamentPostDetailModal.jsx"
Cohesion: 0.22
Nodes (15): TournamentCommentsSection(), isKnownEmptyExpandedComments(), useComments(), useProgressiveComments(), useTournamentComments(), listCommentsForPost(), listRecentCommentsForPost(), buildTournamentCommentMediaReorderFormData() (+7 more)

### Community 107 - "_strftime"
Cohesion: 0.15
Nodes (13): addDays(), arraySum(), ___assert_fail(), __gmtime_js(), isLeapYear(), __localtime_js(), __mktime_js(), readI53FromI64() (+5 more)

### Community 108 - "ProfileTrainingsSearch.jsx"
Cohesion: 0.19
Nodes (11): FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton(), RatingPage(), buildPlayerRanks(), getPlayerRatingRank(), getRatingPoints() (+3 more)

### Community 109 - "yadiskMediaSessionCache.js"
Cohesion: 0.20
Nodes (13): MAX_AUTH_URL, MAX_SELLER_URL, PB_URL, BlockedPage(), BuyButton(), buildBuyMessage(), buildMaxUserChatUrl(), formatProductLine() (+5 more)

### Community 110 - "PostUploadProvider.jsx"
Cohesion: 0.19
Nodes (26): react, CreateTournamentPostModal(), EditTournamentPostModal(), AttachButtons(), CommentComposeForm(), areStringArraysEqual(), CommentEditInlineForm(), CreatePostModal() (+18 more)

### Community 111 - "SortableMediaPreviewGrid.jsx"
Cohesion: 0.60
Nodes (4): applyPinFocusHighlight(), computePinnedBannerIndex(), pinHighlightTimers, usePinnedBannerIndex()

### Community 112 - "callRuntimeCallbacks"
Cohesion: 0.25
Nodes (8): addOnPostRun(), addOnPreRun(), callRuntimeCallbacks(), initRuntime(), postRun(), preRun(), run(), setTimeout()

### Community 113 - "useLongPress"
Cohesion: 0.15
Nodes (22): useFavorites(), buildEditMediaItems(), CommentMediaBody(), commentHasAttachments(), CommentsPreview(), PostDetailVideoPreview(), PostMedia(), useInFeedViewport() (+14 more)

### Community 115 - "Бэкапы и восстановление PocketBase"
Cohesion: 0.14
Nodes (13): RPO, Watchdog, БД только через SQLite Online Backup API, Бэкапы и восстановление PocketBase, Важно, Восстановление, Новый сервер, Полный disaster (+5 more)

### Community 116 - "asyncLoad"
Cohesion: 0.38
Nodes (7): addRunDependency(), assert(), asyncLoad(), FS_createPreloadedFile(), getUniqueRunDependency(), handleMessage(), removeRunDependency()

### Community 117 - "PullToRefresh.jsx"
Cohesion: 0.36
Nodes (8): PullToRefresh(), hasOpenOverlay(), collectionExists(), ensureSystemTemplates(), findDefault(), interpolate(), listByChannel(), resolve()

### Community 118 - "EditTrainingModal.jsx"
Cohesion: 0.29
Nodes (10): buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue(), areTrainingValuesEqual() (+2 more)

### Community 120 - "emscripten_realloc_buffer"
Cohesion: 0.40
Nodes (5): _emscripten_get_heap_max(), emscripten_realloc_buffer(), _emscripten_resize_heap(), getHeapMax(), updateMemoryViews()

### Community 121 - "getEnvStrings"
Cohesion: 0.40
Nodes (5): _environ_get(), _environ_sizes_get(), getEnvStrings(), getExecutableName(), stringToAscii()

### Community 122 - "usePinnedBannerIndex.js"
Cohesion: 0.36
Nodes (7): BlockedAppShell(), disableMaxVerticalSwipes(), isEditableFocus(), useMaxCloseGuard(), closeTopOverlay(), isSectionScrollAtTop(), scrollSectionToTop()

### Community 124 - "CommentListItem.jsx"
Cohesion: 0.33
Nodes (6): useToast(), CommentListItem(), CommentReplyButton(), CommentSwipeReply(), isInteractiveTapTarget(), useCommentTapCopy()

### Community 125 - "AboutAppModal.jsx"
Cohesion: 0.29
Nodes (8): App(), AboutAppModal(), openExternalUrl(), useAppVersionCheck(), APP_BUILD, APP_DISPLAY_VERSION, fetchRemoteAppVersion(), getVersionManifestUrl()

### Community 126 - "useSectionSwipe.js"
Cohesion: 0.36
Nodes (8): getSwipeableTabs(), getWindowWidth(), IGNORE_SELECTOR, isTextFieldFocused(), shouldIgnoreTarget(), SWIPE_ALLOW_OVERLAY_SUFFIXES, useSectionSwipe(), hasBlockingOverlay()

### Community 127 - "useSectionSwipe.js"
Cohesion: 0.29
Nodes (7): DEFAULT_FREQUENT_EMOJIS, EMOJI_CATEGORIES, CATEGORY_ICONS, EmojiPicker(), prefersReducedMotion(), pushRecentEmoji(), readRecentEmojis()

### Community 128 - "UTF8ToString"
Cohesion: 0.53
Nodes (4): FullscreenImageViewer(), getOriginRect(), getWindowWidth(), isTouchNavDevice()

### Community 129 - "overlayStack.js"
Cohesion: 0.50
Nodes (3): AddActionContext, AddActionProvider(), DEFAULT_API

### Community 130 - "Skeleton.jsx"
Cohesion: 0.83
Nodes (3): useScheduledPosts(), listScheduledPosts(), listScheduledTournamentPosts()

### Community 131 - "BottomNav.jsx"
Cohesion: 0.25
Nodes (15): areStringArraysEqual(), areStringSetsEqual(), INITIAL, parseOptionalOldPrice(), parsePrice(), ProductForm(), areProductColorsEqual(), areProductParametersEqual() (+7 more)

### Community 133 - "backuplib.js"
Cohesion: 0.42
Nodes (7): notifyModeratorsBackupResult(), notifyToken(), notifyUrl(), resolveScript(), scriptsDir(), shellSingleQuote(), startBackup()

### Community 140 - "BottomNav.jsx"
Cohesion: 0.47
Nodes (5): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, useTriggerAddAction()

### Community 141 - "DateRangePicker.jsx"
Cohesion: 0.29
Nodes (8): AppMain(), isUserBookingDisabled(), UserPickerModal(), deleteProduct(), pb, hardDeletePost(), finalizeCancelledTraining(), listUsers()

### Community 143 - "compressImage"
Cohesion: 0.29
Nodes (8): useAlertDialog(), ScheduledPostsModal(), AddImageModal(), compressImage(), hasTransparency(), withExtension(), prepareUploadMedia(), prepareUploadMediaList()

### Community 144 - "SortableMediaPreviewGrid.jsx"
Cohesion: 0.36
Nodes (8): MediaProgressRing(), computeGridDropIndex(), computeStripDropIndex(), findStripScrollParent(), isTouchPointer(), moveKeyToIndex(), prefersReducedMotion(), SortableMediaPreviewGrid()

### Community 147 - "MembershipOverviewModal.jsx"
Cohesion: 0.28
Nodes (10): NotificationsDropdown(), useTrainings(), clearAllNotifications(), deleteNotification(), isDeletableNotification(), listNotifications(), requestCommentReplyNotification(), SESSIONS_LEFT_COPY (+2 more)

### Community 150 - "PlayerRow.jsx"
Cohesion: 0.39
Nodes (7): PostCard(), PostCardLike(), readComments(), usePostLikes(), formatCommentTime(), listPostLikes(), togglePostLike()

## Knowledge Gaps
- **172 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+167 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScheduleDateTimeSheet()` connect `yadiskAlbumLazy.js` to `PostUploadProvider.jsx`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Why does `base()` connect `yadiskAlbumLazy.js` to `yadiskAlbumLazy.js`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Why does `error` connect `useAlertDialog` to `Skeleton.jsx`, `Post Upload and UI Kit`, `DateRangePicker.jsx`, `gestures.js`, `compressImage`, `MembershipOverviewModal.jsx`, `PlayerRow.jsx`, `log.js`, `achievements.js`, `media.js`, `GalleryCommentModal.jsx`, `useFetchedOriginal.js`, `isModerator`, `useMaxCloseGuard.js`, `PostUploadProvider.jsx`, `yadiskAlbumLazy.js`, `ArchiveModal.jsx`, `PullToRefresh.jsx`, `buyMessage.js`, `postRichText.js`, `gestures.js`, `commentListLayout.js`, `TournamentPostDetailModal.jsx`, `ProfileTrainingsSearch.jsx`, `yadiskMediaSessionCache.js`, `PostUploadProvider.jsx`, `useLongPress`, `EditTrainingModal.jsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _172 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.0625694187338023 - nodes in this community are weakly interconnected._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Stats Library Helpers` be split into smaller, more focused modules?**
  _Cohesion score 0.14204545454545456 - nodes in this community are weakly interconnected._