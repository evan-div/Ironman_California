import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { TrainingPhase } from "@/types";
import { formatDate } from "@/lib/training/dates";
import { currentPhase, formatHoursTarget, nextPhase, phaseProgress } from "@/lib/training/phases";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PhaseCard({ phases, today }: { phases: TrainingPhase[]; today: string }) {
  const phase = currentPhase(phases, today);
  const upcoming = phase ? null : nextPhase(phases, today);
  const shown = phase ?? upcoming;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{phase ? "Current phase" : upcoming ? "Next phase" : "Training phase"}</CardTitle>
        <Link href="/roadmap" className="inline-flex items-center gap-1 text-[13px] text-forest hover:underline">
          Roadmap
          <ArrowUpRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {shown ? (
          <>
            <p className="display text-[1.7rem] leading-tight">{shown.name}</p>
            <p className="tnum mt-1.5 text-[13px] text-muted-ink">
              {formatDate(shown.start_date, "MMM d")} – {formatDate(shown.end_date, "MMM d, yyyy")}
              {formatHoursTarget(shown.target_hours_min, shown.target_hours_max) ? ` · ~${formatHoursTarget(shown.target_hours_min, shown.target_hours_max)}` : ""}
            </p>
            {shown.focus ? <p className="mt-3 text-sm leading-relaxed text-ink">{shown.focus}</p> : null}
            {phase ? (
              <div className="mt-auto pt-5">
                <div
                  role="progressbar"
                  aria-label="Progress through this phase"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(phaseProgress(phase, today) * 100)}
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  <div className="h-full rounded-full bg-forest" style={{ width: `${Math.max(2, phaseProgress(phase, today) * 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-faint-ink">{Math.round(phaseProgress(phase, today) * 100)}% of this phase by calendar days</p>
              </div>
            ) : (
              <p className="mt-auto pt-5 text-xs text-faint-ink">Starts {formatDate(shown.start_date, "MMMM d, yyyy")}</p>
            )}
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-ink">
            No phase covers today. Add training phases on the roadmap to see your current focus here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
