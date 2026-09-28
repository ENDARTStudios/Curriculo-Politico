-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "tseId" TEXT;

-- CreateTable
CREATE TABLE "CampaignFinance" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalReceived" DOUBLE PRECISION NOT NULL,
    "totalSpent" DOUBLE PRECISION NOT NULL,
    "donorCount" INTEGER NOT NULL,
    "topDonors" JSONB,
    "source" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignFinance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignFinance_termId_idx" ON "CampaignFinance"("termId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignFinance_termId_year_key" ON "CampaignFinance"("termId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Person_tseId_key" ON "Person"("tseId");

-- AddForeignKey
ALTER TABLE "CampaignFinance" ADD CONSTRAINT "CampaignFinance_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

