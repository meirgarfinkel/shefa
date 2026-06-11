# CLAUDE.md — Shefa Engineering Rules

Shefa is a nonprofit, charity-based job board that gives unqualified candidates a chance
to learn on the job. **`PROJECT_SPEC.md` is the source of truth** for scope, domain
rules, data model, and architecture. This file governs *how we work*. When they conflict,
the priority order is: data/production safety → architectural invariants →
`PROJECT_SPEC.md` → this file → `HANDOFF.md` → user request → convenience.

**Read at the start of every session:** `PROJECT_SPEC.md`, `HANDOFF.md` (if present),
then this file.

---

## 1. Dev Philosophy

- **Boring and explicit beats clever.** Prefer direct implementations; avoid speculative
  abstractions and single-use helpers.
- **Preserve data; prefer reversible decisions.** Derived permissions over destructive
  cascades. Status changes must never silently mutate related entities.
- **Domain semantics are sacred.** Don't bend job/application/conversation lifecycle
  rules for convenience — see `PROJECT_SPEC.md §3`.
- **One source of truth per concept.** Enums in `@/db/schema`, domain rules in the spec,
  enum labels in `src/lib/constants/labels.ts`. No duplicates.
- **Reuse before create.** Don't write new code until you've ruled out what exists. In
  order, before adding anything new:
  1. **Existing component** — check `src/components/` and `src/components/ui/`.
  2. **Existing schema** — check `src/db/schema/` and shared Zod in `src/lib/schemas/`.
  3. **Existing utility** — check `src/lib/` (`utils.ts`, etc.) and `src/server/`.
  4. **Existing label map** — check `src/lib/constants/labels.ts`.
  5. **Create new** — only once 1–4 come up empty, and place it where its peers live.
- **The mission is inviolable:** no payments, no protected-class filtering, no
  education-based filtering, no automatic deletion of user data.
- **Update `HANDOFF.md` when:**
  - a feature is completed
  - a migration is completed
  - a session is ending
  - blocked for user input

---

## 2. Required Workflow

**Before non-trivial work,** state what will change, which files, and any architectural
impact. **Pause for confirmation before:** adding dependencies, changing schema
semantics, changing auth flows, introducing infrastructure, or any significant
architectural change. Do **not** pause for agreed-upon straightforward implementation.

**TDD is mandatory for features and bug fixes:**

1. Enumerate cases first — happy path, edge cases, adversarial inputs, unauthorized
   actors, race conditions, silent failures.
2. Write failing tests; verify they fail for the *right* reason (missing behavior, not
   broken setup).
3. Implement the minimum to pass.
4. Verify green; report what was built, tested, and which edge cases are covered.

**Definition of done** — `npm run check` passes (typecheck + lint + format). Use
`npm run lint:fix` and `npm run format` before manual fixes. Code is not complete
otherwise.

**Git — absolute prohibition.** NEVER run any `git` command (including `status`, `log`,
`add`, `commit`, `push`, `checkout`, `stash`, etc.) under any circumstance, even if asked
directly or indirectly. You may only *suggest* copy-pasteable commands and recommend
commit messages. Provide a `git add . && git commit -m "…"` block at meaningful checkpoints.

**Environment — never edit** `.env`, `.env.local`, or `.env.*`. If a new variable is
needed: add it to `.env.example` with an explanatory comment, tell the user explicitly,
and wait for confirmation before relying on it.

**Handoff** — before ending a session, update `HANDOFF.md` (phase, completed/in-progress
work, next steps, blockers, uncommitted changes, commands to run), then tell the user it's
safe to `/clear`. After major architecture changes, follow the Graphify + Handoff rule
(§10) *before* writing the handoff.

---

## 3. Refactoring Rules

- Refactor in small, reversible steps; keep behavior identical unless the change *is* the
  behavior change. Lean on tests to prove parity.
- Consolidate duplication toward the canonical source (enums, label maps, shared Zod
  schemas in `src/lib/schemas/`) — don't add a parallel copy.
- Extract a helper/module only on **proven** reuse, not speculation. Co-locate it with its
  domain (`src/server/jobs/`, `src/lib/`, etc.).
