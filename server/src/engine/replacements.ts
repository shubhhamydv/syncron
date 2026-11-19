/**
 * Pure Replacement Finder Engine.
 * NO Prisma, NO Express, NO I/O, NO Date.now().
 *
 * Rules:
 * Returns eligible employees who:
 * 1. Are assigned to that process on ANY brand.
 * 2. Are not unavailable that day (no weekly off, no approved leave/comp-off).
 * 3. Are not already WORKING anywhere on that day.
 * 4. Sorts candidates by fewest working days in the month so far (up to target date),
 *    tie-breaking by employee ID for determinism.
 */

import { EngineInput, ReplacementCandidate, RosterEntryDraft } from './types';
import { getUnavailability } from './availability';
import { toDateString } from './dates';

export function findReplacements(
  input: EngineInput,
  entries: RosterEntryDraft[],
  target: { date: string; brandId: string; processId: string }
): ReplacementCandidate[] {
  const targetDateStr = toDateString(target.date);
  const brandMap = new Map(input.brands.map((b) => [b.id, b]));
  const activeEmployees = input.employees.filter((e) => e.status === 'ACTIVE');

  // Identify all employees assigned to the requested process across ANY brand
  const processEmpIds = new Set(
    input.assignments
      .filter((a) => a.processId === target.processId)
      .map((a) => a.employeeId)
  );

  // Set of employee IDs already WORKING anywhere on target date
  const workingTodayEmpIds = new Set(
    entries
      .filter((e) => toDateString(e.date) === targetDateStr && e.status === 'WORKING')
      .map((e) => e.employeeId)
  );

  // Calculate working days in the month so far (date <= targetDateStr) for each employee
  const workingDaysSoFarMap = new Map<string, number>();
  for (const e of entries) {
    if (e.status === 'WORKING' && toDateString(e.date) <= targetDateStr) {
      workingDaysSoFarMap.set(
        e.employeeId,
        (workingDaysSoFarMap.get(e.employeeId) || 0) + 1
      );
    }
  }

  const eligibleCandidates: ReplacementCandidate[] = [];

  for (const emp of activeEmployees) {
    // 1. Must be qualified/assigned for this process on some brand
    if (!processEmpIds.has(emp.id)) continue;

    // 2. Must not be already WORKING anywhere today
    if (workingTodayEmpIds.has(emp.id)) continue;

    // 3. Must not be unavailable (no weekly off, no approved leave or comp-off)
    const unavail = getUnavailability(emp, targetDateStr, input.availabilities);
    if (unavail !== null) continue;

    // Find primary assigned brand for display context
    const primaryAssignment = input.assignments.find((a) => a.employeeId === emp.id);
    const primaryBrand = primaryAssignment ? brandMap.get(primaryAssignment.brandId) : undefined;

    eligibleCandidates.push({
      employeeId: emp.id,
      employeeName: emp.name,
      email: emp.email,
      primaryBrandId: primaryBrand?.id,
      primaryBrandName: primaryBrand?.name,
      workingDaysSoFar: workingDaysSoFarMap.get(emp.id) || 0,
    });
  }

  // Sort by fewest working days so far, tie-break by employeeId
  eligibleCandidates.sort((a, b) => {
    if (a.workingDaysSoFar !== b.workingDaysSoFar) {
      return a.workingDaysSoFar - b.workingDaysSoFar;
    }
    return a.employeeId.localeCompare(b.employeeId);
  });

  return eligibleCandidates;
}
