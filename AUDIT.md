# Shefa — Pre-Launch Production Audit

> Diagnosis only. No code was modified in this pass. Findings are grouped by severity
> with file/location, the problem, why it matters at scale, and the recommended fix.
>
> Scope reviewed: every tRPC router, all cron jobs and job modules, the auth/middleware
> split, the full Drizzle schema + migrations, shared Zod schemas, email/notification
> paths, and the operational config (`vercel.json`, `next.config.ts`, env examples).
> `npm run check` (typecheck + lint + format) passes clean; 428 tests pass.

---

## Critical

### C1 — Account deletion throws at runtime: `db.transaction` is unsupported by the neon-http driver

**Location:** `src/server/account.ts:47` (`softDeleteAccount`), invoked by `src/server/api/routers/user.ts:15` (`user.deleteAccount`).

**Problem.** The app's DB client is the Neon **HTTP** driver (`drizzle-orm/neon-http` in `src/db/index.ts`). That driver does not implement interactive transactions — `node_modules/drizzle-orm/neon-http/session.js` literally throws `Error("No transactions support in neon-http driver")` from `.transaction()`. `softDeleteAccount` wraps all its writes in `await db.transaction(async (tx) => …)`, so **every call throws before doing any work**. The unit test passes only because `account.test.ts` injects a fake `db` whose `transaction` just runs the callback — it never exercises the real driver.

**Why it matters at scale.** Account deletion is completely broken in production: the mutation 500s, no PII is scrubbed, and the GDPR/CCPA "delete my account" promise silently fails for every user who tries. It also can't be caught by the existing test suite because the suite mocks the exact thing that fails.

**Fix.** Don't use `db.transaction` with neon-http. Either (a) switch to sequential statements ordered so a mid-failure is recoverable/idempotent (the operations are all single-row upserts by `userId` and are naturally re-runnable), or (b) use `db.batch([...])` which neon-http _does_ support for atomic multi-statement execution, or (c) move this one operation onto a `Pool`-based `drizzle-orm/neon-serverless` client that supports transactions. Add an integration test that runs against the real driver (or at least asserts `transaction` is not called) so this can't regress.

---

## High

### H1 — `AUTH_URL` is undefined in production per the documented env example → broken verify links and a 500 in the redemption route

**Location:** `env.production.example:14` vs. code in `src/app/api/verify/[token]/route.ts:14-20`, `src/server/jobs/freshness.job.ts:102,167`, `message-notify.job.ts:35`, `application-notify.job.ts:34`, `daily-digest.job.ts:110`.

**Problem.** All app code reads `process.env.AUTH_URL`. The production env example documents `NEXTAUTH_URL` instead and never mentions `AUTH_URL`. A deployer who follows the example leaves `AUTH_URL` unset, so:

- the freshness/notification emails fall back to `http://localhost:3000`, making every "still looking?" and notification link point at localhost;
- the login-free redemption route uses `new URL(path, process.env.AUTH_URL!)` with a non-null assertion — with `AUTH_URL` undefined this throws `TypeError: Invalid base URL`, returning a generic 500 when a user clicks a verification link.

**Why it matters at scale.** The freshness engine is the product's core "no ghost listings" promise; if its links are dead, listings silently rot. The redemption 500 means no one can reactivate via email.

**Fix.** Standardize on one variable. Add `AUTH_URL="https://<prod-domain>"` to `env.production.example` (and either drop `NEXTAUTH_URL` or document that both are set). Replace the `?? "http://localhost:3000"` fallbacks with a fail-fast assertion at startup so a missing value is caught in deploy, not in a user's inbox.

### H2 — `CRON_SECRET` is missing from the production env example and the cron check fails open if unset

**Location:** `src/app/api/cron/{freshness,responsiveness,digest}/route.ts:5`; `env.production.example` (no `CRON_SECRET`).

**Problem.** Each cron route does `req.headers.get("authorization") === \`Bearer ${process.env.CRON_SECRET}\``. If `CRON_SECRET`is unset, the comparison target becomes the literal string`"Bearer undefined"`, which an attacker can send verbatim to trigger the job — auto-pausing listings, blasting emails, recomputing responsiveness. `CRON_SECRET`is also absent from`env.production.example`, so a deployer is likely to miss it. (This is the previously-tracked S1; still unaddressed in code.)

**Why it matters at scale.** A publicly triggerable digest/freshness endpoint is an email-bomb and a data-mutation vector, reachable by anyone who reads the route path.

**Fix.** Assert the secret is present (`if (!process.env.CRON_SECRET) return 500`) and reject before comparing; use a constant-time compare. Add `CRON_SECRET` to `env.production.example`. Confirm it is set in Vercel before launch.

