# Graph Report - tennis  (2026-08-31)

## Corpus Check
- 289 files · ~259,652 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1479 nodes · 4561 edges · 102 communities (92 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 156 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3fe9f320`
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
- EditTrainingModal.jsx
- StatsGrowthModal.jsx

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

## Communities (102 total, 10 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.29
Nodes (17): autoUnfreezeUser(), createAppNotification(), formatDayMonthBoldRu(), getEffectiveEndDate(), gmt7Hour(), notifyFreeze(), notifyTopUp(), pad2() (+9 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.09
Nodes (44): PB_URL, PinnedBanner(), usePinnedThumbUrl(), getFirstLine(), useFetchedOriginal(), publishAlbums(), useResolvedExternalMedia(), getYadiskAlbumCache() (+36 more)

### Community 3 - "notifications.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.17
Nodes (16): EmptyState(), Spinner(), MODES, StatsAchievementsModal(), hasAnyActivity(), SLICES, StatsBookingModal(), StatsMetricTitle() (+8 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.05
Nodes (68): PostUploadContext, PostUploadProvider(), usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), ScrollToTopButton(), FeedListSkeleton() (+60 more)

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
Cohesion: 0.18
Nodes (20): AuditEventRow(), htmlToReadableText(), looksLikeRichHtml(), toPlainText(), CATEGORY_STYLES, COMMENT_OBJECT_TYPES, COMMENT_SECTION_LABELS, COMMENT_TYPE_LABELS (+12 more)

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
Cohesion: 0.07
Nodes (54): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), buildPostMentionEl(), buildUserMentionEl(), deleteAdjacentMention() (+46 more)

### Community 57 - "log.js"
Cohesion: 0.15
Nodes (34): TrainingsPage(), useTrainings(), canCancelBooking(), getCurrentUser(), isModerator(), addPendingDeleteTrainingId(), assertMembershipSessionAvailable(), assertNotBotBlocked() (+26 more)

### Community 58 - "achievements.js"
Cohesion: 0.19
Nodes (15): ALL_CATEGORY_VALUES, formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), addDaysToDateInput(), AUDIT_EVENT_CATEGORIES (+7 more)

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
Cohesion: 0.22
Nodes (18): formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput(), ProfileViewModal(), TRAINING_BADGE (+10 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.24
Nodes (18): CreateTrainingModal(), INITIAL_FORM, getInitialUser(), useMaxAuth(), error, buildBannedUser(), clearBanInfo(), finalizeBannedUser() (+10 more)

### Community 67 - "media.js"
Cohesion: 0.09
Nodes (42): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, AddActionContext, AddActionProvider(), DEFAULT_API, useRegisterAddAction() (+34 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.29
Nodes (9): isUserBookingDisabled(), UserPickerModal(), TrainingCard(), TrainingDetailModal(), useKeepForModalClose(), formatCardDate(), formatTimeRange(), markAttendance() (+1 more)

### Community 70 - "useFetchedOriginal.js"
Cohesion: 0.08
Nodes (38): AvatarCropModal(), getCropCircle(), getImagePlacement(), applyMentionMissingStatuses(), isPostMissing(), postInflight, postMissingCache, resolvePostMissing() (+30 more)

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 77 - "NotificationSettingsModal.jsx"
Cohesion: 0.16
Nodes (8): Avatar(), CommentListItem(), CommentReplyButton(), CommentReplyComposeBar(), CommentReplyQuote(), CommentSwipeReply(), getUserAvatarData(), formatCommentTime()

### Community 78 - "tournamentPosts.js"
Cohesion: 0.27
Nodes (12): TournamentCommentsSection(), mapCommentsWithDaySeparators(), useTournamentComments(), dayKey(), formatCommentDaySeparator(), buildTournamentCommentMediaReorderFormData(), createTournamentComment(), createTournamentCommentWithProgress() (+4 more)

### Community 79 - "isModerator"
Cohesion: 0.26
Nodes (10): CommentSendButton(), GalleryCommentModal(), useCommentLikes(), useGalleryComments(), createGalleryComment(), deleteGalleryComment(), listGalleryComments(), updateGalleryComment() (+2 more)

### Community 80 - "useMaxCloseGuard.js"
Cohesion: 0.08
Nodes (34): BlockedAppShell(), PullToRefresh(), DEFAULT_FREQUENT_EMOJIS, EMOJI_CATEGORIES, CATEGORY_ICONS, EmojiPicker(), prefersReducedMotion(), pushRecentEmoji() (+26 more)

### Community 81 - "PostUploadProvider.jsx"
Cohesion: 0.27
Nodes (12): CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput(), OnboardingTutorial(), padHighlightRect(), scrollTargetIntoView() (+4 more)

### Community 82 - "postRichText.js"
Cohesion: 0.06
Nodes (55): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), useGalleryUpload(), isProductsKey(), ProductUploadContext, ProductUploadProvider() (+47 more)

### Community 83 - "yadiskAlbumLazy.js"
Cohesion: 0.07
Nodes (61): react, AlertDialogContext, INITIAL_STATE, useAlertDialog(), useToast(), SystemTemplatesModal(), TemplateListButton(), CreateTournamentPostModal() (+53 more)

### Community 84 - "ArchiveModal.jsx"
Cohesion: 0.23
Nodes (8): InfoTooltip(), Toggle(), NotificationSettingsModal(), SETTINGS_ROWS, METRICS, StatisticsHubModal(), getNotificationSettings(), updateNotificationSettings()

### Community 85 - "ProductForm.jsx"
Cohesion: 0.18
Nodes (12): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, ForceUpdateOverlay(), CloseAppConfirmSheet(), AdminPanelPage(), useSessionResetKey() (+4 more)

### Community 86 - "PostMedia.jsx"
Cohesion: 0.30
Nodes (10): MembershipIcon(), formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), normalizeDateInput(), ProfilePage(), TRAINING_BADGE (+2 more)

### Community 87 - "buyMessage.js"
Cohesion: 0.14
Nodes (19): MAX_AUTH_URL, MAX_SELLER_URL, BlockedPage(), formatFreezeLogEntry(), formatMembershipDate(), getMembershipTypeLabel(), MembershipModal(), parseFreezeLog() (+11 more)

### Community 88 - "format.js"
Cohesion: 0.22
Nodes (14): PAD, ScheduleDateTimeSheet(), CalendarStrip(), DAYS_FULL, DAYS_SHORT, formatDateTimeShort(), formatScheduleDayWheelLabel(), formatScheduleSendLabel() (+6 more)

### Community 89 - "CompetitionsPage.jsx"
Cohesion: 0.31
Nodes (10): enrichTopPostNumbers(), formatBirthDate(), reachUsersTitle(), StatsReachModal(), typeLabel(), fetchStatsAchievementGrants(), fetchStatsBooking(), fetchStatsReach() (+2 more)

### Community 90 - "postRichText.js"
Cohesion: 0.29
Nodes (8): App(), AboutAppModal(), openExternalUrl(), useAppVersionCheck(), APP_BUILD, APP_DISPLAY_VERSION, fetchRemoteAppVersion(), getVersionManifestUrl()

### Community 91 - "gestures.js"
Cohesion: 0.27
Nodes (11): ModalFloatingCloseButton(), findScrollParent(), keepCommentEditInView(), restoreAndKeepCommentEditInView(), PostDetailModal(), useComments(), buildCommentMediaReorderFormData(), createComment() (+3 more)

### Community 92 - "PostRichTextField.jsx"
Cohesion: 0.44
Nodes (8): getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments(), TournamentPostCard(), TournamentPostDetailModal(), formatPostDate()

### Community 93 - "OnboardingTutorial.jsx"
Cohesion: 0.29
Nodes (6): MentionNavContext, MentionNavProvider(), useMentionNav(), handleContentCopy(), plainTextFromRange(), PostContentHtml()

### Community 94 - "mention_notifications_lib.js"
Cohesion: 0.44
Nodes (10): alreadyNotified(), buildActorMeta(), diffNewIds(), extractUserMentionIds(), getRelationId(), notifyCommentMentions(), notifyMentionsForRecord(), notifyPostMentions() (+2 more)

### Community 95 - "EditTrainingModal.jsx"
Cohesion: 0.32
Nodes (4): AlertDialogProvider(), Toast(), ToastContext, ToastProvider()

### Community 96 - "normalizeHexColor"
Cohesion: 0.33
Nodes (8): PostCard(), PostCardLike(), readComments(), usePostLikes(), usePostViewTracker(), listPostLikes(), togglePostLike(), recordContentView()

### Community 98 - "usePlayers"
Cohesion: 0.22
Nodes (13): IconButton, FOCUSABLE_SELECTORS, Modal(), formatDateRangeLabel(), MembershipOverviewModal(), trainingCountsAsUsedSession(), ensureModalOriginTracking(), getLastPointerOrigin() (+5 more)

### Community 99 - "EditTrainingModal.jsx"
Cohesion: 0.29
Nodes (10): buildTrainingPatch(), EditTrainingModal(), getFormFromTraining(), getPatchFromForm(), getPatchFromTraining(), INITIAL_FORM, toDateTimeLocalValue(), areTrainingValuesEqual() (+2 more)

### Community 100 - "StatsGrowthModal.jsx"
Cohesion: 0.31
Nodes (6): formatBirthDate(), formatDayTitle(), StatsGrowthModal(), StatsLineChart(), fetchStatsGrowth(), fetchStatsGrowthDay()

## Knowledge Gaps
- **141 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `ProfilePage.jsx` to `Post Upload and UI Kit`, `notifications.js`, `auditEventFormat.js`, `datePickerUtils.js`, `log.js`, `yadiskAlbumLazy.js`, `catalog.js`, `media.js`, `GalleryCommentModal.jsx`, `useFetchedOriginal.js`, `tournamentPosts.js`, `isModerator`, `PostUploadProvider.jsx`, `postRichText.js`, `yadiskAlbumLazy.js`, `ArchiveModal.jsx`, `ProductForm.jsx`, `PostMedia.jsx`, `buyMessage.js`, `gestures.js`, `normalizeHexColor`, `EditTrainingModal.jsx`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `react` connect `yadiskAlbumLazy.js` to `NPM Dependencies`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `dependencies` connect `NPM Dependencies` to `yadiskAlbumLazy.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _141 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.09084556254367575 - nodes in this community are weakly interconnected._
- **Should `notifications.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._
- **Should `auditEventFormat.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05293383270911361 - nodes in this community are weakly interconnected._