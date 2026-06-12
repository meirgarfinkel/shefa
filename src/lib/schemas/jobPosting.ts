import { z } from "zod";
import { optionalTrimmedString, requiredTrimmedString } from "@/lib/utils";

const DayOfWeek = z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
type DayOfWeekValue = z.infer<typeof DayOfWeek>;
const JobType = z.enum(["FULL_TIME", "PART_TIME", "EITHER"]);
const WorkArrangement = z.enum(["REMOTE", "ON_SITE", "HYBRID"]);
export const JobStatusEnum = z.enum(["ACTIVE", "PAUSED", "CLOSED"]);
export const JobClosureReasonEnum = z.enum([
  "FILLED_ON_SHEFA",
  "FILLED_ELSEWHERE",
  "HIRING_FROZEN",
  "CANCELLED",
  "OTHER",
]);

const uniqueDaysTransform = (days: DayOfWeekValue[]) => [...new Set(days)];

const JobPostingFields = {
  title: requiredTrimmedString(255),
  description: requiredTrimmedString(5000),
  jobType: JobType,
  workArrangement: WorkArrangement,
  city: requiredTrimmedString(100),
  state: requiredTrimmedString(100),
  minHourlyRate: z.number().positive(),
  payNotes: optionalTrimmedString(500),
  workDays: z.array(DayOfWeek).default([]).transform(uniqueDaysTransform),
  scheduleNotes: optionalTrimmedString(500),
  workAuthRequired: z.boolean(),
  whatWereLookingFor: optionalTrimmedString(1000),
  requiredLanguageIds: z.array(z.string()).default([]),
};

export const CreateJobPostingSchema = z.object({
  companyId: z.string(),
  ...JobPostingFields,
});

export const UpdateJobPostingSchema = z.object({
  id: z.string(),
  title: JobPostingFields.title.optional(),
  description: JobPostingFields.description.optional(),
  jobType: JobPostingFields.jobType.optional(),
  workArrangement: JobPostingFields.workArrangement.optional(),
  city: JobPostingFields.city.optional(),
  state: JobPostingFields.state.optional(),
  minHourlyRate: JobPostingFields.minHourlyRate.optional(),
  payNotes: JobPostingFields.payNotes,
  workDays: JobPostingFields.workDays.optional(),
  scheduleNotes: JobPostingFields.scheduleNotes,
  workAuthRequired: JobPostingFields.workAuthRequired.optional(),
  whatWereLookingFor: JobPostingFields.whatWereLookingFor,
  requiredLanguageIds: JobPostingFields.requiredLanguageIds.optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
});

export const ListJobPostingsSchema = z.object({
  status: z.array(JobStatusEnum).optional(),
  companyId: z.string().optional(),
  myJobs: z.boolean().optional(),
  city: JobPostingFields.city.optional(),
  state: JobPostingFields.state.optional(),
  radiusMiles: z.number().positive().max(500).optional(),
  jobType: z.array(JobPostingFields.jobType).optional(),
  workArrangement: z.array(JobPostingFields.workArrangement).optional(),
  workDays: z.array(DayOfWeek).optional(),
  sortBy: z.enum(["newest", "closest", "pay"]).default("newest"),
});

export const CloseJobSchema = z.object({
  id: z.string(),
  reason: JobClosureReasonEnum,
  // Only honored when reason is FILLED_ON_SHEFA: the application of the hired
  // applicant. Validated server-side (must belong to the job, not be REJECTED).
  hiredApplicationId: z.string().min(1).optional(),
});

export type CreateJobPostingInput = z.infer<typeof CreateJobPostingSchema>;
export type UpdateJobPostingInput = z.infer<typeof UpdateJobPostingSchema>;
export type ListJobPostingsInput = z.infer<typeof ListJobPostingsSchema>;
export type CloseJobInput = z.infer<typeof CloseJobSchema>;
