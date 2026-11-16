"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { ACTIVITY_TYPES } from "@/types";
import { DISCIPLINES } from "@/lib/training/disciplines";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Filters = { type: string; from: string; to: string; q: string; sort: string };

const SORTS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "duration_desc", label: "Longest duration" },
  { value: "distance_desc", label: "Longest distance" },
];

export function ActivityFilters({ initial }: { initial: Filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = React.useCallback(
    (next: Filters) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(next)) {
        if (v && !(k === "sort" && v === "date_desc")) params.set(k, v);
      }
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router],
  );

  function update(patch: Partial<Filters>, debounce = false) {
    const next = { ...filters, ...patch };
    setFilters(next);
    if (timer.current) clearTimeout(timer.current);
    if (debounce) timer.current = setTimeout(() => push(next), 300);
    else push(next);
  }

  React.useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const active = Boolean(filters.type || filters.from || filters.to || filters.q);

  return (
    <form role="search" aria-label="Filter activities" aria-busy={pending} onSubmit={(e) => e.preventDefault()} className="grid gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="flt-q">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint-ink" aria-hidden />
          <Input id="flt-q" type="search" className="pl-9" placeholder="Titles and notes" value={filters.q} onChange={(e) => update({ q: e.target.value }, true)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:contents">
        <div className="grid gap-1.5">
          <Label htmlFor="flt-type">Type</Label>
          <NativeSelect id="flt-type" value={filters.type} onChange={(e) => update({ type: e.target.value })}>
            <option value="">All types</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {DISCIPLINES[t].label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="flt-sort">Sort</Label>
          <NativeSelect id="flt-sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="flt-from">From</Label>
          <Input id="flt-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => update({ from: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="flt-to">To</Label>
          <Input id="flt-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => update({ to: e.target.value })} />
        </div>
      </div>
      <Button type="button" variant="ghost" disabled={!active} onClick={() => update({ type: "", from: "", to: "", q: "" })}>
        <X />
        Clear
      </Button>
    </form>
  );
}
