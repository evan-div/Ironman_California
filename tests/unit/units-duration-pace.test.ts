import { describe, expect, it } from "vitest";
import { distanceInputValue, formatDistance, fromMeters, metersToYards, toMeters, yardsToMeters } from "@/lib/training/units";
import { formatClock, formatDuration, formatDurationRange, formatHoursMinutes, parseDuration } from "@/lib/training/duration";
import { formatRunPace, formatSwimPace, runPaceSeconds, speedPerHour, swimPaceSecondsPer100 } from "@/lib/training/pace";

describe("distance conversions", () => {
  it("converts yards and meters consistently", () => {
    expect(yardsToMeters(1000)).toBeCloseTo(914.4, 6);
    expect(metersToYards(914.4)).toBeCloseTo(1000, 6);
    expect(toMeters(1, "mi")).toBeCloseTo(1609.344, 6);
    expect(fromMeters(42195, "km")).toBeCloseTo(42.195, 6);
  });

  it("round-trips an entered value without drift", () => {
    for (const [value, unit] of [[1000, "yd"], [26.2, "mi"], [112, "mi"], [3800, "m"], [5, "km"]] as const) {
      const stored = Math.round(toMeters(value, unit) * 100) / 100;
      expect(distanceInputValue(stored, unit)).toBe(String(value));
    }
  });

  it("formats in the requested unit and returns null for missing distance", () => {
    expect(formatDistance(914.4, "yd")).toBe("1,000 yd");
    expect(formatDistance(16093.44, "mi")).toBe("10 mi");
    expect(formatDistance(null, "mi")).toBeNull();
  });
});

describe("durations", () => {
  it("parses minutes, clock and unit formats", () => {
    expect(parseDuration("45")).toBe(2700);
    expect(parseDuration("1:30")).toBe(5400);
    expect(parseDuration("1:30:15")).toBe(5415);
    expect(parseDuration("1h 30m")).toBe(5400);
    expect(parseDuration("90m")).toBe(5400);
    expect(parseDuration("1.5h")).toBe(5400);
    expect(parseDuration("12 min")).toBe(720);
  });

  it("returns null for blank and NaN for nonsense", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("   ")).toBeNull();
    expect(parseDuration(null)).toBeNull();
    expect(parseDuration("fast")).toBeNaN();
    expect(parseDuration("1:75")).toBeNaN();
  });

  it("formats durations", () => {
    expect(formatDuration(720)).toBe("12m");
    expect(formatDuration(5400)).toBe("1h 30m");
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(null)).toBe("—");
    expect(formatClock(5415)).toBe("1:30:15");
    expect(formatClock(95)).toBe("1:35");
    expect(formatHoursMinutes(13 * 3600 + 44 * 60)).toBe("13h 44m");
    expect(formatDurationRange(1800, 2100)).toBe("30–35m");
    expect(formatDurationRange(2100, null)).toBe("35m");
  });
});

describe("pace", () => {
  it("computes swim pace per 100 in the chosen unit", () => {
    const pace = swimPaceSecondsPer100(20 * 60, yardsToMeters(1000), "yd");
    expect(pace).toBeCloseTo(120, 6);
    expect(formatSwimPace(pace, "yd")).toBe("2:00 /100yd");
  });

  it("computes run pace and bike speed", () => {
    expect(runPaceSeconds(30 * 60, toMeters(3, "mi"), "mi")).toBeCloseTo(600, 6);
    expect(formatRunPace(600, "mi")).toBe("10:00 /mi");
    expect(speedPerHour(3600, toMeters(16, "mi"), "mi")).toBeCloseTo(16, 6);
  });

  it("never infers pace when duration or distance is missing", () => {
    expect(swimPaceSecondsPer100(null, 914.4, "yd")).toBeNull();
    expect(swimPaceSecondsPer100(1200, null, "yd")).toBeNull();
    expect(runPaceSeconds(0, 1000, "km")).toBeNull();
    expect(speedPerHour(undefined, undefined, "mi")).toBeNull();
  });
});
