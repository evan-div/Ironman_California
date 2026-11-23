import type { StructuredWorkout } from "@/types";
import { yardsToMeters } from "./units";

/**
 * The owner's starter plan for IRONMAN California 2027.
 *
 * This is data, not a migration: it is applied to exactly one athlete, on
 * request, by `applyOwnerSeed` (see src/lib/data/seed.ts). Everything below is
 * taken verbatim from what the athlete provided. Nothing is estimated: the swim
 * has no duration because none was recorded.
 */
export const OWNER_SEED_KEY = "owner-ironman-california-2027-v1";

const min = (m: number) => m * 60;
const hours = (h: number, m = 0) => h * 3600 + m * 60;

export const seedGoalEvent = {
  seed_key: "goal:ironman-california-2027",
  name: "IRONMAN California",
  event_date: "2027-10-24",
  location: "Sacramento, California",
  goal_description: "Finish the full distance in under 14 hours",
  target_finish_seconds: hours(13, 44),
  target_swim_seconds: hours(1, 30),
  target_bike_seconds: hours(7),
  target_run_seconds: hours(5),
  target_transition_seconds: min(14),
  is_primary: true,
};

export const seedPhases = [
  {
    seed_key: "phase:1-get-off-the-couch",
    name: "Operation Get Off the Couch",
    start_date: "2026-11-16",
    end_date: "2026-12-31",
    target_hours_min: 3,
    target_hours_max: 4,
    focus: "Cycling and running consistency, swim maintenance.",
    sort_order: 1,
  },
  {
    seed_key: "phase:2-base-1",
    name: "Base I",
    start_date: "2027-01-01",
    end_date: "2027-02-28",
    target_hours_min: 4,
    target_hours_max: 6,
    focus: "Aerobic foundation.",
    sort_order: 2,
  },
  {
    seed_key: "phase:3-base-2",
    name: "Base II",
    start_date: "2027-03-01",
    end_date: "2027-04-30",
    target_hours_min: 6,
    target_hours_max: 8,
    focus: "Longer aerobic sessions.",
    sort_order: 3,
  },
  {
    seed_key: "phase:4-build-1",
    name: "Build I",
    start_date: "2027-05-01",
    end_date: "2027-06-30",
    target_hours_min: 8,
    target_hours_max: 11,
    focus: "Endurance, bike fueling.",
    sort_order: 4,
  },
  {
    seed_key: "phase:5-build-2",
    name: "Build II",
    start_date: "2027-07-01",
    end_date: "2027-08-31",
    target_hours_min: 10,
    target_hours_max: 13,
    focus: "Ironman-specific fitness.",
    sort_order: 5,
  },
  {
    seed_key: "phase:6-peak",
    name: "Peak",
    start_date: "2027-09-01",
    end_date: "2027-09-30",
    target_hours_min: 12,
    target_hours_max: 14,
    focus: "Endurance simulations and race preparation.",
    sort_order: 6,
  },
  {
    seed_key: "phase:7-taper-race",
    name: "Taper / Race",
    start_date: "2027-10-01",
    end_date: "2027-10-24",
    target_hours_min: null,
    target_hours_max: null,
    focus: "Reduce fatigue, execute the race plan.",
    sort_order: 7,
  },
];

/** Provisional checkpoints at phase boundaries. Editable on the roadmap. */
export const seedMilestones = [
  {
    seed_key: "milestone:week-1",
    title: "First week in the book",
    description: "Finish week one of Operation Get Off the Couch.",
    target_date: "2026-11-22",
  },
  {
    seed_key: "milestone:phase-1",
    title: "Off the couch",
    description: "Close out Operation Get Off the Couch with riding and running back in the routine.",
    target_date: "2026-12-31",
  },
  {
    seed_key: "milestone:base",
    title: "Base complete",
    description: "End of Base II. Provisional checkpoint — adjust as the plan takes shape.",
    target_date: "2027-04-30",
  },
  {
    seed_key: "milestone:build",
    title: "Build complete",
    description: "End of Build II. Provisional checkpoint — adjust as the plan takes shape.",
    target_date: "2027-08-31",
  },
  {
    seed_key: "milestone:race-day",
    title: "Race day",
    description: "IRONMAN California, Sacramento.",
    target_date: "2027-10-24",
  },
];

/** Zwift-style structure: warm-up, one easy block, cool-down. FTP targets intentionally unset. */
export function easyBikeWorkout(totalMinutes: number, kind: "aerobic" | "endurance"): StructuredWorkout {
  const main = totalMinutes - 15;
  return {
    version: 1,
    sport: "bike",
    platform_hint: "Zwift",
    steps: [
      { kind: "warmup", label: "Warm-up", duration_seconds: min(10), effort: "Very easy, building gently", rpe_min: 2, rpe_max: 3, ftp_percent_low: null, ftp_percent_high: null },
      {
        kind: "steady",
        label: kind === "aerobic" ? "Easy aerobic" : "Easy endurance",
        duration_seconds: min(main),
        effort: "Easy, conversational — you could talk in full sentences",
        rpe_min: 3,
        rpe_max: 4,
        ftp_percent_low: null,
        ftp_percent_high: null,
      },
      { kind: "cooldown", label: "Cool-down", duration_seconds: min(5), effort: "Very easy spin", rpe_min: 2, rpe_max: 2, ftp_percent_low: null, ftp_percent_high: null },
    ],
  };
}

