-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable: add geocoded coordinates to job postings
ALTER TABLE "JobPosting" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "JobPosting" ADD COLUMN "lon" DOUBLE PRECISION;

-- Partial spatial index: only index rows that have been geocoded
CREATE INDEX "JobPosting_location_gist_idx" ON "JobPosting" USING GIST (
  (ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography)
) WHERE lat IS NOT NULL AND lon IS NOT NULL;
