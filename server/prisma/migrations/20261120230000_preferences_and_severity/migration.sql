-- AlterEnum
ALTER TYPE "ConflictType" ADD VALUE 'PREFERENCE_VIOLATION';

-- CreateEnum
CREATE TYPE "ConflictSeverity" AS ENUM ('ERROR', 'WARNING');

-- CreateEnum
CREATE TYPE "PreferenceType" AS ENUM ('PREFERRED_OFF_DAY');

-- AlterTable
ALTER TABLE "Conflict" ADD COLUMN "severity" "ConflictSeverity" NOT NULL DEFAULT 'ERROR';

-- CreateTable
CREATE TABLE "EmployeePreference" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "PreferenceType" NOT NULL DEFAULT 'PREFERRED_OFF_DAY',
    "dayOfWeek" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeePreference_employeeId_idx" ON "EmployeePreference"("employeeId");

-- CreateIndex
CREATE INDEX "Conflict_severity_idx" ON "Conflict"("severity");

-- AddForeignKey
ALTER TABLE "EmployeePreference" ADD CONSTRAINT "EmployeePreference_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
