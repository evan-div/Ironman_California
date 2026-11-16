import { describe, expect, it } from "vitest";
import {
  disciplineDistribution,
  monthlyTotals,
  plannedSessionSeconds,
  plannedVsActual,
  rollingAverage,
  sumActivities,
  weeklyPlannedVsActual,
  weeklyTotals,
  type ActivityLike,
  type SessionLike,
} from "@/lib/training/totals";
import { computeAdherence, weeklyAdherence, type AdherenceSession } from "@/lib/training/adherence";

const act = (activity_date: string, activity_type: ActivityLike["activity_type"], minutes: number | null, meters: number | null = null): ActivityLike => ({
  activity_date,
  activity_type,
  duration_seconds: minutes == null ? null : minutes * 60,
  distance_meters: meters,
});

const plan = (session_date: string, activity_type: SessionLike["activity_type"], minutes: number | null, maxMinutes: number | null = null, status: SessionLike["status"] = "planned"): SessionLike => ({
  session_date,
  activity_type,
  planned_duration_seconds: minutes == null ? null : minutes * 60,
  planned_duration_max_seconds: maxMinutes == null ? null : maxMinutes * 60,
  status,
});

describe("activity totals", () => {
  const activities = [
    act("2026-11-16", "swim", null, 914.4), // distance only
    act("2026-11-16", "recovery", 12),
    act("2026-11-17", "bike", 35),
    act("2026-11-18", "strength", 20),
    act("2026-11-19", "run", 25, 3000),
    act("2026-11-24", "bike", 40),
  ];

  it("excludes recovery from training time and labels strength separately", () => {
    const t = sumActivities(activities.slice(0, 5));
    expect(t.recoverySeconds).toBe(12 * 60);
    expect(t.aerobicSeconds).toBe((35 + 25) * 60);
    expect(t.strengthSeconds).toBe(20 * 60);
    expect(t.trainingSeconds).toBe((35 + 25 + 20) * 60);
  });

  it("counts distance without duration, and never invents the missing duration", () => {
    const t = sumActivities([activities[0]]);
    expect(t.swimMeters).toBeCloseTo(914.4);
    expect(t.swimSeconds).toBe(0);
    expect(t.trainingSeconds).toBe(0);
    expect(t.missingDurationCount).toBe(1);
  });

  it("groups by Monday week and zero-fills empty weeks", () => {
    const weeks = weeklyTotals(activities, ["2026-11-09", "2026-11-16", "2026-11-23"]);
    expect(weeks.map((w) => w.trainingSeconds / 60)).toEqual([0, 80, 40]);
    expect(weeks[1].bikeSeconds).toBe(35 * 60);
  });

  it("groups by month", () => {
    const months = monthlyTotals([...activities, act("2026-12-01", "run", 30)], ["2026-10", "2026-11", "2026-12"]);
    expect(months.map((m) => m.trainingSeconds / 60)).toEqual([0, 120, 30]);
  });

  it("computes a trailing average only once a full window exists", () => {
    expect(rollingAverage([60, 120, 180, 240, 300], 4)).toEqual([null, null, null, 150, 210]);
  });

  it("computes discipline shares from time only", () => {
    const d = disciplineDistribution(activities.slice(0, 5));
    expect(d.map((x) => x.type)).toEqual(["bike", "run", "strength"]);
    expect(d.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1);
    expect(disciplineDistribution([activities[0]])).toEqual([]);
  });
});

