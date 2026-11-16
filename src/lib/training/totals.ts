import type { Activity, ActivityType, PlannedSession } from "@/types";
import { weekStart, type DateString } from "./dates";
import { fromMeters } from "./units";

/**
 * What counts toward what:
 *  - aerobic time:   swim, bike, run, other
 *  - training time:  aerobic time + strength (always labelled "incl. strength")
 *  - recovery (sauna, mobility…) is tracked but never counted as training time
 */
export const AEROBIC_TYPES: readonly ActivityType[] = ["swim", "bike", "run", "other"];

export function isAerobic(type: string): boolean {
  return (AEROBIC_TYPES as readonly string[]).includes(type);
}

export function countsTowardTraining(type: string): boolean {
  return isAerobic(type) || type === "strength";
}

export type ActivityLike = Pick<Activity, "activity_date" | "activity_type" | "duration_seconds" | "distance_meters">;
export type SessionLike = Pick<
  PlannedSession,
  "session_date" | "activity_type" | "planned_duration_seconds" | "planned_duration_max_seconds" | "status"
>;

export type Totals = {
  /** swim + bike + run + other, seconds */
  aerobicSeconds: number;
  strengthSeconds: number;
  /** aerobic + strength, seconds */
  trainingSeconds: number;
  recoverySeconds: number;
  swimSeconds: number;
  bikeSeconds: number;
  runSeconds: number;
  otherSeconds: number;
  swimMeters: number;
  bikeMeters: number;
  runMeters: number;
  /** all logged activities, including recovery */
  activityCount: number;
  /** activities that have no duration recorded (they contribute 0 seconds) */
  missingDurationCount: number;
};

export function emptyTotals(): Totals {
  return {
    aerobicSeconds: 0,
    strengthSeconds: 0,
    trainingSeconds: 0,
    recoverySeconds: 0,
    swimSeconds: 0,
    bikeSeconds: 0,
    runSeconds: 0,
    otherSeconds: 0,
    swimMeters: 0,
    bikeMeters: 0,
    runMeters: 0,
    activityCount: 0,
    missingDurationCount: 0,
  };
}

/** Sum activities. A missing duration or distance contributes nothing — it is never estimated. */
export function sumActivities(activities: ActivityLike[]): Totals {
  const t = emptyTotals();
  for (const a of activities) {
    const seconds = a.duration_seconds ?? 0;
    const meters = a.distance_meters ?? 0;
    t.activityCount += 1;
    if (a.duration_seconds == null) t.missingDurationCount += 1;
    switch (a.activity_type) {
      case "swim":
        t.swimSeconds += seconds;
        t.swimMeters += meters;
        break;
      case "bike":
        t.bikeSeconds += seconds;
        t.bikeMeters += meters;
        break;
      case "run":
        t.runSeconds += seconds;
        t.runMeters += meters;
        break;
      case "other":
        t.otherSeconds += seconds;
        break;
      case "strength":
        t.strengthSeconds += seconds;
        break;
      case "recovery":
        t.recoverySeconds += seconds;
        break;
    }
  }
  t.aerobicSeconds = t.swimSeconds + t.bikeSeconds + t.runSeconds + t.otherSeconds;
  t.trainingSeconds = t.aerobicSeconds + t.strengthSeconds;
  return t;
}

