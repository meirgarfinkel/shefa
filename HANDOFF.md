# Handoff — Shefa Job Board

## Current phase

**Phase 8 (polish) — employer profile + company split complete**

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

### React render-phase bug fix + employer layout centralization

**Bug fixed:**
- `employer/jobs/page.tsx` had `router.replace()` called directly in the component body (render-phase side effect), causing `Cannot update a component while rendering a different component` errors. The destination was also wrong (`/employer/profile/new` instead of `/employer/company/new`).

**Architecture change — new route group:**
- Created `src/app/employer/(needs-company)/layout.tsx` — a server component that checks for a completed employer profile and at least one company, and redirects to the appropriate onboarding step if either is missing.
- Moved `employer/dashboard/` and `employer/jobs/` inside the `(needs-company)` route group. URLs are unchanged (route groups don't affect URLs).
- Removed the now-redundant profile/company redirect checks from `employer/dashboard/page.tsx`.
- Removed the render-phase `router.replace()` block and unused `useRouter` import from `employer/jobs/page.tsx`.

**Pages that stay outside the route group** (no full-onboarding requirement):
- `employer/profile/new` — creating the profile
- `employer/profile/edit` — editing personal info (handles missing profile gracefully)
- `employer/company/new` — creating a company (accessible without any company existing)
- `employer/company/[id]/edit` — editing a company
- `employer/[profileId]` — public company page

**Result:** Zero render-phase state/navigation mutations remain. All employer onboarding guards are server-side, single-sourced in the layout.

---

### EmployerProfile model + Company split

**Schema changes:**
- Added `EmployerProfile` model (1:1 with User): `firstName`, `lastName`, `roleAtCompany?`, `isResponsive`, `responsivenessUpdatedAt`, timestamps
- Removed `isResponsive` and `responsivenessUpdatedAt` from `User` — moved to `EmployerProfile`
- Added `User.employerProfile` relation

**New tRPC router — `company` (src/server/api/routers/company.ts):**
- `company.getPublic` — public company page (was `employer.getPublicCompany`)
- `company.listMine` — list caller's companies (was `employer.getMyCompanies`)
- `company.getById` — fetch by id with ownership check (was `employer.getCompany`)
- `company.create` — create company, no longer handles isAdult
- `company.update` — update with ownership check (was `employer.updateCompany`)
- `company.delete` — delete with ownership check (was `employer.deleteCompany`)

**Updated tRPC router — `employer` (src/server/api/routers/employer.ts):**
- `employer.getProfile` — returns caller's EmployerProfile (null if not created yet)
- `employer.createProfile` — creates EmployerProfile + handles isAdult confirmation
- `employer.updateProfile` — updates personal info
- `employer.getRecentApplications` — unchanged
- All company-related procedures removed (moved to `company` router)

**New routes:**
- `/employer/company/new` — create a company
- `/employer/company/[id]/edit` — edit a specific company (with delete)

**Updated routes:**
- `/employer/profile/new` — now creates `EmployerProfile` (firstName, lastName, roleAtCompany, isAdult)
- `/employer/profile/edit` — now edits `EmployerProfile` + email change + delete account (company management moved out)
- `/employer/dashboard` — updated signup redirect flow, "Your Companies" section with per-company edit links, shows `Hi, {firstName}`

**Signup flow (enforced by dashboard redirect logic):**
```
Sign in → role select → EMPLOYER
  → /employer/profile/new    (firstName, lastName, roleAtCompany, isAdult)
  → /employer/company/new    (company name, location, size, industry, about, mission)
  → /employer/dashboard
```

**Middleware:** Added `/employer/company` to `EMPLOYER_ONLY_PREFIXES`.

**Responsiveness job:** Now writes to `employerProfile.update({ where: { userId } })` instead of `user.update`. Skips employers with no `EmployerProfile`.

**Pages updated for new tRPC calls:**
- `employer/jobs/new` — uses `trpc.company.listMine`, removed `CreateCompanyDialog`, "+ New" links to `/employer/company/new`
- `employer/jobs/page.tsx` — uses `trpc.company.listMine`
- `employer/[profileId]/page.tsx` — uses `trpc.company.getPublic`
- `jobs/page.tsx` — uses `trpc.company.listMine`
- `jobs/[id]/page.tsx` — reads `isResponsive` from `owner.employerProfile`

**Test results:** 373 tests across 18 files, all passing.

---

## Commands the user MUST run before testing

The database schema has changed. Run these to apply the migration:

```bash
npx prisma migrate dev --name add_employer_profile
```

This will:
1. Create a new migration that adds `EmployerProfile` and removes `isResponsive`/`responsivenessUpdatedAt` from `User`
2. Apply it to your local database

> **Note for existing test data:** Any existing employer users will have no `EmployerProfile`. On next login they will be redirected to `/employer/profile/new` to complete onboarding. This is the correct behavior.

---

## Open questions / blockers

None.

---

## What's next

1. **Production deploy checklist** — verify all env vars on Vercel + Neon + Upstash + Railway
2. **Email templates** — verify magic link and notification emails render correctly in prod
3. **BullMQ worker** — ensure Railway worker process is running `npm run worker`
4. **Final QA pass** — test full employer + seeker flows end-to-end in production

---

## Uncommitted changes

All files modified since last commit. Suggested commit message:

```
Add EmployerProfile model; split company routes from profile routes

- Add EmployerProfile (firstName, lastName, roleAtCompany, isResponsive, responsivenessUpdatedAt)
- Move isResponsive/responsivenessUpdatedAt from User to EmployerProfile
- New companyRouter: getPublic, listMine, getById, create, update, delete
- New employer procedures: getProfile, createProfile, updateProfile
- New pages: /employer/company/new, /employer/company/[id]/edit
- Rewrite /employer/profile/new (personal info) and /employer/profile/edit
- Update dashboard: signup redirect flow, Hi {firstName}, per-company edit links
- Update responsiveness job to write to EmployerProfile
- Update all pages to use trpc.company.* instead of trpc.employer.company*
- 373 tests passing
```
