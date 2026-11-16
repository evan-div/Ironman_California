/**
 * Parse a human duration into seconds. Accepts:
 *  - "45"        → 45 minutes
 *  - "1:30"      → 1 hour 30 minutes
 *  - "1:30:15"   → 1 hour 30 minutes 15 seconds
 *  - "1h 30m", "90m", "1h", "45s", "1.5h"
 * Returns null for blank input and NaN for input that cannot be understood.
 */
export function parseDuration(input: string | null | undefined): number | null {
  if (input == null) return null;
  const s = input.trim().toLowerCase();
  if (s === "") return null;

  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 60);

  const clock = s.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (clock) {
    const [, h, m, sec] = clock;
    return Number(h) * 3600 + Number(m) * 60 + (sec ? Number(sec) : 0);
  }

  const parts = s.match(/^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+(?:\.\d+)?)\s*m(?:in(?:utes?|s)?)?)?\s*(?:(\d+)\s*s(?:ec(?:onds?|s)?)?)?$/);
  if (parts && (parts[1] || parts[2] || parts[3])) {
    return Math.round(Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0));
  }
  return Number.NaN;
}

/** "1h 30m", "45m", "12m 30s" (seconds only shown under an hour when non-zero). */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

/** "1:30:00" / "45:00" — for race targets and form prefill. */
export function formatClock(seconds: number | null | undefined, alwaysHours = false): string {
  if (seconds == null) return "";
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 || alwaysHours ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** "13h 44m" style for long race targets. */
export function formatHoursMinutes(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const total = Math.round(seconds / 60);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

export function secondsToHours(seconds: number): number {
  return seconds / 3600;
}

/** Hours with one decimal, e.g. 3.5 */
export function formatHours(seconds: number): string {
  return (Math.round((seconds / 3600) * 10) / 10).toFixed(1);
}

/** Planned durations may be a range ("30–35 min"). */
export function formatDurationRange(min: number | null, max: number | null): string {
  if (min == null) return "—";
  if (max == null || max === min) return formatDuration(min);
  if (min % 60 === 0 && max % 60 === 0 && max < 3600) return `${min / 60}–${max / 60}m`;
  return `${formatDuration(min)}–${formatDuration(max)}`;
}
