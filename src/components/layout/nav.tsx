"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, LayoutDashboard, ListChecks, LogOut, Map, Plus, Settings } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { useWorkoutLog } from "@/components/activities/workout-log-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  { href: "/activities", label: "Activities", short: "Log", icon: ListChecks },
  { href: "/progress", label: "Progress", short: "Progress", icon: BarChart3 },
  { href: "/roadmap", label: "Roadmap", short: "Roadmap", icon: Map },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 text-ink", className)}>
      <span className="text-[11px] font-semibold tracking-[0.18em] uppercase">Project</span>
      <span className="display text-[1.55rem] leading-none text-forest">140.6</span>
    </span>
  );
}

export function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const { openLog } = useWorkoutLog();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-canvas px-4 py-6 lg:flex">
      <Link href="/dashboard" className="rounded-md px-2" aria-label="PROJECT 140.6 — dashboard">
        <Wordmark />
        <span className="mt-1 block text-xs text-faint-ink">The Road to California</span>
      </Link>

      <Button className="mt-7 w-full justify-center" onClick={() => openLog()}>
        <Plus />
        Log workout
      </Button>

      <nav aria-label="Main" className="mt-6 flex flex-1 flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                active ? "bg-sage/70 font-medium text-ink" : "text-muted-ink hover:bg-muted hover:text-ink",
              )}
            >
              <Icon className={cn("size-[18px]", active && "text-forest")} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line pt-3">
        <Link
          href="/settings"
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          className={cn(
            "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
            isActive(pathname, "/settings") ? "bg-sage/70 font-medium text-ink" : "text-muted-ink hover:bg-muted hover:text-ink",
          )}
        >
          <Settings className="size-[18px]" strokeWidth={1.8} />
          Settings
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-ink transition-colors hover:bg-muted hover:text-ink"
          >
            <LogOut className="size-[18px]" strokeWidth={1.8} />
            Sign out
          </button>
        </form>
        <p className="mt-2 truncate px-3 text-xs text-faint-ink">Signed in as {name}</p>
      </div>
    </aside>
  );
}

export function MobileHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur lg:hidden">
      <Link href="/dashboard" aria-label="PROJECT 140.6 — dashboard">
        <Wordmark />
      </Link>
      <div className="flex items-center">
        {[
          { href: "/roadmap", label: "Roadmap", icon: Map },
          { href: "/settings", label: "Settings", icon: Settings },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={cn(
              "grid size-10 place-items-center rounded-full hover:bg-muted hover:text-ink",
              isActive(pathname, href) ? "text-forest" : "text-muted-ink",
            )}
          >
            <Icon className="size-5" strokeWidth={1.8} />
          </Link>
        ))}
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { openLog } = useWorkoutLog();
  const left = NAV.slice(0, 2);
  const right = NAV.slice(2, 4);
  const item = ({ href, short, icon: Icon }: (typeof NAV)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10.5px] font-medium transition-colors",
          active ? "text-forest" : "text-faint-ink",
        )}
      >
        <Icon className="size-[21px]" strokeWidth={active ? 2.1 : 1.7} />
        {short}
      </Link>
    );
  };
  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-1">
        {left.map(item)}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => openLog()}
            aria-label="Log workout"
            className="grid size-12 -translate-y-2 place-items-center rounded-full bg-forest text-white shadow-lift transition-transform active:scale-95"
          >
            <Plus className="size-6" />
          </button>
        </div>
        {right.map(item)}
      </div>
    </nav>
  );
}
