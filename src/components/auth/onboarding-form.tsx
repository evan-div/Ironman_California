"use client";

import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { Profile } from "@/types";
import { completeOnboarding } from "@/app/actions/settings";
import { useAction } from "@/hooks/use-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, fieldAria } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { TimezoneSelect } from "./timezone-select";

export function OnboardingForm({ profile, isOwner }: { profile: Profile; isOwner: boolean }) {
  const { pending, run } = useAction();
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [v, setV] = React.useState({
    preferred_name: profile.preferred_name ?? "",
    timezone: profile.timezone,
    distance_unit: profile.distance_unit,
    swim_unit: profile.swim_unit,
    weekly_goal_hours: profile.weekly_goal_hours == null ? (isOwner ? "3.5" : "") : String(profile.weekly_goal_hours),
    event_name: "",
    event_date: "",
    load_starter_plan: isOwner,
  });
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) => setV((prev) => ({ ...prev, [key]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    run(() => completeOnboarding(v)).then((r) => {
      if (!r.ok) setErrors(r.fieldErrors ?? {});
    });
  }

  const err = (k: string) => errors[k]?.[0];

  return (
    <form onSubmit={submit} className="mt-10 grid gap-8" noValidate>
      <section className="grid gap-4">
        <Field label="What should we call you?" htmlFor="ob-name" error={err("preferred_name")}>
          <Input {...fieldAria("ob-name", err("preferred_name"))} autoComplete="given-name" value={v.preferred_name} onChange={(e) => set("preferred_name", e.target.value)} />
        </Field>
        <Field label="Timezone" htmlFor="ob-tz" error={err("timezone")} hint="Used for “today”, your calendar and the race countdown.">
          <TimezoneSelect {...fieldAria("ob-tz", err("timezone"), "hint")} value={v.timezone} onChange={(e) => set("timezone", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium">Swim distances</span>
            <Segmented
              ariaLabel="Swim distance unit"
              value={v.swim_unit}
              onValueChange={(x) => set("swim_unit", x)}
              options={[
                { value: "yd", label: "Yards" },
                { value: "m", label: "Meters" },
              ]}
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium">Bike &amp; run</span>
            <Segmented
              ariaLabel="Bike and run distance unit"
              value={v.distance_unit}
              onValueChange={(x) => set("distance_unit", x)}
              options={[
                { value: "mi", label: "Miles" },
                { value: "km", label: "Km" },
              ]}
            />
          </div>
        </div>
        <Field label="Weekly training goal (hours)" htmlFor="ob-goal" optional error={err("weekly_goal_hours")} hint="A rough target for now. It's yours to change.">
          <Input {...fieldAria("ob-goal", err("weekly_goal_hours"), "hint")} inputMode="decimal" className="max-w-32" value={v.weekly_goal_hours} onChange={(e) => set("weekly_goal_hours", e.target.value)} />
        </Field>
      </section>

      {isOwner ? (
        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold">Load the IRONMAN California starter plan</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-ink">
                Adds your goal race (October 24, 2027), the seven training phases, the first week of sessions, the bike progression
                through December, and the swim and sauna you already did on November 16. Everything stays editable, and it is only
                ever added once.
              </p>
            </div>
            <Switch checked={v.load_starter_plan} onCheckedChange={(x) => set("load_starter_plan", x)} aria-label="Load the IRONMAN California starter plan" />
          </div>
        </section>
      ) : null}

      {!v.load_starter_plan ? (
        <section className="grid gap-4">
          <div>
            <h2 className="text-[15px] font-semibold">Your goal race</h2>
            <p className="mt-1 text-[13px] text-muted-ink">Optional — you can add it later.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
            <Field label="Event" htmlFor="ob-event" optional error={err("event_name")}>
              <Input {...fieldAria("ob-event", err("event_name"))} value={v.event_name} onChange={(e) => set("event_name", e.target.value)} />
            </Field>
            <Field label="Date" htmlFor="ob-event-date" optional error={err("event_date")}>
              <Input type="date" {...fieldAria("ob-event-date", err("event_date"))} value={v.event_date} onChange={(e) => set("event_date", e.target.value)} />
            </Field>
          </div>
        </section>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? <Loader2 className="animate-spin" /> : null}
        Start training
        {!pending ? <ArrowRight /> : null}
      </Button>
    </form>
  );
}
