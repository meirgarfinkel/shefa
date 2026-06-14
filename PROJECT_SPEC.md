# Shefa — Project Spec

> Canonical source of truth for scope, domain rules, data model, and architecture.
> If implementation diverges from this document, update the document in the same change.

---

## 1. Project Overview

**Shefa** is a nonprofit, charity-based job board. Its mission is to give unqualified
candidates a chance to learn on the job — connecting them with employers willing to
hire on potential rather than credentials.

**Core promises:**

- **Free for everyone.** No payments anywhere in the system, ever. Not a deferred
  monetization play — payments are out of scope permanently.
- **Fresh listings.** No ghost jobs, no ghost candidates. Listings and profiles are
  periodically re-verified and auto-paused (never deleted) when they go stale.
- **No gatekeeping on protected or educational attributes.** Employers cannot filter
  candidates by education or any protected class. Education is collected on seeker
  profiles for context only and is never a filter input.

**Audience / roles:**

- **Seekers** — job seekers building a profile and applying to jobs.
- **Employers** — a contact human who owns one or more businesses and posts jobs under them.
- **Admins** — moderation and platform operations (minimal tooling for v1).

---

## 2. Core Domain Concepts

### User

The base account, created via Google OAuth. Holds identity (`name`, `email`,
`emailVerified`, `image`), an unverified `phone`, a nullable `role`
(`SEEKER` / `EMPLOYER` / `ADMIN`), and `isAdult` (set true when a profile is created
after age confirmation). A user has at most one role and one role-specific profile.

### SeekerProfile (1:1 with User)

The seeker's public-facing identity. Required: name, city/state, work authorization,
available days, and a free-text "what job you seek / want to learn" (`jobSeekText`).
Optional: education level, about text, résumé URL, and curated languages (via the
`SeekerLanguage` join). Has a `status` (`ACTIVE` / `PAUSED` / `SUSPENDED`) and a
`lastVerifiedAt` that drives freshness. **Seekers have no responsiveness metric** —
that lives only on employers.

### EmployerProfile (1:1 with User)

The **contact human**, not the business. Holds `firstName`, `lastName`,
`roleAtBusiness`, a `status`, and the responsiveness fields (`isResponsive`,
`responsivenessUpdatedAt`). Business details live on a separate entity.

### Business (many-to-one with User via `ownerId`)

The business itself. One employer (user) can own **multiple** businesses, unique per
`(ownerId, name)`. Holds `name`, `city`/`state`, `website`, `industry`,
`businessSize`, `aboutBusiness`, and `missionText` ("why we want to give people a chance").

### JobPosting (belongs to a User via `employerId` and a Business via `businessId`)

A job listing. Carries title, description, `jobType`, `workArrangement`,
location (`city`/`state` plus geocoded `lat`/`lon`), `minHourlyRate`, optional pay and
schedule notes, `workDays`, `workAuthRequired`, a free-text "what we're looking for",
and required languages (via the `JobLanguage` join). Status is
`ACTIVE` / `PAUSED` / `CLOSED` with an optional `closureReason` and `closedAt`. A nullable
`hiredApplicationId` records which applicant got the role when closed as `FILLED_ON_SHEFA`
(cleared on reopen). **No skills field, no required skills, no education field** — by design.

### Application (seeker → job)

A seeker's application to a job. Unique per `(seekerId, jobId)`. Optional message
(≤500 chars). Status `SUBMITTED` → `VIEWED` / `REJECTED` / `CLOSED`. Application status
is **independent** of job status.

### Conversation + Message

A long-lived thread between a `seekerId` and an `employerId`, optionally linked to a
`jobId`. Unique per `(seekerId, employerId, jobId)`. Carries denormalized
`lastMessageAt` / `lastMessagePreview` (≤80 chars) for the inbox, and per-side block
flags (`seekerBlocked` / `employerBlocked`). Messages are plain text (≤5000 chars) with
a `readAt` receipt.

### VerificationPing + FreshnessToken

The freshness engine. A `VerificationPing` records a "still looking?" / "still open?"
prompt and its response. A `FreshnessToken` is a single-use, expiring,
login-free token embedding the target and the action to apply when clicked.

### Report

