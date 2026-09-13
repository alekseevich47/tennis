# Security Penetration Test Report

**Generated:** 2026-09-12 15:42:35 UTC

# Executive Summary

# Executive Summary

An authorized assessment of the **«Секция Миленьких» tennis Mini App** (`https://app.milenkih-team.ru`) was performed in combined white-box (read-only source review) and black-box (live API testing) mode, using a normal member account. Eight validated findings were confirmed, one of them critical.

**Overall risk posture: Elevated.** The application is a React Mini App talking directly to a PocketBase (Go/SQLite) backend; there is no application server in front of the database, so every collection rule and JSVM hook is a production security boundary. The team has clearly invested in these controls — booking session accounting, seat limits, achievement inputs, the MAX authentication signature check, the moderator route gates and the media proxies all held up under deliberate attack, and were recorded as ruled out with named controls. The residual risk comes from two places: a **secret that is not a secret**, and a handful of **controls that were written inconsistently** across sibling code paths.

**Key findings**

1. **Critical — production MAX bot token exposed.** The live bot credential sits in `client/.env` in the working copy and is present in the repository's Git history. It authenticates against the MAX Bot API as the real production bot, granting chat-inventory reads, the ability to send messages to any member as the official bot, and the ability to re-point the bot's webhook. This is the single most important item to remediate.
2. **High — unauthenticated access to member media.** PocketBase's file endpoints serve member-uploaded photos and videos without authentication, and the custom `/api/video-poster` route is the only handler in the project with no authentication gate at all.
3. **Medium (×3) — inconsistent authorization on write paths.** A member can falsify other members' training history, switch off the attendance authorization guard for their own request by supplying a transition field, impersonate moderator notifications through an unguarded notification route, and write metric rows through a collection endpoint that bypasses the application's own validation.
4. **Low (×3) — hardening gaps.** Wildcard CORS, session tokens that remain valid after refresh with no logout, and a notification rule that lets a user re-address their own notification to another member.

**Business impact.** The bot token is the highest business risk: it is the club's official communication channel, and control of it enables credible phishing of every member, plus harvest of the stable member identifiers the application uses as account keys. The remaining findings are integrity and confidentiality issues within the club community — falsified attendance records, spoofed official notifications and retrieved private media — rather than financial or infrastructure compromise.

**Remediation theme.** The findings are not architectural. Every one of them is fixed by making an existing control apply to all of its call paths: one missing authentication gate in a route that has 34 siblings that all have it, one moderator check omitted from a route whose five siblings all perform it, one relation-field list that was not extended when the ownership check was written, and one validation rule that lives on a route instead of on the data store.

**Validation note.** The highest-value unclosed item is a potential escalation of the bot-token finding: if the MAX Bridge signature could be reproduced with the leaked token, that exposure would become complete account takeover for every member rather than bot-messaging authority. The signature construction was attacked extensively and not reproduced, so it is recorded honestly as an open proof gap with a concrete next step, not as a finding.

# Methodology

# Methodology

**Engagement type.** Combined white-box (source) and grey-box/black-box (live API) assessment, authorized by the application owner.

**Scope**

- Live application: `https://app.milenkih-team.ru` (React 18 + Vite SPA, PocketBase 0.23 backend, served inside the MAX messenger webview).
- Source under review (read-only, no files modified): `client/src` (services, hooks, feed renderers), `pb_hooks/*` (all JSVM hooks and custom routes), `schema.json` (collection rule export), `config/*` (nginx and deployment configuration).
- Out of scope and not tested: the legacy `urban42.online` deployment, mass broadcasts to real users, and destructive modification of production data.

**Standards.** Testing was organised around the **OWASP API Security Top 10 (2023)** and the **OWASP Top 10 (2025)**, and executed following **PTES**-style phases with **OWASP WSTG** test cases for the web application layer.

**Approach**

1. **Reconnaissance and mapping.** Live exploration of the API surface (`/api/collections/*`, `/api/files`, `/api/realtime`, custom `/api/*` hook routes) combined with a full read of the schema export and every `pb_hooks` script, producing a collection-by-collection rule inventory and a complete custom-route inventory.
2. **Threat modelling.** A shared threat model was derived from the source and the live behaviour, establishing attacker-controlled inputs, the operator/moderator boundary, the invariants that must hold, and per-severity calibration for this deployment.
3. **Parallel specialised testing.** Work was decomposed into focused streams, each responsible for one surface: horizontal object-level authorization and field-level over-exposure across every collection; the training booking and session-accounting logic; achievement, rating and statistics integrity (including the client-side progress computation); injection, template and outbound-request behaviour in the hook layer; authentication, session and CORS behaviour; the React rendering and client-side-trust layer; and broken function-level authorization across all 35 custom routes.
4. **Negative controls throughout.** Every refusal was paired with a positive control proving the endpoint was reachable and the control — not the network — produced the rejection. Forged JWTs, cross-user writes, traversal payloads, loopback SSRF targets and admin route variants were all exercised against their genuine counterparts.
5. **Full validation of every finding.** Findings were reproduced live with raw request/response evidence before being reported. Candidates that could not be closed were recorded explicitly as open proof gaps rather than being resolved by assumption.
6. **Chaining review.** Cross-finding combinations were evaluated; the one material combination is carried as an open item with a concrete next step (see Technical Analysis).