### H3 — Duplicate cold-DM conversations can be created under concurrent requests (the nullable-`jobId` unique gap)

**Location:** `src/server/api/routers/conversation.ts:116-148`; constraint `Conversation_seekerId_employerId_jobId_key` in `src/db/schema/conversation.ts:30`.

**Problem.** Cold DMs are stored with `jobId = NULL`. The uniqueness guard is a _read-then-insert_: `findFirst(existing)` then `insert`. In Postgres a `UNIQUE` constraint treats `NULL`s as **distinct**, so the constraint does **not** dedupe two rows that share `(seekerId, employerId)` with `jobId IS NULL`. Two concurrent `conversation.create` calls both miss the `existing` check and both insert — yielding duplicate threads. (Job-scoped conversations are safe because `jobId` is non-null and the unique constraint bites.)

**Why it matters at scale.** Under a launch-day burst (e.g. an employer double-clicking, or two tabs), the inbox shows split threads; messages scatter across duplicates and the "idempotent conversation" invariant in `PROJECT_SPEC.md §3` breaks.

**Fix.** Make the constraint enforce the invariant instead of the pre-check. Add a partial unique index `CREATE UNIQUE INDEX ON "Conversation" (seekerId, employerId) WHERE jobId IS NULL`, or recreate the composite unique with `NULLS NOT DISTINCT`. Then catch `23505` on insert and return the existing row, exactly as `application.submit` already does for the apply path. (Migration required — give the user `generate`/`migrate` before code.)

### H4 — `application.submit` can 500 on a valid message: Zod allows 1000 chars, the DB column is `varchar(500)`

**Location:** `src/lib/schemas/application.ts:6` (`message: optionalTrimmedString(1000)`) vs. `src/db/schema/application.ts:19` (`message varchar(500)`). Spec says ≤500.

**Problem.** A message of 501–1000 characters passes Zod, then fails the DB length check with Postgres error `22001`. The insert's `catch` only special-cases `23505` (unique); everything else is rethrown as an opaque 500.

**Why it matters at scale.** A normal long cover note produces a confusing server error instead of a field validation message — and it diverges from the documented 500-char domain rule.

**Fix.** Change the schema to `optionalTrimmedString(500)` to match the column and spec. (Optionally surface DB length violations as `BAD_REQUEST` generically.)

### H5 — `jobPosting.list` returns unbounded rows (no pagination/cap) for the public job board

**Location:** `src/server/api/routers/jobPosting.ts:164-197`.

**Problem.** The main public listing query has no `limit`. It loads **every** matching `ACTIVE` job (after filters), then fans out an application-count aggregation and maps it in JS. `jobPosting.search` correctly caps at `LIMIT 100`; `list` does not.

**Why it matters at scale.** This is the highest-traffic read in the app. With thousands of active listings and simultaneous users, every page load pulls the full active set over the Neon HTTP driver into a serverless function — latency, memory, and egress all grow linearly with the catalog. It's the most likely thing to fall over at launch.

**Fix.** Add keyset or offset pagination (e.g. `limit`/`cursor` in `ListJobPostingsSchema`) and cap the page size. Return a bounded page plus a cursor; have the client load more on scroll.

### H6 — Haversine geo query has no bounding-box pre-filter and cannot use the `lat/lon` index

**Location:** `src/server/api/routers/jobPosting.ts:98-118`; index `JobPosting_lat_lon_idx` in `src/db/schema/job.ts:70`.

**Problem.** The radius query computes `acos(...)` for **every** `JobPosting` with non-null `lat/lon` (full scan), then filters on the computed distance. The audit asked specifically to confirm the bounding-box pre-filter — it is **missing**. The btree `(lat, lon)` index is useless to a trig expression, so it never gets used.

**Why it matters at scale.** Every "search near me" runs a full-table trig scan. Combined with H5 (the geo path also feeds the unbounded list), this is a second compounding scale risk on the busiest endpoint.

**Fix.** Add a cheap bounding-box `WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?` (computed from the center + radius) _before_ the haversine refinement. That predicate is index-sargable and shrinks the candidate set to the box, after which the exact haversine filter/sort runs on a small remainder.

### H7 — No security headers configured (`next.config.ts` is empty)

**Location:** `next.config.ts:3-5`.

**Problem.** There is no `headers()` config: no HSTS, `X-Frame-Options`/`frame-ancestors` (clickjacking), `X-Content-Type-Options`, `Referrer-Policy`, or CSP. For a site with authenticated sessions, OAuth, and user-generated content (job descriptions, messages rendered with `whitespace-pre-wrap`), these are baseline.

