"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightLeft, CalendarClock, Check, CircleSlash, Link2, Link2Off, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { Activity, PlannedSession, Profile } from "@/types";
import { getLinkOptions, setActivityLink, type LinkOptions } from "@/app/actions/activities";
import { deleteSession, setSessionStatus } from "@/app/actions/sessions";
import { addDaysStr, formatDate } from "@/lib/training/dates";
import { DISCIPLINES } from "@/lib/training/disciplines";
import { formatDuration } from "@/lib/training/duration";
import { activityFacts, sessionFacts } from "@/lib/training/format";
import { useAction } from "@/hooks/use-action";
import { useWorkoutLog } from "@/components/activities/workout-log-provider";
import { DisciplineBadge } from "@/components/discipline";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function StatusPill({ session }: { session: PlannedSession }) {
  if (session.activity_type === "rest") return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-ink">Rest day</span>;
  if (session.status === "completed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sage px-2.5 py-1 text-xs font-medium text-forest-deep">
        <Check className="size-3" strokeWidth={2.5} /> Completed
      </span>
    );
  if (session.status === "skipped")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-ink">
        <CircleSlash className="size-3" /> Skipped
      </span>
    );
  return <span className="rounded-full border border-dashed border-input px-2.5 py-1 text-xs font-medium text-muted-ink">Planned</span>;
}

