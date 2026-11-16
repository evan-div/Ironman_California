"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/types";
import {
  goalEventFormSchema,
  onboardingFormSchema,
  preferencesFormSchema,
  profileFormSchema,
} from "@/lib/validations/settings";
import { toNumberOrNull, toTextOrNull } from "@/lib/validations/common";
import { parseDuration } from "@/lib/training/duration";
import { applyOwnerSeed } from "@/lib/data/seed";
import { isOwnerEmail } from "@/lib/data/auth";
import { actionContext, dbError, fail, invalid, refreshApp, SIGNED_OUT } from "./helpers";

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsed = profileFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ ...parsed.data, weekly_goal_hours: toNumberOrNull(parsed.data.weekly_goal_hours) })
    .eq("id", ctx.userId);
  if (error) return dbError("save your profile", error);
  refreshApp();
  return { ok: true, data: undefined, message: "Profile saved" };
}

export async function updatePreferences(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsed = preferencesFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ ...parsed.data, default_trainer_platform: toTextOrNull(parsed.data.default_trainer_platform) })
    .eq("id", ctx.userId);
  if (error) return dbError("save your preferences", error);
  refreshApp();
  return { ok: true, data: undefined, message: "Preferences saved" };
}

/** Create or update the athlete's primary goal event. */
export async function saveGoalEvent(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsed = goalEventFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const row = {
    name: v.name,
    event_date: v.event_date,
    location: toTextOrNull(v.location),
    goal_description: toTextOrNull(v.goal_description),
    target_finish_seconds: parseDuration(v.target_finish),
    target_swim_seconds: parseDuration(v.target_swim),
    target_bike_seconds: parseDuration(v.target_bike),
    target_run_seconds: parseDuration(v.target_run),
    target_transition_seconds: parseDuration(v.target_transition),
  };
  const existing = await ctx.supabase.from("goal_events").select("id").eq("is_primary", true).maybeSingle();
  if (existing.error) return dbError("save your goal race", existing.error);
  const { error } = existing.data
    ? await ctx.supabase.from("goal_events").update(row).eq("id", existing.data.id)
    : await ctx.supabase.from("goal_events").insert({ ...row, athlete_id: ctx.userId, is_primary: true });
  if (error) return dbError("save your goal race", error);
  refreshApp();
  return { ok: true, data: undefined, message: "Goal race saved" };
}

/** Owner-only, explicit, idempotent: load the IRONMAN California starter plan into this account. */
export async function loadStarterPlan(): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  if (!isOwnerEmail(ctx.email)) return fail("The starter plan is only available to the account owner.");
  try {
    const result = await applyOwnerSeed(ctx.supabase, ctx.userId);
    refreshApp();
    return {
      ok: true,
      data: undefined,
      message: result.applied ? "Starter plan loaded" : "The starter plan was already loaded — nothing was changed.",
    };
  } catch (e) {
    console.error("[loadStarterPlan]", e);
    return fail("Couldn't load the starter plan. Please try again.");
  }
}

export async function completeOnboarding(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsed = onboardingFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const owner = isOwnerEmail(ctx.email);

  if (v.load_starter_plan) {
    if (!owner) return fail("The starter plan is only available to the account owner.");
    try {
      await applyOwnerSeed(ctx.supabase, ctx.userId);
    } catch (e) {
      console.error("[completeOnboarding] seed", e);
      return fail("Couldn't load the starter plan. Please try again.");
    }
  } else if (v.event_name && v.event_date) {
    const existing = await ctx.supabase.from("goal_events").select("id").limit(1).maybeSingle();
    if (existing.error) return dbError("save your goal race", existing.error);
    if (!existing.data) {
      const { error } = await ctx.supabase
        .from("goal_events")
        .insert({ athlete_id: ctx.userId, name: v.event_name, event_date: v.event_date, is_primary: true });
      if (error) return dbError("save your goal race", error);
    }
  }

  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      preferred_name: v.preferred_name,
      timezone: v.timezone,
      distance_unit: v.distance_unit,
      swim_unit: v.swim_unit,
      weekly_goal_hours: toNumberOrNull(v.weekly_goal_hours),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", ctx.userId);
  if (error) return dbError("finish setting up", error);
  refreshApp();
  redirect("/dashboard");
}

const passwordSchema = z.object({ password: z.string().min(8, "Use at least 8 characters").max(72) });

export async function updatePassword(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return fail(SIGNED_OUT);
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { error } = await ctx.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.code === "same_password" ? "That's already your password." : "Couldn't update your password. Please try again.");
  return { ok: true, data: undefined, message: "Password updated" };
}
