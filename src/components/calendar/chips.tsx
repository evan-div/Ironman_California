"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { ArrowRightLeft, Check, CircleSlash, GripVertical } from "lucide-react";
import type { Activity, PlannedSession, Profile } from "@/types";
import { DISCIPLINES } from "@/lib/training/disciplines";
import { activityFacts, sessionFacts } from "@/lib/training/format";
import { DISCIPLINE_ICONS } from "@/components/discipline";
import { cn } from "@/lib/utils";

type Prefs = Pick<Profile, "swim_unit" | "distance_unit">;

function statusText(s: PlannedSession) {
  if (s.activity_type === "rest") return "Rest day";
  return s.status === "completed" ? "Planned, completed" : s.status === "skipped" ? "Planned, skipped" : "Planned";
}

/**
 * A planned session. Dashed outline = plan; a check and solid outline once a
 * logged activity is linked; struck through when skipped.
 */
export function SessionChip({
  session,
  linked,
  prefs,
  compact = false,
  onOpen,
  dragging = false,
  className,
  ...rest
}: {
  session: PlannedSession;
  /** Linked activities shown inline (those logged on the same day). */
  linked: Activity[];
  prefs: Prefs;
  compact?: boolean;
  onOpen?: () => void;
  dragging?: boolean;
} & Omit<React.ComponentProps<"button">, "onClick">) {
  const Icon = DISCIPLINE_ICONS[session.activity_type];
  const color = DISCIPLINES[session.activity_type].colorVar;
  const done = session.status === "completed";
  const skipped = session.status === "skipped";
  const moved = session.original_date != null && session.original_date !== session.session_date;
  const facts = sessionFacts(session, prefs);
  const doneFacts = linked.flatMap((a) => activityFacts(a, prefs).slice(0, 2));

  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="session-chip"
      data-status={session.status}
      aria-label={`${statusText(session)}: ${session.title}${facts.length ? `, ${facts.join(", ")}` : ""}${moved ? ", rescheduled" : ""}`}
      className={cn(
        "group/chip relative w-full rounded-lg border text-left transition-[box-shadow,background-color,opacity] hover:shadow-card",
        compact ? "px-1.5 py-1" : "px-2.5 py-2",
        done ? "border-solid bg-surface" : "border-dashed bg-surface/60",
        skipped && "opacity-60",
        dragging && "shadow-lift",
        className,
      )}
      style={{ borderColor: `color-mix(in srgb, ${color} ${done ? 55 : 60}%, white)` }}
      {...rest}
    >
      <span className="flex items-center gap-1.5">
        <Icon className={cn("shrink-0", compact ? "size-3" : "size-3.5")} style={{ color: `color-mix(in srgb, ${color} 80%, #202720)` }} strokeWidth={2} aria-hidden />
        <span className={cn("min-w-0 flex-1 truncate font-medium text-ink", compact ? "text-[11px]" : "text-[13px]", skipped && "line-through")}>{session.title}</span>
        {moved ? <ArrowRightLeft className="size-3 shrink-0 text-faint-ink" aria-hidden /> : null}
        {done ? <Check className="size-3.5 shrink-0 text-forest" strokeWidth={2.5} aria-hidden /> : null}
        {skipped ? <CircleSlash className="size-3 shrink-0 text-muted-ink" aria-hidden /> : null}
        {!compact && !done && !skipped ? (
          <GripVertical className="hidden size-3.5 shrink-0 text-faint-ink opacity-0 transition-opacity group-hover/chip:opacity-100 md:block" aria-hidden />
        ) : null}
      </span>
      {!compact ? (
        <span className="tnum mt-0.5 block truncate text-xs text-muted-ink">
          {session.activity_type === "rest"
            ? "Rest"
            : done && doneFacts.length
              ? `Done · ${doneFacts.join(" · ")}`
              : skipped
                ? "Skipped"
                : facts.length
                  ? facts.join(" · ")
                  : "Planned"}
        </span>
      ) : null}
    </button>
  );
}

/** Draggable wrapper used on the desktop grid. Pointer drag only; the dialog offers "Move to date" for keyboard and touch. */
export function DraggableSessionChip(props: React.ComponentProps<typeof SessionChip>) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: props.session.id, data: { date: props.session.session_date } });
  return (
    <div ref={setNodeRef} {...listeners} className={cn("touch-manipulation", isDragging && "opacity-30")}>
      <SessionChip {...props} className={cn("cursor-grab active:cursor-grabbing", props.className)} />
    </div>
  );
}

/** A completed, logged activity: solid tinted fill. */
export function ActivityChip({ activity, prefs, compact = false, onOpen }: { activity: Activity; prefs: Prefs; compact?: boolean; onOpen: () => void }) {
  const Icon = DISCIPLINE_ICONS[activity.activity_type];
  const color = DISCIPLINES[activity.activity_type].colorVar;
  const facts = activityFacts(activity, prefs);
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="activity-chip"
      aria-label={`Completed${activity.planned_session_id ? "" : ", unplanned"}: ${activity.title}${facts.length ? `, ${facts.join(", ")}` : ""}`}
      className={cn("w-full rounded-lg border border-transparent text-left transition-shadow hover:shadow-card", compact ? "px-1.5 py-1" : "px-2.5 py-2")}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 17%, white)` }}
    >
      <span className="flex items-center gap-1.5">
        <Icon className={cn("shrink-0", compact ? "size-3" : "size-3.5")} style={{ color: `color-mix(in srgb, ${color} 80%, #202720)` }} strokeWidth={2} aria-hidden />
        <span className={cn("min-w-0 flex-1 truncate font-medium text-ink", compact ? "text-[11px]" : "text-[13px]")}>{activity.title}</span>
        <Check className={cn("shrink-0", compact ? "size-3" : "size-3.5")} style={{ color: `color-mix(in srgb, ${color} 80%, #202720)` }} strokeWidth={2.5} aria-hidden />
      </span>
      {!compact ? <span className="tnum mt-0.5 block truncate text-xs text-muted-ink">{facts.length ? facts.join(" · ") : "Completed"}</span> : null}
    </button>
  );
}
