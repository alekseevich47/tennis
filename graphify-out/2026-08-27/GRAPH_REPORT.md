# Graph Report - tennis  (2026-08-27)

## Corpus Check
- 254 files · ~234,227 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1302 nodes · 4041 edges · 93 communities (84 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 138 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `643ea152`
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
- useSectionSwipe.js
- tournamentPosts.js
- AboutAppModal.jsx
- isModerator
- useMaxCloseGuard.js
- OnboardingTutorial.jsx
- pocketbase.js
- MembershipOverviewModal.jsx
- EditTrainingModal.jsx
- useFetchedOriginal.js
- overlayStack.js
- ArchiveModal.jsx
- App.jsx
- BottomNav.jsx
- Skeleton.jsx
- FavoritesContext.jsx
- usePinnedBannerIndex.js

## God Nodes (most connected - your core abstractions)
1. `error` - 127 edges
2. `Modal()` - 44 edges
3. `useAlertDialog()` - 41 edges
4. `ProfileViewModal()` - 37 edges
5. `isModerator()` - 33 edges
6. `pb` - 31 edges
7. `Профиль` - 29 edges
8. `TrainingsPage()` - 27 edges
9. `CompetitionsPage()` - 24 edges
10. `hasVisibleText()` - 24 edges

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

## Communities (93 total, 9 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.22
Nodes (14): PAD, ScheduleDateTimeSheet(), CalendarStrip(), dayKey(), DAYS_FULL, DAYS_SHORT, formatScheduleDayWheelLabel(), formatScheduleSendLabel() (+6 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.16
Nodes (21): TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), CompetitionsPage(), useTournamentPosts(), applyTournamentPostSideEffects(), buildTournamentPostPayload(), deleteScheduledTournamentPost() (+13 more)

### Community 3 - "notifications.js"
Cohesion: 0.17
Nodes (18): MAX_AUTH_URL, MAX_SELLER_URL, PB_URL, BlockedPage(), formatFreezeLogEntry(), formatMembershipDate(), getMembershipTypeLabel(), MembershipModal() (+10 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.07
Nodes (53): CloseAppConfirmSheet(), FOCUSABLE_SELECTORS, Modal(), Spinner(), AdminPanelPage(), METRICS, StatisticsHubModal(), MODES (+45 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

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
Cohesion: 0.19
Nodes (7): PullToRefresh(), ScrollToTopButton(), TABS, PostContextMenu(), useSectionScroll(), hasOpenOverlay(), setSectionScrollElement()

### Community 14 - "datePickerUtils.js"
Cohesion: 0.11
Nodes (33): AppHeader(), computeAnnualEndDate(), getCurrentSessions(), getModeCopy(), MembershipEditModal(), normalizeDateInput(), MembershipPeriodRangeField(), MembershipStartDateField() (+25 more)

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
Cohesion: 0.30
Nodes (12): adjustAttendanceCountTx(), applyBookingSideEffects(), consumeMembershipSessionTx(), dayBoundsIso(), finalizeCancelledTrainingRecord(), hasAnnualBookingSameDay(), hasTimeRangeEnded(), isReadyToFinalizePendingDelete() (+4 more)

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
Cohesion: 0.11
Nodes (32): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame() (+24 more)

### Community 57 - "log.js"
Cohesion: 0.25
Nodes (16): formatDate(), getTrainingTitle(), isModerator(), normalizeDateInput(), ProfileViewModal(), TRAINING_BADGE, banUser(), claimMaxAccount() (+8 more)

### Community 58 - "achievements.js"
Cohesion: 0.09
Nodes (42): PinnedBanner(), usePinnedThumbUrl(), getFirstLine(), useFetchedOriginal(), publishAlbums(), useResolvedExternalMedia(), getYadiskAlbumCache(), setYadiskAlbumCache() (+34 more)

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.05
Nodes (81): ForceUpdateOverlay(), AlertDialogContext, INITIAL_STATE, useAlertDialog(), Avatar(), useToast(), useFavorites(), CreateTournamentPostModal() (+73 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.21
Nodes (16): usePostUpload(), FeedPage(), sortPinnedByCreated(), cache, listeners, subscribeYadiskAlbumCache(), toFullscreenAlbumItems(), requestAlbumLazyFocus() (+8 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.16
Nodes (28): useTrainings(), getCurrentUser(), isModerator(), pb, areTrainingValuesEqual(), assertMembershipSessionAvailable(), assertNotBotBlocked(), bookTraining() (+20 more)

### Community 67 - "media.js"
Cohesion: 0.08
Nodes (50): InfoTooltip(), Toggle(), buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal() (+42 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.07
Nodes (55): ModalFloatingCloseButton(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments(), TournamentPostCard() (+47 more)

### Community 70 - "GalleryPage.jsx"
Cohesion: 0.18
Nodes (17): isProductsKey(), ProductUploadContext, ProductUploadProvider(), useProductUpload(), SearchBar(), ShopPage(), useProducts(), addGalleryImage() (+9 more)

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 76 - "useSectionSwipe.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 77 - "tournamentPosts.js"
Cohesion: 0.32
Nodes (13): getInitialUser(), useMaxAuth(), buildBannedUser(), clearBanInfo(), finalizeBannedUser(), initMaxAuth(), isUserBanned(), loadBanInfo() (+5 more)

### Community 78 - "AboutAppModal.jsx"
Cohesion: 0.10
Nodes (20): App(), createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), PostUploadContext, PostUploadProvider(), AlertDialogProvider() (+12 more)

### Community 79 - "isModerator"
Cohesion: 0.20
Nodes (16): useGalleryUpload(), GalleryMediaOverlay(), createGalleryUploadItem(), GalleryItemLike(), GalleryPage(), getAspectClass(), getImageAspectRatio(), getVideoAspectRatio() (+8 more)

### Community 80 - "useMaxCloseGuard.js"
Cohesion: 0.26
Nodes (9): getSwipeableTabs(), getWindowWidth(), IGNORE_SELECTOR, isTextFieldFocused(), shouldIgnoreTarget(), SWIPE_ALLOW_OVERLAY_SUFFIXES, useSectionSwipe(), hasBlockingOverlay() (+1 more)

### Community 81 - "OnboardingTutorial.jsx"
Cohesion: 0.14
Nodes (23): AvatarCropModal(), getCropCircle(), getImagePlacement(), MediaPreviewAlbumItem(), useSwipeGallery(), CARD_STEPS, getStepSelectors(), getTooltipStyle() (+15 more)

### Community 82 - "pocketbase.js"
Cohesion: 0.18
Nodes (21): IconButton, isUserBookingDisabled(), UserPickerModal(), TrainingCard(), TrainingDetailModal(), TrainingsPage(), canCancelBooking(), formatCardDate() (+13 more)

### Community 83 - "MembershipOverviewModal.jsx"
Cohesion: 0.27
Nodes (9): getTrainingStatusForUser(), getUserPastTrainings(), formatDateRangeLabel(), MembershipOverviewModal(), trainingCountsAsUsedSession(), usePlayers(), hasTimeRangeEnded(), listPlayers() (+1 more)

### Community 84 - "EditTrainingModal.jsx"
Cohesion: 0.21
Nodes (14): MembershipIcon(), formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), normalizeDateInput(), ProfilePage(), TRAINING_BADGE (+6 more)

### Community 85 - "useFetchedOriginal.js"
Cohesion: 0.21
Nodes (11): AddActionContext, AddActionProvider(), DEFAULT_API, useRegisterAddAction(), RatingPage(), buildPlayerRanks(), getPlayerRatingRank(), getRatingPoints() (+3 more)

### Community 86 - "overlayStack.js"
Cohesion: 0.42
Nodes (6): disableMaxVerticalSwipes(), isEditableFocus(), useMaxCloseGuard(), closeTopOverlay(), isSectionScrollAtTop(), scrollSectionToTop()

### Community 87 - "ArchiveModal.jsx"
Cohesion: 0.27
Nodes (10): EmptyState(), ArchiveModal(), formatDateRangeLabel(), findRussianMonth(), isDateQueryParsed(), matchesDateQuery(), MONTH_ENTRIES, parseDateQuery() (+2 more)

### Community 88 - "App.jsx"
Cohesion: 0.29
Nodes (9): AppInner(), AppMain(), BlockedAppShell(), getInitialFavoriteProductIds(), TAB_TITLES, useSessionResetKey(), deleteProduct(), hardDeleteComment() (+1 more)

### Community 89 - "BottomNav.jsx"
Cohesion: 0.47
Nodes (5): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, useTriggerAddAction()

### Community 90 - "Skeleton.jsx"
Cohesion: 0.33
Nodes (4): FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton()

### Community 91 - "FavoritesContext.jsx"
Cohesion: 0.53
Nodes (5): FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), adjustProductFavoritesCount()

### Community 92 - "usePinnedBannerIndex.js"
Cohesion: 0.60
Nodes (4): applyPinFocusHighlight(), computePinnedBannerIndex(), pinHighlightTimers, usePinnedBannerIndex()

## Knowledge Gaps
- **134 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `media.js` to `Post Upload and UI Kit`, `notifications.js`, `Admin UI Controls`, `gestures.js`, `datePickerUtils.js`, `log.js`, `achievements.js`, `yadiskAlbumLazy.js`, `catalog.js`, `ProfilePage.jsx`, `GalleryCommentModal.jsx`, `GalleryPage.jsx`, `useSectionSwipe.js`, `tournamentPosts.js`, `AboutAppModal.jsx`, `isModerator`, `OnboardingTutorial.jsx`, `pocketbase.js`, `MembershipOverviewModal.jsx`, `EditTrainingModal.jsx`, `useFetchedOriginal.js`, `App.jsx`, `FavoritesContext.jsx`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `Modal()` connect `Admin UI Controls` to `media.js`, `GalleryCommentModal.jsx`, `notifications.js`, `auditEventFormat.js`, `AboutAppModal.jsx`, `datePickerUtils.js`, `OnboardingTutorial.jsx`, `pocketbase.js`, `MembershipOverviewModal.jsx`, `ArchiveModal.jsx`, `PostDetailModal.jsx`, `log.js`, `yadiskAlbumLazy.js`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `LongPressRing()` connect `yadiskAlbumLazy.js` to `NPM Dependencies`, `GalleryCommentModal.jsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _134 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin UI Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.06526315789473684 - nodes in this community are weakly interconnected._
- **Should `auditEventFormat.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10121457489878542 - nodes in this community are weakly interconnected._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._