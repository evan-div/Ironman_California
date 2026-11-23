import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { applyCouchPlan, applyOwnerSeed } from "@/lib/data/seed";
import { normalizeExternalActivity, upsertImportedActivity } from "@/lib/ingestion";
import { OWNER_SEED_KEY, seedPlannedSessions } from "@/lib/training/seed-data";
import { couchPlanSessions } from "@/lib/training/couch-plan";
import { adminClient, anonClient, resetUser, signedInClient } from "../support/supabase";

const A = "it-athlete-a@project1406.test";
const B = "it-athlete-b@project1406.test";

let a: SupabaseClient<Database>;
let b: SupabaseClient<Database>;
let aId: string;
let bId: string;

const OWNED_TABLES = ["goal_events", "training_phases", "planned_sessions", "activities", "milestones", "integrations"] as const;

beforeAll(async () => {
  aId = await resetUser(A, { onboarded: true, name: "A" });
  bId = await resetUser(B, { onboarded: true, name: "B" });
  a = await signedInClient(A);
  b = await signedInClient(B);
});

describe("private beta allowlist", () => {
  it("rejects sign-ups from emails that were not invited", async () => {
    const { data, error } = await anonClient().auth.signUp({ email: `stranger-${Date.now()}@example.com`, password: "some-password-123" });
    expect(data.user).toBeNull();
    expect(error?.message).toMatch(/private beta/i);
  });

  it("is not readable or writable through the API", async () => {
    const read = await a.from("allowed_emails").select("*");
    expect(read.data ?? []).toHaveLength(0);
    const write = await a.from("allowed_emails").insert({ email: "sneaky@example.com" });
    expect(write.error).not.toBeNull();
  });
});

describe("owner starter plan bootstrap", () => {
  it("applies once and matches the provided facts", async () => {
    expect(await applyOwnerSeed(a, aId)).toEqual({ applied: true });

    const goal = await a.from("goal_events").select("*").single();
    expect(goal.data).toMatchObject({ name: "IRONMAN California", event_date: "2027-10-24", target_finish_seconds: 49440, is_primary: true });

    const phases = await a.from("training_phases").select("name,start_date,end_date").order("start_date");
    expect(phases.data).toHaveLength(7);
    expect(phases.data![0]).toEqual({ name: "Operation Get Off the Couch", start_date: "2026-11-16", end_date: "2026-12-31" });

    const sessions = await a.from("planned_sessions").select("session_date,activity_type,status,planned_duration_seconds").order("session_date");
    expect(sessions.data).toHaveLength(seedPlannedSessions.length);
    expect(sessions.data!.every((s) => s.status === "planned")).toBe(true);
    expect(sessions.data!.filter((s) => s.activity_type === "bike").map((s) => s.planned_duration_seconds! / 60)).toEqual([35, 60, 40, 70, 45, 80, 30, 55, 45, 85, 45, 100, 35, 65]);
    expect(sessions.data!.filter((s) => s.session_date > "2026-11-22").every((s) => s.activity_type === "bike")).toBe(true);

    const acts = await a.from("activities").select("*").order("activity_type");
    expect(acts.data).toHaveLength(2);
    const sauna = acts.data!.find((x) => x.activity_type === "recovery")!;
    const swim = acts.data!.find((x) => x.activity_type === "swim")!;
    expect(swim).toMatchObject({ activity_date: "2026-11-16", title: "Morning Swim", duration_seconds: null, distance_unit: "yd", origin: "manual", avg_heart_rate: null, max_heart_rate: null, rpe: null, planned_session_id: null, start_time: null });
    expect(Number(swim.distance_meters)).toBeCloseTo(914.4);
    expect(sauna).toMatchObject({ activity_date: "2026-11-16", title: "Post-Swim Sauna", recovery_subtype: "Sauna", duration_seconds: 720, distance_meters: null, origin: "manual", avg_heart_rate: null });
  });

  it("is idempotent: a second run changes nothing, even after the athlete edits or deletes seeded rows", async () => {
    const first = await a.from("planned_sessions").select("id").eq("session_date", "2026-11-20").single();
    await a.from("planned_sessions").delete().eq("id", first.data!.id);
    await a.from("planned_sessions").update({ title: "My own title" }).eq("session_date", "2026-11-17");

    expect(await applyOwnerSeed(a, aId)).toEqual({ applied: false, reason: "already-applied" });

    const count = async (table: (typeof OWNED_TABLES)[number]) => (await a.from(table).select("*", { count: "exact", head: true })).count;
    expect(await count("planned_sessions")).toBe(seedPlannedSessions.length - 1);
    expect(await count("activities")).toBe(2);
    expect(await count("training_phases")).toBe(7);
    expect(await count("goal_events")).toBe(1);
    const edited = await a.from("planned_sessions").select("title").eq("session_date", "2026-11-17").single();
    expect(edited.data!.title).toBe("My own title");
  });

  it("recovers from an interrupted run without duplicating rows", async () => {
    // Simulate a crash after the rows were written but before the marker was stored.
    await adminClient().from("athlete_seeds").delete().eq("athlete_id", aId).eq("seed_key", OWNER_SEED_KEY);
    expect(await applyOwnerSeed(a, aId)).toEqual({ applied: true });
    const acts = await a.from("activities").select("*", { count: "exact", head: true });
    expect(acts.count).toBe(2);
    const phases = await a.from("training_phases").select("*", { count: "exact", head: true });
    expect(phases.count).toBe(7);
  });

  it("never touches another athlete's account", async () => {
    for (const table of OWNED_TABLES) {
      const res = await b.from(table).select("*", { count: "exact", head: true });
      expect(res.count, table).toBe(0);
    }
  });
});

