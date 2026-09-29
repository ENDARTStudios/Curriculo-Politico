-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('SALARY', 'PATRIMONY', 'CEAP', 'CEAPS', 'OFFICE_BUDGET', 'HOUSING', 'RELOCATION', 'HEALTH_PLAN', 'TRANSPORT', 'OTHER_BENEFITS');

-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "costEfficiencyScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PoliticianCost" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoliticianCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedBenefit" (
    "id" TEXT NOT NULL,
    "officeType" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL,
    "monthlyValue" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PoliticianCost_termId_year_idx" ON "PoliticianCost"("termId", "year");

-- CreateIndex
CREATE INDEX "PoliticianCost_category_idx" ON "PoliticianCost"("category");

-- CreateIndex
CREATE UNIQUE INDEX "PoliticianCost_termId_category_year_description_key" ON "PoliticianCost"("termId", "category", "year", "description");

-- CreateIndex
CREATE UNIQUE INDEX "FixedBenefit_officeType_category_effectiveFrom_key" ON "FixedBenefit"("officeType", "category", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "PoliticianCost" ADD CONSTRAINT "PoliticianCost_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

