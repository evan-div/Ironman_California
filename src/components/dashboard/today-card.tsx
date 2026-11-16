"use client";

import Link from "next/link";
import { Check, CircleSlash, Sun } from "lucide-react";
import type { Activity, PlannedSession, Profile } from "@/types";
import { sessionFacts } from "@/lib/training/format";
import { ActivityRow } from "@/components/activities/activity-row";
import { useWorkoutLog } from "@/components/activities/workout-log-provider";
import { DisciplineBadge } from "@/components/discipline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function TodayCard({
  sessions,
  activities,
  profile,
  dateLabel,
}: {
  sessions: PlannedSession[];
  activities: Activity[];
  profile: Profile;
  dateLabel: string;
}) {
  const { openLog } = useWorkoutLog();
  const nothing = sessions.length === 0 && activities.length === 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>Today</CardTitle>
          <p className="mt-1 text-[13px] text-muted-ink">{dateLabel}</p>
        </div>
        <Link href="/calendar" className="text-[13px] text-forest hover:underline">
          Open calendar
        </Link>
      </CardHeader>
      <CardContent className="grid gap-5">
        {nothing ? (
          <EmptyState icon={<Sun />} title="Nothing planned today">
            An open day. Log something if you move, or enjoy the rest.
          </EmptyState>
        ) : null}

        {sessions.length > 0 ? (
          <section aria-label="Planned today">
            <h3 className="eyebrow mb-2">Planned</h3>
            <ul className="grid gap-2">
              {sessions.map((s) => {
                const facts = sessionFacts(s, profile);
                return (
                  <li key={s.id} className="flex items-center gap-3.5 rounded-lg border border-dashed border-input px-3 py-2.5">
                    <DisciplineBadge type={s.activity_type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="tnum truncate text-[13px] text-muted-ink">{facts.length ? facts.join(" · ") : s.activity_type === "rest" ? "Recover well" : "No duration set"}</p>
                    </div>
                    {s.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-forest">
                        <Check className="size-3.5" /> Done
                      </span>
                    ) : s.status === "skipped" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-ink">
                        <CircleSlash className="size-3.5" /> Skipped
                      </span>
                    ) : s.activity_type !== "rest" ? (
                      <Button size="sm" variant="secondary" onClick={() => openLog({ session: s })}>
                        Log it
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {activities.length > 0 ? (
          <section aria-label="Completed today">
            <h3 className="eyebrow mb-1">Completed</h3>
            <ul>
              {activities.map((a) => (
                <li key={a.id}>
                  <ActivityRow activity={a} profile={profile} showDate={false} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
