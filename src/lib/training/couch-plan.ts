import { addDaysStr } from "./dates";
import { rest, type SeedSession } from "./seed-data";

/**
 * Operation Get Off the Couch, weeks 2–7 (Mon Nov 23, 2026 – Sun Jan 3, 2027).
 *
 * Written after reading week one (Nov 16–22) as logged:
 *   swim   3 sessions, 1,000 and 1,200 yd at 2:30/100yd (+ a 22:58 swim on Nov 22)
 *   bike   35 min at 17.1 mph, 60 min at 16.2 mph (indoor)
 *   run    one run/walk, 35 min, 4 mi, 8:45/mi — the Sunday run was swapped for a swim
 *   strength  planned, not logged
 *
 * The athlete's own Tuesday/Saturday bike progression (seed-data.ts) is NOT
 * touched. This pack adds everything around it: swim, run, strength and rest.
 * It is data, applied on request by `applyCouchPlan` (src/lib/data/seed.ts)
 * under its own seed key so an account that already loaded the starter plan can
 * still receive it, and nothing already logged or edited is ever changed.
 */
export const COUCH_PLAN_SEED_KEY = "owner-ironman-california-2027-couch-plan-v1";

const min = (m: number) => m * 60;

const KNEE_CHECK =
  "Knee check, 0–10: 2 or less and quiet by next morning = carry on. 3–4, or still sore next morning = shorten it, add walk breaks, no progression. 5+, sharp, or a limp = stop, swap in a swim or ride, and get it looked at if it lingers.";

const EFFORT_NOTE =
  "Go by effort, not pace: RPE 3–4, full sentences. Your Nov 19 run averaged 8:45/mi, already well ahead of the 11:27/mi a 5:00 marathon needs, so speed is not the job here. Durability is.";

function runThursday(date: string, minutes: number, extra?: string): SeedSession {
  return {
    seed_key: `plan:${date}:run`,
    session_date: date,
    activity_type: "run",
    title: "Aerobic run/walk",
    description: `${minutes} min, easy. Walk 1 min every 8–10 min, or sooner if the knee asks. ${EFFORT_NOTE}${extra ? ` ${extra}` : ""} ${KNEE_CHECK}`,
    planned_duration_seconds: min(minutes),
    planned_duration_max_seconds: null,
    is_indoor: null,
    structured_workout: null,
  };
}

function runSunday(date: string, minutes: number): SeedSession {
  return {
    seed_key: `plan:${date}:run`,
    session_date: date,
    activity_type: "run",
    title: "Easy shakeout run/walk",
    description: `${minutes} min, very easy (RPE 3) the morning after the long ride — heavy legs are normal. If the knee is above 3/10 or you are flat, swap it for a 20–25 min easy swim like you did on Nov 22, and log that instead. ${KNEE_CHECK}`,
    planned_duration_seconds: min(minutes),
    planned_duration_max_seconds: null,
    is_indoor: null,
    structured_workout: null,
  };
}

function swim(date: string, title: string, minutes: number, maxMinutes: number | null, description: string): SeedSession {
  return {
    seed_key: `plan:${date}:swim`,
    session_date: date,
    activity_type: "swim",
    title,
    description: `${description} Log the total distance and time so pace shows up.`,
    planned_duration_seconds: min(minutes),
    planned_duration_max_seconds: maxMinutes == null ? null : min(maxMinutes),
    is_indoor: null,
    structured_workout: null,
  };
}

const STRENGTH_MOVES =
  "Pick 5–6: split squat or step-up, glute bridge or hip thrust, single-leg Romanian deadlift, calf raise, side plank, banded side-step. Slow and controlled, stop 2–3 reps short of failure. Anything that pinches the knee: swap it. Do it after the swim.";

function strength(date: string, minutes: number, maxMinutes: number | null, rounds: string): SeedSession {
  return {
    seed_key: `plan:${date}:strength`,
    session_date: date,
    activity_type: "strength",
    title: "Strength — legs and hips",
    description: `${rounds} ${STRENGTH_MOVES} This is the cheapest knee insurance in the plan, and it was not logged in week one.`,
    planned_duration_seconds: min(minutes),
    planned_duration_max_seconds: maxMinutes == null ? null : min(maxMinutes),
    is_indoor: null,
    structured_workout: null,
  };
}

// The weeks are written out explicitly (rather than generated) so each one can be read and edited as a coach would.
const MON = ["2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28"] as const;
const at = (week: number, offset: number) => addDaysStr(MON[week], offset);
const WED = 2;
const THU = 3;
const FRI = 4;
const SUN = 6;

