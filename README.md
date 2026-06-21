# Shefa: Nonprofit Job Board

A nonprofit job board where employers give unqualified candidates a real chance to learn on the job. Free for everyone. No ghost jobs. No ghost candidates.

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript (strict)
- **API**: tRPC v11
- **Database**: PostgreSQL on Neon (separate dev/production branches)
- **ORM**: Drizzle (`drizzle-orm` + `@neondatabase/serverless`)
- **Validation**: Zod v4 (shared schemas in `src/lib/schemas/`)
- **Auth**: Auth.js v5 (`next-auth@beta`) — Google OAuth only, JWT sessions
- **Background jobs**: Vercel Cron API routes (`src/app/api/cron/`)
- **Email**: Resend
- **UI**: React 19 + Tailwind 4 + shadcn/ui (Radix)

## Local development

**Prerequisites**: Node.js 20+ and a [Neon](https://neon.tech) account.

The database is Neon in every environment — there is no local db
Develop against a Neon **dev branch** so your schema changes and seed data stay
isolated from production.

```bash
# 1. Install dependencies
npm install

# 2. Create a Neon dev branch and copy its pooled connection string,
#    then fill in env values
cp .env.example .env
# Edit .env — set DATABASE_URL to your Neon dev branch (include ?sslmode=require),
# plus the auth/email keys

# 3. Apply existing migrations to the dev branch
npm run db:dev-migrate

# 4. Seed geography + taxonomy data
npm run db:seed

# 5. Start the web app
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

> The `db:dev-*` and `db:seed` scripts load `.env` (not `.env.local`). After
> editing files in `src/db/schema/`, regenerate and apply migrations with
> `npm run db:dev-generate` then `npm run db:dev-migrate`. Optionally seed sample
> jobs with `npm run db:seed:jobs`.

Run `npm run check` (typecheck + lint + format) before considering work done;
`npm test` runs the Vitest suite.

## Production deployment

See `.env.example` for all required environment variables and `env.production.example` for production-specific notes.

### Vercel (web app + cron jobs)

1. Connect the GitHub repo to Vercel.
2. Set all variables from `env.production.example` in the Vercel project settings.
3. Vercel Cron schedules are configured in `vercel.json`. Each cron route requires
   `Authorization: Bearer <CRON_SECRET>` (Vercel-injected):

   | Route                      | Schedule             | Purpose                                 |
   | -------------------------- | -------------------- | --------------------------------------- |
   | `/api/cron/freshness`      | Daily 9am UTC        | Freshness pings, escalation, auto-pause |
   | `/api/cron/responsiveness` | Every 2 days 3am UTC | Recompute employer responsiveness       |
   | `/api/cron/digest`         | Daily 6pm UTC        | Daily digest emails                     |

### Neon (database)

1. Create a Neon project. Use the **production branch** for the deployed app and a
   separate **dev branch** for local development.
2. Use the branch's pooled connection string as `DATABASE_URL` (must include
   `?sslmode=require`). Production migrations run with `npm run db:prod-migrate`
   (loads `.env.production`).

## Project structure

```
src/
  app/                  Next.js App Router pages
    api/cron/           Vercel Cron background jobs (freshness, responsiveness, digest)
  server/
    api/routers/        tRPC routers (one per entity)
    jobs/               Cron job logic + freshness token helpers
    emails/             Resend email composition
  lib/
    schemas/            Shared Zod input schemas
    constants/          Enum → label maps (labels.ts)
  components/           React components (ui/ holds shadcn primitives)
  db/
    schema/             Drizzle schema files (canonical contract; enums.ts)
    scripts/            seed.ts + seed-jobs.ts
drizzle/                Generated SQL migrations + meta
```

See `PROJECT_SPEC.md` for the full data model, domain rules, and architecture,
and `CLAUDE.md` for engineering conventions.

## License

All rights reserved.
