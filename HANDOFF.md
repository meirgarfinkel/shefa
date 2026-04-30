# Handoff — Shefa Job Board

## Current phase

**Phase 7 — Notifications + Responsiveness ✅ COMPLETE**
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
| 7 | Notifications + responsiveness | ✅ Done |
| 8 | Polish + ship | ⬜ Not started |

---

## Phase 7 steps and status

| # | Step | Status |
|---|------|--------|
| 1 | `NotificationPreferences` tRPC CRUD (get/update) | ✅ Done |
| 2 | 12-minute debounced message notification job (BullMQ) | ✅ Done |
| 3 | Application notification job (same debounce pattern, employer receives on seeker apply) | ✅ Done |
| 4 | Daily digest aggregation job | ✅ Done |
| 5 | Responsiveness computation job (every 48h) | ✅ Done |
| 6 | Responsiveness badge display on profile pages | ✅ Done |

---

## What was completed this session

### Phase 7 Step 6 — Responsiveness badge display

**`employer.getPublicProfile` tRPC procedure** (public, no auth required):
- Returns: `id`, `companyName`, `city`, `state`, `industry`, `website`, `aboutCompany`, `missionText`, `isResponsive`, `isNew` (computed from `responsivenessUpdatedAt === null`), `status`, `_count.jobPostings`
- Does NOT expose: `responseRate`, `medianResponseHours`, `responsivenessScore`, `responsivenessUpdatedAt` (private per spec)
- 25 tests, all green

**`src/components/responsiveness-badge.tsx`** — reusable badge component:
- Shows green "Responsive Employer" pill when `isResponsive: true`
- Shows blue "New" pill when `isNew: true`
- Returns `null` when neither (no negative state shown)

**`src/app/employer/[id]/page.tsx`** — employer public profile view page:
- Shows company name, location, industry, website link, responsiveness badge
- About company and mission text sections
- "Browse all open jobs" link

**`src/app/jobs/[id]/page.tsx`** updated:
- Company name is now a clickable link to `/employer/[id]`
- Responsiveness badge appears next to company name (green if responsive)

**`src/server/api/routers/jobPosting.ts`** updated:
- `getById` now returns `id` and `isResponsive` on `employerProfile` (needed for the badge on job detail page)

---

## What's next

### Phase 8 — Polish + abuse + ship

Phase 7 is complete. Next up: Phase 8.
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
