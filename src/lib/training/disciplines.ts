import type { ActivityType, PlanType } from "@/types";

export type DisciplineMeta = {
  label: string;
  /** CSS custom property holding the discipline colour. */
  colorVar: string;
  hex: string;
};

export const DISCIPLINES: Record<PlanType, DisciplineMeta> = {
  swim: { label: "Swim", colorVar: "var(--color-swim)", hex: "#4F9CB8" },
  bike: { label: "Bike", colorVar: "var(--color-bike)", hex: "#C68B43" },
  run: { label: "Run", colorVar: "var(--color-run)", hex: "#6B9C77" },
  strength: { label: "Strength", colorVar: "var(--color-strength)", hex: "#947CB2" },
  recovery: { label: "Recovery", colorVar: "var(--color-recovery)", hex: "#B47B68" },
  other: { label: "Other", colorVar: "var(--color-other)", hex: "#7C8580" },
  rest: { label: "Rest", colorVar: "var(--color-rest)", hex: "#A9AFA6" },
};

export const RECOVERY_SUBTYPES = ["Sauna", "Mobility", "Stretching", "Cold plunge", "Massage", "Yoga"] as const;

export function disciplineLabel(type: ActivityType | PlanType): string {
  return DISCIPLINES[type].label;
}

/** Default distance unit for an activity type given the athlete's preferences. */
export function defaultDistanceUnit(type: ActivityType | PlanType, prefs: { swim_unit: "yd" | "m"; distance_unit: "mi" | "km" }) {
  return type === "swim" ? prefs.swim_unit : prefs.distance_unit;
}

export function supportsDistance(type: ActivityType | PlanType): boolean {
  return type === "swim" || type === "bike" || type === "run" || type === "other";
}
