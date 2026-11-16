import { resetUser } from "../support/supabase";
import { E2E_OTHER, E2E_OWNER } from "../../playwright.config";

export default async function globalSetup() {
  // The owner starts brand new (to exercise onboarding); the second athlete is already set up.
  await resetUser(E2E_OWNER);
  await resetUser(E2E_OTHER, { onboarded: true, name: "Other" });
}
