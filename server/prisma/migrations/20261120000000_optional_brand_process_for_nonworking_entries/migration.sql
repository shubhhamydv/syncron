-- DropIndex
DROP INDEX "RosterEntry_rosterId_employeeId_brandId_processId_date_key";

-- AlterTable
ALTER TABLE "RosterEntry" ALTER COLUMN "brandId" DROP NOT NULL,
ALTER COLUMN "processId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RosterEntry_rosterId_employeeId_date_key" ON "RosterEntry"("rosterId", "employeeId", "date");
