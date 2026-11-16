import Link from "next/link";
import { Flag } from "lucide-react";
import type { GoalEvent } from "@/types";
import { raceCountdown } from "@/lib/training/countdown";
import { formatDate } from "@/lib/training/dates";
import { formatHoursMinutes } from "@/lib/training/duration";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CountdownHero({ event, today }: { event: GoalEvent | null; today: string }) {
  if (!event) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6 sm:p-8">
        <span className="grid size-10 place-items-center rounded-full bg-sage/70 text-forest">
          <Flag className="size-[18px]" />
        </span>
        <div>
          <h2 className="display text-3xl">Pick a finish line.</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-ink">
            Add your goal race and the countdown, phases and targets will appear here.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings#goal">Add goal race</Link>
        </Button>
      </Card>
    );
  }

  const c = raceCountdown(today, event.event_date);
  const splits = [
    { label: "Swim", seconds: event.target_swim_seconds, color: "var(--swim)" },
    { label: "Bike", seconds: event.target_bike_seconds, color: "var(--bike)" },
    { label: "Run", seconds: event.target_run_seconds, color: "var(--run)" },
    { label: "Transitions", seconds: event.target_transition_seconds, color: "var(--rest)" },
  ].filter((s) => s.seconds != null);

  return (
    <Card className="relative overflow-hidden p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="eyebrow">
            {c.state === "upcoming" ? "Race countdown" : c.state === "today" ? "Race day" : "Race complete"}
          </p>
          {c.state === "today" ? (
            <p className="display mt-3 text-6xl text-forest sm:text-7xl">Today.</p>
          ) : (
            <p className="mt-2 flex items-baseline gap-3">
              <span className="display tnum text-[4.5rem] leading-none text-forest sm:text-[6rem]" data-testid="countdown-days">
                {Math.abs(c.days).toLocaleString("en-US")}
              </span>
              <span className="text-base text-muted-ink">
                {Math.abs(c.days) === 1 ? "day" : "days"} {c.state === "upcoming" ? "to go" : "ago"}
              </span>
            </p>
          )}
          {c.state === "upcoming" ? (
            <p className="tnum mt-2 text-[13px] text-faint-ink">
              {c.weeks} {c.weeks === 1 ? "week" : "weeks"}
              {c.remainderDays ? `, ${c.remainderDays} ${c.remainderDays === 1 ? "day" : "days"}` : ""}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 sm:text-right">
          <h2 className="text-lg font-semibold">{event.name}</h2>
          <p className="mt-0.5 text-sm text-muted-ink">
            {formatDate(event.event_date, "EEEE, MMMM d, yyyy")}
            {event.location ? ` · ${event.location}` : ""}
          </p>
          {event.goal_description ? <p className="mt-3 text-sm text-ink">{event.goal_description}</p> : null}
          {event.target_finish_seconds != null ? (
            <p className="mt-1 text-[13px] text-muted-ink">
              Planning target <span className="tnum font-medium text-ink">{formatHoursMinutes(event.target_finish_seconds)}</span>
            </p>
          ) : null}
        </div>
      </div>

      {splits.length > 0 ? (
        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-4">
          {splits.map((s) => (
            <div key={s.label}>
              <dt className="flex items-center gap-2 text-xs text-muted-ink">
                <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label} target
              </dt>
              <dd className="tnum mt-1 text-[15px] font-medium">{formatHoursMinutes(s.seconds)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </Card>
  );
}
