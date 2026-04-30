# Handoff — Shefa Job Board

## Current phase

**Phase 5 (messaging UI) + Phase 8 (polish) — in progress**

---

## Overall build status

| Phase | What | Status |
|-------|------|--------|
| 1 | Foundation | ✅ Done |
| 2 | Auth + base User | ✅ Done |
| 3 | Profiles | ✅ Backend + signup UI — ⚠️ no profile edit pages |
| 4 | Job postings | ✅ Backend + core UI — ⚠️ no job edit page, no status controls |
| 5 | Applications + messaging | ✅ **Full backend + full messaging UI done** |
| 6 | Freshness system | ✅ Done |
| 7 | Notifications + responsiveness | ✅ Done |
| 8 | Polish + ship | 🔄 In progress |

---

## What was completed this session

### Messaging UI (Phase 5 completion)

All messaging UI is now built and wired up. Backend was already complete; this session added frontend.

#### Backend changes

**`seeker.getPublicProfile`** (new public tRPC procedure, `src/server/api/routers/seeker.ts`):
- Returns: id, firstName, lastName, city, state, zip, workAuthorization, availableDays, jobSeekText, educationLevel, otherSkills, otherLanguages, about, isResponsive, isNew, status, skills (name array), languages (name array)
- Does NOT expose: responseRate, medianResponseHours, userId
- isNew computed from `responseRate === null`
- 13 tests, all green

**`conversation.list` enhanced** (`src/server/api/routers/conversation.ts`):
- Now includes: participantA/B with seeker+employer profiles (for display names), job (id + title), `_count.messages` filtered to unread from other party

**`conversation.get` enhanced**:
- Now includes: messages, participantA/B profiles, job info (same shape as list)

**`application.listForJob` updated** (`src/server/api/routers/application.ts`):
- Added `seekerProfile.id` to the select (needed for employer → seeker Message button)

**`application.listForSeeker` updated**:
- Added `employerProfile.id` to the select (needed for seeker → employer Message button)

#### New pages

| Route | File | Notes |
|-------|------|-------|
| `/seeker/[profileId]` | `src/app/seeker/[profileId]/page.tsx` | Public seeker profile. Shows name, location, skills, languages, responsiveness badge, available days, work auth, education, about. Employer sees "Message" button (cold DM). |
| `/messages` | `src/app/messages/page.tsx` | Inbox. Sorted by lastMessageAt desc. Unread dot + count. Displays other party's display name (company name for employers, first+last for seekers). Job context if linked. |
| `/messages/[conversationId]` | `src/app/messages/[conversationId]/page.tsx` | Conversation thread. Bubble UI. Marks read on open. ⌘↵ to send. Block/unblock + Report user in dropdown. Blocked state shown when applicable. |

#### Entry points wired

- **Employer applications page** (`/employer/jobs/[id]/applications`): "Message" button per applicant → `conversation.create({ targetProfileId: seekerProfile.id, jobId })` → navigate to conversation
- **Seeker applications page** (`/seeker/applications`): "Message" button (visible on ACTIVE jobs) → `conversation.create({ targetProfileId: employerProfile.id, jobId })` → navigate to conversation
- **Seeker public profile page** (`/seeker/[profileId]`): "Message" button visible to authenticated employers with ACTIVE seeker profiles

#### Nav updated

`src/components/nav.tsx`: "Messages" link added for both SEEKER and EMPLOYER roles.

#### Middleware fix

`src/middleware.ts`: Public routes now correctly allow unauthenticated access to `/jobs/*`, `/employer/[profileId]`, and `/seeker/[profileId]`. The `isPublicProfilePage` helper distinguishes public one-segment profile URLs from private sub-paths (dashboard, profile edit, applications, etc.).

---

## Known UI gaps (still open)

### Edit flows — backend exists, no edit UI

| Gap | Notes |
|-----|-------|
| Seeker profile edit page | Only the "new profile" signup page exists |
| Employer profile edit page | Same — only "new" page exists |
| Job edit page (`/employer/jobs/[id]/edit`) | `jobPosting.update` procedure exists |
| Job status controls (publish, pause, close, fill) | `jobPosting.updateStatus` exists |
| Application status controls (employer side) | `application.updateStatus` now has UI but only basic buttons — no seeker profile link |
| Notification preferences UI | Procedures exist; no settings page |
| Admin profile / admin tools | No admin-facing pages at all |

### Other gaps

| Gap | Notes |
|-----|-------|
| Seeker profile view link from employer applications page | Application cards don't link to the seeker's public profile yet |
| Input normalization | Free-text fields store raw input — needs `normalizeText`, `normalizeName` utilities |
| Rate limiting | 25 applications/day / 50 cold DMs/day — deferred to Phase 8 |
| Profile completion gate | Users with a role can reach `/jobs` without completing a profile |

---

## Open questions / blockers

1. **`npm install` + `npx prisma generate` required** if not run since last migration. Run both before `npm run check`.
2. **Resend domain**: `noreply@shefa.jobs` must be verified before production emails work.
3. **Worker process management in prod**: Vercel doesn't support long-lived processes. Use Render / Railway / Fly.io background worker for BullMQ. Decide before Phase 8 ship.
4. **Rate limiting not implemented**: 25 applications/day for seekers, 50 cold DMs/day for employers — should be added to `conversation.create` and `application.submit` in Phase 8.
5. **Profile completion gate**: Users with a role can reach `/jobs` without a complete profile — enforce in Phase 8.
