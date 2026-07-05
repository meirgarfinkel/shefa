ALTER TABLE "State" DROP CONSTRAINT "State_name_unique";--> statement-breakpoint
ALTER TABLE "State" DROP CONSTRAINT "State_abbr_unique";--> statement-breakpoint
ALTER TABLE "State" ADD COLUMN "country" text DEFAULT 'US' NOT NULL;--> statement-breakpoint
ALTER TABLE "SeekerProfile" ADD COLUMN "country" text DEFAULT 'US' NOT NULL;--> statement-breakpoint
ALTER TABLE "Business" ADD COLUMN "country" text DEFAULT 'US' NOT NULL;--> statement-breakpoint
ALTER TABLE "JobPosting" ADD COLUMN "country" text DEFAULT 'US' NOT NULL;--> statement-breakpoint
CREATE INDEX "State_country_idx" ON "State" USING btree ("country");--> statement-breakpoint
ALTER TABLE "State" ADD CONSTRAINT "State_country_abbr_key" UNIQUE("country","abbr");--> statement-breakpoint
ALTER TABLE "State" ADD CONSTRAINT "State_country_name_key" UNIQUE("country","name");