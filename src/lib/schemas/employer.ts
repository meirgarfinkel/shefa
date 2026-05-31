import { z } from "zod";
import { optionalHttpUrl, optionalTrimmedString, requiredTrimmedString } from "../utils";

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

const EmployerProfileFields = {
  firstName: requiredTrimmedString(100),
  lastName: requiredTrimmedString(100),
  roleAtCompany: optionalTrimmedString(100),
};

export const CreateEmployerProfileSchema = z.object({
  firstName: requiredTrimmedString(100),
  lastName: requiredTrimmedString(100),
  roleAtCompany: optionalTrimmedString(100),
  isAdult: z.literal(true, {
    message: "You must be 18 or older to use this platform",
  }),
});

export const UpdateEmployerProfileSchema = z.object({
  firstName: EmployerProfileFields.firstName.optional(),
  lastName: EmployerProfileFields.lastName.optional(),
  roleAtCompany: EmployerProfileFields.roleAtCompany,
});

export type CreateEmployerProfileInput = z.infer<typeof CreateEmployerProfileSchema>;

export type UpdateEmployerProfileInput = z.infer<typeof UpdateEmployerProfileSchema>;

// ─── Company ──────────────────────────────────────────────────────────────────

const CompanyFields = {
  name: requiredTrimmedString(200),
  city: requiredTrimmedString(100),
  state: requiredTrimmedString(100),
  website: optionalHttpUrl,
  industry: Industry.optional(),
  companySize: CompanySize.optional(),
  aboutCompany: optionalTrimmedString(2000),
  missionText: optionalTrimmedString(1000),
};

export const CreateCompanySchema = z.object(CompanyFields);

export const UpdateCompanySchema = z.object({
  id: z.string(),
  name: CompanyFields.name.optional(),
  city: CompanyFields.city.optional(),
  state: CompanyFields.state.optional(),
  website: CompanyFields.website,
  industry: CompanyFields.industry,
  companySize: CompanyFields.companySize,
  aboutCompany: CompanyFields.aboutCompany,
  missionText: CompanyFields.missionText,
});

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;

export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
