import { z } from "zod";

const DayOfWeek = z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
const JobType = z.enum(["FULL_TIME", "PART_TIME", "EITHER"]);
const WorkArrangement = z.enum(["REMOTE", "ON_SITE", "HYBRID"]);
export const JobStatusEnum = z.enum(["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "FILLED", "CLOSED"]);
// Status values an employer can set directly; EXPIRED and CLOSED are reserved
const UserSettableJobStatus = z.enum(["DRAFT", "ACTIVE", "PAUSED", "FILLED"]);

export const CreateJobPostingSchema = z.object({
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
  preferredSkillIds: z.array(z.string()).default([]),
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
  preferredSkillIds: z.array(z.string()).optional(),
  requiredLanguageIds: z.array(z.string()).optional(),
  status: UserSettableJobStatus.optional(),
});

export const ListJobPostingsSchema = z.object({
  status: z.array(JobStatusEnum).optional(),
  employerProfileId: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  radiusMiles: z.number().positive().max(500).optional(),
  jobType: z.array(JobType).optional(),
  workArrangement: z.array(WorkArrangement).optional(),
  workDays: z.array(DayOfWeek).optional(),
  skillIds: z.array(z.string()).optional(),
  sortBy: z.enum(["newest", "closest"]).default("newest"),
});

export type CreateJobPostingInput = z.infer<typeof CreateJobPostingSchema>;
export type UpdateJobPostingInput = z.infer<typeof UpdateJobPostingSchema>;
export type ListJobPostingsInput = z.infer<typeof ListJobPostingsSchema>;
