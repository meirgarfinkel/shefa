# Handoff — Shefa Job Board

## Current phase

**Phase 8 (polish) — BullMQ/Redis removed, Vercel Cron implemented**

---

## Overall build status

| Phase | What | Status |
|-------|------|--------|
| 1 | Foundation | ✅ Done |
| 2 | Auth + base User | ✅ Done |
| 3 | Profiles | ✅ Done |
| 4 | Job postings | ✅ Done |
| 5 | Applications + messaging | ✅ Done |
| 6 | Freshness system | ✅ Done |
| 7 | Notifications + responsiveness | ✅ Done |
| 8 | Polish + ship | 🔄 In progress |

---

## What was just completed

### BullMQ/Redis → Vercel Cron migration

**Removed entirely:**
- `bullmq` and `ioredis` packages
- `src/server/jobs/redis.ts`
- `src/server/jobs/queue.ts`
- `src/server/jobs/worker.ts`
- `src/server/jobs/schedule-message-notify.ts`
- `src/server/jobs/schedule-application-notify.ts`
- Redis service from `docker-compose.yml`
- `REDIS_URL` from `.env.example`
- `npm run worker` script from `package.json`

**Created (Vercel Cron routes):**
- `src/app/api/cron/freshness/route.ts` — daily 9am UTC, wraps `runFreshnessCheck()`
- `src/app/api/cron/responsiveness/route.ts` — every 2 days 3am UTC, wraps `runResponsivenessJob()`
- `src/app/api/cron/digest/route.ts` — daily 6pm UTC, wraps `runDailyDigestJob()`
- All routes require `Authorization: Bearer <CRON_SECRET>` header (Vercel injects automatically)

**Updated:**
- `vercel.json` — added `crons` array with 3 schedules
- `src/server/api/routers/message.ts` — now calls `runMessageNotifyJob()` immediately inline instead of scheduling via BullMQ
- `src/server/api/routers/application.ts` — now calls `runApplicationNotifyJob()` immediately inline instead of scheduling via BullMQ
- `.env.example` — removed `REDIS_URL`, added `CRON_SECRET`
- `CLAUDE.md`, `PROJECT_SPEC.md` — architecture updated

**Tests:**
- Deleted: `schedule-message-notify.test.ts`, `schedule-application-notify.test.ts` (BullMQ-specific)
- Updated: `message.test.ts`, `application.test.ts` (mocks updated to `message-notify.job` / `application-notify.job`)
- Fixed pre-existing `message.test.ts` failures: added `seekerProfile` and `employerProfile` to `makeMockPrisma`
- 363/366 passing (3 pre-existing failures in `redeem.test.ts` × 2, `conversation.test.ts` × 1 — unrelated to this work)

---

## Open questions / blockers

None.

---

## What's next

1. **Run npm install** to remove `bullmq` and `ioredis` from `node_modules`:
   ```bash
   npm install
   ```
2. **Update Docker** — remove old Redis container and data volume:
   ```bash
   docker-compose down -v && docker-compose up -d
   ```
3. **Run migrations** (see above)
4. **Generate `CRON_SECRET`**:
   ```bash
   openssl rand -hex 32
   ```
   Add to Vercel env vars as `CRON_SECRET`. Vercel automatically sends it as `Authorization: Bearer <secret>` to cron routes.
5. **Production deploy checklist** — verify env vars on Vercel + Neon + Resend (no more Upstash/Railway needed)
6. **Email templates** — verify magic link and notification emails render correctly in prod
7. **Final QA pass** — test full employer + seeker flows end-to-end in production

---

## Uncommitted changes

All files modified since last commit. Suggested commit message:

```
Replace BullMQ/Redis with Vercel Cron and immediate notifications

- Remove bullmq, ioredis packages and all queue/worker files
- Add Vercel Cron routes: /api/cron/freshness, /api/cron/responsiveness, /api/cron/digest
- Message and application notifications now fire immediately inline (no debounce queue)
- All cron routes protected by CRON_SECRET bearer token
- Remove Redis from docker-compose.yml; remove REDIS_URL from .env.example; add CRON_SECRET
- Update PROJECT_SPEC.md and CLAUDE.md to reflect Vercel + Neon + Resend stack
- Fix pre-existing message.test.ts failures (missing seekerProfile/employerProfile mocks)
```
