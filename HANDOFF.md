# Handoff — Shefa Job Board

## Current phase

**Phase 8 (polish) — in progress**

---

## Overall build status

| Phase | What | Status |
|-------|------|--------|
| 1 | Foundation | ✅ Done |
| 2 | Auth + base User | ✅ Done |
| 3 | Profiles | ✅ Backend + signup UI + edit pages done |
| 4 | Job postings | ✅ Backend + core UI + job edit page done |
| 5 | Applications + messaging | ✅ Full backend + full messaging UI done |
| 6 | Freshness system | ✅ Done |
| 7 | Notifications + responsiveness | ✅ Done |
| 8 | Polish + ship | 🔄 In progress |

---

## What was completed this session

### Geography / location system (Phase 8 polish)

**New DB models** (`prisma/schema.prisma`):
- `State` — 50 US states with `abbr` (2-letter), `name`, `lat`, `lon` (center point)
- `City` — major cities per state with `lat`, `lon`; indexed on `stateId`

**Removed `zip` field everywhere:**
- `SeekerProfile`, `EmployerProfile`, `JobPosting` — `zip` column dropped
- Zod schemas: `CreateSeekerProfileSchema`, `UpdateSeekerProfileSchema`, `CreateEmployerProfileSchema`, `UpdateEmployerProfileSchema`, `CreateJobPostingSchema`, `UpdateJobPostingSchema`
- All 6 form pages (new + edit for seeker profile, employer profile, job posting)
- Tests updated to remove zip fixtures

**New tRPC router** (`src/server/api/routers/location.ts`):
- `location.states` — returns all 50 states ordered by name
- `location.citiesByState({ stateAbbr })` — returns cities for a state, ordered by name

**New reusable component** (`src/components/ui/location-picker.tsx`):
- Uses `useFormContext()` — works inside any react-hook-form `<Form>` wrapper
- State Select (50 states); City Select (filtered by selected state, loaded via tRPC)
- When state changes, city is cleared automatically
- City dropdown disabled until state is chosen

**Geocoding removed:**
- `src/lib/geocode.ts` deleted
- `jobPosting.create` and `jobPosting.update` now look up city lat/lon from the `City` DB table instead of calling Nominatim API
- `jobPosting.list` radius search also uses DB lookup
- `lat`/`lon` fields remain on `JobPosting` for fast PostGIS queries

**Jobs search page** (`src/app/jobs/page.tsx`):
- City/state text inputs replaced with State Select + City Select dropdowns
- Debounce for location removed (no longer needed — dropdowns are immediate)
- Auto-fill from user profile still works

**Seed data** (`prisma/seed.ts`):
- All 50 states with approximate center lat/lon
- ~10–30 major cities per state with lat/lon (~600 cities total)

---

## ⚠️ Commands to run before resuming

The Prisma schema was changed. You MUST run these commands in order:

```bash
npx prisma migrate dev --name add-state-city-tables-remove-zip
```

This drops `zip` from 3 tables and adds `State` + `City` tables. Any existing zip data will be lost (dev environment only — expected).

```bash
npx prisma db seed
```

Seeds all 50 states + ~600 cities.

After both commands complete, `npm run check` should pass with zero errors.

---

## Known UI gaps (still open)

| Gap | Notes |
|-----|-------|
| Application status controls (employer side) | Only basic buttons — no seeker profile link |
| Notification preferences UI | Procedures exist; no settings page |
| Admin profile / admin tools | No admin-facing pages at all |
| Seeker profile view link from employer applications page | Application cards don't link to seeker's public profile |
| Rate limiting | 25 applications/day / 50 cold DMs/day — deferred to Phase 8 |
| Profile completion gate | Users with a role can reach `/jobs` without completing a profile |

---

## Open questions / blockers

1. **Resend domain**: `noreply@shefa.jobs` must be verified before production emails work.
2. **Worker process management in prod**: Vercel doesn't support long-lived processes. Use Render / Railway / Fly.io background worker for BullMQ. Decide before Phase 8 ship.
3. **Rate limiting not implemented**: 25 applications/day for seekers, 50 cold DMs/day for employers — should be added in Phase 8.
4. **Profile completion gate**: Users with a role can reach `/jobs` without a complete profile — enforce in Phase 8.
