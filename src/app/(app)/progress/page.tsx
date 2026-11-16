import type { Metadata } from "next";
import { requireAthlete } from "@/lib/data/auth";
import { getActivitiesInRange, getSessionsInRange } from "@/lib/data/queries";
import { computeAdherence, weeklyAdherence } from "@/lib/training/adherence";
import { addDaysStr, formatDate, lastMonthKeys, lastWeekStarts, todayInTimeZone } from "@/lib/training/dates";
import { DISCIPLINES } from "@/lib/training/disciplines";
import { formatDuration } from "@/lib/training/duration";
import { disciplineDistribution, monthlyTotals, rollingAverage, swimDistance, weeklyPlannedVsActual, weeklyTotals } from "@/lib/training/totals";
import { ChartCard } from "@/components/charts/chart-card";
import { BarSeriesChart, CategoryBarChart, TrendChart, type Datum } from "@/components/charts/charts";
import { LogWorkoutButton } from "@/components/activities/log-workout-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Progress" };

const hours = (seconds: number) => Math.round((seconds / 3600) * 100) / 100;
const h1 = (seconds: number) => (seconds / 3600).toFixed(1);
const WEEKS = 12;
const ROLLING = 4;

export default async function ProgressPage() {
  const { supabase, profile } = await requireAthlete();
  const today = todayInTimeZone(profile.timezone);

  // 12 displayed weeks plus the 3 before them, so the 4-week average has a full window.
  const allWeeks = lastWeekStarts(today, WEEKS + ROLLING - 1);
  const weeks = allWeeks.slice(-WEEKS);
  const months = lastMonthKeys(today, 12);
  const from = allWeeks[0] < `${months[0]}-01` ? allWeeks[0] : `${months[0]}-01`;
  const weekEnd = addDaysStr(weeks[weeks.length - 1], 6);

  const [activities, sessions, firstRes] = await Promise.all([
    getActivitiesInRange(supabase, from, weekEnd),
    getSessionsInRange(supabase, weeks[0], weekEnd),
    supabase.from("activities").select("activity_date").order("activity_date").limit(1).maybeSingle(),
  ]);
  const firstActivityDate = firstRes.data?.activity_date ?? null;

  const wk = (ws: string): Pick<Datum, "label" | "fullLabel"> => ({ label: formatDate(ws, "MMM d"), fullLabel: `Week of ${formatDate(ws, "MMM d, yyyy")}` });
  const swimUnit = profile.swim_unit;
  const swimUnitLabel = swimUnit === "yd" ? "yards" : "meters";

  const weekly = weeklyTotals(activities, allWeeks);
  const weekly12 = weekly.slice(-WEEKS);
  const thisWeek = weekly12[weekly12.length - 1];
  const total12 = weekly12.reduce((s, w) => s + w.trainingSeconds, 0);
  const hasTime12 = total12 > 0;

  // 1. Weekly training hours, stacked by discipline. Bike/swim/run order keeps the two closest hues apart.
  const stackSeries = [
    { key: "bike", label: "Bike", color: DISCIPLINES.bike.hex },
    { key: "swim", label: "Swim", color: DISCIPLINES.swim.hex },
    { key: "run", label: "Run", color: DISCIPLINES.run.hex },
    { key: "strength", label: "Strength", color: DISCIPLINES.strength.hex },
    { key: "other", label: "Other", color: DISCIPLINES.other.hex },
  ];
  const weeklyHours: Datum[] = weekly12.map((w) => ({
    ...wk(w.weekStart),
    bike: hours(w.bikeSeconds),
    swim: hours(w.swimSeconds),
    run: hours(w.runSeconds),
    strength: hours(w.strengthSeconds),
    other: hours(w.otherSeconds),
  }));
  const usedStack = stackSeries.filter((s) => weeklyHours.some((d) => Number(d[s.key]) > 0));

  // 2–4. Per-discipline weekly series
  const swimData: Datum[] = weekly12.map((w) => ({ ...wk(w.weekStart), value: swimDistance(w.swimMeters, swimUnit) }));
  const bikeData: Datum[] = weekly12.map((w) => ({ ...wk(w.weekStart), value: hours(w.bikeSeconds) }));
  const runData: Datum[] = weekly12.map((w) => ({ ...wk(w.weekStart), value: hours(w.runSeconds) }));
  const swimTotal = weekly12.reduce((s, w) => s + swimDistance(w.swimMeters, swimUnit), 0);
  const bikeTotal = weekly12.reduce((s, w) => s + w.bikeSeconds, 0);
  const runTotal = weekly12.reduce((s, w) => s + w.runSeconds, 0);

  // 5. Distribution over the same 12 weeks
  const in12 = activities.filter((a) => a.activity_date >= weeks[0]);
  const distribution = disciplineDistribution(in12);

  // 6. Planned vs completed
  const pva = weeklyPlannedVsActual(sessions, in12, weeks);
  const pvaData: Datum[] = pva.map((w) => ({ ...wk(w.weekStart), planned: hours(w.plannedSeconds), completed: hours(w.actualSeconds) }));
  const hasPlan = pva.some((w) => w.plannedSeconds > 0);
  const pastPva = pva.filter((w) => w.weekStart <= today);
  const plannedToDate = pastPva.reduce((s, w) => s + w.plannedSeconds, 0);
  const actualToDate = pastPva.reduce((s, w) => s + w.actualSeconds, 0);

  // 7. Monthly totals
  const monthly = monthlyTotals(activities, months);
  const monthlyData: Datum[] = monthly.map((m) => ({
    label: formatDate(`${m.month}-01`, "MMM"),
    fullLabel: formatDate(`${m.month}-01`, "MMMM yyyy"),
    value: hours(m.trainingSeconds),
  }));
  const hasMonthly = monthly.some((m) => m.trainingSeconds > 0);

  // 8. Rolling four-week average. Only weeks with a full window since the first logged activity count.
  const rolling = rollingAverage(weekly.map((w) => w.trainingSeconds), ROLLING).slice(-WEEKS);
  const firstFullWindowWeek = firstActivityDate ? addDaysStr(lastWeekStarts(firstActivityDate, 1)[0], 7 * (ROLLING - 1)) : null;
  const trendData: Datum[] = weekly12.map((w, i) => ({
    ...wk(w.weekStart),
    weekly: hours(w.trainingSeconds),
    average: firstFullWindowWeek && w.weekStart >= firstFullWindowWeek && rolling[i] != null ? hours(rolling[i]!) : null,
  }));
  const trendPoints = trendData.filter((d) => d.average != null);
  const latestAvg = trendPoints.length ? Number(trendPoints[trendPoints.length - 1].average) : null;

  // 9. Adherence
  const adherence = computeAdherence(sessions, today);
  const adherenceWeekly = weeklyAdherence(sessions, weeks, today);
  const adherenceData: Datum[] = adherenceWeekly.map((w) => ({ ...wk(w.weekStart), rate: w.rate == null ? null : Math.round(w.rate * 100) }));

  const nothingAtAll = activities.length === 0 && sessions.length === 0;

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Progress"
        description="Everything here is computed from your own log and plan. Nothing is estimated, and nothing here predicts race performance."
      />

      {nothingAtAll ? (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-sm text-muted-ink">Charts fill in as you plan sessions and log workouts.</p>
          <LogWorkoutButton variant="secondary" />
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-6">
        <ChartCard
          className="lg:col-span-4"
          title="Weekly training hours"
          description="Last 12 weeks, by discipline. Training time includes strength; recovery is excluded."
          summary={`This week: ${h1(thisWeek.trainingSeconds)} h. Last 12 weeks: ${h1(total12)} h in total.`}
          legend={usedStack}
          empty={!hasTime12}
          emptyText="Log a workout with a duration and your weekly hours will appear here."
          table={{
            columns: ["Week of", ...stackSeries.map((s) => `${s.label} (h)`), "Total (h)"],
            rows: weekly12.map((w) => [formatDate(w.weekStart, "MMM d"), h1(w.bikeSeconds), h1(w.swimSeconds), h1(w.runSeconds), h1(w.strengthSeconds), h1(w.otherSeconds), h1(w.trainingSeconds)]),
          }}
        >
          <BarSeriesChart data={weeklyHours} series={usedStack} unit="h" stacked height={260} />
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title="Discipline mix"
          description="Share of logged time, last 12 weeks. Activities without a duration can't be included."
          empty={distribution.length === 0}
          emptyText="Shares are based on time, so they need workouts with a recorded duration."
          summary={distribution.length ? `${DISCIPLINES[[...distribution].sort((a, b) => b.seconds - a.seconds)[0].type].label} makes up the largest share.` : undefined}
          table={{ columns: ["Discipline", "Time", "Share"], rows: distribution.map((d) => [DISCIPLINES[d.type].label, formatDuration(d.seconds), `${Math.round(d.share * 100)}%`]) }}
        >
          <CategoryBarChart
            unit="%"
            digits={0}
            data={distribution.map((d) => ({ label: DISCIPLINES[d.type].label, value: Math.round(d.share * 100), display: `${Math.round(d.share * 100)}% · ${formatDuration(d.seconds)}`, color: DISCIPLINES[d.type].hex }))}
          />
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title={`Swim ${swimUnitLabel} per week`}
          summary={`${swimTotal.toLocaleString("en-US")} ${swimUnit} over the last 12 weeks.`}
          empty={swimTotal === 0}
          emptyText="Log a swim with a distance to start this chart."
          table={{ columns: ["Week of", `Distance (${swimUnit})`], rows: swimData.map((d) => [d.label, Number(d.value).toLocaleString("en-US")]) }}
        >
          <BarSeriesChart data={swimData} series={[{ key: "value", label: "Swim", color: DISCIPLINES.swim.hex }]} unit={swimUnit} digits={0} height={190} />
        </ChartCard>
        <ChartCard
          className="lg:col-span-2"
          title="Cycling hours per week"
          summary={`${h1(bikeTotal)} h over the last 12 weeks.`}
          empty={bikeTotal === 0}
          emptyText="Log a ride with a duration to start this chart."
          table={{ columns: ["Week of", "Hours"], rows: bikeData.map((d) => [d.label, Number(d.value).toFixed(1)]) }}
        >
          <BarSeriesChart data={bikeData} series={[{ key: "value", label: "Bike", color: DISCIPLINES.bike.hex }]} unit="h" height={190} />
        </ChartCard>
        <ChartCard
          className="lg:col-span-2"
          title="Running hours per week"
          summary={`${h1(runTotal)} h over the last 12 weeks.`}
          empty={runTotal === 0}
          emptyText="Log a run with a duration to start this chart."
          table={{ columns: ["Week of", "Hours"], rows: runData.map((d) => [d.label, Number(d.value).toFixed(1)]) }}
        >
          <BarSeriesChart data={runData} series={[{ key: "value", label: "Run", color: DISCIPLINES.run.hex }]} unit="h" height={190} />
        </ChartCard>

        <ChartCard
          className="lg:col-span-3"
          title="Planned versus completed"
          description="Weekly training hours (incl. strength). Rest and recovery are not counted on either side."
          summary={hasPlan ? `To date: ${h1(actualToDate)} h completed of ${h1(plannedToDate)} h planned.` : undefined}
          legend={[
            { label: "Planned", color: "#8a938b", dashed: true },
            { label: "Completed", color: "#366b54" },
          ]}
          empty={!hasPlan && !hasTime12}
          emptyText="Plan sessions on the calendar to compare your plan with what you complete."
          table={{ columns: ["Week of", "Planned (h)", "Completed (h)"], rows: pva.map((w) => [formatDate(w.weekStart, "MMM d"), h1(w.plannedSeconds), h1(w.actualSeconds)]) }}
        >
          <BarSeriesChart
            data={pvaData}
            series={[
              { key: "planned", label: "Planned", color: "#8a938b", outlined: true },
              { key: "completed", label: "Completed", color: "#366b54" },
            ]}
            unit="h"
          />
        </ChartCard>

        <ChartCard
          className="lg:col-span-3"
          title="Consistency"
          description="Share of eligible planned sessions completed each week. Rest and recovery are never eligible; open sessions only count once their day has passed."
          empty={adherence.eligible === 0}
          emptyTitle="No eligible sessions yet"
          emptyText="Adherence appears once a planned session's day has passed, or you complete or skip one."
          summary={
            adherence.rate != null
              ? `${Math.round(adherence.rate * 100)}% — ${adherence.completed} of ${adherence.eligible} eligible sessions completed · ${adherence.skipped} skipped · ${adherence.missed} missed · ${adherence.rescheduled} rescheduled.`
              : undefined
          }
          table={{
            columns: ["Week of", "Eligible", "Completed", "Skipped", "Missed", "Rescheduled", "Adherence"],
            rows: adherenceWeekly.map((w) => [formatDate(w.weekStart, "MMM d"), w.eligible, w.completed, w.skipped, w.missed, w.rescheduled, w.rate == null ? "—" : `${Math.round(w.rate * 100)}%`]),
          }}
        >
          <BarSeriesChart data={adherenceData} series={[{ key: "rate", label: "Adherence", color: "#366b54" }]} unit="%" digits={0} yMax={100} />
        </ChartCard>

        <ChartCard
          className="lg:col-span-3"
          title="Four-week rolling volume"
          description="Average weekly training hours over the trailing four weeks, shown only once four full weeks of history exist."
          empty={trendPoints.length === 0}
          emptyTitle="Needs four weeks of history"
          emptyText={firstFullWindowWeek ? `The trend line starts the week of ${formatDate(firstFullWindowWeek, "MMM d, yyyy")}.` : "Log workouts for four weeks and the trend line will start."}
          summary={latestAvg != null ? `Current four-week average: ${latestAvg.toFixed(1)} h per week.` : undefined}
          legend={[
            { label: "4-week average", color: "#366b54" },
            { label: "Single week", color: "#b9c9ba", dashed: true },
          ]}
          table={{ columns: ["Week of", "Week (h)", "4-week average (h)"], rows: trendData.map((d) => [d.label, Number(d.weekly).toFixed(1), d.average == null ? "—" : Number(d.average).toFixed(1)]) }}
        >
          <TrendChart data={trendData} barKey="weekly" lineKey="average" barLabel="Single week" lineLabel="4-week average" unit="h" />
        </ChartCard>

        <ChartCard
          className="lg:col-span-3"
          title="Monthly training totals"
          description="Training hours per month (incl. strength), last 12 months."
          empty={!hasMonthly}
          emptyText="Monthly totals appear once you've logged workouts with durations."
          summary={hasMonthly ? `${h1(monthly[monthly.length - 1].trainingSeconds)} h so far in ${formatDate(`${months[months.length - 1]}-01`, "MMMM")}.` : undefined}
          table={{ columns: ["Month", "Hours"], rows: monthly.map((m) => [formatDate(`${m.month}-01`, "MMM yyyy"), h1(m.trainingSeconds)]) }}
        >
          <BarSeriesChart data={monthlyData} series={[{ key: "value", label: "Training time", color: "#366b54" }]} unit="h" height={240} />
        </ChartCard>
      </div>
    </>
  );
}
