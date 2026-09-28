-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('PROPOSED', 'APPROVED', 'VOTED', 'AUTHORED');

-- CreateTable
CREATE TABLE "LegislativeAction" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "billId" TEXT,
    "voteDirection" TEXT,
    "date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegislativeAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegislativeAction_termId_idx" ON "LegislativeAction"("termId");

-- CreateIndex
CREATE UNIQUE INDEX "LegislativeAction_termId_actionType_billId_key" ON "LegislativeAction"("termId", "actionType", "billId");

-- AddForeignKey
ALTER TABLE "LegislativeAction" ADD CONSTRAINT "LegislativeAction_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
