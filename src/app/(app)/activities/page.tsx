import type { Metadata } from "next";
import { SearchX, NotebookPen } from "lucide-react";
import { ACTIVITY_TYPES } from "@/types";
import { requireAthlete } from "@/lib/data/auth";
import { ACTIVITY_PAGE_SIZE, ACTIVITY_SORTS, searchActivities, type ActivitySort } from "@/lib/data/queries";
import { formatDate, isDateString } from "@/lib/training/dates";
import { ActivityFilters } from "@/components/activities/activity-filters";
import { ActivityRow } from "@/components/activities/activity-row";
import { LogWorkoutButton } from "@/components/activities/log-workout-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Activities" };

type Search = { type?: string; from?: string; to?: string; q?: string; sort?: string };

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { supabase, profile } = await requireAthlete();
  const sp = await searchParams;
  const filters = {
    type: (ACTIVITY_TYPES as readonly string[]).includes(sp.type ?? "") ? sp.type : undefined,
    from: isDateString(sp.from) ? sp.from : undefined,
    to: isDateString(sp.to) ? sp.to : undefined,
    q: sp.q?.slice(0, 100).trim() || undefined,
    sort: ((ACTIVITY_SORTS as readonly string[]).includes(sp.sort ?? "") ? sp.sort : "date_desc") as ActivitySort,
  };
  const filtered = Boolean(filters.type || filters.from || filters.to || filters.q);
  const { rows, total } = await searchActivities(supabase, filters);

  // Group by month when sorted by date; otherwise show one flat ranked list.
  const byDate = filters.sort === "date_desc" || filters.sort === "date_asc";
  const groups: { label: string | null; items: typeof rows }[] = [];
  for (const a of rows) {
    const label = byDate ? formatDate(a.activity_date, "MMMM yyyy") : null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(a);
    else groups.push({ label, items: [a] });
  }

  return (
    <>
      <PageHeader
        eyebrow="Training log"
        title="Activities"
        description="Everything you've logged. Filter by discipline or date, or search titles and notes."
        actions={<LogWorkoutButton />}
      />

      <ActivityFilters
        initial={{ type: filters.type ?? "", from: filters.from ?? "", to: filters.to ?? "", q: filters.q ?? "", sort: filters.sort }}
      />

      <p className="tnum mt-5 mb-2 text-[13px] text-muted-ink" aria-live="polite">
        {total === 0
          ? "No activities"
          : `${total.toLocaleString("en-US")} ${total === 1 ? "activity" : "activities"}${filtered ? " match" : ""}${
              total > rows.length ? ` · showing the first ${ACTIVITY_PAGE_SIZE}` : ""
            }`}
      </p>

      {rows.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState icon={<SearchX />} title="Nothing matches those filters" className="py-14">
              Try a wider date range or clear the search.
            </EmptyState>
          ) : (
            <EmptyState icon={<NotebookPen />} title="No workouts logged yet" className="py-14" action={<LogWorkoutButton variant="secondary">Log your first workout</LogWorkoutButton>}>
              Swims, rides, runs, strength and recovery all live here once you log them.
            </EmptyState>
          )}
        </Card>
      ) : (
        <div className="grid gap-5">
          {groups.map((g, i) => (
            <section key={g.label ?? i} aria-label={g.label ?? "Activities"}>
              {g.label ? <h2 className="eyebrow mb-2 px-1">{g.label}</h2> : null}
              <Card className="p-1.5 sm:p-2">
                <ul className="divide-y divide-line/70">
                  {g.items.map((a) => (
                    <li key={a.id}>
                      <ActivityRow activity={a} profile={profile} />
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
