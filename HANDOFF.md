# Handoff — Shefa Job Board

## Current phase

**Phase 6 — Freshness System (complete, pending migration)**

---

## What was completed this session

### Schema changes (`prisma/schema.prisma`)

Added to `FreshnessToken`:

- `action PingResponse` — which action (CONFIRMED / PAUSED / NOT_LOOKING / FILLED) this token performs
- `pingId String?` — FK back to `VerificationPing`
- `ping VerificationPing?` relation

Added to `VerificationPing`:

- `freshnessTokens FreshnessToken[]` back-relation

### New dependencies

- `bullmq` ^5.76 — background job queue
- `ioredis` ^5.10 — Redis client required by BullMQ

### New files

| File                                   | Purpose                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/server/jobs/redis.ts`             | `createRedisConnection()` factory — creates IORedis instances with BullMQ-required config           |
| `src/server/jobs/queue.ts`             | `getFreshnessQueue()` singleton + constants                                                         |
| `src/server/jobs/freshness.job.ts`     | `computeFreshnessAction()` (pure) + `runFreshnessCheck()` (queries DB, creates pings, sends emails) |
| `src/server/jobs/token.ts`             | `generateTokenString()` + `createFreshnessTokensForPing()`                                          |
| `src/server/jobs/redeem.ts`            | `redeemToken()` — validates + executes token action, used by the API route                          |
| `src/server/jobs/worker.ts`            | Standalone worker entry point (`npm run worker`) — registers BullMQ repeatable cron job             |
| `src/server/emails/index.ts`           | `sendEmail()` — console.log in dev, Resend API in prod                                              |
| `src/server/emails/freshness-ping.ts`  | HTML email builders for all 4 email types (seeker initial/warning, job initial/warning)             |
| `src/app/api/verify/[token]/route.ts`  | One-click verify endpoint — no login required, redirects based on result                            |
| `src/app/verify/confirmed/page.tsx`    | Success confirmation page                                                                           |
| `src/app/verify/expired/page.tsx`      | Expired token page (links to sign-in)                                                               |
| `src/app/verify/already-used/page.tsx` | Already-used token page                                                                             |
| `src/app/verify/invalid/page.tsx`      | Invalid token page                                                                                  |

### Tests

32 new tests (156 total, all green):

- `src/server/jobs/__tests__/freshness.test.ts` — 20 tests for `computeFreshnessAction` (happy paths, boundaries, adversarial)
- `src/server/jobs/__tests__/redeem.test.ts` — 12 tests for `redeemToken` (happy paths, expired/used/invalid, type-crossing actions)

### `package.json`

Added `"worker": "tsx src/server/jobs/worker.ts"` script.

### `CLAUDE.md`

Added "BullMQ worker process" section documenting `npm run worker`, the standalone worker pattern, and that tsx reads tsconfig paths automatically.

---

## What's in progress

Nothing. Phase 6 is code-complete. **One migration must be run** (see commands below).

---

## What's next

**Phase 7 — Notifications + Responsiveness**

Per PROJECT_SPEC.md Phase 7:

1. `NotificationPreferences` model (already in schema) — tRPC CRUD for user preferences
2. 12-minute debounced message notification job (BullMQ, delayed jobs)
3. Daily digest aggregation job
4. Responsiveness computation job (runs every 48h, updates `isResponsive` + `responseRate` + `medianResponseHours`)
5. Responsiveness badge display on seeker/employer profile pages

---

## Open questions / blockers

1. **Migration must be run before `npm run check` passes.** The typecheck fails on the new `action`/`pingId` fields until the Prisma client is regenerated.
2. **Resend domain**: `noreply@shefa.jobs` must be verified in Resend before production emails work.
3. **Worker process management in prod**: Vercel doesn't run long-lived processes. For the worker, use a Render background worker, Railway worker, or Fly.io — all support persistent Node processes cheaply. Plan this before Phase 8 ship.
4. **Profile completion gate**: Users with a role can reach `/jobs` without completing a profile. Still intentional; enforce in Phase 8.
5. **No nav link to `/seeker/applications`**: Still missing — add in Phase 8 polish.

---

## Commands to run before resuming

```bash
# 1. Run the migration (regenerates the Prisma client with new FreshnessToken fields)
npx prisma migrate dev --name add-freshness-token-action-ping

# 2. Verify everything passes
npm run check
npm test
```

After the migration, `npm run check` and `npm test` should both be fully green.
