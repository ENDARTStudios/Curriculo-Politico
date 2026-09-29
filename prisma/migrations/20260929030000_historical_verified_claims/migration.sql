-- CreateTable
CREATE TABLE "HistoricalEra" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "HistoricalEra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalPolitician" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eraId" TEXT NOT NULL,
    "office" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER,
    "party" TEXT,
    "achievements" JSONB,
    "controversies" JSONB,
    "historicalScore" DOUBLE PRECISION,
    "scoreBreakdown" JSONB,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalPolitician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedClaim" (
    "id" TEXT NOT NULL,
    "personId" TEXT,
    "claimText" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "topic" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifiedClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalEra_name_key" ON "HistoricalEra"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalPolitician_name_office_startYear_key" ON "HistoricalPolitician"("name", "office", "startYear");

-- CreateIndex
CREATE INDEX "VerifiedClaim_personId_idx" ON "VerifiedClaim"("personId");

-- CreateIndex
CREATE INDEX "VerifiedClaim_verdict_idx" ON "VerifiedClaim"("verdict");

-- AddForeignKey
ALTER TABLE "HistoricalPolitician" ADD CONSTRAINT "HistoricalPolitician_eraId_fkey" FOREIGN KEY ("eraId") REFERENCES "HistoricalEra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedClaim" ADD CONSTRAINT "VerifiedClaim_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

