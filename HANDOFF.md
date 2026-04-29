# Handoff — Shefa Job Board

## Current phase

**Phase 7 — Notifications + Responsiveness (in progress)**
Phase 5 backend was completed as a prerequisite this session.

---

## Overall build status

| Phase | What | Status |
|-------|------|--------|
| 1 | Foundation | ✅ Done |
| 2 | Auth + base User | ✅ Done |
| 3 | Profiles | ✅ Backend + signup UI — ⚠️ no profile view/edit pages |
| 4 | Job postings | ✅ Backend + core UI — ⚠️ no job edit page, no status controls |
| 5 | Applications + messaging | ✅ **Full backend done this session** — ⚠️ no inbox/conversation UI |
| 6 | Freshness system | ✅ Done |
| 7 | Notifications + responsiveness | 🔄 In progress (Step 1 of 5 done) |
| 8 | Polish + ship | ⬜ Not started |

---

## Phase 7 steps and status

| # | Step | Status |
|---|------|--------|
| 1 | `NotificationPreferences` tRPC CRUD (get/update) | ✅ Done |
| 2 | 12-minute debounced message notification job (BullMQ) | ✅ Done |
| 3 | Application notification job (same debounce pattern, employer receives on seeker apply) | ✅ Done |
| 4 | Daily digest aggregation job | ⬜ **Next** |
| 5 | Responsiveness computation job (every 48h) | ⬜ Todo |
| 6 | Responsiveness badge display on profile pages | ⬜ Todo |

---

## What was completed this session

### Prisma migration: Prisma 7 → Prisma 6

Switched from `prisma-client` (Prisma 7, custom output) to `prisma-client-js` (Prisma 6, standard output). Removed `@prisma/adapter-pg`. Enforced the split config pattern: `auth.config.ts` now imports `Role` from `src/types/role.ts` (a plain string union), not from any Prisma package. The `src/generated/prisma/` directory was deleted. `prisma.config.ts` (a Prisma 7-only file) was also deleted; seed config moved to `package.json`.

**Key files changed:** `package.json`, `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/prisma.ts`, `src/auth.config.ts`, `src/types/next-auth.d.ts`, `src/types/role.ts` (new), `src/middleware.ts`, `src/server/jobs/*.ts`.

### Phase 5 backend: conversations, messages, reports

Three new tRPC routers, 69 new tests, all green.

| Router | Procedures |
|--------|-----------|
| `conversation` | `create`, `list`, `get`, `markRead`, `block`, `unblock` |
| `message` | `send`, `list` |
| `report` | `submit` |

**Key design decisions:**
- Seekers must supply a `jobId` (must have applied) to start a conversation; employers can cold-DM freely.
- `conversation.create` is idempotent — same pair + jobId returns the existing thread.
- Either block flag (`aBlockedB` or `bBlockedA`) prevents messaging in both directions.
- `message.send` denormalizes `lastMessageAt` and `lastMessagePreview` (truncated to 100 chars) onto the conversation.
- `conversation.get` scopes its Prisma query to the caller's participation, so non-participants get `NOT_FOUND`, not `FORBIDDEN` — no existence leakage.
- `report.submit` guards against self-reporting (`BAD_REQUEST`).

---

## What's next

### Phase 7 Step 4 — Daily digest aggregation job

A nightly BullMQ job (cron at midnight UTC) that sends a single "digest" email to users who have `messageNotifications = DAILY_DIGEST` or `applicationNotifications = DAILY_DIGEST`.

Design notes:
- The job should query for all users with either digest preference
- For `messageNotifications = DAILY_DIGEST`: find unread messages sent in the past 24h, grouped by conversation
- For `applicationNotifications = DAILY_DIGEST`: find applications submitted in the past 24h, for jobs owned by the employer
- If a user qualifies for both (message digest + application digest), send one combined email
- Skip users with no relevant activity in the past 24h

Files to create/modify:
1. **`src/server/jobs/queue.ts`** — add `DAILY_DIGEST_QUEUE` and `getDailyDigestQueue()`
2. **`src/server/jobs/daily-digest.job.ts`** — job handler
3. **`src/server/emails/daily-digest.ts`** — email template (sections for new messages and new applications)
4. **`src/server/jobs/worker.ts`** — register daily cron + worker

Open question: should the digest cover messages that were already notified via PER_MESSAGE (if user changed preference mid-day)? Simplest answer: digest covers all unread messages in past 24h regardless of prior notification state.

---

## Known UI gaps (deferred to Phase 8 polish or earlier if needed)

These are backend-complete but have no frontend yet:

| Gap | Notes |
|-----|-------|
| `/messages` inbox page | `conversation.list` is ready |
| `/messages/[conversationId]` conversation view | `conversation.get` + `message.list` + `message.send` are ready |
| Employer "Message" button on application list / seeker profile | Needs `conversation.create` wired to UI |
| Seeker profile view page (`/seeker/[id]`) | Employers need to view seekers before cold-DMing |
| Employer profile view page (`/employer/[id]`) | Seekers see who they're messaging |
| Profile edit pages (both seeker and employer) | Only "new" pages exist |
| Job edit page (`/employer/jobs/[id]/edit`) | No edit flow |
| Job status controls (publish, pause, close, fill) | Backend `updateStatus` exists, no UI buttons |
| Nav link to `/seeker/applications` | Missing from nav |

---

## Open questions / blockers

1. **`npm install` + `npx prisma generate` required** if the user hasn't run these since the Prisma migration. Run both before `npm run check`.
2. **Resend domain**: `noreply@shefa.jobs` must be verified before production emails work.
3. **Worker process management in prod**: Vercel doesn't support long-lived processes. Use Render / Railway / Fly.io background worker for BullMQ. Decide before Phase 8.
4. **Rate limiting not implemented**: 25 applications/day for seekers, 50 cold DMs/day for employers — deferred to Phase 8 but should be added to `conversation.create` and `application.submit`.
5. **Profile completion gate**: Users with a role can reach `/jobs` without completing a profile — enforce in Phase 8.
