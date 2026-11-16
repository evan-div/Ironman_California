import { z } from "zod";
import { ACTIVITY_TYPES, DISTANCE_UNITS, type Activity, type ActivityType, type Profile } from "@/types";
import { parseDuration, formatClock } from "@/lib/training/duration";
import { distanceInputValue, toMeters } from "@/lib/training/units";
import { defaultDistanceUnit, supportsDistance } from "@/lib/training/disciplines";
import { zonedDateTimeToIso } from "@/lib/training/dates";
import {
  dateString,
  optionalDurationString,
  optionalNumberString,
  optionalPositiveDistanceString,
  toNumberOrNull,
  toTextOrNull,
} from "./common";

export const INDOOR_OPTIONS = ["unset", "indoor", "outdoor"] as const;

/** The activity form as the athlete types it. Converted to a row by `activityFormToRow`. */
export const activityFormSchema = z
  .object({
    activity_date: dateString,
    start_time: z.string().refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Enter a valid time"),
    activity_type: z.enum(ACTIVITY_TYPES),
    title: z.string().trim().min(1, "Give it a title").max(160, "Keep the title under 160 characters"),
    duration: optionalDurationString,
    distance: optionalPositiveDistanceString,
    distance_unit: z.enum(DISTANCE_UNITS),
    rpe: optionalNumberString({ min: 1, max: 10, integer: true, label: "RPE" }),
    avg_heart_rate: optionalNumberString({ min: 20, max: 260, integer: true, label: "Average heart rate" }),
    max_heart_rate: optionalNumberString({ min: 20, max: 260, integer: true, label: "Maximum heart rate" }),
    notes: z.string().max(5000, "Notes are limited to 5,000 characters"),
    indoor: z.enum(INDOOR_OPTIONS),
    swim_environment: z.enum(["pool", "open_water"]),
    avg_power_watts: optionalNumberString({ min: 0, max: 2500, integer: true, label: "Average power" }),
    normalized_power_watts: optionalNumberString({ min: 0, max: 2500, integer: true, label: "Normalized power" }),
    avg_cadence_rpm: optionalNumberString({ min: 0, max: 300, integer: true, label: "Cadence" }),
    trainer_platform: z.string().max(60),
    is_run_walk: z.boolean(),
    strength_focus: z.string().max(120),
    recovery_subtype: z.string().max(60),
    planned_session_id: z.union([z.uuid(), z.literal("")]),
  })
  .superRefine((v, ctx) => {
    if (v.avg_heart_rate !== "" && v.max_heart_rate !== "" && Number(v.max_heart_rate) < Number(v.avg_heart_rate)) {
      ctx.addIssue({ code: "custom", path: ["max_heart_rate"], message: "Max heart rate can't be lower than the average" });
    }
  });

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

const DEFAULT_TITLES: Record<ActivityType, string> = {
  swim: "Swim",
  bike: "Ride",
  run: "Run",
  strength: "Strength",
  recovery: "Recovery",
  other: "Workout",
};

export function defaultTitle(type: ActivityType): string {
  return DEFAULT_TITLES[type];
}

type Prefs = Pick<
  Profile,
  "swim_unit" | "distance_unit" | "default_activity_type" | "default_bike_indoor" | "default_trainer_platform" | "default_swim_environment"
>;

export function emptyActivityForm(prefs: Prefs, date: string, type: ActivityType = prefs.default_activity_type): ActivityFormValues {
  return {
    activity_date: date,
    start_time: "",
    activity_type: type,
    title: "",
    duration: "",
    distance: "",
    distance_unit: defaultDistanceUnit(type, prefs),
    rpe: "",
    avg_heart_rate: "",
    max_heart_rate: "",
    notes: "",
    indoor: type === "bike" ? (prefs.default_bike_indoor ? "indoor" : "outdoor") : "unset",
    swim_environment: prefs.default_swim_environment,
    avg_power_watts: "",
    normalized_power_watts: "",
    avg_cadence_rpm: "",
    trainer_platform: type === "bike" && prefs.default_bike_indoor ? (prefs.default_trainer_platform ?? "") : "",
    is_run_walk: false,
    strength_focus: "",
    recovery_subtype: "",
    planned_session_id: "",
  };
}

