import { z } from "zod";
import { isDateString } from "@/lib/training/dates";
import { parseDuration } from "@/lib/training/duration";

export const dateString = z.string().refine(isDateString, "Enter a valid date");

/** A text input that is either blank or a number within bounds. */
export function optionalNumberString(opts: { min?: number; max?: number; integer?: boolean; label: string }) {
  return z
    .string()
    .trim()
    .refine((v) => {
      if (v === "") return true;
      if (!/^\d+(\.\d+)?$/.test(v)) return false;
      const n = Number(v);
      if (opts.integer && !Number.isInteger(n)) return false;
      if (opts.min != null && n < opts.min) return false;
      if (opts.max != null && n > opts.max) return false;
      return true;
    }, `${opts.label} must be ${opts.integer ? "a whole number" : "a number"}${
      opts.min != null && opts.max != null ? ` between ${opts.min} and ${opts.max}` : opts.min != null ? ` of at least ${opts.min}` : ""
    }`);
}

/** A text input that is blank or a duration such as "45", "1:30" or "1h 30m". */
export const optionalDurationString = z
  .string()
  .trim()
  .refine((v) => {
    const parsed = parseDuration(v);
    return parsed === null || (!Number.isNaN(parsed) && parsed > 0 && parsed <= 48 * 3600);
  }, 'Use minutes ("45"), h:mm ("1:30") or "1h 30m"');

export const optionalPositiveDistanceString = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d+(\.\d+)?$/.test(v) && Number(v) > 0 && Number(v) < 1_000_000), "Distance must be a positive number");

export const toNumberOrNull = (v: string): number | null => (v.trim() === "" ? null : Number(v));
export const toTextOrNull = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};
