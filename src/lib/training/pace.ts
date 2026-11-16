import type { DistanceUnit } from "@/types";
import { fromMeters } from "./units";
import { formatClock } from "./duration";

/**
 * Pace helpers. Every function returns null unless BOTH duration and distance
 * are present — nothing is ever inferred from a missing value.
 */

function valid(durationSeconds: number | null | undefined, distanceMeters: number | null | undefined) {
  return durationSeconds != null && distanceMeters != null && durationSeconds > 0 && distanceMeters > 0;
}

/** Seconds per 100 yd or 100 m. */
export function swimPaceSecondsPer100(
  durationSeconds: number | null | undefined,
  distanceMeters: number | null | undefined,
  unit: "yd" | "m",
): number | null {
  if (!valid(durationSeconds, distanceMeters)) return null;
  return durationSeconds! / (fromMeters(distanceMeters!, unit) / 100);
}

/** Seconds per mile or kilometre. */
export function runPaceSeconds(
  durationSeconds: number | null | undefined,
  distanceMeters: number | null | undefined,
  unit: "mi" | "km",
): number | null {
  if (!valid(durationSeconds, distanceMeters)) return null;
  return durationSeconds! / fromMeters(distanceMeters!, unit);
}

/** Miles or kilometres per hour. */
export function speedPerHour(
  durationSeconds: number | null | undefined,
  distanceMeters: number | null | undefined,
  unit: "mi" | "km",
): number | null {
  if (!valid(durationSeconds, distanceMeters)) return null;
  return fromMeters(distanceMeters!, unit) / (durationSeconds! / 3600);
}

export function formatSwimPace(secondsPer100: number | null, unit: "yd" | "m"): string | null {
  return secondsPer100 == null ? null : `${formatClock(secondsPer100)} /100${unit}`;
}

export function formatRunPace(secondsPerUnit: number | null, unit: "mi" | "km"): string | null {
  return secondsPerUnit == null ? null : `${formatClock(secondsPerUnit)} /${unit}`;
}

export function formatSpeed(perHour: number | null, unit: "mi" | "km"): string | null {
  return perHour == null ? null : `${perHour.toFixed(1)} ${unit === "mi" ? "mph" : "km/h"}`;
}

export function isLongUnit(unit: DistanceUnit | null): unit is "mi" | "km" {
  return unit === "mi" || unit === "km";
}
