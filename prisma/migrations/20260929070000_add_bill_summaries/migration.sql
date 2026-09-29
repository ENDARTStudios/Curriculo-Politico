-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "citizenImpact" TEXT,
ADD COLUMN     "fullText" TEXT,
ADD COLUMN     "keyPoints" JSONB,
ADD COLUMN     "simpleSummary" TEXT;

