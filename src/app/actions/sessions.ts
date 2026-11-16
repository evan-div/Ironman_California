"use server";

import { z } from "zod";
import type { ActionResult, PlannedSession } from "@/types";
import type { Json } from "@/types/database";
import { sessionFormSchema, sessionFormToRow } from "@/lib/validations/session";
import { dateString } from "@/lib/validations/common";
import { actionContext, dbError, fail, idSchema, invalid, refreshApp, SIGNED_OUT } from "./helpers";

const asSession = (row: unknown) => row as PlannedSession;

export async function createSession(input: unknown): Promise<ActionResult<PlannedSession>> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsed = sessionFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const row = sessionFormToRow(parsed.data);
  const { data, error } = await ctx.supabase
    .from("planned_sessions")
    .insert({
      ...row,
      structured_workout: ("structured_workout" in row ? row.structured_workout : null) as unknown as Json,
      athlete_id: ctx.userId,
    })
    .select("*")
    .single();
  if (error) return dbError("add the session", error);
  refreshApp();
  return { ok: true, data: asSession(data), message: "Session planned" };
}

export async function updateSession(id: unknown, input: unknown): Promise<ActionResult<PlannedSession>> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsedId = idSchema.safeParse(id);
  const parsed = sessionFormSchema.safeParse(input);
  if (!parsedId.success) return fail("Unknown session.");
  if (!parsed.success) return invalid(parsed.error);

  const current = await ctx.supabase.from("planned_sessions").select("session_date,original_date").eq("id", parsedId.data).maybeSingle();
  if (current.error) return dbError("update the session", current.error);
  if (!current.data) return fail("That session no longer exists.");

  const row = sessionFormToRow(parsed.data);
  const moved = current.data.session_date !== row.session_date;
  const { data, error } = await ctx.supabase
    .from("planned_sessions")
    .update({
      ...(row as Omit<typeof row, "structured_workout">),
      ...("structured_workout" in row ? { structured_workout: row.structured_workout as unknown as Json } : {}),
      ...(moved
        ? { original_date: current.data.original_date ?? current.data.session_date, rescheduled_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", parsedId.data)
    .select("*")
    .single();
  if (error) return dbError("update the session", error);
  refreshApp();
  return { ok: true, data: asSession(data), message: "Session updated" };
}

/** Reschedule a session. Linked completed activities keep their own dates. */
export async function moveSession(id: unknown, newDate: unknown): Promise<ActionResult<PlannedSession>> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsedId = idSchema.safeParse(id);
  const date = dateString.safeParse(newDate);
  if (!parsedId.success) return fail("Unknown session.");
  if (!date.success) return fail("Choose a valid date.");

  const current = await ctx.supabase.from("planned_sessions").select("*").eq("id", parsedId.data).maybeSingle();
  if (current.error) return dbError("move the session", current.error);
  if (!current.data) return fail("That session no longer exists.");
  if (current.data.session_date === date.data) return { ok: true, data: asSession(current.data) };

  const original = current.data.original_date ?? current.data.session_date;
  const { data, error } = await ctx.supabase
    .from("planned_sessions")
    .update({
      session_date: date.data,
      // Moving a session back to where it started clears the "rescheduled" marker.
      original_date: original === date.data ? null : original,
      rescheduled_at: original === date.data ? null : new Date().toISOString(),
    })
    .eq("id", parsedId.data)
    .select("*")
    .single();
  if (error) return dbError("move the session", error);
  refreshApp();
  return { ok: true, data: asSession(data), message: "Session moved" };
}

const manualStatus = z.enum(["planned", "skipped"]);

/** Mark a session skipped, or restore it to planned. "Completed" only ever comes from a linked activity. */
export async function setSessionStatus(id: unknown, status: unknown): Promise<ActionResult<PlannedSession>> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsedId = idSchema.safeParse(id);
  const parsedStatus = manualStatus.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return fail("Unknown session or status.");
  const { data, error } = await ctx.supabase
    .from("planned_sessions")
    .update({ status: parsedStatus.data })
    .eq("id", parsedId.data)
    .select("*")
    .maybeSingle();
  if (error) return dbError("update the session", error);
  if (!data) return fail("That session no longer exists.");
  if (parsedStatus.data === "skipped" && data.status === "completed") {
    return fail("This session has a logged workout. Unlink it before marking the session skipped.");
  }
  refreshApp();
  return { ok: true, data: asSession(data), message: parsedStatus.data === "skipped" ? "Marked as skipped" : "Back on the plan" };
}

/** Delete a planned session. Any linked activity is kept and simply becomes unplanned. */
export async function deleteSession(id: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown session.");
  const { error, count } = await ctx.supabase.from("planned_sessions").delete({ count: "exact" }).eq("id", parsedId.data);
  if (error) return dbError("delete the session", error);
  if (!count) return fail("That session no longer exists.");
  refreshApp();
  return { ok: true, data: undefined, message: "Session deleted" };
}
