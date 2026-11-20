import { format, parseISO, getDay, getDaysInMonth } from 'date-fns';

export interface DayHeader {
  dayNumber: number;
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  dayName: string; // Sun, Mon, etc.
  isWeekend: boolean;
}

export function getMonthDays(year: number, month: number): DayHeader[] {
  const daysCount = getDaysInMonth(new Date(year, month - 1));
  const days: DayHeader[] = [];

  for (let d = 1; d <= daysCount; d++) {
    const padDay = String(d).padStart(2, '0');
    const padMonth = String(month).padStart(2, '0');
    const dateStr = `${year}-${padMonth}-${padDay}`;
    const date = new Date(year, month - 1, d);
    const dayOfWeek = getDay(date);
    const dayName = format(date, 'EEE');

    days.push({
      dayNumber: d,
      dateStr,
      dayOfWeek,
      dayName,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  return days;
}

export function formatShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatWeekdayDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEEE, MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function getBrandInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 3).toUpperCase();
  return parts.map(p => p[0]).join('').substring(0, 3).toUpperCase();
}
