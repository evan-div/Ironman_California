import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

/** The verified user for this request, or null. Deduplicated per request. */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return {
    supabase,
    userId: data.claims.sub as string,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});

export async function requireUser() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return session;
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const session = await getSessionUser();
  if (!session) return null;
  const { data, error } = await session.supabase.from("profiles").select("*").eq("id", session.userId).maybeSingle();
  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  if (data) return data as Profile;
  // The auth trigger normally creates this row; recreate it if it is missing.
  const { data: created, error: insertError } = await session.supabase
    .from("profiles")
    .insert({ id: session.userId })
    .select("*")
    .single();
  if (insertError) throw new Error(`Could not create your profile: ${insertError.message}`);
  return created as Profile;
});

/** For pages inside the app shell: signed in and onboarded. */
export async function requireAthlete() {
  const session = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.onboarded_at) redirect("/onboarding");
  return { ...session, profile };
}

/** True when this account is the configured owner (eligible for the starter plan). */
export function isOwnerEmail(email: string | null): boolean {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(owner && email && email.toLowerCase() === owner);
}
