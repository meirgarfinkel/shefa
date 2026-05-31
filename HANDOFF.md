# Handoff — Shefa Job Board

## Current phase

**Phase 8 (polish + ship) — in progress**

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

## What's built

**Pages:**
- `/sign-in`, `/role-select`
- Employer: profile create/edit, company create/edit, job create/edit/list/detail, job applications list, employer dashboard
- Seeker: profile create/edit, applications list, public profile view (`/seeker/[profileId]`)
- Jobs: public listing (`/jobs`), public detail (`/jobs/[id]`)
- Messages: inbox (`/messages`), conversation thread (`/messages/[conversationId]`)
- Freshness verification: `/verify/confirmed`, `/verify/expired`, `/verify/invalid`, `/verify/already-used`
- Public employer profile: `/employer/[profileId]`

**Infrastructure:**
- Vercel Cron routes: freshness pings (`/api/cron/freshness`), responsiveness badge (`/api/cron/responsiveness`), daily digest (`/api/cron/digest`)
- Auth.js v5 with Google OAuth + DrizzleAdapter + JWT session strategy
- Drizzle ORM with Neon HTTP driver; schema in `src/db/schema/`
- tRPC routers for all entities: user, seeker, employer, company, jobPosting, application, conversation, message, notification, report, location, taxonomy

---

## Pending / open work

- Rate limiting (25 applications/day seekers, 50 cold DMs/day employers, tighter limits for new accounts)
- Admin dashboard for flags/reports
- Seeker dashboard page (no `/seeker/dashboard` route yet — seekers land on `/jobs` after login)
- Error handling polish (edge cases, better user-facing error messages)
- Pre-ship audit: confirm all cron secrets, verify env vars in production

---

## Commands

Run before any commit:
```bash
npm run check
```

Schema changes:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## Open questions / blockers

None.
