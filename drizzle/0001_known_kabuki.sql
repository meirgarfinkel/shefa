ALTER TABLE "VerificationPing" DROP CONSTRAINT "VerificationPing_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "VerificationPing" DROP CONSTRAINT "VerificationPing_seekerProfileId_SeekerProfile_id_fk";
--> statement-breakpoint
ALTER TABLE "FreshnessToken" ALTER COLUMN "action" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "VerificationPing" ALTER COLUMN "response" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."PingResponse";--> statement-breakpoint
CREATE TYPE "public"."PingResponse" AS ENUM('CONFIRMED', 'FILLED', 'PAUSED', 'NO_RESPONSE');--> statement-breakpoint
ALTER TABLE "FreshnessToken" ALTER COLUMN "action" SET DATA TYPE "public"."PingResponse" USING "action"::"public"."PingResponse";--> statement-breakpoint
ALTER TABLE "VerificationPing" ALTER COLUMN "response" SET DATA TYPE "public"."PingResponse" USING "response"::"public"."PingResponse";--> statement-breakpoint
ALTER TABLE "VerificationPing" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."PingType";--> statement-breakpoint
CREATE TYPE "public"."PingType" AS ENUM('JOB_STILL_OPEN');--> statement-breakpoint
ALTER TABLE "VerificationPing" ALTER COLUMN "type" SET DATA TYPE "public"."PingType" USING "type"::"public"."PingType";--> statement-breakpoint
DROP INDEX "VerificationPing_userId_idx";--> statement-breakpoint
ALTER TABLE "SeekerProfile" DROP COLUMN "lastVerifiedAt";--> statement-breakpoint
ALTER TABLE "VerificationPing" DROP COLUMN "userId";--> statement-breakpoint
ALTER TABLE "VerificationPing" DROP COLUMN "seekerProfileId";