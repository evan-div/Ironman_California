"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Loader2 } from "lucide-react";
import type { Activity, ActivityType, Profile } from "@/types";
import { ACTIVITY_TYPES } from "@/types";
import { createActivity, getLinkOptions, updateActivity, type LinkOptions } from "@/app/actions/activities";
import {
  activityFormSchema,
  activityToForm,
  defaultTitle,
  emptyActivityForm,
  type ActivityFormValues,
} from "@/lib/validations/activity";
import { DISCIPLINES, RECOVERY_SUBTYPES, defaultDistanceUnit, supportsDistance } from "@/lib/training/disciplines";
import { formatDate } from "@/lib/training/dates";
import { formatDurationRange, parseDuration } from "@/lib/training/duration";
import { formatRunPace, formatSpeed, formatSwimPace, runPaceSeconds, speedPerHour, swimPaceSecondsPer100 } from "@/lib/training/pace";
import { toMeters } from "@/lib/training/units";
import { useAction } from "@/hooks/use-action";
import { DISCIPLINE_ICONS } from "@/components/discipline";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, fieldAria } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { LogOptions } from "./workout-log-provider";

const LAST_TYPE_KEY = "p1406:last-activity-type";

function initialValues(options: LogOptions, profile: Profile, today: string): ActivityFormValues {
  if (options.activity) return activityToForm(options.activity, profile);

  const session = options.session;
  if (session && session.activity_type !== "rest") {
    const type = session.activity_type as ActivityType;
    const base = emptyActivityForm(profile, session.session_date <= today ? session.session_date : today, type);
    return {
      ...base,
      title: session.title,
      indoor: session.is_indoor == null ? base.indoor : session.is_indoor ? "indoor" : "outdoor",
      planned_session_id: session.id,
    };
  }

  let type = options.type ?? profile.default_activity_type;
  if (!options.type && typeof window !== "undefined") {
    try {
      const last = window.localStorage.getItem(LAST_TYPE_KEY);
      if (last && (ACTIVITY_TYPES as readonly string[]).includes(last)) type = last as ActivityType;
    } catch {
      // Storage can be unavailable (private mode); the profile default is fine.
    }
  }
  const base = emptyActivityForm(profile, options.date ?? today, type);
  return { ...base, title: defaultTitle(type) };
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  options,
  profile,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: LogOptions;
  profile: Profile;
  today: string;
}) {
  const editing = options.activity;
  const { pending, run } = useAction();
  const [links, setLinks] = React.useState<LinkOptions["sessions"]>([]);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: React.useMemo(() => initialValues(options, profile, today), [options, profile, today]),
  });
  const { register, handleSubmit, setValue, getValues, setError, control, formState } = form;
  const errors = formState.errors;

  const [type, date, duration, distance, unit, linkedId, swimEnvironment, indoor, isRunWalk] = useWatch({
    control,
    name: [
      "activity_type",
      "activity_date",
      "duration",
      "distance",
      "distance_unit",
      "planned_session_id",
      "swim_environment",
      "indoor",
      "is_run_walk",
    ],
  });

  // Planned sessions near the chosen date, for the "counts toward" picker.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getLinkOptions(date).then((res) => {
      if (!cancelled && res.ok) setLinks(res.data.sessions);
    });
    return () => {
      cancelled = true;
    };
  }, [open, date]);

  function changeType(next: ActivityType) {
    const previous = getValues("activity_type");
    if (next === previous) return;
    setValue("activity_type", next, { shouldDirty: true });
    setValue("distance_unit", defaultDistanceUnit(next, profile));
    if (!supportsDistance(next)) setValue("distance", "");
    setValue("indoor", next === "bike" ? (profile.default_bike_indoor ? "indoor" : "outdoor") : "unset");
    if (next === "bike" && profile.default_bike_indoor && !getValues("trainer_platform")) {
      setValue("trainer_platform", profile.default_trainer_platform ?? "");
    }
    const title = getValues("title").trim();
    if (title === "" || title === defaultTitle(previous)) setValue("title", defaultTitle(next));
  }

  const durationSeconds = parseDuration(duration);
  const validDuration = durationSeconds != null && !Number.isNaN(durationSeconds) ? durationSeconds : null;
  const meters = distance && Number(distance) > 0 ? toMeters(Number(distance), unit) : null;
  const pace =
    type === "swim" && (unit === "yd" || unit === "m")
      ? formatSwimPace(swimPaceSecondsPer100(validDuration, meters, unit), unit)
      : type === "run" && (unit === "mi" || unit === "km")
        ? formatRunPace(runPaceSeconds(validDuration, meters, unit), unit)
        : type === "bike" && (unit === "mi" || unit === "km")
          ? formatSpeed(speedPerHour(validDuration, meters, unit), unit)
          : null;

  const onSubmit = handleSubmit((values) => {
    run(() => (editing ? updateActivity(editing.id, values) : createActivity(values)), {
      onSuccess: () => {
        try {
          window.localStorage.setItem(LAST_TYPE_KEY, values.activity_type);
        } catch {
          // ignore
        }
        onOpenChange(false);
      },
    }).then((result) => {
      if (!result.ok && result.fieldErrors) {
        for (const [name, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) setError(name as keyof ActivityFormValues, { message: messages[0] });
        }
      }
    });
  });

  const plannedHint =
    options.session && !editing
      ? `Planned: ${formatDurationRange(options.session.planned_duration_seconds, options.session.planned_duration_max_seconds)}`
      : undefined;

  const linkChoices = links.filter((s) => s.status !== "completed" || s.id === linkedId || s.id === editing?.planned_session_id);
  const showDistance = supportsDistance(type);
  const unitOptions = type === "swim" ? (["yd", "m"] as const) : (["mi", "km"] as const);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" aria-describedby="activity-form-description">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit workout" : options.session ? "Log planned workout" : "Log workout"}</DialogTitle>
          <DialogDescription id="activity-form-description">
            {options.session && !editing
              ? `Completing “${options.session.title}” from ${formatDate(options.session.session_date)}.`
              : "Only fill in what you actually recorded. Blank fields stay blank."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <DialogBody className="grid gap-5">
            <div role="radiogroup" aria-label="Activity type" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {ACTIVITY_TYPES.map((t) => {
                const Icon = DISCIPLINE_ICONS[t];
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => changeType(t)}
                    className={cn(
                      "flex h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition-colors",
                      active ? "border-transparent text-ink" : "border-line bg-surface text-muted-ink hover:bg-muted",
                    )}
                    style={
                      active
                        ? {
                            backgroundColor: `color-mix(in srgb, ${DISCIPLINES[t].colorVar} 16%, white)`,
                            boxShadow: `inset 0 0 0 1.5px ${DISCIPLINES[t].colorVar}`,
                          }
                        : undefined
                    }
                  >
                    <Icon className="size-[18px]" strokeWidth={1.8} style={active ? { color: `color-mix(in srgb, ${DISCIPLINES[t].colorVar} 75%, #202720)` } : undefined} />
                    {DISCIPLINES[t].label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
              <Field label="Title" htmlFor="af-title" error={errors.title?.message}>
                <Input {...fieldAria("af-title", errors.title?.message)} autoComplete="off" {...register("title")} />
              </Field>
              <Field label="Date" htmlFor="af-date" error={errors.activity_date?.message}>
                <Input type="date" {...fieldAria("af-date", errors.activity_date?.message)} {...register("activity_date")} />
              </Field>
            </div>

            <div className={cn("grid gap-4", showDistance && "sm:grid-cols-2")}>
              <Field
                label="Duration"
                htmlFor="af-duration"
                optional
                error={errors.duration?.message}
                hint={plannedHint ?? "Minutes, h:mm or 1h 30m"}
              >
                <Input
                  {...fieldAria("af-duration", errors.duration?.message, "hint")}
                  inputMode="text"
                  placeholder="45 or 1:30"
                  autoComplete="off"
                  {...register("duration")}
                />
              </Field>
              {showDistance ? (
                <Field label="Distance" htmlFor="af-distance" optional error={errors.distance?.message} hint={pace ? `Average ${pace}` : undefined}>
                  <div className="flex gap-2">
                    <Input
                      {...fieldAria("af-distance", errors.distance?.message, pace ? "hint" : undefined)}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder={type === "swim" ? "1000" : "0.0"}
                      {...register("distance")}
                    />
                    <NativeSelect aria-label="Distance unit" className="w-[5.25rem] shrink-0" {...register("distance_unit")}>
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </Field>
              ) : null}
            </div>

            {type === "swim" ? (
              <div className="grid gap-1.5">
                <span className="text-[13px] font-medium" id="af-swim-env">
                  Where
                </span>
                <Segmented
                  ariaLabel="Swim environment"
                  value={swimEnvironment}
                  onValueChange={(v) => setValue("swim_environment", v, { shouldDirty: true })}
                  options={[
                    { value: "pool", label: "Pool" },
                    { value: "open_water", label: "Open water" },
                  ]}
                  className="w-full sm:w-fit"
                />
              </div>
            ) : null}

            {type === "bike" || type === "run" || type === "other" ? (
              <div className="grid gap-1.5">
                <span className="text-[13px] font-medium">Setting</span>
                <Segmented
                  ariaLabel="Indoor or outdoor"
                  value={indoor}
                  onValueChange={(v) => setValue("indoor", v, { shouldDirty: true })}
                  options={[
                    { value: "indoor", label: type === "bike" ? "Indoor / trainer" : type === "run" ? "Indoor / treadmill" : "Indoor" },
                    { value: "outdoor", label: "Outdoor" },
                    { value: "unset", label: "Not set" },
                  ]}
                  className="w-full sm:w-fit"
                />
              </div>
            ) : null}

            {type === "bike" ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Avg power" htmlFor="af-power" optional error={errors.avg_power_watts?.message}>
                  <Input {...fieldAria("af-power", errors.avg_power_watts?.message)} inputMode="numeric" placeholder="W" {...register("avg_power_watts")} />
                </Field>
                <Field label="NP" htmlFor="af-np" optional error={errors.normalized_power_watts?.message}>
                  <Input {...fieldAria("af-np", errors.normalized_power_watts?.message)} inputMode="numeric" placeholder="W" {...register("normalized_power_watts")} />
                </Field>
                <Field label="Cadence" htmlFor="af-cadence" optional error={errors.avg_cadence_rpm?.message}>
                  <Input {...fieldAria("af-cadence", errors.avg_cadence_rpm?.message)} inputMode="numeric" placeholder="rpm" {...register("avg_cadence_rpm")} />
                </Field>
                <Field label="Platform" htmlFor="af-platform" optional error={errors.trainer_platform?.message}>
                  <Input {...fieldAria("af-platform", errors.trainer_platform?.message)} placeholder="Zwift" list="af-platforms" {...register("trainer_platform")} />
                  <datalist id="af-platforms">
                    <option value="Zwift" />
                    <option value="TrainerRoad" />
                    <option value="Rouvy" />
                  </datalist>
                </Field>
              </div>
            ) : null}

            {type === "run" ? (
              <label className="flex items-center justify-between gap-4 rounded-lg border border-line px-3.5 py-3">
                <span>
                  <span className="block text-[13px] font-medium">Run/walk</span>
                  <span className="block text-xs text-faint-ink">Intervals of running and walking</span>
                </span>
                <Switch
                  checked={isRunWalk}
                  onCheckedChange={(v) => setValue("is_run_walk", v, { shouldDirty: true })}
                  aria-label="Run/walk"
                />
              </label>
            ) : null}

            {type === "strength" ? (
              <Field label="Focus" htmlFor="af-focus" optional error={errors.strength_focus?.message}>
                <Input {...fieldAria("af-focus", errors.strength_focus?.message)} placeholder="Core, hips, upper body…" {...register("strength_focus")} />
              </Field>
            ) : null}

            {type === "recovery" ? (
              <Field label="Type of recovery" htmlFor="af-subtype" optional error={errors.recovery_subtype?.message} hint="Recovery is tracked, but never counted as training time.">
                <Input {...fieldAria("af-subtype", errors.recovery_subtype?.message, "hint")} placeholder="Sauna" list="af-subtypes" {...register("recovery_subtype")} />
                <datalist id="af-subtypes">
                  {RECOVERY_SUBTYPES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
            ) : null}

            <Field label="Notes" htmlFor="af-notes" optional error={errors.notes?.message}>
              <Textarea {...fieldAria("af-notes", errors.notes?.message)} rows={3} placeholder="How did it feel?" {...register("notes")} />
            </Field>

            <details className="group rounded-lg border border-line" open={Boolean(editing && (editing.rpe || editing.avg_heart_rate || editing.max_heart_rate || editing.start_time)) || undefined}>
              <summary className="flex list-none items-center justify-between px-3.5 py-3 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
                Effort, heart rate &amp; start time
                <ChevronDown className="size-4 text-muted-ink transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid grid-cols-2 gap-4 border-t border-line p-3.5 sm:grid-cols-4">
                <Field label="RPE" htmlFor="af-rpe" optional error={errors.rpe?.message} hint="1 easy – 10 max">
                  <Input {...fieldAria("af-rpe", errors.rpe?.message, "hint")} inputMode="numeric" placeholder="1–10" {...register("rpe")} />
                </Field>
                <Field label="Avg HR" htmlFor="af-hr" optional error={errors.avg_heart_rate?.message}>
                  <Input {...fieldAria("af-hr", errors.avg_heart_rate?.message)} inputMode="numeric" placeholder="bpm" {...register("avg_heart_rate")} />
                </Field>
                <Field label="Max HR" htmlFor="af-maxhr" optional error={errors.max_heart_rate?.message}>
                  <Input {...fieldAria("af-maxhr", errors.max_heart_rate?.message)} inputMode="numeric" placeholder="bpm" {...register("max_heart_rate")} />
                </Field>
                <Field label="Start time" htmlFor="af-start" optional error={errors.start_time?.message}>
                  <Input type="time" {...fieldAria("af-start", errors.start_time?.message)} {...register("start_time")} />
                </Field>
              </div>
            </details>

            <Field
              label="Counts toward planned session"
              htmlFor="af-link"
              optional
              error={errors.planned_session_id?.message}
              hint={linkChoices.length === 0 ? "No open planned sessions within three days of this date." : "Linking marks that session as completed."}
            >
              <NativeSelect {...fieldAria("af-link", errors.planned_session_id?.message, "hint")} {...register("planned_session_id")}>
                <option value="">Not linked — unplanned workout</option>
                {/* Keep the current link selectable while nearby sessions load. */}
                {linkedId && !linkChoices.some((s) => s.id === linkedId) ? (
                  <option value={linkedId}>{options.session?.id === linkedId ? options.session.title : "Current planned session"}</option>
                ) : null}
                {linkChoices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDate(s.session_date, "EEE MMM d")} · {s.title} ({DISCIPLINES[s.activity_type].label})
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {editing ? "Save changes" : "Save workout"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
