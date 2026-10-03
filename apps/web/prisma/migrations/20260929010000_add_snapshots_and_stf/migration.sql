-- CreateTable
CREATE TABLE "ScoreSnapshot" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "reliabilityStatus" "ReliabilityStatus" NOT NULL,
    "breakdown" JSONB,
    "events" JSONB,

    CONSTRAINT "ScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StfJustice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthYear" INTEGER,
    "appointedBy" TEXT,
    "appointmentDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StfJustice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StfCase" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT,
    "decisionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StfCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StfVote" (
    "id" TEXT NOT NULL,
    "justiceId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "voteDirection" TEXT NOT NULL,
    "wasRapporteur" BOOLEAN NOT NULL DEFAULT false,
    "dissent" BOOLEAN NOT NULL DEFAULT false,
    "voteDate" TIMESTAMP(3),

    CONSTRAINT "StfVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StfScore" (
    "id" TEXT NOT NULL,
    "justiceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "productivityScore" DOUBLE PRECISION NOT NULL,
    "consistencyScore" DOUBLE PRECISION NOT NULL,
    "transparencyScore" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StfScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoreSnapshot_snapshotDate_idx" ON "ScoreSnapshot"("snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreSnapshot_termId_snapshotDate_key" ON "ScoreSnapshot"("termId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "StfJustice_name_key" ON "StfJustice"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StfCase_externalId_key" ON "StfCase"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "StfVote_justiceId_caseId_key" ON "StfVote"("justiceId", "caseId");

-- CreateIndex
CREATE UNIQUE INDEX "StfScore_justiceId_periodStart_key" ON "StfScore"("justiceId", "periodStart");

-- CreateIndex
CREATE INDEX "Bill_type_idx" ON "Bill"("type");

-- CreateIndex
CREATE INDEX "Bill_date_idx" ON "Bill"("date");

-- AddForeignKey
ALTER TABLE "ScoreSnapshot" ADD CONSTRAINT "ScoreSnapshot_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StfVote" ADD CONSTRAINT "StfVote_justiceId_fkey" FOREIGN KEY ("justiceId") REFERENCES "StfJustice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StfVote" ADD CONSTRAINT "StfVote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "StfCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StfScore" ADD CONSTRAINT "StfScore_justiceId_fkey" FOREIGN KEY ("justiceId") REFERENCES "StfJustice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

