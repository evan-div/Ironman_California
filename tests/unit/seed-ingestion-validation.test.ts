import { describe, expect, it } from "vitest";
import { format, parseISO } from "date-fns";
import { OWNER_SEED_KEY, seedActivities, seedGoalEvent, seedMilestones, seedPhases, seedPlannedSessions } from "@/lib/training/seed-data";
import { deduplicateActivity, normalizeExternalActivity, type DedupCandidate, type ExternalActivity } from "@/lib/ingestion";
import { activityFormSchema, activityFormToRow, emptyActivityForm } from "@/lib/validations/activity";
import { sessionFormSchema, sessionFormToRow, emptySessionForm } from "@/lib/validations/session";

const prefs = {
  swim_unit: "yd",
  distance_unit: "mi",
  default_activity_type: "swim",
  default_bike_indoor: true,
  default_trainer_platform: "Zwift",
  default_swim_environment: "pool",
} as const;

describe("owner starter plan (seed facts)", () => {
  it("has the right goal event", () => {
    expect(seedGoalEvent).toMatchObject({ name: "IRONMAN California", event_date: "2027-10-24", target_finish_seconds: 13 * 3600 + 44 * 60 });
    const { target_swim_seconds: s, target_bike_seconds: b, target_run_seconds: r, target_transition_seconds: t } = seedGoalEvent;
    expect([s, b, r, t]).toEqual([5400, 25200, 18000, 840]);
    expect(s + b + r + t).toBe(seedGoalEvent.target_finish_seconds);
  });

  it("starts on Monday, November 16, 2026", () => {
    expect(format(parseISO(seedPhases[0].start_date), "EEEE yyyy-MM-dd")).toBe("Monday 2026-11-16");
    expect(seedPhases[0]).toMatchObject({ name: "Operation Get Off the Couch", end_date: "2026-12-31", target_hours_min: 3, target_hours_max: 4 });
    expect(seedPhases.map((p) => p.name)).toEqual(["Operation Get Off the Couch", "Base I", "Base II", "Build I", "Build II", "Peak", "Taper / Race"]);
  });

  it("contains exactly the two real activities, with nothing invented", () => {
    expect(seedActivities).toHaveLength(2);
    const [swim, sauna] = seedActivities;
    expect(swim).toMatchObject({ activity_date: "2026-11-16", activity_type: "swim", title: "Morning Swim", duration_seconds: null, distance_unit: "yd", origin: "manual" });
    expect(swim.distance_meters).toBeCloseTo(914.4);
    expect(sauna).toMatchObject({ activity_date: "2026-11-16", activity_type: "recovery", recovery_subtype: "Sauna", title: "Post-Swim Sauna", duration_seconds: 720, distance_meters: null, origin: "manual" });
    for (const a of seedActivities) {
      for (const key of ["avg_heart_rate", "max_heart_rate", "rpe", "notes", "planned_session_id"]) expect(a).not.toHaveProperty(key);
    }
  });

  it("plans week one as specified", () => {
    const week1 = seedPlannedSessions.filter((s) => s.session_date <= "2026-11-22").map((s) => [format(parseISO(s.session_date), "EEE"), s.activity_type, s.planned_duration_seconds && s.planned_duration_seconds / 60, s.planned_duration_max_seconds && s.planned_duration_max_seconds / 60]);
    expect(week1).toEqual([
      ["Mon", "rest", null, null],
      ["Tue", "bike", 35, null],
      ["Wed", "swim", 30, 35],
      ["Wed", "strength", 15, 25],
      ["Thu", "run", 25, null],
      ["Fri", "rest", null, null],
      ["Sat", "bike", 60, null],
      ["Sun", "run", 20, 30],
    ]);
  });

  it("only plans the prescribed bike sessions after week one", () => {
    const later = seedPlannedSessions.filter((s) => s.session_date > "2026-11-22");
    expect(later.every((s) => s.activity_type === "bike")).toBe(true);
    expect(later.map((s) => [s.session_date, format(parseISO(s.session_date), "EEE"), s.planned_duration_seconds! / 60])).toEqual([
      ["2026-11-24", "Tue", 40], ["2026-11-28", "Sat", 70],
      ["2026-12-01", "Tue", 45], ["2026-12-05", "Sat", 80],
      ["2026-12-08", "Tue", 30], ["2026-12-12", "Sat", 55],
      ["2026-12-15", "Tue", 45], ["2026-12-19", "Sat", 85],
      ["2026-12-22", "Tue", 45], ["2026-12-26", "Sat", 100],
      ["2026-12-29", "Tue", 35], ["2027-01-02", "Sat", 65],
    ]);
  });

  it("gives every bike session a warm-up / easy block / cool-down that adds up, with no FTP assumed", () => {
    for (const s of seedPlannedSessions.filter((x) => x.activity_type === "bike")) {
      const steps = s.structured_workout!.steps;
      expect(steps.map((x) => x.kind)).toEqual(["warmup", "steady", "cooldown"]);
      expect(steps[0].duration_seconds).toBe(600);
      expect(steps[2].duration_seconds).toBe(300);
      expect(steps.reduce((sum, x) => sum + x.duration_seconds, 0)).toBe(s.planned_duration_seconds);
      expect(steps.every((x) => x.ftp_percent_low == null && x.ftp_percent_high == null)).toBe(true);
    }
  });

  it("uses unique seed keys and never pre-completes anything", () => {
    const keys = [seedGoalEvent, ...seedPhases, ...seedMilestones, ...seedPlannedSessions, ...seedActivities].map((r) => r.seed_key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(seedPlannedSessions.some((s) => "status" in s)).toBe(false);
    expect(OWNER_SEED_KEY).toMatch(/v1$/);
  });
});

describe("ingestion boundary", () => {
  const ext: ExternalActivity = {
    provider: "strava",
    externalId: "123",
    type: "bike",
    title: "  Zwift - Tick Tock  ",
    startedAt: "2026-11-18T01:30:00Z", // 6:30pm Nov 17 in Denver
    timeZone: "America/Denver",
    durationSeconds: 2100.4,
    distanceMeters: 0,
    avgPowerWatts: 140,
  };

  it("normalizes into an imported row on the athlete's local date", () => {
    const row = normalizeExternalActivity(ext, "athlete-1");
    expect(row).toMatchObject({
      athlete_id: "athlete-1",
      origin: "imported",
      external_provider: "strava",
      external_id: "123",
      activity_date: "2026-11-17",
      start_time: "18:30",
      title: "Zwift - Tick Tock",
      duration_seconds: 2100,
      distance_meters: null,
      distance_unit: null,
      avg_power_watts: 140,
      avg_heart_rate: null,
    });
  });

  it("rejects activities without an id or with a bad timestamp", () => {
    expect(() => normalizeExternalActivity({ ...ext, externalId: "" }, "a")).toThrow();
    expect(() => normalizeExternalActivity({ ...ext, startedAt: "yesterday" }, "a")).toThrow();
  });

  const existing = (over: Partial<DedupCandidate>): DedupCandidate => ({
    id: "e1",
    activity_date: "2026-11-17",
    activity_type: "bike",
    duration_seconds: 2100,
    distance_meters: null,
    origin: "manual",
    external_provider: null,
    external_id: null,
    ...over,
  });

  it("matches the same provider activity exactly", () => {
    const row = normalizeExternalActivity(ext, "a");
    expect(deduplicateActivity(row, [existing({ origin: "imported", external_provider: "strava", external_id: "123" })])).toEqual({ kind: "same-external", existingId: "e1" });
    expect(deduplicateActivity(row, [existing({ origin: "imported", external_provider: "garmin", external_id: "123" })])).toEqual({ kind: "new" });
  });

  it("flags a likely manual duplicate but never matches on missing values", () => {
    const row = normalizeExternalActivity(ext, "a");
    expect(deduplicateActivity(row, [existing({})])).toEqual({ kind: "possible-manual-duplicate", existingId: "e1" });
    expect(deduplicateActivity(row, [existing({ duration_seconds: null })])).toEqual({ kind: "new" });
    expect(deduplicateActivity(row, [existing({ duration_seconds: 3600 })])).toEqual({ kind: "new" });
    expect(deduplicateActivity(row, [existing({ activity_date: "2026-11-18" })])).toEqual({ kind: "new" });
    expect(deduplicateActivity(row, [existing({ activity_type: "run" })])).toEqual({ kind: "new" });
  });
});

describe("form → row conversion", () => {
  const base = emptyActivityForm(prefs, "2026-11-16", "swim");

  it("stores a distance-only swim without inventing a duration", () => {
    const v = activityFormSchema.parse({ ...base, title: "Morning Swim", distance: "1000" });
    const row = activityFormToRow(v, "America/Denver");
    expect(row).toMatchObject({ duration_seconds: null, distance_unit: "yd", swim_environment: "pool", started_at: null, is_indoor: null, planned_session_id: null });
    expect(row.distance_meters).toBeCloseTo(914.4);
  });

  it("stores a duration-only ride without inventing a distance, and clears fields from other sports", () => {
    const v = activityFormSchema.parse({ ...emptyActivityForm(prefs, "2026-11-17", "bike"), title: "Ride", duration: "35", avg_power_watts: "140", recovery_subtype: "Sauna", is_run_walk: true });
    const row = activityFormToRow(v, "America/Denver");
    expect(row).toMatchObject({ duration_seconds: 2100, distance_meters: null, distance_unit: null, is_indoor: true, trainer_platform: "Zwift", avg_power_watts: 140, recovery_subtype: null, is_run_walk: null, swim_environment: null });
  });

  it("computes a timezone-aware start when a time is given", () => {
    const v = activityFormSchema.parse({ ...base, title: "Swim", start_time: "06:15" });
    expect(activityFormToRow(v, "America/Denver").started_at).toBe("2026-11-16T13:15:00.000Z");
  });

  it("rejects bad input", () => {
    const bad = (patch: object) => activityFormSchema.safeParse({ ...base, title: "x", ...patch }).success;
    expect(bad({ title: "" })).toBe(false);
    expect(bad({ duration: "soon" })).toBe(false);
    expect(bad({ distance: "-5" })).toBe(false);
    expect(bad({ rpe: "11" })).toBe(false);
    expect(bad({ activity_date: "2026-02-30" })).toBe(false);
    expect(bad({ avg_heart_rate: "150", max_heart_rate: "140" })).toBe(false);
    expect(bad({ planned_session_id: "not-a-uuid" })).toBe(false);
    expect(bad({ activity_type: "rest" })).toBe(false);
    expect(bad({})).toBe(true);
  });

  it("builds planned sessions, including ranges and bike structure", () => {
    const form = emptySessionForm(prefs, "2026-11-18", "swim");
    const swim = sessionFormToRow(sessionFormSchema.parse({ ...form, title: "Swim", duration: "30", duration_max: "35" }));
    expect(swim).toMatchObject({ planned_duration_seconds: 1800, planned_duration_max_seconds: 2100, structured_workout: null });

    const bike = sessionFormToRow(sessionFormSchema.parse({ ...emptySessionForm(prefs, "2026-11-24", "bike"), title: "Ride", duration: "40", structure: "easy_aerobic" }));
    expect(bike).toMatchObject({ planned_duration_seconds: 2400, is_indoor: true });
    expect("structured_workout" in bike && bike.structured_workout?.steps.map((s) => s.duration_seconds)).toEqual([600, 1500, 300]);

    const kept = sessionFormToRow(sessionFormSchema.parse({ ...emptySessionForm(prefs, "2026-11-24", "bike"), title: "Ride", duration: "40", structure: "keep" }));
    expect("structured_workout" in kept).toBe(false);

    expect(sessionFormSchema.safeParse({ ...form, title: "Swim", duration: "35", duration_max: "30" }).success).toBe(false);
    expect(sessionFormSchema.safeParse({ ...form, title: "Swim", duration: "", duration_max: "30" }).success).toBe(false);
  });
});
