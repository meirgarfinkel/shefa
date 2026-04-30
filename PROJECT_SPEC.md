# Charity Job Board (Shefa) — Project Spec

## Mission

A charity-based job board where employers give unqualified candidates a chance to learn on the job. Free for both sides. Nonprofit. No payments anywhere in the system. The platform's core promise: fresh, real listings — no ghost jobs, no ghost candidates.

## Stack (locked in)

- **Frontend + Backend**: Next.js (App Router) with TypeScript
- **API layer**: tRPC
- **Database**: PostgreSQL
- **ORM**: Prisma 6 (`prisma-client-js`, standard output — no driver adapter, `DATABASE_URL` via datasource block)
- **Auth**: Auth.js (NextAuth) with email magic links via Resend
- **Background jobs**: BullMQ + Redis
- **Email**: Resend
- **Validation**: Zod
- **UI**: Tailwind + shadcn/ui
- **Local dev**: Docker Compose for Postgres + Redis
- **Linting/formatting**: ESLint (next config) + Prettier with Tailwind plugin. Husky + lint-staged for pre-commit hooks.
- **Mobile (later, not now)**: React Native, sharing the same tRPC API

## Hosting (later)

Vercel (Next.js) + Neon or Supabase (Postgres) + Upstash (Redis) — chosen for nonprofit-friendly pricing.

---

## Data Model

### User

Base account. Fields: id, email (verified), phone (collected, unverified), auth method, role (SEEKER / EMPLOYER / ADMIN), isAdult (boolean, default false — set to true when profile is created after user confirms age ≥ 18), createdAt, updatedAt, lastLoginAt.

### SeekerProfile (1:1 with User)

**Required at signup:**

- First name, last name
- City, state, zip (no street address)
- Work authorization (yes/no)
- Available days (multi-select Sun–Sat)
- Skills (multi-select from curated list)
- "Type of job you seek + what you want to learn" (free text, max 1000 chars)

**Optional / encouraged later:**

- Max education level (dropdown: none / some high school / high school / some college / associate / bachelor / graduate)
- Languages (multi-select from curated list + "other languages" free text)
- Other skills (comma-separated free text)
- About yourself (free text, max 1000 chars)
- Resume (PDF upload, optional)

**System fields:**

- isResponsive (boolean, computed every 48h)
- responseRate, medianResponseHours (private, computed)
- status (ACTIVE / PAUSED — paused = hidden from employer search)
- lastVerifiedAt (drives freshness pings)

### EmployerProfile (1:1 with User)

**Required at signup:**

- First name, last name (the contact human)
- Company name
- Company size (1–10 / 11–50 / 51–200 / 201+)
- City, state, zip

**Optional:**

- Role at company (free text)
- Industry (dropdown, ~10–12 buckets — see below)
- Website
- About the company (free text, max 2000 chars)
- "Why we want to give people a chance" / mission alignment (free text, max 1000 chars)

**System fields:** same as seeker (isResponsive, status, lastVerifiedAt, etc.)

### Industry list (employer profile)

Food Service / Retail / Hospitality / Healthcare / Trades / Manufacturing / Office & Admin / Transportation / Education / Personal Services / Technology / Business / Finance / Marketing / Media / Real Estate / Other

### JobPosting (many-to-one with EmployerProfile)

- Title, description (max 5000 chars)
- Job type (full-time / part-time / either)
- Work arrangement (remote / on-site / hybrid)
- Location: city, state, zip (defaults from employer, editable per job)
- Minimum hourly rate (number, required)
- Pay notes (optional free text — for "based on experience," raises, etc.)
- Work days (multi-select Sun–Sat)
- Schedule notes (optional free text — for nuance like "evenings only," "5am start")
- Preferred skills (multi-select — note: NO required skills, only preferred, by design)
- Required languages (multi-select)
- Work authorization required (yes/no)
- "What we'll teach you" (free text, max 1000 chars)
- "What we're really looking for" (free text, max 1000 chars)
- **System fields**: status (DRAFT / ACTIVE / PAUSED / EXPIRED / FILLED / CLOSED), createdAt, updatedAt, lastVerifiedAt, viewCount, applicationCount, postedBy (FK to User)

