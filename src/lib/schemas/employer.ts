import { z } from "zod";
import { optionalHttpUrl, optionalTrimmedString, requiredTrimmedString } from "@/lib/utils";
import { SUPPORTED_COUNTRIES } from "@/lib/constants/countries";

const Country = z.enum(SUPPORTED_COUNTRIES);
const BusinessSize = z.enum(["SIZE_1_10", "SIZE_11_50", "SIZE_51_200", "SIZE_201_PLUS"]);

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
  roleAtBusiness: optionalTrimmedString(200),
};

export const CreateEmployerProfileSchema = z.object({
  firstName: requiredTrimmedString(100),
  lastName: requiredTrimmedString(100),
  roleAtBusiness: optionalTrimmedString(200),
  isAdult: z.literal(true, {
    message: "You must be 18 or older to use this platform",
  }),
});

export const UpdateEmployerProfileSchema = z.object({
  firstName: EmployerProfileFields.firstName.optional(),
  lastName: EmployerProfileFields.lastName.optional(),
  roleAtBusiness: EmployerProfileFields.roleAtBusiness,
});

export type CreateEmployerProfileInput = z.infer<typeof CreateEmployerProfileSchema>;

export type UpdateEmployerProfileInput = z.infer<typeof UpdateEmployerProfileSchema>;

// ─── Business ──────────────────────────────────────────────────────────────────

const BusinessFields = {
  name: requiredTrimmedString(200),
  country: Country,
  city: requiredTrimmedString(100),
  state: requiredTrimmedString(100),
  website: optionalHttpUrl,
  industry: Industry.optional(),
  businessSize: BusinessSize.optional(),
  aboutBusiness: optionalTrimmedString(2000),
  missionText: optionalTrimmedString(1000),
};

export const CreateBusinessSchema = z.object(BusinessFields);

export const UpdateBusinessSchema = z.object({
  id: z.string(),
  name: BusinessFields.name.optional(),
  country: BusinessFields.country.optional(),
  city: BusinessFields.city.optional(),
  state: BusinessFields.state.optional(),
  website: BusinessFields.website,
  industry: BusinessFields.industry,
  businessSize: BusinessFields.businessSize,
  aboutBusiness: BusinessFields.aboutBusiness,
  missionText: BusinessFields.missionText,
});

export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>;

export type UpdateBusinessInput = z.infer<typeof UpdateBusinessSchema>;
