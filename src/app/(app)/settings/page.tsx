import type { Metadata } from "next";
import { isOwnerEmail, requireAthlete } from "@/lib/data/auth";
import { getPrimaryGoalEvent, hasSeed } from "@/lib/data/queries";
import { OWNER_SEED_KEY } from "@/lib/training/seed-data";
import { COUCH_PLAN_SEED_KEY } from "@/lib/training/couch-plan";
import { SettingsForms } from "@/components/settings/settings-forms";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, profile, email } = await requireAthlete();
  const owner = isOwnerEmail(email);
  const [event, seeded, couchPlan] = await Promise.all([
    getPrimaryGoalEvent(supabase),
    owner ? hasSeed(supabase, OWNER_SEED_KEY) : Promise.resolve(false),
    owner ? hasSeed(supabase, COUCH_PLAN_SEED_KEY) : Promise.resolve(false),
  ]);
  const starterPlan = !owner ? "hidden" : seeded && couchPlan ? "applied" : seeded ? "couch-plan" : "available";
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" />
      <SettingsForms profile={profile} event={event} email={email} starterPlan={starterPlan} />
    </>
  );
}
