# Handoff — Shefa Job Board

## Current phase

**Phase 4 — Job Postings (complete)**

---

## What was completed this session

### Phase 4 Steps 2–5

**Step 2 — Post-a-job form** (`src/app/employer/jobs/new/page.tsx`)

- Employer-only client page; redirects non-employers immediately
- react-hook-form + zodResolver using `z.input<>` for form type (required because `workDays` has `.default([]).transform()`)
- Sections: job details, location, pay, schedule, work days toggles, requirements (work auth + required languages checkboxes), preferred skills (grouped checkboxes), opportunity text
- On success: redirects to `/jobs`

**Step 3 — Public job listings** (`src/app/jobs/page.tsx`)

- Replaced stub; shows ACTIVE postings in a 2-column card grid
- Each card: company name, job title, location/type/arrangement chips, min pay, description snippet, "We'll teach you" callout
- "Post a job" button shown only to authenticated EMPLOYERs

**Step 4 — Job detail page** (`src/app/jobs/[id]/page.tsx`)

- Public page using `trpc.jobPosting.getById`
- Shows: header with chips, quick facts grid (pay, work days, languages), opportunity callout boxes, full description, preferred skills, disabled "Apply" CTA
- 404-style handling for NOT_FOUND (non-ACTIVE postings return NOT_FOUND to non-owners, matching router behavior)

**Step 5 — Search/filter** (`src/app/jobs/page.tsx` + schema + router)

- Extended `ListJobPostingsSchema` with: `city`, `state`, `jobType[]`, `workArrangement[]`, `workDays[]`, `skillIds[]`
- Router `list` applies all filters in the Prisma `where` clause:
  - city/state: `{ contains, mode: "insensitive" }`
  - jobType/workArrangement: `{ in: [...] }` (only when non-empty)
  - workDays: `{ hasSome: [...] }` (PostgreSQL array field)
  - skillIds: `{ preferredSkills: { some: { skillId: { in: [...] } } } }`
- Filter UI: city/state text inputs (300ms debounce), job type checkboxes, arrangement checkboxes, work-day toggle pills, collapsible skills section with category grouping and count badge
- 11 new router tests; 59 total, all green

---

## What's next

**Phase 4 cleanup — Employer job dashboard** (build before Phase 5)

`/employer/jobs` page: list the authenticated employer's own postings (all statuses). Use `jobPosting.list` with `employerProfileId` set to the caller's profile. Each row shows title, status badge, created date, and links to edit/view. "Post a job" button at the top. After posting a new job, redirect here instead of `/jobs`.

**Phase 5 — Seeker Applications**

Per PROJECT_SPEC.md Phase 5:

1. `Application` tRPC router — `apply`, `listForSeeker`, `listForJob` (employer-only), `withdraw`, `updateStatus` (employer-only)
2. Apply button on job detail page (replace the disabled CTA)
3. Seeker "My applications" page
4. Employer "Applications for this job" view

---

## Open questions / blockers

1. **Resend domain**: `noreply@shefa.jobs` must be verified in Resend before production emails work.
2. **Profile completion gate**: Users with a role can reach `/jobs` without completing a profile. Intentional for now; enforce in Phase 8.
3. **Employer job dashboard**: Currently no `/employer/jobs` listing page. After posting, employers are sent to `/jobs`. A dashboard showing own postings (all statuses) should be added — either in Phase 5 or as a Phase 4 cleanup item before Phase 5.

---

## Commands the user should run before resuming

None needed — no schema changes, no new deps.

All deps installed. `npm run check` passes. 59 tests green.
