import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile, isOwnerEmail, requireUser } from "@/lib/data/auth";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { Wordmark } from "@/components/layout/nav";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const { email } = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.onboarded_at) redirect("/dashboard");

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl px-6 py-10 sm:py-16">
      <Wordmark />
      <p className="eyebrow mt-10">Welcome</p>
      <h1 className="display mt-3 text-[2.6rem] sm:text-5xl">Let&apos;s set up your journal.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-ink">A few preferences so dates, distances and totals look right. You can change all of this later in Settings.</p>
      <OnboardingForm profile={profile} isOwner={isOwnerEmail(email)} />
    </div>
  );
}