**Why it matters at scale.** Clickjacking against authenticated actions and the absence of HSTS on a cookie-auth app are exactly the things a launch invites scrutiny on.

**Fix.** Add a `headers()` block in `next.config.ts` setting `Strict-Transport-Security`, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a baseline `Content-Security-Policy`. Verify the CSP doesn't break Google OAuth or Next inline scripts (start in report-only).

---

## Medium

### M1 — No custom error / not-found / global-error pages

**Location:** `src/app/` (no `error.tsx`, `not-found.tsx`, or `global-error.tsx` anywhere).

**Problem.** Any thrown render-path error or unmatched route shows the default Next.js page. The audit explicitly asks for a sensible 404/500.

**Why it matters at scale.** Unbranded stack-ish error screens on launch day erode trust and leak framework details.

**Fix.** Add `app/not-found.tsx`, `app/error.tsx` (client component with reset), and `app/global-error.tsx`, styled with the existing design system.

### M2 — Daily digest cron is not idempotent across retries (duplicate digest emails)

**Location:** `src/server/jobs/daily-digest.job.ts`.

**Problem.** The job selects everything from the last 24h and emails it; there is no per-user "already sent today" marker. Vercel can retry a cron invocation (or a manual re-trigger via H2), and each run re-sends the full digest. (The freshness job _is_ effectively idempotent — it filters to `ACTIVE` and the ping-cycle math no-ops on a second same-day run; responsiveness is a pure recompute. Digest is the outlier.)

**Why it matters at scale.** A retried digest run double-emails your entire digest cohort.

**Fix.** Record a `lastDigestSentAt` (on `NotificationPreferences` or a small log table) and skip users already sent within the window; or make the window boundary deterministic (calendar day) and dedupe on it.

### M3 — `freshness.job` aborts the whole run if a single email send throws

**Location:** `src/server/jobs/freshness.job.ts:114-118,179-183` (and the surrounding loops).

**Problem.** Unlike `daily-digest.job` (which wraps each user in `try/catch`), the freshness loops `await sendEmail(...)` with no per-iteration guard. One Resend failure (rate limit, transient 5xx) throws out of the loop, so every not-yet-processed profile/job is skipped for that day, and the cron returns 500.

**Why it matters at scale.** A single flaky send silently halts freshness processing for the remainder of the batch.

**Fix.** Wrap each profile/job iteration in `try/catch` and log-and-continue, mirroring the digest job. Consider that the ping row is inserted before the email — on send failure you've recorded a ping that never reached the user (see M4).

### M4 — Freshness ping row is inserted before the email succeeds (partial-state on send failure)

**Location:** `src/server/jobs/freshness.job.ts:89-118,154-183`.

**Problem.** `insert(verificationPing)` + token creation happen, then `sendEmail`. If the send fails, the ping/tokens persist as if delivered. On the next run `computeFreshnessAction` counts that ping as "sent and unresponded," advancing the user toward auto-pause without them ever receiving a warning.

**Why it matters at scale.** Send failures can push real, active users to `PAUSED` without notice — a data-correctness issue for the core freshness promise.

**Fix.** Send first, then record the ping on success; or mark the ping with a delivery status and don't count undelivered pings toward escalation. At minimum, pair with M3 so a failure doesn't also abort the batch.

### M5 — `jobPosting.update` checks `status === "CLOSED"` in JS, not in the UPDATE predicate (status-flip race)

**Location:** `src/server/api/routers/jobPosting.ts:254-294`.

**Problem.** The closed-check reads the row, then later issues `update … where id = ?`. A concurrent `close` between the read and the write can be silently overwritten (e.g. reopening a job that was just closed). Same shape applies to the `status` field generally.

**Why it matters at scale.** Rare, but it's a read-modify-write without a guarded predicate; under concurrency it can resurrect a closed listing.

**Fix.** Push the guard into the write: `update(jobPosting).set(...).where(and(eq(id), ne(status, "CLOSED")))` and treat a zero-row result as a conflict. Low effort, removes the race.

### M6 — `env.production.example` documents infrastructure that contradicts the architecture

**Location:** `env.production.example:1,28-31`.

**Problem.** The header says "Vercel + Neon + **Upstash + Railway**" and the file includes a `REDIS_URL` (Upstash) block. The project's stack is explicitly **Vercel + Neon + Resend only, no Redis/Railway** (see `PROJECT_SPEC.md §5` and the recorded rate-limit decision). The example is stale and misleading, and—combined with H1/H2—the env documentation is the weakest operational artifact.

