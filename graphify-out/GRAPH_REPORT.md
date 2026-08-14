# Graph Report - tennis  (2026-08-14)

## Corpus Check
- 237 files · ~220,364 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1201 nodes · 3694 edges · 79 communities (71 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 137 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c946206b`
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
- MembershipModal.jsx
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
- FeedPage.jsx
- GalleryCommentModal.jsx
- gestures.js
- MembershipOverviewModal.jsx
- useMaxAuth.js
- claimlib.js
- tournamentComments.js
- server-bootstrap.sh
- useMaxCloseGuard.js
- deploy.sh

## God Nodes (most connected - your core abstractions)
1. `error` - 123 edges
2. `Modal()` - 43 edges
3. `useAlertDialog()` - 39 edges
4. `ProfileViewModal()` - 36 edges
5. `isModerator()` - 33 edges
6. `pb` - 30 edges
7. `Профиль` - 29 edges
8. `TrainingsPage()` - 27 edges
9. `CompetitionsPage()` - 24 edges
10. `formatPostDate()` - 24 edges

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

## Communities (79 total, 8 thin omitted)

### Community 0 - "App Shell Navigation"
Cohesion: 0.07
Nodes (73): formatCountdownPart(), formatTrainingCountdownBadge(), isUserBooked(), CLICK_ACTION_LABELS, NotificationCard(), parseCommentReplyParentText(), CalendarStrip(), buildTrainingPatch() (+65 more)

### Community 2 - "Post Upload and UI Kit"
Cohesion: 0.08
Nodes (41): InfoTooltip(), Toggle(), buildSendResultAlert(), formatAdminSaveError(), BroadcastModal(), defaultDatetimeLocal(), getAudienceLabel(), defaultDatetimeLocal() (+33 more)

### Community 3 - "notifications.js"
Cohesion: 0.30
Nodes (9): AppInner(), AppMain(), getInitialFavoriteProductIds(), TAB_TITLES, BlockedPage(), useSessionResetKey(), isUserBotBlocked(), deleteProduct() (+1 more)

### Community 4 - "Gallery Upload Flow"
Cohesion: 0.42
Nodes (8): deleteRecordsByField(), deleteUserAccount(), detachUserEverywhere(), logDeleteAudit(), relationIds(), removeFromIdList(), removeFromMultiField(), removeFromTournamentParticipants()

### Community 5 - "Admin UI Controls"
Cohesion: 0.08
Nodes (47): CloseAppConfirmSheet(), EmptyState(), FOCUSABLE_SELECTORS, Modal(), Spinner(), AdminPanelPage(), METRICS, StatisticsHubModal() (+39 more)

### Community 6 - "auditEventFormat.js"
Cohesion: 0.10
Nodes (33): ALL_CATEGORY_VALUES, AuditEventRow(), formatDateRangeLabel(), getLogsDefaultDateRange(), LogsModal(), toDateInputValue(), useAuditEvents(), CATEGORY_STYLES (+25 more)

### Community 7 - "App.jsx"
Cohesion: 0.05
Nodes (82): usePostUpload(), PullToRefresh(), ScrollToTopButton(), FeedListSkeleton(), RatingListSkeleton(), ShopGridSkeleton(), TrainingListSkeleton(), CompetitionsPage() (+74 more)

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

### Community 13 - "MembershipModal.jsx"
Cohesion: 0.19
Nodes (19): MembershipIcon(), formatDate(), getTrainingStatusForUser(), getTrainingTitle(), getUserPastTrainings(), isModerator(), normalizeDateInput(), ProfileViewModal() (+11 more)

### Community 14 - "datePickerUtils.js"
Cohesion: 0.10
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
Nodes (35): FrameColorPicker(), hexToHsv(), hsvToHex(), PostFormatToolbar(), PostLinkModal(), ALLOWED_ATTRS, ALLOWED_TAGS, applyAnimFrame() (+27 more)

### Community 57 - "log.js"
Cohesion: 0.18
Nodes (22): useToast(), formatFreezeLogEntry(), formatMembershipDate(), getMembershipTypeLabel(), MembershipModal(), parseFreezeLog(), formatDate(), getTrainingStatusForUser() (+14 more)

### Community 58 - "achievements.js"
Cohesion: 0.31
Nodes (7): FavoritesContext, FavoritesProvider(), loadFavoriteProducts(), patchProductsFavoritesCount(), adjustProductFavoritesCount(), pb, listUsers()

### Community 59 - "yadiskAlbumLazy.js"
Cohesion: 0.06
Nodes (57): App(), AvatarCropModal(), getCropCircle(), getImagePlacement(), AlertDialogContext, AlertDialogProvider(), INITIAL_STATE, useAlertDialog() (+49 more)

### Community 60 - "maxauthlib.js"
Cohesion: 0.43
Nodes (6): bytesToHex(), hmacSha256Hex(), rotr(), sha256Bytes(), utf8Bytes(), wordsToBytes()

### Community 61 - "error"
Cohesion: 0.28
Nodes (17): buildDownloadUrl(), buildFileItem(), buildMetaUrl(), collectAlbumItems(), detectMediaKind(), fetchContentFile(), fetchDownloadHref(), fetchPublicResource() (+9 more)

### Community 63 - "catalog.js"
Cohesion: 0.05
Nodes (54): ADMIN_NAV_ITEM, BottomNav(), GALLERY_NAV_ITEM, NAV_ITEMS, createGalleryPayload(), GalleryUploadContext, GalleryUploadProvider(), isGalleryKey() (+46 more)

### Community 65 - "ProfilePage.jsx"
Cohesion: 0.15
Nodes (24): AchievementRow(), AchievementsBlock(), clampProgress(), getCurrentLevelTitle(), getProgressBarColorClass(), getTooltipKey(), getTooltipText(), clampPercent() (+16 more)

### Community 66 - "media.js"
Cohesion: 0.20
Nodes (10): PostUploadContext, PostUploadProvider(), PostCardLike(), usePostLikes(), createPost(), createPostWithProgress(), hardDeletePost(), listPostLikes() (+2 more)

### Community 67 - "FeedPage.jsx"
Cohesion: 0.36
Nodes (11): NotificationsDropdown(), useTrainings(), error, clearAllNotifications(), deleteNotification(), isDeletableNotification(), listNotifications(), requestCommentReplyNotification() (+3 more)

### Community 68 - "GalleryCommentModal.jsx"
Cohesion: 0.08
Nodes (50): IconButton, ModalFloatingCloseButton(), TournamentCommentsSection(), getParticipantDisplayName(), getParticipantPlayer(), PODIUM_ORDER, TournamentPodium(), readTournamentComments() (+42 more)

### Community 69 - "gestures.js"
Cohesion: 0.27
Nodes (12): CARD_STEPS, getStepSelectors(), getTooltipStyle(), NAV_STEPS, normalizeDateInput(), OnboardingTutorial(), padHighlightRect(), scrollTargetIntoView() (+4 more)

### Community 70 - "MembershipOverviewModal.jsx"
Cohesion: 0.28
Nodes (11): TournamentPostUploadContext, TournamentPostUploadProvider(), useTournamentPostUpload(), applyTournamentPostSideEffects(), buildTournamentPostPayload(), hardDeleteTournamentPost(), invalidateTournamentCaches(), publishTournamentPost() (+3 more)

### Community 71 - "useMaxAuth.js"
Cohesion: 0.35
Nodes (12): getInitialUser(), useMaxAuth(), buildBannedUser(), clearBanInfo(), finalizeBannedUser(), initMaxAuth(), isUserBanned(), loadBanInfo() (+4 more)

### Community 72 - "claimlib.js"
Cohesion: 0.22
Nodes (16): actorDisplayName(), claimMax(), copyStubFields(), findByMaxId(), logClaimAudit(), mergeFavoriteProducts(), normalizeMaxId(), relationIds() (+8 more)

### Community 73 - "tournamentComments.js"
Cohesion: 0.83
Nodes (3): asString(), createManualUser(), randomManualEmail()

### Community 76 - "server-bootstrap.sh"
Cohesion: 0.67
Nodes (3): DEBIAN_FRONTEND, server-bootstrap.sh script, wait_pb()

### Community 77 - "useMaxCloseGuard.js"
Cohesion: 0.15
Nodes (16): BlockedAppShell(), disableMaxVerticalSwipes(), isEditableFocus(), useMaxCloseGuard(), getSwipeableTabs(), getWindowWidth(), IGNORE_SELECTOR, isTextFieldFocused() (+8 more)

## Knowledge Gaps
- **125 isolated node(s):** `name`, `version`, `description`, `private`, `dev` (+120 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `error` connect `FeedPage.jsx` to `App Shell Navigation`, `ProfilePage.jsx`, `media.js`, `notifications.js`, `Post Upload and UI Kit`, `GalleryCommentModal.jsx`, `MembershipOverviewModal.jsx`, `App.jsx`, `gestures.js`, `useMaxAuth.js`, `MembershipModal.jsx`, `datePickerUtils.js`, `log.js`, `achievements.js`, `yadiskAlbumLazy.js`, `catalog.js`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `LongPressRing()` connect `GalleryCommentModal.jsx` to `NPM Dependencies`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `react` connect `NPM Dependencies` to `GalleryCommentModal.jsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _125 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.06750700280112044 - nodes in this community are weakly interconnected._
- **Should `Post Upload and UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.08045977011494253 - nodes in this community are weakly interconnected._
- **Should `Admin UI Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.07682177348551361 - nodes in this community are weakly interconnected._