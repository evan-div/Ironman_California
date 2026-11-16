import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getProfile, getSessionUser } from "@/lib/data/auth";
import type { ActionResult } from "@/types";

export const idSchema = z.uuid();

export function fail(error: string, fieldErrors?: Record<string, string[] | undefined>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function invalid(error: z.ZodError): ActionResult<never> {
  const flat = z.flattenError(error);
  const first = Object.values(flat.fieldErrors).flat()[0] ?? flat.formErrors[0];
  return { ok: false, error: (first as string | undefined) ?? "Please check the form and try again.", fieldErrors: flat.fieldErrors };
}

/** Signed-in athlete context for a server action, or null. */
export async function actionContext() {
  const session = await getSessionUser();
  if (!session) return null;
  const profile = await getProfile();
  if (!profile) return null;
  return { ...session, profile };
}

export const SIGNED_OUT = "Your session has expired. Please sign in again.";

export function dbError(action: string, error: { message: string; code?: string }): ActionResult<never> {
  console.error(`[${action}]`, error.code, error.message);
  return { ok: false, error: `Couldn't ${action}. Please try again.` };
}

/** Everything in the app shell is per-user and dynamic; refresh it all after a write. */
export function refreshApp() {
  revalidatePath("/", "layout");
}
