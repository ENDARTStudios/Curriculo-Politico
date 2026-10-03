-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT,
    "date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillAuthorship" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillAuthorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAttendance" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "sessionType" TEXT,
    "present" BOOLEAN NOT NULL,
    "externalId" TEXT,

    CONSTRAINT "SessionAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bill_externalId_key" ON "Bill"("externalId");

-- CreateIndex
CREATE INDEX "Bill_externalId_idx" ON "Bill"("externalId");

-- CreateIndex
CREATE INDEX "BillAuthorship_personId_idx" ON "BillAuthorship"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "BillAuthorship_billId_personId_key" ON "BillAuthorship"("billId", "personId");

-- CreateIndex
CREATE INDEX "SessionAttendance_termId_idx" ON "SessionAttendance"("termId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionAttendance_termId_sessionDate_externalId_key" ON "SessionAttendance"("termId", "sessionDate", "externalId");

-- AddForeignKey
ALTER TABLE "BillAuthorship" ADD CONSTRAINT "BillAuthorship_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillAuthorship" ADD CONSTRAINT "BillAuthorship_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

