ALTER TYPE "public"."ProfileStatus" ADD VALUE 'DELETED';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "deletedAt" timestamp with time zone;