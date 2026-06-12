# Handoff — Shefa Job Board

**Phase:** 8 (polish + ship) — in progress. Phases 1–7 complete.

## ⚠️ Action required before deploy

- **Seed an admin**: there is no UI to grant `ADMIN`. Set a user's `role` to `ADMIN`
  directly in the DB to access `/admin`.

## This session (latest)

- **`getInitials` deduped** — moved the duplicated helper into `src/lib/utils.ts`;
  `messages/page.tsx` and the employer dashboard now import it.
- **Feedback feature (new):** users send bug/improvement/thanks messages to admins.
  New `Feedback` table (`FeedbackCategory` BUG/IMPROVEMENT/THANKS/OTHER, `FeedbackStatus`
  OPEN/REVIEWED/RESOLVED) + `feedback` tRPC router (`submit` protected, rate-limited via
  new `FEEDBACK_PER_DAY=5` rolling window + `assertActorActive`; `listAll`/`updateStatus`
  admin-only). Submitting fires a fire-and-forget email to `ADMIN_EMAIL` (new optional env
  var — added to `.env.example`; no-op if unset, row still stored). UI: `FeedbackDialog`
  opened from the user menu; new "Feedback" tab in `/admin`. Email composer in
  `src/server/emails/feedback-notify.ts`. 15 router tests.
- **Hire capture on close (new):** new nullable `JobPosting.hiredApplicationId`. When an
  employer closes a job as `FILLED_ON_SHEFA`, `CloseJobModal` lists non-rejected applicants
  (`SUBMITTED`/`VIEWED`, via `application.listForJob`) with a "Prefer not to say" option and
  passes the chosen id to `jobPosting.close`. The procedure validates the application belongs
  to the job and isn't `REJECTED`; the field is ignored for other reasons and cleared on
  reopen. The hire is still `CLOSED` by the cascade — this only records who was hired.
- **Deduped the inline `CloseJobModal`** in the employer dashboard `_client.tsx` — it now
  reuses the shared `@/components/close-job-modal` (so the dashboard gets the hire flow too).
- **Migration required before deploy** (Feedback table + 2 enums + `hiredApplicationId`):
  `npm run db:dev-generate && npm run db:dev-migrate` (then `db:prod-*`).
- **Tests:** 470 passing (was 450). `npm run check` green.

## Built & working

- **Auth:** Google OAuth (Auth.js v5, JWT, DrizzleAdapter), role select, age-gated profiles.
- **Seeker:** create/edit profile, browse + apply, own applications, public profile.
- **Employer:** contact profile, company CRUD (multi-company), job CRUD/duplicate/pause/
  close, applications + status, dashboard, public company/employer pages.
- **Jobs:** public listing with filters, haversine geo radius search, sort; public detail.
- **Messaging:** inbox, thread, send, read receipts, block/unblock, report; hybrid initiation.
  Application status (`REJECTED`/`CLOSED`) no longer gates messaging — threads stay open for
  employer follow-up/reconsideration; gated only by block flags, suspension, and `ACTIVE` job.
- **Application/job lifecycle coupling (new):** closing a job cascades its open
  (`SUBMITTED`/`VIEWED`) applications to `CLOSED` (rejected ones untouched); new
  `jobPosting.reopen` reverses it — closed job → `PAUSED`, `CLOSED` apps → `SUBMITTED`.
  Per-application `Reject`/`Close` collapsed to just `Reject` + an `Undo`
  (`REJECTED`→`VIEWED`, `CLOSED`→`SUBMITTED`); `CLOSED` is now cascade-only, never a manual
  per-application target. `application.updateStatus` enforces an explicit transition map.
- **Freshness:** cron pings → escalation → auto-pause; login-free reactivation.
- **Notifications/responsiveness:** prefs, inline emails, digest cron, employer badge.
- **Rate limiting (new):** seekers ≤25 applications/day; employers ≤50 cold DMs/day.
  Rolling 24h row-count windows in `application.submit` / `conversation.create`.
- **Admin moderation (new):** `/admin` dashboard (ADMIN-only) — report queue with status
  triage (REVIEWED/ACTIONED/DISMISSED) and suspend/unsuspend. `admin` tRPC router.
- **Suspension enforcement (new):** soft block — SUSPENDED users can log in and view own
  data, but cannot apply, post jobs, or start conversations, and are hidden from public
  seeker/company/job views.
- **Account deletion = soft delete (new):** `user.deleteAccount` → `softDeleteAccount`
  (`src/server/account.ts`). One atomic `db.batch`: scrubs User PII (`email` → unique
  non-routable placeholder, `name`/`phone`/`image` → null, sets `deletedAt`), closes the
  user's open jobs (`CLOSED`/`CANCELLED`) and their still-open (`SUBMITTED`/`VIEWED`)
  applications (`CLOSED`, leaving `REJECTED`), marks profiles `DELETED` with generic names,
  drops `NotificationPreferences`, and deletes only `Account`/`Session` rows.
  Conversation/message/application *rows* are preserved (the other party keeps history;
  reports stay as evidence) — applications are status-closed, never deleted. Re-signup with the real Google email creates a fresh row.
  `createTRPCContext` drops the session when `deletedAt` is set, so a JWT lingering on
  another device is rejected on its next request. `seeker.getPublicProfile` 404s `DELETED`.
