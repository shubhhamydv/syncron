/**
 * Pure Roster Validation Engine.
 * NO Prisma, NO Express, NO I/O, NO Date.now().
 *
 * Fully independent of generate.ts:
 * Re-derives daily requirements and inspects every entry to catch:
 * 1. Understaffed requirements (COVERAGE_GAP / INSUFFICIENT_STAFF / OVERLAP)
 * 2. Hard rule violations: Duplicate working assignments on the same day (OVERLAP)
 * 3. Availability violations: Employee marked WORKING while on approved LEAVE / COMP_OFF (LEAVE_CONFLICT)
 */

import { ConflictDraft, ConflictTypeEnum, EngineInput, RosterEntryDraft } from './types';
import { getUnavailability } from './availability';
import { getUTCDayOfWeek, monthDates, toDateString } from './dates';
import { resolveDailyRequirements } from './requirements';

export function validateRoster(input: EngineInput, entries: RosterEntryDraft[]): ConflictDraft[] {
  const dates = monthDates(input.year, input.month);
  const employeeMap = new Map(input.employees.map((e) => [e.id, e]));
  const brandMap = new Map(input.brands.map((b) => [b.id, b]));
  const processMap = new Map(input.processes.map((p) => [p.id, p]));

  // Index assignments by "brandId:processId"
  const brandProcessAssignments = new Map<string, string[]>();
  for (const a of input.assignments) {
    const key = `${a.brandId}:${a.processId}`;
    if (!brandProcessAssignments.has(key)) {
      brandProcessAssignments.set(key, []);
    }
    brandProcessAssignments.get(key)!.push(a.employeeId);
  }

  // Group entries by date
  const entriesByDate = new Map<string, RosterEntryDraft[]>();
  for (const entry of entries) {
    const d = toDateString(entry.date);
    if (!entriesByDate.has(d)) {
      entriesByDate.set(d, []);
    }
    entriesByDate.get(d)!.push(entry);
  }

  // Pre-calculate single-resource brands: count of distinct assigned employees across all assignments == 1
  const brandDistinctEmployees = new Map<string, Set<string>>();
  for (const a of input.assignments) {
    if (!brandDistinctEmployees.has(a.brandId)) {
      brandDistinctEmployees.set(a.brandId, new Set());
    }
    brandDistinctEmployees.get(a.brandId)!.add(a.employeeId);
  }
  const isSingleResourceBrand = (brandId: string) => {
    const emps = brandDistinctEmployees.get(brandId);
    return emps !== undefined && emps.size === 1;
  };

  const empPreferences = new Map<string, typeof input.preferences>();
  for (const p of input.preferences || []) {
    if (!empPreferences.has(p.employeeId)) {
      empPreferences.set(p.employeeId, []);
    }
    empPreferences.get(p.employeeId)!.push(p);
  }

  const conflicts: ConflictDraft[] = [];

  for (const dateStr of dates) {
    const weekday = getUTCDayOfWeek(dateStr);
    const dayEntries = entriesByDate.get(dateStr) || [];
    const workingEntries = dayEntries.filter((e) => e.status === 'WORKING');

    // 1. Check Hard Rule: Multiple WORKING assignments on the same day for an employee
    const workingByEmp = new Map<string, RosterEntryDraft[]>();
    for (const w of workingEntries) {
      if (!workingByEmp.has(w.employeeId)) {
        workingByEmp.set(w.employeeId, []);
      }
      workingByEmp.get(w.employeeId)!.push(w);
    }

    for (const [empId, empWorking] of workingByEmp.entries()) {
      if (empWorking.length > 1) {
        const emp = employeeMap.get(empId);
        const empName = emp?.name || empId;
        const brandNames = empWorking
          .map((w) => brandMap.get(w.brandId || '')?.name || w.brandId)
          .join(', ');

        for (const extra of empWorking.slice(1)) {
          conflicts.push({
            date: dateStr,
            brandId: extra.brandId || '',
            processId: extra.processId || '',
            type: 'OVERLAP',
            requiredStaff: 1,
            availableStaff: 0,
            message: `Illegal duplicate shift: ${empName} is assigned to multiple working shifts on ${dateStr} (${brandNames}). Max 1 working assignment allowed per day.`,
          });
        }
      }
    }

    // 2. Check Availability Violations: Employee marked WORKING while on approved leave
    for (const w of workingEntries) {
      const emp = employeeMap.get(w.employeeId);
      if (emp) {
        const unavail = getUnavailability(emp, dateStr, input.availabilities);
        if (unavail && (unavail.type === 'LEAVE' || unavail.type === 'COMP_OFF')) {
          let bId = w.brandId;
          let pId = w.processId;
          if (!bId || !pId) {
            const firstAssn = input.assignments.find((a) => a.employeeId === emp.id);
            if (firstAssn) {
              bId = bId || firstAssn.brandId;
              pId = pId || firstAssn.processId;
            }
          }
          if (bId && pId) {
            const brandName = brandMap.get(bId)?.name || bId;
            const procName = processMap.get(pId)?.name || pId;
            conflicts.push({
              date: dateStr,
              brandId: bId,
              processId: pId,
              type: 'LEAVE_CONFLICT',
              requiredStaff: 1,
              availableStaff: 0,
              message: `Leave violation: ${emp.name} is scheduled to work on ${brandName} ${procName} on ${dateStr} while on approved ${unavail.type}: ${unavail.reason}.`,
            });
          }
        }
      }
    }

    // 3. Re-derive Operational Requirements & verify staffing
    const dailyReqs = resolveDailyRequirements(dateStr, input);

    for (const req of dailyReqs) {
      const bpKey = `${req.brandId}:${req.processId}`;
      const assignedEmpIds = brandProcessAssignments.get(bpKey) || [];

      // Count working entries allocated to this brand+process
      const allocatedEntries = workingEntries.filter((e) => {
        if (e.brandId !== req.brandId) return false;
        if (e.processId === req.processId) return true;
        // In a single-resource brand, the sole employee handles all assigned processes
        if (isSingleResourceBrand(req.brandId) && brandProcessAssignments.get(bpKey)?.includes(e.employeeId)) {
          return true;
        }
        return false;
      });
      const allocatedStaff = allocatedEntries.length;

      if (allocatedStaff < req.minimumStaff) {
        // Collect reasons for unallocated assigned employees
        const unavailableReasons: string[] = [];
        let hasOverlap = false;

        for (const empId of assignedEmpIds) {
          const emp = employeeMap.get(empId);
          if (!emp) continue;

          // Check if this employee was allocated to this requirement
          if (allocatedEntries.some((e) => e.employeeId === empId)) {
            continue;
          }

          // Check if working elsewhere today
          const workingOther = workingEntries.find(
            (e) => e.employeeId === empId && e.brandId !== req.brandId
          );
          if (workingOther) {
            hasOverlap = true;
            const otherBrand = brandMap.get(workingOther.brandId || '')?.name || workingOther.brandId;
            const otherProc = processMap.get(workingOther.processId || '')?.name || workingOther.processId;
            unavailableReasons.push(`${emp.name} is already working on ${otherBrand} ${otherProc}`);
            continue;
          }

          // Check unavailability
          const unavail = getUnavailability(emp, dateStr, input.availabilities);
          if (unavail) {
            unavailableReasons.push(`${emp.name} is unavailable (${unavail.type}: ${unavail.reason})`);
          } else {
            unavailableReasons.push(`${emp.name} was not scheduled`);
          }
        }

        let conflictType: ConflictTypeEnum = 'COVERAGE_GAP';
        if (hasOverlap) {
          conflictType = 'OVERLAP';
        } else if (allocatedStaff > 0) {
          conflictType = 'INSUFFICIENT_STAFF';
        } else {
          conflictType = 'COVERAGE_GAP';
        }

        let prefix = '';
        if (conflictType === 'OVERLAP') {
          prefix = `Overlap conflict: ${allocatedStaff} of ${req.minimumStaff} required staff allocated for ${req.brandName} ${req.processName} on ${dateStr}.`;
        } else if (conflictType === 'COVERAGE_GAP') {
          prefix = `Coverage gap: 0 of ${req.minimumStaff} required staff allocated for ${req.brandName} ${req.processName} on ${dateStr}.`;
        } else {
          prefix = `Insufficient staff: ${allocatedStaff} of ${req.minimumStaff} required staff allocated for ${req.brandName} ${req.processName} on ${dateStr}.`;
        }

        const message =
          unavailableReasons.length > 0
            ? `${prefix} ${unavailableReasons.join('; ')}.`
            : prefix;

        // Check if an availability/overlap conflict was already recorded for this brand+process on this date
        const existingIdx = conflicts.findIndex(
          (c) => c.date === dateStr && c.brandId === req.brandId && c.processId === req.processId
        );
        if (existingIdx !== -1) {
          // If a requirement conflict also occurred, augment message or preserve single conflict invariant
          conflicts[existingIdx].message += ` ${message}`;
          continue;
        }

        conflicts.push({
          date: dateStr,
          brandId: req.brandId,
          processId: req.processId,
          type: conflictType,
          requiredStaff: req.minimumStaff,
          availableStaff: allocatedStaff,
          message,
        });
      }
    }

    // 4. Check Preference Violations (Warning)
    for (const w of workingEntries) {
      const emp = employeeMap.get(w.employeeId);
      if (!emp) continue;
      const violatedPref = (empPreferences.get(w.employeeId) || []).find(
        (p: any) => p.type === 'PREFERRED_OFF_DAY' && p.dayOfWeek === weekday
      );
      if (violatedPref && w.brandId && w.processId) {
        const brandName = brandMap.get(w.brandId)?.name || w.brandId;
        const procName = processMap.get(w.processId)?.name || w.processId;
        const matchingReq = dailyReqs.find((r) => r.brandId === w.brandId && r.processId === w.processId);
        const reqStaff = matchingReq ? matchingReq.minimumStaff : 1;
        const bpKey = `${w.brandId}:${w.processId}`;
        const allocatedCount = workingEntries.filter(
          (e) =>
            e.brandId === w.brandId &&
            (e.processId === w.processId ||
              (isSingleResourceBrand(w.brandId!) && brandProcessAssignments.get(bpKey)?.includes(e.employeeId)))
        ).length;

        conflicts.push({
          date: dateStr,
          brandId: w.brandId,
          processId: w.processId,
          type: 'PREFERENCE_VIOLATION',
          severity: 'WARNING',
          requiredStaff: reqStaff,
          availableStaff: allocatedCount,
          message: `Preference warning: ${emp.name} prefers day ${weekday} off, but was scheduled for mandatory coverage on ${brandName} ${procName} on ${dateStr}.`,
        });
      }
    }
  }

  // Invariant Assertion: At most one conflict per (date, brand, process, severity) requirement
  const conflictKeys = new Set<string>();
  for (const c of conflicts) {
    const key = `${c.date}_${c.brandId}_${c.processId}_${c.severity || 'ERROR'}`;
    if (conflictKeys.has(key)) {
      throw new Error(
        `Validator Invariant Violation: At most one conflict allowed per (date, brand, process, severity). Found duplicate on ${key} (${c.type}).`
      );
    }
    conflictKeys.add(key);
  }

  // Sort conflicts deterministically
  conflicts.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.brandId !== b.brandId) return a.brandId.localeCompare(b.brandId);
    if (a.processId !== b.processId) return a.processId.localeCompare(b.processId);
    return a.type.localeCompare(b.type);
  });

  return conflicts;
}
