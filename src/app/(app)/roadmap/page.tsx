import type { Metadata } from "next";
import { requireAthlete } from "@/lib/data/auth";
import { getMilestones, getPhases, getPrimaryGoalEvent } from "@/lib/data/queries";
import { todayInTimeZone } from "@/lib/training/dates";
import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Roadmap" };

export default async function RoadmapPage() {
  const { supabase, profile } = await requireAthlete();
  const [phases, milestones, event] = await Promise.all([getPhases(supabase), getMilestones(supabase), getPrimaryGoalEvent(supabase)]);
  return (
    <>
      <PageHeader
        eyebrow="The long view"
        title={event ? `The road to ${event.name.replace(/^IRONMAN\s+/i, "")}` : "Roadmap"}
        description="Phases and checkpoints from here to race day. Hour targets are provisional planning ranges you can edit — not prescriptions based on a medical or physiological assessment."
      />
      <RoadmapView phases={phases} milestones={milestones} event={event} today={todayInTimeZone(profile.timezone)} />
    </>
  );
}
