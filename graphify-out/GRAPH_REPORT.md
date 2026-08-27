# Graph Report - tennis  (2026-08-27)

## Corpus Check
- 258 files · ~239,274 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1329 nodes · 4134 edges · 88 communities (79 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 138 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1ccd5d7`
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
- AboutAppModal.jsx
- AboutAppModal.jsx
- isModerator
- useMaxCloseGuard.js
- ProfilePage.jsx
- overlayStack.js
- buyMessage.js
- RatingPage.jsx
- ProductUploadProvider.jsx
- overlayStack.js
- BottomNav.jsx

## God Nodes (most connected - your core abstractions)
1. `error` - 127 edges
2. `Modal()` - 44 edges
3. `useAlertDialog()` - 41 edges
4. `ProfileViewModal()` - 38 edges
5. `isModerator()` - 33 edges
6. `pb` - 32 edges
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

## Communities (88 total, 9 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.26
Nodes (16): AppInner(), getInitialFavoriteProductIds(), getInitialUser(), useMaxAuth(), buildBannedUser(), clearBanInfo(), finalizeBannedUser(), initMaxAuth() (+8 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.05
Nodes (70): PostUploadContext, PostUploadProvider(), usePostUpload(), TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), AlertDialogProvider(), EmptyState() (+62 more)

### Community 3 - "notifications.js"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.06
Nodes (51): CloseAppConfirmSheet(), InfoTooltip(), FOCUSABLE_SELECTORS, Modal(), Spinner(), Toggle(), AdminPanelPage(), NotificationSettingsModal() (+43 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.10
Nodes (32): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+24 more)

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
Cohesion: 0.20
Nodes (11): MAX_AUTH_URL, MAX_SELLER_URL, PB_URL, formatFreezeLogEntry(), formatMembershipDate(), getMembershipTypeLabel(), MembershipModal(), parseFreezeLog() (+3 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.12
Nodes (32): AppHeader(), computeAnnualEndDate(), getCurrentSessions(), getModeCopy(), MembershipEditModal(), normalizeDateInput(), MembershipPeriodRangeField(), MembershipStartDateField() (+24 more)

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
Cohesion: 0.07
Nodes (44): Avatar(), FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), buildPostMentionEl(), buildUserMentionEl() (+36 more)

### Community 57 - "log.js"
Cohesion: 0.16
Nodes (22): filterProfileTrainings(), formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput(), ProfileViewModal() (+14 more)

### Community 58 - "achievements.js"
Cohesion: 0.10
Nodes (41): PinnedBanner(), usePinnedThumbUrl(), getFirstLine(), useFetchedOriginal(), publishAlbums(), useResolvedExternalMedia(), getYadiskAlbumCache(), setYadiskAlbumCache() (+33 more)

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.08
Nodes (56): AlertDialogContext, INITIAL_STATE, useAlertDialog(), useToast(), CreateTournamentPostModal(), EditTournamentPostModal(), CommentComposeForm(), CreatePostModal() (+48 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.27
Nodes (12): CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput(), OnboardingTutorial(), padHighlightRect(), scrollTargetIntoView() (+4 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.05
Nodes (95): StatsTrainingsCountModal(), PAD, ScheduleDateTimeSheet(), formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, NotificationCard() (+87 more)

### Community 67 - "media.js"
Cohesion: 0.20
Nodes (23): buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal(), getAudienceLabel(), NotificationSendModal() (+15 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.05
Nodes (65): IconButton, ModalFloatingCloseButton(), MentionNavContext, MentionNavProvider(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER (+57 more)

### Community 70 - "GalleryPage.jsx"
Cohesion: 0.20
Nodes (12): ForceUpdateOverlay(), useProductUpload(), ScheduledPostActionsMenu(), CategoryDropdown(), SearchBar(), ShopPage(), useOverlayClose(), useProducts() (+4 more)

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 76 - "useSectionSwipe.js"
Cohesion: 0.53
Nodes (5): createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey(), createGalleryItemWithProgress()

### Community 77 - "AboutAppModal.jsx"
Cohesion: 0.29
Nodes (8): App(), AboutAppModal(), openExternalUrl(), useAppVersionCheck(), APP_BUILD, APP_DISPLAY_VERSION, fetchRemoteAppVersion(), getVersionManifestUrl()

### Community 78 - "AboutAppModal.jsx"
Cohesion: 0.09
Nodes (39): AvatarCropModal(), getCropCircle(), getImagePlacement(), FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), useFavorites() (+31 more)

### Community 79 - "isModerator"
Cohesion: 0.17
Nodes (20): useGalleryUpload(), GalleryMediaOverlay(), createGalleryUploadItem(), GalleryItemLike(), GalleryPage(), getAspectClass(), getImageAspectRatio(), getVideoAspectRatio() (+12 more)

### Community 80 - "useMaxCloseGuard.js"
Cohesion: 0.20
Nodes (14): AppMain(), BlockedAppShell(), TAB_TITLES, getSwipeableTabs(), getWindowWidth(), IGNORE_SELECTOR, isTextFieldFocused(), shouldIgnoreTarget() (+6 more)

### Community 81 - "ProfilePage.jsx"
Cohesion: 0.31
Nodes (9): MembershipIcon(), formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), normalizeDateInput(), ProfilePage(), TRAINING_BADGE (+1 more)

### Community 82 - "overlayStack.js"
Cohesion: 0.31
Nodes (6): PullToRefresh(), MentionSuggestPopup(), prefersReducedMotion(), hasOpenOverlay(), registerOverlay(), stack

### Community 83 - "buyMessage.js"
Cohesion: 0.33
Nodes (8): BlockedPage(), buildBuyMessage(), buildMaxUserChatUrl(), formatProductLine(), openMaxDeepLink(), openMaxUserChat(), openSellerChat(), isUserBotBlocked()

### Community 84 - "RatingPage.jsx"
Cohesion: 0.53
Nodes (7): RatingPage(), buildPlayerRanks(), getPlayerRatingRank(), getRatingPoints(), isRatingVisible(), buildManualPlayerPayload(), createPlayer()

### Community 85 - "ProductUploadProvider.jsx"
Cohesion: 0.53
Nodes (5): isProductsKey(), ProductUploadContext, ProductUploadProvider(), createProductWithProgress(), updateProduct()

### Community 86 - "overlayStack.js"
Cohesion: 0.42
Nodes (6): disableMaxVerticalSwipes(), isEditableFocus(), useMaxCloseGuard(), closeTopOverlay(), isSectionScrollAtTop(), scrollSectionToTop()

### Community 89 - "BottomNav.jsx"
Cohesion: 0.27
Nodes (8): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, AddActionContext, AddActionProvider(), DEFAULT_API, useTriggerAddAction()

## Knowledge Gaps
- **135 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+130 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `ProfilePage.jsx` to `App Shell Navigation`, `Post Upload and UI Kit`, `notifications.js`, `Admin UI Controls`, `gestures.js`, `datePickerUtils.js`, `log.js`, `achievements.js`, `yadiskAlbumLazy.js`, `catalog.js`, `media.js`, `GalleryCommentModal.jsx`, `GalleryPage.jsx`, `useSectionSwipe.js`, `AboutAppModal.jsx`, `isModerator`, `useMaxCloseGuard.js`, `ProfilePage.jsx`, `RatingPage.jsx`, `ProductUploadProvider.jsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `react` connect `NPM Dependencies` to `yadiskAlbumLazy.js`, `GalleryCommentModal.jsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _135 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.051425899953249185 - nodes in this community are weakly interconnected._
- **Should `notifications.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._
- **Should `Admin UI Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.06456140350877193 - nodes in this community are weakly interconnected._
- **Should `auditEventFormat.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10241820768136557 - nodes in this community are weakly interconnected._