# Claude Code Instructions — Charity Job Board (Shefa)

## Required reading at session start

Before doing anything in this project:

1. Read `PROJECT_SPEC.md` fully — it is the source of truth for the data model, design decisions, and 8-phase build plan.
2. Read `HANDOFF.md` if it exists — it contains in-progress state from the previous session.
3. Read this file (`CLAUDE.md`) fully.

If any of these contradict each other, stop and ask the user before proceeding.

## Project summary

Nonprofit charity-based job board. Stack: Next.js (App Router) + TypeScript + tRPC + Prisma 6 + PostgreSQL + Auth.js v5 (`next-auth@beta`) + Resend + BullMQ + Redis + Tailwind 4 + shadcn/ui (Radix-based). Local dev via Docker Compose. Mission: give unqualified candidates a chance to learn on the job. No payments, ever.

---

## Living documentation — keep these in sync

Three files are the source of truth. Keep them current as the project evolves.

- **`PROJECT_SPEC.md`** — data model, architectural decisions, scope. When a design decision is made or changed, update this file in the same response. Don't silently work around the spec — if the spec is wrong, fix the spec.
- **`CLAUDE.md`** (this file) — project-wide working rules. When you and the user agree on a new rule (e.g., "always do X this way"), add it here in the same response.
- **`HANDOFF.md`** — see below.

When updating these files, show the diff or explain what changed. Never update them silently.

---

## Session handoff protocol

At the end of every working session or phase, and before the user is likely to clear context, you must:

1. Write or update `HANDOFF.md` at the project root.
2. The handoff must contain:
   - **Current phase** (from PROJECT_SPEC.md's 8-phase plan)
   - **What was just completed** (specific files, features, tests)
   - **What's in progress** (if anything — be precise about state)
   - **What's next** (the immediate next step)
   - **Open questions or blockers** for the user
   - **Any uncommitted changes** the user should review
   - **Commands the user should run before resuming** (e.g., "run `npm install` because new deps were added")

3. Tell the user: "Handoff written to HANDOFF.md. Safe to `/clear` and start a fresh session."

A new session always starts by reading HANDOFF.md before any other action.

---

## TDD is mandatory

Every feature follows this exact loop:

### Step 1 — Plan adversarial cases

Before writing any test, list:

- The happy path
- Boundary cases (empty input, max length, zero, negative, off-by-one ranges)
- Adversarial inputs (malicious strings, SQL/HTML injection attempts, oversized payloads, unicode edge cases, unauthorized actors)
- Silent failure modes (functions that "succeed" but produce wrong output — e.g., returns empty array instead of throwing on invalid query)
- Concurrency/race conditions if relevant

Show this list to the user before writing tests. Don't skip this step. The default mode of testing only happy paths is forbidden in this project.

### Step 2 — Write failing tests

Write tests covering the cases from Step 1.

### Step 3 — Verify tests fail correctly (in a subagent)

Spawn a Task subagent with the instruction: "Run the tests in [path]. Report which tests fail and the exact failure messages. Do not modify any code. Do not implement anything."

The subagent's job is purely to confirm the tests fail for the _right reason_ (e.g., "function not implemented" or "assertion not met"), not for the wrong reason (e.g., "import error," "syntax error in test"). If a test fails for the wrong reason, fix it before proceeding.

### Step 4 — Implement

Write the minimum code to make the tests pass.

### Step 5 — Verify tests pass (in a fresh subagent)

Spawn a _new_ Task subagent: "Run the tests in [path]. Report all results. Do not modify any code." Fresh context matters — your reasoning during implementation should not bias the verification.

### Step 6 — Report back to the user

Show the user the test results from step 5. If anything failed, debug and loop. If all green, summarize what was built and what was tested.

---

## Environment files — never touch

- **Never edit `.env`, `.env.local`, or any `.env.*` file directly.**
- If a new environment variable is needed:
  1. Add it to `.env.example` with a placeholder value and a comment explaining it.
  2. Tell the user explicitly: "I've added `FOO_BAR` to `.env.example`. Please add the real value to your `.env` file before we continue."
  3. Don't proceed with code that depends on it until the user confirms.

---

## UI verification

- For backend/API/data work: tests are sufficient.
- For UI changes: after building, take a screenshot using Playwright (already a dev dep, or install if not) so the user can see what was rendered. Don't claim a UI works without visual verification.

---

## Code style

- TypeScript strict mode, always.
- Explicit types on function signatures and exports; inference for the rest.
- Zod schemas for all user input and tRPC procedure inputs/outputs.
- Prisma 6 (`prisma-client-js`) for all database access. Instantiate with plain `new PrismaClient()` — no driver adapter needed. `DATABASE_URL` is read from the environment via the datasource block. No raw SQL unless explicitly justified.
- Use the standard Prisma generator (`provider = "prisma-client-js"`) with **no custom `output` path**. All Prisma types come from `@prisma/client`. Never add a custom output path — it generates Node-specific imports that break in Edge runtime contexts (Next.js middleware especially).
- Next.js App Router conventions (server components by default, "use client" only when needed).
- shadcn/ui (Radix-based) components for UI; Tailwind for styling. No other CSS or component libraries.
- shadcn components must always be added via `npx shadcn@latest add <component>`, never hand-written. If a needed component isn't in the shadcn registry, ask before creating it.
- Run `npm run check` before committing — it runs typecheck, lint, and format check in sequence.
- Code must pass `npm run lint` and `npm run format:check` to be considered done. Don't claim a task is complete if either fails.
- Use `npm run lint:fix` and `npm run format` to auto-fix issues. Don't manually fix what tools can fix.
- Tailwind classes are auto-sorted by `prettier-plugin-tailwindcss`. Don't manually reorder them.
- Unused variables prefixed with `_` are intentional (signals "intentionally discarded"). Use this convention rather than disabling lint rules. For destructuring out a field to exclude it from a rest spread, prefer `const { foo, ...rest } = obj` — the rest-sibling rule allows it without underscore.

## Architecture rules

- tRPC routers: `src/server/api/routers/`
- Prisma schema: `prisma/schema.prisma`
- Background jobs (BullMQ): `src/server/jobs/`
- Email templates: `src/server/emails/`
- Shared Zod schemas: `src/lib/schemas/`
- Tests: `__tests__/` co-located with source, or `*.test.ts` next to the file.
- No business logic in React components — call tRPC procedures.

## Database operations — user runs these manually

Never run autonomously:

- `prisma migrate dev`
- `prisma migrate reset`
- `prisma migrate deploy`
- `prisma db push`
- `prisma db seed`
- Any direct `psql` command that modifies data
- Whenever you modify `prisma/schema.prisma`, immediately tell the user the exact migration command to run, formatted as a copy-pasteable code block, with a descriptive `--name` argument. Do this before writing any code that depends on the new schema, so the user can run the migration in parallel with you continuing to write code.

Instead: write the schema changes, generate the migration with `--create-only` if needed, then _tell the user_ the exact command to run and what to expect.

## Auth.js

- Auth.js v5 (`next-auth@beta`) is correct despite the "beta" label. Don't downgrade to v4.
- Use the official Prisma adapter (`@auth/prisma-adapter`).
- Auth.js must use the split config pattern: `auth.config.ts` (Edge-safe, no Prisma) and `auth.ts` (Node, full config with adapter). Middleware imports only `auth.config.ts`. This is required to keep middleware Edge-compatible.
- Session strategy must be `jwt`, not `database`, so middleware can verify sessions without database access.
- `sendVerificationRequest` lives on the Resend provider in `auth.ts` (not in `auth.config.ts`). In development it logs the magic link to the console; in production it calls the Resend REST API directly.
- After a mutation that changes session data (e.g. `setRole`), call `useSession().update({ ... })` client-side to refresh the JWT cookie immediately. Without this, middleware reads stale role data until the next sign-in.

### Split config — hard rules

- **`middleware.ts`** must never import from `db.ts`, `auth.ts`, `@prisma/client`, or any generated Prisma path. It may only import from `auth.config.ts` and Next.js built-ins. Enforce with the comment at the top of that file.
- **`auth.config.ts`** must have zero Prisma imports — not even `import type`. The `Role` type lives in `src/types/role.ts` (a plain string union) so auth.config stays Prisma-free.
- Violating either of these will silently work in dev (Node runtime) but break at build/deploy time on Vercel (Edge runtime).

---

## Routing and auth guards — middleware is the only place

All auth-based redirects live exclusively in `src/middleware.ts`. **Never add auth redirects inside page components.**

### What middleware handles

| Condition                                                                        | Redirect                          |
| -------------------------------------------------------------------------------- | --------------------------------- |
| Unauthenticated, non-public path                                                 | → `/sign-in` (with `callbackUrl`) |
| Authenticated, no role, not on `/role-select`                                    | → `/role-select`                  |
| Authenticated, has role, on `/` or `/sign-in`                                    | → role dashboard (see below)      |
| Non-EMPLOYER on `/employer/dashboard`, `/employer/jobs/*`, `/employer/profile/*` | → `/jobs`                         |
| Non-SEEKER on `/seeker/applications`, `/seeker/profile/*`                        | → `/jobs`                         |

**Role dashboards**: EMPLOYER → `/employer/dashboard`; SEEKER → `/jobs` (no seeker dashboard yet).

### What pages must NOT do

These patterns are forbidden in page components:

```tsx
// FORBIDDEN — auth redirect in useEffect
useEffect(() => {
  if (!session || session.user.role !== "EMPLOYER") router.push("/");
}, [session]);

// FORBIDDEN — auth-based null return while session loads
if (status === "loading" || status === "unauthenticated") return null;
if (session?.user?.role !== "EMPLOYER") return null;
```

Middleware fires before React renders. If a page is reachable, the user is already authenticated and has the right role — these checks are redundant and cause flicker.

### What IS still allowed in pages

```tsx
// Fine — conditional UI based on role (not a redirect)
const { data: session } = useSession();
if (session?.user?.role === "EMPLOYER") {
  /* show employer button */
}

// Fine — JWT refresh after a role mutation
const { update } = useSession();
await update({ role: "SEEKER" });

// Fine — post-mutation navigation (business logic, not auth)
const createProfile = trpc.employer.createProfile.useMutation({
  onSuccess: () => router.push("/jobs"),
});

// Fine — business-logic redirect (profile doesn't exist yet)
if (!profileLoading && !profile) {
  router.replace("/employer/profile/new");
}
```

### Adding new protected routes

To protect a new route, add its path prefix to the correct array in `src/middleware.ts`:

```ts
const EMPLOYER_ONLY_PREFIXES = [
  "/employer/dashboard",
  "/employer/jobs",
  "/employer/profile" /* add here */,
];
const SEEKER_ONLY_PREFIXES = ["/seeker/applications", "/seeker/profile" /* add here */];
```

Do not add client-side guards as a fallback — one place only.

## BullMQ worker process

The freshness background job runs as a **separate process**, not inside Next.js:

```bash
npm run worker   # alongside npm run dev
```

The worker entry point is `src/server/jobs/worker.ts`, executed via `tsx`. It:

- Registers a BullMQ repeatable job (daily cron, midnight UTC)
- Loads env vars via `dotenv/config` (standalone Node process, not Next.js)
- Uses `@/` path aliases (tsx reads tsconfig paths automatically)

In dev, emails log to console instead of calling Resend. In prod, a process manager (PM2, Render worker, etc.) keeps the worker alive.

---

## What NOT to do

- Don't add dependencies without explaining why and what the alternatives were.
- Don't suggest out-of-scope features (mobile, SMS, real-time messaging, message attachments — see PROJECT_SPEC.md "Out of scope").
- Don't collect or expose protected characteristics (age, marital status, religion, disability, photos pre-hire) — see PROJECT_SPEC.md.
- Don't add education filtering on job postings — by design, education is visible but not filterable.
- Don't roll your own auth.
- Don't auto-delete user data — paused, never deleted.
- Don't introduce alternative headless UI libraries (Base UI, Headless UI, etc.) — Radix-based shadcn only.
- Don't import `dotenv` in Next.js application code (`src/app/`, `src/server/api/`, etc.) — Next.js loads env vars natively. `dotenv` is only acceptable in standalone Node scripts run outside Next.js (e.g., `prisma.config.ts`, `prisma/seed.ts`, BullMQ worker entry points).

## Git — never run git commands

- **Never run any `git` commands** (commit, add, push, status, log, etc.).
- Instead, at the end of each working step, tell the user exactly what to run and provide a ready-to-paste commit message.
- Format the suggestion as a code block the user can copy directly.

## Working style

- Always explain what you're about to do before doing it. For multi-file changes, list files first.
- Pause for confirmation at major decision points; don't blast through a whole phase in one go.
- At the end of each working step, suggest a commit by giving the user the exact commands to run, not by running them yourself.
- When in doubt, default to the simpler / more boring solution.
- If something in PROJECT_SPEC.md seems wrong or incomplete, flag it — don't silently work around it.
- If you're about to install a major version of a library, check that it's compatible with the rest of the stack first. (Bitten by Base UI and Prisma 7 already.)

## DESIGN SYSTEM

Before writing ANY UI component or page, read `DESIGN_SYSTEM.md` in the repo root.

### Non-negotiable rules

- No `tailwind.config.js` — all theme config is in `globals.css` via `@theme inline`
- No raw hex colors in className or style props — semantic tokens only
- No `style={{ ... }}` for colors — always Tailwind classes
- One accent: `text-primary` / `bg-primary` / `border-primary` only
- No second accent color ever
- Transitions: `transition-colors duration-150` only — no movement on hover
- Surface layers: `bg-background` → `bg-surface-1` → `bg-surface-3` (max 3, never deeper)
- Borders on all cards: `border border-transprent`, hover: `hover:border-transprent/60`
- Font weights: `font-normal` and `font-medium` only (badges may use `font-semibold`)
- Radius: `rounded-full` (pills) · `rounded-md` (buttons/inputs) · `rounded-lg` (cards)
- Min font size: `text-xs` — never `text-[10px]` or smaller

### Status colors

| Status | Classes |
|---|---|
| ACTIVE | `bg-success/15 text-success border-success/25` |
| DRAFT | `bg-surface-3 text-text-muted border-transprent` |
| PAUSED | `bg-warning/15 text-warning border-warning/25` |
| FILLED | `bg-primary/15 text-primary border-primary/25` |
| EXPIRED / CLOSED | `bg-danger/15 text-danger border-danger/25` |

### Custom components to use (do not re-implement)

- `StatusBadge` — for any job status display
- `ResponsiveBadge` — for user responsiveness
- `JobCard` — for job listings
- `StatCard` — for dashboard metrics
- `PageHeader` — for page titles with optional actions
- `EmptyState` — for empty lists
- `InboxRow` — for message threads
- `Divider` — for horizontal rules

### shadcn components to use for primitives

Button, Input, Textarea, Label, Select, Card, Badge, Dialog, Sheet, Tooltip, Separator, Skeleton, Sonner (not Toast).
Always customize with Tailwind classes — never override with inline styles.