**Note**: Education is NOT on the job posting. Seekers fill in their education on their profile; employers can see it but cannot filter on it. By design.

### Application (seeker → job)

- seekerId, jobId
- Application message (optional, max 500 chars)
- Status (SUBMITTED / VIEWED / RESPONDED / CLOSED)
- createdAt, updatedAt

### Conversation

- participantAId, participantBId
- jobId (nullable — present if conversation arose from an application or about a specific job)
- initiatedBy
- lastMessageAt, lastMessagePreview (denormalized for inbox, preview truncated to 100 chars)
- aBlockedB, bBlockedA (booleans)
- createdAt

**Creation rules** (enforced by `conversation.create`):

- Employers can start a conversation with any seeker whose profile is `ACTIVE`, with or without a `jobId`.
- Seekers must provide a `jobId` and must have an existing `Application` for that specific job. The conversation is linked to that job.
- Calling `create` with the same participant pair and the same `jobId` returns the existing conversation (idempotent — no duplicate threads).
- A conversation between the same two users for a _different_ job creates a new, separate conversation.

### Message

- conversationId, senderId, body (max 5000 chars), readAt (nullable), createdAt

### VerificationPing (drives freshness)

- userId or jobId, type (SEEKER_STILL_LOOKING / JOB_STILL_OPEN), sentAt, respondedAt, response (CONFIRMED / NOT_LOOKING / FILLED / PAUSED / NO_RESPONSE)

### VerificationToken

- token (signed JWT or random string), targetType, targetId, expiresAt (30 days), usedAt

### Skill (curated taxonomy)

- name, category (optional, nullable for v1), createdAt

### Language (curated taxonomy)

- name, createdAt

### NotificationPreferences (1:1 with User)

- messageNotifications (PER_MESSAGE / DAILY_DIGEST / OFF) — default PER_MESSAGE
- applicationNotifications (same enum) — default PER_MESSAGE
- verificationEmails (always on, no opt-out)

### Report / Flag (abuse handling)

- reporterId, targetType (USER / JOB / MESSAGE), targetId, reason (max 2000 chars), status (OPEN / REVIEWED / ACTIONED / DISMISSED), createdAt
- Self-reporting is rejected at the API level (`BAD_REQUEST`)

---

## Key Behaviors

### Freshness / verification system

- Day 0: Listing/profile created or last verified
- Day 14: Verification email sent — "Are you still looking?" / "Is this job still open?" with one-click action buttons (signed token in URL, no login required)
- Day 20: If no response, warning email — "Will be paused in 8 days unless confirmed"
- Day 28: If still no response, status changes to PAUSED. Hidden from search, can't be applied to / messaged about. Existing conversations remain functional.
- **Never auto-deleted.** User can log in anytime and reactivate paused listings/profile, indefinitely.
- Verification tokens expire 30 days after sending. After expiry, link goes to login page with reactivation pre-loaded.
- Pause-for-30-days option included in verification emails for users on vacation/break.

### Messaging

- Async only (no real-time chat for v1).
- **Hybrid initiation**: employers can cold-DM any seeker with an active profile; seekers can only start a conversation by providing a `jobId` they have applied to, which links the conversation to that job. Both parties can send freely once a conversation exists.
- Either participant's block flag (`aBlockedB` / `bBlockedA`) prevents all messaging in that thread — both directions.
- Read receipts: yes (`readAt` timestamp on each message, set via `conversation.markRead`).
- Plain text only, max 5000 chars/message. No attachments for v1.
- Block + report available on every conversation. Report targets: USER, JOB, MESSAGE.
- Inbox sorted by `lastMessageAt` desc. No search for v1.

### Notifications (email)

- **12-minute debounced batching per conversation**: when a message arrives, schedule notification email 12 min from now. New message in same conversation cancels and reschedules. Active conversations naturally batch.
- Same pattern for application notifications to employers.
- User settings: PER_MESSAGE (default) / DAILY_DIGEST / OFF.

### Responsiveness badge