**Why it matters at scale.** A deployer provisions services that aren't used and trusts a file that omits the two variables that actually matter (`AUTH_URL`, `CRON_SECRET`).

**Fix.** Rewrite `env.production.example` to the real surface: `DATABASE_URL` (pooled), `AUTH_SECRET`, `AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`, `NODE_ENV`. Remove the Redis/Railway sections.

### M7 — `RESEND_FROM_EMAIL` is documented but the sender is hard-coded

**Location:** `src/server/emails/index.ts:18` (`from: "Shefa <noreply@shefa.jobs>"`) vs. `env.production.example:26` (`RESEND_FROM_EMAIL`).

**Problem.** The from-address is a string literal; the documented env var is never read. Not a bug, but a config-drift trap (change the var, nothing happens).

**Fix.** Either read `process.env.RESEND_FROM_EMAIL` (with the literal as fallback) or drop the var from the example.

---

## Low

### L1 — Duplicated enum→label maps live inline in pages instead of `labels.ts`

**Location:** `INDUSTRY_LABELS` in `src/app/business/[id]/page.tsx:11`; `EDUCATION_LABELS` in `src/app/seeker/(public)/[profileId]/page.tsx:14`; `APPLICATION_STATUS_LABELS`/`APPLICATION_STATUS_STYLES` in `src/app/jobs/[id]/page.tsx:22,28`; `TARGET_LABEL` in `src/app/admin/page.tsx:17`.

**Problem.** `CLAUDE.md §1` and `PROJECT_SPEC.md §6` mandate one label map per concept in `src/lib/constants/labels.ts`. These four maps are defined ad hoc in components. Risk is drift when an enum value is added.

**Fix.** Move them into `labels.ts` and import. Low priority, pure consolidation.

### L2 — `report.submit` does not verify the target exists

**Location:** `src/server/api/routers/report.ts`. (Previously tracked as S3.)

**Problem.** A crafted `targetId` creates a report against a nonexistent entity; the admin UI shows "target no longer exists." Reports are evidence-only and self-reporting is blocked, so impact is cosmetic queue noise.

**Fix.** Optionally validate the target per `targetType` before insert. Acceptable to defer.

### L3 — Unsuspend sets status to `ACTIVE` unconditionally, overwriting a freshness `PAUSED`

**Location:** `src/server/api/routers/admin.ts:119-127`. (Previously tracked as S4.)

**Problem.** `setUserSuspension(false)` writes `ACTIVE` to both profile tables, so a user who was independently `PAUSED` by the freshness engine comes back `ACTIVE` after an unrelated unsuspend.

**Fix.** Track suspension separately from freshness state, or restore to the prior status. Rare; defer.

### L4 — Soft-deleted accounts may still be processed by crons

**Location:** `src/server/jobs/freshness.job.ts`, `responsiveness.job.ts`, `daily-digest.job.ts`. (Follow-up to the S2 resolution.)

**Problem.** The freshness/responsiveness/digest jobs don't explicitly exclude `users.deletedAt IS NOT NULL` / profiles with `status = 'DELETED'`. In practice a deleted account has its jobs `CLOSED`, profile `DELETED` (not `ACTIVE`), and `Account/Session` removed, so the queries mostly skip them — but the digest selects by `NotificationPreferences`, which is not scrubbed on delete, and would email the tombstoned (non-routable) address.

**Why it matters.** A deleted user's `NotificationPreferences` row survives, so the digest job can attempt a send to `deleted-…@deleted.shefa.invalid` (bounces, wasted send).

**Fix.** Add `deletedAt IS NULL` / `status != 'DELETED'` guards to the cron selects, or delete `NotificationPreferences` in `softDeleteAccount`.

### L5 — `minHourlyRate` has no upper bound vs. `decimal(8,2)` column

**Location:** `src/lib/schemas/jobPosting.ts:26` (`z.number().positive()`) vs. `src/db/schema/job.ts:44` (`decimal(8,2)`).

**Problem.** A value ≥ 1,000,000 overflows `decimal(8,2)` and 500s (numeric field overflow), same class as H4 but far less likely.

**Fix.** Add `.max(999999.99)` (or a sane cap like 10,000) to the schema.

### L6 — Seeker profile city/state are not validated against the geography tables

**Location:** `src/lib/schemas/seeker.ts:18-19`, `src/server/api/routers/seeker.ts` (create/update).

**Problem.** Job postings validate city/state via `lookupCityCoords` (rejects unknown locations); seeker profiles accept arbitrary strings. Seeker profiles aren't geocoded so there's no functional break, but it's an inconsistency the audit flags under "validate against the known set."

