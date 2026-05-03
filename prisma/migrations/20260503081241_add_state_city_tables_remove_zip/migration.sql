/*
  Warnings:

  - You are about to drop the column `zip` on the `EmployerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `zip` on the `JobPosting` table. All the data in the column will be lost.
  - You are about to drop the column `zip` on the `SeekerProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmployerProfile" DROP COLUMN "zip";

-- AlterTable
ALTER TABLE "JobPosting" DROP COLUMN "zip";

-- AlterTable
ALTER TABLE "SeekerProfile" DROP COLUMN "zip";

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "State_name_key" ON "State"("name");

-- CreateIndex
CREATE UNIQUE INDEX "State_abbr_key" ON "State"("abbr");

-- CreateIndex
CREATE INDEX "City_stateId_idx" ON "City"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_stateId_key" ON "City"("name", "stateId");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
