CREATE TYPE "public"."ApplicationStatus" AS ENUM('SUBMITTED', 'VIEWED', 'REJECTED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."CompanySize" AS ENUM('SIZE_1_10', 'SIZE_11_50', 'SIZE_51_200', 'SIZE_201_PLUS');--> statement-breakpoint
CREATE TYPE "public"."DayOfWeek" AS ENUM('SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT');--> statement-breakpoint
CREATE TYPE "public"."EducationLevel" AS ENUM('NONE', 'SOME_HIGH_SCHOOL', 'HIGH_SCHOOL', 'SOME_COLLEGE', 'ASSOCIATE', 'BACHELOR', 'GRADUATE');--> statement-breakpoint
CREATE TYPE "public"."Industry" AS ENUM('FOOD_SERVICE', 'RETAIL', 'HOSPITALITY', 'HEALTHCARE', 'TRADES', 'MANUFACTURING', 'OFFICE_ADMIN', 'TRANSPORTATION', 'EDUCATION', 'PERSONAL_SERVICES', 'TECHNOLOGY', 'BUSINESS', 'FINANCE', 'MARKETING', 'MEDIA', 'REAL_ESTATE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."JobClosureReason" AS ENUM('FILLED_ON_SHEFA', 'FILLED_ELSEWHERE', 'HIRING_FROZEN', 'CANCELLED', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."JobStatus" AS ENUM('ACTIVE', 'PAUSED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."JobType" AS ENUM('FULL_TIME', 'PART_TIME', 'EITHER');--> statement-breakpoint
CREATE TYPE "public"."NotificationFrequency" AS ENUM('PER_MESSAGE', 'DAILY_DIGEST', 'OFF');--> statement-breakpoint
CREATE TYPE "public"."PingResponse" AS ENUM('CONFIRMED', 'NOT_LOOKING', 'FILLED', 'PAUSED', 'NO_RESPONSE');--> statement-breakpoint
CREATE TYPE "public"."PingType" AS ENUM('SEEKER_STILL_LOOKING', 'JOB_STILL_OPEN');--> statement-breakpoint
CREATE TYPE "public"."ProfileStatus" AS ENUM('ACTIVE', 'PAUSED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."ReportStatus" AS ENUM('OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."ReportTargetType" AS ENUM('USER', 'JOB', 'MESSAGE');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('SEEKER', 'EMPLOYER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."WorkArrangement" AS ENUM('REMOTE', 'ON_SITE', 'HYBRID');--> statement-breakpoint
CREATE TABLE "City" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"stateId" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	CONSTRAINT "City_name_stateId_key" UNIQUE("name","stateId")
);
--> statement-breakpoint
CREATE TABLE "State" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbr" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	CONSTRAINT "State_name_unique" UNIQUE("name"),
	CONSTRAINT "State_abbr_unique" UNIQUE("abbr")
);
--> statement-breakpoint
CREATE TABLE "Language" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "Language_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "Account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp with time zone,
	"image" text,
	"phone" text,
	"role" "Role",
	"isAdult" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "SeekerLanguage" (
	"seekerProfileId" text NOT NULL,
	"languageId" text NOT NULL,
	CONSTRAINT "SeekerLanguage_seekerProfileId_languageId_pk" PRIMARY KEY("seekerProfileId","languageId")
);
--> statement-breakpoint
CREATE TABLE "SeekerProfile" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"workAuthorization" boolean NOT NULL,
	"availableDays" "DayOfWeek"[] NOT NULL,
	"jobSeekText" varchar(1000) NOT NULL,
	"educationLevel" "EducationLevel",
	"about" varchar(1000),
	"resumeUrl" text,
	"status" "ProfileStatus" DEFAULT 'ACTIVE' NOT NULL,
	"lastVerifiedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "SeekerProfile_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "Company" (
	"id" text PRIMARY KEY NOT NULL,
	"ownerId" text NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"website" text,
	"industry" "Industry",
	"companySize" "CompanySize",
	"aboutCompany" varchar(2000),
	"missionText" varchar(1000),
	CONSTRAINT "Company_ownerId_name_key" UNIQUE("ownerId","name")
);
--> statement-breakpoint
CREATE TABLE "EmployerProfile" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"roleAtCompany" varchar(200),
	"status" "ProfileStatus" DEFAULT 'ACTIVE' NOT NULL,
	"isResponsive" boolean DEFAULT false NOT NULL,
	"responsivenessUpdatedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "EmployerProfile_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "JobLanguage" (
	"jobId" text NOT NULL,
	"languageId" text NOT NULL,
	CONSTRAINT "JobLanguage_jobId_languageId_pk" PRIMARY KEY("jobId","languageId")
);
--> statement-breakpoint
CREATE TABLE "JobPosting" (
	"id" text PRIMARY KEY NOT NULL,
	"employerId" text NOT NULL,
	"companyId" text NOT NULL,
	"title" text NOT NULL,
	"description" varchar(5000) NOT NULL,
	"jobType" "JobType" NOT NULL,
	"workArrangement" "WorkArrangement" NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"minHourlyRate" numeric(8, 2) NOT NULL,
	"payNotes" text,
	"workDays" "DayOfWeek"[] NOT NULL,
	"scheduleNotes" text,
	"workAuthRequired" boolean NOT NULL,
	"whatWeTeach" varchar(1000),
	"whatWereLookingFor" varchar(1000),
	"status" "JobStatus" DEFAULT 'ACTIVE' NOT NULL,
	"closureReason" "JobClosureReason",
	"closedAt" timestamp with time zone,
	"lastVerifiedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Application" (
	"id" text PRIMARY KEY NOT NULL,
	"seekerId" text NOT NULL,
	"jobId" text NOT NULL,
	"message" varchar(500),
	"status" "ApplicationStatus" DEFAULT 'SUBMITTED' NOT NULL,
	"closedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Application_seekerId_jobId_key" UNIQUE("seekerId","jobId")
);
--> statement-breakpoint
CREATE TABLE "Conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"seekerId" text NOT NULL,
	"employerId" text NOT NULL,
	"jobId" text,
	"lastMessageAt" timestamp with time zone,
	"lastMessagePreview" varchar(80),
	"seekerBlocked" boolean DEFAULT false NOT NULL,
	"employerBlocked" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Conversation_seekerId_employerId_jobId_key" UNIQUE("seekerId","employerId","jobId")
);
--> statement-breakpoint
CREATE TABLE "Message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversationId" text NOT NULL,
	"senderId" text NOT NULL,
	"body" varchar(5000) NOT NULL,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FreshnessToken" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"targetType" text NOT NULL,
	"targetId" text NOT NULL,
	"action" "PingResponse" NOT NULL,
	"pingId" text,
	"expiresAt" timestamp with time zone NOT NULL,
	"usedAt" timestamp with time zone,
	CONSTRAINT "FreshnessToken_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "VerificationPing" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "PingType" NOT NULL,
	"sentAt" timestamp with time zone DEFAULT now() NOT NULL,
	"respondedAt" timestamp with time zone,
	"response" "PingResponse",
	"userId" text,
	"seekerProfileId" text,
	"jobId" text
);
--> statement-breakpoint
CREATE TABLE "NotificationPreferences" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"messageNotifications" "NotificationFrequency" DEFAULT 'PER_MESSAGE' NOT NULL,
	"applicationNotifications" "NotificationFrequency" DEFAULT 'PER_MESSAGE' NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "NotificationPreferences_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "Report" (
	"id" text PRIMARY KEY NOT NULL,
	"reporterId" text NOT NULL,
	"targetType" "ReportTargetType" NOT NULL,
	"targetId" text NOT NULL,
	"reason" text NOT NULL,
	"status" "ReportStatus" DEFAULT 'OPEN' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "City" ADD CONSTRAINT "City_stateId_State_id_fk" FOREIGN KEY ("stateId") REFERENCES "public"."State"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SeekerLanguage" ADD CONSTRAINT "SeekerLanguage_seekerProfileId_SeekerProfile_id_fk" FOREIGN KEY ("seekerProfileId") REFERENCES "public"."SeekerProfile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SeekerLanguage" ADD CONSTRAINT "SeekerLanguage_languageId_Language_id_fk" FOREIGN KEY ("languageId") REFERENCES "public"."Language"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SeekerProfile" ADD CONSTRAINT "SeekerProfile_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "EmployerProfile" ADD CONSTRAINT "EmployerProfile_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "JobLanguage" ADD CONSTRAINT "JobLanguage_jobId_JobPosting_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."JobPosting"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "JobLanguage" ADD CONSTRAINT "JobLanguage_languageId_Language_id_fk" FOREIGN KEY ("languageId") REFERENCES "public"."Language"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_employerId_User_id_fk" FOREIGN KEY ("employerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Application" ADD CONSTRAINT "Application_seekerId_User_id_fk" FOREIGN KEY ("seekerId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_JobPosting_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."JobPosting"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_seekerId_User_id_fk" FOREIGN KEY ("seekerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_employerId_User_id_fk" FOREIGN KEY ("employerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_jobId_JobPosting_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."JobPosting"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_Conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_User_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FreshnessToken" ADD CONSTRAINT "FreshnessToken_pingId_VerificationPing_id_fk" FOREIGN KEY ("pingId") REFERENCES "public"."VerificationPing"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VerificationPing" ADD CONSTRAINT "VerificationPing_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VerificationPing" ADD CONSTRAINT "VerificationPing_seekerProfileId_SeekerProfile_id_fk" FOREIGN KEY ("seekerProfileId") REFERENCES "public"."SeekerProfile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VerificationPing" ADD CONSTRAINT "VerificationPing_jobId_JobPosting_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."JobPosting"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_User_id_fk" FOREIGN KEY ("reporterId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "City_stateId_idx" ON "City" USING btree ("stateId");--> statement-breakpoint
CREATE INDEX "Account_userId_idx" ON "Account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Session_userId_idx" ON "Session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "User_role_idx" ON "User" USING btree ("role");--> statement-breakpoint
CREATE INDEX "SeekerProfile_status_idx" ON "SeekerProfile" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Company_ownerId_idx" ON "Company" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "EmployerProfile_status_idx" ON "EmployerProfile" USING btree ("status");--> statement-breakpoint
CREATE INDEX "JobPosting_status_idx" ON "JobPosting" USING btree ("status");--> statement-breakpoint
CREATE INDEX "JobPosting_employerId_status_createdAt_idx" ON "JobPosting" USING btree ("employerId","status","createdAt");--> statement-breakpoint
CREATE INDEX "JobPosting_status_jobType_idx" ON "JobPosting" USING btree ("status","jobType");--> statement-breakpoint
CREATE INDEX "JobPosting_status_workArrangement_idx" ON "JobPosting" USING btree ("status","workArrangement");--> statement-breakpoint
CREATE INDEX "JobPosting_status_createdAt_idx" ON "JobPosting" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "JobPosting_employerId_idx" ON "JobPosting" USING btree ("employerId");--> statement-breakpoint
CREATE INDEX "JobPosting_companyId_idx" ON "JobPosting" USING btree ("companyId");--> statement-breakpoint
CREATE INDEX "JobPosting_lat_lon_idx" ON "JobPosting" USING btree ("lat","lon");--> statement-breakpoint
CREATE INDEX "JobPosting_closedAt_idx" ON "JobPosting" USING btree ("closedAt");--> statement-breakpoint
CREATE INDEX "Application_jobId_createdAt_idx" ON "Application" USING btree ("jobId","createdAt");--> statement-breakpoint
CREATE INDEX "Application_jobId_idx" ON "Application" USING btree ("jobId");--> statement-breakpoint
CREATE INDEX "Application_status_idx" ON "Application" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Conversation_seekerId_idx" ON "Conversation" USING btree ("seekerId");--> statement-breakpoint
CREATE INDEX "Conversation_employerId_idx" ON "Conversation" USING btree ("employerId");--> statement-breakpoint
CREATE INDEX "Conversation_seekerId_lastMessageAt_idx" ON "Conversation" USING btree ("seekerId","lastMessageAt");--> statement-breakpoint
CREATE INDEX "Conversation_employerId_lastMessageAt_idx" ON "Conversation" USING btree ("employerId","lastMessageAt");--> statement-breakpoint
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation" USING btree ("lastMessageAt");--> statement-breakpoint
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message" USING btree ("conversationId","createdAt");--> statement-breakpoint
CREATE INDEX "Message_conversationId_readAt_idx" ON "Message" USING btree ("conversationId","readAt");--> statement-breakpoint
CREATE INDEX "FreshnessToken_targetType_targetId_idx" ON "FreshnessToken" USING btree ("targetType","targetId");--> statement-breakpoint
CREATE INDEX "FreshnessToken_expiresAt_idx" ON "FreshnessToken" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "VerificationPing_userId_idx" ON "VerificationPing" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "VerificationPing_jobId_idx" ON "VerificationPing" USING btree ("jobId");--> statement-breakpoint
CREATE INDEX "Report_status_idx" ON "Report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Report_targetType_targetId_idx" ON "Report" USING btree ("targetType","targetId");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "JobPosting_title_trgm_idx" ON "JobPosting" USING gin (title gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "JobPosting_description_trgm_idx" ON "JobPosting" USING gin (description gin_trgm_ops);