describe("row level security", () => {
  it("hides every athlete-owned table from another signed-in athlete", async () => {
    for (const table of OWNED_TABLES) {
      const res = await b.from(table).select("id");
      expect(res.error, table).toBeNull();
      expect(res.data, table).toEqual([]);
    }
    const profiles = await b.from("profiles").select("id");
    expect(profiles.data!.map((p) => p.id)).toEqual([bId]);
    const seeds = await b.from("athlete_seeds").select("*");
    expect(seeds.data).toEqual([]);
  });

  it("gives signed-out visitors nothing", async () => {
    for (const table of [...OWNED_TABLES, "profiles", "athlete_seeds"] as const) {
      const res = await anonClient().from(table).select("*");
      expect(res.data ?? [], table).toEqual([]);
    }
  });

  it("blocks updating or deleting another athlete's rows", async () => {
    const target = await a.from("activities").select("id,title").eq("activity_type", "swim").single();

    const upd = await b.from("activities").update({ title: "hacked" }).eq("id", target.data!.id).select();
    expect(upd.data).toEqual([]);
    const del = await b.from("activities").delete().eq("id", target.data!.id).select();
    expect(del.data).toEqual([]);
    const profile = await b.from("profiles").update({ preferred_name: "hacked" }).eq("id", aId).select();
    expect(profile.data).toEqual([]);

    const still = await a.from("activities").select("title").eq("id", target.data!.id).single();
    expect(still.data!.title).toBe("Morning Swim");
  });

  it("blocks inserting rows on behalf of another athlete", async () => {
    const res = await b.from("activities").insert({ athlete_id: aId, activity_date: "2026-11-18", activity_type: "run", title: "Planted" });
    expect(res.error?.code).toBe("42501");
    const moved = await b.from("activities").insert({ activity_date: "2026-11-18", activity_type: "run", title: "Mine" }).select("id,athlete_id").single();
    expect(moved.data!.athlete_id).toBe(bId); // default auth.uid()
    const steal = await b.from("activities").update({ athlete_id: aId }).eq("id", moved.data!.id);
    expect(steal.error).not.toBeNull();
    await b.from("activities").delete().eq("id", moved.data!.id);
  });

  it("blocks linking an activity to another athlete's planned session", async () => {
    const theirs = await a.from("planned_sessions").select("id").eq("session_date", "2026-11-21").single();
    const res = await b.from("activities").insert({ activity_date: "2026-11-21", activity_type: "bike", title: "Sneaky link", planned_session_id: theirs.data!.id });
    expect(res.error).not.toBeNull();
    const session = await a.from("planned_sessions").select("status").eq("id", theirs.data!.id).single();
    expect(session.data!.status).toBe("planned");
  });
});

