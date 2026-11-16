import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import {
  OWNER_SEED_KEY,
  seedActivities,
  seedGoalEvent,
  seedMilestones,
  seedPhases,
  seedPlannedSessions,
} from "@/lib/training/seed-data";

export type SeedResult = { applied: boolean; reason?: "already-applied" };

/**
 * Apply the owner's starter plan to ONE athlete. Idempotent:
 *  - `athlete_seeds (athlete_id, seed_key)` records that this version ran, and
 *    a second call returns early — so sessions the athlete later deletes or
 *    edits are never resurrected or overwritten.
 *  - every seeded row carries a per-athlete unique `seed_key`, so a run that
 *    was interrupted half-way can simply be repeated without duplicates.
 *
 * Uses the caller's own client: RLS guarantees rows land in their account only.
 */
export async function applyOwnerSeed(supabase: SupabaseClient<Database>, athleteId: string): Promise<SeedResult> {
  const existing = await supabase.from("athlete_seeds").select("seed_key").eq("athlete_id", athleteId).eq("seed_key", OWNER_SEED_KEY).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return { applied: false, reason: "already-applied" };

  const own = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r, athlete_id: athleteId }));
  const opts = { onConflict: "athlete_id,seed_key", ignoreDuplicates: true } as const;

  // Only one goal event may be primary. Keep an existing primary if the athlete already has one.
  const primary = await supabase.from("goal_events").select("id").eq("athlete_id", athleteId).eq("is_primary", true).maybeSingle();
  if (primary.error) throw new Error(primary.error.message);

  const steps = [
    supabase.from("goal_events").upsert(own([{ ...seedGoalEvent, is_primary: !primary.data }]), opts),
    supabase.from("training_phases").upsert(own(seedPhases), opts),
    supabase.from("milestones").upsert(own(seedMilestones), opts),
    supabase
      .from("planned_sessions")
      .upsert(own(seedPlannedSessions.map((s) => ({ ...s, structured_workout: s.structured_workout as unknown as Json }))), opts),
    supabase.from("activities").upsert(own(seedActivities), opts),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) throw new Error(`Starter plan could not be applied: ${error.message}`);
  }

  const marker = await supabase.from("athlete_seeds").insert({ athlete_id: athleteId, seed_key: OWNER_SEED_KEY });
  // 23505 = another request finished the same seed concurrently; that is fine.
  if (marker.error && marker.error.code !== "23505") throw new Error(marker.error.message);
  return { applied: true };
}
