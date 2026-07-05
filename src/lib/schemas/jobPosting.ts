import { z } from "zod";
import { optionalTrimmedString, requiredTrimmedString } from "@/lib/utils";
import { SUPPORTED_COUNTRIES } from "@/lib/constants/countries";

const Country = z.enum(SUPPORTED_COUNTRIES);
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
  country: Country,
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
  businessId: z.string(),
  ...JobPostingFields,
});

export const UpdateJobPostingSchema = z.object({
  id: z.string(),
  title: JobPostingFields.title.optional(),
  description: JobPostingFields.description.optional(),
  jobType: JobPostingFields.jobType.optional(),
  workArrangement: JobPostingFields.workArrangement.optional(),
  country: JobPostingFields.country.optional(),
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
  businessId: z.string().optional(),
  myJobs: z.boolean().optional(),
  country: JobPostingFields.country.optional(),
  city: JobPostingFields.city.optional(),
  state: JobPostingFields.state.optional(),
  // Radius is in the anchor city's country unit (miles for US, km for IL). It only
  // constrains ON_SITE/HYBRID jobs; REMOTE jobs are never distance-filtered.
  radius: z.number().positive().max(500).optional(),
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
