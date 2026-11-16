"use server";

import { z } from "zod";
import type { ActionResult } from "@/types";
import { milestoneFormSchema, phaseFormSchema } from "@/lib/validations/settings";
import { toNumberOrNull, toTextOrNull } from "@/lib/validations/common";
import { actionContext, dbError, fail, idSchema, invalid, refreshApp, SIGNED_OUT } from "./helpers";

function phaseRow(v: z.infer<typeof phaseFormSchema>) {
  return {
    name: v.name,
    start_date: v.start_date,
    end_date: v.end_date,
    target_hours_min: toNumberOrNull(v.target_hours_min),
    target_hours_max: toNumberOrNull(v.target_hours_max),
    focus: toTextOrNull(v.focus),
  };
}

export async function savePhase(id: unknown, input: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsedId = idSchema.nullable().safeParse(id);
  const parsed = phaseFormSchema.safeParse(input);
  if (!parsedId.success) return fail("Unknown phase.");
  if (!parsed.success) return invalid(parsed.error);
  const row = phaseRow(parsed.data);
  if (parsedId.data) {
    const { error, count } = await ctx.supabase.from("training_phases").update(row, { count: "exact" }).eq("id", parsedId.data);
    if (error) return dbError("save the phase", error);
    if (!count) return fail("That phase no longer exists.");
  } else {
    const { error } = await ctx.supabase.from("training_phases").insert({ ...row, athlete_id: ctx.userId });
    if (error) return dbError("add the phase", error);
  }
  refreshApp();
  return { ok: true, data: undefined, message: parsedId.data ? "Phase updated" : "Phase added" };
}

export async function deletePhase(id: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown phase.");
  const { error } = await ctx.supabase.from("training_phases").delete().eq("id", parsedId.data);
  if (error) return dbError("delete the phase", error);
  refreshApp();
  return { ok: true, data: undefined, message: "Phase deleted" };
}

export async function saveMilestone(id: unknown, input: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsedId = idSchema.nullable().safeParse(id);
  const parsed = milestoneFormSchema.safeParse(input);
  if (!parsedId.success) return fail("Unknown milestone.");
  if (!parsed.success) return invalid(parsed.error);
  const row = { title: parsed.data.title, description: toTextOrNull(parsed.data.description), target_date: parsed.data.target_date };
  if (parsedId.data) {
    const { error, count } = await ctx.supabase.from("milestones").update(row, { count: "exact" }).eq("id", parsedId.data);
    if (error) return dbError("save the milestone", error);
    if (!count) return fail("That milestone no longer exists.");
  } else {
    const { error } = await ctx.supabase.from("milestones").insert({ ...row, athlete_id: ctx.userId });
    if (error) return dbError("add the milestone", error);
  }
  refreshApp();
  return { ok: true, data: undefined, message: parsedId.data ? "Milestone updated" : "Milestone added" };
}

export async function setMilestoneCompleted(id: unknown, completed: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsedId = idSchema.safeParse(id);
  const done = z.boolean().safeParse(completed);
  if (!parsedId.success || !done.success) return fail("Unknown milestone.");
  const { error, count } = await ctx.supabase
    .from("milestones")
    .update({ completed_at: done.data ? new Date().toISOString() : null }, { count: "exact" })
    .eq("id", parsedId.data);
  if (error) return dbError("update the milestone", error);
  if (!count) return fail("That milestone no longer exists.");
  refreshApp();
  return { ok: true, data: undefined, message: done.data ? "Milestone reached" : "Milestone reopened" };
}

export async function deleteMilestone(id: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail("Unknown milestone.");
  const { error } = await ctx.supabase.from("milestones").delete().eq("id", parsedId.data);
  if (error) return dbError("delete the milestone", error);
  refreshApp();
  return { ok: true, data: undefined, message: "Milestone deleted" };
}
