-- DropForeignKey
ALTER TABLE "UserAffinity" DROP CONSTRAINT "UserAffinity_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "politicalConsentAt" TIMESTAMP(3),
ADD COLUMN     "politicalConsentVersion" TEXT,
ADD COLUMN     "politicalConsentWithdrawnAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;

-- DropTable
DROP TABLE "UserAffinity";

-- CreateTable
CREATE TABLE "RetificationRequest" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetName" TEXT,
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEBIDO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RetificationRequest_protocolo_key" ON "RetificationRequest"("protocolo");

-- CreateIndex
CREATE INDEX "RetificationRequest_requesterEmail_idx" ON "RetificationRequest"("requesterEmail");

