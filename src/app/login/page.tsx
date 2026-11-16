import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/data/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/site-url";
import { LoginForm } from "@/components/auth/login-form";
import { Wordmark } from "@/components/layout/nav";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  if (configured && (await getSessionUser())) redirect(safeNextPath(params.next));

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="hidden flex-col justify-between bg-forest p-12 text-white lg:flex">
        <Link href="/" className="text-sm font-semibold tracking-[0.18em] uppercase">
          Project <span className="display text-2xl tracking-normal normal-case">140.6</span>
        </Link>
        <div>
          <p className="display text-6xl leading-[1.02]">
            Swim 2.4.
            <br />
            Bike 112.
            <br />
            Run 26.2.
          </p>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-white/75">
            One day in Sacramento. A year of ordinary Tuesdays to get there.
          </p>
        </div>
        <p className="text-xs text-white/60">The Road to California</p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="lg:hidden" aria-label="PROJECT 140.6 home">
            <Wordmark />
          </Link>
          <h1 className="display mt-8 text-4xl lg:mt-0">Welcome back.</h1>
          <p className="mt-2 text-sm text-muted-ink">Sign in to your training journal.</p>

          {!configured ? (
            <p role="alert" className="mt-8 rounded-lg border border-line bg-surface p-4 text-sm leading-relaxed text-muted-ink">
              Supabase isn&apos;t configured yet. Add <code className="text-ink">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="text-ink">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to your environment — see the README.
            </p>
          ) : (
            <LoginForm next={params.next} linkError={params.error === "link"} />
          )}
        </div>
      </main>
    </div>
  );
}
