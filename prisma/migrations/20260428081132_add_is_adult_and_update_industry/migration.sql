/*
  Warnings:

  - The values [HEALTHCARE_SUPPORT,TRADES_CONSTRUCTION,TRANSPORTATION_DELIVERY,EDUCATION_CHILDCARE,NONPROFIT_COMMUNITY] on the enum `Industry` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Industry_new" AS ENUM ('FOOD_SERVICE', 'RETAIL', 'HOSPITALITY', 'HEALTHCARE', 'TRADES', 'MANUFACTURING', 'OFFICE_ADMIN', 'TRANSPORTATION', 'EDUCATION', 'PERSONAL_SERVICES', 'TECHNOLOGY', 'BUSINESS', 'FINANCE', 'MARKETING', 'MEDIA', 'REAL_ESTATE', 'OTHER');
ALTER TABLE "EmployerProfile" ALTER COLUMN "industry" TYPE "Industry_new" USING ("industry"::text::"Industry_new");
ALTER TYPE "Industry" RENAME TO "Industry_old";
ALTER TYPE "Industry_new" RENAME TO "Industry";
DROP TYPE "public"."Industry_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdult" BOOLEAN NOT NULL DEFAULT false;
