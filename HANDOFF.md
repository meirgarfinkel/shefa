# Handoff — Shefa Job Board

## Current phase

**Phase 3 — Profiles** (in progress)

---

## What was completed this session

### Phase 2 — Auth + base User (complete)

- `src/auth.ts` — Auth.js v5 config: Resend email provider, PrismaAdapter, session callback (exposes `id` + `role`)
- `src/lib/prisma.ts` — Prisma 7 singleton using `@prisma/adapter-pg`
- `src/types/next-auth.d.ts` — session type augmentation
- `src/server/api/trpc.ts` — session injected into tRPC context; `protectedProcedure` + `createCallerFactory` exported
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handler
- `src/middleware.ts` — unauthenticated → `/sign-in`; authenticated + no role → `/role-select`
- `src/app/sign-in/page.tsx` — magic link request form
- `src/app/verify-request/page.tsx` — "check your email" page
- `src/app/role-select/page.tsx` — SEEKER / EMPLOYER picker; calls `user.setRole` mutation
- `src/server/api/routers/user.ts` — `setRole` mutation

### Phase 3 Step 1 — Profile create mutations (complete, tests green)

- `src/lib/schemas/seeker.ts` — Zod input schema for SeekerProfile (includes `isAdult: z.literal(true)`)
- `src/lib/schemas/employer.ts` — Zod input schema for EmployerProfile (includes `isAdult`, updated Industry enum)
- `src/server/api/routers/seeker.ts` — `createProfile` mutation: role check, duplicate check, `user.isAdult = true`, nested skill/language create
- `src/server/api/routers/employer.ts` — same pattern for employer
- `src/server/api/routers/__tests__/seeker.test.ts` — 13 tests, all green
- `src/server/api/routers/__tests__/employer.test.ts` — 12 tests, all green
- `prisma/schema.prisma` — `isAdult Boolean @default(false)` added to User; Industry enum updated to match Zod schema

### Tooling — Linting, formatting, pre-commit hooks (complete)

- `.prettierrc.json` + `.prettierignore` — Prettier config with `prettier-plugin-tailwindcss`
- `eslint.config.mjs` — `eslint-config-prettier` added as last entry
- `package.json` — new scripts: `lint:fix`, `format`, `format:check`, `typecheck`, `check`; `lint-staged` config added
- `.husky/pre-commit` — runs `npx lint-staged` on commit
- `npm run check` passes: typecheck ✓, lint ✓ (0 errors), format ✓

---

## What's in progress / pending

### Migration not yet run

The Prisma schema has two pending changes that require a migration:

```
npx prisma migrate dev --name add-is-adult-and-update-industry
```

This will:

- Add `isAdult BOOLEAN NOT NULL DEFAULT false` to `User`
- Rename 4 Industry enum values (`HEALTHCARE_SUPPORT` → `HEALTHCARE`, `TRADES_CONSTRUCTION` → `TRADES`, `TRANSPORTATION_DELIVERY` → `TRANSPORTATION`, `EDUCATION_CHILDCARE` → `EDUCATION`)
- Add 6 new Industry values: `TECHNOLOGY`, `BUSINESS`, `FINANCE`, `MARKETING`, `MEDIA`, `REAL_ESTATE`
- Remove `NONPROFIT_COMMUNITY`

After running the migration, Prisma will regenerate the client. Remove the two `as any` casts in `seeker.ts` and `employer.ts` (`ctx.prisma.user as any` and `ctx.prisma.employerProfile as any`) — they were added only because the generated types were stale.

### Pre-commit hook not yet verified

See the manual test sequence in the session notes (Step 9).

---

## What's next

**Phase 3 Step 2 — Skills + Languages seed**

The curated `Skill` and `Language` tables need to be seeded before the profile signup flows can work. Tasks:

1. Write `prisma/seed.ts` with the skill and language lists from the spec
2. Tell user to run `npx prisma db seed`

**Phase 3 Step 3 — Profile signup UI**

After the seed:

1. Seeker profile creation form (multi-step or single page): collects all required fields + skill/language multi-select
2. Employer profile creation form
3. After profile created → redirect to a "profile complete" or dashboard page (Phase 3 precursor to Phase 4)

---

## Open questions / blockers

1. **Migration**: Must be run before resuming any Phase 3 code that touches `isAdult` or the new Industry enum values.
2. **Skill taxonomy**: The spec says "curated list" but doesn't enumerate skills. Do you have a list, or should I generate a reasonable starting set?
3. **Language taxonomy**: Same question — full world languages, or a curated short list?
4. **Onboarding redirect**: After profile creation, where does the user land? A "your profile is live" confirmation page, or straight to a job listings page (Phase 4)?

---

## Commands to run before resuming

```bash
# 1. Run the pending migration
npx prisma migrate dev --name add-is-adult-and-update-industry

# 2. Verify tests still pass after regenerated types
npm test

# 3. Remove the temporary `as any` casts in seeker.ts and employer.ts
#    (lines using `ctx.prisma.user as any` and `ctx.prisma.employerProfile as any`)
```
