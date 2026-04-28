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

export const CreateEmployerProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  isAdult: z.literal(true, {
    message: "You must be 18 or older to use this platform",
  }),
  companyName: z.string().min(1).max(200),
  companySize: CompanySize,
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zip: z.string().min(1).max(10),
  // Optional
  roleAtCompany: z.string().max(100).optional(),
  industry: Industry.optional(),
  website: z.url({ protocol: /^https?$/ }).optional(),
  aboutCompany: z.string().max(2000).optional(),
  missionText: z.string().max(1000).optional(),
});

export type CreateEmployerProfileInput = z.infer<typeof CreateEmployerProfileSchema>;
