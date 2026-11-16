"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Activity, PlannedSession, Profile } from "@/types";
import { moveSession } from "@/app/actions/sessions";
import { addDaysStr, addMonthsStr, formatDate, monthEnd, monthStart } from "@/lib/training/dates";
import { formatDuration, formatHours } from "@/lib/training/duration";
import { plannedVsActual } from "@/lib/training/totals";
import { useWorkoutLog } from "@/components/activities/workout-log-provider";
import { DisciplineDot } from "@/components/discipline";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { ActivityChip, DraggableSessionChip, SessionChip } from "./chips";
import { ActivityQuickDialog, SessionDialog } from "./session-dialog";
import { SessionFormDialog } from "./session-form-dialog";

type View = "week" | "month";

type DayData = {
  sessions: PlannedSession[];
  /** Activities shown as their own chip (unplanned, or logged on a different day than their plan). */
  activities: Activity[];
  /** All activities on this date, for totals. */
  allActivities: Activity[];
};

const href = (view: View, date: string) => `/calendar?view=${view}&date=${date}`;

export function CalendarView({
  view,
  anchor,
  today,
  weeks,
  sessions: serverSessions,
  activities,
  profile,
}: {
  view: View;
  anchor: string;
  today: string;
  weeks: string[][];
  sessions: PlannedSession[];
  activities: Activity[];
  profile: Profile;
}) {
  const router = useRouter();
  const { openLog } = useWorkoutLog();
  const [, startTransition] = React.useTransition();

  // Moves apply instantly; if the server rejects one, this state falls back to the server's truth.
  const [sessions, applyMove] = React.useOptimistic(serverSessions, (current, move: { id: string; date: string }) =>
    current.map((s) =>
      s.id === move.id ? { ...s, session_date: move.date, original_date: s.original_date ?? s.session_date } : s,
    ),
  );

  const [openSessionId, setOpenSessionId] = React.useState<string | null>(null);
  const [openActivityId, setOpenActivityId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ session: PlannedSession | null; date: string; nonce: number } | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [selectedDay, setSelectedDay] = React.useState(() => {
    const all = weeks.flat();
    return all.includes(today) ? today : anchor;
  });
  const [announcement, setAnnouncement] = React.useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const linkedBySession = React.useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities) {
      if (!a.planned_session_id) continue;
      map.set(a.planned_session_id, [...(map.get(a.planned_session_id) ?? []), a]);
    }
    return map;
  }, [activities]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, DayData>();
    const get = (d: string) => {
      let v = map.get(d);
      if (!v) map.set(d, (v = { sessions: [], activities: [], allActivities: [] }));
      return v;
    };
    const sessionDate = new Map(sessions.map((s) => [s.id, s.session_date]));
    for (const s of sessions) get(s.session_date).sessions.push(s);
    for (const a of activities) {
      const day = get(a.activity_date);
      day.allActivities.push(a);
      // Folded into its session chip when both sit on the same day.
      const foldedIntoSession = a.planned_session_id != null && sessionDate.get(a.planned_session_id) === a.activity_date;
      if (!foldedIntoSession) day.activities.push(a);
    }
    return map;
  }, [sessions, activities]);

  const dayData = (d: string): DayData => byDay.get(d) ?? { sessions: [], activities: [], allActivities: [] };
  const sameDayLinked = (s: PlannedSession) => (linkedBySession.get(s.id) ?? []).filter((a) => a.activity_date === s.session_date);

  function move(session: PlannedSession, date: string) {
    if (date === session.session_date) return;
    startTransition(async () => {
      applyMove({ id: session.id, date });
      const result = await moveSession(session.id, date).catch(() => ({ ok: false as const, error: "We couldn't reach the server. The session was not moved." }));
      if (result.ok) {
        const text = `${session.title} moved to ${formatDate(date, "EEEE, MMM d")}`;
        toast.success(text);
        setAnnouncement(text);
      } else {
        toast.error(result.error);
        setAnnouncement(`${session.title} could not be moved.`);
      }
    });
  }

  function onDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const target = e.over ? String(e.over.id).replace(/^day:/, "") : null;
    const session = sessions.find((s) => s.id === e.active.id);
    if (session && target) move(session, target);
  }

  // Range summary: the visible week, or the calendar month in month view.
  const rangeFrom = view === "week" ? weeks[0][0] : monthStart(anchor);
  const rangeTo = view === "week" ? weeks[0][6] : monthEnd(anchor);
  const summary = plannedVsActual(
    sessions.filter((s) => s.session_date >= rangeFrom && s.session_date <= rangeTo),
    activities.filter((a) => a.activity_date >= rangeFrom && a.activity_date <= rangeTo),
  );
  const pct = summary.plannedSeconds > 0 ? Math.min(100, Math.round((summary.actualSeconds / summary.plannedSeconds) * 100)) : 0;

  const title =
    view === "week"
      ? `${formatDate(weeks[0][0], "MMM d")} – ${formatDate(weeks[0][6], weeks[0][0].slice(0, 7) === weeks[0][6].slice(0, 7) ? "d, yyyy" : "MMM d, yyyy")}`
      : formatDate(anchor, "MMMM yyyy");
  const prev = view === "week" ? addDaysStr(anchor, -7) : addMonthsStr(monthStart(anchor), -1);
  const next = view === "week" ? addDaysStr(anchor, 7) : addMonthsStr(monthStart(anchor), 1);

  const openSession = sessions.find((s) => s.id === openSessionId) ?? null;
  const openActivity = activities.find((a) => a.id === openActivityId) ?? null;
  const draggingSession = sessions.find((s) => s.id === draggingId) ?? null;
  const planOn = (date: string) => setForm((f) => ({ session: null, date, nonce: (f?.nonce ?? 0) + 1 }));

  const renderItems = (date: string, opts: { compact?: boolean; draggable?: boolean; limit?: number }) => {
    const data = dayData(date);
    const items: React.ReactNode[] = [
      ...data.sessions.map((s) => {
        const props = { session: s, linked: sameDayLinked(s), prefs: profile, compact: opts.compact, onOpen: () => setOpenSessionId(s.id) };
        return <li key={s.id}>{opts.draggable ? <DraggableSessionChip {...props} /> : <SessionChip {...props} />}</li>;
      }),
      ...data.activities.map((a) => (
        <li key={a.id}>
          <ActivityChip activity={a} prefs={profile} compact={opts.compact} onOpen={() => setOpenActivityId(a.id)} />
        </li>
      )),
    ];
    const shown = opts.limit && items.length > opts.limit ? items.slice(0, opts.limit - 1) : items;
    return { items: shown, hidden: items.length - shown.length, total: items.length };
  };

  const dayTotalsLabel = (date: string) => {
    const d = dayData(date);
    const t = plannedVsActual(d.sessions, d.allActivities);
    if (t.plannedSeconds === 0 && t.actualSeconds === 0) return null;
    const minutes = (sec: number) => formatDuration(Math.round(sec / 60) * 60);
    return `${minutes(t.actualSeconds)} / ${minutes(t.plannedSeconds)}`;
  };

  const dayActions = (date: string, className?: string) => (
    <div className={cn("flex gap-1.5", className)}>
      <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 px-2 text-xs" onClick={() => planOn(date)} aria-label={`Plan a session on ${formatDate(date, "EEEE, MMM d")}`}>
        <Plus className="size-3" /> Plan
      </Button>
      <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 px-2 text-xs" onClick={() => openLog({ date })} aria-label={`Log a workout on ${formatDate(date, "EEEE, MMM d")}`}>
        <Plus className="size-3" /> Log
      </Button>
    </div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button asChild variant="outline" size="icon" aria-label={view === "week" ? "Previous week" : "Previous month"}>
            <Link href={href(view, prev)}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" aria-label={view === "week" ? "Next week" : "Next month"}>
            <Link href={href(view, next)}>
              <ChevronRight />
            </Link>
          </Button>
          <Button asChild variant="outline" className="ml-1">
            <Link href={href(view, today)}>Today</Link>
          </Button>
          <h2 className="tnum ml-2 text-base font-semibold sm:text-lg" aria-live="polite" data-testid="calendar-title">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Segmented<View>
            ariaLabel="Calendar view"
            value={view}
            onValueChange={(v) => router.push(href(v, anchor))}
            options={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
          <Button onClick={() => planOn(view === "week" && weeks[0].includes(today) ? today : selectedDay)}>
            <Plus />
            <span className="hidden sm:inline">Plan session</span>
            <span className="sm:hidden">Plan</span>
          </Button>
        </div>
      </div>

      {/* Planned vs actual */}
      <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="text-sm">
            <span className="tnum font-semibold" data-testid="calendar-actual">{formatHours(summary.actualSeconds)} h</span>
            <span className="text-muted-ink"> completed of </span>
            <span className="tnum font-semibold" data-testid="calendar-planned">{formatHours(summary.plannedSeconds)} h</span>
            <span className="text-muted-ink"> planned {view === "week" ? "this week" : `in ${formatDate(anchor, "MMMM")}`}</span>
          </p>
          <p className="text-xs text-faint-ink">Training time incl. strength · rest and recovery not counted</p>
        </div>
        <div
          role="progressbar"
          aria-label="Completed versus planned training time"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-forest transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Legend */}
      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-ink" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3.5 w-5 rounded border border-dashed border-muted-ink/60" /> Planned
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3.5 w-5 rounded bg-sage" /> Completed
        </li>
        {(["swim", "bike", "run", "strength", "recovery"] as const).map((t) => (
          <li key={t} className="flex items-center gap-1.5 capitalize">
            <DisciplineDot type={t} /> {t}
          </li>
        ))}
        <li className="hidden md:block">Drag a planned session to another day to reschedule.</li>
      </ul>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {/* Desktop grid with drag and drop */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDraggingId(null)}>
        <div className="mt-4 hidden md:block">
          <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-px overflow-hidden rounded-xl border border-line bg-line" data-testid="calendar-grid">
            {view === "month"
              ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="eyebrow bg-canvas px-3 py-2">
                    {d}
                  </div>
                ))
              : null}
            {weeks.flat().map((date) => {
              const { items, hidden } = renderItems(date, { compact: view === "month", draggable: true, limit: view === "month" ? 4 : undefined });
              const outside = view === "month" && date.slice(0, 7) !== anchor.slice(0, 7);
              return (
                <DroppableDay key={date} date={date} className={cn("group/day flex min-w-0 flex-col bg-surface", view === "week" ? "min-h-[26rem] p-2.5" : "min-h-32 p-1.5", outside && "bg-canvas/70")}>
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <Link
                      href={href("week", date)}
                      className={cn("flex items-baseline gap-1.5 rounded-md px-1 hover:bg-muted", outside && "opacity-50")}
                      aria-label={`${formatDate(date, "EEEE, MMMM d")}${date === today ? ", today" : ""}`}
                    >
                      {view === "week" ? <span className="eyebrow">{formatDate(date, "EEE")}</span> : null}
                      <span className={cn("tnum grid place-items-center text-sm font-semibold", date === today && "size-6 rounded-full bg-forest text-xs text-white")}>
                        {formatDate(date, "d")}
                      </span>
                    </Link>
                    {view === "week" ? (
                      <span className="tnum shrink-0 text-[11px] whitespace-nowrap text-faint-ink" title="Completed / planned training time">
                        {dayTotalsLabel(date)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => planOn(date)}
                        aria-label={`Plan a session on ${formatDate(date, "EEEE, MMM d")}`}
                        className="grid size-6 place-items-center rounded-full text-faint-ink opacity-0 transition-opacity hover:bg-muted hover:text-ink focus-visible:opacity-100 group-hover/day:opacity-100"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <ul className={cn("grid content-start", view === "week" ? "gap-1.5" : "gap-1")}>{items}</ul>
                  {hidden > 0 ? (
                    <Link href={href("week", date)} className="mt-1 px-1 text-[11px] text-forest hover:underline">
                      +{hidden} more
                    </Link>
                  ) : null}
                  {view === "week" ? dayActions(date, "mt-auto pt-3 opacity-0 transition-opacity group-focus-within/day:opacity-100 group-hover/day:opacity-100") : null}
                </DroppableDay>
              );
            })}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {draggingSession ? <SessionChip session={draggingSession} linked={[]} prefs={profile} compact={view === "month"} dragging className="bg-surface" /> : null}
        </DragOverlay>
      </DndContext>

      {/* Phone: week agenda */}
      {view === "week" ? (
        <ol className="mt-4 grid gap-3 md:hidden">
          {weeks[0].map((date) => {
            const { items, total } = renderItems(date, {});
            return (
              <li key={date} className={cn("rounded-xl border border-line bg-surface p-3", date === today && "border-forest/40")}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-baseline gap-2 text-sm font-semibold">
                    {formatDate(date, "EEEE")}
                    <span className={cn("tnum text-[13px] font-normal text-muted-ink", date === today && "font-medium text-forest")}>
                      {date === today ? "Today · " : ""}
                      {formatDate(date, "MMM d")}
                    </span>
                  </h3>
                  <span className="tnum text-[11px] text-faint-ink">{dayTotalsLabel(date)}</span>
                </div>
                {total > 0 ? <ul className="grid gap-1.5">{items}</ul> : <p className="px-1 py-1 text-[13px] text-faint-ink">Nothing planned</p>}
                {dayActions(date, "mt-2.5")}
              </li>
            );
          })}
        </ol>
      ) : (
        /* Phone: compact month grid + selected-day agenda */
        <div className="mt-4 md:hidden">
          <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-line bg-surface">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="eyebrow py-2 text-center" aria-hidden>
                {d}
              </div>
            ))}
            {weeks.flat().map((date) => {
              const d = dayData(date);
              const outside = date.slice(0, 7) !== anchor.slice(0, 7);
              const count = d.sessions.length + d.activities.length;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDay(date)}
                  aria-pressed={selectedDay === date}
                  aria-label={`${formatDate(date, "EEEE, MMMM d")}, ${count} ${count === 1 ? "item" : "items"}`}
                  className={cn("flex h-14 flex-col items-center gap-1 border-t border-line pt-1.5", selectedDay === date && "bg-sage/60", outside && "opacity-40")}
                >
                  <span className={cn("tnum grid size-6 place-items-center text-[13px]", date === today && "rounded-full bg-forest font-semibold text-white")}>{formatDate(date, "d")}</span>
                  <span className="flex h-2 items-center gap-0.5">
                    {d.sessions.slice(0, 3).map((s) => (
                      <span key={s.id} className={cn("size-1.5 rounded-full", s.status !== "completed" && "opacity-45")} style={{ backgroundColor: `var(--${s.activity_type})` }} />
                    ))}
                    {d.activities.slice(0, 2).map((a) => (
                      <span key={a.id} className="size-1.5 rounded-full" style={{ backgroundColor: `var(--${a.activity_type})` }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <section className="mt-3 rounded-xl border border-line bg-surface p-3" aria-live="polite">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{formatDate(selectedDay, "EEEE, MMM d")}</h3>
              <Link href={href("week", selectedDay)} className="text-xs text-forest hover:underline">
                Open week
              </Link>
            </div>
            {renderItems(selectedDay, {}).total > 0 ? (
              <ul className="grid gap-1.5">{renderItems(selectedDay, {}).items}</ul>
            ) : (
              <p className="px-1 py-1 text-[13px] text-faint-ink">Nothing planned</p>
            )}
            {dayActions(selectedDay, "mt-2.5")}
          </section>
        </div>
      )}

      {openSession ? (
        <SessionDialog
          key={`${openSession.id}:${openSession.session_date}`}
          session={openSession}
          linked={linkedBySession.get(openSession.id) ?? []}
          profile={profile}
          onOpenChange={(open) => !open && setOpenSessionId(null)}
          onEdit={(s) => {
            setOpenSessionId(null);
            setForm((f) => ({ session: s, date: s.session_date, nonce: (f?.nonce ?? 0) + 1 }));
          }}
          onMove={(s, date) => {
            setOpenSessionId(null);
            move(s, date);
          }}
        />
      ) : null}
      <ActivityQuickDialog activity={openActivity} profile={profile} onOpenChange={(open) => !open && setOpenActivityId(null)} />
      {form ? (
        <SessionFormDialog key={form.nonce} open onOpenChange={(open) => !open && setForm(null)} session={form.session} date={form.date} profile={profile} />
      ) : null}
    </div>
  );
}

function DroppableDay({ date, className, children }: { date: string; className?: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  return (
    <div ref={setNodeRef} data-date={date} data-testid="calendar-day" className={cn(className, isOver && "bg-sage/50 outline-2 -outline-offset-2 outline-forest/50")}>
      {children}
    </div>
  );
}
