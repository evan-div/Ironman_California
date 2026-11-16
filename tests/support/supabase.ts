import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

export type LocalSupabase = { url: string; publishableKey: string; secretKey: string };

let cached: LocalSupabase | null = null;

/**
 * Connection details for the LOCAL Supabase stack. Read from the environment,
 * or from `supabase status` so no keys need to be written down anywhere.
 * Refuses to run against anything that is not localhost: these tests create
 * and delete users.
 */
export function localSupabase(): LocalSupabase {
  if (cached) return cached;
  let url = process.env.SUPABASE_TEST_URL;
  let publishableKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
  let secretKey = process.env.SUPABASE_TEST_SECRET_KEY;
  if (!url || !publishableKey || !secretKey) {
    let raw: string;
    try {
      raw = execSync("npx supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      throw new Error("Local Supabase is not running. Start it with `npx supabase start`, then re-run the tests.");
    }
    const status = JSON.parse(raw.slice(raw.indexOf("{")));
    url = status.API_URL;
    publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
    secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  }
  if (!url || !publishableKey || !secretKey) throw new Error("Could not determine local Supabase credentials.");
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
    throw new Error(`Refusing to run destructive tests against a non-local Supabase URL: ${url}`);
  }
  cached = { url, publishableKey, secretKey };
  return cached;
}

export function adminClient(): SupabaseClient<Database> {
  const { url, secretKey } = localSupabase();
  return createClient<Database>(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const TEST_PASSWORD = "correct-horse-140.6";

/** Create (or recreate) a confirmed, allowlisted user with a clean slate. */
export async function resetUser(email: string, opts: { onboarded?: boolean; name?: string } = {}) {
  const admin = adminClient();
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    const { error } = await admin.auth.admin.deleteUser(existing.id);
    if (error) throw error;
  }
  const { error: allowError } = await admin.from("allowed_emails").upsert({ email, note: "automated test" });
  if (allowError) throw allowError;
  const { data, error } = await admin.auth.admin.createUser({ email, password: TEST_PASSWORD, email_confirm: true });
  if (error) throw error;
  if (opts.onboarded) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({ preferred_name: opts.name ?? "Test", onboarded_at: new Date().toISOString() })
      .eq("id", data.user.id);
    if (profileError) throw profileError;
  }
  return data.user.id;
}

/** A client signed in as the given user: everything it does is subject to RLS. */
export async function signedInClient(email: string): Promise<SupabaseClient<Database>> {
  const { url, publishableKey } = localSupabase();
  const client = createClient<Database>(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw error;
  return client;
}

export function anonClient(): SupabaseClient<Database> {
  const { url, publishableKey } = localSupabase();
  return createClient<Database>(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
