# Graph Report - tennis  (2026-09-01)

## Corpus Check
- 300 files · ~266,816 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1715 nodes · 5064 edges · 122 communities (109 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 162 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0e825a86`
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
- main.jsx
- yadiskAlbumLazy.js
- ArchiveModal.jsx
- PullToRefresh.jsx
- PostMedia.jsx
- buyMessage.js
- format.js
- usePlayers
- postRichText.js
- gestures.js
- gestures.js
- commentListLayout.js
- mention_notifications_lib.js
- App.jsx
- videoPreviewUrl
- Avatar.jsx
- NotificationCard.jsx
- EditTrainingModal.jsx
- tournamentPosts.js
- PostContentHtml.jsx
- postMentions.js
- ProductForm.jsx
- FullscreenImageViewer.jsx
- StatsLineChart.jsx
- compressImage
- Modal.jsx
- AdminPanelPage.jsx
- normalizeHexColor
- commentListLayout.js
- useFetchedOriginal.js
- MembershipOverviewModal.jsx
- Avatar.jsx
- compressImage
- Skeleton.jsx
- ToastContext.jsx
- CommentsPreview.jsx
- emscripten_realloc_buffer
- getEnvStrings
- MentionSuggestPopup.jsx

## God Nodes (most connected - your core abstractions)
1. `error` - 138 edges
2. `Modal()` - 48 edges
3. `useAlertDialog()` - 47 edges
4. `ProfileViewModal()` - 38 edges
5. `pb` - 35 edges
6. `isModerator()` - 33 edges
7. `hasVisibleText()` - 29 edges
8. `Профиль` - 29 edges
9. `TrainingsPage()` - 27 edges
10. `CompetitionsPage()` - 26 edges

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

## Communities (122 total, 13 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.29
Nodes (17): autoUnfreezeUser(), createAppNotification(), formatDayMonthBoldRu(), getEffectiveEndDate(), gmt7Hour(), notifyFreeze(), notifyTopUp(), pad2() (+9 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.06
Nodes (61): FeedVideoPreview(), FullscreenSlideImage(), isImagePaintReady(), useYadiskLoadProgress(), MediaPreviewAlbumItem(), MediaPreviewGrid(), PinnedBanner(), usePinnedThumbUrl() (+53 more)

### Community 3 - "notifications.js"
Cohesion: 0.04
Nodes (19): bigintToI53Checked(), doCallback(), done(), doReadv(), doWritev(), _emscripten_asm_const_int(), exec(), exitJS() (+11 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.24
Nodes (20): buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal(), getAudienceLabel(), NotificationSendModal() (+12 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.07
Nodes (54): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), buildPostMentionEl(), buildUserMentionEl(), deleteAdjacentMention() (+46 more)

### Community 7 - "App.jsx"
Cohesion: 0.67
Nodes (3): DEBIAN_FRONTEND, server-bootstrap.sh script, wait_pb()

### Community 8 - "NPM Dependencies"
Cohesion: 0.04
Nodes (48): dependencies, clsx, date-fns, @daypicker/react, @ffmpeg/core, @ffmpeg/ffmpeg, @ffmpeg/util, @fontsource-variable/nunito (+40 more)

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
Cohesion: 0.10
Nodes (35): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), htmlToReadableText(), looksLikeRichHtml() (+27 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.08
Nodes (42): AppHeader(), IconButton, MembershipPeriodRangeField(), MembershipStartDateField(), ProfileSingleDateField(), filterProfileTrainings(), formatDateRangeLabel(), ProfileTrainingsSearch() (+34 more)

### Community 17 - "Audit Diff Library"
Cohesion: 0.18
Nodes (11): buildCommentDetails(), diffFields(), displayName(), fieldValue(), newlyAdded(), newlyRemoved(), normalizeRelationIds(), relationId() (+3 more)

### Community 18 - "Bot Broadcast Library"
Cohesion: 0.25
Nodes (11): broadcastNewPublication(), broadcastToAllUsers(), broadcastToUserIds(), buildCommentBotMessage(), formatDateTimeGmt7(), getCommentPostInfo(), getModeratorMaxIds(), htmlToMaxMarkdown() (+3 more)

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
Cohesion: 0.27
Nodes (12): CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput(), OnboardingTutorial(), padHighlightRect(), scrollTargetIntoView() (+4 more)

### Community 57 - "log.js"
Cohesion: 0.13
Nodes (39): TrainingCard(), TrainingDetailModal(), TrainingsPage(), canCancelBooking(), formatCardDate(), formatTimeRange(), isModerator(), addPendingDeleteTrainingId() (+31 more)

### Community 58 - "achievements.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.20
Nodes (28): react, useAlertDialog(), CreateTournamentPostModal(), EditTournamentPostModal(), AttachButtons(), CommentComposeForm(), areStringArraysEqual(), CommentEditInlineForm() (+20 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.14
Nodes (26): EmptyState(), Spinner(), MODES, StatsAchievementsModal(), hasAnyActivity(), SLICES, StatsBookingModal(), StatsMetricTitle() (+18 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.21
Nodes (19): CreateTrainingModal(), INITIAL_FORM, getInitialUser(), useMaxAuth(), error, buildBannedUser(), clearBanInfo(), finalizeBannedUser() (+11 more)

### Community 67 - "media.js"
Cohesion: 0.05
Nodes (63): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), getVideoAspectRatio(), isGalleryKey(), prepareGalleryUploadItem(), useGalleryUpload(), isProductsKey() (+55 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.23
Nodes (9): PullToRefresh(), INITIAL, PlayerForm(), RatingPage(), hasOpenOverlay(), buildPlayerRanks(), getPlayerRatingRank(), getRatingPoints() (+1 more)

### Community 70 - "useFetchedOriginal.js"
Cohesion: 0.14
Nodes (22): PostUploadContext, PostUploadProvider(), prependPostToFeed(), revalidatePosts(), usePosts(), mapUploadProgress(), createComment(), createCommentWithProgress() (+14 more)

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 77 - "NotificationSettingsModal.jsx"
Cohesion: 0.23
Nodes (7): AdminPanelPage(), METRICS, StatisticsHubModal(), SystemTemplatesModal(), TemplateListButton(), listSystemTemplates(), updateSystemTemplate()

### Community 78 - "tournamentPosts.js"
Cohesion: 0.15
Nodes (19): ModalFloatingCloseButton(), CommentListSkeleton(), CommentSendButton(), DayGroup(), DaySeparator(), findScrollParent(), keepCommentEditInView(), restoreAndKeepCommentEditInView() (+11 more)

### Community 79 - "isModerator"
Cohesion: 0.23
Nodes (16): usePostUpload(), useRegisterAddAction(), MentionNavContext, MentionNavProvider(), useMentionNav(), CompetitionsPage(), FeedPage(), sortPinnedByCreated() (+8 more)

### Community 80 - "useMaxCloseGuard.js"
Cohesion: 0.14
Nodes (29): useFavorites(), buildEditMediaItems(), CommentMediaBody(), FavoritesDropdown(), FavoritesDropdownItem(), ProductCard, normalizeProductCategoryIds(), ProductDetail() (+21 more)

### Community 81 - "PostUploadProvider.jsx"
Cohesion: 0.38
Nodes (7): useComments(), useGalleryComments(), useProgressiveComments(), listGalleryComments(), listRecentGalleryComments(), listCommentsForPost(), listRecentCommentsForPost()

### Community 82 - "main.jsx"
Cohesion: 0.29
Nodes (8): carouselSlideKey(), FullscreenImageViewer(), getOriginRect(), getWindowWidth(), isTouchNavDevice(), itemSlideId(), FullscreenSlideVideo(), resolveVideoQualities()

### Community 83 - "yadiskAlbumLazy.js"
Cohesion: 0.15
Nodes (22): base(), groupItemsByDay(), groupPostsByDay(), mapCommentsWithDaySeparators(), mapItemsWithDaySeparators(), mapPostsWithDaySeparators(), PAD, ScheduleDateTimeSheet() (+14 more)

### Community 84 - "ArchiveModal.jsx"
Cohesion: 0.39
Nodes (8): buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue(), updateTraining()

### Community 85 - "PullToRefresh.jsx"
Cohesion: 0.24
Nodes (7): CommentListItem(), CommentReplyButton(), CommentReplyComposeBar(), CommentReplyQuote(), CommentSwipeReply(), isInteractiveTapTarget(), useCommentTapCopy()

### Community 86 - "PostMedia.jsx"
Cohesion: 0.13
Nodes (10): ForceUpdateOverlay(), AlertDialogContext, INITIAL_STATE, ScheduledPostActionsMenu(), ScheduledPostRow(), CategoryDropdown(), useOverlayClose(), useProductCategories() (+2 more)

### Community 87 - "buyMessage.js"
Cohesion: 0.10
Nodes (24): BlockedAppShell(), DEFAULT_FREQUENT_EMOJIS, EMOJI_CATEGORIES, CATEGORY_ICONS, EmojiPicker(), prefersReducedMotion(), pushRecentEmoji(), readRecentEmojis() (+16 more)

### Community 88 - "format.js"
Cohesion: 0.21
Nodes (16): getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments(), TournamentPostCard(), TournamentPostDetailModal(), PostCard() (+8 more)

### Community 89 - "usePlayers"
Cohesion: 0.29
Nodes (5): commentHasAttachments(), CommentsPreview(), handleContentCopy(), plainTextFromRange(), PostContentHtml()

### Community 90 - "postRichText.js"
Cohesion: 0.22
Nodes (18): formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput(), ProfileViewModal(), TRAINING_BADGE (+10 more)

### Community 91 - "gestures.js"
Cohesion: 0.12
Nodes (28): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, useToast(), MAX_AUTH_URL, MAX_SELLER_URL, PB_URL (+20 more)

### Community 92 - "gestures.js"
Cohesion: 0.08
Nodes (27): App(), AvatarCropModal(), getCropCircle(), getImagePlacement(), TournamentPostUploadProvider(), AlertDialogProvider(), Toast(), ToastContext (+19 more)

### Community 93 - "commentListLayout.js"
Cohesion: 0.12
Nodes (28): applyMentionMissingStatuses(), isPostMissing(), postInflight, postMissingCache, resolvePostMissing(), resolveUserMissing(), userInflight, userMissingCache (+20 more)

### Community 94 - "mention_notifications_lib.js"
Cohesion: 0.44
Nodes (10): alreadyNotified(), buildActorMeta(), diffNewIds(), extractUserMentionIds(), getRelationId(), notifyCommentMentions(), notifyMentionsForRecord(), notifyPostMentions() (+2 more)

### Community 95 - "App.jsx"
Cohesion: 0.14
Nodes (19): alignMemory(), _getaddrinfo(), getSocketAddress(), getSocketFromFD(), inetPton4(), inetPton6(), jstoi_q(), mmapAlloc() (+11 more)

### Community 96 - "videoPreviewUrl"
Cohesion: 0.32
Nodes (11): TournamentCommentsSection(), groupCommentsByDay(), useTournamentComments(), buildTournamentCommentMediaReorderFormData(), createTournamentComment(), createTournamentCommentWithProgress(), flushPendingTournamentCommentDeletes(), hardDeleteTournamentComment() (+3 more)

### Community 98 - "NotificationCard.jsx"
Cohesion: 0.12
Nodes (16): getWasmTableEntry(), invoke_i(), invoke_ii(), invoke_iii(), invoke_iiii(), invoke_iiiii(), invoke_iiiiii(), invoke_iiiiiiiii() (+8 more)

### Community 99 - "EditTrainingModal.jsx"
Cohesion: 0.15
Nodes (15): abort(), createWasm(), _dlopen(), ___dlsym(), getBinary(), getBinaryPromise(), getValue(), initRandomFill() (+7 more)

### Community 101 - "PostContentHtml.jsx"
Cohesion: 0.18
Nodes (12): _getnameinfo(), inetNtop4(), inetNtop6(), intArrayFromString(), LazyUint8Array(), lengthBytesUTF8(), readSockaddr(), stringToNewUTF8() (+4 more)

### Community 103 - "postMentions.js"
Cohesion: 0.15
Nodes (13): addDays(), arraySum(), ___assert_fail(), __gmtime_js(), isLeapYear(), __localtime_js(), __mktime_js(), readI53FromI64() (+5 more)

### Community 104 - "ProductForm.jsx"
Cohesion: 0.22
Nodes (15): useTournamentPosts(), applyTournamentPostSideEffects(), buildTournamentPostPayload(), deleteScheduledTournamentPost(), invalidateTournamentCaches(), listTournamentPosts(), pinTournamentPost(), publishScheduledTournamentPostNow() (+7 more)

### Community 105 - "FullscreenImageViewer.jsx"
Cohesion: 0.57
Nodes (6): collectionExists(), ensureSystemTemplates(), findDefault(), interpolate(), listByChannel(), resolve()

### Community 106 - "StatsLineChart.jsx"
Cohesion: 0.60
Nodes (4): applyPinFocusHighlight(), computePinnedBannerIndex(), pinHighlightTimers, usePinnedBannerIndex()

### Community 107 - "compressImage"
Cohesion: 0.15
Nodes (21): MembershipIcon(), getCollapsedLabel(), isUserChecked(), UserMultiSelect(), formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings() (+13 more)

### Community 108 - "Modal.jsx"
Cohesion: 0.36
Nodes (8): MediaProgressRing(), computeGridDropIndex(), computeStripDropIndex(), findStripScrollParent(), isTouchPointer(), moveKeyToIndex(), prefersReducedMotion(), SortableMediaPreviewGrid()

### Community 109 - "AdminPanelPage.jsx"
Cohesion: 0.33
Nodes (6): InfoTooltip(), Toggle(), NotificationSettingsModal(), SETTINGS_ROWS, getNotificationSettings(), updateNotificationSettings()

### Community 110 - "normalizeHexColor"
Cohesion: 0.31
Nodes (10): CloseAppConfirmSheet(), FOCUSABLE_SELECTORS, Modal(), ensureModalOriginTracking(), getLastPointerOrigin(), getModalCollapseTransform(), onPointerDown(), ORIGIN_SELECTOR (+2 more)

### Community 111 - "commentListLayout.js"
Cohesion: 0.32
Nodes (10): applyRegularPeriodAuto(), computeTwoMonthEndDate(), computeYearEndDate(), getCurrentSessions(), getModeCopy(), getUnpaidSessions(), MembershipEditModal(), normalizeDateInput() (+2 more)

### Community 112 - "useFetchedOriginal.js"
Cohesion: 0.29
Nodes (7): formatBirthDate(), formatDayTitle(), StatsGrowthModal(), StatsLineChart(), formatPostDate(), fetchStatsGrowth(), fetchStatsGrowthDay()

### Community 113 - "MembershipOverviewModal.jsx"
Cohesion: 0.27
Nodes (8): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, AddActionContext, AddActionProvider(), DEFAULT_API, useTriggerAddAction()

### Community 114 - "Avatar.jsx"
Cohesion: 0.32
Nodes (6): Avatar(), isUserBookingDisabled(), UserPickerModal(), getUserAvatarData(), pb, listUsers()

### Community 115 - "compressImage"
Cohesion: 0.22
Nodes (13): AddImageModal(), compressImage(), hasTransparency(), withExtension(), bindAbort(), compressVideo(), inputExtension(), isPreparedVideoFile() (+5 more)

### Community 116 - "Skeleton.jsx"
Cohesion: 0.14
Nodes (9): TournamentPostUploadContext, useTournamentPostUpload(), ScrollToTopButton(), FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton(), TABS (+1 more)

### Community 117 - "ToastContext.jsx"
Cohesion: 0.25
Nodes (8): addOnPostRun(), addOnPreRun(), callRuntimeCallbacks(), initRuntime(), postRun(), preRun(), run(), setTimeout()

### Community 118 - "CommentsPreview.jsx"
Cohesion: 0.38
Nodes (7): addRunDependency(), assert(), asyncLoad(), FS_createPreloadedFile(), getUniqueRunDependency(), handleMessage(), removeRunDependency()

### Community 119 - "emscripten_realloc_buffer"
Cohesion: 0.40
Nodes (5): _emscripten_get_heap_max(), emscripten_realloc_buffer(), _emscripten_resize_heap(), getHeapMax(), updateMemoryViews()

### Community 120 - "getEnvStrings"
Cohesion: 0.40
Nodes (5): _environ_get(), _environ_sizes_get(), getEnvStrings(), getExecutableName(), stringToAscii()

## Knowledge Gaps
- **145 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+140 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScheduleDateTimeSheet()` connect `yadiskAlbumLazy.js` to `yadiskAlbumLazy.js`, `PostMedia.jsx`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Why does `base()` connect `yadiskAlbumLazy.js` to `notifications.js`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Why does `error` connect `ProfilePage.jsx` to `Post Upload and UI Kit`, `Admin UI Controls`, `PostDetailModal.jsx`, `log.js`, `achievements.js`, `yadiskAlbumLazy.js`, `media.js`, `GalleryCommentModal.jsx`, `useFetchedOriginal.js`, `NotificationSettingsModal.jsx`, `tournamentPosts.js`, `isModerator`, `PostUploadProvider.jsx`, `ArchiveModal.jsx`, `PostMedia.jsx`, `format.js`, `postRichText.js`, `gestures.js`, `gestures.js`, `commentListLayout.js`, `videoPreviewUrl`, `ProductForm.jsx`, `compressImage`, `AdminPanelPage.jsx`, `commentListLayout.js`, `Avatar.jsx`, `compressImage`, `Skeleton.jsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _145 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.05966724039013196 - nodes in this community are weakly interconnected._
- **Should `notifications.js` be split into smaller, more focused modules?**
  _Cohesion score 0.041979949874686714 - nodes in this community are weakly interconnected._
- **Should `auditEventFormat.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0745637228979376 - nodes in this community are weakly interconnected._