# Shefa — Charity Job Board

A nonprofit job board where employers give unqualified candidates a real chance to learn on the job. Free for everyone. No ghost jobs. No ghost candidates.

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **API**: tRPC
- **Database**: PostgreSQL (Neon in production, Docker locally)
- **ORM**: Prisma 6
- **Auth**: Auth.js v5 — Google OAuth + email magic links via Resend
- **Background jobs**: BullMQ + Redis (Upstash in production)
- **UI**: Tailwind 4 + shadcn/ui (glassmorphism design)
- **Search**: pg_trgm trigram search with Haversine distance filtering

## Local development

**Prerequisites**: Docker, Node.js 20+

```bash
# 1. Start Postgres and Redis
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Copy env template and fill in values
cp .env.example .env.local
# Edit .env.local — DATABASE_URL and REDIS_URL work as-is for Docker

# 4. Apply the database schema
npx prisma migrate dev

# 5. Seed geography data (50 states + ~600 cities)
npx prisma db seed

# 6. Start the web app
npm run dev

# 7. In a second terminal, start the background worker
npm run worker
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Production deployment

See `env.production.example` for all required environment variables.

### Vercel (web app)

1. Connect the GitHub repo to Vercel.
2. Set all variables from `env.production.example` in the Vercel project settings.
3. The build command in `vercel.json` handles `prisma generate`, `prisma migrate deploy`, and `next build` automatically.

### Neon (database)

1. Create a Neon project.
2. Use the pooled connection string as `DATABASE_URL` (must include `?sslmode=require`).

### Upstash (Redis)

1. Create an Upstash Redis database.
2. Use the ioredis-compatible URL (`rediss://:password@host:port`) as `REDIS_URL`.

### Railway (BullMQ worker)

1. Create a Railway service pointing to this repo.
2. Set start command: `npm run worker`
3. Set all env vars from `env.production.example`.

Vercel cannot host the BullMQ worker — it requires a persistent process. Railway handles this.

## Project structure

```
src/
  app/                  Next.js App Router pages
  server/
    api/routers/        tRPC routers
    jobs/               BullMQ job definitions + worker entry point
    emails/             Resend email templates
  lib/schemas/          Shared Zod schemas
  components/           React components
prisma/
  schema.prisma         Database schema
  migrations/           Single flattened migration (0_init)
  seed.ts               Geography seed data
```

## License

All rights reserved.