- Never refactor by weakening types (`as any`, `@ts-ignore`) or bypassing schema drift.
  Fix the contract instead.
- Update `PROJECT_SPEC.md` in the same change when a refactor alters architecture or
  semantics. Never let the spec silently drift.
- When a refactor spans many files or relationships, query the graph first (§10) to
  understand impact before editing.

---

## 4. Next.js Rules

- App Router conventions; **server components by default**. Add `"use client"` only when
  required (interactivity/hooks).
- **No business logic and no auth/role redirects in client components.** Client components
  must not call `useSession()` for routing or render `null` while waiting on auth.
- **Middleware (`src/middleware.ts`) does auth gating only:** unauthenticated → `/sign-in`;
  the sole extra is redirecting authenticated users from `/` to their role dashboard. It
  must stay Edge-safe — import only `auth.config.ts` and Next built-ins, **never** `@/auth`
  or `@/db`.
- **Role checks and onboarding redirects live in server component layouts / page
  wrappers** (e.g. `employer`/`seeker` layouts, the `(needs-company)` group), using
  `auth()` from `@/auth`. `auth()` is server-only — never in client components or middleware.
- Protecting a new route = add its prefix to the middleware `matcher` **and** add a role
  check in its server layout. Never add client-side guards.
- **Auth.js v5 only**, split-config pattern, JWT session strategy, Google provider only.
  No v4, no email/magic-link/password providers. `auth.config.ts` carries no DB/adapter.
- `userId` never appears in a URL or query param. Public profile routes take a profile id
  segment; private routes are stable paths with ownership derived from the session.

---

## 5. tRPC Rules

- **Procedures own business logic; components are presentation-only.**
- Use `protectedProcedure` whenever a session is required; `publicProcedure` only for
  genuinely public reads.
- **Identity comes from `ctx.session.user.id`, never from input.** To target another user,
  accept a `profileId`/`id` and resolve internally. Procedures never accept `userId`.
- Validate every input with Zod. Reuse shared schemas from `src/lib/schemas/`; mirror enum
  values with string literals — never `z.nativeEnum`.
- Name procedures as verbs: `create`, `update`, `list`, `getById`, `getPublic`,
  `listMine`, `updateStatus`. "Mine"/"My" = the caller's own records.
- Background jobs run as Vercel Cron routes in `src/app/api/cron/` delegating to
  `src/server/jobs/`; each requires `Authorization: Bearer <CRON_SECRET>`. No separate
  worker. Message/application notifications fire inline (fire-and-forget) — no queue.
- Enforce domain semantics here: check status before allowing actions
  (`if (job.status !== "ACTIVE") block`), keep conversations job-scoped/idempotent, and
  never cascade destructive mutations. Reports are evidence, not enforcement.

---

## 6. DB Rules

- `src/db/schema/` is the canonical contract; `src/db/schema/enums.ts` is the canonical
  enum source. Export TS unions via `typeof X.enumValues[number]` — never hand-duplicate.
- Use `db` from `src/db/index.ts`. Relational reads: `db.query.X.findFirst/findMany` with
  `with`. Mutations: `db.insert/update/delete`. Raw SQL via `db.execute(sql\`…\`)` **only
  when justified** (current sanctioned use: haversine geo-distance in job search).
- Never use `as any` to bypass a schema mismatch — fix the schema or the type.
- **Never autonomously run** `drizzle-kit push`, `drizzle-kit migrate`, or destructive
  `psql`. When you change a file in `src/db/schema/`, immediately give the user the exact
  commands **before** writing dependent code:

  ```bash
  npx drizzle-kit generate
  npx drizzle-kit migrate
  ```

- Respect the lifecycle invariants: pausing a job mutates no related entities; closing
  a job cascades open (`SUBMITTED`/`VIEWED`) applications to `CLOSED` and reopening
  reverses it (`CLOSED` → `SUBMITTED`), while `REJECTED` is never touched by either;
  `REJECTED`/`CLOSED` applications are employer-reversible, not permanently terminal;
  no job-status change ever closes a conversation; conversations persist after job
  closure; application status never gates messaging. (See `PROJECT_SPEC.md §3`.)

