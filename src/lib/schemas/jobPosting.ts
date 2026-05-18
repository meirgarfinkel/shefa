import { z } from "zod";

const DayOfWeek = z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
const JobType = z.enum(["FULL_TIME", "PART_TIME", "EITHER"]);
const WorkArrangement = z.enum(["REMOTE", "ON_SITE", "HYBRID"]);
export const JobStatusEnum = z.enum(["ACTIVE", "PAUSED", "CLOSED"]);
// Status values an employer can set directly via the update procedure; CLOSED is handled by close procedure
const UserSettableJobStatus = z.enum(["ACTIVE", "PAUSED"]);
export const JobClosureReasonEnum = z.enum([
  "FILLED_ON_SHEFA",
  "FILLED_ELSEWHERE",
  "HIRING_FROZEN",
  "CANCELLED",
  "OTHER",
]);

export const CreateJobPostingSchema = z.object({
  companyId: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(5000),
  jobType: JobType,
  workArrangement: WorkArrangement,
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  minHourlyRate: z.number().positive(),
  payNotes: z.string().max(500).optional(),
  workDays: z
    .array(DayOfWeek)
    .default([])
    .transform((days) => [...new Set(days)]),
  scheduleNotes: z.string().max(500).optional(),
  workAuthRequired: z.boolean(),
  whatWeTeach: z.string().max(1000).optional(),
  whatWereLookingFor: z.string().max(1000).optional(),
  requiredLanguageIds: z.array(z.string()).default([]),
});

export const UpdateJobPostingSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(5000).optional(),
  jobType: JobType.optional(),
  workArrangement: WorkArrangement.optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  minHourlyRate: z.number().positive().optional(),
  payNotes: z.string().max(500).optional(),
  workDays: z
    .array(DayOfWeek)
    .transform((days) => [...new Set(days)])
    .optional(),
  scheduleNotes: z.string().max(500).optional(),
  workAuthRequired: z.boolean().optional(),
  whatWeTeach: z.string().max(1000).optional(),
  whatWereLookingFor: z.string().max(1000).optional(),
  requiredLanguageIds: z.array(z.string()).optional(),
  status: UserSettableJobStatus.optional(),
});

export const ListJobPostingsSchema = z.object({
  status: z.array(JobStatusEnum).optional(),
  companyId: z.string().optional(),
  myJobs: z.boolean().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  radiusMiles: z.number().positive().max(500).optional(),
  jobType: z.array(JobType).optional(),
  workArrangement: z.array(WorkArrangement).optional(),
  workDays: z.array(DayOfWeek).optional(),
  sortBy: z.enum(["newest", "closest", "pay"]).default("newest"),
});

export const CloseJobSchema = z.object({
  id: z.string(),
  reason: JobClosureReasonEnum,
});

export type CreateJobPostingInput = z.infer<typeof CreateJobPostingSchema>;
export type UpdateJobPostingInput = z.infer<typeof UpdateJobPostingSchema>;
export type ListJobPostingsInput = z.infer<typeof ListJobPostingsSchema>;
export type CloseJobInput = z.infer<typeof CloseJobSchema>;