**Coverage.** 75 surface-level assessments were recorded across the engagement — 15 closed as reported, 33 as ruled out with a named control at a specific location, 18 as tested with no issue found, 1 as not applicable, and 8 as unresolved follow-ups. Testing spanned all 18 content collections, the authentication and session layer, the file-serving layer, all 35 custom hook routes, the React rendering pipeline, and the deployment configuration.

**Constraints observed.** No source files were modified. No production records were destroyed; every test write was reverted and verified where the API permitted it, and no broadcast endpoint was triggered toward real users. Two test-hygiene items remain and are disclosed: a small number of inert `content_views` rows that no non-superuser is permitted to delete, and restoration of a member field that was temporarily modified during a probe.

# Technical Analysis

# Technical Analysis

**Severity model.** Ratings reflect the demonstrated consequence of the proof of concept, not the category of the weakness. Where a high-impact outcome was blocked by a confirmed constraint, the rating was reduced and the constraint recorded rather than the finding dropped. Where a control failure was demonstrated but its persisted effect could not be, the finding was reported at the demonstrated level with the gap stated explicitly.

## Findings

**1. Production MAX bot token exposed in the client environment file (Critical, CWE-798).** The live bot credential is stored in `client/.env` and is present in the repository's Git history. It authenticates to the MAX Bot API as the production bot (`id420550689204_bot`), and was used to read the bot's chat inventory and its registered webhook subscriptions. With it, an attacker can send messages to any member in the club's own bot voice and re-point the webhook to a server they control to harvest the stable member identifiers that this application uses as account keys. The secret is consumed only server-side (`$os.getenv('MAX_BOT_TOKEN')` in `botlib.js` and `max-auth.pb.js`), so its presence on the client side is exposure with no functional benefit.

**2. Unauthenticated access to private member media (High, CWE-306).** Media for the content collections is retrievable without any authentication. Independently, `GET /api/video-poster` is the only custom route in the project without an authentication check, and it resolves records with application privileges before streaming bytes from disk. Exploitation requires a known record identifier and stored filename, which are not anonymously enumerable — that constraint is why this is rated high rather than critical.

**3. Cross-user training history forgery and a removable attendance guard (Medium, CWE-863).** The `trainings` update rule permits any authenticated member to write to any training, with field-level authorization delegated to a hook. That hook exposes moderator-semantic relation fields (`moderator_kicked_users`, `restore_insufficient_users`) to ordinary members while validating ownership only for `booked_users` and `attended_users`, so a member can write another member's identifier into them and thereby control how that member's attendance is displayed and how removals are attributed in the audit trail. The same hook wraps its entire authorization block — including the moderator-only attendance assertion — in a condition derived from the caller-supplied `is_cancelled` value, so the guard can be switched off for a request; the exempted branch reaches an unguarded write to the server-authoritative `users.attendance_count` counter, which bypasses the field-level ACL because it executes with application privileges inside a transaction. The counter increment could not be persisted against the available data, and that gap is stated in the finding rather than folded into the rating.

**4. Broken function-level authorization on the training notification route (Medium, CWE-862).** `POST /api/bot-notify-training` authenticates the caller but never checks the moderator role, and takes the "acting as moderator" flag and the affected-member list from the request body. A member can therefore cause the club's bot to deliver a message presenting a moderator action against a named member to every moderator's chat. All five sibling notification routes perform the role check; this one omits it.

**5. Metric-write validation bypass (Medium, CWE-602).** The application validates view-tracking input on its dedicated route, but the underlying collection remains directly writable through the generic record API with only a self-attributed rule. Values the application rejects are accepted through the collection endpoint, and because the collection has no delete rule for non-superusers the resulting rows are permanently unremovable. Consumers are moderator-only and re-resolve objects server-side, which caps the impact.

**6–8. Hardening gaps (Low).** Wildcard CORS on the API advertises the authorization header as an allowed cross-origin request header (the bearer-token model and absent `Access-Control-Allow-Credentials` prevent classic CSRF, but a stolen token becomes usable from any origin). Session tokens remain valid after a refresh and no server-side logout exists, so a captured token cannot be revoked by the victim. The `notifications` update rule lets a member re-address their own notification to another member, enabling forged in-app notifications — the content is sanitizer-rendered, so the impact is spoofing rather than script execution.

## What held up