const str = (n: number | null) => (n == null ? "" : String(n));

export function activityToForm(a: Activity, prefs: Prefs): ActivityFormValues {
  const unit = a.distance_unit ?? defaultDistanceUnit(a.activity_type, prefs);
  return {
    activity_date: a.activity_date,
    start_time: a.start_time ? a.start_time.slice(0, 5) : "",
    activity_type: a.activity_type,
    title: a.title,
    duration: a.duration_seconds == null ? "" : formatClock(a.duration_seconds, true),
    distance: distanceInputValue(a.distance_meters, unit),
    distance_unit: unit,
    rpe: str(a.rpe),
    avg_heart_rate: str(a.avg_heart_rate),
    max_heart_rate: str(a.max_heart_rate),
    notes: a.notes ?? "",
    indoor: a.is_indoor == null ? "unset" : a.is_indoor ? "indoor" : "outdoor",
    swim_environment: a.swim_environment ?? prefs.default_swim_environment,
    avg_power_watts: str(a.avg_power_watts),
    normalized_power_watts: str(a.normalized_power_watts),
    avg_cadence_rpm: str(a.avg_cadence_rpm),
    trainer_platform: a.trainer_platform ?? "",
    is_run_walk: a.is_run_walk ?? false,
    strength_focus: a.strength_focus ?? "",
    recovery_subtype: a.recovery_subtype ?? "",
    planned_session_id: a.planned_session_id ?? "",
  };
}

/**
 * Convert validated form values into database columns. Fields that do not apply
 * to the chosen activity type are cleared. Duration and distance are stored
 * exactly as given: neither is ever derived from the other.
 */
export function activityFormToRow(v: ActivityFormValues, timeZone: string) {
  const type = v.activity_type;
  const hasDistance = supportsDistance(type) && v.distance !== "";
  const usesIndoor = type === "bike" || type === "run" || type === "other";
  const isBike = type === "bike";
  return {
    activity_date: v.activity_date,
    start_time: v.start_time === "" ? null : v.start_time,
    started_at: v.start_time === "" ? null : zonedDateTimeToIso(v.activity_date, v.start_time, timeZone),
    activity_type: type,
    title: v.title.trim(),
    duration_seconds: parseDuration(v.duration),
    distance_meters: hasDistance ? Math.round(toMeters(Number(v.distance), v.distance_unit) * 100) / 100 : null,
    distance_unit: hasDistance ? v.distance_unit : null,
    rpe: toNumberOrNull(v.rpe),
    avg_heart_rate: toNumberOrNull(v.avg_heart_rate),
    max_heart_rate: toNumberOrNull(v.max_heart_rate),
    notes: toTextOrNull(v.notes),
    is_indoor: usesIndoor && v.indoor !== "unset" ? v.indoor === "indoor" : null,
    swim_environment: type === "swim" ? v.swim_environment : null,
    avg_power_watts: isBike ? toNumberOrNull(v.avg_power_watts) : null,
    normalized_power_watts: isBike ? toNumberOrNull(v.normalized_power_watts) : null,
    avg_cadence_rpm: isBike ? toNumberOrNull(v.avg_cadence_rpm) : null,
    trainer_platform: isBike ? toTextOrNull(v.trainer_platform) : null,
    is_run_walk: type === "run" ? v.is_run_walk : null,
    strength_focus: type === "strength" ? toTextOrNull(v.strength_focus) : null,
    recovery_subtype: type === "recovery" ? toTextOrNull(v.recovery_subtype) : null,
    planned_session_id: v.planned_session_id === "" ? null : v.planned_session_id,
  };
}
