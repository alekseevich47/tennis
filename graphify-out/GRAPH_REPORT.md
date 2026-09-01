# Graph Report - tennis  (2026-09-01)

## Corpus Check
- 297 files · ~264,277 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1543 nodes · 4736 edges · 116 communities (106 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 164 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `45a88f95`
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
- gestures.js
- commentListLayout.js
- mention_notifications_lib.js
- App.jsx
- videoPreviewUrl
- Avatar.jsx
- NotificationCard.jsx
- tournamentPosts.js
- PostContentHtml.jsx
- postMentions.js
- ProductForm.jsx
- FullscreenImageViewer.jsx
- error
- EmojiPicker.jsx
- PostRichTextField.jsx
- resolve
- MembershipOverviewModal.jsx
- AddActionContext.jsx
- normalizeHexColor
- SortableMediaPreviewGrid.jsx
- resolve
- useScheduledPosts.js

## God Nodes (most connected - your core abstractions)
1. `error` - 135 edges
2. `Modal()` - 48 edges
3. `useAlertDialog()` - 47 edges
4. `ProfileViewModal()` - 38 edges
5. `pb` - 36 edges
6. `isModerator()` - 33 edges
7. `Профиль` - 29 edges
8. `hasVisibleText()` - 27 edges
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

## Communities (116 total, 10 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.29
Nodes (17): autoUnfreezeUser(), createAppNotification(), formatDayMonthBoldRu(), getEffectiveEndDate(), gmt7Hour(), notifyFreeze(), notifyTopUp(), pad2() (+9 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.08
Nodes (50): PB_URL, FullscreenSlideImage(), isImagePaintReady(), useYadiskLoadProgress(), PinnedBanner(), usePinnedThumbUrl(), useFetchedOriginal(), publishAlbums() (+42 more)

### Community 3 - "notifications.js"
Cohesion: 0.20
Nodes (23): buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal(), getAudienceLabel(), NotificationSendModal() (+15 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.22
Nodes (13): applyRegularPeriodAuto(), computeTwoMonthEndDate(), computeYearEndDate(), getCurrentSessions(), getModeCopy(), getUnpaidSessions(), MembershipEditModal(), normalizeDateInput() (+5 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.21
Nodes (13): AlertDialogContext, INITIAL_STATE, FOCUSABLE_SELECTORS, Modal(), INITIAL, PlayerForm(), ensureModalOriginTracking(), getLastPointerOrigin() (+5 more)

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
Cohesion: 0.06
Nodes (52): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), htmlToReadableText(), looksLikeRichHtml() (+44 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.10
Nodes (32): AppHeader(), IconButton, MembershipIcon(), MembershipPeriodRangeField(), MembershipStartDateField(), ProfileSingleDateField(), FavoriteIcon(), DatePickerModal() (+24 more)

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
Cohesion: 0.20
Nodes (18): isMentionEl(), ALLOWED_ATTRS, ALLOWED_TAGS, AUTOLINK_RE, AUTOLINK_TLDS, DEFAULT_PRESETS, escapeHtml(), getEditorHtml() (+10 more)

### Community 57 - "log.js"
Cohesion: 0.16
Nodes (30): TrainingsPage(), canCancelBooking(), isModerator(), addPendingDeleteTrainingId(), assertMembershipSessionAvailable(), assertNotBotBlocked(), bookTraining(), bookUsersToTraining() (+22 more)

### Community 58 - "achievements.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.19
Nodes (17): useFavorites(), buildEditMediaItems(), CommentMediaBody(), PostMedia(), useInFeedViewport(), FavoritesDropdown(), FavoritesDropdownItem(), ProductCard() (+9 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.13
Nodes (26): Spinner(), MODES, StatsAchievementsModal(), hasAnyActivity(), SLICES, StatsBookingModal(), StatsMetricTitle(), formatDateRangeLabel() (+18 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.30
Nodes (14): getInitialUser(), useMaxAuth(), buildBannedUser(), clearBanInfo(), finalizeBannedUser(), getCurrentUser(), initMaxAuth(), isUserBanned() (+6 more)

### Community 67 - "media.js"
Cohesion: 0.06
Nodes (61): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+53 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.26
Nodes (13): getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments(), TournamentPostCard(), TournamentPostDetailModal(), PostCard() (+5 more)

### Community 70 - "useFetchedOriginal.js"
Cohesion: 0.50
Nodes (7): groupCommentsByDay(), groupItemsByDay(), mapCommentsWithDaySeparators(), mapItemsWithDaySeparators(), mapPostsWithDaySeparators(), dayKey(), formatCommentDaySeparator()

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 77 - "NotificationSettingsModal.jsx"
Cohesion: 0.25
Nodes (11): maybeTranscodePostVideo(), PostUploadContext, PostUploadProvider(), prependPostToFeed(), revalidatePosts(), TournamentPostUploadContext, TournamentPostUploadProvider(), AlertDialogProvider() (+3 more)

### Community 78 - "tournamentPosts.js"
Cohesion: 0.16
Nodes (17): PostCardLike(), usePostLikes(), usePosts(), createCommentWithProgress(), createPostWithProgress(), deleteScheduledPost(), listPostLikes(), listPosts() (+9 more)

### Community 79 - "isModerator"
Cohesion: 0.06
Nodes (71): usePostUpload(), useTournamentPostUpload(), EmptyState(), PullToRefresh(), ScrollToTopButton(), FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton() (+63 more)

### Community 80 - "useMaxCloseGuard.js"
Cohesion: 0.15
Nodes (16): BlockedAppShell(), disableMaxVerticalSwipes(), isEditableFocus(), useMaxCloseGuard(), getSwipeableTabs(), getWindowWidth(), IGNORE_SELECTOR, isTextFieldFocused() (+8 more)

### Community 81 - "PostUploadProvider.jsx"
Cohesion: 0.40
Nodes (8): TournamentCommentsSection(), useTournamentComments(), buildTournamentCommentMediaReorderFormData(), createTournamentComment(), createTournamentCommentWithProgress(), hardDeleteTournamentComment(), listCommentsForTournamentPost(), updateTournamentComment()

### Community 82 - "postRichText.js"
Cohesion: 0.33
Nodes (6): InfoTooltip(), Toggle(), NotificationSettingsModal(), SETTINGS_ROWS, getNotificationSettings(), updateNotificationSettings()

### Community 83 - "yadiskAlbumLazy.js"
Cohesion: 0.18
Nodes (27): react, useAlertDialog(), CreateTournamentPostModal(), EditTournamentPostModal(), AttachButtons(), CommentComposeForm(), areStringArraysEqual(), CommentEditInlineForm() (+19 more)

### Community 84 - "ArchiveModal.jsx"
Cohesion: 0.29
Nodes (10): buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue(), areTrainingValuesEqual() (+2 more)

### Community 85 - "ProductForm.jsx"
Cohesion: 0.22
Nodes (14): ModalFloatingCloseButton(), findScrollParent(), keepCommentEditInView(), restoreAndKeepCommentEditInView(), PostDetailModal(), useCommentLikes(), useComments(), buildCommentMediaReorderFormData() (+6 more)

### Community 86 - "PostMedia.jsx"
Cohesion: 0.14
Nodes (29): canAuthTranscode(), chooseTranscodeMode(), diffNewFiles(), execFfmpeg(), ffmpegBin(), ffmpegErrorOutput(), ffmpegRemux(), ffmpegTranscodeNoScale() (+21 more)

### Community 87 - "buyMessage.js"
Cohesion: 0.27
Nodes (12): CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput(), OnboardingTutorial(), padHighlightRect(), scrollTargetIntoView() (+4 more)

### Community 88 - "format.js"
Cohesion: 0.15
Nodes (9): Avatar(), CommentListItem(), CommentReplyButton(), CommentReplyComposeBar(), CommentReplyQuote(), CommentSwipeReply(), isInteractiveTapTarget(), useCommentTapCopy() (+1 more)

### Community 89 - "CompetitionsPage.jsx"
Cohesion: 0.31
Nodes (6): formatBirthDate(), formatDayTitle(), StatsGrowthModal(), StatsLineChart(), formatPostDate(), fetchStatsGrowthDay()

### Community 90 - "postRichText.js"
Cohesion: 0.22
Nodes (18): formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput(), ProfileViewModal(), TRAINING_BADGE (+10 more)

### Community 91 - "gestures.js"
Cohesion: 0.29
Nodes (8): App(), AboutAppModal(), openExternalUrl(), useAppVersionCheck(), APP_BUILD, APP_DISPLAY_VERSION, fetchRemoteAppVersion(), getVersionManifestUrl()

### Community 92 - "gestures.js"
Cohesion: 0.15
Nodes (14): AvatarCropModal(), getCropCircle(), getImagePlacement(), CommentContextMenu(), carouselSlideKey(), ProductGallery(), slideId(), useGalleryNavigation() (+6 more)

### Community 93 - "commentListLayout.js"
Cohesion: 0.20
Nodes (15): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), getTrainingStatusForUser(), getUserPastTrainings(), TrainingCard(), TrainingDetailModal(), useKeepForModalClose() (+7 more)

### Community 94 - "mention_notifications_lib.js"
Cohesion: 0.44
Nodes (10): alreadyNotified(), buildActorMeta(), diffNewIds(), extractUserMentionIds(), getRelationId(), notifyCommentMentions(), notifyMentionsForRecord(), notifyPostMentions() (+2 more)

### Community 95 - "App.jsx"
Cohesion: 0.17
Nodes (14): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, CloseAppConfirmSheet(), MAX_AUTH_URL, MAX_SELLER_URL, MentionNavProvider() (+6 more)

### Community 96 - "videoPreviewUrl"
Cohesion: 0.15
Nodes (9): FeedVideoPreview(), FullscreenSlideVideo(), MediaPreviewAlbumItem(), MediaPreviewGrid(), formatRemainingTime(), PostDetailVideoPreview(), useSwipeGallery(), videoPreviewUrl() (+1 more)

### Community 98 - "NotificationCard.jsx"
Cohesion: 0.23
Nodes (16): CLICK_ACTION_LABELS, getNotificationKind(), isMetaObject(), NotificationCard(), parseCommentReplyParentText(), NotificationsDropdown(), useTrainings(), formatRelativeTime() (+8 more)

### Community 100 - "tournamentPosts.js"
Cohesion: 0.19
Nodes (16): Toast(), ToastContext, ToastProvider(), useToast(), formatFreezeLogEntry(), formatMembershipDate(), getMembershipTypeLabel(), MembershipModal() (+8 more)

### Community 101 - "PostContentHtml.jsx"
Cohesion: 0.16
Nodes (14): handleContentCopy(), plainTextFromRange(), applyMentionMissingStatuses(), isPostMissing(), postInflight, postMissingCache, resolvePostMissing(), resolveUserMissing() (+6 more)

### Community 103 - "postMentions.js"
Cohesion: 0.22
Nodes (17): buildUserMentionEl(), deleteAdjacentMention(), ensureMentionCarets(), ensureMentionEditorChrome(), ensureMentionRemoveButton(), escapeHtml(), findAdjacentMention(), findMentionInSelectionRange() (+9 more)

### Community 104 - "ProductForm.jsx"
Cohesion: 0.25
Nodes (14): areStringArraysEqual(), areStringSetsEqual(), INITIAL, parseOptionalOldPrice(), parsePrice(), ProductForm(), areProductColorsEqual(), areProductParametersEqual() (+6 more)

### Community 105 - "FullscreenImageViewer.jsx"
Cohesion: 0.21
Nodes (10): ForceUpdateOverlay(), carouselSlideKey(), FullscreenImageViewer(), getOriginRect(), getWindowWidth(), itemSlideId(), CategoryDropdown(), useOverlayClose() (+2 more)

### Community 106 - "error"
Cohesion: 0.21
Nodes (12): FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), isUserBookingDisabled(), UserPickerModal(), CreateTrainingModal(), INITIAL_FORM (+4 more)

### Community 107 - "EmojiPicker.jsx"
Cohesion: 0.22
Nodes (10): DEFAULT_FREQUENT_EMOJIS, EMOJI_CATEGORIES, CATEGORY_ICONS, EmojiPicker(), prefersReducedMotion(), pushRecentEmoji(), readRecentEmojis(), MentionSuggestPopup() (+2 more)

### Community 108 - "PostRichTextField.jsx"
Cohesion: 0.17
Nodes (11): PostFormatToolbar(), PostLinkModal(), buildPostMentionEl(), searchMentionPosts(), searchMentionUsers(), applyFormatCommand(), applyHyperlink(), ensureFrameCarets() (+3 more)

### Community 109 - "resolve"
Cohesion: 0.28
Nodes (12): applyTournamentPostSideEffects(), buildTournamentPostPayload(), deleteScheduledTournamentPost(), hardDeleteTournamentPost(), invalidateTournamentCaches(), publishScheduledTournamentPostNow(), publishTournamentPost(), publishTournamentPostWithProgress() (+4 more)

### Community 110 - "MembershipOverviewModal.jsx"
Cohesion: 0.23
Nodes (7): AdminPanelPage(), METRICS, StatisticsHubModal(), SystemTemplatesModal(), TemplateListButton(), listSystemTemplates(), updateSystemTemplate()

### Community 111 - "AddActionContext.jsx"
Cohesion: 0.27
Nodes (8): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, AddActionContext, AddActionProvider(), DEFAULT_API, useTriggerAddAction()

### Community 112 - "normalizeHexColor"
Cohesion: 0.44
Nodes (8): FrameColorPicker(), hexToHsv(), hsvToHex(), applyAnimFrame(), loadFramePresets(), normalizeHexColor(), saveFramePresets(), ProductVariantFields()

### Community 113 - "SortableMediaPreviewGrid.jsx"
Cohesion: 0.36
Nodes (8): MediaProgressRing(), computeGridDropIndex(), computeStripDropIndex(), findStripScrollParent(), isTouchPointer(), moveKeyToIndex(), prefersReducedMotion(), SortableMediaPreviewGrid()

### Community 114 - "resolve"
Cohesion: 0.57
Nodes (6): collectionExists(), ensureSystemTemplates(), findDefault(), interpolate(), listByChannel(), resolve()

### Community 115 - "useScheduledPosts.js"
Cohesion: 0.83
Nodes (3): useScheduledPosts(), listScheduledPosts(), listScheduledTournamentPosts()

## Knowledge Gaps
- **141 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `error` to `Post Upload and UI Kit`, `notifications.js`, `Admin UI Controls`, `gestures.js`, `log.js`, `achievements.js`, `ProfilePage.jsx`, `media.js`, `GalleryCommentModal.jsx`, `NotificationSettingsModal.jsx`, `tournamentPosts.js`, `isModerator`, `PostUploadProvider.jsx`, `postRichText.js`, `yadiskAlbumLazy.js`, `ArchiveModal.jsx`, `ProductForm.jsx`, `buyMessage.js`, `postRichText.js`, `commentListLayout.js`, `App.jsx`, `NotificationCard.jsx`, `tournamentPosts.js`, `FullscreenImageViewer.jsx`, `resolve`, `MembershipOverviewModal.jsx`, `useScheduledPosts.js`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `Modal()` connect `auditEventFormat.js` to `notifications.js`, `Admin UI Controls`, `gestures.js`, `datePickerUtils.js`, `yadiskAlbumLazy.js`, `catalog.js`, `media.js`, `GalleryCommentModal.jsx`, `isModerator`, `postRichText.js`, `yadiskAlbumLazy.js`, `ArchiveModal.jsx`, `ProductForm.jsx`, `CompetitionsPage.jsx`, `postRichText.js`, `gestures.js`, `gestures.js`, `commentListLayout.js`, `App.jsx`, `tournamentPosts.js`, `ProductForm.jsx`, `FullscreenImageViewer.jsx`, `error`, `PostRichTextField.jsx`, `MembershipOverviewModal.jsx`, `normalizeHexColor`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `react` connect `yadiskAlbumLazy.js` to `NPM Dependencies`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _141 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.0847457627118644 - nodes in this community are weakly interconnected._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Stats Library Helpers` be split into smaller, more focused modules?**
  _Cohesion score 0.14204545454545456 - nodes in this community are weakly interconnected._