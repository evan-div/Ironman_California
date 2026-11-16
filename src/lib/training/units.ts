import type { DistanceUnit } from "@/types";

export const METERS_PER: Record<DistanceUnit, number> = {
  yd: 0.9144,
  m: 1,
  mi: 1609.344,
  km: 1000,
};

export const UNIT_LABEL: Record<DistanceUnit, string> = { yd: "yd", m: "m", mi: "mi", km: "km" };

export function toMeters(value: number, unit: DistanceUnit): number {
  return value * METERS_PER[unit];
}

export function fromMeters(meters: number, unit: DistanceUnit): number {
  return meters / METERS_PER[unit];
}

export const yardsToMeters = (yards: number) => toMeters(yards, "yd");
export const metersToYards = (meters: number) => fromMeters(meters, "yd");

/** Round to at most `digits` decimals, without trailing zeros or float noise. */
export function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/**
 * Format a stored distance in the given unit. Short units (yd/m) are shown as
 * whole numbers, long units (mi/km) with up to two decimals.
 */
export function formatDistance(meters: number | null | undefined, unit: DistanceUnit): string | null {
  if (meters == null) return null;
  const value = fromMeters(meters, unit);
  const digits = unit === "yd" || unit === "m" ? 0 : 2;
  return `${roundTo(value, digits).toLocaleString("en-US", { maximumFractionDigits: digits })} ${UNIT_LABEL[unit]}`;
}

/** Value to prefill an input with when editing a stored distance. */
export function distanceInputValue(meters: number | null | undefined, unit: DistanceUnit): string {
  if (meters == null) return "";
  return String(roundTo(fromMeters(meters, unit), unit === "yd" || unit === "m" ? 0 : 2));
}
