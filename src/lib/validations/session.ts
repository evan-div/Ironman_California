import { z } from "zod";
import { DISTANCE_UNITS, PLAN_TYPES, type PlannedSession, type PlanType, type Profile } from "@/types";
import { formatClock, parseDuration } from "@/lib/training/duration";
import { distanceInputValue, toMeters } from "@/lib/training/units";
import { defaultDistanceUnit, supportsDistance } from "@/lib/training/disciplines";
import { easyBikeWorkout } from "@/lib/training/seed-data";
import { dateString, optionalDurationString, optionalPositiveDistanceString, toTextOrNull } from "./common";
import { INDOOR_OPTIONS } from "./activity";

/** keep = leave any existing structure untouched */
export const STRUCTURE_OPTIONS = ["none", "easy_aerobic", "easy_endurance", "keep"] as const;

export const sessionFormSchema = z
  .object({
    session_date: dateString,
    activity_type: z.enum(PLAN_TYPES),
    title: z.string().trim().min(1, "Give it a title").max(160),
    description: z.string().max(2000),
    duration: optionalDurationString,
    duration_max: optionalDurationString,
    distance: optionalPositiveDistanceString,
    distance_unit: z.enum(DISTANCE_UNITS),
    indoor: z.enum(INDOOR_OPTIONS),
    structure: z.enum(STRUCTURE_OPTIONS),
  })
  .superRefine((v, ctx) => {
    const min = parseDuration(v.duration);
    const max = parseDuration(v.duration_max);
    if (max != null && min == null) {
      ctx.addIssue({ code: "custom", path: ["duration"], message: "Add a duration before setting an upper bound" });
    } else if (max != null && min != null && max < min) {
      ctx.addIssue({ code: "custom", path: ["duration_max"], message: "The upper bound must be at least the duration" });
    }
    if ((v.structure === "easy_aerobic" || v.structure === "easy_endurance") && (min == null || min < 20 * 60)) {
      ctx.addIssue({ code: "custom", path: ["structure"], message: "A structured ride needs at least 20 minutes" });
    }
  });

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

type Prefs = Pick<Profile, "swim_unit" | "distance_unit" | "default_bike_indoor">;

const PLAN_TITLES: Record<PlanType, string> = {
  swim: "Swim",
  bike: "Ride",
  run: "Run",
  strength: "Strength",
  recovery: "Recovery",
  other: "Workout",
  rest: "Rest day",
};

export const defaultPlanTitle = (type: PlanType) => PLAN_TITLES[type];

export function emptySessionForm(prefs: Prefs, date: string, type: PlanType = "bike"): SessionFormValues {
  return {
    session_date: date,
    activity_type: type,
    title: "",
    description: "",
    duration: "",
    duration_max: "",
    distance: "",
    distance_unit: defaultDistanceUnit(type, prefs),
    indoor: type === "bike" ? (prefs.default_bike_indoor ? "indoor" : "outdoor") : "unset",
    structure: "none",
  };
}

export function sessionToForm(s: PlannedSession, prefs: Prefs): SessionFormValues {
  const unit = s.planned_distance_unit ?? defaultDistanceUnit(s.activity_type, prefs);
  return {
    session_date: s.session_date,
    activity_type: s.activity_type,
    title: s.title,
    description: s.description ?? "",
    duration: s.planned_duration_seconds == null ? "" : formatClock(s.planned_duration_seconds, true),
    duration_max: s.planned_duration_max_seconds == null ? "" : formatClock(s.planned_duration_max_seconds, true),
    distance: distanceInputValue(s.planned_distance_meters, unit),
    distance_unit: unit,
    indoor: s.is_indoor == null ? "unset" : s.is_indoor ? "indoor" : "outdoor",
    structure: s.structured_workout ? "keep" : "none",
  };
}

export function sessionFormToRow(v: SessionFormValues) {
  const type = v.activity_type;
  const isRest = type === "rest";
  const duration = isRest ? null : parseDuration(v.duration);
  const durationMax = isRest ? null : parseDuration(v.duration_max);
  const hasDistance = supportsDistance(type) && v.distance !== "";
  const usesIndoor = type === "bike" || type === "run" || type === "other";

  const row = {
    session_date: v.session_date,
    activity_type: type,
    title: v.title.trim(),
    description: toTextOrNull(v.description),
    planned_duration_seconds: duration,
    planned_duration_max_seconds: durationMax != null && durationMax !== duration ? durationMax : null,
    planned_distance_meters: hasDistance ? Math.round(toMeters(Number(v.distance), v.distance_unit) * 100) / 100 : null,
    planned_distance_unit: hasDistance ? v.distance_unit : null,
    is_indoor: usesIndoor && v.indoor !== "unset" ? v.indoor === "indoor" : null,
  };

  // "keep" leaves the stored structure alone; anything else replaces it.
  if (type === "bike" && v.structure === "keep") return row;
  const structured =
    type === "bike" && duration != null && (v.structure === "easy_aerobic" || v.structure === "easy_endurance")
      ? easyBikeWorkout(Math.round(duration / 60), v.structure === "easy_aerobic" ? "aerobic" : "endurance")
      : null;
  return { ...row, structured_workout: structured };
}