- **Crons (`vercel.json`):** freshness `0 9 * * *`, responsiveness `0 3 */2 * *`, digest `0 18 * * *`.
- **Tests:** All passed. `npm run check` green.

## Still needed (Phase 8)

- **Seeker dashboard** — none; seekers land on `/jobs` after login.
- ~~Error-handling polish~~ — custom `not-found`/`error`/`global-error` pages added this
  session (audit M1). Friendlier per-field messages still a nice-to-have.
- ~~Address security findings~~ — full pre-launch audit (`AUDIT.md`) done and all
  Critical/High/Medium + L4 findings fixed this session (see below).

## Pre-launch audit (this session) — `AUDIT.md`

Full audit across auth/authz, concurrency, performance, validation, error handling, rate
limiting, code quality, and ops. **All Critical + High + Medium findings and L4 are now
fixed** (this session). Remaining backlog: L1–L3, L5–L6 (low — see `AUDIT.md`).

**Fixed this session:**

- **C1 — account deletion was broken in prod.** `softDeleteAccount` used `db.transaction`,
  which the Neon HTTP driver throws on (`"No transactions support"`); the test passed only
  because it mocked `transaction`. Rewrote onto **`db.batch`** (atomic, supported). Test
  mock updated to `db.batch`.
- **H1 — `AUTH_URL`.** New `src/server/app-url.ts#getAppUrl()`: returns `AUTH_URL`, **throws
  in production if unset**, falls back to localhost in dev. Replaced all 5 `?? localhost`
  fallbacks + the `process.env.AUTH_URL!` in the verify route. Env example fixed (H1/M6).
- **H2 — cron auth.** New `src/server/cron-auth.ts#verifyCronRequest()`: **fails closed**
  when `CRON_SECRET` is unset, constant-time compare (`timingSafeEqual`). Wired into all
  three cron routes. (Supersedes old S1.)
- **H3 — cold-DM duplicate race.** Added a **partial unique index** on
  `Conversation(seekerId, employerId) WHERE jobId IS NULL` (migration `0003`) and a `23505`
  catch in `conversation.create` that returns the winning row. Idempotency now enforced by
  the DB, not a pre-check. Test added.
- **H4 — apply message length.** `ApplySchema.message` 1000 → **500** to match the
  `varchar(500)` column and spec (UI already capped at 500).
- **H5 — unbounded list.** `jobPosting.list` now capped at `LIST_LIMIT = 100` (findMany +
  geo SQL `LIMIT`). Client still displays top 50.
- **H6 — haversine full scan.** Added a **bounding-box pre-filter** (`lat/lon BETWEEN`)
  before the acos refinement so the `(lat, lon)` index prunes candidates.
- **H7 — security headers.** `next.config.ts` now sets HSTS, `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`, and a baseline CSP (allows Google
  OAuth/avatars + Next inline runtime). Verify the CSP against OAuth in staging.
- **M1 — error pages.** Added `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`.
- **M2 — digest idempotency.** Added `NotificationPreferences.lastDigestSentAt` (migration
  `0003`); digest skips users sent within the window and stamps the column on send. Tests added.
- **M3/M4 — freshness resilience.** Each profile/job iteration is wrapped in `try/catch`
  (one failed send no longer aborts the batch), and an **undelivered ping + its tokens are
  rolled back** on send failure so a transient Resend error can't march an active user to
  PAUSED.
