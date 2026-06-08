CREATE INDEX "Application_seekerId_createdAt_idx" ON "Application" USING btree ("seekerId","createdAt");--> statement-breakpoint
ALTER TABLE "JobPosting" DROP COLUMN "whatWeTeach";