"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema, emailSchema } from "@/lib/validations/settings";
import { getSiteUrl, safeNextPath } from "@/lib/site-url";
import type { ActionResult } from "@/types";
import { fail, invalid, refreshApp } from "./helpers";

function friendlyAuthError(message: string, code?: string): string {
  const m = message.toLowerCase();
  if (code === "invalid_credentials" || m.includes("invalid login")) return "That email and password don't match. Please try again.";
  if (code === "email_not_confirmed" || m.includes("not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("private beta") || m.includes("not been invited")) return "PROJECT 140.6 is in private beta and this email hasn't been invited yet.";
  if (code === "signup_disabled" || m.includes("signups not allowed")) return "Sign-ups are closed during the private beta.";
  if (code === "user_already_exists" || m.includes("already registered")) return "An account with this email already exists. Try signing in instead.";
  if (code === "weak_password") return "Please choose a stronger password.";
  if (code === "over_email_send_rate_limit" || m.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("fetch failed") || m.includes("network")) return "We couldn't reach the sign-in service. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

export async function signIn(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(friendlyAuthError(error.message, error.code));
  refreshApp();
  redirect(safeNextPath(next));
}

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const site = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${site}/auth/confirm?next=/onboarding` },
  });
  if (error) return fail(friendlyAuthError(error.message, error.code));
  if (data.session) {
    refreshApp();
    redirect("/onboarding");
  }
  return { ok: true, data: undefined, message: "Almost there — check your email for a confirmation link." };
}

export async function sendMagicLink(input: unknown): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const site = await getSiteUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: `${site}/auth/confirm?next=/dashboard` },
  });
  // Do not reveal whether an address has an account.
  if (error && !/signups not allowed|user not found|otp_disabled/i.test(`${error.code} ${error.message}`)) {
    return fail(friendlyAuthError(error.message, error.code));
  }
  return { ok: true, data: undefined, message: "If that email has an account, a sign-in link is on its way." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  refreshApp();
  redirect("/login");
}
