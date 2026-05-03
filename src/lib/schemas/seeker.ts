import { z } from "zod";

const DayOfWeek = z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);

const EducationLevel = z.enum([
  "NONE",
  "SOME_HIGH_SCHOOL",
  "HIGH_SCHOOL",
  "SOME_COLLEGE",
  "ASSOCIATE",
  "BACHELOR",
  "GRADUATE",
]);

export const CreateSeekerProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zip: z.string().min(1).max(10),
  workAuthorization: z.boolean(),
  isAdult: z.literal(true, {
    message: "You must be 18 or older to use this platform",
  }),
  availableDays: z.array(DayOfWeek).transform((days) => [...new Set(days)]),
  jobSeekText: z.string().min(1).max(1000),
  // Optional
  educationLevel: EducationLevel.optional(),
  otherSkills: z.string().max(500).optional(),
  otherLanguages: z.string().max(500).optional(),
  about: z.string().max(1000).optional(),
  skillIds: z.array(z.string().cuid()).optional(),
  languageIds: z.array(z.string().cuid()).optional(),
});

export type CreateSeekerProfileInput = z.infer<typeof CreateSeekerProfileSchema>;

export const UpdateSeekerProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zip: z.string().min(1).max(10),
  workAuthorization: z.boolean(),
  availableDays: z.array(DayOfWeek).transform((days) => [...new Set(days)]),
  jobSeekText: z.string().min(1).max(1000),
  educationLevel: EducationLevel.optional(),
  otherSkills: z.string().max(500).optional(),
  otherLanguages: z.string().max(500).optional(),
  about: z.string().max(1000).optional(),
  skillIds: z.array(z.string().cuid()).optional(),
  languageIds: z.array(z.string().cuid()).optional(),
});

export type UpdateSeekerProfileInput = z.infer<typeof UpdateSeekerProfileSchema>;
