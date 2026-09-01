# Graph Report - tennis  (2026-09-01)

## Corpus Check
- 298 files · ~265,197 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1554 nodes · 4774 edges · 113 communities (103 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 164 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `69528e89`
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
- tournamentPosts.js
- PostContentHtml.jsx
- postMentions.js
- ProductForm.jsx
- FullscreenImageViewer.jsx
- StatsLineChart.jsx
- compressImage
- Modal.jsx
- Avatar.jsx
- normalizeHexColor
- commentListLayout.js
- StatsTrainingsCountModal.jsx

## God Nodes (most connected - your core abstractions)
1. `error` - 135 edges
2. `Modal()` - 48 edges
3. `useAlertDialog()` - 47 edges
4. `ProfileViewModal()` - 38 edges
5. `pb` - 36 edges
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

## Communities (113 total, 10 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.29
Nodes (17): autoUnfreezeUser(), createAppNotification(), formatDayMonthBoldRu(), getEffectiveEndDate(), gmt7Hour(), notifyFreeze(), notifyTopUp(), pad2() (+9 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.09
Nodes (46): PinnedBanner(), usePinnedThumbUrl(), useFetchedOriginal(), publishAlbums(), useResolvedExternalMedia(), cache, getYadiskAlbumCache(), listeners (+38 more)

### Community 3 - "notifications.js"
Cohesion: 0.19
Nodes (10): ForceUpdateOverlay(), CommentContextMenu(), PAD, ScheduleDateTimeSheet(), ScheduledPostActionsMenu(), useOverlayClose(), formatScheduleDayWheelLabel(), formatScheduleSendLabel() (+2 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.24
Nodes (20): buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal(), getAudienceLabel(), NotificationSendModal() (+12 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.18
Nodes (20): buildPostMentionEl(), buildUserMentionEl(), deleteAdjacentMention(), ensureMentionCarets(), ensureMentionEditorChrome(), ensureMentionRemoveButton(), escapeHtml(), findAdjacentMention() (+12 more)

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
Cohesion: 0.14
Nodes (27): AppHeader(), MembershipPeriodRangeField(), MembershipStartDateField(), ProfileSingleDateField(), FavoritesDropdown(), DatePickerModal(), DateRangeModal(), formatRangeHint() (+19 more)

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
Nodes (6): PostAttachButton(), PostScheduleButton(), PublishLongPressMenu(), useScheduledPosts(), listScheduledPosts(), listScheduledTournamentPosts()

### Community 57 - "log.js"
Cohesion: 0.10
Nodes (49): AppMain(), CalendarStrip(), TrainingCard(), TrainingDetailModal(), TrainingsPage(), canCancelBooking(), dayKey(), DAYS_FULL (+41 more)

### Community 58 - "achievements.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.07
Nodes (51): FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), useFavorites(), buildEditMediaItems(), CommentMediaBody(), FeedVideoPreview() (+43 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.15
Nodes (22): MODES, StatsAchievementsModal(), hasAnyActivity(), SLICES, StatsBookingModal(), StatsMetricTitle(), formatDateRangeLabel(), getStatsDefaultDateRange() (+14 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.17
Nodes (23): isUserBookingDisabled(), UserPickerModal(), CreateTrainingModal(), INITIAL_FORM, getInitialUser(), useMaxAuth(), useTrainings(), error (+15 more)

### Community 67 - "media.js"
Cohesion: 0.06
Nodes (54): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+46 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.47
Nodes (8): useRegisterAddAction(), RatingPage(), buildPlayerRanks(), getPlayerRatingRank(), getRatingPoints(), isRatingVisible(), buildManualPlayerPayload(), createPlayer()

### Community 70 - "useFetchedOriginal.js"
Cohesion: 0.15
Nodes (17): PostCardLike(), usePostLikes(), usePosts(), createComment(), createCommentWithProgress(), createPost(), createPostWithProgress(), deleteScheduledPost() (+9 more)

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 77 - "NotificationSettingsModal.jsx"
Cohesion: 0.17
Nodes (15): App(), maybeTranscodePostVideo(), PostUploadContext, PostUploadProvider(), prependPostToFeed(), revalidatePosts(), TournamentPostUploadContext, TournamentPostUploadProvider() (+7 more)

### Community 78 - "tournamentPosts.js"
Cohesion: 0.23
Nodes (10): groupCommentsByDay(), CommentSendButton(), DayGroup(), DaySeparator(), GalleryCommentModal(), useGalleryComments(), createGalleryComment(), deleteGalleryComment() (+2 more)

### Community 79 - "isModerator"
Cohesion: 0.15
Nodes (25): usePostUpload(), useTournamentPostUpload(), ScrollToTopButton(), FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton(), CompetitionsPage() (+17 more)

### Community 80 - "useMaxCloseGuard.js"
Cohesion: 0.07
Nodes (33): BlockedAppShell(), PullToRefresh(), DEFAULT_FREQUENT_EMOJIS, EMOJI_CATEGORIES, CATEGORY_ICONS, EmojiPicker(), prefersReducedMotion(), pushRecentEmoji() (+25 more)

### Community 81 - "PostUploadProvider.jsx"
Cohesion: 0.26
Nodes (11): ModalFloatingCloseButton(), findScrollParent(), keepCommentEditInView(), restoreAndKeepCommentEditInView(), PostDetailModal(), useComments(), useKeepForModalClose(), buildCommentMediaReorderFormData() (+3 more)

### Community 82 - "main.jsx"
Cohesion: 0.24
Nodes (12): applyRegularPeriodAuto(), computeTwoMonthEndDate(), computeYearEndDate(), getCurrentSessions(), getModeCopy(), getUnpaidSessions(), MembershipEditModal(), normalizeDateInput() (+4 more)

### Community 83 - "yadiskAlbumLazy.js"
Cohesion: 0.34
Nodes (15): CreateTournamentPostModal(), EditTournamentPostModal(), AttachButtons(), CommentComposeForm(), areStringArraysEqual(), CommentEditInlineForm(), CreatePostModal(), EditPostModal() (+7 more)

### Community 84 - "ArchiveModal.jsx"
Cohesion: 0.29
Nodes (10): buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue(), areTrainingValuesEqual() (+2 more)

### Community 85 - "PullToRefresh.jsx"
Cohesion: 0.11
Nodes (19): react, Toast(), ToastContext, useToast(), TemplateListButton(), CommentListItem(), CommentReplyButton(), CommentSwipeReply() (+11 more)

### Community 86 - "PostMedia.jsx"
Cohesion: 0.11
Nodes (38): bytesToText(), canAuthTranscode(), chooseTranscodeMode(), cmdStdoutText(), diffNewFiles(), ensureFileMode(), execFfmpeg(), fallbackModeForPath() (+30 more)

### Community 87 - "buyMessage.js"
Cohesion: 0.21
Nodes (9): Spinner(), formatBirthDate(), formatDayTitle(), StatsGrowthModal(), StatsLineChart(), MentionSuggestPopup(), prefersReducedMotion(), formatPostDate() (+1 more)

### Community 88 - "format.js"
Cohesion: 0.28
Nodes (12): getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments(), TournamentPostCard(), TournamentPostDetailModal(), PostCard() (+4 more)

### Community 89 - "usePlayers"
Cohesion: 0.17
Nodes (15): useMentionNav(), commentHasAttachments(), CommentsPreview(), handleContentCopy(), plainTextFromRange(), applyMentionMissingStatuses(), postInflight, postMissingCache (+7 more)

### Community 90 - "postRichText.js"
Cohesion: 0.19
Nodes (19): MembershipIcon(), formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput(), ProfileViewModal() (+11 more)

### Community 91 - "gestures.js"
Cohesion: 0.24
Nodes (11): getCollapsedLabel(), isUserChecked(), UserMultiSelect(), getTrainingStatusForUser(), getUserPastTrainings(), formatDateRangeLabel(), MembershipOverviewModal(), trainingCountsAsUsedSession() (+3 more)

### Community 92 - "gestures.js"
Cohesion: 0.23
Nodes (10): AvatarCropModal(), getCropCircle(), getImagePlacement(), PostContextMenu(), resolvePanLimits(), usePinchZoom(), backdropOpacityForDrag(), clamp() (+2 more)

### Community 93 - "commentListLayout.js"
Cohesion: 0.17
Nodes (21): isPostMissing(), formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, getNotificationKind(), isMetaObject(), NotificationCard() (+13 more)

### Community 94 - "mention_notifications_lib.js"
Cohesion: 0.44
Nodes (10): alreadyNotified(), buildActorMeta(), diffNewIds(), extractUserMentionIds(), getRelationId(), notifyCommentMentions(), notifyMentionsForRecord(), notifyPostMentions() (+2 more)

### Community 95 - "App.jsx"
Cohesion: 0.06
Nodes (47): AppInner(), getInitialFavoriteProductIds(), TAB_TITLES, ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, CloseAppConfirmSheet() (+39 more)

### Community 96 - "videoPreviewUrl"
Cohesion: 0.27
Nodes (12): TournamentCommentsSection(), useCommentLikes(), useTournamentComments(), listCommentLikes(), toggleCommentLike(), buildTournamentCommentMediaReorderFormData(), createTournamentComment(), createTournamentCommentWithProgress() (+4 more)

### Community 98 - "NotificationCard.jsx"
Cohesion: 0.29
Nodes (10): carouselSlideKey(), FullscreenImageViewer(), FullscreenSlideImage(), getOriginRect(), getWindowWidth(), isImagePaintReady(), isTouchNavDevice(), itemSlideId() (+2 more)

### Community 100 - "tournamentPosts.js"
Cohesion: 0.16
Nodes (22): EmptyState(), IconButton, formatDate(), getTrainingTitle(), normalizeDateInput(), ProfilePage(), TRAINING_BADGE, filterProfileTrainings() (+14 more)

### Community 101 - "PostContentHtml.jsx"
Cohesion: 0.67
Nodes (5): formatFreezeLogEntry(), formatMembershipDate(), getMembershipTypeLabel(), MembershipModal(), parseFreezeLog()

### Community 103 - "postMentions.js"
Cohesion: 0.12
Nodes (27): PostFormatToolbar(), PostLinkModal(), searchMentionUsers(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame(), applyFormatCommand(), applyHyperlink() (+19 more)

### Community 104 - "ProductForm.jsx"
Cohesion: 0.24
Nodes (13): useTournamentPosts(), applyTournamentPostSideEffects(), buildTournamentPostPayload(), deleteScheduledTournamentPost(), hardDeleteTournamentPost(), invalidateTournamentCaches(), listTournamentPosts(), publishScheduledTournamentPostNow() (+5 more)

### Community 105 - "FullscreenImageViewer.jsx"
Cohesion: 0.21
Nodes (9): InfoTooltip(), Toggle(), AdminPanelPage(), NotificationSettingsModal(), SETTINGS_ROWS, METRICS, StatisticsHubModal(), getNotificationSettings() (+1 more)

### Community 106 - "StatsLineChart.jsx"
Cohesion: 0.36
Nodes (8): MediaProgressRing(), computeGridDropIndex(), computeStripDropIndex(), findStripScrollParent(), isTouchPointer(), moveKeyToIndex(), prefersReducedMotion(), SortableMediaPreviewGrid()

### Community 107 - "compressImage"
Cohesion: 0.19
Nodes (10): AlertDialogContext, INITIAL_STATE, useAlertDialog(), SystemTemplatesModal(), AddImageModal(), compressImage(), hasTransparency(), withExtension() (+2 more)

### Community 108 - "Modal.jsx"
Cohesion: 0.27
Nodes (11): FOCUSABLE_SELECTORS, Modal(), INITIAL, PlayerForm(), ensureModalOriginTracking(), getLastPointerOrigin(), getModalCollapseTransform(), onPointerDown() (+3 more)

### Community 109 - "Avatar.jsx"
Cohesion: 0.24
Nodes (4): Avatar(), CommentReplyComposeBar(), CommentReplyQuote(), getUserAvatarData()

### Community 110 - "normalizeHexColor"
Cohesion: 0.53
Nodes (7): FrameColorPicker(), hexToHsv(), hsvToHex(), loadFramePresets(), normalizeHexColor(), saveFramePresets(), ProductVariantFields()

### Community 111 - "commentListLayout.js"
Cohesion: 0.52
Nodes (6): groupItemsByDay(), groupPostsByDay(), mapCommentsWithDaySeparators(), mapItemsWithDaySeparators(), mapPostsWithDaySeparators(), formatCommentDaySeparator()

### Community 112 - "StatsTrainingsCountModal.jsx"
Cohesion: 0.47
Nodes (3): formatDayTitle(), StatsTrainingsCountModal(), fetchStatsTrainingsDay()

## Knowledge Gaps
- **141 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `ProfilePage.jsx` to `Post Upload and UI Kit`, `Admin UI Controls`, `PostDetailModal.jsx`, `log.js`, `achievements.js`, `yadiskAlbumLazy.js`, `media.js`, `GalleryCommentModal.jsx`, `useFetchedOriginal.js`, `NotificationSettingsModal.jsx`, `tournamentPosts.js`, `isModerator`, `PostUploadProvider.jsx`, `main.jsx`, `yadiskAlbumLazy.js`, `ArchiveModal.jsx`, `PullToRefresh.jsx`, `postRichText.js`, `gestures.js`, `commentListLayout.js`, `App.jsx`, `videoPreviewUrl`, `tournamentPosts.js`, `PostContentHtml.jsx`, `ProductForm.jsx`, `FullscreenImageViewer.jsx`, `compressImage`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `react` connect `PullToRefresh.jsx` to `NPM Dependencies`, `yadiskAlbumLazy.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `Modal()` connect `Modal.jsx` to `notifications.js`, `Admin UI Controls`, `gestures.js`, `datePickerUtils.js`, `PostDetailModal.jsx`, `log.js`, `yadiskAlbumLazy.js`, `catalog.js`, `ProfilePage.jsx`, `media.js`, `tournamentPosts.js`, `PostUploadProvider.jsx`, `main.jsx`, `yadiskAlbumLazy.js`, `ArchiveModal.jsx`, `PullToRefresh.jsx`, `buyMessage.js`, `format.js`, `postRichText.js`, `gestures.js`, `gestures.js`, `App.jsx`, `tournamentPosts.js`, `PostContentHtml.jsx`, `postMentions.js`, `FullscreenImageViewer.jsx`, `compressImage`, `normalizeHexColor`, `StatsTrainingsCountModal.jsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _141 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.08709273182957393 - nodes in this community are weakly interconnected._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Stats Library Helpers` be split into smaller, more focused modules?**
  _Cohesion score 0.14204545454545456 - nodes in this community are weakly interconnected._