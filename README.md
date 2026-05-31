# Shefa — Charity Job Board

A nonprofit job board where employers give unqualified candidates a real chance to learn on the job. Free for everyone. No ghost jobs. No ghost candidates.

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **API**: tRPC
- **Database**: PostgreSQL (Neon in production, Docker locally)
- **ORM**: Drizzle (`drizzle-orm` + `@neondatabase/serverless`)
- **Auth**: Auth.js v5 — Google OAuth only
- **Background jobs**: Vercel Cron API routes (`src/app/api/cron/`)
- **Email**: Resend
- **UI**: Tailwind 4 + shadcn/ui

## Local development

**Prerequisites**: Docker, Node.js 20+

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install dependencies
npm install

# 3. Copy env template and fill in values
cp .env.example .env.local
# Edit .env.local — DATABASE_URL works as-is for Docker

# 4. Apply the database schema
npm run db:migrate

# 5. Seed geography + taxonomy data
npm run db:seed

# 6. Start the web app
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Production deployment

See `.env.example` for all required environment variables and `env.production.example` for production-specific notes.

### Vercel (web app + cron jobs)

1. Connect the GitHub repo to Vercel.
2. Set all variables from `env.production.example` in the Vercel project settings.
3. Vercel Cron schedules are configured in `vercel.json`.

### Neon (database)

1. Create a Neon project.
2. Use the pooled connection string as `DATABASE_URL` (must include `?sslmode=require`).

## Project structure

```
src/
  app/                  Next.js App Router pages
    api/cron/           Vercel Cron background jobs
  server/
    api/routers/        tRPC routers
    emails/             Resend email templates
  lib/schemas/          Shared Zod schemas
  components/           React components
  db/
    schema/             Drizzle schema files
    scripts/            Seed + migration scripts
drizzle/
  migrations/           Drizzle migration files
```

## License

All rights reserved.