describe("plan and completion stay consistent", () => {
  let sessionId: string;
  let activityId: string;

  it("marks a session completed when an activity is linked", async () => {
    const s = await a.from("planned_sessions").insert({ session_date: "2026-11-24", activity_type: "run", title: "IT run", planned_duration_seconds: 1500 }).select("id,status").single();
    sessionId = s.data!.id;
    expect(s.data!.status).toBe("planned");

    const act = await a.from("activities").insert({ activity_date: "2026-11-24", activity_type: "run", title: "IT run done", duration_seconds: 1560, planned_session_id: sessionId }).select("id").single();
    activityId = act.data!.id;
    expect((await a.from("planned_sessions").select("status").eq("id", sessionId).single()).data!.status).toBe("completed");
  });

  it("cannot be marked skipped or planned while a workout is linked, nor completed without one", async () => {
    await a.from("planned_sessions").update({ status: "skipped" }).eq("id", sessionId);
    expect((await a.from("planned_sessions").select("status").eq("id", sessionId).single()).data!.status).toBe("completed");

    const lone = await a.from("planned_sessions").insert({ session_date: "2026-11-25", activity_type: "swim", title: "IT swim", status: "completed" }).select("id,status").single();
    expect(lone.data!.status).toBe("planned");
    await a.from("planned_sessions").update({ status: "completed" }).eq("id", lone.data!.id);
    expect((await a.from("planned_sessions").select("status").eq("id", lone.data!.id).single()).data!.status).toBe("planned");
    await a.from("planned_sessions").update({ status: "skipped" }).eq("id", lone.data!.id);
    expect((await a.from("planned_sessions").select("status").eq("id", lone.data!.id).single()).data!.status).toBe("skipped");
    await a.from("planned_sessions").delete().eq("id", lone.data!.id);
  });

  it("keeps the completed workout untouched when the plan is edited or moved", async () => {
    await a.from("planned_sessions").update({ title: "IT run (edited)", session_date: "2026-11-26", planned_duration_seconds: 1800 }).eq("id", sessionId);
    const act = await a.from("activities").select("activity_date,duration_seconds,title,planned_session_id").eq("id", activityId).single();
    expect(act.data).toEqual({ activity_date: "2026-11-24", duration_seconds: 1560, title: "IT run done", planned_session_id: sessionId });
  });

  it("returns the session to planned when the workout is unlinked", async () => {
    await a.from("activities").update({ planned_session_id: null }).eq("id", activityId);
    expect((await a.from("planned_sessions").select("status").eq("id", sessionId).single()).data!.status).toBe("planned");
    await a.from("activities").update({ planned_session_id: sessionId }).eq("id", activityId);
    expect((await a.from("planned_sessions").select("status").eq("id", sessionId).single()).data!.status).toBe("completed");
  });

  it("keeps the workout in history when its planned session is deleted", async () => {
    const del = await a.from("planned_sessions").delete().eq("id", sessionId);
    expect(del.error).toBeNull();
    const act = await a.from("activities").select("id,planned_session_id,athlete_id,title").eq("id", activityId).single();
    expect(act.data).toEqual({ id: activityId, planned_session_id: null, athlete_id: aId, title: "IT run done" });
  });

  it("returns a session to planned when its linked workout is deleted", async () => {
    const s = await a.from("planned_sessions").insert({ session_date: "2026-11-27", activity_type: "bike", title: "IT ride" }).select("id").single();
    await a.from("activities").update({ planned_session_id: s.data!.id }).eq("id", activityId);
    expect((await a.from("planned_sessions").select("status").eq("id", s.data!.id).single()).data!.status).toBe("completed");
    await a.from("activities").delete().eq("id", activityId);
    expect((await a.from("planned_sessions").select("status").eq("id", s.data!.id).single()).data!.status).toBe("planned");
    await a.from("planned_sessions").delete().eq("id", s.data!.id);
  });

  it("enforces data constraints in the database", async () => {
    const bad = async (row: Record<string, unknown>) => (await a.from("activities").insert({ activity_date: "2026-11-24", activity_type: "run", title: "x", ...row } as never)).error;
    expect(await bad({ rpe: 11 })).not.toBeNull();
    expect(await bad({ duration_seconds: 0 })).not.toBeNull();
    expect(await bad({ activity_type: "rest" })).not.toBeNull();
    expect(await bad({ origin: "manual", external_provider: "strava", external_id: "1" })).not.toBeNull();
    expect(await bad({ origin: "imported", external_provider: "strava" })).not.toBeNull();
  });
});

