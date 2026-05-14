# Handoff — Shefa Job Board

## Current phase

**Phase 8 (polish) — in progress**

---

## Overall build status

| Phase | What | Status |
|-------|------|--------|
| 1 | Foundation | ✅ Done |
| 2 | Auth + base User | ✅ Done |
| 3 | Profiles | ✅ Backend + signup UI + edit pages done |
| 4 | Job postings | ✅ Backend + core UI + job edit page done |
| 5 | Applications + messaging | ✅ Full backend + full messaging UI done |
| 6 | Freshness system | ✅ Done |
| 7 | Notifications + responsiveness | ✅ Done |
| 8 | Polish + ship | 🔄 In progress |

---

## What was completed this session

### Production infrastructure prep (Phase 8)

**PostGIS removed** — replaced with Haversine math:
- `src/server/api/routers/jobPosting.ts`: replaced `ST_DWithin` / `ST_Distance` raw SQL with a Haversine subquery (`3959 * acos(LEAST(1, GREATEST(-1, ...)))` in miles)
- `docker-compose.yml`: image changed from `postgis/postgis:16-3.5-alpine` → `postgres:16-alpine`
- All 10 old migrations deleted; replaced with a single `prisma/migrations/0_init/migration.sql` (no PostGIS anywhere)

**New files:**
- `env.production.example` — production env vars with comments (Neon, Upstash, Resend, Google, Railway)
- `vercel.json` — overrides Vercel build command: `prisma generate && prisma migrate deploy && next build --turbopack`
- `README.md` — full project README for GitHub

**Docs updated:**
- `PROJECT_SPEC.md` — "Hosting (later)" → confirmed targets (Vercel + Neon + Upstash + Railway + Resend)
- `CLAUDE.md` — project summary updated to include deployment targets and correct Docker image
- `HANDOFF.md` — this file

**Nothing changed:**
- `src/server/jobs/redis.ts` — already reads `REDIS_URL ?? "redis://localhost:6379"` ✅
- `src/server/jobs/worker.ts` — already imports `dotenv/config` and has no hard-coded URLs ✅
- `prisma/schema.prisma` — datasource already uses `env("DATABASE_URL")` with no `directUrl` ✅
- `package.json` — `npm run worker` script already exists ✅

---

## ⚠️ Commands to run before resuming development

The migrations were flattened — the local DB is now out of sync. Run these in order:

```bash
# 1. Tear down the old PostGIS container and its volume
docker-compose down -v

# 2. Start fresh with the standard postgres:16-alpine image
docker-compose up -d

# 3. Apply the single flattened migration
npx prisma migrate dev --name init

# 4. Re-seed geography data
npx prisma db seed
```

After these four commands, `npm run dev` and `npm run worker` should work normally.

To verify search still works: start the app, go to `/jobs`, type a keyword — results should appear. Try the radius filter to verify Haversine distance works.

---

## Deployment checklist (before going live)

- [ ] Create Neon project, get pooled `DATABASE_URL`
- [ ] Create Upstash Redis database, get `REDIS_URL`
- [ ] Verify Resend sender domain (`noreply@shefa.jobs`) — must be DNS-verified
- [ ] Create Google OAuth credentials with production redirect URI
- [ ] Set all vars from `env.production.example` in Vercel project settings
- [ ] Create Railway worker service, set `npm run worker` as start command, add same env vars
- [ ] Push to GitHub → Vercel auto-deploys, Railway auto-deploys
- [ ] After first Vercel deploy: `prisma db seed` via Railway or a one-off script to seed states/cities

---

## Known UI gaps (still open)

| Gap | Notes |
|-----|-------|
| Application status controls (employer side) | Only basic buttons — no seeker profile link |
| Notification preferences UI | Procedures exist; no settings page |
| Admin profile / admin tools | No admin-facing pages at all |
| Seeker profile view link from employer applications page | Application cards don't link to seeker's public profile |
| Rate limiting | 25 applications/day / 50 cold DMs/day — deferred to Phase 8 |
| Profile completion gate | Users with a role can reach `/jobs` without completing a profile |

---

## Open questions / blockers

1. **Resend domain**: `noreply@shefa.jobs` must be DNS-verified before production emails work.
2. **Seed in production**: States/cities seed must run once after first deploy. Recommend a Railway one-off command or a protected tRPC admin procedure.
3. **Rate limiting**: 25 applications/day for seekers, 50 cold DMs/day for employers — not yet implemented.
4. **Profile completion gate**: Users with a role can reach `/jobs` without a complete profile.