export function inRange<T>(items: T[], getDate: (item: T) => DateString, from: DateString, to: DateString): T[] {
  return items.filter((i) => getDate(i) >= from && getDate(i) <= to);
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export type WeekTotals = Totals & { weekStart: DateString };

/** Totals for each given Monday week-start (weeks without activities are zero-filled). */
export function weeklyTotals(activities: ActivityLike[], weekStarts: DateString[]): WeekTotals[] {
  const byWeek = groupBy(activities, (a) => weekStart(a.activity_date));
  return weekStarts.map((ws) => ({ weekStart: ws, ...sumActivities(byWeek.get(ws) ?? []) }));
}

export type MonthTotals = Totals & { month: string };

/** Totals for each given "yyyy-MM" month key. */
export function monthlyTotals(activities: ActivityLike[], monthKeys: string[]): MonthTotals[] {
  const byMonth = groupBy(activities, (a) => a.activity_date.slice(0, 7));
  return monthKeys.map((month) => ({ month, ...sumActivities(byMonth.get(month) ?? []) }));
}

/**
 * Trailing average of training seconds over `window` weeks. Entries are null
 * until a full window is available, so the trend never implies data that isn't there.
 */
export function rollingAverage(values: number[], window = 4): (number | null)[] {
  return values.map((_, i) => {
    if (i + 1 < window) return null;
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += values[j];
    return sum / window;
  });
}

export type DisciplineShare = { type: ActivityType; seconds: number; share: number };

/** Share of logged time by discipline (recovery excluded; durations only). */
export function disciplineDistribution(activities: ActivityLike[]): DisciplineShare[] {
  const t = sumActivities(activities);
  const parts: [ActivityType, number][] = [
    ["swim", t.swimSeconds],
    ["bike", t.bikeSeconds],
    ["run", t.runSeconds],
    ["strength", t.strengthSeconds],
    ["other", t.otherSeconds],
  ];
  const total = parts.reduce((s, [, v]) => s + v, 0);
  return parts
    .filter(([, seconds]) => seconds > 0)
    .map(([type, seconds]) => ({ type, seconds, share: total > 0 ? seconds / total : 0 }));
}

/** Planned seconds for one session. A range ("30–35 min") counts as its midpoint. */
export function plannedSessionSeconds(s: Pick<SessionLike, "planned_duration_seconds" | "planned_duration_max_seconds">): number {
  if (s.planned_duration_seconds == null) return 0;
  if (s.planned_duration_max_seconds == null) return s.planned_duration_seconds;
  return Math.round((s.planned_duration_seconds + s.planned_duration_max_seconds) / 2);
}

export type PlannedVsActual = {
  /** planned training seconds: swim/bike/run/other + strength; rest & recovery excluded */
  plannedSeconds: number;
  plannedStrengthSeconds: number;
  /** completed training seconds from logged activities */
  actualSeconds: number;
  actualStrengthSeconds: number;
  plannedCount: number;
};

/** Planned-versus-completed training time for one set of sessions and activities. */
export function plannedVsActual(sessions: SessionLike[], activities: ActivityLike[]): PlannedVsActual {
  let plannedSeconds = 0;
  let plannedStrengthSeconds = 0;
  let plannedCount = 0;
  for (const s of sessions) {
    if (!countsTowardTraining(s.activity_type)) continue;
    const seconds = plannedSessionSeconds(s);
    plannedSeconds += seconds;
    plannedCount += 1;
    if (s.activity_type === "strength") plannedStrengthSeconds += seconds;
  }
  const t = sumActivities(activities);
  return {
    plannedSeconds,
    plannedStrengthSeconds,
    actualSeconds: t.trainingSeconds,
    actualStrengthSeconds: t.strengthSeconds,
    plannedCount,
  };
}

export type WeekPlannedVsActual = PlannedVsActual & { weekStart: DateString };

export function weeklyPlannedVsActual(
  sessions: SessionLike[],
  activities: ActivityLike[],
  weekStarts: DateString[],
): WeekPlannedVsActual[] {
  const sByWeek = groupBy(sessions, (s) => weekStart(s.session_date));
  const aByWeek = groupBy(activities, (a) => weekStart(a.activity_date));
  return weekStarts.map((ws) => ({ weekStart: ws, ...plannedVsActual(sByWeek.get(ws) ?? [], aByWeek.get(ws) ?? []) }));
}

export function swimDistance(meters: number, unit: "yd" | "m"): number {
  return Math.round(fromMeters(meters, unit));
}
