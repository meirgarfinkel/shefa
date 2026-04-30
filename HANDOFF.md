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
| 7 | Notifications + responsiveness | 🔄 In progress (Steps 1–4 of 6 done) |
| 8 | Polish + ship | ⬜ Not started |

---

## Phase 7 steps and status

| # | Step | Status |
|---|------|--------|
| 1 | `NotificationPreferences` tRPC CRUD (get/update) | ✅ Done |
| 2 | 12-minute debounced message notification job (BullMQ) | ✅ Done |
| 3 | Application notification job (same debounce pattern, employer receives on seeker apply) | ✅ Done |
| 4 | Daily digest aggregation job | ✅ Done |
| 5 | Responsiveness computation job (every 48h) | ⬜ **Next** |
| 6 | Responsiveness badge display on profile pages | ⬜ Todo |

---

## What was completed this session

### Phase 7 Step 4 — Daily digest aggregation job

A nightly BullMQ job (cron at midnight UTC) that sends one combined email per user who has `messageNotifications = DAILY_DIGEST` or `applicationNotifications = DAILY_DIGEST`.

- **`src/server/emails/daily-digest.ts`** — email template with message-group and application-group sections; HTML-escapes all user content
- **`src/server/jobs/daily-digest.job.ts`** — job handler: queries unread messages (past 24h, conversations the user participates in) and new applications (past 24h, for jobs the user posted); groups by conversation / job; skips users with no activity; catches per-user errors so one failure doesn't stop the batch
- **`src/server/jobs/queue.ts`** — added `DAILY_DIGEST_QUEUE` / `DAILY_DIGEST_JOB_NAME` / `getDailyDigestQueue()`
- **`src/server/jobs/worker.ts`** — registered the daily cron (`0 0 * * *`) and worker

15 tests, all green.

---

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

### Phase 7 Step 5 — Responsiveness computation job

A BullMQ job running every 48h that computes a `responsivenessScore` for each employer and updates their profile. The score reflects how quickly and consistently they respond to applicant messages.

Design notes (to be confirmed before building):
- For each employer with an `EmployerProfile`, compute: among conversations they participate in where a seeker sent the first (or any) message, what fraction did the employer respond to within 48h?
- Store the score on `EmployerProfile` — requires a new `responsivenessScore` field (nullable Float, 0–1) and a `responsivenessUpdatedAt` timestamp. **Schema migration required.**
- A badge ("Responsive Employer") is shown on their profile page if score ≥ 0.8 and they have ≥ 3 scored conversations (avoids showing a badge based on one lucky reply)
- The job runs every 48h (not daily) because responsiveness windows are measured in hours, not minutes

Files to create/modify:
1. `prisma/schema.prisma` — add `responsivenessScore Float?` and `responsivenessUpdatedAt DateTime?` to `EmployerProfile`
2. `src/server/jobs/queue.ts` — add `RESPONSIVENESS_QUEUE`
3. `src/server/jobs/responsiveness.job.ts` — job handler
4. `src/server/jobs/worker.ts` — register 48h cron
5. Phase 7 Step 6: display the badge on profile pages (UI work)

---

## Known UI gaps (deferred to Phase 8 polish or earlier if needed)

### Backend-complete, no frontend yet

| Gap | Notes |
|-----|-------|
| `/messages` inbox page | `conversation.list` is ready |
| `/messages/[conversationId]` conversation view | `conversation.get` + `message.list` + `message.send` are ready |
| Employer "Message" button on application list / seeker profile | Needs `conversation.create` wired to UI |
| Seeker profile view page (`/seeker/[id]`) | Employers need to view seekers before cold-DMing |
| Employer profile view page (`/employer/[id]`) | Seekers see who they're messaging |
| Nav link to `/seeker/applications` | Missing from nav |

### Edit flows — backend exists, no edit UI

| Gap | Notes |
|-----|-------|
| Seeker profile edit page | Only the "new profile" signup page exists; needs an edit-in-place form at e.g. `/seeker/profile/edit` |
| Employer profile edit page | Same — only "new" page exists |
| Job edit page (`/employer/jobs/[id]/edit`) | `jobPosting.update` procedure exists; no edit UI |
| Job status controls (publish, pause, close, fill) | `jobPosting.updateStatus` exists; no UI buttons on the job detail/management page |
| Application status controls for employer | `application.updateStatus` exists; no UI buttons on the applications list |
| Notification preferences UI | `notification.getPreferences` + `notification.updatePreferences` exist; no settings page |
| Admin profile / admin tools | No admin-facing pages at all |

### Global UI work (no backend needed)

| Gap | Notes |
|-----|-------|
| Global navigation bar | No persistent nav exists — all pages are currently isolated. Needs a top or side nav showing: logo, main links (Jobs, Messages, My Profile, Applications/Postings depending on role), user menu (settings, sign out). |
| Dark / light mode toggle | No theme switcher. Tailwind's `darkMode: 'class'` strategy should be used; toggle stored in `localStorage` and applied to `<html>`. A sun/moon button in the nav is the standard location. shadcn/ui components are already theme-aware. |

### Input normalization (missing across the board)

All free-text inputs currently store exactly what the user types. Before Phase 8 ships, apply consistent normalization:

| Rule | Where |
|------|-------|
| Trim leading/trailing whitespace | Every string field before `prisma.*.create` / `prisma.*.update` |
| Collapse internal runs of whitespace to single space | Names, city, company name, job title |
| Normalize to title case | First name, last name, city, company name, job title |
| Lowercase + trim | Email (already handled by Auth.js, but verify on profile fields) |
| Strip null bytes (`\0`) | All text fields — Postgres will reject them silently or error unpredictably |

Best approach: a small `src/lib/normalize.ts` utility (`normalizeText`, `normalizeName`, `normalizeEmail`) applied in tRPC mutation handlers before DB writes. Add tests.

---

## Open questions / blockers

1. **`npm install` + `npx prisma generate` required** if the user hasn't run these since the Prisma migration. Run both before `npm run check`.
2. **Resend domain**: `noreply@shefa.jobs` must be verified before production emails work.
3. **Worker process management in prod**: Vercel doesn't support long-lived processes. Use Render / Railway / Fly.io background worker for BullMQ. Decide before Phase 8.
4. **Rate limiting not implemented**: 25 applications/day for seekers, 50 cold DMs/day for employers — deferred to Phase 8 but should be added to `conversation.create` and `application.submit`.
5. **Profile completion gate**: Users with a role can reach `/jobs` without completing a profile — enforce in Phase 8.
