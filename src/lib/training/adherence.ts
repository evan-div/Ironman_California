import type { PlannedSession } from "@/types";
import { weekStart, type DateString } from "./dates";

export type AdherenceSession = Pick<PlannedSession, "session_date" | "activity_type" | "status" | "original_date">;

export type Adherence = {
  /** Sessions that count: non-rest, non-recovery, and either resolved (completed/skipped) or past due. */
  eligible: number;
  completed: number;
  skipped: number;
  /** Past-due sessions that were neither logged nor marked skipped. */
  missed: number;
  /** Eligible sessions that were moved from their original date (counted on their current date). */
  rescheduled: number;
  /** completed / eligible, or null when nothing was eligible. */
  rate: number | null;
};

/**
 * Adherence rules, stated explicitly:
 *  - Rest days and recovery sessions are never eligible.
 *  - completed → eligible and done, whenever it was scheduled (finishing a
 *    session a few days early still counts).
 *  - skipped → eligible, not done (the athlete has made the call, even ahead of time).
 *  - still "planned": eligible — and counted as missed — only once its date has
 *    passed. Today's open sessions and future sessions are not held against the athlete.
 *  - A rescheduled session is judged once, on the date it was moved to.
 */
export function isEligibleForAdherence(s: AdherenceSession, today: DateString): boolean {
  if (s.activity_type === "rest" || s.activity_type === "recovery") return false;
  if (s.status === "completed" || s.status === "skipped") return true;
  return s.session_date < today;
}

export function computeAdherence(sessions: AdherenceSession[], today: DateString): Adherence {
  const result: Adherence = { eligible: 0, completed: 0, skipped: 0, missed: 0, rescheduled: 0, rate: null };
  for (const s of sessions) {
    if (!isEligibleForAdherence(s, today)) continue;
    result.eligible += 1;
    if (s.status === "completed") result.completed += 1;
    else if (s.status === "skipped") result.skipped += 1;
    else result.missed += 1;
    if (s.original_date && s.original_date !== s.session_date) result.rescheduled += 1;
  }
  result.rate = result.eligible > 0 ? result.completed / result.eligible : null;
  return result;
}

export type WeekAdherence = Adherence & { weekStart: DateString };

export function weeklyAdherence(sessions: AdherenceSession[], weekStarts: DateString[], today: DateString): WeekAdherence[] {
  return weekStarts.map((ws) => ({
    weekStart: ws,
    ...computeAdherence(
      sessions.filter((s) => weekStart(s.session_date) === ws),
      today,
    ),
  }));
}
