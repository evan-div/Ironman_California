import type { Activity, PlannedSession, Profile } from "@/types";
import { formatDuration, formatDurationRange } from "./duration";
import { formatDistance } from "./units";
import { formatRunPace, formatSpeed, formatSwimPace, runPaceSeconds, speedPerHour, swimPaceSecondsPer100 } from "./pace";
import { defaultDistanceUnit } from "./disciplines";

type Prefs = Pick<Profile, "swim_unit" | "distance_unit">;

/** The unit an activity's distance is shown in: what the athlete entered, else their preference. */
export function activityDisplayUnit(a: Pick<Activity, "activity_type" | "distance_unit">, prefs: Prefs) {
  return a.distance_unit ?? defaultDistanceUnit(a.activity_type, prefs);
}

/** Pace or speed, only when both duration and distance were recorded. */
export function activityPace(a: Pick<Activity, "activity_type" | "duration_seconds" | "distance_meters" | "distance_unit">, prefs: Prefs): string | null {
  const unit = activityDisplayUnit(a, prefs);
  if (a.activity_type === "swim") {
    const u = unit === "m" ? "m" : "yd";
    return formatSwimPace(swimPaceSecondsPer100(a.duration_seconds, a.distance_meters, u), u);
  }
  const long = unit === "km" ? "km" : "mi";
  if (a.activity_type === "run") return formatRunPace(runPaceSeconds(a.duration_seconds, a.distance_meters, long), long);
  if (a.activity_type === "bike") return formatSpeed(speedPerHour(a.duration_seconds, a.distance_meters, long), long);
  return null;
}

/** Short facts for list rows, e.g. ["1,000 yd"] or ["35m", "9.2 mi", "15.8 mph"]. Only recorded values appear. */
export function activityFacts(a: Activity, prefs: Prefs): string[] {
  const facts: string[] = [];
  if (a.duration_seconds != null) facts.push(formatDuration(a.duration_seconds));
  const distance = formatDistance(a.distance_meters, activityDisplayUnit(a, prefs));
  if (distance) facts.push(distance);
  const pace = activityPace(a, prefs);
  if (pace) facts.push(pace);
  if (a.activity_type === "recovery" && a.recovery_subtype) facts.push(a.recovery_subtype);
  if (a.activity_type === "strength" && a.strength_focus) facts.push(a.strength_focus);
  return facts;
}

export function sessionFacts(s: PlannedSession, prefs: Prefs): string[] {
  const facts: string[] = [];
  if (s.planned_duration_seconds != null) facts.push(formatDurationRange(s.planned_duration_seconds, s.planned_duration_max_seconds));
  const distance = formatDistance(s.planned_distance_meters, s.planned_distance_unit ?? defaultDistanceUnit(s.activity_type, prefs));
  if (distance) facts.push(distance);
  if (s.is_indoor != null && s.activity_type !== "rest") facts.push(s.is_indoor ? "Indoor" : "Outdoor");
  return facts;
}
