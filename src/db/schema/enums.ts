import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("Role", ["SEEKER", "EMPLOYER", "ADMIN"]);
export const profileStatusEnum = pgEnum("ProfileStatus", [
  "ACTIVE",
  "PAUSED",
  "SUSPENDED",
  "DELETED",
]);
export const jobStatusEnum = pgEnum("JobStatus", ["ACTIVE", "PAUSED", "CLOSED"]);
export const jobClosureReasonEnum = pgEnum("JobClosureReason", [
  "FILLED_ON_SHEFA",
  "FILLED_ELSEWHERE",
  "HIRING_FROZEN",
  "CANCELLED",
  "OTHER",
]);
export const applicationStatusEnum = pgEnum("ApplicationStatus", [
  "SUBMITTED",
  "VIEWED",
  "REJECTED",
  "CLOSED",
]);
export const pingTypeEnum = pgEnum("PingType", ["SEEKER_STILL_LOOKING", "JOB_STILL_OPEN"]);
export const pingResponseEnum = pgEnum("PingResponse", [
  "CONFIRMED",
  "NOT_LOOKING",
  "FILLED",
  "PAUSED",
  "NO_RESPONSE",
]);
export const reportTargetTypeEnum = pgEnum("ReportTargetType", ["USER", "JOB", "MESSAGE"]);
export const reportStatusEnum = pgEnum("ReportStatus", [
  "OPEN",
  "REVIEWED",
  "ACTIONED",
  "DISMISSED",
]);
export const notificationFrequencyEnum = pgEnum("NotificationFrequency", [
  "PER_MESSAGE",
  "DAILY_DIGEST",
  "OFF",
]);
export const jobTypeEnum = pgEnum("JobType", ["FULL_TIME", "PART_TIME", "EITHER"]);
export const workArrangementEnum = pgEnum("WorkArrangement", ["REMOTE", "ON_SITE", "HYBRID"]);
export const companySizeEnum = pgEnum("CompanySize", [
  "SIZE_1_10",
  "SIZE_11_50",
  "SIZE_51_200",
  "SIZE_201_PLUS",
]);
export const educationLevelEnum = pgEnum("EducationLevel", [
  "NONE",
  "SOME_HIGH_SCHOOL",
  "HIGH_SCHOOL",
  "SOME_COLLEGE",
  "ASSOCIATE",
  "BACHELOR",
  "GRADUATE",
]);
export const industryEnum = pgEnum("Industry", [
  "FOOD_SERVICE",
  "RETAIL",
  "HOSPITALITY",
  "HEALTHCARE",
  "TRADES",
  "MANUFACTURING",
  "OFFICE_ADMIN",
  "TRANSPORTATION",
  "EDUCATION",
  "PERSONAL_SERVICES",
  "TECHNOLOGY",
  "BUSINESS",
  "FINANCE",
  "MARKETING",
  "MEDIA",
  "REAL_ESTATE",
  "OTHER",
]);
export const dayOfWeekEnum = pgEnum("DayOfWeek", ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);

export type Role = (typeof roleEnum.enumValues)[number];
export type ProfileStatus = (typeof profileStatusEnum.enumValues)[number];
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];
export type JobClosureReason = (typeof jobClosureReasonEnum.enumValues)[number];
export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];
export type PingType = (typeof pingTypeEnum.enumValues)[number];
export type PingResponse = (typeof pingResponseEnum.enumValues)[number];
export type ReportTargetType = (typeof reportTargetTypeEnum.enumValues)[number];
export type ReportStatus = (typeof reportStatusEnum.enumValues)[number];
export type NotificationFrequency = (typeof notificationFrequencyEnum.enumValues)[number];
export type JobType = (typeof jobTypeEnum.enumValues)[number];
export type WorkArrangement = (typeof workArrangementEnum.enumValues)[number];
export type CompanySize = (typeof companySizeEnum.enumValues)[number];
export type EducationLevel = (typeof educationLevelEnum.enumValues)[number];
export type Industry = (typeof industryEnum.enumValues)[number];
export type DayOfWeek = (typeof dayOfWeekEnum.enumValues)[number];
