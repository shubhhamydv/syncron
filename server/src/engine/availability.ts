/**
 * Pure Employee Availability Engine.
 * NO Prisma, NO Express, NO I/O, NO Date.now().
 *
 * Rules:
 * - Only APPROVED leave and comp-off count. PENDING records are ignored.
 * - startDate and endDate are INCLUSIVE.
 * - Compares by "YYYY-MM-DD" strings in UTC.
 */

import { AvailabilityData, AvailabilityTypeEnum, EmployeeData } from './types';
import { getUTCDayOfWeek, toDateString } from './dates';

export interface UnavailabilityResult {
  type: AvailabilityTypeEnum;
  reason: string;
}

/**
 * Determines whether an employee is unavailable on a specific UTC date.
 * Returns the unavailability reason and type, or null if the employee is free to work.
 */
export function getUnavailability(
  employee: EmployeeData,
  dateStr: string,
  availabilities: AvailabilityData[]
): UnavailabilityResult | null {
  const targetDateStr = toDateString(dateStr);
  const weekday = getUTCDayOfWeek(targetDateStr);

  const empAvailabilities = availabilities.filter(
    (a) => a.employeeId === employee.id && a.status === 'APPROVED'
  );

  // 1. Highest priority: Specific Approved Leave or Comp-Off (INCLUSIVE range)
  for (const av of empAvailabilities) {
    if ((av.type === 'LEAVE' || av.type === 'COMP_OFF') && av.startDate && av.endDate) {
      const startStr = toDateString(av.startDate);
      const endStr = toDateString(av.endDate);

      // INCLUSIVE comparison: startStr <= targetDateStr <= endStr
      if (startStr <= targetDateStr && targetDateStr <= endStr) {
        return {
          type: av.type,
          reason: av.reason || `${av.type} (${startStr} to ${endStr} inclusive)`,
        };
      }
    }
  }

  // 2. Recurring Approved Weekly Off
  for (const av of empAvailabilities) {
    if (av.type === 'WEEKLY_OFF' && av.dayOfWeek !== null && av.dayOfWeek !== undefined) {
      if (av.dayOfWeek === weekday) {
        return {
          type: 'WEEKLY_OFF',
          reason: av.reason || `Recurring weekly off on day ${weekday}`,
        };
      }
    }
  }

  return null;
}
