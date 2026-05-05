-- Enable trigram extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Separate GIN indexes on title and description so the WHERE clause
-- ($1 <% title OR $1 <% COALESCE(description, '')) can use an index per branch.
-- A single combined index on (title || ' ' || description) would NOT be used by
-- the split OR conditions, so we need two indexes here.
CREATE INDEX IF NOT EXISTS "JobPosting_title_gin_idx"
  ON "JobPosting"
  USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "JobPosting_description_gin_idx"
  ON "JobPosting"
  USING GIN (COALESCE(description, '') gin_trgm_ops);
