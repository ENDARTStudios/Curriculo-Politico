-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LegalStatus" ADD VALUE 'ACCOUNTS_REJECTED';
ALTER TYPE "LegalStatus" ADD VALUE 'CRIMINAL_ACTION';

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "tags" JSONB;

-- AlterTable
ALTER TABLE "LegislativeAction" ADD COLUMN     "proposicaoId" TEXT;

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "color" TEXT,
ADD COLUMN     "foundedYear" INTEGER,
ADD COLUMN     "history" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "tseNumber" INTEGER;

-- CreateIndex
CREATE INDEX "LegislativeAction_proposicaoId_idx" ON "LegislativeAction"("proposicaoId");

