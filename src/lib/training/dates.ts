import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { TZDate } from "@date-fns/tz";

/**
 * Calendar dates are handled as plain "yyyy-MM-dd" strings everywhere. They are
 * never converted through UTC, so a session planned for Tuesday stays on
 * Tuesday regardless of where the server or browser happens to be.
 */
export type DateString = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: unknown): value is DateString {
  return typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(parseISO(value).getTime());
}

/** Today's calendar date in an IANA timezone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): DateString {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  }
}

/** Current hour (0–23) in an IANA timezone, for greetings. */
export function hourInTimeZone(timeZone: string, now: Date = new Date()): number {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now));
  } catch {
    return now.getUTCHours();
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const toStr = (d: Date): DateString => format(d, "yyyy-MM-dd");

export function addDaysStr(date: DateString, days: number): DateString {
  return toStr(addDays(parseISO(date), days));
}

export function addMonthsStr(date: DateString, months: number): DateString {
  return toStr(addMonths(parseISO(date), months));
}

/** Monday of the week containing `date`. */
export function weekStart(date: DateString): DateString {
  return toStr(startOfWeek(parseISO(date), { weekStartsOn: 1 }));
}

export function weekDays(start: DateString): DateString[] {
  return Array.from({ length: 7 }, (_, i) => addDaysStr(start, i));
}

export function monthStart(date: DateString): DateString {
  return toStr(startOfMonth(parseISO(date)));
}

export function monthEnd(date: DateString): DateString {
  return toStr(endOfMonth(parseISO(date)));
}

/** Monday-aligned weeks covering the whole month that contains `date`. */
export function monthGrid(date: DateString): DateString[][] {
  const first = weekStart(monthStart(date));
  const last = monthEnd(date);
  const weeks: DateString[][] = [];
  for (let start = first; start <= last; start = addDaysStr(start, 7)) weeks.push(weekDays(start));
  return weeks;
}

export function daysBetween(from: DateString, to: DateString): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

export function formatDate(date: DateString, pattern = "EEE, MMM d"): string {
  return format(parseISO(date), pattern);
}

/** The last `count` Monday week-starts, oldest first, ending with the week of `today`. */
export function lastWeekStarts(today: DateString, count: number): DateString[] {
  const current = weekStart(today);
  return Array.from({ length: count }, (_, i) => addDaysStr(current, -7 * (count - 1 - i)));
}

/** The last `count` month keys ("yyyy-MM"), oldest first, ending with the month of `today`. */
export function lastMonthKeys(today: DateString, count: number): string[] {
  const start = monthStart(today);
  return Array.from({ length: count }, (_, i) => addMonthsStr(start, -(count - 1 - i)).slice(0, 7));
}

/** Combine a local calendar date and wall-clock time in a timezone into an ISO instant. */
export function zonedDateTimeToIso(date: DateString, time: string, timeZone: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new TZDate(y, mo - 1, d, h, mi, 0, timeZone).toISOString();
}
