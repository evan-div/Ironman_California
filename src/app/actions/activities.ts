"use server";

import type { Activity, ActionResult, PlannedSession } from "@/types";
import { activityFormSchema, activityFormToRow } from "@/lib/validations/activity";
import { dateString } from "@/lib/validations/common";
import { addDaysStr } from "@/lib/training/dates";
import { actionContext, dbError, fail, idSchema, invalid, refreshApp, SIGNED_OUT } from "./helpers";

export async function createActivity(input: unknown): Promise<ActionResult<Activity>> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsed = activityFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const row = activityFormToRow(parsed.data, ctx.profile.timezone);
  const { data, error } = await ctx.supabase
    .from("activities")
    .insert({ ...row, athlete_id: ctx.userId, origin: "manual" })
    .select("*")
    .single();
  if (error) return dbError("save the workout", error);
  refreshApp();
  return { ok: true, data: data as Activity, message: "Workout logged" };
}

export async function updateActivity(id: unknown, input: unknown): Promise<ActionResult<Activity>> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsedId = idSchema.safeParse(id);
  const parsed = activityFormSchema.safeParse(input);
  if (!parsedId.success) return fail("Unknown activity.");
  if (!parsed.success) return invalid(parsed.error);

  const row = activityFormToRow(parsed.data, ctx.profile.timezone);
  const { data, error } = await ctx.supabase.from("activities").update(row).eq("id", parsedId.data).select("*").maybeSingle();
  if (error) return dbError("update the workout", error);
  if (!data) return fail("That activity no longer exists.");
  refreshApp();
  return { ok: true, data: data as Activity, message: "Workout updated" };
}

export async function deleteActivity(id: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown activity.");
  const { error, count } = await ctx.supabase.from("activities").delete({ count: "exact" }).eq("id", parsedId.data);
  if (error) return dbError("delete the workout", error);
  if (!count) return fail("That activity no longer exists.");
  refreshApp();
  return { ok: true, data: undefined, message: "Workout deleted" };
}

/** Link an activity to a planned session (pass null to unlink). The session's status follows automatically. */
export async function setActivityLink(activityId: unknown, sessionId: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const a = idSchema.safeParse(activityId);
  const s = idSchema.nullable().safeParse(sessionId);
  if (!a.success || !s.success) return fail("Unknown activity or session.");
  const { error, count } = await ctx.supabase
    .from("activities")
    .update({ planned_session_id: s.data }, { count: "exact" })
    .eq("id", a.data);
  if (error) return dbError(s.data ? "link the workout" : "unlink the workout", error);
  if (!count) return fail("That activity no longer exists.");
  refreshApp();
  return { ok: true, data: undefined, message: s.data ? "Linked to plan" : "Unlinked from plan" };
}

export type LinkOptions = {
  sessions: Pick<PlannedSession, "id" | "title" | "session_date" | "activity_type" | "status">[];
  activities: Pick<Activity, "id" | "title" | "activity_date" | "activity_type" | "planned_session_id">[];
};

/** Planned sessions and unlinked activities within three days of a date, for the link pickers. */
export async function getLinkOptions(date: unknown): Promise<ActionResult<LinkOptions>> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const d = dateString.safeParse(date);
  if (!d.success) return { ok: true, data: { sessions: [], activities: [] } };
  const from = addDaysStr(d.data, -3);
  const to = addDaysStr(d.data, 3);
  const [sessions, activities] = await Promise.all([
    ctx.supabase
      .from("planned_sessions")
      .select("id,title,session_date,activity_type,status")
      .gte("session_date", from)
      .lte("session_date", to)
      .neq("activity_type", "rest")
      .order("session_date"),
    ctx.supabase
      .from("activities")
      .select("id,title,activity_date,activity_type,planned_session_id")
      .gte("activity_date", from)
      .lte("activity_date", to)
      .is("planned_session_id", null)
      .order("activity_date"),
  ]);
  if (sessions.error) return dbError("load planned sessions", sessions.error);
  if (activities.error) return dbError("load activities", activities.error);
  return {
    ok: true,
    data: { sessions: sessions.data as LinkOptions["sessions"], activities: activities.data as LinkOptions["activities"] },
  };
}
