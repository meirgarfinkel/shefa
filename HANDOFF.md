# Handoff — Shefa Job Board

**Phase:** 8 (polish + ship) — in progress. Phases 1–7 complete.

## ⚠️ Action required before deploy

- **Run the pending migration** for the new application index (schema changed this session):
  ```bash
  npm run db:dev-generate && npm run db:dev-migrate     # dev
  npm run db:prod-generate && npm run db:prod-migrate   # production
  ```
- **Seed an admin**: there is no UI to grant `ADMIN`. Set a user's `role` to `ADMIN`
  directly in the DB to access `/admin`.
- **Set `CRON_SECRET` in production** (see security finding S1).

## Built & working

- **Auth:** Google OAuth (Auth.js v5, JWT, DrizzleAdapter), role select, age-gated profiles.
- **Seeker:** create/edit profile, browse + apply, own applications, public profile.
- **Employer:** contact profile, company CRUD (multi-company), job CRUD/duplicate/pause/
  close, applications + status, dashboard, public company/employer pages.
- **Jobs:** public listing with filters, haversine geo radius search, sort; public detail.
- **Messaging:** inbox, thread, send, read receipts, block/unblock, report; hybrid initiation.
- **Freshness:** cron pings → escalation → auto-pause; login-free reactivation.
- **Notifications/responsiveness:** prefs, inline emails, digest cron, employer badge.
- **Rate limiting (new):** seekers ≤25 applications/day; employers ≤50 cold DMs/day.
  Rolling 24h row-count windows in `application.submit` / `conversation.create`.
- **Admin moderation (new):** `/admin` dashboard (ADMIN-only) — report queue with status
  triage (REVIEWED/ACTIONED/DISMISSED) and suspend/unsuspend. `admin` tRPC router.
- **Suspension enforcement (new):** soft block — SUSPENDED users can log in and view own
  data, but cannot apply, post jobs, or start conversations, and are hidden from public
  seeker/company/job views.
- **Crons (`vercel.json`):** freshness `0 9 * * *`, responsiveness `0 3 */2 * *`, digest `0 18 * * *`.
- **Tests:** 410 passing across 19 suites. `npm run check` green.

## Still needed (Phase 8)

- **Seeker dashboard** — none; seekers land on `/jobs` after login.
- **Error-handling polish** — friendlier user-facing messages.
- Address security findings S1–S2 below.
- Pre-ship audit — confirm prod env vars + `CRON_SECRET`.

## Security audit (this session — basic/moderate)

**Clean:** All mutating procedures derive identity from `ctx.session.user.id` and verify
ownership (job/company/conversation/application) — no IDOR, no `userId` from input. The
haversine raw SQL is parameterized via Drizzle `sql` bindings (no injection). Admin is
gated by `adminProcedure` (role check) + server layout + middleware. Self-report,
self-suspend, and suspending an admin are all blocked.

**Findings:**

- **S1 (medium) — cron auth fails open if `CRON_SECRET` is unset.** Routes compare the
  header to `` `Bearer ${process.env.CRON_SECRET}` ``; if the env var is missing, a request
  with `Authorization: Bearer undefined` matches. Fix: assert the secret is set (reject if
  not) and prefer a constant-time compare. Mitigation today: ensure `CRON_SECRET` is set in prod.
- **S2 (medium) — `user.deleteAccount` is broken and off-mission.** It hard-deletes the
  `User` row, but `application`/`report`/`seekerProfile`/`notificationPreferences`/
  `verificationPing` FKs to `users` lack `onDelete` cascade, so it throws for any user with
  dependent rows. Also conflicts with "no automatic deletion of user data." Decide: soft
  delete (deactivate) vs. explicit cascade. Currently effectively dead/unsafe.
- **S3 (low) — `report.submit` does not verify `targetId` exists.** Bogus targets are
  possible; admin UI shows "target no longer exists." Acceptable for v1.
- **S4 (low) — unsuspend sets status to `ACTIVE` unconditionally**, which would un-pause a
  freshness-PAUSED account. Rare; revisit if it bites.

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
npm run db:dev-generate && npm run db:dev-migrate      # pending application-index migration (dev)
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

## Blockers

None.
