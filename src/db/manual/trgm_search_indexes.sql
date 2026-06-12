-- Manual search indexes — NOT managed by drizzle-kit.
--
-- drizzle's schema DSL cannot express `gin_trgm_ops`, so these trigram indexes
-- (used by the job-search ILIKE / similarity queries in
-- src/server/api/routers/jobPosting.ts) are kept here and applied by hand after
-- every `drizzle-kit migrate` against a fresh database.
--
-- Idempotent: safe to run repeatedly.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "JobPosting_title_trgm_idx"
  ON "JobPosting" USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "JobPosting_description_trgm_idx"
  ON "JobPosting" USING gin (description gin_trgm_ops);
