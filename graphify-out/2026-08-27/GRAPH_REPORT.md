# Graph Report - tennis  (2026-08-27)

## Corpus Check
- 267 files · ~248,030 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1402 nodes · 4326 edges · 103 communities (93 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 155 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `37927aed`
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
- GalleryPage.jsx
- claimlib.js
- tournamentComments.js
- AboutAppModal.jsx
- tournamentPosts.js
- isModerator
- useMaxCloseGuard.js
- GalleryPage.jsx
- main.jsx
- error
- RatingPage.jsx
- FavoritesContext.jsx
- overlayStack.js
- buyMessage.js
- LogsModal.jsx
- BottomNav.jsx
- postRichText.js
- gestures.js
- ProfilePage.jsx
- PostContentHtml.jsx
- mention_notifications_lib.js
- GalleryCommentModal.jsx
- RatingPage.jsx
- normalizeHexColor
- GalleryUploadProvider.jsx
- App.jsx
- MembershipOverviewModal.jsx
- StatsLineChart.jsx

## God Nodes (most connected - your core abstractions)
1. `error` - 131 edges
2. `Modal()` - 45 edges
3. `useAlertDialog()` - 43 edges
4. `ProfileViewModal()` - 38 edges
5. `pb` - 35 edges
6. `isModerator()` - 33 edges
7. `Профиль` - 29 edges
8. `TrainingsPage()` - 27 edges
9. `hasVisibleText()` - 26 edges
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

## Communities (103 total, 10 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.29
Nodes (17): autoUnfreezeUser(), createAppNotification(), formatDayMonthBoldRu(), getEffectiveEndDate(), gmt7Hour(), notifyFreeze(), notifyTopUp(), pad2() (+9 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.06
Nodes (56): usePostUpload(), useTournamentPostUpload(), PullToRefresh(), ScrollToTopButton(), FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton() (+48 more)

### Community 3 - "notifications.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.13
Nodes (31): Spinner(), MODES, StatsAchievementsModal(), hasAnyActivity(), SLICES, StatsBookingModal(), formatBirthDate(), formatDayTitle() (+23 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.17
Nodes (21): AuditEventRow(), htmlToReadableText(), looksLikeRichHtml(), toPlainText(), CATEGORY_STYLES, COMMENT_OBJECT_TYPES, COMMENT_SECTION_LABELS, COMMENT_TYPE_LABELS (+13 more)

### Community 7 - "App.jsx"
Cohesion: 0.67
Nodes (3): DEBIAN_FRONTEND, server-bootstrap.sh script, wait_pb()

### Community 8 - "NPM Dependencies"
Cohesion: 0.04
Nodes (44): dependencies, clsx, date-fns, @daypicker/react, @fontsource-variable/nunito, gsap, pocketbase, react (+36 more)

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
Cohesion: 0.25
Nodes (10): CategoryDropdown(), getProductCategoryIds(), ProductCard(), getProductCategoryIds(), ProductDetail(), normalizeOldPrice(), ProductPrice(), useKeepForModalClose() (+2 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.10
Nodes (36): AppHeader(), applyRegularPeriodAuto(), computeTwoMonthEndDate(), computeYearEndDate(), getCurrentSessions(), getModeCopy(), getUnpaidSessions(), MembershipEditModal() (+28 more)

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
Cohesion: 0.13
Nodes (26): PostFormatToolbar(), buildPostMentionEl(), buildUserMentionEl(), deleteAdjacentMention(), ensureMentionCarets(), ensureMentionEditorChrome(), ensureMentionRemoveButton(), escapeHtml() (+18 more)

### Community 57 - "log.js"
Cohesion: 0.07
Nodes (72): PAD, ScheduleDateTimeSheet(), CalendarStrip(), buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining() (+64 more)

### Community 58 - "achievements.js"
Cohesion: 0.08
Nodes (51): PB_URL, carouselSlideKey(), FullscreenSlideImage(), getOriginRect(), getWindowWidth(), isImagePaintReady(), itemSlideId(), useYadiskLoadProgress() (+43 more)

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.06
Nodes (66): ForceUpdateOverlay(), AlertDialogContext, INITIAL_STATE, useAlertDialog(), CloseAppConfirmSheet(), FOCUSABLE_SELECTORS, Modal(), useToast() (+58 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.20
Nodes (19): formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput(), ProfileViewModal(), TRAINING_BADGE (+11 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.18
Nodes (19): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, getNotificationKind(), isMetaObject(), NotificationCard(), parseCommentReplyParentText() (+11 more)

### Community 67 - "media.js"
Cohesion: 0.13
Nodes (29): InfoTooltip(), Toggle(), buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal() (+21 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.06
Nodes (55): PostUploadContext, PostUploadProvider(), Avatar(), ModalFloatingCloseButton(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER (+47 more)

### Community 70 - "GalleryPage.jsx"
Cohesion: 0.57
Nodes (6): collectionExists(), ensureSystemTemplates(), findDefault(), interpolate(), listByChannel(), resolve()

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 77 - "AboutAppModal.jsx"
Cohesion: 0.33
Nodes (7): AboutAppModal(), openExternalUrl(), useAppVersionCheck(), APP_BUILD, APP_DISPLAY_VERSION, fetchRemoteAppVersion(), getVersionManifestUrl()

### Community 78 - "tournamentPosts.js"
Cohesion: 0.25
Nodes (12): TournamentPostUploadContext, TournamentPostUploadProvider(), applyTournamentPostSideEffects(), buildTournamentPostPayload(), deleteScheduledTournamentPost(), invalidateTournamentCaches(), publishScheduledTournamentPostNow(), publishTournamentPost() (+4 more)

### Community 79 - "isModerator"
Cohesion: 0.17
Nodes (18): isProductsKey(), ProductUploadContext, ProductUploadProvider(), useProductUpload(), SearchBar(), ShopPage(), useProducts(), addGalleryImage() (+10 more)

### Community 80 - "useMaxCloseGuard.js"
Cohesion: 0.20
Nodes (12): MentionSuggestPopup(), prefersReducedMotion(), getSwipeableTabs(), getWindowWidth(), IGNORE_SELECTOR, isTextFieldFocused(), shouldIgnoreTarget(), SWIPE_ALLOW_OVERLAY_SUFFIXES (+4 more)

### Community 81 - "GalleryPage.jsx"
Cohesion: 0.22
Nodes (15): useGalleryUpload(), GalleryMediaOverlay(), createGalleryUploadItem(), GalleryItemLike(), GalleryPage(), getAspectClass(), getImageAspectRatio(), getVideoAspectRatio() (+7 more)

### Community 82 - "main.jsx"
Cohesion: 0.28
Nodes (5): App(), AlertDialogProvider(), Toast(), ToastContext, ToastProvider()

### Community 83 - "error"
Cohesion: 0.19
Nodes (13): buildEditMediaItems(), CommentMediaBody(), MediaPreviewAlbumItem(), MediaPreviewGrid(), PostMedia(), useInFeedViewport(), useSwipeGallery(), FavoritesDropdownItem() (+5 more)

### Community 84 - "RatingPage.jsx"
Cohesion: 0.30
Nodes (14): getInitialUser(), useMaxAuth(), buildBannedUser(), clearBanInfo(), finalizeBannedUser(), initMaxAuth(), isUserBanned(), loadBanInfo() (+6 more)

### Community 85 - "FavoritesContext.jsx"
Cohesion: 0.31
Nodes (8): FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), useFavorites(), FavoriteIcon(), FavoritesDropdown(), adjustProductFavoritesCount()

### Community 86 - "overlayStack.js"
Cohesion: 0.36
Nodes (7): BlockedAppShell(), disableMaxVerticalSwipes(), isEditableFocus(), useMaxCloseGuard(), closeTopOverlay(), isSectionScrollAtTop(), scrollSectionToTop()

### Community 87 - "buyMessage.js"
Cohesion: 0.43
Nodes (6): BuyButton(), buildBuyMessage(), buildMaxUserChatUrl(), formatProductLine(), openMaxDeepLink(), openMaxUserChat()

### Community 88 - "LogsModal.jsx"
Cohesion: 0.16
Nodes (17): EmptyState(), ALL_CATEGORY_VALUES, formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), usePlayers() (+9 more)

### Community 89 - "BottomNav.jsx"
Cohesion: 0.47
Nodes (5): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, useTriggerAddAction()

### Community 90 - "postRichText.js"
Cohesion: 0.17
Nodes (20): PostLinkModal(), ALLOWED_ATTRS, ALLOWED_TAGS, applyHyperlink(), AUTOLINK_RE, AUTOLINK_TLDS, DEFAULT_PRESETS, escapeHtml() (+12 more)

### Community 91 - "gestures.js"
Cohesion: 0.16
Nodes (21): AvatarCropModal(), getCropCircle(), getImagePlacement(), CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput() (+13 more)

### Community 92 - "ProfilePage.jsx"
Cohesion: 0.20
Nodes (16): IconButton, MembershipIcon(), formatFreezeLogEntry(), formatMembershipDate(), getMembershipTypeLabel(), MembershipModal(), parseFreezeLog(), formatDate() (+8 more)

### Community 93 - "PostContentHtml.jsx"
Cohesion: 0.16
Nodes (12): MentionNavContext, MentionNavProvider(), applyMentionMissingStatuses(), postInflight, postMissingCache, resolvePostMissing(), resolveUserMissing(), userInflight (+4 more)

### Community 94 - "mention_notifications_lib.js"
Cohesion: 0.44
Nodes (10): alreadyNotified(), buildActorMeta(), diffNewIds(), extractUserMentionIds(), getRelationId(), notifyCommentMentions(), notifyMentionsForRecord(), notifyPostMentions() (+2 more)

### Community 95 - "GalleryCommentModal.jsx"
Cohesion: 0.36
Nodes (7): CommentSendButton(), GalleryCommentModal(), useGalleryComments(), createGalleryComment(), deleteGalleryComment(), listGalleryComments(), updateGalleryComment()

### Community 96 - "RatingPage.jsx"
Cohesion: 0.53
Nodes (7): RatingPage(), buildPlayerRanks(), getPlayerRatingRank(), getRatingPoints(), isRatingVisible(), buildManualPlayerPayload(), createPlayer()

### Community 97 - "normalizeHexColor"
Cohesion: 0.54
Nodes (7): FrameColorPicker(), hexToHsv(), hsvToHex(), applyAnimFrame(), loadFramePresets(), normalizeHexColor(), saveFramePresets()

### Community 98 - "GalleryUploadProvider.jsx"
Cohesion: 0.53
Nodes (5): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), createGalleryItemWithProgress()

### Community 99 - "App.jsx"
Cohesion: 0.18
Nodes (14): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, MAX_AUTH_URL, MAX_SELLER_URL, AdminPanelPage(), BlockedPage() (+6 more)

### Community 100 - "MembershipOverviewModal.jsx"
Cohesion: 0.53
Nodes (4): formatDateRangeLabel(), MembershipOverviewModal(), trainingCountsAsUsedSession(), useTrainings()

## Knowledge Gaps
- **139 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+134 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `log.js` to `Post Upload and UI Kit`, `notifications.js`, `gestures.js`, `datePickerUtils.js`, `achievements.js`, `yadiskAlbumLazy.js`, `catalog.js`, `ProfilePage.jsx`, `media.js`, `GalleryCommentModal.jsx`, `tournamentPosts.js`, `isModerator`, `GalleryPage.jsx`, `RatingPage.jsx`, `FavoritesContext.jsx`, `buyMessage.js`, `gestures.js`, `ProfilePage.jsx`, `GalleryCommentModal.jsx`, `RatingPage.jsx`, `GalleryUploadProvider.jsx`, `App.jsx`, `MembershipOverviewModal.jsx`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `react` connect `NPM Dependencies` to `yadiskAlbumLazy.js`, `GalleryCommentModal.jsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _139 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.063568010936432 - nodes in this community are weakly interconnected._
- **Should `notifications.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._
- **Should `Admin UI Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.1292929292929293 - nodes in this community are weakly interconnected._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._