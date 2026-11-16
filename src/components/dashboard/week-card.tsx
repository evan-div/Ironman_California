import type { Profile } from "@/types";
import type { PlannedVsActual, Totals } from "@/lib/training/totals";
import { swimDistance } from "@/lib/training/totals";
import { formatDuration, formatHours } from "@/lib/training/duration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-xs text-muted-ink">
        <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </dt>
      <dd className="tnum mt-1 text-xl font-medium tracking-tight">{value}</dd>
      {sub ? <p className="text-xs text-faint-ink">{sub}</p> : null}
    </div>
  );
}

export function WeekCard({
  totals,
  pva,
  profile,
  rangeLabel,
}: {
  totals: Totals;
  pva: PlannedVsActual;
  profile: Profile;
  rangeLabel: string;
}) {
  const planned = pva.plannedSeconds;
  const actual = pva.actualSeconds;
  const pct = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0;
  const goal = profile.weekly_goal_hours;
  const swimUnit = profile.swim_unit;

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>This week</CardTitle>
          <p className="mt-1 text-[13px] text-muted-ink">{rangeLabel}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between gap-4">
          <p>
            <span className="display tnum text-5xl" data-testid="week-actual-hours">
              {formatHours(actual)}
            </span>
            <span className="ml-1.5 text-sm text-muted-ink">
              {planned > 0 ? (
                <>
                  of <span className="tnum" data-testid="week-planned-hours">{formatHours(planned)}</span> planned hours
                </>
              ) : (
                "hours trained"
              )}
            </span>
          </p>
          {planned > 0 ? <p className="tnum text-sm font-medium text-forest">{pct}%</p> : null}
        </div>

        {planned > 0 ? (
          <div
            role="progressbar"
            aria-label="Completed training time versus planned this week"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-forest transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-muted-ink">No sessions are planned this week yet.</p>
        )}

        <p className="mt-3 text-xs leading-relaxed text-faint-ink">
          Training time = swim, bike, run and other workouts, plus strength
          {pva.actualStrengthSeconds > 0 || pva.plannedStrengthSeconds > 0
            ? ` (${formatDuration(pva.actualStrengthSeconds)} done of ${formatDuration(pva.plannedStrengthSeconds)} planned)`
            : ""}
          . Recovery isn&apos;t counted.
          {goal != null ? ` Weekly goal: ${goal} h.` : ""}
          {totals.missingDurationCount > 0
            ? ` ${totals.missingDurationCount} ${totals.missingDurationCount === 1 ? "activity has" : "activities have"} no recorded duration and add no time.`
            : ""}
        </p>

        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5">
          <Stat
            label="Swim"
            color="var(--swim)"
            value={`${swimDistance(totals.swimMeters, swimUnit).toLocaleString("en-US")} ${swimUnit}`}
            sub={totals.swimSeconds > 0 ? formatDuration(totals.swimSeconds) : undefined}
          />
          <Stat label="Bike" color="var(--bike)" value={formatDuration(totals.bikeSeconds)} />
          <Stat label="Run" color="var(--run)" value={formatDuration(totals.runSeconds)} />
        </dl>
        {totals.recoverySeconds > 0 ? (
          <p className="tnum mt-4 flex items-center gap-2 text-xs text-muted-ink">
            <span aria-hidden className="size-2 rounded-full bg-recovery" />
            Recovery logged: {formatDuration(totals.recoverySeconds)} (not counted above)
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
