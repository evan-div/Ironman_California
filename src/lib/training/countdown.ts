import { daysBetween, type DateString } from "./dates";

export type RaceCountdown = {
  days: number;
  weeks: number;
  remainderDays: number;
  state: "upcoming" | "today" | "past";
};

/** Countdown from the athlete's local "today" to the event date. */
export function raceCountdown(today: DateString, eventDate: DateString): RaceCountdown {
  const days = daysBetween(today, eventDate);
  const abs = Math.abs(days);
  return {
    days,
    weeks: Math.floor(abs / 7),
    remainderDays: abs % 7,
    state: days > 0 ? "upcoming" : days === 0 ? "today" : "past",
  };
}
