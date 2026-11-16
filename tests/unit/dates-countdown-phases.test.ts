import { describe, expect, it } from "vitest";
import { addDaysStr, isDateString, lastMonthKeys, lastWeekStarts, monthGrid, todayInTimeZone, weekDays, weekStart, zonedDateTimeToIso } from "@/lib/training/dates";
import { raceCountdown } from "@/lib/training/countdown";
import { currentPhase, nextPhase, phaseProgress, phaseState } from "@/lib/training/phases";
import { seedPhases } from "@/lib/training/seed-data";

describe("calendar dates", () => {
  it("uses the athlete's timezone for today, not UTC", () => {
    // 05:30 UTC on Nov 17 is still the evening of Nov 16 in Denver.
    const instant = new Date("2026-11-17T05:30:00Z");
    expect(todayInTimeZone("America/Denver", instant)).toBe("2026-11-16");
    expect(todayInTimeZone("UTC", instant)).toBe("2026-11-17");
    expect(todayInTimeZone("Not/AZone", instant)).toBe("2026-11-17");
  });

  it("starts weeks on Monday", () => {
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
    expect(weekStart("2026-11-22")).toBe("2026-11-16");
    expect(weekStart("2026-11-23")).toBe("2026-11-23");
    expect(weekDays("2026-11-16")).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
  });

  it("does date arithmetic across DST and year boundaries without shifting", () => {
    expect(addDaysStr("2026-10-31", 1)).toBe("2026-11-01"); // US DST ends Nov 1, 2026
    expect(addDaysStr("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDaysStr("2026-12-31", 2)).toBe("2027-01-02");
    expect(addDaysStr("2027-03-14", 1)).toBe("2027-03-15"); // DST starts
  });

  it("builds a Monday-aligned month grid", () => {
    const grid = monthGrid("2026-12-10");
    expect(grid[0][0]).toBe("2026-11-30");
    expect(grid[grid.length - 1][6]).toBe("2027-01-03");
    expect(grid.every((w) => w.length === 7)).toBe(true);
  });

  it("lists trailing weeks and months oldest first", () => {
    expect(lastWeekStarts("2026-11-18", 3)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(lastMonthKeys("2027-01-15", 3)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("validates date strings", () => {
    expect(isDateString("2026-11-16")).toBe(true);
    expect(isDateString("2026-13-40")).toBe(false);
    expect(isDateString("11/16/2026")).toBe(false);
    expect(isDateString(undefined)).toBe(false);
  });

  it("converts a local wall-clock time to the right instant", () => {
    expect(zonedDateTimeToIso("2026-11-16", "06:15", "America/Denver")).toBe("2026-11-16T13:15:00.000Z"); // MST = UTC-7
    expect(zonedDateTimeToIso("2027-07-04", "06:15", "America/Denver")).toBe("2027-07-04T12:15:00.000Z"); // MDT = UTC-6
  });
});

describe("race countdown", () => {
  it("counts calendar days to IRONMAN California", () => {
    const c = raceCountdown("2026-11-16", "2027-10-24");
    expect(c).toEqual({ days: 342, weeks: 48, remainderDays: 6, state: "upcoming" });
  });
  it("handles race day and after", () => {
    expect(raceCountdown("2027-10-24", "2027-10-24").state).toBe("today");
    expect(raceCountdown("2027-10-25", "2027-10-24")).toMatchObject({ days: -1, state: "past" });
  });
});

describe("phases", () => {
  it("finds the current and next phase", () => {
    expect(currentPhase(seedPhases, "2026-11-16")?.name).toBe("Operation Get Off the Couch");
    expect(currentPhase(seedPhases, "2027-01-01")?.name).toBe("Base I");
    expect(currentPhase(seedPhases, "2026-11-15")).toBeNull();
    expect(nextPhase(seedPhases, "2026-11-15")?.name).toBe("Operation Get Off the Couch");
    expect(currentPhase(seedPhases, "2027-10-24")?.name).toBe("Taper / Race");
  });
  it("has contiguous, non-overlapping seeded phases", () => {
    for (let i = 1; i < seedPhases.length; i++) {
      expect(addDaysStr(seedPhases[i - 1].end_date, 1)).toBe(seedPhases[i].start_date);
    }
  });
  it("reports state and progress", () => {
    const p = { start_date: "2026-11-16", end_date: "2026-11-25" };
    expect(phaseState(p, "2026-11-15")).toBe("upcoming");
    expect(phaseState(p, "2026-11-20")).toBe("current");
    expect(phaseState(p, "2026-11-26")).toBe("past");
    expect(phaseProgress(p, "2026-11-20")).toBeCloseTo(0.5, 6);
    expect(phaseProgress(p, "2027-01-01")).toBe(1);
  });
});