Abuse evidence — `reporterId`, `targetType` (`USER` / `JOB` / `MESSAGE`), `targetId`,
`reason`, `status`. **Reports are input, not enforcement** (see Business Rules).

### Feedback

A user-submitted message to admins — `userId`, `category`
(`BUG` / `IMPROVEMENT` / `THANKS` / `OTHER`), free-text `message`, and a `status`
(`OPEN` / `REVIEWED` / `RESOLVED`). Unlike a `Report`, feedback has **no target** — it is
general platform feedback, not evidence about another entity. Surfaced in `/admin`.

### NotificationPreferences (1:1 with User)

Per-user delivery frequency for `messageNotifications` and `applicationNotifications`
(`PER_MESSAGE` / `DAILY_DIGEST` / `OFF`).

### Taxonomy & Geography

- **Language** — curated, admin-managed list (the only taxonomy; skills were removed).
- **State / City** — seeded geography tables with `lat`/`lon`. No ZIP codes. All
  locations are dropdown-selected from these tables.

---

## 3. Business Rules

### Roles & profiles

- A user picks a role once (`/role-select`); the role is stored on the JWT and the User row.
- Creating a profile requires confirming age ≥ 18 (`isAdult`).
- An employer must create at least one Business before posting jobs (enforced by the
  `(needs-business)` route group).

### Job lifecycle

- **ACTIVE** — visible, searchable, accepts applications, messaging enabled.
- **PAUSED** — blocks new applications; preserves existing applications and
  conversations; mutates no related entities.
- **CLOSED** — hiring done; historical data preserved; carries a `closureReason`
  (`FILLED_ON_SHEFA` / `FILLED_ELSEWHERE` / `HIRING_FROZEN` / `CANCELLED` / `OTHER`).
- **Pausing** a job mutates no related entities. **Closing** a job cascades to its
  open applications: every `SUBMITTED`/`VIEWED` application becomes `CLOSED`
  (a `REJECTED` application is left untouched — rejection is the employer's explicit
  verdict, not a side effect of filling the role). Neither pausing nor closing ever
  closes a conversation.
- **Reopening** a closed job (`reopen`) returns it to `PAUSED`, clears
  `closureReason`/`closedAt`/`hiredApplicationId`, and reverses the close cascade:
  applications that were `CLOSED` return to `SUBMITTED`; `REJECTED` applications stay `REJECTED`.
- When closed as `FILLED_ON_SHEFA`, the employer may optionally name the hired applicant.
  `jobPosting.close` validates that the named application belongs to the job and is **not**
  `REJECTED`, then stores it in `hiredApplicationId`. The hire is still `CLOSED` by the
  cascade like every other open application — this only records who was hired. The field is
  ignored for any other closure reason.

### Applications

- One application per seeker per job (DB-unique).
- Status transitions are explicit and employer-driven. `REJECTED` and `CLOSED` are
  **reversible** by the employer: a rejection can be undone (`REJECTED` → `VIEWED`),
  and a closed application can be undone (`CLOSED` → `SUBMITTED`). `CLOSED` is never
  set directly per-application — it is reached only via the job-close cascade above.
- Application status is decoupled from job status — a job-status change only touches
  applications through the close/reopen cascade described above.

### Messaging initiation (hybrid)

- **Employers** may start a conversation with any `ACTIVE` seeker, with or without a `jobId`.
- **Seekers** may only start a conversation tied to a `jobId` they have applied to.
- `conversation.create` is idempotent per `(seeker, employer, job)` — same triple
  returns the existing thread; a different `jobId` creates a separate thread.
- Either side's block flag halts messaging in **both** directions for that thread.
- Application status (`REJECTED`/`CLOSED`) does **not** gate messaging — the thread
  stays open so the employer can follow up or reconsider. Messaging is gated only by
  block flags, profile suspension, and job status (sending requires an `ACTIVE` job).
- Conversations persist after job closure.

### Reports & moderation

- Reports are evidence only; they do **not** auto-suspend users or block messaging.
- Moderation (`SUSPENDED` status, etc.) is a separate, explicit enforcement decision.
- Self-reporting is rejected at the API layer.

### Feedback

