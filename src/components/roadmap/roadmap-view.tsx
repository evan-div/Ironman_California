"use client";

import * as React from "react";
import { Check, Flag, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { GoalEvent, Milestone, TrainingPhase } from "@/types";
import { deleteMilestone, deletePhase, saveMilestone, savePhase, setMilestoneCompleted } from "@/app/actions/roadmap";
import { daysBetween, formatDate } from "@/lib/training/dates";
import { formatHoursTarget, phaseProgress, phaseState } from "@/lib/training/phases";
import { useAction } from "@/hooks/use-action";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import { Field, fieldAria } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PhaseDraft = { id: string | null; name: string; start_date: string; end_date: string; target_hours_min: string; target_hours_max: string; focus: string };
type MilestoneDraft = { id: string | null; title: string; description: string; target_date: string };

const numStr = (n: number | null) => (n == null ? "" : String(n));

export function RoadmapView({ phases, milestones, event, today }: { phases: TrainingPhase[]; milestones: Milestone[]; event: GoalEvent | null; today: string }) {
  const { pending, run } = useAction();
  const [phaseDraft, setPhaseDraft] = React.useState<PhaseDraft | null>(null);
  const [milestoneDraft, setMilestoneDraft] = React.useState<MilestoneDraft | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [confirm, setConfirm] = React.useState<{ kind: "phase" | "milestone"; id: string; name: string } | null>(null);
  const [toggling, setToggling] = React.useState<string | null>(null);
  const err = (k: string) => errors[k]?.[0];

  const first = phases[0]?.start_date;
  const last = phases.length ? phases.reduce((m, p) => (p.end_date > m ? p.end_date : m), phases[0].end_date) : undefined;
  const span = first && last ? daysBetween(first, last) + 1 : 0;
  const todayPct = first && span > 0 ? (daysBetween(first, today) / span) * 100 : -1;

  function submitPhase(e: React.FormEvent) {
    e.preventDefault();
    if (!phaseDraft) return;
    const { id, ...values } = phaseDraft;
    setErrors({});
    run(() => savePhase(id, values), { onSuccess: () => setPhaseDraft(null) }).then((r) => !r.ok && setErrors(r.fieldErrors ?? {}));
  }
  function submitMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!milestoneDraft) return;
    const { id, ...values } = milestoneDraft;
    setErrors({});
    run(() => saveMilestone(id, values), { onSuccess: () => setMilestoneDraft(null) }).then((r) => !r.ok && setErrors(r.fieldErrors ?? {}));
  }

  return (
    <div className="grid gap-10">
      <section aria-labelledby="phases-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="phases-heading" className="text-lg font-semibold">
            Training phases
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setErrors({});
              setPhaseDraft({ id: null, name: "", start_date: today, end_date: today, target_hours_min: "", target_hours_max: "", focus: "" });
            }}
          >
            <Plus /> Add phase
          </Button>
        </div>

        {phases.length === 0 ? (
          <Card>
            <EmptyState icon={<Flag />} title="No phases yet" className="py-12">
              Break the journey into phases — each with a date range, a rough weekly-hours target and a focus.
            </EmptyState>
          </Card>
        ) : (
          <>
            {span > 0 ? (
              <div className="mb-5 hidden sm:block" aria-hidden>
                <div className="relative flex h-2.5 gap-0.5">
                  {phases.map((p) => {
                    const state = phaseState(p, today);
                    return (
                      <div
                        key={p.id}
                        className={cn("h-full rounded-full", state === "past" ? "bg-forest" : state === "current" ? "bg-forest/55" : "bg-[#dfe2d8]")}
                        style={{ flexGrow: daysBetween(p.start_date, p.end_date) + 1, flexBasis: 0 }}
                      />
                    );
                  })}
                  {todayPct >= 0 && todayPct <= 100 ? (
                    <span className="absolute -top-1.5 h-5 w-0.5 rounded-full bg-ink" style={{ left: `${todayPct}%` }} />
                  ) : null}
                </div>
                <div className="mt-2 flex justify-between text-xs text-faint-ink">
                  <span>{formatDate(first!, "MMM yyyy")}</span>
                  <span>{todayPct >= 0 && todayPct <= 100 ? "The dark marker is today" : ""}</span>
                  <span>{formatDate(last!, "MMM yyyy")}</span>
                </div>
              </div>
            ) : null}

            <ol className="grid gap-3">
              {phases.map((p, i) => {
                const state = phaseState(p, today);
                const target = formatHoursTarget(p.target_hours_min, p.target_hours_max);
                return (
                  <li key={p.id}>
                    <Card className={cn("flex gap-4 p-4 sm:gap-5 sm:p-5", state === "current" && "border-forest/45")}>
                      <span
                        className={cn(
                          "tnum grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold",
                          state === "past" ? "bg-forest text-white" : state === "current" ? "bg-sage text-forest-deep" : "bg-muted text-muted-ink",
                        )}
                        aria-hidden
                      >
                        {state === "past" ? <Check className="size-4" strokeWidth={2.5} /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="display text-2xl">{p.name}</h3>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                              state === "current" ? "bg-forest text-white" : "bg-muted text-muted-ink",
                            )}
                          >
                            {state === "current" ? "Current" : state === "past" ? "Complete" : "Upcoming"}
                          </span>
                        </div>
                        <p className="tnum mt-1 text-[13px] text-muted-ink">
                          {formatDate(p.start_date, "MMM d, yyyy")} – {formatDate(p.end_date, "MMM d, yyyy")}
                          {target ? ` · roughly ${target}` : ""}
                        </p>
                        {p.focus ? <p className="mt-2 text-sm leading-relaxed">{p.focus}</p> : null}
                        {state === "current" ? (
                          <div className="mt-3 h-1 max-w-xs overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Progress through ${p.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(phaseProgress(p, today) * 100)}>
                            <div className="h-full rounded-full bg-forest" style={{ width: `${Math.max(2, phaseProgress(p, today) * 100)}%` }} />
                          </div>
                        ) : null}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => {
                          setErrors({});
                          setPhaseDraft({ id: p.id, name: p.name, start_date: p.start_date, end_date: p.end_date, target_hours_min: numStr(p.target_hours_min), target_hours_max: numStr(p.target_hours_max), focus: p.focus ?? "" });
                        }}
                      >
                        <Pencil />
                      </Button>
                    </Card>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>

      <section aria-labelledby="milestones-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="milestones-heading" className="text-lg font-semibold">
              Milestones
            </h2>
            {event ? <p className="mt-0.5 text-[13px] text-muted-ink">Checkpoints on the way to {formatDate(event.event_date, "MMMM d, yyyy")}.</p> : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setErrors({});
              setMilestoneDraft({ id: null, title: "", description: "", target_date: today });
            }}
          >
            <Plus /> Add milestone
          </Button>
        </div>

        {milestones.length === 0 ? (
          <Card>
            <EmptyState icon={<Flag />} title="No milestones yet" className="py-12">
              Add checkpoints worth aiming at — a first long ride, a test swim, race day.
            </EmptyState>
          </Card>
        ) : (
          <Card className="p-1.5 sm:p-2">
            <ul className="divide-y divide-line/70">
              {milestones.map((m) => {
                const done = m.completed_at != null;
                const overdue = !done && m.target_date < today;
                return (
                  <li key={m.id} className="flex items-start gap-3.5 px-2.5 py-3.5 sm:px-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={done}
                      aria-label={`${done ? "Reopen" : "Complete"} milestone: ${m.title}`}
                      disabled={toggling === m.id}
                      onClick={() => {
                        setToggling(m.id);
                        run(() => setMilestoneCompleted(m.id, !done)).finally(() => setToggling(null));
                      }}
                      className={cn(
                        "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                        done ? "border-forest bg-forest text-white" : "border-input bg-surface hover:border-forest",
                      )}
                    >
                      {toggling === m.id ? <Loader2 className="size-3.5 animate-spin" /> : done ? <Check className="size-3.5" strokeWidth={3} /> : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", done && "text-muted-ink line-through")}>{m.title}</p>
                      <p className="tnum text-[13px] text-muted-ink">
                        {formatDate(m.target_date, "EEE, MMM d, yyyy")}
                        {done ? " · reached" : overdue ? " · date passed" : ""}
                      </p>
                      {m.description ? <p className="mt-1 text-[13px] leading-relaxed text-muted-ink">{m.description}</p> : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit milestone: ${m.title}`}
                      onClick={() => {
                        setErrors({});
                        setMilestoneDraft({ id: m.id, title: m.title, description: m.description ?? "", target_date: m.target_date });
                      }}
                    >
                      <Pencil />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      {/* Phase editor */}
      <Dialog open={phaseDraft != null} onOpenChange={(o) => !o && setPhaseDraft(null)}>
        {phaseDraft ? (
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>{phaseDraft.id ? "Edit phase" : "Add phase"}</DialogTitle>
              <DialogDescription>Targets are rough weekly ranges to plan around, not prescriptions.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submitPhase} className="flex min-h-0 flex-1 flex-col" noValidate>
              <DialogBody className="grid gap-4">
                <Field label="Name" htmlFor="ph-name" error={err("name")}>
                  <Input {...fieldAria("ph-name", err("name"))} value={phaseDraft.name} onChange={(e) => setPhaseDraft({ ...phaseDraft, name: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Starts" htmlFor="ph-start" error={err("start_date")}>
                    <Input type="date" {...fieldAria("ph-start", err("start_date"))} value={phaseDraft.start_date} onChange={(e) => setPhaseDraft({ ...phaseDraft, start_date: e.target.value })} />
                  </Field>
                  <Field label="Ends" htmlFor="ph-end" error={err("end_date")}>
                    <Input type="date" {...fieldAria("ph-end", err("end_date"))} value={phaseDraft.end_date} onChange={(e) => setPhaseDraft({ ...phaseDraft, end_date: e.target.value })} />
                  </Field>
                  <Field label="Weekly hours, from" htmlFor="ph-min" optional error={err("target_hours_min")}>
                    <Input {...fieldAria("ph-min", err("target_hours_min"))} inputMode="decimal" value={phaseDraft.target_hours_min} onChange={(e) => setPhaseDraft({ ...phaseDraft, target_hours_min: e.target.value })} />
                  </Field>
                  <Field label="Weekly hours, to" htmlFor="ph-max" optional error={err("target_hours_max")}>
                    <Input {...fieldAria("ph-max", err("target_hours_max"))} inputMode="decimal" value={phaseDraft.target_hours_max} onChange={(e) => setPhaseDraft({ ...phaseDraft, target_hours_max: e.target.value })} />
                  </Field>
                </div>
                <Field label="Focus" htmlFor="ph-focus" optional error={err("focus")}>
                  <Textarea {...fieldAria("ph-focus", err("focus"))} rows={2} value={phaseDraft.focus} onChange={(e) => setPhaseDraft({ ...phaseDraft, focus: e.target.value })} />
                </Field>
              </DialogBody>
              <DialogFooter className="justify-between">
                {phaseDraft.id ? (
                  <Button type="button" variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirm({ kind: "phase", id: phaseDraft.id!, name: phaseDraft.name })}>
                    <Trash2 /> Delete
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setPhaseDraft(null)} disabled={pending}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="animate-spin" /> : null}
                    Save phase
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>

      {/* Milestone editor */}
      <Dialog open={milestoneDraft != null} onOpenChange={(o) => !o && setMilestoneDraft(null)}>
        {milestoneDraft ? (
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>{milestoneDraft.id ? "Edit milestone" : "Add milestone"}</DialogTitle>
              <DialogDescription>A dated checkpoint you can tick off.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submitMilestone} className="flex min-h-0 flex-1 flex-col" noValidate>
              <DialogBody className="grid gap-4">
                <Field label="Title" htmlFor="ms-title" error={err("title")}>
                  <Input {...fieldAria("ms-title", err("title"))} value={milestoneDraft.title} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, title: e.target.value })} />
                </Field>
                <Field label="Target date" htmlFor="ms-date" error={err("target_date")}>
                  <Input type="date" {...fieldAria("ms-date", err("target_date"))} value={milestoneDraft.target_date} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, target_date: e.target.value })} />
                </Field>
                <Field label="Description" htmlFor="ms-desc" optional error={err("description")}>
                  <Textarea {...fieldAria("ms-desc", err("description"))} rows={3} value={milestoneDraft.description} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, description: e.target.value })} />
                </Field>
              </DialogBody>
              <DialogFooter className="justify-between">
                {milestoneDraft.id ? (
                  <Button type="button" variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirm({ kind: "milestone", id: milestoneDraft.id!, name: milestoneDraft.title })}>
                    <Trash2 /> Delete
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setMilestoneDraft(null)} disabled={pending}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="animate-spin" /> : null}
                    Save milestone
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={confirm != null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === "phase" ? "Delete this phase?" : "Delete this milestone?"}
        description={`“${confirm?.name ?? ""}” will be removed from your roadmap. Your workouts and planned sessions are not affected.`}
        pending={pending}
        onConfirm={() => {
          if (!confirm) return;
          run(() => (confirm.kind === "phase" ? deletePhase(confirm.id) : deleteMilestone(confirm.id)), {
            onSuccess: () => {
              setConfirm(null);
              setPhaseDraft(null);
              setMilestoneDraft(null);
            },
          });
        }}
      />
    </div>
  );
}
