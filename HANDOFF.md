# Handoff — Shefa Job Board

## Current phase

**Phase 4 — Job Postings (Step 1 complete)**

---

## What was completed this session

### Middleware bug fix

`src/middleware.ts` — all three page-level guards (unauthenticated redirect, role-select redirect, profile page guards) now skip `/api/` paths. The bug: the middleware was intercepting `POST /api/trpc/user.setRole` and redirecting it to `/role-select` before tRPC could handle it, causing "something went wrong" on the role-select page.

### Phase 4 Step 1 — JobPosting tRPC router

- `src/lib/schemas/jobPosting.ts` — Zod schemas: `CreateJobPostingSchema`, `UpdateJobPostingSchema`, `ListJobPostingsSchema`. `status` in update is restricted to `DRAFT | ACTIVE | PAUSED | FILLED` (EXPIRED is system-only; CLOSED is via `delete` only).
- `src/server/api/routers/jobPosting.ts` — `jobPosting.create`, `jobPosting.list`, `jobPosting.getById`, `jobPosting.update`, `jobPosting.delete`
- `src/server/api/root.ts` — `jobPostingRouter` wired in
- `src/server/api/routers/__tests__/jobPosting.test.ts` — 48 tests, all green

**Key design decisions locked in:**

- `delete` sets `status: CLOSED` (never hard-deletes)
- `list`: non-owners always see only `ACTIVE`; owner (authenticated EMPLOYER whose profile matches `employerProfileId` filter) sees all statuses by default, can filter by `status[]`
- `getById`: non-ACTIVE postings return `NOT_FOUND` to non-owners

---

## What's next

**Phase 4 Steps 2–5:**

2. **Post-a-job form** — employer-only page at `/employer/jobs/new` (react-hook-form + Zod, skills/languages multi-select, work days toggle, pay rate input)
3. **Public job listings page** at `/jobs` (replace stub) — shows ACTIVE postings, basic card layout
4. **Job detail page** at `/jobs/[id]`
5. **Search/filter** — by city/state, job type, work arrangement, skills, days (extend `list` schema; add UI controls to `/jobs`)

---

## Open questions / blockers

1. **Resend domain**: `noreply@shefa.jobs` must be verified in Resend before production emails work.
2. **Profile completion gate**: Users with a role can skip the profile form and navigate directly to `/jobs`. Intentional for now; can gate in Phase 4 or 8.

---

## Commands the user should run before resuming

None needed — no schema changes, no new deps.

All deps installed. `npm run check` passes. 73 tests green (25 prior + 48 new).