- **M5 — job update status race.** `jobPosting.update` now guards `ne(status, "CLOSED")` in
  the WHERE and throws `CONFLICT` on zero rows (can't resurrect a concurrently-closed job).
- **M6 — env example.** `env.production.example` rewritten: dropped Redis/Railway, added
  `AUTH_URL` + `CRON_SECRET`, fixed `NEXTAUTH_URL` → `AUTH_URL`.
- **M7 — sender address.** `sendEmail` reads `RESEND_FROM_EMAIL` (falls back to the literal).
- **L4 — tombstones in crons.** `softDeleteAccount` deletes `NotificationPreferences`; the
  digest job also skips `deletedAt` users defensively.

**Still clean (verified, unchanged):** identity from `ctx.session.user.id`, ownership checks
(no IDOR / no `userId` from input), parameterized raw SQL, admin gating, self-report/
self-suspend/suspend-admin blocks, trigram indexes in use, no N+1, no `as any` in source.

**Backlog (low, deferred):** S3/L2 (`report.submit` doesn't verify target exists);
S4/L3 (unsuspend → `ACTIVE` can un-pause a freshness-PAUSED account); L1 (inline label maps
should move to `labels.ts`); L5 (`minHourlyRate` upper bound vs `decimal(8,2)`); L6 (seeker
city/state not validated against geo tables).

## Intentionally missing (not bugs)

- No payments, no protected-class/education filtering, no auto-deletion of user data (mission).
- No skills taxonomy (removed by design); languages only. No seeker responsiveness metric.
- Rate-limit check is non-atomic (count-then-insert); a burst may exceed the cap by a few —
  accepted for an abuse throttle. No new-account tier (chose flat limits for v1).
- Deferred to v2+: mobile, SMS, real-time messaging, attachments, photos/logos, inbox
  search, user-extensible taxonomies.

## Commands

```bash
npm run check                                          # typecheck + lint + format
npm run db:dev-generate && npm run db:dev-migrate      # pending migration: app index + User.deletedAt + ProfileStatus.DELETED (dev)
npm run db:prod-generate && npm run db:prod-migrate    # same, against production
```

## Decision records

- **Rate limiting = rolling-window row counts** (no Redis, no counter table, no new-account
  tier). _Alternatives:_ dedicated `RateLimit` table; per-tier limits. _Reason:_ simplest
  correct fit for the Neon HTTP driver; limits are flat per spec; one indexed `$count` per
  write is negligible. Added `Application(seekerId, createdAt)` index to support it.
- **Cold-DM cap counts `employerId + jobId IS NULL` only**, AND `conversation.create` now
  requires the seeker to have applied when an employer supplies a `jobId`. _Alternatives:_
  count all employer conversations (overcounts seeker-initiated); add an `initiatedBy`
  column. _Reason:_ seeker-initiated threads always carry a `jobId`, so `jobId IS NULL` is a
  correct definition of "cold" once the employer job-link path requires an application —
  this also closes a real authz gap (employer attaching an unrelated job) with no schema change.
- **Admin scope = reports + suspend** (not browse-all). _Reason:_ minimum that makes
  moderation enforceable and uses the `SUSPENDED` status; proactive browse deferred.
- **Suspension = soft block** (hidden + write-blocked, can still view own data).
  _Alternatives:_ hard lockout via DB check in every server layout. _Reason:_ reversible,
  no data destruction, mission-aligned; middleware is Edge-only and can't check the DB.
- **Account deletion = soft delete + anonymize** (keep the `User` row; scrub PII; close
  jobs; mark profile `DELETED`; delete only `Account`/`Session`). _Alternatives:_ (a) hard
  delete + add `onDelete: cascade` to every FK rooted at `users` — rejected: destroys the
  other party's conversations and the reports filed as evidence, and conflicts with the
  "no deletion of user data" mission; (b) hard delete with nullable `employerId`/`seekerId`
  + `SET NULL` — rejected: orphaned rows, more nullable FKs to reason about, no cleaner than
  soft delete. _Reason:_ preserves referential integrity with zero cascade, keeps the other
  party's history and report evidence intact, lets the person re-sign-up fresh (scrambled
  unique email + severed `Account`), and matches the codebase's data-preservation
  philosophy. _Session invalidation:_ JWT strategy means the cookie outlives deletion, so
  `createTRPCContext` checks `deletedAt` per request and nulls the session — chosen over a
  `protectedProcedure` middleware check, which would have broken the mock-based router test
  suites and run against the module-level `db`.

- **Job close cascades to applications; terminal app states are reversible.**
  _What changed:_ closing a job now marks its `SUBMITTED`/`VIEWED` applications `CLOSED`
  (leaving `REJECTED`); reopening (new `jobPosting.reopen`, → `PAUSED`) reverts `CLOSED`
  apps to `SUBMITTED`. `REJECTED`→`VIEWED` and `CLOSED`→`SUBMITTED` are employer-undoable.
  Application status no longer blocks messaging. _Alternatives:_ (a) keep per-application
  `Close` button — rejected: it duplicated `Reject` semantically; closing means "role
  filled," which is a job-level fact, so `CLOSED` is now driven only by the job cascade.
  (b) Drop `CLOSED` from the enum — rejected: needs a destructive migration of existing
  rows; `CLOSED` still carries distinct meaning (closed-by-fill vs. explicitly rejected).
  (c) Reopen straight to `ACTIVE` — rejected: `PAUSED` makes the employer re-verify before
  going live, matching the duplicate-as-`PAUSED` and freshness-auto-`PAUSE` patterns.
  _Reason:_ overrides the former "closing a job never closes applications / terminal states
  are terminal" invariant (PROJECT_SPEC §3 updated) to give employers reversible control
  without losing data; cascade is no-transaction sequential (job first, then apps), matching
  the repo's existing no-transaction convention. _Note:_ `softDeleteAccount` closes jobs via
  a direct `db.batch` (not `jobPosting.close`), so it replicates the app cascade inline
  (closes the deleted employer's `SUBMITTED`/`VIEWED` applications, leaves `REJECTED`) to
  keep the invariant — no `CLOSED` job left with live applications.

## Blockers

None.