export const couchPlanSessions: SeedSession[] = [
  // ── Week 2 · Nov 23–29 · build ───────────────────────────────────────────
  rest(at(0, 0), "Rest. A short walk and a sauna are fine."),
  swim(at(0, WED), "Swim — 500 benchmark", 30, 35, "Warm-up 200 easy. 4×50 drill/swim, 15 s rest. Main: 500 continuous at steady effort — time it; it is your benchmark (your Nov 16 and Nov 18 swims both averaged 2:30/100yd). Cool-down 100–200 easy."),
  strength(at(0, WED), 15, 20, "2 rounds."),
  runThursday(at(0, THU), 30, "Thanksgiving: a fine day for a turkey trot. If the day gets away from you, run it Friday instead of skipping."),
  rest(at(0, FRI), "Rest. Sleep and food, and check the knee before Saturday's ride."),
  runSunday(at(0, SUN), 20),

  // ── Week 3 · Nov 30–Dec 6 · build ────────────────────────────────────────
  rest(at(1, 0), "Rest. A short walk and a sauna are fine."),
  swim(at(1, WED), "Swim — steady 100s", 30, 35, "Warm-up 200 easy. 6×50 drill (fingertip drag or catch-up), 15 s rest. Main: 6×100 at steady effort, 20 s rest; aim for the same split every rep. Cool-down 150 easy."),
  strength(at(1, WED), 15, 20, "3 rounds."),
  runThursday(at(1, THU), 35, "Longest run so far is 35 min, so this matches it rather than beating it."),
  rest(at(1, FRI), "Rest."),
  runSunday(at(1, SUN), 20),

  // ── Week 4 · Dec 7–13 · recovery (bike drops to 30 / 55) ─────────────────
  rest(at(2, 0), "Rest. Recovery week: sleep is the workout."),
  swim(at(2, WED), "Swim — easy technique", 30, null, "Recovery week. Warm-up 200 easy. 8×50 drill/swim, 15 s rest. Main: 4×100 easy, 20 s rest. Cool-down 100. Smooth and relaxed, not fast."),
  strength(at(2, WED), 15, null, "2 rounds, light (recovery week)."),
  runThursday(at(2, THU), 25, "Recovery week: keep it relaxed."),
  rest(at(2, FRI), "Rest."),
  runSunday(at(2, SUN), 20),

  // ── Week 5 · Dec 14–20 · build ───────────────────────────────────────────
  rest(at(3, 0), "Rest. A short walk and a sauna are fine."),
  swim(at(3, WED), "Swim — CSS test (400 + 200)", 30, null, "Warm-up 400: 200 easy, 4×50 building. Then 400 as fast as you can hold evenly — time it. Rest 5 min with easy swimming. Then 200 the same way — time it. Cool-down 100–200. Threshold pace per 100yd = (400 time − 200 time) ÷ 2. This replaces guessing what pace you can sustain."),
  strength(at(3, WED), 15, null, "3 rounds."),
  runThursday(at(3, THU), 35),
  rest(at(3, FRI), "Rest."),
  runSunday(at(3, SUN), 25),

  // ── Week 6 · Dec 21–27 · build, biggest bike week ────────────────────────
  rest(at(4, 0), "Rest. A short walk and a sauna are fine."),
  swim(at(4, WED), "Swim — aerobic 200s", 30, null, "Warm-up 200 easy. 4×50 drill/swim, 15 s rest. Main: 3×200 steady, 30 s rest, a touch quicker than your benchmark pace. Cool-down 100."),
  strength(at(4, WED), 15, null, "2 rounds."),
  runThursday(at(4, THU), 30, "Run volume dips on purpose this week: it carries the biggest ride of the block and Christmas."),
  rest(at(4, FRI), "Rest. Merry Christmas — an easy walk if you like."),
  runSunday(at(4, SUN), 20),

  // ── Week 7 · Dec 28–Jan 3 · recovery (bike drops to 35 / 65) ─────────────
  rest(at(5, 0), "Rest. Recovery week."),
  swim(at(5, WED), "Swim — 500 re-test", 30, null, "Recovery week and a check-in. Warm-up 200 easy. 4×50 drill/swim. Main: 500 continuous at the same effort as the week-2 benchmark — time it and compare. Cool-down 100–200."),
  strength(at(5, WED), 15, null, "2 rounds, light (recovery week)."),
  runThursday(at(5, THU), 25, "Last run of 2026. Keep it easy."),
  rest(at(5, FRI), "Rest. New year, same routine: nothing to do but show up fresh for Saturday."),
  runSunday(at(5, SUN), 20),
];
