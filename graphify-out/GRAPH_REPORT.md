# Graph Report - tennis  (2026-08-28)

## Corpus Check
- 284 files · ~259,008 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1467 nodes · 4543 edges · 106 communities (95 shown, 11 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 156 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ac5a719c`
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
- postRichText.js
- yadiskAlbumLazy.js
- ArchiveModal.jsx
- ProductForm.jsx
- PostMedia.jsx
- buyMessage.js
- format.js
- CompetitionsPage.jsx
- postRichText.js
- gestures.js
- PostRichTextField.jsx
- OnboardingTutorial.jsx
- mention_notifications_lib.js
- EditTrainingModal.jsx
- normalizeHexColor
- Avatar.jsx
- usePlayers
- resolve
- ScheduledPostsModal.jsx
- SortableMediaPreviewGrid.jsx
- SystemTemplatesModal.jsx
- compressImage
- Skeleton.jsx

## God Nodes (most connected - your core abstractions)
1. `error` - 132 edges
2. `Modal()` - 48 edges
3. `useAlertDialog()` - 47 edges
4. `ProfileViewModal()` - 38 edges
5. `pb` - 35 edges
6. `isModerator()` - 33 edges
7. `Профиль` - 29 edges
8. `hasVisibleText()` - 27 edges
9. `TrainingsPage()` - 27 edges
10. `getMediaUrl()` - 26 edges

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

## Communities (106 total, 11 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.29
Nodes (17): autoUnfreezeUser(), createAppNotification(), formatDayMonthBoldRu(), getEffectiveEndDate(), gmt7Hour(), notifyFreeze(), notifyTopUp(), pad2() (+9 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.08
Nodes (53): carouselSlideKey(), FullscreenSlideImage(), getOriginRect(), getWindowWidth(), isImagePaintReady(), itemSlideId(), useYadiskLoadProgress(), PinnedBanner() (+45 more)

### Community 3 - "notifications.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.07
Nodes (50): FOCUSABLE_SELECTORS, Modal(), Spinner(), AdminPanelPage(), METRICS, StatisticsHubModal(), MODES, StatsAchievementsModal() (+42 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.20
Nodes (16): usePostUpload(), FeedPage(), applyPinFocusHighlight(), computePinnedBannerIndex(), pinHighlightTimers, sortPinnedByCreated(), usePinnedBannerIndex(), cache (+8 more)

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
Cohesion: 0.10
Nodes (35): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), htmlToReadableText(), looksLikeRichHtml() (+27 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.10
Nodes (37): AppHeader(), applyRegularPeriodAuto(), computeTwoMonthEndDate(), computeYearEndDate(), getCurrentSessions(), getModeCopy(), getUnpaidSessions(), MembershipEditModal() (+29 more)

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
Cohesion: 0.07
Nodes (56): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), buildPostMentionEl(), buildUserMentionEl(), deleteAdjacentMention() (+48 more)

### Community 57 - "log.js"
Cohesion: 0.12
Nodes (45): isUserBookingDisabled(), UserPickerModal(), CreateTrainingModal(), INITIAL_FORM, TrainingDetailModal(), TrainingsPage(), useTrainings(), canCancelBooking() (+37 more)

### Community 58 - "achievements.js"
Cohesion: 0.20
Nodes (16): react, ModalFloatingCloseButton(), AttachButtons(), areStringArraysEqual(), CommentEditInlineForm(), findScrollParent(), keepCommentEditInView(), restoreAndKeepCommentEditInView() (+8 more)

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.07
Nodes (49): useFavorites(), buildEditMediaItems(), CommentMediaBody(), MediaPreviewAlbumItem(), MediaPreviewGrid(), PostMedia(), useInFeedViewport(), useSwipeGallery() (+41 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.18
Nodes (20): MembershipIcon(), MAX_AUTH_URL, formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput() (+12 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.25
Nodes (12): PullToRefresh(), AddActionContext, DEFAULT_API, useRegisterAddAction(), RatingPage(), hasOpenOverlay(), buildPlayerRanks(), getPlayerRatingRank() (+4 more)

### Community 67 - "media.js"
Cohesion: 0.15
Nodes (26): InfoTooltip(), Toggle(), buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal() (+18 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.12
Nodes (24): TournamentCommentsSection(), CommentReplyButton(), CommentReplyComposeBar(), CommentReplyQuote(), CommentSendButton(), CommentSwipeReply(), GalleryCommentModal(), useCommentLikes() (+16 more)

### Community 70 - "useFetchedOriginal.js"
Cohesion: 0.12
Nodes (28): applyMentionMissingStatuses(), isPostMissing(), postInflight, postMissingCache, resolvePostMissing(), resolveUserMissing(), userInflight, userMissingCache (+20 more)

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 77 - "NotificationSettingsModal.jsx"
Cohesion: 0.30
Nodes (14): getInitialUser(), useMaxAuth(), buildBannedUser(), clearBanInfo(), finalizeBannedUser(), initMaxAuth(), isUserBanned(), loadBanInfo() (+6 more)

### Community 78 - "tournamentPosts.js"
Cohesion: 0.53
Nodes (5): FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), adjustProductFavoritesCount()

### Community 79 - "isModerator"
Cohesion: 0.17
Nodes (18): useProductUpload(), PriceRangeSlider(), SearchBar(), ShopFilterButton(), countActiveShopFilters(), DEFAULT_SHOP_FILTERS, getPriceBounds(), productMatchesFilters() (+10 more)

### Community 80 - "useMaxCloseGuard.js"
Cohesion: 0.08
Nodes (29): BlockedAppShell(), ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, useTriggerAddAction(), DEFAULT_FREQUENT_EMOJIS, EMOJI_CATEGORIES (+21 more)

### Community 81 - "PostUploadProvider.jsx"
Cohesion: 0.23
Nodes (13): TournamentPostUploadContext, TournamentPostUploadProvider(), PB_URL, applyTournamentPostSideEffects(), buildTournamentPostPayload(), deleteScheduledTournamentPost(), invalidateTournamentCaches(), publishScheduledTournamentPostNow() (+5 more)

### Community 82 - "postRichText.js"
Cohesion: 0.14
Nodes (25): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), GalleryMediaOverlay(), createGalleryUploadItem(), GalleryItemLike() (+17 more)

### Community 83 - "yadiskAlbumLazy.js"
Cohesion: 0.19
Nodes (25): AlertDialogContext, INITIAL_STATE, useAlertDialog(), useToast(), CreateTournamentPostModal(), EditTournamentPostModal(), CommentComposeForm(), CreatePostModal() (+17 more)

### Community 84 - "ArchiveModal.jsx"
Cohesion: 0.27
Nodes (10): EmptyState(), ArchiveModal(), formatDateRangeLabel(), findRussianMonth(), isDateQueryParsed(), matchesDateQuery(), MONTH_ENTRIES, parseDateQuery() (+2 more)

### Community 85 - "ProductForm.jsx"
Cohesion: 0.15
Nodes (20): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, isProductsKey(), ProductUploadContext, ProductUploadProvider(), CloseAppConfirmSheet() (+12 more)

### Community 86 - "PostMedia.jsx"
Cohesion: 0.18
Nodes (19): IconButton, formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), normalizeDateInput(), ProfilePage(), TRAINING_BADGE (+11 more)

### Community 87 - "buyMessage.js"
Cohesion: 0.16
Nodes (14): MAX_SELLER_URL, formatFreezeLogEntry(), formatMembershipDate(), getMembershipTypeLabel(), MembershipModal(), parseFreezeLog(), buildBuyMessage(), buildMaxUserChatUrl() (+6 more)

### Community 88 - "format.js"
Cohesion: 0.20
Nodes (15): PAD, ScheduleDateTimeSheet(), CalendarStrip(), dayKey(), DAYS_FULL, DAYS_SHORT, formatDateTimeShort(), formatScheduleDayWheelLabel() (+7 more)

### Community 90 - "postRichText.js"
Cohesion: 0.19
Nodes (9): App(), AlertDialogProvider(), Toast(), ToastContext, ToastProvider(), useAppVersionCheck(), APP_BUILD, fetchRemoteAppVersion() (+1 more)

### Community 91 - "gestures.js"
Cohesion: 0.15
Nodes (17): Avatar(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments(), TournamentPostCard(), TournamentPostDetailModal() (+9 more)

### Community 92 - "PostRichTextField.jsx"
Cohesion: 0.19
Nodes (15): useTournamentPostUpload(), ScrollToTopButton(), MentionNavContext, useMentionNav(), CompetitionsPage(), TABS, applyCachedBytesToViewerItems(), subscribeYadiskMediaCache() (+7 more)

### Community 93 - "OnboardingTutorial.jsx"
Cohesion: 0.16
Nodes (21): AvatarCropModal(), getCropCircle(), getImagePlacement(), CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput() (+13 more)

### Community 94 - "mention_notifications_lib.js"
Cohesion: 0.44
Nodes (10): alreadyNotified(), buildActorMeta(), diffNewIds(), extractUserMentionIds(), getRelationId(), notifyCommentMentions(), notifyMentionsForRecord(), notifyPostMentions() (+2 more)

### Community 95 - "EditTrainingModal.jsx"
Cohesion: 0.39
Nodes (8): buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue(), updateTraining()

### Community 96 - "normalizeHexColor"
Cohesion: 0.19
Nodes (11): PostUploadContext, PostUploadProvider(), PostCardLike(), usePostLikes(), createPost(), createPostWithProgress(), deleteScheduledPost(), listPostLikes() (+3 more)

### Community 98 - "usePlayers"
Cohesion: 0.30
Nodes (8): getCollapsedLabel(), isUserChecked(), UserMultiSelect(), formatDateRangeLabel(), MembershipOverviewModal(), trainingCountsAsUsedSession(), usePlayers(), listPlayers()

### Community 99 - "resolve"
Cohesion: 0.57
Nodes (6): collectionExists(), ensureSystemTemplates(), findDefault(), interpolate(), listByChannel(), resolve()

### Community 100 - "ScheduledPostsModal.jsx"
Cohesion: 0.20
Nodes (5): ForceUpdateOverlay(), ScheduledPostActionsMenu(), ScheduledPostRow(), useOverlayClose(), formatScheduleDispatchHeading()

### Community 101 - "SortableMediaPreviewGrid.jsx"
Cohesion: 0.36
Nodes (8): MediaProgressRing(), computeGridDropIndex(), computeStripDropIndex(), findStripScrollParent(), isTouchPointer(), moveKeyToIndex(), prefersReducedMotion(), SortableMediaPreviewGrid()

### Community 103 - "SystemTemplatesModal.jsx"
Cohesion: 0.39
Nodes (4): SystemTemplatesModal(), TemplateListButton(), listSystemTemplates(), updateSystemTemplate()

### Community 104 - "compressImage"
Cohesion: 0.48
Nodes (4): AddImageModal(), compressImage(), hasTransparency(), withExtension()

### Community 105 - "Skeleton.jsx"
Cohesion: 0.33
Nodes (4): FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton()

## Knowledge Gaps
- **141 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `log.js` to `Post Upload and UI Kit`, `notifications.js`, `auditEventFormat.js`, `datePickerUtils.js`, `achievements.js`, `yadiskAlbumLazy.js`, `catalog.js`, `ProfilePage.jsx`, `media.js`, `GalleryCommentModal.jsx`, `useFetchedOriginal.js`, `NotificationSettingsModal.jsx`, `tournamentPosts.js`, `isModerator`, `PostUploadProvider.jsx`, `postRichText.js`, `yadiskAlbumLazy.js`, `ProductForm.jsx`, `PostMedia.jsx`, `buyMessage.js`, `PostRichTextField.jsx`, `OnboardingTutorial.jsx`, `EditTrainingModal.jsx`, `normalizeHexColor`, `usePlayers`, `ScheduledPostsModal.jsx`, `SystemTemplatesModal.jsx`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `react` connect `achievements.js` to `NPM Dependencies`, `yadiskAlbumLazy.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `dependencies` connect `NPM Dependencies` to `achievements.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _141 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.08028846153846154 - nodes in this community are weakly interconnected._
- **Should `notifications.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._
- **Should `Admin UI Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.06738245094409478 - nodes in this community are weakly interconnected._