---

## 7. UI Rules

*(`DESIGN_SYSTEM.md` has been removed; its invariants live here now.)*

- shadcn/ui (Radix) primitives only — install via `npx shadcn@latest add <component>`.
  Never hand-roll an existing primitive and never introduce an alternate UI library.
- **Reuse shared components** before building new ones (e.g. `StatusBadge`,
  `ResponsivenessBadge`, `JobCard`/`JobDetailCard`, nav components). Check
  `src/components/` and `src/components/ui/` first.
- **Design invariants:** no raw hex colors; no inline color styles; semantic tokens only;
  one accent color; no `tailwind.config.js` (Tailwind 4 is config-less); avoid borders
  aggressively; max 3 surface layers; glassmorphism aesthetic; no hover-movement
  animations.
- Tailwind 4 + Prettier Tailwind plugin for class ordering. TypeScript strict; explicit
  exported types.

---

## 8. Review Checklist

Before declaring work complete, confirm:

- [ ] `npm run check` passes (typecheck + lint + format).
- [ ] Tests written first, fail for the right reason, now pass; edge/adversarial cases covered.
- [ ] No business logic or auth redirect in client components.
- [ ] Identity derived from session, never from input; `userId` absent from URLs/inputs.
- [ ] Inputs Zod-validated; enum values as string literals from the canonical source.
- [ ] No `as any`, no schema-drift bypass, no unjustified raw SQL.
- [ ] No destructive cascade; status checked before action; domain semantics intact.
- [ ] Schema change → migration commands given to the user before dependent code.
- [ ] No `.env*` edits; new vars added to `.env.example` and flagged.
- [ ] UI uses shadcn primitives + semantic tokens; reuses existing components.
- [ ] `PROJECT_SPEC.md` updated if architecture/semantics changed; `HANDOFF.md` updated if ending.
- [ ] No git commands run.

---

## 9. Skills Workflow

- When the user types `/<skill-name>`, invoke it via the Skill tool before other work.
  Only use skills that are actually available; never invent skill names.
- Match common tasks to their skills: `tdd` (test-first features/bugs), `review` /
  `code-review` (review changes), `diagnose` (hard bugs/perf regressions), `verify`
  (confirm a change works by running the app), `handoff` (compact into a handoff doc),
  `to-prd` / `to-issues` / `triage` (turn context into PRDs/issues), `run` (launch the app).
- `code-review ultra` / `ultrareview` is a user-triggered, billed cloud review — you
  cannot launch it yourself; only explain it when asked.
- Prefer the right skill over re-deriving its workflow by hand, but follow the repo rules
  in this file regardless of which skill is running.

---

## 10. Graphify Usage

This repo has a prebuilt knowledge graph at `graphify-out/`. For architecture questions, dependency analysis,
large refactors, dead-code detection,
or "how does this work" questions:

1. Query Graphify first.
2. Then inspect source files.
3. Mention graph findings explicitly.

  ```bash
  graphify query "<question>"        # broad BFS context
  graphify path "<A>" "<B>"          # shortest path between two concepts
  graphify explain "<node>"          # plain-language explanation of a node
  ```

- Use the graph to scope refactors and understand cross-file impact before editing.
- After significant structural changes, refresh it incrementally:

  ```bash
  graphify . --update
  ```

- Full rebuild or other modes are user-driven via the `/graphify` skill — don't trigger a
  full rebuild autonomously.

**Graphify + Handoff rule (major architecture changes).** After a change that alters
modules, relationships, or data flow, do this *before* updating `HANDOFF.md`:

1. Run `graphify . --update` to refresh the graph.
2. Review the graph impact — what edges/communities shifted.
3. In the handoff, name the affected communities/modules so the next session knows the
   blast radius.

This keeps `graphify-out/` and `HANDOFF.md` in sync as the structural record.

---

## 11. Decision Records

When making a significant architectural decision, record it in `HANDOFF.md`:

- **Decision** — what was chosen.
- **Alternatives considered** — what else was on the table.
- **Reason chosen** — why this option won.

Don't re-propose a previously rejected approach; check the recorded decisions first.
