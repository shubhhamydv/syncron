/**
 * Pure UTC Date Utilities for the Scheduling Engine.
 * NO Prisma, NO Express, NO I/O, NO Date.now().
 * All dates are compared by "YYYY-MM-DD" strings or UTC midnight.
 */

import { HolidayData } from './types';

/**
 * Formats a Date or string to a standard "YYYY-MM-DD" string in UTC.
 */
export function toDateString(date: Date | string): string {
  if (typeof date === 'string') {
    // If it's already "YYYY-MM-DD", return it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    const parsed = new Date(date);
    return formatUTCDate(parsed);
  }
  return formatUTCDate(date);
}

function formatUTCDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parses a "YYYY-MM-DD" string into a Date at UTC midnight (00:00:00.000Z).
 */
export function parseUTCDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format for parseUTCDate: "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Returns an array of "YYYY-MM-DD" strings for every date in the given month.
 * @param year e.g. 2026
 * @param month 1-12 (1 = January, 12 = December)
 */
export function monthDates(year: number, month: number): string[] {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Month must be between 1 and 12.`);
  }
  // Days in month: day 0 of month+1 in UTC
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dates: string[] = [];
  const mStr = String(month).padStart(2, '0');

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = String(d).padStart(2, '0');
    dates.push(`${year}-${mStr}-${dStr}`);
  }
  return dates;
}

/**
 * Returns the day of the week in UTC:
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday.
 */
export function getUTCDayOfWeek(dateStr: string): number {
  return parseUTCDate(dateStr).getUTCDay();
}

/**
 * Checks whether the given date is a public holiday.
 */
export function isHoliday(dateStr: string, holidays: HolidayData[]): boolean {
  const target = toDateString(dateStr);
  return holidays.some((h) => toDateString(h.date) === target);
}

/**
 * Retrieves the holiday object for the given date if one exists.
 */
export function getHoliday(dateStr: string, holidays: HolidayData[]): HolidayData | undefined {
  const target = toDateString(dateStr);
  return holidays.find((h) => toDateString(h.date) === target);
}
