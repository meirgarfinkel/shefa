# Project: Charity Job Board

This is a nonprofit charity-based job board built with Next.js, TypeScript, tRPC, Prisma, and PostgreSQL. Read PROJECT_SPEC.md for full context before starting any task.

## Code style
- TypeScript strict mode, always.
- Prefer explicit types on function signatures and exports; let inference handle the rest.
- Use Zod schemas for all user input and tRPC procedure inputs/outputs.
- Use Prisma for all database access. No raw SQL unless explicitly justified.
- Follow Next.js App Router conventions (server components by default, "use client" only when needed).
- shadcn/ui components for UI; Tailwind for styling. No other CSS frameworks.

## Architecture rules
- All API logic lives in tRPC routers under `src/server/api/routers/`.
- All database schema lives in `prisma/schema.prisma`.
- Background jobs (BullMQ) live under `src/server/jobs/`.
- Email templates live under `src/server/emails/`.
- Shared Zod schemas live under `src/lib/schemas/`.
- No business logic in React components — call tRPC procedures.

## What NOT to do
- Don't add new dependencies without explaining why.
- Don't suggest features that are explicitly out of scope in PROJECT_SPEC.md (mobile, SMS, real-time, file uploads in messages, etc.).
- Don't collect or expose protected characteristics (age, marital status, religion, disability, photos pre-hire) — see PROJECT_SPEC.md for what fields are intentionally excluded and why.
- Don't add education filtering on job postings — by design, education is visible but not filterable.
- Don't roll your own auth — use Auth.js.
- Don't auto-delete user data — paused, never deleted.

## Working style
- Always explain what you're about to do before doing it.
- For multi-file changes, list the files you'll touch first.
- Commit at the end of each phase with a clear message.
- When in doubt, default to the simpler / more boring solution.