import Link from "next/link";
import { ChevronRight, Link2 } from "lucide-react";
import type { Activity, Profile } from "@/types";
import { activityFacts } from "@/lib/training/format";
import { formatDate } from "@/lib/training/dates";
import { DISCIPLINES } from "@/lib/training/disciplines";
import { DisciplineBadge } from "@/components/discipline";

export function ActivityRow({ activity, profile, showDate = true }: { activity: Activity; profile: Pick<Profile, "swim_unit" | "distance_unit">; showDate?: boolean }) {
  const facts = activityFacts(activity, profile);
  return (
    <Link
      href={`/activities/${activity.id}`}
      className="group flex items-center gap-3.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/70 sm:px-3"
    >
      <DisciplineBadge type={activity.activity_type} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{activity.title}</span>
          {activity.planned_session_id ? (
            <Link2 className="size-3.5 shrink-0 text-forest" aria-label="Linked to a planned session" />
          ) : null}
        </span>
        <span className="tnum mt-0.5 block truncate text-[13px] text-muted-ink">
          <span className="sr-only">{DISCIPLINES[activity.activity_type].label}. </span>
          {showDate ? `${formatDate(activity.activity_date, "EEE, MMM d")}` : null}
          {showDate && facts.length ? " · " : null}
          {facts.join(" · ")}
          {!showDate && facts.length === 0 ? DISCIPLINES[activity.activity_type].label : null}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint-ink transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
