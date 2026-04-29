/*
  Warnings:

  - Added the required column `action` to the `FreshnessToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshnessToken" ADD COLUMN     "action" "PingResponse" NOT NULL,
ADD COLUMN     "pingId" TEXT;

-- AddForeignKey
ALTER TABLE "FreshnessToken" ADD CONSTRAINT "FreshnessToken_pingId_fkey" FOREIGN KEY ("pingId") REFERENCES "VerificationPing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
