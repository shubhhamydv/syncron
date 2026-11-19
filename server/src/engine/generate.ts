/**
 * Pure Roster Generation Engine.
 * NO Prisma, NO Express, NO I/O, NO Date.now().
 *
 * Algorithm:
 * 1. For each date in the target month, resolve that date's operational requirements.
 * 2. Order requirements by FEWEST eligible candidates first (scarcest first).
 * 3. Allocate candidates up to minimumStaff preferring the fewest working days this month,
 *    tie-breaking by employeeId for strict determinism.
 * 4. HARD RULE: Maximum 1 working assignment per employee per day.
 * 5. Emit conflicts (COVERAGE_GAP, INSUFFICIENT_STAFF, OVERLAP) when requirements cannot be met.
 * 6. Emit an explicit status entry for every active employee on every date.
 */

import {
  AssignmentData,
  ConflictDraft,
  ConflictTypeEnum,
  EngineInput,
  EngineOutput,
  EngineStats,
  EntryStatusType,
  RosterEntryDraft,
} from './types';
import { getUTCDayOfWeek, isHoliday, monthDates, toDateString } from './dates';
import { getUnavailability } from './availability';
import { resolveDailyRequirements } from './requirements';

export function generateRoster(input: EngineInput): EngineOutput {
  const dates = monthDates(input.year, input.month);
  const activeEmployees = input.employees
    .filter((e) => e.status === 'ACTIVE')
    .sort((a, b) => a.id.localeCompare(b.id));

  const employeeMap = new Map(activeEmployees.map((e) => [e.id, e]));
  const brandMap = new Map(input.brands.map((b) => [b.id, b]));
  const processMap = new Map(input.processes.map((p) => [p.id, p]));

  // Index assignments by "brandId:processId"
  const brandProcessAssignments = new Map<string, string[]>();
  // Index assignments by employeeId
  const employeeAssignments = new Map<string, AssignmentData[]>();

  for (const a of input.assignments) {
    if (!employeeMap.has(a.employeeId)) continue; // only active employees

    const bpKey = `${a.brandId}:${a.processId}`;
    if (!brandProcessAssignments.has(bpKey)) {
      brandProcessAssignments.set(bpKey, []);
    }
    brandProcessAssignments.get(bpKey)!.push(a.employeeId);

    if (!employeeAssignments.has(a.employeeId)) {
      employeeAssignments.set(a.employeeId, []);
    }
    employeeAssignments.get(a.employeeId)!.push(a);
  }

  // Monthly working days counter for fair workload distribution
  const workingDaysCount = new Map<string, number>();
  for (const emp of activeEmployees) {
    workingDaysCount.set(emp.id, 0);
  }

  const entries: RosterEntryDraft[] = [];
  const conflicts: ConflictDraft[] = [];

  for (const dateStr of dates) {
    const weekday = getUTCDayOfWeek(dateStr);
    const holiday = isHoliday(dateStr, input.holidays);
    const dailyReqs = resolveDailyRequirements(dateStr, input);

    // Track which employees are assigned to a working shift today (Max 1 per day)
    const assignedToday = new Map<string, { brandId: string; processId: string }>();

    // 1. Order requirements: scarcest eligible candidates first
    const requirementsWithScarcity = dailyReqs.map((req) => {
      const bpKey = `${req.brandId}:${req.processId}`;
      const assignedEmpIds = brandProcessAssignments.get(bpKey) || [];

      // Count employees free of leave/weekly off on this day
      let eligibleCount = 0;
      for (const empId of assignedEmpIds) {
        const emp = employeeMap.get(empId);
        if (emp && getUnavailability(emp, dateStr, input.availabilities) === null) {
          eligibleCount++;
        }
      }

      return {
        req,
        eligibleCount,
      };
    });

    // Deterministic sort: scarcest first, then minimumStaff, then brandId, processId
    requirementsWithScarcity.sort((a, b) => {
      if (a.eligibleCount !== b.eligibleCount) return a.eligibleCount - b.eligibleCount;
      if (a.req.minimumStaff !== b.req.minimumStaff) return a.req.minimumStaff - b.req.minimumStaff;
      if (a.req.brandId !== b.req.brandId) return a.req.brandId.localeCompare(b.req.brandId);
      return a.req.processId.localeCompare(b.req.processId);
    });

    // 2. Process each requirement in order of scarcity
    for (const { req } of requirementsWithScarcity) {
      const bpKey = `${req.brandId}:${req.processId}`;
      const assignedEmpIds = brandProcessAssignments.get(bpKey) || [];

      const availableCandidates: string[] = [];
      const overlapBlockedEmps: string[] = [];
      const unavailableReasons: string[] = [];

      for (const empId of assignedEmpIds) {
        const emp = employeeMap.get(empId);
        if (!emp) continue;

        const unavail = getUnavailability(emp, dateStr, input.availabilities);
        const alreadyWorking = assignedToday.has(empId);

        if (unavail === null && !alreadyWorking) {
          availableCandidates.push(empId);
        } else if (unavail === null && alreadyWorking) {
          overlapBlockedEmps.push(emp.name);
          const prior = assignedToday.get(empId)!;
          const priorBrandName = brandMap.get(prior.brandId)?.name || prior.brandId;
          const priorProcName = processMap.get(prior.processId)?.name || prior.processId;
          unavailableReasons.push(`${emp.name} is already working on ${priorBrandName} ${priorProcName}`);
        } else if (unavail !== null) {
          unavailableReasons.push(`${emp.name} is unavailable (${unavail.type}: ${unavail.reason})`);
        }
      }

      // Sort candidates by fewest working days this month, tie-break by ID
      availableCandidates.sort((a, b) => {
        const countA = workingDaysCount.get(a) || 0;
        const countB = workingDaysCount.get(b) || 0;
        if (countA !== countB) return countA - countB;
        return a.localeCompare(b);
      });

      // Pick up to minimumStaff
      const selected = availableCandidates.slice(0, req.minimumStaff);
      for (const empId of selected) {
        assignedToday.set(empId, { brandId: req.brandId, processId: req.processId });
        workingDaysCount.set(empId, (workingDaysCount.get(empId) || 0) + 1);

        entries.push({
          employeeId: empId,
          brandId: req.brandId,
          processId: req.processId,
          date: dateStr,
          status: 'WORKING',
        });
      }

      // If requirements were not fully satisfied, emit a conflict
      if (selected.length < req.minimumStaff) {
        let conflictType: ConflictTypeEnum = 'COVERAGE_GAP';
        if (overlapBlockedEmps.length > 0) {
          conflictType = 'OVERLAP';
        } else if (selected.length > 0) {
          conflictType = 'INSUFFICIENT_STAFF';
        } else {
          conflictType = 'COVERAGE_GAP';
        }

        let prefix = '';
        if (conflictType === 'OVERLAP') {
          prefix = `Overlap conflict: ${selected.length} of ${req.minimumStaff} required staff allocated for ${req.brandName} ${req.processName} on ${dateStr}.`;
        } else if (conflictType === 'COVERAGE_GAP') {
          prefix = `Coverage gap: 0 of ${req.minimumStaff} required staff allocated for ${req.brandName} ${req.processName} on ${dateStr}.`;
        } else {
          prefix = `Insufficient staff: ${selected.length} of ${req.minimumStaff} required staff allocated for ${req.brandName} ${req.processName} on ${dateStr}.`;
        }

        const message =
          unavailableReasons.length > 0
            ? `${prefix} ${unavailableReasons.join('; ')}.`
            : prefix;

        conflicts.push({
          date: dateStr,
          brandId: req.brandId,
          processId: req.processId,
          type: conflictType,
          requiredStaff: req.minimumStaff,
          availableStaff: selected.length,
          message,
        });
      }
    }

    // 3. Emit non-working entries for every employee not scheduled today
    for (const emp of activeEmployees) {
      if (assignedToday.has(emp.id)) continue;

      let status: EntryStatusType = 'WEEKLY_OFF';
      const unavail = getUnavailability(emp, dateStr, input.availabilities);

      if (unavail !== null) {
        if (unavail.type === 'LEAVE') {
          status = 'LEAVE';
        } else if (unavail.type === 'COMP_OFF') {
          status = 'COMP_OFF';
        } else {
          status = 'WEEKLY_OFF';
        }
      } else if (holiday) {
        // "Use HOLIDAY_OFF only when the employee's assigned brands are all closed that holiday and they're otherwise free."
        const empAssigned = employeeAssignments.get(emp.id) || [];
        const anyBrandOperatingToday = empAssigned.some((a) => {
          const rule = input.operatingRules.find(
            (r) => r.brandId === a.brandId && r.processId === a.processId
          );
          return rule && rule.workingDays.includes(weekday) && rule.operatesOnPublicHolidays;
        });

        if (!anyBrandOperatingToday) {
          status = 'HOLIDAY_OFF';
        } else {
          status = 'WEEKLY_OFF';
        }
      } else {
        status = 'WEEKLY_OFF';
      }

      entries.push({
        employeeId: emp.id,
        brandId: null,
        processId: null,
        date: dateStr,
        status,
      });
    }
  }

  // Sort entries deterministically: date ASC, employeeId ASC
  entries.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.employeeId.localeCompare(b.employeeId);
  });

  // Sort conflicts deterministically: date ASC, brandId ASC, processId ASC
  conflicts.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.brandId !== b.brandId) return a.brandId.localeCompare(b.brandId);
    return a.processId.localeCompare(b.processId);
  });

  // Build Engine Stats
  const conflictsByType: Record<string, number> = {
    COVERAGE_GAP: 0,
    INSUFFICIENT_STAFF: 0,
    OVERLAP: 0,
    LEAVE_CONFLICT: 0,
  };
  for (const c of conflicts) {
    conflictsByType[c.type] = (conflictsByType[c.type] || 0) + 1;
  }

  const workingEntries = entries.filter((e) => e.status === 'WORKING').length;
  const stats: EngineStats = {
    totalEmployees: activeEmployees.length,
    totalDays: dates.length,
    totalEntries: entries.length,
    workingEntries,
    offEntries: entries.length - workingEntries,
    conflictCount: conflicts.length,
    conflictsByType,
  };

  return {
    entries,
    conflicts,
    stats,
  };
}