- Any authenticated, non-suspended user may submit feedback (`feedback.submit`),
  throttled to a rolling 24h cap (abuse control, same pattern as apply/cold-DM limits).
- Submitting fires a fire-and-forget admin email (no-op if `ADMIN_EMAIL` is unset; the
  row is still stored). Admins triage status in `/admin`.

### Freshness / verification

- Listings and profiles carry `lastVerifiedAt`. A cron sends "still looking / still
  open?" pings as they age, escalates with a warning, and finally sets status to
  `PAUSED`. **Nothing is ever auto-deleted.**
- Verification links use signed, expiring, single-use `FreshnessToken`s and require no login.
- Paused entities can be reactivated by the owner at any time, indefinitely.

### Responsiveness (employers only)

- `isResponsive` is a boolean recomputed periodically by a cron from conversation
  reply behavior. New/low-volume employers surface a neutral "New" state, never a
  negative one. Underlying rates are computed but not shown publicly.

### Notifications

- Message and application notifications fire **immediately, inline, fire-and-forget**
  when the triggering event occurs (no debounce queue).
- `DAILY_DIGEST` users instead receive one summary email per day via cron.
- `OFF` disables that category. Verification emails are always sent regardless.

### Constraints that are inviolable (mission)

- No payments. No protected-class filtering. No education-based filtering.
- No automatic deletion of user data.

---

## 4. Current Features

All eight build phases are complete except final polish (Phase 8 in progress).

**Auth & onboarding:** Google OAuth sign-in, role selection, age-gated profile creation.

**Seeker:** create/edit profile, browse jobs, apply, view own applications with live
status, public profile page (`/seeker/[profileId]`).

**Employer:** create/edit the contact profile; create/edit/list businesses; create,
edit, duplicate, pause, and close jobs; view applications per job and update their
status; dashboard with recent applications; public business page (`/business/[id]`) and
public employer page (`/employer/[profileId]`).

**Jobs (public):** listing with filters (status, job type, work arrangement, work days),
geo radius search (haversine on `lat`/`lon`), sort by newest / closest / pay; public
job detail.

**Messaging:** inbox, conversation thread, send messages, read receipts, block/unblock,
report; hybrid initiation (employer cold-DM, seeker job-scoped).

**Freshness:** cron-driven pings, escalation, auto-pause, and login-free reactivation
pages (`/verify/*`, `/api/verify/[token]`).

**Notifications & responsiveness:** per-message / digest / off preferences, immediate
emails, daily digest cron, responsiveness badge computation cron and display.

**Pending (Phase 8):** rate limiting, admin moderation dashboard, a dedicated seeker
dashboard, broader error-handling polish, and a pre-ship env/secret audit.

---

## 5. Technical Architecture

**Stack:** Next.js (App Router) + TypeScript (strict) · tRPC v11 · Drizzle ORM with the
`@neondatabase/serverless` HTTP driver · PostgreSQL · Auth.js v5 (`next-auth@beta`) ·
Resend · Zod v4 · Tailwind 4 + shadcn/ui (Radix) · React Hook Form.

**Hosting:** Vercel (web + cron) · Neon (Postgres) · Resend (email).
**Local dev:** Docker Compose runs `postgres:16-alpine` only.

**Auth (split-config pattern):**

- `auth.config.ts` — Edge-safe; no DB/Drizzle imports; defines JWT/session callbacks
  and providers placeholder.
- `auth.ts` — full Node config with the DrizzleAdapter and Google provider.
- **JWT session strategy** — middleware verifies auth from the cookie alone; it never
  queries the DB.

**Middleware (`src/middleware.ts`):** single responsibility — redirect unauthenticated
requests to `/sign-in`, and redirect authenticated users hitting `/` to their role's
dashboard. No other role/onboarding logic. Imports only `auth.config.ts` and Next built-ins.

**Authorization:** role checks and onboarding redirects live in **server component
layouts / page wrappers**, never in middleware or client components. The `employer` and
`seeker` segment layouts gate by role; the `(needs-business)` group additionally requires
an owned business.

**API layer (tRPC):** `createTRPCContext` injects `{ session, db, headers }`.
`publicProcedure` is open; `protectedProcedure` enforces a session and narrows
`ctx.user`. Procedures own all business logic; components are presentation-only.
Identity always comes from `ctx.session.user.id` — **never** from input.

