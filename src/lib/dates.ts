/**
 * Timezone-safe date math utilities.
 * All streak/day calculations use the user's local timezone.
 * Midnight = start of local day (00:00:00.000).
 */

/** Get start of today in local timezone */
export function startOfToday(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get start of a specific date in local timezone */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Difference in calendar days between two dates (local timezone).
 *  Positive if a > b. Returns 0 for same calendar day. */
export function diffCalendarDays(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcA - utcB) / 86_400_000);
}

/** Is date the same calendar day as another? */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Is iso string today? */
export function isToday(iso: string, now: Date = new Date()): boolean {
  return isSameDay(new Date(iso), now);
}

/** Number of calendar days since start (minimum 1 on the start day itself).
 *  Uses local midnight boundaries. */
export function daysSince(startISO: string, now: Date = new Date()): number {
  const start = new Date(startISO);
  const days = diffCalendarDays(startOfToday(now), startOfToday(start));
  return Math.max(0, days);
}

/** Number of calendar days until deadline. Negative if past. */
export function daysUntil(deadlineISO: string, now: Date = new Date()): number {
  const deadline = new Date(deadlineISO);
  return diffCalendarDays(startOfDay(deadline), startOfToday(now));
}

/** Returns local date string key: "YYYY-MM-DD" */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse ISO string, returns Date */
export function parseISO(iso: string): Date {
  return new Date(iso);
}

/** ISO string from Date */
export function toISO(date: Date): string {
  return date.toISOString();
}

/** Add calendar days to a date */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Get the start of the week (Monday) for a given date */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  d.setDate(d.getDate() + diff);
  return d;
}

/** Is this a leap year? */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Days in a given month (0-indexed month) */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Generate a list of day keys from start to end (inclusive) */
export function dayKeyRange(startISO: string, endISO: string): string[] {
  const keys: string[] = [];
  let current = startOfDay(new Date(startISO));
  const end = startOfDay(new Date(endISO));
  while (current <= end) {
    keys.push(dayKey(current));
    current = addDays(current, 1);
  }
  return keys;
}

/** Returns the start of today as an ISO string */
export function todayISO(): string {
  return startOfToday().toISOString();
}

/** Format relative time label: "47d", "3h", "23m" */
export function formatElapsed(startISO: string, now: Date = new Date()): {
  days: number;
  hours: number;
  minutes: number;
  label: string;
} {
  const start = new Date(startISO);
  const diffMs = now.getTime() - start.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  let label: string;
  if (days > 0) {
    label = `${days}d ${hours}h`;
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m`;
  } else {
    label = `${minutes}m`;
  }

  return { days, hours, minutes, label };
}