describe("planned versus actual", () => {
  it("uses the midpoint of a planned range", () => {
    expect(plannedSessionSeconds(plan("2026-11-18", "swim", 30, 35))).toBe(32.5 * 60);
    expect(plannedSessionSeconds(plan("2026-11-17", "bike", 35))).toBe(35 * 60);
    expect(plannedSessionSeconds(plan("2026-11-20", "rest", null))).toBe(0);
  });

  it("matches week one of the starter plan: 3h 17.5m planned", () => {
    const week = [
      plan("2026-11-16", "rest", null),
      plan("2026-11-17", "bike", 35),
      plan("2026-11-18", "swim", 30, 35),
      plan("2026-11-18", "strength", 15, 25),
      plan("2026-11-19", "run", 25),
      plan("2026-11-20", "rest", null),
      plan("2026-11-21", "bike", 60),
      plan("2026-11-22", "run", 20, 30),
    ];
    const r = plannedVsActual(week, [act("2026-11-16", "swim", null, 914.4), act("2026-11-16", "recovery", 12)]);
    expect(r.plannedSeconds).toBe(197.5 * 60);
    expect(r.plannedStrengthSeconds).toBe(20 * 60);
    expect(r.plannedCount).toBe(6);
    expect(r.actualSeconds).toBe(0); // swim has no duration; sauna is recovery
  });

  it("ignores planned recovery and rest on the planned side", () => {
    const r = plannedVsActual([plan("2026-11-16", "recovery", 20), plan("2026-11-16", "rest", null)], []);
    expect(r.plannedSeconds).toBe(0);
  });

  it("splits by week", () => {
    const r = weeklyPlannedVsActual([plan("2026-11-17", "bike", 35), plan("2026-11-24", "bike", 40)], [act("2026-11-17", "bike", 37)], ["2026-11-16", "2026-11-23"]);
    expect(r.map((w) => [w.plannedSeconds / 60, w.actualSeconds / 60])).toEqual([[35, 37], [40, 0]]);
  });
});

describe("adherence", () => {
  const s = (session_date: string, activity_type: AdherenceSession["activity_type"], status: AdherenceSession["status"], original_date: string | null = null): AdherenceSession => ({
    session_date,
    activity_type,
    status,
    original_date,
  });
  const today = "2026-11-19";

  it("only counts eligible sessions and handles each status explicitly", () => {
    const a = computeAdherence(
      [
        s("2026-11-16", "rest", "planned"), // never eligible
        s("2026-11-16", "recovery", "planned"), // never eligible
        s("2026-11-17", "bike", "completed"),
        s("2026-11-18", "swim", "skipped"),
        s("2026-11-18", "strength", "planned"), // past and unlogged → missed
        s("2026-11-19", "run", "planned"), // today, still open → not eligible yet
        s("2026-11-21", "bike", "planned"), // future
      ],
      today,
    );
    expect(a).toEqual({ eligible: 3, completed: 1, skipped: 1, missed: 1, rescheduled: 0, rate: 1 / 3 });
  });

  it("counts today's session once it is completed or skipped", () => {
    expect(computeAdherence([s(today, "run", "completed")], today)).toMatchObject({ eligible: 1, completed: 1, rate: 1 });
    expect(computeAdherence([s(today, "run", "skipped")], today)).toMatchObject({ eligible: 1, skipped: 1, rate: 0 });
  });

  it("judges a rescheduled session once, on its new date", () => {
    const moved = s("2026-11-18", "bike", "completed", "2026-11-17");
    expect(computeAdherence([moved], today)).toMatchObject({ eligible: 1, completed: 1, rescheduled: 1, rate: 1 });
    // Moved into the future: not held against the athlete yet.
    expect(computeAdherence([s("2026-11-25", "bike", "planned", "2026-11-17")], today).eligible).toBe(0);
  });

  it("counts a session completed or skipped ahead of its scheduled date", () => {
    expect(computeAdherence([s("2026-11-21", "bike", "completed")], today)).toMatchObject({ eligible: 1, completed: 1, rate: 1 });
    expect(computeAdherence([s("2026-11-21", "bike", "skipped")], today)).toMatchObject({ eligible: 1, skipped: 1, rate: 0 });
  });

  it("returns a null rate when nothing is eligible", () => {
    expect(computeAdherence([], today).rate).toBeNull();
    expect(weeklyAdherence([s("2026-11-17", "bike", "completed")], ["2026-11-09", "2026-11-16"], today).map((w) => w.rate)).toEqual([null, 1]);
  });
});
