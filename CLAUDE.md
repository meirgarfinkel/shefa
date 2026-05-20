# CLAUDE.md — Shefa Engineering Rules

## Project Overview

Shefa is a nonprofit charity-based job board focused on giving unqualified candidates an opportunity to learn on the job.

Core stack:

- Next.js App Router
- TypeScript (strict)
- tRPC
- Drizzle ORM (`drizzle-orm` + `@neondatabase/serverless` HTTP driver)
- PostgreSQL
- Auth.js v5 (`next-auth@beta`)
- Resend
- Tailwind 4
- shadcn/ui (Radix-based)

Infrastructure:

- Local: Docker Compose (`postgres:16-alpine` only)
- Production:
  - Vercel (web + cron jobs)
  - Neon (Postgres)
  - Resend (email)

Mission constraints:

- No payments ever
- No protected-class filtering
- No education-based filtering
- No deleting user data automatically

---

# Required Reading Order

At the start of every session:

1. Read `PROJECT_SPEC.md`
2. Read `HANDOFF.md` if it exists
3. Read `CLAUDE.md`
4. Read `DESIGN_SYSTEM.md` before any UI work

If instructions conflict:

1. Data safety / production safety
2. Architectural invariants
3. `PROJECT_SPEC.md`
4. `CLAUDE.md`
5. `HANDOFF.md`
6. User request
7. Convenience / optimization

Never violate a higher-priority rule to satisfy a lower-priority one.

---

# Source-of-Truth Files

## `PROJECT_SPEC.md`

Canonical source for:

- scope
- architecture
- domain rules
- data model
- phase planning

If implementation changes architecture or semantics, update the spec immediately.

---

## `CLAUDE.md`

Canonical source for:

- engineering workflow
- architectural invariants
- coding standards
- operational rules

---

## `HANDOFF.md`

Canonical source for:

- current session state
- unfinished work
- blockers
- next steps

Always update before ending a session.

---

# Architectural Invariants

These rules are non-negotiable.

## Auth

- Middleware does ONE thing: checks if a session exists. Unauthenticated → redirect to `/sign-in`. No role logic, no profile checks, no onboarding redirects.
- Middleware must remain Edge-safe (split config pattern — imports `auth.config.ts` only)
- Middleware must never import the db client (Drizzle/Neon are Node-only)
- JWT strategy is required — Edge middleware cannot query the DB, so sessions must be verifiable from the cookie alone
- Role checks and onboarding redirects live in server component layouts and page wrappers, not middleware

---

## Database

- `src/db/schema/` is the canonical database contract
- `src/db/schema/enums.ts` is the canonical enum source
- Drizzle `pgEnum` values export TypeScript union types (e.g. `type JobStatus = ...`)
- Zod enums must use string literals matching enum values — not `z.nativeEnum`
- Never bypass schema drift with `as any`

---

## Business Logic

- tRPC procedures own business logic
- React components are presentation-only
- No business logic inside client components
- Prefer derived permissions over destructive cascades

---

## Messaging

- Conversations persist after job closure
- Pausing jobs must not auto-close conversations
- Reports do not directly enforce moderation
- Conversation restrictions are conversation-scoped
- Global moderation is separate from conversation state

---

## Infrastructure

- Background jobs run as Vercel Cron routes in `src/app/api/cron/`
- No raw SQL unless explicitly justified

---

# Domain Semantics

## JobStatus

### ACTIVE

- visible
- searchable
- accepts applications
- messaging enabled

### PAUSED

- blocks new applications
- preserves applications/conversations
- should not mutate related entities

### CLOSED

- hiring completed
- historical data preserved
- may freeze workflows, but should not destroy data

---

## Applications

Application status is independent from job status.

Closing a job must not automatically reject applications.

Application lifecycle is explicit and controlled.

Terminal states are terminal.

---

## Conversations

Conversations are long-lived records.

Job state changes must not automatically mutate conversations.

Messaging permissions should usually be derived dynamically.

Prefer:

```ts
if (job.status !== "ACTIVE") blockAction();
```

Avoid:

```ts
update all related conversations/applications
```

---

## Reports and Moderation

Reports are NOT moderation actions.

Reports are evidence/input.

Moderation actions are separate enforcement decisions.

Do not block messaging purely because a report exists.

---

# Mutation Philosophy

Prefer:

- derived permissions
- soft restrictions
- reversible states
- explicit transitions

Avoid:

- cascading destructive mutations
- hidden side effects
- silent cross-entity mutations

Examples:

GOOD:
- checking status before allowing actions

BAD:
- pausing jobs auto-closes conversations
- reports auto-suspend users

---

# Workflow Rules

## Before Starting Work

