# Handoff — Shefa Job Board

## Current phase

**Phase 3 — Profiles (complete)**

---

## What was completed this session

### Phase 3 Step 2 — Skill + Language seed

- `prisma/seed.ts` — upserts 31 skills (7 categories) + 22 languages; idempotent
- `prisma.config.ts` — `migrations.seed` wired to `tsx prisma/seed.ts`
- `tsx` added as dev dependency (needed to run TypeScript seed outside Next.js)

### Phase 3 Step 3 — Taxonomy API + Profile signup forms

- `src/server/api/routers/taxonomy.ts` — public `taxonomy.skills` (grouped by category) and `taxonomy.languages` queries
- `src/server/api/root.ts` — taxonomy router wired in
- `src/app/seeker/profile/new/page.tsx` — full seeker signup form (react-hook-form + Zod, skills/languages multi-select, available days toggle, required fields)
- `src/app/employer/profile/new/page.tsx` — employer signup form (company info, size, industry, location, optional about/mission)
- `src/app/jobs/page.tsx` — stub landing page (Phase 4 target)
- `react-hook-form` + `@hookform/resolvers` added as dependencies
- shadcn components added: `input`, `label`, `select`, `textarea`, `checkbox`, `separator`, `form`

### Auth middleware Edge Runtime fix

**Root cause**: `middleware.ts` imported `auth` from `@/auth`, which pulled `PrismaAdapter(prisma)` → `@prisma/adapter-pg` → `node:path` into the Edge Runtime bundle. This crashed every page.

**Fix**: Split auth config per Auth.js v5 recommended pattern:

- `src/auth.config.ts` — Edge-safe: pages, JWT callback (stores id + role in token), session callback (reads from token). No adapter, no providers.
- `src/auth.ts` — Full Node.js config: spreads authConfig + PrismaAdapter + Resend provider + `session: { strategy: "jwt" }`. Also adds `sendVerificationRequest` to Resend provider: logs magic link in dev, calls Resend REST API in production.
- `src/middleware.ts` — now constructs its own `NextAuth(authConfig)` so Prisma never enters the edge bundle.
- `src/types/next-auth.d.ts` — added `JWT` augmentation for `id` and `role`.
- `src/app/role-select/page.tsx` — calls `useSession().update({ role })` after `setRole` mutation so the JWT cookie is refreshed immediately (otherwise middleware sees stale role until next sign-in).

### Other

- Removed `as any` cast from `src/server/api/routers/seeker.ts` (migration was applied, types regenerated)
- Middleware updated to role-guard `/seeker/profile/new` (SEEKER only) and `/employer/profile/new` (EMPLOYER only)

---

## What's next

**Phase 4 — Job postings**

1. `JobPosting` CRUD tRPC router (`jobPosting.create`, `jobPosting.list`, `jobPosting.getById`, `jobPosting.update`, `jobPosting.delete`)
2. Post-a-job form (employer only) — mirrors the seeker form pattern
3. Public job listings page at `/jobs` (replace stub)
4. Job detail page at `/jobs/[id]`
5. Search/filter: by city/state, job type, work arrangement, skills, days

---

## Open questions / blockers

1. **Resend domain**: `noreply@shefa.jobs` must be verified in Resend before production emails work. Dev is unblocked (magic link logs to server console).
2. **Profile completion gate**: Currently there's no middleware check for "has profile". Users with a role can skip `/seeker/profile/new` and go directly to `/jobs`. This is intentional for Phase 3 (the mutation itself guards against duplicates). A proper gate (check `hasProfile` in session or via a lightweight DB call) can be added in Phase 4 or 8.

---

## Commands the user should run before resuming

```bash
# Seed the database if not already done
npx prisma db seed
```

All other deps are installed. `npm run check` passes. 25 tests green.
