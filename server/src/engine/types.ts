/**
 * Pure TypeScript types for the Scheduling Engine.
 * NO Prisma, NO Express, NO I/O, NO Date.now().
 */

export type EmployeeStatusType = 'ACTIVE' | 'INACTIVE';
export type BrandStatusType = 'ACTIVE' | 'INACTIVE';
export type AvailabilityTypeEnum = 'WEEKLY_OFF' | 'LEAVE' | 'COMP_OFF';
export type AvailabilityStatusEnum = 'APPROVED' | 'PENDING';
export type EntryStatusType = 'WORKING' | 'WEEKLY_OFF' | 'LEAVE' | 'COMP_OFF' | 'HOLIDAY_OFF';
export type ConflictTypeEnum = 'COVERAGE_GAP' | 'LEAVE_CONFLICT' | 'INSUFFICIENT_STAFF' | 'OVERLAP';

export interface BrandData {
  id: string;
  name: string;
  status: BrandStatusType;
}

export interface ProcessData {
  id: string;
  name: string;
}

export interface EmployeeData {
  id: string;
  name: string;
  email: string;
  podId: string;
  status: EmployeeStatusType;
}

export interface AssignmentData {
  id?: string;
  employeeId: string;
  brandId: string;
  processId: string;
}

export interface OperatingRuleData {
  id?: string;
  brandId: string;
  processId: string;
  workingDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  operatesOnPublicHolidays: boolean;
}

export interface CoverageRequirementData {
  id?: string;
  brandId: string;
  processId: string;
  minimumStaff: number;
  date?: string | Date | null; // specific date override (YYYY-MM-DD)
  dayOfWeek?: number | null; // recurring weekday override (0-6)
}

export interface AvailabilityData {
  id?: string;
  employeeId: string;
  type: AvailabilityTypeEnum;
  dayOfWeek?: number | null; // 0=Sun..6=Sat for recurring weekly off
  startDate?: string | Date | null;
  endDate?: string | Date | null; // INCLUSIVE: both startDate and endDate are included
  status: AvailabilityStatusEnum;
  reason?: string | null;
}

export interface HolidayData {
  id?: string;
  date: string | Date; // YYYY-MM-DD or Date
  name: string;
  region?: string;
}

export interface EngineInput {
  month: number; // 1-12
  year: number; // e.g. 2026
  brands: BrandData[];
  processes: ProcessData[];
  employees: EmployeeData[];
  assignments: AssignmentData[];
  operatingRules: OperatingRuleData[];
  coverageRequirements: CoverageRequirementData[];
  availabilities: AvailabilityData[];
  holidays: HolidayData[];
}

export interface DailyRequirement {
  brandId: string;
  processId: string;
  brandName: string;
  processName: string;
  minimumStaff: number;
}

export interface RosterEntryDraft {
  employeeId: string;
  brandId: string | null;
  processId: string | null;
  date: string; // "YYYY-MM-DD"
  status: EntryStatusType;
}

export interface ConflictDraft {
  date: string; // "YYYY-MM-DD"
  brandId: string;
  processId: string;
  type: ConflictTypeEnum;
  requiredStaff: number;
  availableStaff: number;
  message: string;
}

export interface EngineStats {
  totalEmployees: number;
  totalDays: number;
  totalEntries: number;
  workingEntries: number;
  offEntries: number;
  conflictCount: number;
  conflictsByType: Record<string, number>;
}

export interface EngineOutput {
  entries: RosterEntryDraft[];
  conflicts: ConflictDraft[];
  stats: EngineStats;
}

export interface ReplacementCandidate {
  employeeId: string;
  employeeName: string;
  email: string;
  primaryBrandId?: string;
  primaryBrandName?: string;
  workingDaysSoFar: number;
}
