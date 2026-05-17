import { z } from "zod";

const CompanySize = z.enum(["SIZE_1_10", "SIZE_11_50", "SIZE_51_200", "SIZE_201_PLUS"]);

const Industry = z.enum([
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

// ─── Employer Profile (contact person) ───────────────────────────────────────

export const CreateEmployerProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  roleAtCompany: z.string().max(200).optional(),
  isAdult: z.literal(true, { message: "You must be 18 or older to use this platform" }).optional(),
});

export type CreateEmployerProfileInput = z.infer<typeof CreateEmployerProfileSchema>;

export const UpdateEmployerProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  roleAtCompany: z.string().max(200).optional(),
});

export type UpdateEmployerProfileInput = z.infer<typeof UpdateEmployerProfileSchema>;

// ─── Company ──────────────────────────────────────────────────────────────────

export const CreateCompanySchema = z.object({
  name: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  website: z.url({ protocol: /^https?$/ }).optional(),
  industry: Industry.optional(),
  companySize: CompanySize.optional(),
  aboutCompany: z.string().max(2000).optional(),
  missionText: z.string().max(1000).optional(),
});

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;

export const UpdateCompanySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  website: z.url({ protocol: /^https?$/ }).optional(),
  industry: Industry.optional(),
  companySize: CompanySize.optional(),
  aboutCompany: z.string().max(2000).optional(),
  missionText: z.string().max(1000).optional(),
});

export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
