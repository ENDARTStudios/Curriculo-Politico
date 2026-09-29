-- CreateTable
CREATE TABLE "MunicipalExpense" (
    "id" TEXT NOT NULL,
    "politicianName" TEXT NOT NULL,
    "personId" TEXT,
    "municipality" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "keyword" TEXT,
    "publishedAt" TIMESTAMP(3),
    "gazetteUrl" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MunicipalExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatrimonyHistory" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "electionYear" INTEGER NOT NULL,
    "declaredValue" DOUBLE PRECISION NOT NULL,
    "assetCount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatrimonyHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MunicipalExpense_municipality_idx" ON "MunicipalExpense"("municipality");

-- CreateIndex
CREATE INDEX "MunicipalExpense_personId_idx" ON "MunicipalExpense"("personId");

-- CreateIndex
CREATE INDEX "PatrimonyHistory_personId_idx" ON "PatrimonyHistory"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "PatrimonyHistory_personId_electionYear_key" ON "PatrimonyHistory"("personId", "electionYear");

-- AddForeignKey
ALTER TABLE "MunicipalExpense" ADD CONSTRAINT "MunicipalExpense_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyHistory" ADD CONSTRAINT "PatrimonyHistory_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

