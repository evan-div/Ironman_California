import type { Database } from "./database";

type Tables = Database["public"]["Tables"];

export const ACTIVITY_TYPES = ["swim", "bike", "run", "strength", "recovery", "other"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const PLAN_TYPES = [...ACTIVITY_TYPES, "rest"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const DISTANCE_UNITS = ["yd", "m", "mi", "km"] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export type SessionStatus = "planned" | "completed" | "skipped";
export type ActivityOrigin = "manual" | "imported";
export type SwimEnvironment = "pool" | "open_water";

export type Profile = Omit<
  Tables["profiles"]["Row"],
  "distance_unit" | "swim_unit" | "default_activity_type" | "default_swim_environment"
> & {
  distance_unit: "mi" | "km";
  swim_unit: "yd" | "m";
  default_activity_type: ActivityType;
  default_swim_environment: SwimEnvironment;
};

export type GoalEvent = Tables["goal_events"]["Row"];
export type TrainingPhase = Tables["training_phases"]["Row"];
export type Milestone = Tables["milestones"]["Row"];
export type Integration = Tables["integrations"]["Row"];

/** One step of a structured workout prescription (stored as JSON on planned sessions). */
export type WorkoutStep = {
  kind: "warmup" | "steady" | "interval" | "cooldown";
  label: string;
  duration_seconds: number;
  /** Primary guide: how it should feel. */
  effort: string;
  /** Optional RPE range on the 1–10 scale. */
  rpe_min?: number;
  rpe_max?: number;
  /** Optional FTP targets. Never required; the athlete's FTP is not assumed. */
  ftp_percent_low?: number | null;
  ftp_percent_high?: number | null;
};

export type StructuredWorkout = {
  version: 1;
  sport: "bike";
  platform_hint?: string;
  steps: WorkoutStep[];
};

export type PlannedSession = Omit<
  Tables["planned_sessions"]["Row"],
  "activity_type" | "status" | "planned_distance_unit" | "structured_workout"
> & {
  activity_type: PlanType;
  status: SessionStatus;
  planned_distance_unit: DistanceUnit | null;
  structured_workout: StructuredWorkout | null;
};

export type Activity = Omit<
  Tables["activities"]["Row"],
  "activity_type" | "distance_unit" | "origin" | "swim_environment"
> & {
  activity_type: ActivityType;
  distance_unit: DistanceUnit | null;
  origin: ActivityOrigin;
  swim_environment: SwimEnvironment | null;
};

export type ActivityInsert = Tables["activities"]["Insert"];
export type PlannedSessionInsert = Tables["planned_sessions"]["Insert"];

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
