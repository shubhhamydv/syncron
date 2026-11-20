/**
 * Pure Operating Rules & Coverage Requirements Resolver.
 * NO Prisma, NO Express, NO I/O, NO Date.now().
 *
 * Rules:
 * - A rule operates only if:
 *     1. The weekday is in workingDays (0=Sun..6=Sat).
 *     2. (The date is not a holiday OR operatesOnPublicHolidays is true).
 * - Coverage Requirement precedence:
 *     Date-specific override > Weekday-specific override > Default rule.
 * - The brand calendar and the employee calendar are separate concepts and must never be merged.
 */

import { DailyRequirement, EngineInput } from './types';
import { getUTCDayOfWeek, isHoliday, toDateString } from './dates';

/**
 * Resolves the operational coverage requirements for a specific date.
 */
export function resolveDailyRequirements(dateStr: string, input: EngineInput): DailyRequirement[] {
  const targetDateStr = toDateString(dateStr);
  const weekday = getUTCDayOfWeek(targetDateStr);
  const holiday = isHoliday(targetDateStr, input.holidays);

  // Map active brands for fast lookup
  const activeBrandMap = new Map(
    input.brands.filter((b) => b.status === 'ACTIVE').map((b) => [b.id, b])
  );
  const processMap = new Map(input.processes.map((p) => [p.id, p]));

  const requirements: DailyRequirement[] = [];
  const resolvedBrandProcesses = new Set<string>();

  for (const rule of input.operatingRules) {
    const brand = activeBrandMap.get(rule.brandId);
    if (!brand) continue;

    const proc = processMap.get(rule.processId);
    if (!proc) continue;

    const bpKey = `${rule.brandId}:${rule.processId}`;
    if (resolvedBrandProcesses.has(bpKey)) {
      continue; // Guarantee exactly one requirement resolution per brand+process per day
    }

    // 1. Brand Calendar Check: Working day of week
    if (!rule.workingDays.includes(weekday)) {
      continue;
    }

    // 2. Brand Calendar Check: Public Holiday operation
    if (holiday && !rule.operatesOnPublicHolidays) {
      continue;
    }

    // 3. Resolve Coverage Requirement with precedence:
    // Date-specific > Weekday-specific > Default
    const matchingReqs = input.coverageRequirements.filter(
      (r) => r.brandId === rule.brandId && r.processId === rule.processId
    );

    const dateSpecific = matchingReqs.find((r) => r.date && toDateString(r.date) === targetDateStr);
    const weekdaySpecific = matchingReqs.find(
      (r) =>
        !r.date &&
        r.dayOfWeek !== null &&
        r.dayOfWeek !== undefined &&
        r.dayOfWeek === weekday
    );
    const defaultReq = matchingReqs.find(
      (r) => !r.date && (r.dayOfWeek === null || r.dayOfWeek === undefined)
    );

    let minimumStaff = 1; // standard minimum staff fallback
    if (dateSpecific) {
      minimumStaff = dateSpecific.minimumStaff;
    } else if (weekdaySpecific) {
      minimumStaff = weekdaySpecific.minimumStaff;
    } else if (defaultReq) {
      minimumStaff = defaultReq.minimumStaff;
    }

    if (minimumStaff > 0) {
      resolvedBrandProcesses.add(bpKey);
      requirements.push({
        brandId: brand.id,
        processId: proc.id,
        brandName: brand.name,
        processName: proc.name,
        minimumStaff,
      });
    }
  }

  // Deterministic order: sort by brandId, then processId
  requirements.sort((a, b) => {
    if (a.brandId !== b.brandId) return a.brandId.localeCompare(b.brandId);
    return a.processId.localeCompare(b.processId);
  });

  return requirements;
}