**Routers** (`src/server/api/root.ts`): `user`, `seeker`, `employer`, `business`,
`taxonomy`, `jobPosting`, `application`, `conversation`, `message`, `notification`,
`report`, `feedback`, `location`, `admin`.

**Database:** `src/db/schema/` is the canonical contract; `enums.ts` is the canonical
enum source (exported as TS union types via `typeof X.enumValues[number]`). Relational
reads use `db.query.X.findFirst/findMany` with `with`; mutations use
`db.insert/update/delete`. Raw SQL is used only where justified — currently the
haversine distance query in `jobPosting` geo search.

**Background jobs (Vercel Cron, `src/app/api/cron/`):**

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/freshness` | Daily 9am UTC | Freshness pings + escalation + auto-pause |
| `/api/cron/responsiveness` | Every 2 days 3am UTC | Recompute employer responsiveness |
| `/api/cron/digest` | Daily 6pm UTC | Daily digest emails |

Each requires `Authorization: Bearer <CRON_SECRET>` (Vercel-injected). Cron routes
delegate to job modules in `src/server/jobs/`; emails are composed in `src/server/emails/`.

**Public discoverability (SEO):** only **jobs** and **businesses** are indexable; seeker
profiles are deliberately kept private (`robots.ts` disallows `/seeker` and all auth-gated
trees). The public job page (`/jobs/[id]`) is a **server component** that renders per-job
metadata + `JobPosting` JSON-LD (`src/lib/seo/job-posting.ts`) into the initial HTML, with
interactivity in a client child seeded via `initialData`; it fetches through a server-side
tRPC caller (`src/server/api/server.ts`) so SSR reuses `jobPosting.getById`'s visibility
rules. `sitemap.ts` (hourly ISR) lists visible ACTIVE jobs + their businesses. The **Google
Indexing API** (`src/server/indexing.ts`, zero-dependency JWT, fire-and-forget, no-op when
unconfigured) notifies Google on `jobPosting.create`/`update`/`close`. `validThrough` on the
JSON-LD tracks the freshness auto-pause horizon (`lastVerifiedAt` + 28 days).

---

## 6. Folder Conventions

```text
src/
  app/                      # Next.js App Router
    api/
      auth/[...nextauth]/   # Auth.js handler
      trpc/[trpc]/          # tRPC HTTP handler
      cron/{freshness,responsiveness,digest}/
      verify/[token]/       # login-free freshness redemption
      change-email/
    employer/
      profile/{new,edit}/
      business/{new,[id]/edit}/
      (needs-business)/      # route group: requires an owned business
        dashboard/  jobs/{new,[id]/{edit,applications}}/
    seeker/
      (protected)/profile/{new,edit}  (protected)/applications/
      (public)/[profileId]/           # public seeker profile
    jobs/[id]/              # public listing + detail
    business/[id]/           # public business page
    employer/[profileId]/   # public employer page
    messages/[conversationId]/
    {sign-in,role-select,verify/*,verify-request}/
  server/
    api/
      trpc.ts  root.ts
      routers/  + routers/__tests__/
    jobs/                   # cron job logic + token/redeem helpers
    emails/                 # Resend email composition
  db/
    schema/                 # canonical DB contract (one file per domain)
    scripts/                # seed.ts, seed-jobs.ts
    index.ts                # exports `db` (DbClient = typeof db)
  lib/
    schemas/                # shared Zod input schemas
    constants/              # labels.ts (enum → label maps)
    trpc/                   # client/server tRPC wiring
    utils.ts
  components/
    ui/                     # shadcn primitives
    *.tsx                   # shared app components (nav, badges, menus)
  middleware.ts  auth.ts  auth.config.ts  types/
drizzle.config.ts
```

**Placement rules:**

- Business logic → tRPC routers. Shared validation → `src/lib/schemas/`.
- Enum-label maps live once in `src/lib/constants/labels.ts` (no duplicated maps).
- Cron entrypoints are thin route handlers; logic lives in `src/server/jobs/*.job.ts`.
- Tests are co-located in `__tests__/` next to the code they cover.

---

## 7. Naming Conventions

**Database (Drizzle):** table names are PascalCase singular (`User`, `JobPosting`,
`SeekerProfile`); column names are camelCase (`firstName`, `lastVerifiedAt`); primary
keys are `text` cuid2 (`createId()`); join tables are `OwnerChild` (`SeekerLanguage`,
`JobLanguage`) with composite primary keys.

**Enums:** Postgres enum type names are PascalCase (`pgEnum("JobStatus", …)`); values are
SCREAMING_SNAKE_CASE (`FULL_TIME`, `FILLED_ON_SHEFA`); the exported TS type matches the
type name (`type JobStatus`). Zod mirrors enum values with string literals — never
`z.nativeEnum`.

**Routers / procedures:** router files are camelCase by entity (`jobPosting.ts`);
exported routers are `<entity>Router`. Procedures are verbs: `create`, `update`,
`list`, `getById`, `getPublic`, `listMine`, `updateStatus`, `markRead`, `block`.
"Mine"/"My" denotes the caller's own records derived from session.

**Routes:** kebab-case paths; bracket segments for params. Public profile routes take a
**profile id** segment (`[profileId]`, `[id]`); private routes are stable,
non-parameterized paths with ownership derived from the session. `userId` never appears
in a URL or as a query parameter.

**Shared Zod schemas:** `PascalCaseSchema` (e.g. `CreateJobPostingSchema`) with an
inferred `PascalCaseInput` type alongside.

**React components:** PascalCase files for shared components; shadcn primitives stay in
`components/ui/`.

---

## 8. Important Decisions

- **Business is separate from EmployerProfile.** The employer profile is the contact
  human; businesses are owned entities (one user → many businesses). This replaced the
  earlier model where business fields lived on the employer profile.
- **Skills were removed entirely.** There is no skills taxonomy and no required/preferred
  skills on jobs or profiles. Languages are the only curated taxonomy. This reinforces
  the "hire on potential" mission and avoids credential-style gatekeeping.
- **Geo search via haversine on `lat`/`lon`.** Jobs and geography tables are geocoded;
  radius filtering and "closest" sort use a justified raw-SQL distance query. No ZIPs.
- **Job status simplified to ACTIVE / PAUSED / CLOSED** with a structured
  `closureReason`, replacing the earlier EXPIRED/FILLED states.
- **Responsiveness is employer-only.** Seekers carry no responsiveness metric.
- **JWT sessions over DB sessions** so Edge middleware can gate auth without a DB call.
- **Auth gating in middleware, role/onboarding gating in server layouts.** No
  client-side auth redirects anywhere.
- **Notifications are immediate and inline (fire-and-forget)**, with an optional daily
  digest — no separate queue/worker infrastructure (Vercel Cron only).
- **Idempotent, job-scoped conversations** prevent duplicate threads while allowing
  separate threads per job between the same two people.
- **Derived permissions over destructive cascades** — status changes never mutate
  related entities; permission is checked at action time.

---

## 9. Known Constraints

**Mission (permanent):** no payments; no protected-class filtering; no education-based
filtering; no automatic deletion of user data.

**Architectural invariants:**

- Middleware is Edge-safe and must never import the DB client or `@/auth`.
- `auth.config.ts` carries no DB/Drizzle imports or adapter.
- Auth.js v5 only (no downgrade to v4); Google provider only — no email/magic-link/password.
- No duplicated enum definitions; `@/db/schema` is the single source.
- No `as any` to paper over schema drift; no raw SQL without justification.
- No business logic in client components; no alternate UI libraries; shadcn primitives only.

**Operational guardrails:**

- Schema changes require `npx drizzle-kit generate` then `npx drizzle-kit migrate`,
  provided to the user before dependent code is written. Migrations/pushes are never run
  autonomously, and destructive DB commands are never run autonomously.
- `.env*` files are never edited; new variables go to `.env.example` with a comment and
  an explicit heads-up to the user.
- `npm run check` (typecheck + lint + format) must pass before any change is considered complete.

**Deferred to v2+:** mobile apps (React Native over the same tRPC API), SMS
notifications/verification, real-time messaging, message attachments, profile photos /
business logos, inbox search, and user-extensible taxonomies.