Always explain:

- what will be changed
- which files will be touched
- architectural impact if relevant

Pause for confirmation before:

- adding dependencies
- changing schema semantics
- changing auth flows
- introducing infrastructure
- modifying architecture significantly

Do NOT pause for straightforward implementation work already agreed upon.

---

# Context Management and Auto-Compact

Claude should proactively compact conversation context at logical completion points instead of waiting for context exhaustion.

Good compact points include:

- after completing a feature
- after finishing a debugging session
- after finishing a migration or schema change
- after completing a UI implementation
- after resolving a blocker
- before switching to a new subsystem/domain
- after updating documentation/spec files
- whenever conversation history contains large amounts of stale implementation detail

Before compacting, Claude must:

1. Update `HANDOFF.md`
2. Ensure all architectural decisions are documented
3. Summarize:
   - completed work
   - current state
   - pending work
   - important invariants
   - open questions
4. Verify no critical implementation context would be lost

Claude should prefer frequent clean compaction over operating near maximum context size.

Do not wait for context exhaustion before compacting.

# Context Preservation Priority

When compacting context, preserve:

1. Architectural decisions
2. Domain semantics
3. Current blockers
4. Active TODOs
5. Schema assumptions
6. API contracts
7. In-progress migrations
8. User preferences and constraints

Discard:

- repetitive logs
- stale debugging attempts
- superseded implementations
- redundant explanations
- temporary experimentation

# Efficient Response Rules

Prefer:

- focused diffs over full-file rewrites
- incremental edits over regenerating large files
- concise explanations after implementation stabilizes
- referencing existing architecture instead of repeating it

Avoid:

- repeating unchanged code
- re-explaining established decisions
- generating large boilerplate unnecessarily

# TDD Workflow (Mandatory)

Every feature follows this order:

## 1. Plan adversarial cases

List:

- happy path
- edge cases
- adversarial inputs
- unauthorized actors
- race conditions
- silent failure modes

Do this before writing tests.

---

## 2. Write failing tests

Tests must fail for the correct reason.

---

## 3. Verify failing state

Use isolated verification when possible.

Tests must fail because functionality is missing — not because setup/imports are broken.

---

## 4. Implement minimum solution

Prefer simple solutions.

Avoid speculative abstractions.

---

## 5. Verify passing state

Run tests in fresh context when possible.

---

## 6. Report results

Summarize:

- what was built
- what was tested
- what edge cases were covered

---

# Simplicity Rules

- Prefer direct implementations
- Avoid premature abstractions
- Avoid helper utilities used once
- Avoid generic systems without proven reuse
- Default to boring solutions

---

# Known Anti-Patterns

Never introduce:

- client-side auth redirects
- duplicated enum definitions (use `@/db/schema` as canonical source)
- business logic inside components
- middleware importing db/Drizzle
- raw SQL without justification
- cascading destructive updates
- inline color styles
- alternate UI libraries
- custom auth systems

---

# Environment Rules

Never edit:

- `.env`
- `.env.local`
- `.env.*`

If a new env variable is needed:

1. Add it to `.env.example`
2. Add explanatory comment
3. Tell the user explicitly
4. Wait for confirmation before relying on it

---

# Database Operations

Never autonomously run:

- `drizzle-kit push`
- `drizzle-kit migrate`
- destructive `psql` commands

When modifying schema files in `src/db/schema/`:

Immediately provide the exact migration command:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Do this BEFORE writing dependent code.

---

# Drizzle Rules

- Use `db` from `src/db/index.ts` (`DbClient = typeof db`)
- Use `db.query.X.findFirst/findMany` for relational queries with `with`
- Use `db.insert/update/delete` for mutations
- Use `db.execute(sql\`...\`)` for raw SQL (must justify)
- Import table/enum types from `@/db/schema`

Never:

- duplicate enum values as TypeScript unions manually (use `typeof X.enumValues[number]`)
- use `as any` to bypass schema mismatches

---

# Auth.js Rules

- Auth.js v5 is mandatory
- Do not downgrade to v4
- Use split config pattern

## `auth.config.ts`

- Edge-safe only
- no db/Drizzle imports
- no `@/db` or `drizzle-orm`
- no adapter

## `auth.ts`

- full Node config
- DrizzleAdapter (from `@auth/drizzle-adapter`)
- Google provider only — no email/magic link providers

## Middleware

Must import ONLY:

- `auth.config.ts`
- Next.js built-ins

Never import `@/db` or `drizzle-orm`.

---

# Routing and Authorization

## Middleware (Edge — `src/middleware.ts`)

Single responsibility: if no session exists, redirect to `/sign-in`. Nothing else.

