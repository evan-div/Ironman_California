import type { Metadata } from "next";
import { requireAthlete } from "@/lib/data/auth";
import { getActivitiesInRange, getSessionsInRange } from "@/lib/data/queries";
import { isDateString, monthGrid, todayInTimeZone, weekDays, weekStart } from "@/lib/training/dates";
import { CalendarView } from "@/components/calendar/calendar-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  const { supabase, profile } = await requireAthlete();
  const sp = await searchParams;
  const today = todayInTimeZone(profile.timezone);
  const view = sp.view === "month" ? "month" : "week";
  const anchor = isDateString(sp.date) ? sp.date : today;
  const weeks = view === "week" ? [weekDays(weekStart(anchor))] : monthGrid(anchor);
  const from = weeks[0][0];
  const to = weeks[weeks.length - 1][6];

  const [sessions, activities] = await Promise.all([getSessionsInRange(supabase, from, to), getActivitiesInRange(supabase, from, to)]);

  return (
    <>
      <PageHeader eyebrow="Training plan" title="Calendar" description="Plan the week, move things when life happens, and log what you actually did." className="mb-5 sm:mb-6" />
      <CalendarView key={`${view}:${from}`} view={view} anchor={anchor} today={today} weeks={weeks} sessions={sessions} activities={activities} profile={profile} />
    </>
  );
}