export type SeedSession = {
  seed_key: string;
  session_date: string;
  activity_type: string;
  title: string;
  description: string | null;
  planned_duration_seconds: number | null;
  planned_duration_max_seconds: number | null;
  is_indoor: boolean | null;
  structured_workout: StructuredWorkout | null;
};

function tuesdayBike(date: string, minutes: number, note?: string): SeedSession {
  return {
    seed_key: `plan:${date}:bike`,
    session_date: date,
    activity_type: "bike",
    title: "Easy aerobic ride",
    description: `Smart trainer. 10 min warm-up, ${minutes - 15} min easy, 5 min cool-down.${note ? ` ${note}` : ""}`,
    planned_duration_seconds: min(minutes),
    planned_duration_max_seconds: null,
    is_indoor: true,
    structured_workout: easyBikeWorkout(minutes, "aerobic"),
  };
}

function saturdayBike(date: string, minutes: number, note?: string): SeedSession {
  return {
    seed_key: `plan:${date}:bike`,
    session_date: date,
    activity_type: "bike",
    title: "Endurance ride",
    description: `Smart trainer. Easy, conversational intensity throughout.${note ? ` ${note}` : ""}`,
    planned_duration_seconds: min(minutes),
    planned_duration_max_seconds: null,
    is_indoor: true,
    structured_workout: easyBikeWorkout(minutes, "endurance"),
  };
}

export const rest = (date: string, description: string): SeedSession => ({
  seed_key: `plan:${date}:rest`,
  session_date: date,
  activity_type: "rest",
  title: "Rest day",
  description,
  planned_duration_seconds: null,
  planned_duration_max_seconds: null,
  is_indoor: null,
  structured_workout: null,
});

export const seedPlannedSessions: SeedSession[] = [
  // Week 1 — Nov 16–22, 2026
  rest("2026-11-16", "Originally a rest day. A morning swim and sauna happened instead — both are logged. Edit or remove this freely."),
  tuesdayBike("2026-11-17", 35),
  {
    seed_key: "plan:2026-11-18:swim",
    session_date: "2026-11-18",
    activity_type: "swim",
    title: "Swim",
    description: "30–35 minutes, relaxed.",
    planned_duration_seconds: min(30),
    planned_duration_max_seconds: min(35),
    is_indoor: null,
    structured_workout: null,
  },
  {
    seed_key: "plan:2026-11-18:strength",
    session_date: "2026-11-18",
    activity_type: "strength",
    title: "Strength",
    description: "15–25 minutes.",
    planned_duration_seconds: min(15),
    planned_duration_max_seconds: min(25),
    is_indoor: null,
    structured_workout: null,
  },
  {
    seed_key: "plan:2026-11-19:run",
    session_date: "2026-11-19",
    activity_type: "run",
    title: "Run/walk",
    description: "Easy, symptom-guided intervals. Back off if the knee has anything to say.",
    planned_duration_seconds: min(25),
    planned_duration_max_seconds: null,
    is_indoor: null,
    structured_workout: null,
  },
  rest("2026-11-20", "Rest."),
  saturdayBike("2026-11-21", 60),
  {
    seed_key: "plan:2026-11-22:run",
    session_date: "2026-11-22",
    activity_type: "run",
    title: "Easy run/walk",
    description: "20–30 minutes, easy.",
    planned_duration_seconds: min(20),
    planned_duration_max_seconds: min(30),
    is_indoor: null,
    structured_workout: null,
  },
  // Bike progression — only the cycling sessions were prescribed for these weeks.
  tuesdayBike("2026-11-24", 40),
  saturdayBike("2026-11-28", 70),
  tuesdayBike("2026-12-01", 45),
  saturdayBike("2026-12-05", 80),
  tuesdayBike("2026-12-08", 30, "Recovery week."),
  saturdayBike("2026-12-12", 55, "Recovery week."),
  tuesdayBike("2026-12-15", 45),
  saturdayBike("2026-12-19", 85),
  tuesdayBike("2026-12-22", 45),
  saturdayBike("2026-12-26", 100),
  tuesdayBike("2026-12-29", 35, "Recovery week."),
  saturdayBike("2027-01-02", 65, "Recovery week."),
];

/** The two real activities from Nov 16, 2026. No pace, heart rate or temperature is recorded. */
export const seedActivities = [
  {
    seed_key: "activity:2026-11-16:swim",
    activity_date: "2026-11-16",
    activity_type: "swim",
    title: "Morning Swim",
    duration_seconds: null,
    distance_meters: yardsToMeters(1000),
    distance_unit: "yd",
    origin: "manual",
  },
  {
    seed_key: "activity:2026-11-16:sauna",
    activity_date: "2026-11-16",
    activity_type: "recovery",
    recovery_subtype: "Sauna",
    title: "Post-Swim Sauna",
    duration_seconds: min(12),
    distance_meters: null,
    distance_unit: null,
    origin: "manual",
  },
];