**Fix.** Validate against the seeded `city`/`state` set on profile write for consistency, or document that seeker location is free-text by design.

---

## Clean — verified, no action needed

- **Identity & IDOR.** Every mutating procedure derives identity from `ctx.session.user.id`; no procedure accepts a `userId`. Ownership is checked on jobs, businesses, applications, and conversations before any write. `userId` never appears in a URL or input (public routes take profile/business ids).
- **Public read leakage.** `seeker.getPublicProfile` strips `userId` and 404s `SUSPENDED`/`DELETED`; it returns no `email`/`phone`/`isAdult` (those live on `User`, never selected). Public job/business reads expose only intended fields and hide suspended employers.
- **Middleware is Edge-safe.** `src/middleware.ts` imports only `auth.config.ts` + Next built-ins; `auth.config.ts` carries no DB/adapter. Auth gating is presence-only; role/onboarding gating lives in server layouts (`admin`, `employer`, `seeker`, `(needs-business)`), as the spec requires.
- **Session invalidation on delete.** `createTRPCContext` drops the session when `users.deletedAt` is set, so a lingering JWT can't act (independent of the C1 bug, which is on the write side).
- **Apply de-dup is correct.** `application.submit` relies on the real `(seekerId, jobId)` unique constraint and catches `23505` — the correct race-safe pattern. (Contrast H3, which lacks the constraint.)
- **SQL injection.** The haversine and trigram raw SQL use Drizzle `sql` parameter bindings throughout; no string interpolation of user input.
- **Trigram search.** `pg_trgm` extension + GIN indexes on `JobPosting.title`/`description` exist (`drizzle/0000…sql:299-301`) and `jobPosting.search` uses `<%`/`word_similarity`, which those indexes serve. Search is capped at `LIMIT 100`.
- **N+1.** List endpoints (jobs, inbox, applications, admin queue) batch their aggregates with `inArray` + `groupBy` and resolve targets in bulk — no per-row round trips.
- **Indexing.** Status/filter/sort columns, FK columns, rate-limit windows (`Application(seekerId, createdAt)`), and inbox ordering (`Conversation(employerId/seekerId, lastMessageAt)`) all have supporting indexes.
- **Blocked/suspended enforcement.** `message.send` blocks on either-side block flag and on non-ACTIVE job/profile; `assertActorActive` gates apply/post/DM for suspended actors; suspended employers' jobs/businesses are hidden from public reads.
- **Type hygiene.** No `as any`, `@ts-ignore`, or `@ts-expect-error` in non-test source. No `console.log` in production paths (only seed scripts). `npm run check` is green.
- **Secrets.** `.env`, `.env.production`, `.env.local` are git-ignored and not tracked.

---

## Fix-before-launch shortlist (Critical + High)

1. **C1** — Rewrite `softDeleteAccount` off `db.transaction` (use `db.batch` or sequential idempotent writes); add a real-driver test. _Account deletion is currently broken in prod._
2. **H1** — Standardize on `AUTH_URL`; add it to the prod env example; fail-fast if unset. _Verification links and the redemption route break otherwise._
3. **H2** — Reject cron requests when `CRON_SECRET` is unset (constant-time compare); add it to the prod env example; confirm it's set in Vercel. _Endpoints are publicly triggerable otherwise._
4. **H3** — Add a partial unique index for cold DMs (`jobId IS NULL`) + `23505` catch. _Duplicate conversations under concurrency._ (Migration.)
5. **H4** — Lower `ApplySchema.message` to 500 to match the column/spec. _Valid messages 500 otherwise._
6. **H5** — Paginate/cap `jobPosting.list`. _Unbounded read on the busiest endpoint._
7. **H6** — Add a bounding-box pre-filter to the haversine query so the `lat/lon` index is usable. _Full-table trig scan per geo search._
8. **H7** — Add security headers (HSTS, frame-ancestors, nosniff, referrer, CSP) in `next.config.ts`.

## Post-launch backlog (Medium + Low)

- **M1** custom error/404/500 pages · **M2** digest idempotency · **M3** per-iteration try/catch in freshness · **M4** send-before-record ordering for pings · **M5** guarded status UPDATE predicate · **M6** rewrite `env.production.example` (drop Redis/Railway) · **M7** read or drop `RESEND_FROM_EMAIL`.
- **L1** consolidate label maps into `labels.ts` · **L2** validate report targets · **L3** unsuspend vs. freshness-pause · **L4** exclude deleted accounts from crons / scrub `NotificationPreferences` · **L5** cap `minHourlyRate` · **L6** validate seeker city/state.

> Migrations required for: **H3** (partial unique index). All other fixes are code/config only.
