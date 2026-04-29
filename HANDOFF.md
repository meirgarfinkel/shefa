# Handoff — Shefa Job Board

## Current phase

**Phase 7 — Notifications + Responsiveness (in progress)**

---

## Phase 7 steps and status

| # | Step | Status |
|---|------|--------|
| 1 | `NotificationPreferences` tRPC CRUD (get/update) | ✅ Done |
| 2 | 12-minute debounced message notification job (BullMQ) | ⬜ Next |
| 3 | Daily digest aggregation job | ⬜ Todo |
| 4 | Responsiveness computation job (every 48h) | ⬜ Todo |
| 5 | Responsiveness badge display on profile pages | ⬜ Todo |

---

## What was completed this session

### Prisma migration: Prisma 7 → Prisma 6 + split config enforcement

**Problem fixed**: The project was using Prisma 7's `prisma-client` provider with a custom output path (`src/generated/prisma`). CLAUDE.md requires the standard `prisma-client-js` provider with no custom output. Additionally, `auth.config.ts` was importing from the generated Prisma client, violating the zero-Prisma-imports rule for Edge-safe files.

**Files changed:**

| File | Change |
|------|--------|
| `package.json` | Removed `@prisma/adapter-pg`, downgraded `prisma` + `@prisma/client` to `^6.0.0` |
| `prisma/schema.prisma` | Changed generator to `prisma-client-js` (no custom output), added `url = env("DATABASE_URL")` to datasource |
| `src/lib/prisma.ts` | Removed driver adapter; plain `new PrismaClient()` |
| `src/types/role.ts` | **New file** — `Role` as a plain string union, no Prisma dependency |
| `src/auth.config.ts` | Changed `Role` import to `@/types/role` (zero Prisma imports now enforced) |
| `src/types/next-auth.d.ts` | Changed `Role` import to `@/types/role` |
| `src/server/jobs/freshness.job.ts` | Changed `PrismaClient` import to `@prisma/client` |
| `src/server/jobs/redeem.ts` | Changed `PrismaClient` import to `@prisma/client` |
| `src/server/jobs/token.ts` | Changed `PrismaClient, PingResponse` imports to `@prisma/client` |
| `src/middleware.ts` | Added Edge runtime guard comment at top |
| `src/generated/prisma/` | **Deleted** — old generated client directory, now dead code |
| `CLAUDE.md` | Updated Prisma version, adapter rule, added split config hard rules section |

---

## Commands you must run before continuing

```bash
# 1. Install — pulls Prisma 6, removes old adapter-pg
npm install

# 2. Regenerate Prisma client (now generates into node_modules/@prisma/client)
npx prisma generate

# 3. Verify everything passes
npm run check
npm test
```

After these three commands, the project should typecheck clean and all tests should pass.

---

## What's next

**Phase 7 Step 2 — 12-minute debounced message notification job**

Requires building:
1. A `message` tRPC router with a `send` procedure (the trigger for the notification)
2. The BullMQ job queue/handler for message notifications
3. The email template for message notifications

Design (unchanged from previous handoff):
- Job key: `msg-notify:{conversationId}` — deterministic, allows cancel-and-reschedule
- Respects `NotificationPreferences.messageNotifications`: `OFF`/`DAILY_DIGEST` → skip, `PER_MESSAGE` → send
- Delay: 12 minutes from last message in conversation

---

## Open questions / blockers

1. **Resend domain**: `noreply@shefa.jobs` must be verified before production emails work.
2. **Worker process management in prod**: Vercel doesn't support long-lived processes. Use Render / Railway / Fly.io background worker for BullMQ. Plan before Phase 8.
3. **Profile completion gate**: Users with a role can reach `/jobs` without completing a profile — intentional, enforce in Phase 8.
4. **No nav link to `/seeker/applications`**: Still missing — add in Phase 8 polish.
5. **Phase 5 messaging gap**: `Conversation` and `Message` models exist in the schema but no tRPC router handles them yet. Phase 7 Step 2 will add the minimal `message.send` procedure needed to trigger notifications; the full inbox/conversation UI is a separate gap to address.
