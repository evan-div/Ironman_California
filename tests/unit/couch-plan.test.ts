import { describe, expect, it } from "vitest";
import { format, parseISO } from "date-fns";
import { COUCH_PLAN_SEED_KEY, couchPlanSessions } from "@/lib/training/couch-plan";
import { OWNER_SEED_KEY, seedPlannedSessions } from "@/lib/training/seed-data";
import { addDaysStr, weekStart } from "@/lib/training/dates";

const dow = (d: string) => format(parseISO(d), "EEE");
const weeks = ["2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28"];
const all = [...seedPlannedSessions, ...couchPlanSessions];
const inWeek = (monday: string) => all.filter((s) => s.session_date >= monday && s.session_date <= addDaysStr(monday, 6));

describe("Operation Get Off the Couch — weeks 2–7", () => {
  it("runs from Monday Nov 23, 2026 to Sunday Jan 3, 2027", () => {
    const dates = couchPlanSessions.map((s) => s.session_date).sort();
    expect(dates[0]).toBe("2026-11-23");
    expect(dates.at(-1)).toBe("2027-01-03");
    expect(dow(dates[0])).toBe("Mon");
    expect(dow(dates.at(-1)!)).toBe("Sun");
    expect(weeks.every((w) => weekStart(w) === w)).toBe(true);
  });

  it("uses its own marker and never collides with the starter plan's seed keys", () => {
    expect(COUCH_PLAN_SEED_KEY).not.toBe(OWNER_SEED_KEY);
    const keys = all.map((s) => s.seed_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("leaves the athlete's bike progression alone and adds no bike sessions", () => {
    expect(couchPlanSessions.some((s) => s.activity_type === "bike")).toBe(false);
    expect(seedPlannedSessions.filter((s) => s.activity_type === "bike")).toHaveLength(14);
  });

  it("repeats one weekly shape: rest Mon/Fri, swim + strength Wed, run Thu and Sun, with the bike on Tue and Sat", () => {
    for (const monday of weeks) {
      const shape = inWeek(monday)
        .map((s) => `${dow(s.session_date)}:${s.activity_type}`)
        .sort();
      expect(shape).toEqual(
        ["Mon:rest", "Tue:bike", "Wed:strength", "Wed:swim", "Thu:run", "Fri:rest", "Sat:bike", "Sun:run"].sort(),
      );
    }
  });

  it("keeps every week inside the phase's 3–4 h target (recovery weeks may dip lower)", () => {
    const recovery = new Set(["2026-12-07", "2026-12-28"]);
    for (const monday of weeks) {
      const minutes = inWeek(monday).reduce((sum, s) => sum + (s.planned_duration_seconds ?? 0), 0) / 60;
      const maxMinutes = inWeek(monday).reduce((sum, s) => sum + (s.planned_duration_max_seconds ?? s.planned_duration_seconds ?? 0), 0) / 60;
      expect(maxMinutes / 60, monday).toBeLessThanOrEqual(4.1);
      if (recovery.has(monday)) {
        expect(minutes / 60, monday).toBeGreaterThanOrEqual(2.5);
        expect(minutes / 60, monday).toBeLessThan(3.5);
      } else {
        expect(minutes / 60, monday).toBeGreaterThanOrEqual(3.25);
      }
    }
  });

  it("builds run time gently and never asks for a run longer than 35 minutes (the longest logged so far)", () => {
    const runs = couchPlanSessions.filter((s) => s.activity_type === "run");
    expect(runs).toHaveLength(12);
    expect(Math.max(...runs.map((r) => r.planned_duration_seconds! / 60))).toBe(35);
    for (const monday of weeks) {
      const week = runs.filter((r) => r.session_date >= monday && r.session_date <= addDaysStr(monday, 6));
      expect(week.map((r) => dow(r.session_date))).toEqual(["Thu", "Sun"]);
      // Never back-to-back days, and the knee rule travels with every run.
      expect(week.every((r) => r.description!.includes("Knee check"))).toBe(true);
    }
  });

  it("puts a timed benchmark at the start, middle and end of the block", () => {
    const swims = couchPlanSessions.filter((s) => s.activity_type === "swim");
    expect(swims.map((s) => s.session_date)).toEqual(["2026-11-25", "2026-12-02", "2026-12-09", "2026-12-16", "2026-12-23", "2026-12-30"]);
    expect(swims[0].title).toMatch(/500 benchmark/);
    expect(swims[3].title).toMatch(/CSS/);
    expect(swims[5].title).toMatch(/re-test/);
    expect(swims.every((s) => s.description!.includes("Log the total distance and time"))).toBe(true);
  });

  it("never pre-completes anything, invents no distances, and fits the form's limits", () => {
    for (const s of couchPlanSessions) {
      expect(s).not.toHaveProperty("status");
      expect(s.description!.length).toBeLessThanOrEqual(2000);
      expect(s.title.length).toBeLessThanOrEqual(160);
      expect(s.structured_workout).toBeNull();
      if (s.activity_type === "rest") expect(s.planned_duration_seconds).toBeNull();
      else expect(s.planned_duration_seconds).toBeGreaterThan(0);
      if (s.planned_duration_max_seconds != null) expect(s.planned_duration_max_seconds).toBeGreaterThanOrEqual(s.planned_duration_seconds!);
    }
  });

  it("matches the plan's holidays: Thanksgiving run on Thursday, Christmas Friday off", () => {
    expect(couchPlanSessions.find((s) => s.session_date === "2026-11-26")!.description).toMatch(/Thanksgiving/);
    const christmas = couchPlanSessions.find((s) => s.session_date === "2026-12-25")!;
    expect(christmas.activity_type).toBe("rest");
  });
});
