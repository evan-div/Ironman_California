import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { requireAthlete } from "@/lib/data/auth";
import { getActivity, getSession } from "@/lib/data/queries";
import { formatDate } from "@/lib/training/dates";
import { DISCIPLINES } from "@/lib/training/disciplines";
import { formatDuration, formatDurationRange } from "@/lib/training/duration";
import { activityDisplayUnit, activityPace } from "@/lib/training/format";
import { isAerobic } from "@/lib/training/totals";
import { formatDistance } from "@/lib/training/units";
import { ActivityActions, ActivityPlanLink } from "@/components/activities/activity-detail-actions";
import { DisciplineBadge } from "@/components/discipline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, profile } = await requireAthlete();
  const activity = await getActivity(supabase, id);
  if (!activity) notFound();
  const session = activity.planned_session_id ? await getSession(supabase, activity.planned_session_id) : null;

  const a = activity;
  const type = a.activity_type;
  const stats: { label: string; value: string }[] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value) stats.push({ label, value });
  };
  add("Duration", a.duration_seconds != null ? formatDuration(a.duration_seconds) : null);
  add("Distance", formatDistance(a.distance_meters, activityDisplayUnit(a, profile)));
  add(type === "bike" ? "Average speed" : "Average pace", activityPace(a, profile));
  add("RPE", a.rpe != null ? `${a.rpe} / 10` : null);
  add("Average heart rate", a.avg_heart_rate != null ? `${a.avg_heart_rate} bpm` : null);
  add("Max heart rate", a.max_heart_rate != null ? `${a.max_heart_rate} bpm` : null);
  add("Average power", a.avg_power_watts != null ? `${a.avg_power_watts} W` : null);
  add("Normalized power", a.normalized_power_watts != null ? `${a.normalized_power_watts} W` : null);
  add("Cadence", a.avg_cadence_rpm != null ? `${a.avg_cadence_rpm} rpm` : null);
  add("Where", a.swim_environment ? (a.swim_environment === "pool" ? "Pool" : "Open water") : null);
  add("Setting", a.is_indoor == null ? null : a.is_indoor ? (type === "bike" ? "Indoor / trainer" : "Indoor") : "Outdoor");
  add("Platform", a.trainer_platform);
  add("Style", a.is_run_walk ? "Run/walk" : null);
  add("Focus", a.strength_focus);
  add("Recovery type", a.recovery_subtype);
  add("Start time", a.start_time ? a.start_time.slice(0, 5) : null);

  return (
    <>
      <Link href="/activities" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted-ink hover:text-ink">
        <ArrowLeft className="size-4" />
        All activities
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <DisciplineBadge type={type} size="lg" className="mt-1" />
          <div className="min-w-0">
            <p className="eyebrow">
              {DISCIPLINES[type].label} · {formatDate(a.activity_date, "EEEE, MMMM d, yyyy")}
            </p>
            <h1 className="display mt-1.5 text-[2.1rem] break-words sm:text-[2.6rem]">{a.title}</h1>
          </div>
        </div>
        <ActivityActions activity={a} />
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recorded</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.length === 0 ? (
              <p className="text-sm text-muted-ink">No metrics were recorded for this activity.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dt className="text-xs text-muted-ink">{s.label}</dt>
                    <dd className="tnum mt-1 text-lg font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {a.duration_seconds == null ? (
              <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-faint-ink">
                No duration was recorded, so this activity adds no time to your totals. Nothing is estimated.
              </p>
            ) : !isAerobic(type) ? (
              <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-faint-ink">
                {type === "recovery"
                  ? "Recovery is tracked on its own and never counted as training time."
                  : "Strength counts toward total training time, labelled separately from aerobic time."}
              </p>
            ) : null}
            {a.notes ? (
              <div className="mt-5 border-t border-line pt-4">
                <h2 className="text-xs text-muted-ink">Notes</h2>
                <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">{a.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityPlanLink
                activity={a}
                session={
                  session
                    ? {
                        id: session.id,
                        title: session.title,
                        dateLabel: formatDate(session.session_date, "EEE, MMM d"),
                        planned: formatDurationRange(session.planned_duration_seconds, session.planned_duration_max_seconds),
                        date: session.session_date,
                      }
                    : null
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-xs leading-relaxed text-faint-ink">
              {a.origin === "manual" ? "Logged manually" : `Imported${a.external_provider ? ` from ${a.external_provider}` : ""}`} · added{" "}
              {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: profile.timezone }).format(new Date(a.created_at))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
