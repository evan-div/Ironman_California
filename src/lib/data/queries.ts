import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Activity, GoalEvent, Milestone, PlannedSession, TrainingPhase } from "@/types";

type Client = SupabaseClient<Database>;

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Could not load ${what}: ${result.error.message}`);
  return result.data as T;
}

/** Row Level Security scopes every query to the signed-in athlete. */

export async function getPrimaryGoalEvent(supabase: Client): Promise<GoalEvent | null> {
  const res = await supabase
    .from("goal_events")
    .select("*")
    .order("is_primary", { ascending: false })
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return unwrap(res, "your goal event");
}

export async function getPhases(supabase: Client): Promise<TrainingPhase[]> {
  return unwrap(await supabase.from("training_phases").select("*").order("start_date").order("sort_order"), "training phases");
}

export async function getMilestones(supabase: Client): Promise<Milestone[]> {
  return unwrap(await supabase.from("milestones").select("*").order("target_date").order("created_at"), "milestones");
}

export async function getActivitiesInRange(supabase: Client, from: string, to: string): Promise<Activity[]> {
  const res = await supabase
    .from("activities")
    .select("*")
    .gte("activity_date", from)
    .lte("activity_date", to)
    .order("activity_date")
    .order("start_time", { nullsFirst: false })
    .order("created_at");
  return unwrap(res, "activities") as Activity[];
}

export async function getSessionsInRange(supabase: Client, from: string, to: string): Promise<PlannedSession[]> {
  const res = await supabase
    .from("planned_sessions")
    .select("*")
    .gte("session_date", from)
    .lte("session_date", to)
    .order("session_date")
    .order("created_at");
  return unwrap(res, "planned sessions") as unknown as PlannedSession[];
}

export async function getRecentActivities(supabase: Client, limit: number): Promise<Activity[]> {
  const res = await supabase
    .from("activities")
    .select("*")
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return unwrap(res, "recent activities") as Activity[];
}

export async function getActivity(supabase: Client, id: string): Promise<Activity | null> {
  return unwrap(await supabase.from("activities").select("*").eq("id", id).maybeSingle(), "the activity") as Activity | null;
}

export async function getSession(supabase: Client, id: string): Promise<PlannedSession | null> {
  return unwrap(await supabase.from("planned_sessions").select("*").eq("id", id).maybeSingle(), "the session") as unknown as PlannedSession | null;
}

export const ACTIVITY_SORTS = ["date_desc", "date_asc", "duration_desc", "distance_desc"] as const;
export type ActivitySort = (typeof ACTIVITY_SORTS)[number];

export type ActivityFilters = {
  type?: string;
  from?: string;
  to?: string;
  q?: string;
  sort: ActivitySort;
};

export const ACTIVITY_PAGE_SIZE = 200;

export async function searchActivities(supabase: Client, f: ActivityFilters): Promise<{ rows: Activity[]; total: number }> {
  let query = supabase.from("activities").select("*", { count: "exact" });
  if (f.type) query = query.eq("activity_type", f.type);
  if (f.from) query = query.gte("activity_date", f.from);
  if (f.to) query = query.lte("activity_date", f.to);
  if (f.q) {
    // Strip characters that have meaning in PostgREST filter syntax.
    const term = f.q.replace(/[%_,()\\*"]/g, " ").trim();
    if (term) query = query.or(`title.ilike.%${term}%,notes.ilike.%${term}%`);
  }
  switch (f.sort) {
    case "date_asc":
      query = query.order("activity_date", { ascending: true }).order("created_at", { ascending: true });
      break;
    case "duration_desc":
      query = query.order("duration_seconds", { ascending: false, nullsFirst: false }).order("activity_date", { ascending: false });
      break;
    case "distance_desc":
      query = query.order("distance_meters", { ascending: false, nullsFirst: false }).order("activity_date", { ascending: false });
      break;
    default:
      query = query.order("activity_date", { ascending: false }).order("created_at", { ascending: false });
  }
  const res = await query.limit(ACTIVITY_PAGE_SIZE);
  if (res.error) throw new Error(`Could not load activities: ${res.error.message}`);
  return { rows: (res.data ?? []) as Activity[], total: res.count ?? 0 };
}

export async function hasSeed(supabase: Client, seedKey: string): Promise<boolean> {
  const res = await supabase.from("athlete_seeds").select("seed_key").eq("seed_key", seedKey).maybeSingle();
  return Boolean(unwrap(res, "seed state"));
}
