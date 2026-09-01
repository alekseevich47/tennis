# Graph Report - tennis  (2026-09-01)

## Corpus Check
- 297 files · ~264,408 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1545 nodes · 4740 edges · 105 communities (95 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 164 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c825652`
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
- yadiskAlbumLazy.js
- ArchiveModal.jsx
- PostMedia.jsx
- buyMessage.js
- format.js
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
- MembershipOverviewModal.jsx
- SortableMediaPreviewGrid.jsx

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

## Communities (105 total, 10 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.29
Nodes (17): autoUnfreezeUser(), createAppNotification(), formatDayMonthBoldRu(), getEffectiveEndDate(), gmt7Hour(), notifyFreeze(), notifyTopUp(), pad2() (+9 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.16
Nodes (27): PinnedBanner(), usePinnedThumbUrl(), getFirstLine(), publishAlbums(), useResolvedExternalMedia(), cache, getYadiskAlbumCache(), listeners (+19 more)

### Community 3 - "notifications.js"
Cohesion: 0.09
Nodes (43): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, AddActionContext, AddActionProvider(), DEFAULT_API, useRegisterAddAction() (+35 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.12
Nodes (19): MAX_AUTH_URL, PB_URL, applyRegularPeriodAuto(), computeTwoMonthEndDate(), computeYearEndDate(), getCurrentSessions(), getModeCopy(), getUnpaidSessions() (+11 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.24
Nodes (14): filterProfileTrainings(), formatDateRangeLabel(), ProfileTrainingsSearch(), ArchiveModal(), formatDateRangeLabel(), getArchiveDefaultDateRange(), findRussianMonth(), isDateQueryParsed() (+6 more)

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
Cohesion: 0.17
Nodes (21): AuditEventRow(), htmlToReadableText(), looksLikeRichHtml(), toPlainText(), CATEGORY_STYLES, COMMENT_OBJECT_TYPES, COMMENT_SECTION_LABELS, COMMENT_TYPE_LABELS (+13 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.12
Nodes (28): AppHeader(), MembershipIcon(), MembershipPeriodRangeField(), MembershipStartDateField(), ProfileSingleDateField(), FavoriteIcon(), DatePickerModal(), DateRangeModal() (+20 more)

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
Cohesion: 0.24
Nodes (12): PAD, ScheduleDateTimeSheet(), CalendarStrip(), DAYS_FULL, DAYS_SHORT, formatScheduleDayWheelLabel(), formatScheduleSendLabel(), generateNextDays() (+4 more)

### Community 57 - "log.js"
Cohesion: 0.13
Nodes (40): formatDayTitle(), StatsTrainingsCountModal(), TrainingCard(), TrainingDetailModal(), TrainingsPage(), canCancelBooking(), formatCardDate(), formatTimeRange() (+32 more)

### Community 58 - "achievements.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.18
Nodes (18): useFavorites(), CommentMediaBody(), PostMedia(), useInFeedViewport(), FavoritesDropdown(), FavoritesDropdownItem(), ProductCard(), normalizeProductCategoryIds() (+10 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.05
Nodes (66): EmptyState(), IconButton, InfoTooltip(), FOCUSABLE_SELECTORS, Modal(), Spinner(), Toggle(), ALL_CATEGORY_VALUES (+58 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.24
Nodes (18): CreateTrainingModal(), INITIAL_FORM, getInitialUser(), useMaxAuth(), error, buildBannedUser(), clearBanInfo(), finalizeBannedUser() (+10 more)

### Community 67 - "media.js"
Cohesion: 0.06
Nodes (60): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+52 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.23
Nodes (10): react, AttachButtons(), areStringArraysEqual(), buildEditMediaItems(), CommentEditInlineForm(), AddImageModal(), compressImage(), hasTransparency() (+2 more)

### Community 70 - "useFetchedOriginal.js"
Cohesion: 0.50
Nodes (7): groupItemsByDay(), groupPostsByDay(), mapCommentsWithDaySeparators(), mapItemsWithDaySeparators(), mapPostsWithDaySeparators(), dayKey(), formatCommentDaySeparator()

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 77 - "NotificationSettingsModal.jsx"
Cohesion: 0.07
Nodes (45): App(), maybeTranscodePostVideo(), PostUploadContext, PostUploadProvider(), prependPostToFeed(), revalidatePosts(), TournamentPostUploadContext, TournamentPostUploadProvider() (+37 more)

### Community 78 - "tournamentPosts.js"
Cohesion: 0.28
Nodes (3): ScheduledPostRow(), formatScheduleDispatchHeading(), formatScheduleTimeBadge()

### Community 79 - "isModerator"
Cohesion: 0.11
Nodes (31): usePostUpload(), useTournamentPostUpload(), PullToRefresh(), ScrollToTopButton(), FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton() (+23 more)

### Community 80 - "useMaxCloseGuard.js"
Cohesion: 0.10
Nodes (26): BlockedAppShell(), DEFAULT_FREQUENT_EMOJIS, EMOJI_CATEGORIES, CATEGORY_ICONS, EmojiPicker(), prefersReducedMotion(), pushRecentEmoji(), readRecentEmojis() (+18 more)

### Community 81 - "PostUploadProvider.jsx"
Cohesion: 0.43
Nodes (6): useFetchedOriginal(), blobFromResponse(), blobUrlCache, fetchBlobUrlWithProgress(), getCachedMediaBlobUrl(), inflight

### Community 83 - "yadiskAlbumLazy.js"
Cohesion: 0.21
Nodes (24): useAlertDialog(), CreateTournamentPostModal(), EditTournamentPostModal(), CommentComposeForm(), CreatePostModal(), EditPostModal(), FullscreenImageViewer(), PostAttachButton() (+16 more)

### Community 84 - "ArchiveModal.jsx"
Cohesion: 0.29
Nodes (10): buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue(), areTrainingValuesEqual() (+2 more)

### Community 86 - "PostMedia.jsx"
Cohesion: 0.13
Nodes (31): canAuthTranscode(), chooseTranscodeMode(), diffNewFiles(), execFfmpeg(), ffmpegBin(), ffmpegErrorOutput(), ffmpegRemux(), ffmpegTranscodeNoScale() (+23 more)

### Community 87 - "buyMessage.js"
Cohesion: 0.27
Nodes (12): CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput(), OnboardingTutorial(), padHighlightRect(), scrollTargetIntoView() (+4 more)

### Community 88 - "format.js"
Cohesion: 0.05
Nodes (63): Avatar(), ModalFloatingCloseButton(), useMentionNav(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium() (+55 more)

### Community 90 - "postRichText.js"
Cohesion: 0.20
Nodes (20): formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput(), ProfileViewModal(), TRAINING_BADGE (+12 more)

### Community 91 - "gestures.js"
Cohesion: 0.33
Nodes (7): AboutAppModal(), openExternalUrl(), useAppVersionCheck(), APP_BUILD, APP_DISPLAY_VERSION, fetchRemoteAppVersion(), getVersionManifestUrl()

### Community 92 - "gestures.js"
Cohesion: 0.11
Nodes (19): AvatarCropModal(), getCropCircle(), getImagePlacement(), ForceUpdateOverlay(), CommentContextMenu(), PostContextMenu(), ScheduledPostActionsMenu(), CategoryDropdown() (+11 more)

### Community 93 - "commentListLayout.js"
Cohesion: 0.29
Nodes (11): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, getNotificationKind(), isMetaObject(), NotificationCard(), parseCommentReplyParentText() (+3 more)

### Community 94 - "mention_notifications_lib.js"
Cohesion: 0.44
Nodes (10): alreadyNotified(), buildActorMeta(), diffNewIds(), extractUserMentionIds(), getRelationId(), notifyCommentMentions(), notifyMentionsForRecord(), notifyPostMentions() (+2 more)

### Community 95 - "App.jsx"
Cohesion: 0.19
Nodes (12): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, CloseAppConfirmSheet(), MentionNavContext, MentionNavProvider(), AdminPanelPage() (+4 more)

### Community 96 - "videoPreviewUrl"
Cohesion: 0.15
Nodes (9): FeedVideoPreview(), FullscreenSlideVideo(), MediaPreviewAlbumItem(), MediaPreviewGrid(), formatRemainingTime(), PostDetailVideoPreview(), useSwipeGallery(), videoPreviewUrl() (+1 more)

### Community 98 - "NotificationCard.jsx"
Cohesion: 0.32
Nodes (10): NotificationsDropdown(), useTrainings(), clearAllNotifications(), deleteNotification(), isDeletableNotification(), listNotifications(), requestCommentReplyNotification(), SESSIONS_LEFT_COPY (+2 more)

### Community 100 - "tournamentPosts.js"
Cohesion: 0.14
Nodes (27): Toast(), ToastContext, useToast(), MAX_SELLER_URL, BlockedPage(), formatFreezeLogEntry(), formatMembershipDate(), getMembershipTypeLabel() (+19 more)

### Community 101 - "PostContentHtml.jsx"
Cohesion: 0.27
Nodes (9): applyMentionMissingStatuses(), isPostMissing(), postInflight, postMissingCache, resolvePostMissing(), resolveUserMissing(), userInflight, userMissingCache (+1 more)

### Community 103 - "postMentions.js"
Cohesion: 0.08
Nodes (52): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), buildPostMentionEl(), buildUserMentionEl(), deleteAdjacentMention() (+44 more)

### Community 104 - "ProductForm.jsx"
Cohesion: 0.25
Nodes (14): areStringArraysEqual(), areStringSetsEqual(), INITIAL, parseOptionalOldPrice(), parsePrice(), ProductForm(), areProductColorsEqual(), areProductParametersEqual() (+6 more)

### Community 105 - "FullscreenImageViewer.jsx"
Cohesion: 0.15
Nodes (19): carouselSlideKey(), FullscreenSlideImage(), getOriginRect(), getWindowWidth(), isImagePaintReady(), itemSlideId(), useYadiskLoadProgress(), cache (+11 more)

### Community 110 - "MembershipOverviewModal.jsx"
Cohesion: 0.25
Nodes (6): AlertDialogContext, INITIAL_STATE, SystemTemplatesModal(), TemplateListButton(), listSystemTemplates(), updateSystemTemplate()

### Community 113 - "SortableMediaPreviewGrid.jsx"
Cohesion: 0.36
Nodes (8): MediaProgressRing(), computeGridDropIndex(), computeStripDropIndex(), findStripScrollParent(), isTouchPointer(), moveKeyToIndex(), prefersReducedMotion(), SortableMediaPreviewGrid()

## Knowledge Gaps
- **141 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `ProfilePage.jsx` to `Post Upload and UI Kit`, `notifications.js`, `Admin UI Controls`, `log.js`, `achievements.js`, `yadiskAlbumLazy.js`, `catalog.js`, `media.js`, `NotificationSettingsModal.jsx`, `tournamentPosts.js`, `isModerator`, `yadiskAlbumLazy.js`, `ArchiveModal.jsx`, `buyMessage.js`, `format.js`, `postRichText.js`, `App.jsx`, `NotificationCard.jsx`, `tournamentPosts.js`, `MembershipOverviewModal.jsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `Modal()` connect `catalog.js` to `notifications.js`, `Admin UI Controls`, `datePickerUtils.js`, `log.js`, `yadiskAlbumLazy.js`, `ProfilePage.jsx`, `media.js`, `GalleryCommentModal.jsx`, `tournamentPosts.js`, `yadiskAlbumLazy.js`, `ArchiveModal.jsx`, `format.js`, `postRichText.js`, `gestures.js`, `gestures.js`, `App.jsx`, `tournamentPosts.js`, `postMentions.js`, `ProductForm.jsx`, `MembershipOverviewModal.jsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `react` connect `GalleryCommentModal.jsx` to `NPM Dependencies`, `yadiskAlbumLazy.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _141 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `notifications.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08944793850454227 - nodes in this community are weakly interconnected._
- **Should `Admin UI Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.11954022988505747 - nodes in this community are weakly interconnected._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._