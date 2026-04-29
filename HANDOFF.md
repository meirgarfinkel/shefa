# Handoff — Shefa Job Board

## Current phase

**Phase 5 — Seeker Applications (complete)**

---

## What was completed this session

### Application tRPC router (`src/server/api/routers/application.ts`)

Five procedures + one auxiliary query, all covered by 38 new tests (124 total, all green):

| Procedure       | Who           | What                                                                                                                                                                                       |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `submit`        | SEEKER only   | Applies to an ACTIVE job; optional message ≤500 chars. Throws FORBIDDEN for non-ACTIVE jobs, CONFLICT on duplicate. Note: named `submit` not `apply` — `apply` is a reserved word in tRPC. |
| `listForSeeker` | SEEKER only   | Returns own applications with job + company info, sorted desc.                                                                                                                             |
| `listForJob`    | EMPLOYER only | Returns applications for a job the caller posted, with seeker name/location/availability.                                                                                                  |
| `withdraw`      | SEEKER only   | Sets own application to CLOSED. NOT_FOUND (not FORBIDDEN) if app not owned — avoids info disclosure.                                                                                       |
| `updateStatus`  | EMPLOYER only | Sets status to VIEWED/RESPONDED/CLOSED. SUBMITTED blocked at Zod layer.                                                                                                                    |
| `myStatus`      | SEEKER only   | Returns `{ id, status }` or null for caller's application to a given job. Used by the job detail page.                                                                                     |

Zod schemas in `src/lib/schemas/application.ts`.

### UI

**Job detail page** (`src/app/jobs/[id]/page.tsx`)

- Disabled CTA replaced with role-aware apply flow
- Non-seekers: "Sign in as a job seeker to apply"
- SEEKERs (not applied): "Apply for this job" button → Dialog
- Apply dialog: optional message textarea with 500-char counter, submit/cancel
- SEEKERs (applied): status badge + Withdraw button (SUBMITTED only) + "View my applications" link
- SEEKERs (withdrawn): re-apply option

**Seeker applications page** (`src/app/seeker/applications/page.tsx`)

- Route: `/seeker/applications`
- Protected: SEEKER only (redirects otherwise)
- Lists all applications: job title (linked), company, location, status badge, date, withdraw button
- Empty state with "Browse listings" CTA

**Employer applications view** (`src/app/employer/jobs/[id]/applications/page.tsx`)

- Route: `/employer/jobs/[id]/applications`
- Protected: EMPLOYER only
- Lists applicants: name, city/state, available days, work auth, message, status badge
- Action buttons: "Mark viewed" / "Mark responded" / "Close" based on current status
- Empty state

**Employer jobs dashboard** (`src/app/employer/jobs/page.tsx`)

- Added "Applications" link per job row → `/employer/jobs/[id]/applications`

### shadcn Dialog component added

`src/components/ui/dialog.tsx` installed via `npx shadcn@latest add dialog`.

---

## What's next

**Phase 6 — Freshness System**

Per PROJECT_SPEC.md Phase 6:

1. BullMQ + Redis worker setup (`src/server/jobs/`)
2. Daily ping scheduler — queries listings/profiles due for verification (Day 14, 20, 28 logic)
3. Email templates for verification pings (Resend)
4. Signed verification tokens (`FreshnessToken` model already in schema)
5. One-click response endpoints (no login required)
6. Auto-pause logic on Day 28 non-response

---

## Open questions / blockers

1. **Resend domain**: `noreply@shefa.jobs` must be verified in Resend before production emails work.
2. **Profile completion gate**: Users with a role can reach `/jobs` without completing a profile. Intentional for now; enforce in Phase 8.
3. **No seeker profile nav link**: There's no nav link to `/seeker/applications` yet. Should be added to the main nav in Phase 8 polish, or earlier if desired.

---

## Commands the user should run before resuming

None needed — no schema changes, no new deps beyond the Dialog component (already installed).

All deps installed. `npm run check` passes. 124 tests green.