- Boolean `isResponsive` on both seeker and employer profiles.
- Computed every 48 hours by background job.
- Threshold (v1, tunable): replies to ≥70% of conversations within 72-hour median.
- New accounts (<5 conversations) show "New" pill, not negative state.
- Underlying numbers (responseRate, medianResponseHours) computed and stored but not shown publicly.

### Rate limiting

- Seekers: max 25 applications/day.
- Employers: max 50 cold DMs/day.
- New accounts (first 7 days, <3 verified actions): tighter limits.
- No per-message limit within an existing conversation.

### Auth

- Email magic links via Resend (Auth.js).
- Email verification baked into magic link flow.
- Phone numbers collected at signup but not verified (deferred for SMS cost reasons).
- JWT session strategy (not database) so middleware can verify auth in the Edge runtime without a DB call.
- All route-level auth redirects live exclusively in `src/middleware.ts`. Page components never redirect based on auth state. See CLAUDE.md "Routing and auth guards" for the full rules.

### Routing conventions

**Public routes** (no auth required) use the entity's `profileId` as the URL segment:

| Route | Segment | ID type |
|-------|---------|---------|
| `/employer/[profileId]` | `profileId` | `EmployerProfile.id` |
| `/seeker/[profileId]` | `profileId` | `SeekerProfile.id` |
| `/jobs/[id]` | `id` | `JobPosting.id` |

**Private routes** (auth required) use stable, non-parameterized paths. Ownership is established via `userId` from the JWT session — never from the URL:

| Route | Who |
|-------|-----|
| `/employer/profile` | Authenticated employer (own profile) |
| `/employer/dashboard` | Authenticated employer |
| `/employer/jobs/[id]` | Authenticated employer (job by posting ID) |
| `/seeker/profile` | Authenticated seeker (own profile) |
| `/seeker/applications` | Authenticated seeker |

**Hard rules:**

- `userId` is **never** exposed in a URL — not as a route segment, not as a query parameter.
- tRPC procedures never accept `userId` as input. The caller's identity comes exclusively from `ctx.user.id` (session). For targeting another user, procedures accept a `profileId` and resolve the `userId` internally.
- All auth-based redirects live in `src/middleware.ts`. Adding a new protected route means updating `EMPLOYER_ONLY_PREFIXES` or `SEEKER_ONLY_PREFIXES` there — never adding a client-side guard.

---

## Out of scope for v1 (deferred to v2+)

- Mobile apps (React Native)
- SMS notifications and SMS verification
- Real-time messaging / WebSockets
- File attachments in messages
- User-extensible skills taxonomy (admin-managed for now)
- Profile photos / company logos
- Inbox search
- Cross-conversation digest emails (only daily digest as a setting)
- Payment / monetization (intentionally never)

---

## Build Plan (8 phases)

1. **Foundation**: Next.js + TS + Prisma + Postgres + tRPC + Tailwind + shadcn/ui + Docker Compose. Empty app that runs. ✅
2. **Auth + base User**: Auth.js magic links via Resend, role selection, protected routes. ✅
3. **Profiles**: Seeker + Employer profile schemas, signup flows (lean), profile completion pages, skill/language seed + multi-select. ✅ backend + signup UI; ⚠️ missing: profile view/edit pages.
4. **Job postings**: CRUD, post-a-job flow, public listings, search/filter, job detail page. ✅ backend + core UI; ⚠️ missing: job edit page, publish/pause/close/fill status controls.
5. **Applications + messaging**: apply flow, conversations + messages, inbox, read receipts, block/report, cold DM flow. ✅ full backend (tRPC routers: application, conversation, message, report); ⚠️ missing: inbox UI, conversation UI, employer cold-DM UI, profile view pages needed to navigate to messaging.
6. **Freshness system**: BullMQ + Redis, daily ping scheduler, email templates, signed verification tokens, auto-pause logic, reactivation UX. ✅
7. **Notifications + responsiveness**: NotificationPreferences, 12-min debounced jobs, daily digest, responsiveness computation job, badge display. ✅
8. **Polish + abuse + ship**: rate limiting, admin dashboard for flags, basic admin tools, error handling, deploy. ⬜

Ship target after Phase 8. Each phase is shippable on its own and committed to git separately.
