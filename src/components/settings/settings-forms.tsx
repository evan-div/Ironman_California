"use client";

import * as React from "react";
import { Loader2, LogOut } from "lucide-react";
import { ACTIVITY_TYPES, type ActionResult, type GoalEvent, type Profile } from "@/types";
import { signOut } from "@/app/actions/auth";
import { loadStarterPlan, saveGoalEvent, updatePassword, updatePreferences, updateProfile } from "@/app/actions/settings";
import { DISCIPLINES } from "@/lib/training/disciplines";
import { formatClock } from "@/lib/training/duration";
import { useAction } from "@/hooks/use-action";
import { TimezoneSelect } from "@/components/auth/timezone-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field, fieldAria } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";

/** One settings card with its own form state, save button and field errors. */
function Section<T extends Record<string, unknown>>({
  id,
  title,
  description,
  initial,
  action,
  submitLabel = "Save",
  resetOnSuccess = false,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  initial: T;
  action: (values: T) => Promise<ActionResult>;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  children: (ctx: { v: T; set: <K extends keyof T>(key: K, value: T[K]) => void; err: (key: keyof T & string) => string | undefined }) => React.ReactNode;
}) {
  const { pending, run } = useAction();
  const [v, setV] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  return (
    <Card id={id} className="scroll-mt-24 p-5 sm:p-6">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setErrors({});
          run(() => action(v), { onSuccess: () => resetOnSuccess && setV(initial) }).then((r) => !r.ok && setErrors(r.fieldErrors ?? {}));
        }}
      >
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-[13px] leading-relaxed text-muted-ink">{description}</p> : null}
        <div className="mt-5 grid gap-4">{children({ v, set: (key, value) => setV((p) => ({ ...p, [key]: value })), err: (k) => errors[k]?.[0] })}</div>
        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {submitLabel}
          </Button>
          {dirty && !pending ? <span className="text-xs text-faint-ink">Unsaved changes</span> : null}
        </div>
      </form>
    </Card>
  );
}

const clock = (s: number | null) => (s == null ? "" : formatClock(s, true).replace(/:00$/, ""));