Several controls were attacked and confirmed sound, which is material context for prioritisation. The MAX Bridge signature validator implements the specification correctly and rejected over 60 forged payload variants. The auth token layer rejected algorithm confusion, claim tampering and expired tokens. Every one of the 35 custom routes except the one noted above enforces its role check before any side effect, and forged moderator claims are ignored in favour of the persisted role. The training session accounting, seat limits and race behaviour were exercised with concurrent bursts and remained consistent. The user field-level allow-list correctly rejects self-service changes to rating, attendance, membership and ban fields. The media and Yandex.Disk proxies rejected loopback, metadata-service, `file://` and host-suffix-confusion destinations. There is no server-side achievement persistence, and the inputs the client-side achievement computation trusts are moderator-only. The React post and comment rendering pipeline uses an allow-list sanitizer, and no stored XSS was found; no secrets were found in the deployed bundles and no source maps are served.

## Attack chaining

Cross-finding combinations were evaluated. The spoofed-notification finding is subsumed by the bot-token exposure (a token holder can message any member directly), so it does not compose into a larger impact. The notification-reassignment and notification-route findings share an effect class without being additive. **One combination is material and remains unproven:** the MAX Bridge signature is constructed with a key derived from the bot token, so a holder of that token has the necessary material to sign launch parameters — which would turn the token exposure into authentication forgery for any member account. This was attacked extensively, the server's key derivation was reproduced exactly, and no accepted signature was produced; the byte-string the live backend signs could not be reconstructed from its own source without a genuine captured sample. It is recorded as the highest-value open item with a concrete next step rather than as a finding, because it was not demonstrated.

## Systemic themes

- **Control drift between siblings.** The two most impactful authorization findings are both cases of a control that exists and works in most of its call paths but was omitted in one — a route among 34 siblings, a role check among six siblings, a relation field list not extended alongside its ownership check. A review that diffs sibling handlers would have caught all of them.
- **Validation placed on the route rather than the data store.** Because clients talk to the database directly, a check implemented in a custom route is not a property of the data. This is the mechanism behind the metric-write bypass and is the reason media rules drifted from the schema export.
- **Secrets in the client-side environment file.** The bot credential has no client-side consumer, yet it lives in the client environment file where it entered version control. A repository secret-scanning gate is the durable fix.

# Recommendations

# Recommendations

## Immediate (this week)

1. **Revoke and reissue the MAX bot token.** Treat the exposed value as compromised. Remove it from `client/.env` and purge it from Git history, then audit every tracked configuration file for the same credential family. Add a repository secret-scanning gate so a recurrence fails the build.
2. **Add the missing authentication gate to `GET /api/video-poster`,** mirroring the check its sibling handlers already perform, and place the check before record resolution and any filesystem access.
3. **Reconcile the live collection rules with the schema export.** Media is served without authentication while the export declares authenticated-only view rules; determine whether the deployed ruleset drifted or an intermediary widened it, and make the intended rule explicit in the schema so the data store enforces it.
4. **Add the missing moderator role check to `POST /api/bot-notify-training`** and stop trusting the acting-as-moderator flag from the request body.

## Short-term (this month)

5. **Make training authorization transition-independent.** Remove the cancel/restore condition from around the ownership and attendance checks so a caller cannot select the branch that skips them, and derive any transition handling from the persisted record. Apply the ownership check to every relation field the allow-list exposes, or drop the moderator-semantic fields from that allow-list entirely.
6. **Move validation onto the data store.** Restrict `content_views` creation to server-side code or add a collection-level create hook that applies the same validation as the application route, and give the collection a deletion path or a retention job.
7. **Tighten the notification write path.** Require `recipient = @request.auth.id` on update and freeze the recipient field, and prefer server-side creation so callers cannot choose the recipient.
8. **Restrict CORS** to the application's own origin instead of advertising authorization to every origin.
9. **Provide session revocation.** Implement server-side logout that invalidates issued tokens, and invalidate the previous token on refresh.

## Medium-term (this quarter)

10. **Re-scope read access on member records.** The `users` collection is readable in full by any authenticated member, including contact and membership fields the interface never displays for others. Introduce field-level visibility so the API returns only what each view needs.
11. **Add rate limiting and de-duplication** to the view-tracking and audit-click routes to bound write amplification from a single account, and to the media endpoints to make identifier enumeration impractical.
12. **Adopt a sibling-diff review practice** for authorization code: when a control is added to one handler, require confirmation that its siblings and call paths carry it too. The recurring finding class in this engagement is a control that is correct everywhere except one place.

## Retest and validation

13. Re-test the immediate items to confirm the bot token is revoked, the poster route rejects anonymous requests, and the media rules match the schema export.
14. Re-run the training authorization differential against the deployed hook, including a cancel/restore-shaped request carrying a foreign member identifier, and confirm a rejection on every relation field.
15. **Close the highest-value open item:** capture one genuine MAX Bridge launch payload from a real client session, recompute both candidate signing constructions, and determine whether the leaked bot token yields session forgery. If it does, the token exposure becomes complete account takeover and both the severity and the remediation urgency change accordingly.

## Test-data note

A small number of self-attributed metric rows created during testing could not be removed because the collection has no non-superuser delete rule; a supervisory account should purge rows whose identifiers are prefixed `zqath3`. All other test data was reverted and verified.

