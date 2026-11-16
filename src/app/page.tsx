import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, LineChart, NotebookPen } from "lucide-react";
import { getSessionUser } from "@/lib/data/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/layout/nav";

export default async function LandingPage() {
  if (isSupabaseConfigured() && (await getSessionUser())) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Wordmark />
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-12">
        <p className="eyebrow">IRONMAN California · October 24, 2027</p>
        <h1 className="display mt-5 max-w-3xl text-[3.4rem] text-ink sm:text-[5.25rem]">
          The Road to <em className="text-forest">California.</em>
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted-ink">
          A training journal and coach-style planning calendar for one long project: 2.4 miles of swimming, 112 on the bike, and a
          marathon to finish. Plan the week, log what actually happened, and watch the work add up.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/login">
              Sign in
              <ArrowRight />
            </Link>
          </Button>
          <span className="text-sm text-faint-ink">Private beta — invitation only.</span>
        </div>

        <dl className="mt-16 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          {[
            { icon: CalendarDays, title: "Plan", body: "An editable calendar. Move sessions when life happens; history stays intact." },
            { icon: NotebookPen, title: "Log", body: "Record a swim, ride, run or sauna in a few taps. Only what you actually measured." },
            { icon: LineChart, title: "Review", body: "Weekly volume, planned versus done, and consistency — computed from your own log." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-surface p-6">
              <dt className="flex items-center gap-2.5 text-sm font-semibold">
                <Icon className="size-4 text-forest" strokeWidth={1.8} />
                {title}
              </dt>
              <dd className="mt-2 text-[13px] leading-relaxed text-muted-ink">{body}</dd>
            </div>
          ))}
        </dl>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-xs text-faint-ink">
        PROJECT 140.6 · First phase: Operation Get Off the Couch
      </footer>
    </div>
  );
}