describe("imported activities", () => {
  it("upserts on (athlete, provider, external id) and leaves manual entries alone", async () => {
    const ext = { provider: "strava" as const, externalId: "it-555", type: "bike" as const, title: "Imported ride", startedAt: "2026-11-25T01:00:00Z", timeZone: "America/Denver", durationSeconds: 1800 };
    const id1 = await upsertImportedActivity(b, normalizeExternalActivity(ext, bId));
    const id2 = await upsertImportedActivity(b, normalizeExternalActivity({ ...ext, title: "Imported ride (renamed)", durationSeconds: 1860 }, bId));
    expect(id2).toBe(id1);

    const rows = await b.from("activities").select("title,duration_seconds,origin,activity_date").eq("external_provider", "strava");
    expect(rows.data).toEqual([{ title: "Imported ride (renamed)", duration_seconds: 1860, origin: "imported", activity_date: "2026-11-24" }]);

    // The same provider id may exist for a different athlete.
    const other = await upsertImportedActivity(a, normalizeExternalActivity(ext, aId));
    expect(other).not.toBe(id1);

    const manual = await a.from("activities").select("*", { count: "exact", head: true }).eq("origin", "manual");
    expect(manual.count).toBe(2);
    await a.from("activities").delete().eq("id", other);
    await b.from("activities").delete().eq("id", id1);
  });
});

describe("account deletion", () => {
  it("removes an athlete and all of their data, including linked workouts", async () => {
    const email = "it-athlete-c@project1406.test";
    const cId = await resetUser(email, { onboarded: true });
    const c = await signedInClient(email);
    const s = await c.from("planned_sessions").insert({ session_date: "2026-11-24", activity_type: "bike", title: "Ride" }).select("id").single();
    await c.from("activities").insert({ activity_date: "2026-11-24", activity_type: "bike", title: "Ride", planned_session_id: s.data!.id });

    const admin = adminClient();
    const { error } = await admin.auth.admin.deleteUser(cId);
    expect(error).toBeNull();
    expect((await admin.from("profiles").select("*", { count: "exact", head: true }).eq("id", cId)).count).toBe(0);
    for (const table of OWNED_TABLES) {
      const rows = await admin.from(table).select("*", { count: "exact", head: true }).eq("athlete_id", cId);
      expect(rows.count, table).toBe(0);
    }
  });
});

describe("Get Off the Couch plan pack", () => {
  const seededRows = async (client: SupabaseClient<Database>) =>
    (await client.from("planned_sessions").select("*", { count: "exact", head: true }).not("seed_key", "is", null)).count;

  it("is added once on top of an account that already has the starter plan, without touching it", async () => {
    const before = await seededRows(a);
    expect(await applyCouchPlan(a, aId)).toEqual({ applied: true });
    expect(await seededRows(a)).toBe(before! + couchPlanSessions.length);

    const bikes = await a.from("planned_sessions").select("planned_duration_seconds").eq("activity_type", "bike").not("seed_key", "is", null).order("session_date");
    expect(bikes.data!.map((r) => r.planned_duration_seconds! / 60)).toEqual([35, 60, 40, 70, 45, 80, 30, 55, 45, 85, 45, 100, 35, 65]);

    // The athlete deletes one; running it again restores nothing and adds nothing.
    await a.from("planned_sessions").delete().eq("seed_key", couchPlanSessions[0].seed_key);
    expect(await applyCouchPlan(a, aId)).toEqual({ applied: false, reason: "already-applied" });
    expect(await seededRows(a)).toBe(before! + couchPlanSessions.length - 1);
  });

  it("lands in one account only", async () => {
    expect(await seededRows(b)).toBe(0);
  });
});