export function SettingsForms({
  profile,
  event,
  email,
  starterPlan,
}: {
  profile: Profile;
  event: GoalEvent | null;
  email: string | null;
  starterPlan: "hidden" | "available" | "applied";
}) {
  const { pending: seeding, run: runSeed } = useAction();

  return (
    <div className="grid max-w-2xl gap-4">
      <Section
        key={`profile-${profile.updated_at}`}
        title="Profile"
        initial={{
          preferred_name: profile.preferred_name ?? "",
          timezone: profile.timezone,
          distance_unit: profile.distance_unit,
          swim_unit: profile.swim_unit,
          weekly_goal_hours: profile.weekly_goal_hours == null ? "" : String(profile.weekly_goal_hours),
        }}
        action={updateProfile}
        submitLabel="Save profile"
      >
        {({ v, set, err }) => (
          <>
            <Field label="Preferred name" htmlFor="st-name" error={err("preferred_name")}>
              <Input {...fieldAria("st-name", err("preferred_name"))} value={v.preferred_name} onChange={(e) => set("preferred_name", e.target.value)} autoComplete="given-name" />
            </Field>
            <Field label="Timezone" htmlFor="st-tz" error={err("timezone")} hint="Decides what “today” is, and keeps calendar dates from shifting.">
              <TimezoneSelect {...fieldAria("st-tz", err("timezone"), "hint")} value={v.timezone} onChange={(e) => set("timezone", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <span className="text-[13px] font-medium">Swim distances</span>
                <Segmented ariaLabel="Swim distance unit" value={v.swim_unit} onValueChange={(x) => set("swim_unit", x)} options={[{ value: "yd", label: "Yards" }, { value: "m", label: "Meters" }]} />
              </div>
              <div className="grid gap-1.5">
                <span className="text-[13px] font-medium">Bike &amp; run distances</span>
                <Segmented ariaLabel="Bike and run distance unit" value={v.distance_unit} onValueChange={(x) => set("distance_unit", x)} options={[{ value: "mi", label: "Miles" }, { value: "km", label: "Kilometers" }]} />
              </div>
            </div>
            <Field label="Weekly training goal (hours)" htmlFor="st-goal" optional error={err("weekly_goal_hours")}>
              <Input {...fieldAria("st-goal", err("weekly_goal_hours"))} inputMode="decimal" className="max-w-32" value={v.weekly_goal_hours} onChange={(e) => set("weekly_goal_hours", e.target.value)} />
            </Field>
          </>
        )}
      </Section>

      <Section
        key={`goal-${event?.updated_at ?? "none"}`}
        id="goal"
        title="Goal race"
        description="The countdown and targets on your dashboard come from here. Split targets are aspirations, not predictions."
        initial={{
          name: event?.name ?? "",
          event_date: event?.event_date ?? "",
          location: event?.location ?? "",
          goal_description: event?.goal_description ?? "",
          target_finish: clock(event?.target_finish_seconds ?? null),
          target_swim: clock(event?.target_swim_seconds ?? null),
          target_bike: clock(event?.target_bike_seconds ?? null),
          target_run: clock(event?.target_run_seconds ?? null),
          target_transition: clock(event?.target_transition_seconds ?? null),
        }}
        action={saveGoalEvent}
        submitLabel="Save goal race"
      >
        {({ v, set, err }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
              <Field label="Event" htmlFor="st-event" error={err("name")}>
                <Input {...fieldAria("st-event", err("name"))} value={v.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Race date" htmlFor="st-event-date" error={err("event_date")}>
                <Input type="date" {...fieldAria("st-event-date", err("event_date"))} value={v.event_date} onChange={(e) => set("event_date", e.target.value)} />
              </Field>
            </div>
            <Field label="Location" htmlFor="st-location" optional error={err("location")}>
              <Input {...fieldAria("st-location", err("location"))} value={v.location} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label="Goal" htmlFor="st-goal-desc" optional error={err("goal_description")}>
              <Input {...fieldAria("st-goal-desc", err("goal_description"))} value={v.goal_description} onChange={(e) => set("goal_description", e.target.value)} placeholder="Finish under 14 hours" />
            </Field>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {(
                [
                  ["target_finish", "Finish"],
                  ["target_swim", "Swim"],
                  ["target_bike", "Bike"],
                  ["target_run", "Run"],
                  ["target_transition", "Transitions"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label} htmlFor={`st-${key}`} error={err(key)}>
                  <Input {...fieldAria(`st-${key}`, err(key))} placeholder="h:mm" value={v[key]} onChange={(e) => set(key, e.target.value)} />
                </Field>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section
        key={`prefs-${profile.updated_at}`}
        title="Workout defaults"
        description="What the log form starts with. You can always change it per workout."
        initial={{
          default_activity_type: profile.default_activity_type,
          default_bike_indoor: profile.default_bike_indoor,
          default_trainer_platform: profile.default_trainer_platform ?? "",
          default_swim_environment: profile.default_swim_environment,
        }}
        action={updatePreferences}
        submitLabel="Save defaults"
      >
        {({ v, set, err }) => (
          <>
            <Field label="Default activity type" htmlFor="st-type" error={err("default_activity_type")}>
              <NativeSelect id="st-type" className="max-w-56" value={v.default_activity_type} onChange={(e) => set("default_activity_type", e.target.value as Profile["default_activity_type"])}>
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DISCIPLINES[t].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid gap-1.5">
              <span className="text-[13px] font-medium">Swims are usually in</span>
              <Segmented
                ariaLabel="Default swim environment"
                className="w-fit"
                value={v.default_swim_environment}
                onValueChange={(x) => set("default_swim_environment", x)}
                options={[{ value: "pool", label: "Pool" }, { value: "open_water", label: "Open water" }]}
              />
            </div>
            <label className="flex items-center justify-between gap-4 rounded-lg border border-line px-3.5 py-3">
              <span>
                <span className="block text-[13px] font-medium">Rides default to indoor / trainer</span>
                <span className="block text-xs text-faint-ink">Turn off if most of your riding is outside.</span>
              </span>
              <Switch checked={v.default_bike_indoor} onCheckedChange={(x) => set("default_bike_indoor", x)} aria-label="Rides default to indoor" />
            </label>
            <Field label="Trainer platform" htmlFor="st-platform" optional error={err("default_trainer_platform")}>
              <Input {...fieldAria("st-platform", err("default_trainer_platform"))} className="max-w-56" placeholder="Zwift" value={v.default_trainer_platform} onChange={(e) => set("default_trainer_platform", e.target.value)} />
            </Field>
          </>
        )}
      </Section>

      {starterPlan !== "hidden" ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold">IRONMAN California starter plan</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-ink">
            {starterPlan === "applied"
              ? "Loaded into your account. It is only ever added once, so anything you have edited or deleted stays that way."
              : "Adds the goal race, seven training phases, week one, the December bike progression and your two activities from November 16. Safe to run once; it never duplicates."}
          </p>
          {starterPlan === "available" ? (
            <Button className="mt-4" variant="secondary" disabled={seeding} onClick={() => runSeed(() => loadStarterPlan())}>
              {seeding ? <Loader2 className="animate-spin" /> : null}
              Load starter plan
            </Button>
          ) : null}
        </Card>
      ) : null}

      <Card className="p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold">Integrations</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-ink">
          Every workout is logged by hand in this version. Imports from Strava, Zwift/FIT files, Garmin and Apple Health are planned; when they
          arrive, your manual entries will stay exactly as you wrote them.
        </p>
      </Card>

      <Section title="Password" description={email ? `Signed in as ${email}.` : undefined} initial={{ password: "" }} action={updatePassword} submitLabel="Update password" resetOnSuccess>
        {({ v, set, err }) => (
          <Field label="New password" htmlFor="st-password" error={err("password")} hint="At least 8 characters.">
            <Input {...fieldAria("st-password", err("password"), "hint")} type="password" autoComplete="new-password" className="max-w-72" value={v.password} onChange={(e) => set("password", e.target.value)} />
          </Field>
        )}
      </Section>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2 className="text-[15px] font-semibold">Sign out</h2>
          <p className="mt-1 text-[13px] text-muted-ink">End your session on this device.</p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            <LogOut /> Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