Must import only `auth.config.ts` and Next.js built-ins. Never import `@/auth` or `@/db`.

## Server Component Layouts and Page Wrappers

Role checks and onboarding redirects live here — not in middleware, not in client components.

Current gatekeepers:

| File | What it checks |
|------|----------------|
| `app/employer/layout.tsx` | authenticated + role === EMPLOYER |
| `app/seeker/layout.tsx` | authenticated + role === SEEKER |
| `app/role-select/page.tsx` | redirects to dashboard if role already set |
| `app/sign-in/page.tsx` | redirects authenticated users to their dashboard |

Pattern:

```ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/sign-in");
  if (!session.user.role) redirect("/role-select");
  if (session.user.role !== "EMPLOYER") redirect("/jobs");
  return <>{children}</>;
}
```

`auth()` from `auth.ts` may only be called in server components, layouts, and API routes — never in client components or middleware.

## Client Components

Must NOT:

- redirect based on auth or role
- call `useSession()` for routing decisions
- render null while waiting for auth state

---

# UI Rules

Before UI work:

Read `DESIGN_SYSTEM.md`

---

# Design Invariants

- No raw hex colors
- No inline color styles
- No `tailwind.config.js`
- Semantic tokens only
- One accent color only
- No hover movement animations
- Avoid borders aggressively
- Max 3 surface layers
- Glassmorphism aesthetic only

---

# Component Rules

Use existing shared components whenever possible:

- `StatusBadge`
- `ResponsiveBadge`
- `JobCard`
- `StatCard`
- `PageHeader`
- `EmptyState`
- `InboxRow`
- `Divider`

Use shadcn primitives only.

Never hand-roll existing primitives.

Install via:

```bash
npx shadcn@latest add <component>
```

---

# Code Style

- TypeScript strict mode
- Explicit exported types
- Zod for all input validation
- App Router conventions
- Server components by default
- `"use client"` only when required

Run before completion:

```bash
npm run check
```

Code is not complete unless:

- lint passes
- typecheck passes
- formatting passes

Use:

```bash
npm run lint:fix
npm run format
```

before manual fixes.

---

# File Structure

## Routers

```text
src/server/api/routers/
```

## Database Schema

```text
src/db/schema/
src/db/index.ts
drizzle.config.ts
```

## Jobs

```text
src/server/jobs/
```

## Emails

```text
src/server/emails/
```

## Shared Schemas

```text
src/lib/schemas/
```

## Tests

Co-located or:

```text
__tests__/
```

---

# Background Jobs (Vercel Cron)

Background jobs run as Vercel Cron API routes. No separate worker process.

| Route | Schedule | Purpose |
|-------|----------|---------|
| `src/app/api/cron/freshness/route.ts` | Daily 9am UTC | Freshness pings + auto-pause |
| `src/app/api/cron/responsiveness/route.ts` | Every 2 days 3am UTC | Responsiveness badge computation |
| `src/app/api/cron/digest/route.ts` | Daily 6pm UTC | Daily digest emails |

Each route requires `Authorization: Bearer <CRON_SECRET>` — Vercel injects this automatically.

Message and application notifications are sent immediately (inline, fire-and-forget) when a message is sent or an application is submitted. There is no debouncing queue.

---

# Git Rules

NEVER execute any git command under any circumstance.

Forbidden commands include, but are not limited to:

```bash
git add
git commit
git push
git pull
git merge
git rebase
git checkout
git switch
git reset
git restore
git stash
git tag
git branch
git cherry-pick
git revert
git fetch
git clean
git status
git log
```

This prohibition applies even if the user asks indirectly or implies permission.

Claude may ONLY:

- suggest git commands
- provide copy-pasteable command blocks
- recommend commit messages

Claude must never interact with git state directly.

Instead provide exact commands for the user.

Always provide:

```bash
git add .
git commit -m "message"
```

at meaningful checkpoints.

---

# Session Handoff Protocol

Before ending a session:

Update `HANDOFF.md` with:

- current phase
- completed work
- in-progress work
- next steps
- blockers/questions
- uncommitted changes
- commands user should run

Then explicitly tell the user:

> Handoff written to HANDOFF.md. Safe to `/clear` and start a fresh session.

---

# Documentation Expectations

When architecture or semantics change:

Update documentation immediately.

Never silently diverge from the spec.

Important changes should include:

- what changed
- why
- affected systems

---

# Decision-Making Heuristics

When uncertain:

1. Choose simpler architecture
2. Prefer explicitness over cleverness
3. Prefer reversible decisions
4. Preserve data
5. Avoid hidden coupling
6. Keep domain semantics consistent
7. Optimize for maintainability over novelty