/** Reusable detail view for a planned session, with every plan action. */
export function SessionDialog({
  session,
  linked,
  profile,
  onOpenChange,
  onEdit,
  onMove,
}: {
  session: PlannedSession;
  linked: Activity[];
  profile: Profile;
  onOpenChange: (open: boolean) => void;
  onEdit: (session: PlannedSession) => void;
  /** Reschedule (optimistic, handled by the calendar). */
  onMove: (session: PlannedSession, date: string) => void;
}) {
  const { openLog } = useWorkoutLog();
  const { pending, run } = useAction();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [moveDate, setMoveDate] = React.useState(session.session_date);
  const [nearby, setNearby] = React.useState<LinkOptions["activities"]>([]);
  const [linkChoice, setLinkChoice] = React.useState("");

  const id = session.id;
  const date = session.session_date;
  const linkedCount = linked.length;
  React.useEffect(() => {
    let cancelled = false;
    getLinkOptions(date).then((res) => {
      if (!cancelled) setNearby(res.ok ? res.data.activities : []);
    });
    return () => {
      cancelled = true;
    };
  }, [id, date, linkedCount]);

  const s = session;
  const isRest = s.activity_type === "rest";
  const facts = sessionFacts(s, profile);
  const steps = s.structured_workout?.steps ?? [];
  const moved = s.original_date != null && s.original_date !== s.session_date;
  const linkable = nearby.filter((a) => a.activity_type === s.activity_type || s.activity_type === "other");

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent size="md">
          <DialogHeader>
            <div className="flex items-start gap-3.5">
              <DisciplineBadge type={s.activity_type} size="lg" />
              <div className="min-w-0">
                <DialogTitle className="break-words">{s.title}</DialogTitle>
                <DialogDescription>
                  {DISCIPLINES[s.activity_type].label} · {formatDate(s.session_date, "EEEE, MMMM d")}
                </DialogDescription>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill session={s} />
              {facts.map((f) => (
                <span key={f} className="tnum rounded-full bg-muted px-2.5 py-1 text-xs text-ink">
                  {f}
                </span>
              ))}
              {moved ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-ink">
                  <ArrowRightLeft className="size-3" /> Moved from {formatDate(s.original_date!, "EEE, MMM d")}
                </span>
              ) : null}
            </div>
          </DialogHeader>

          <DialogBody className="grid gap-6">
            {s.description ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{s.description}</p> : null}

            {steps.length > 0 ? (
              <section aria-label="Workout structure">
                <h3 className="eyebrow mb-2">Workout structure</h3>
                <ol className="overflow-hidden rounded-lg border border-line">
                  {steps.map((step, i) => (
                    <li key={i} className="flex items-baseline gap-3 border-b border-line px-3.5 py-2.5 last:border-b-0">
                      <span className="tnum w-12 shrink-0 text-sm font-medium">{formatDuration(step.duration_seconds)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{step.label}</span>
                        <span className="block text-[13px] text-muted-ink">
                          {step.effort}
                          {step.rpe_min != null ? ` · RPE ${step.rpe_min}${step.rpe_max != null && step.rpe_max !== step.rpe_min ? `–${step.rpe_max}` : ""}` : ""}
                          {step.ftp_percent_low != null ? ` · ${step.ftp_percent_low}${step.ftp_percent_high != null ? `–${step.ftp_percent_high}` : ""}% FTP` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-faint-ink">Guided by feel. Power targets are optional and not set.</p>
              </section>
            ) : null}

            {linked.length > 0 ? (
              <section aria-label="Logged workouts">
                <h3 className="eyebrow mb-2">Logged for this session</h3>
                <ul className="grid gap-2">
                  {linked.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ backgroundColor: `color-mix(in srgb, ${DISCIPLINES[a.activity_type].colorVar} 14%, white)` }}>
                      <div className="min-w-0 flex-1">
                        <Link href={`/activities/${a.id}`} className="block truncate text-sm font-medium hover:underline">
                          {a.title}
                        </Link>
                        <p className="tnum truncate text-[13px] text-muted-ink">
                          {formatDate(a.activity_date, "EEE, MMM d")}
                          {activityFacts(a, profile).length ? ` · ${activityFacts(a, profile).join(" · ")}` : ""}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setActivityLink(a.id, null))} aria-label={`Unlink ${a.title}`}>
                        <Link2Off /> Unlink
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {!isRest && s.status !== "completed" && linkable.length > 0 ? (
              <section className="grid gap-2">
                <Label htmlFor="sd-link">Already logged it? Link an existing workout</Label>
                <div className="flex gap-2">
                  <NativeSelect id="sd-link" value={linkChoice} onChange={(e) => setLinkChoice(e.target.value)}>
                    <option value="">Choose a workout…</option>
                    {linkable.map((a) => (
                      <option key={a.id} value={a.id}>
                        {formatDate(a.activity_date, "EEE MMM d")} · {a.title}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button variant="secondary" disabled={!linkChoice || pending} onClick={() => run(() => setActivityLink(linkChoice, s.id))}>
                    <Link2 /> Link
                  </Button>
                </div>
              </section>
            ) : null}

            <section className="grid gap-2">
              <Label htmlFor="sd-move" className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" /> Move to another day
              </Label>
              <div className="flex flex-wrap gap-2">
                <Input id="sd-move" type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className="w-auto min-w-40 flex-1 sm:flex-none" />
                <Button variant="secondary" disabled={!moveDate || moveDate === s.session_date} onClick={() => onMove(s, moveDate)}>
                  Move
                </Button>
                <Button variant="outline" onClick={() => onMove(s, addDaysStr(s.session_date, -1))} aria-label="Move one day earlier">
                  −1 day
                </Button>
                <Button variant="outline" onClick={() => onMove(s, addDaysStr(s.session_date, 1))} aria-label="Move one day later">
                  +1 day
                </Button>
              </div>
              {s.status === "completed" ? <p className="text-xs text-faint-ink">Moving the plan doesn&apos;t change the date of the logged workout.</p> : null}
            </section>
          </DialogBody>

          <DialogFooter className="justify-between">
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(true)} aria-label="Delete session" className="text-danger hover:text-danger">
                <Trash2 />
              </Button>
              <Button variant="ghost" onClick={() => onEdit(s)}>
                <Pencil /> Edit
              </Button>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {!isRest && s.status === "planned" ? (
                <Button variant="outline" disabled={pending} onClick={() => run(() => setSessionStatus(s.id, "skipped"))}>
                  {pending ? <Loader2 className="animate-spin" /> : <CircleSlash />} Mark skipped
                </Button>
              ) : null}
              {s.status === "skipped" ? (
                <Button variant="outline" disabled={pending} onClick={() => run(() => setSessionStatus(s.id, "planned"))}>
                  {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Restore
                </Button>
              ) : null}
              {!isRest && s.status !== "completed" ? (
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    openLog({ session: s });
                  }}
                >
                  <Check /> Log completion
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this planned session?"
        description={
          linked.length > 0
            ? "The plan will be removed. Your logged workout stays in your history as an unplanned activity."
            : `“${s.title}” on ${formatDate(s.session_date, "EEE, MMM d")} will be removed from your plan.`
        }
        pending={pending}
        onConfirm={() =>
          run(() => deleteSession(s.id), {
            onSuccess: () => {
              setConfirmDelete(false);
              onOpenChange(false);
            },
          })
        }
      />
    </>
  );
}

/** Quick look at a logged activity from the calendar. */
export function ActivityQuickDialog({ activity, profile, onOpenChange }: { activity: Activity | null; profile: Profile; onOpenChange: (open: boolean) => void }) {
  const { openLog } = useWorkoutLog();
  if (!activity) return null;
  const facts = activityFacts(activity, profile);
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="flex items-start gap-3.5">
            <DisciplineBadge type={activity.activity_type} size="lg" />
            <div className="min-w-0">
              <DialogTitle className="break-words">{activity.title}</DialogTitle>
              <DialogDescription>
                {DISCIPLINES[activity.activity_type].label} · {formatDate(activity.activity_date, "EEEE, MMMM d")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-sage px-2.5 py-1 text-xs font-medium text-forest-deep">
              <Check className="size-3" strokeWidth={2.5} /> Completed
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-ink">{activity.planned_session_id ? "Linked to plan" : "Unplanned"}</span>
            {facts.map((f) => (
              <span key={f} className="tnum rounded-full bg-muted px-2.5 py-1 text-xs text-ink">
                {f}
              </span>
            ))}
          </div>
          {activity.notes ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{activity.notes}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              openLog({ activity });
            }}
          >
            <Pencil /> Edit
          </Button>
          <Button asChild>
            <Link href={`/activities/${activity.id}`}>Open details</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
