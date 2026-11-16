import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, NotebookPen } from "lucide-react";
import { requireAthlete } from "@/lib/data/auth";
import { getActivitiesInRange, getPhases, getPrimaryGoalEvent, getRecentActivities, getSessionsInRange } from "@/lib/data/queries";
import { addDaysStr, formatDate, hourInTimeZone, todayInTimeZone, weekStart } from "@/lib/training/dates";
import { plannedVsActual, sumActivities } from "@/lib/training/totals";
import { ActivityRow } from "@/components/activities/activity-row";
import { LogWorkoutButton } from "@/components/activities/log-workout-button";
import { CountdownHero } from "@/components/dashboard/countdown-hero";
import { PhaseCard } from "@/components/dashboard/phase-card";
import { TodayCard } from "@/components/dashboard/today-card";
import { WeekCard } from "@/components/dashboard/week-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(hour: number) {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { supabase, profile } = await requireAthlete();
  const today = todayInTimeZone(profile.timezone);
  const monday = weekStart(today);
  const sunday = addDaysStr(monday, 6);

  const [event, phases, weekActivities, weekSessions, recent] = await Promise.all([
    getPrimaryGoalEvent(supabase),
    getPhases(supabase),
    getActivitiesInRange(supabase, monday, sunday),
    getSessionsInRange(supabase, monday, sunday),
    getRecentActivities(supabase, 6),
  ]);

  const totals = sumActivities(weekActivities);
  const pva = plannedVsActual(weekSessions, weekActivities);

  return (
    <>
      <PageHeader
        eyebrow={formatDate(today, "EEEE, MMMM d")}
        title={
          <>
            {greeting(hourInTimeZone(profile.timezone))}, {profile.preferred_name ?? "athlete"}.
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/calendar">
                <CalendarDays />
                Calendar
              </Link>
            </Button>
            <LogWorkoutButton size="lg" />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CountdownHero event={event} today={today} />
        </div>
        <PhaseCard phases={phases} today={today} />

        <div className="lg:col-span-2">
          <TodayCard
            sessions={weekSessions.filter((s) => s.session_date === today)}
            activities={weekActivities.filter((a) => a.activity_date === today)}
            profile={profile}
            dateLabel={formatDate(today, "EEEE, MMM d")}
          />
        </div>
        <WeekCard totals={totals} pva={pva} profile={profile} rangeLabel={`${formatDate(monday, "MMM d")} – ${formatDate(sunday, "MMM d")}`} />

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent workouts</CardTitle>
            <Link href="/activities" className="text-[13px] text-forest hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="pt-3">
            {recent.length === 0 ? (
              <EmptyState icon={<NotebookPen />} title="Your log starts here" action={<LogWorkoutButton variant="secondary">Log your first workout</LogWorkoutButton>}>
                Once you log a workout it shows up here, and in your weekly totals.
              </EmptyState>
            ) : (
              <ul className="grid gap-x-6 md:grid-cols-2">
                {recent.map((a) => (
                  <li key={a.id}>
                    <ActivityRow activity={a} profile={profile} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
