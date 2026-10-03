-- CreateEnum
CREATE TYPE "ReliabilityStatus" AS ENUM ('GREEN', 'YELLOW', 'RED', 'GRAY');

-- CreateEnum
CREATE TYPE "LegalStatus" AS ENUM ('INVESTIGATION', 'LAWSUIT', 'CONDEMNATION', 'IMPEACHMENT', 'CLEARED');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "civilName" TEXT NOT NULL,
    "politicalName" TEXT NOT NULL,
    "birthYear" INTEGER,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ideology" TEXT,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "partyId" TEXT,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalRecord" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "LegalStatus" NOT NULL,
    "status" TEXT NOT NULL,
    "court" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "finalScore" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "reliabilityStatus" "ReliabilityStatus" NOT NULL,
    "integrityScore" DOUBLE PRECISION NOT NULL,
    "productivityScore" DOUBLE PRECISION NOT NULL,
    "transparencyScore" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_externalId_key" ON "Person"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Party_acronym_key" ON "Party"("acronym");

-- CreateIndex
CREATE INDEX "Term_personId_idx" ON "Term"("personId");

-- CreateIndex
CREATE INDEX "Term_officeId_idx" ON "Term"("officeId");

-- CreateIndex
CREATE INDEX "LegalRecord_personId_idx" ON "LegalRecord"("personId");

-- CreateIndex
CREATE INDEX "Score_termId_idx" ON "Score"("termId");

-- CreateIndex
CREATE INDEX "Score_finalScore_idx" ON "Score"("finalScore");

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalRecord" ADD CONSTRAINT "LegalRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
