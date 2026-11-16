import { requireAthlete } from "@/lib/data/auth";
import { todayInTimeZone } from "@/lib/training/dates";
import { WorkoutLogProvider } from "@/components/activities/workout-log-provider";
import { MobileHeader, MobileNav, Sidebar } from "@/components/layout/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, email } = await requireAthlete();
  const today = todayInTimeZone(profile.timezone);

  return (
    <WorkoutLogProvider profile={profile} today={today}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <Sidebar name={profile.preferred_name ?? email ?? "athlete"} />
      <MobileHeader />
      <main id="main" className="lg:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10 lg:pb-16">{children}</div>
      </main>
      <MobileNav />
    </WorkoutLogProvider>
  );
}
