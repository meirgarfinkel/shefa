# Handoff — Shefa Job Board

## Current phase

**Phase 8 (polish) — Prisma → Drizzle ORM migration**

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

### Prisma → Drizzle ORM migration

**Goal**: replace Prisma 6 + `@prisma/client` with Drizzle ORM + `@neondatabase/serverless` HTTP driver for edge/Cloudflare compatibility.

**New files created:**
- `src/db/schema/enums.ts` — all 16 pgEnum definitions + TypeScript union type exports
- `src/db/schema/auth.ts` — User, Account, Session, VerificationToken tables (PascalCase SQL names preserved)
- `src/db/schema/seeker.ts` — SeekerProfile, SeekerLanguage
- `src/db/schema/employer.ts` — EmployerProfile, Company
- `src/db/schema/job.ts` — JobPosting, JobLanguage
- `src/db/schema/application.ts` — Application
- `src/db/schema/conversation.ts` — Conversation, Message
- `src/db/schema/freshness.ts` — VerificationPing, FreshnessToken
- `src/db/schema/notification.ts` — NotificationPreferences
- `src/db/schema/report.ts` — Report
- `src/db/schema/geo.ts` — State, City
- `src/db/schema/taxonomy.ts` — Language
- `src/db/schema/relations.ts` — all Drizzle `relations()` definitions (named relations for ConversationSeeker/ConversationEmployer/SeekerPings/JobPings)
- `src/db/schema/index.ts` — re-exports all schema files
- `src/db/index.ts` — Neon HTTP driver + drizzle client; exports `db` and `DbClient` type
- `drizzle.config.ts` — Drizzle Kit config

**Modified:**
- `package.json` — removed prisma/`@prisma/client`/`@auth/prisma-adapter`; added drizzle-orm/drizzle-kit/`@neondatabase/serverless`/`@paralleldrive/cuid2`/`@auth/drizzle-adapter`; added `db:generate`, `db:migrate`, `db:push`, `db:studio` scripts
- `src/auth.ts` — DrizzleAdapter instead of PrismaAdapter
- `src/server/api/trpc.ts` — `ctx.db` (Drizzle DbClient) instead of `ctx.prisma`
- All tRPC routers: taxonomy, location, report, notification, user, employer, seeker, company, application, conversation, message, jobPosting
- All job files: token.ts, redeem.ts, freshness.job.ts, responsiveness.job.ts, daily-digest.job.ts, message-notify.job.ts, application-notify.job.ts
- `src/app/api/change-email/route.ts`
- `src/app/employer/(needs-company)/layout.tsx`
- `src/app/employer/(needs-company)/dashboard/page.tsx`
- All pages that imported enum types from `@prisma/client` (replaced with `@/db/schema`)
- `src/components/ui/job-card.tsx`
- `src/lib/schemas/application.ts` — replaced `z.nativeEnum(ApplicationStatus)` with `z.enum([...])`
- `src/lib/prisma.ts` — emptied (tombstoned)
- `CLAUDE.md`, `PROJECT_SPEC.md` — updated to reflect Drizzle stack

**Key patterns established:**
- `_count` replacement: separate aggregation query → `Map` → manual merge
- Nested filter replacement: `inArray(col, db.select({ id: X.id }).from(X).where(...))` subquery
- Language join-table updates: delete-all + insert pattern
- `mode: 'insensitive'` → `ilike()`
- Prisma `hasSome` → `arrayOverlaps(column, values)`
- Decimal columns: `.mapWith(Number)` to return `number` not `string`
- Unique violation: PostgreSQL error code `23505` (was Prisma `P2002`)
- Prisma relation includes → explicit joins or separate queries

---

## Pending work

### Test files (need separate attention)

These test files mock `PrismaClient` and pass it as the `db` parameter. They need to be rewritten to mock `DbClient` (Drizzle) instead:

- `src/server/jobs/__tests__/application-notify.test.ts`
- `src/server/jobs/__tests__/daily-digest.test.ts`
- `src/server/jobs/__tests__/message-notify.test.ts`
- `src/server/jobs/__tests__/responsiveness.job.test.ts`

Also needs migration: any other test files that import from `@prisma/client` or `@/lib/prisma`.

---

## Commands to run

**1. Install packages (removes Prisma, adds Drizzle):**
```bash
npm install
```

**2. Generate Drizzle migration files:**
```bash
npx drizzle-kit generate
```

**3. Apply migrations to database:**
```bash
npx drizzle-kit migrate
```

Or for local dev against a running Postgres:
```bash
npx drizzle-kit push
```

**4. Verify types after install:**
```bash
npx tsc --noEmit
```

**5. Run lint/format:**
```bash
npm run lint:fix && npm run format
```

---

## Important notes

- GIN trigram indexes (`pg_trgm`) used in job search and text similarity queries are NOT created by Drizzle Kit automatically. The migration SQL must include:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX CONCURRENTLY IF NOT EXISTS "JobPosting_title_trgm_idx" ON "JobPosting" USING gin (title gin_trgm_ops);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS "JobPosting_description_trgm_idx" ON "JobPosting" USING gin (description gin_trgm_ops);
  ```
  These should be added to the first generated migration SQL file before running `migrate`.

- All existing PostgreSQL tables retain their original PascalCase names — no data migration needed. The Drizzle schema uses the same SQL table names as Prisma did.

---

## Open questions / blockers

None.
