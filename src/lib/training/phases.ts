import type { TrainingPhase } from "@/types";
import { daysBetween, type DateString } from "./dates";

export function sortPhases<T extends Pick<TrainingPhase, "start_date" | "sort_order">>(phases: T[]): T[] {
  return [...phases].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.sort_order - b.sort_order);
}

export function currentPhase<T extends Pick<TrainingPhase, "start_date" | "end_date" | "sort_order">>(
  phases: T[],
  today: DateString,
): T | null {
  return sortPhases(phases).find((p) => p.start_date <= today && today <= p.end_date) ?? null;
}

export function nextPhase<T extends Pick<TrainingPhase, "start_date" | "end_date" | "sort_order">>(
  phases: T[],
  today: DateString,
): T | null {
  return sortPhases(phases).find((p) => p.start_date > today) ?? null;
}

export type PhaseState = "past" | "current" | "upcoming";

export function phaseState(phase: Pick<TrainingPhase, "start_date" | "end_date">, today: DateString): PhaseState {
  if (today > phase.end_date) return "past";
  if (today < phase.start_date) return "upcoming";
  return "current";
}

/** 0–1 progress through a phase by calendar days. */
export function phaseProgress(phase: Pick<TrainingPhase, "start_date" | "end_date">, today: DateString): number {
  const total = daysBetween(phase.start_date, phase.end_date) + 1;
  const done = daysBetween(phase.start_date, today) + 1;
  return Math.min(1, Math.max(0, done / total));
}

export function formatHoursTarget(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${min}–${max} h/week`;
  return `${min ?? max} h/week`;
}
