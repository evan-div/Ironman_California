"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { PLAN_TYPES, type PlannedSession, type PlanType, type Profile } from "@/types";
import { createSession, updateSession } from "@/app/actions/sessions";
import { defaultPlanTitle, emptySessionForm, sessionFormSchema, sessionToForm, type SessionFormValues } from "@/lib/validations/session";
import { DISCIPLINES, defaultDistanceUnit, supportsDistance } from "@/lib/training/disciplines";
import { useAction } from "@/hooks/use-action";
import { DISCIPLINE_ICONS } from "@/components/discipline";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, fieldAria } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SessionFormDialog({
  open,
  onOpenChange,
  session,
  date,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing session to edit; omit to plan a new one. */
  session?: PlannedSession | null;
  date: string;
  profile: Profile;
}) {
  const { pending, run } = useAction();
  const { register, handleSubmit, setValue, getValues, setError, control, formState } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: session ? sessionToForm(session, profile) : { ...emptySessionForm(profile, date), title: defaultPlanTitle("bike") },
  });
  const errors = formState.errors;
  const [type, structure] = useWatch({ control, name: ["activity_type", "structure"] });

  function changeType(next: PlanType) {
    const previous = getValues("activity_type");
    if (next === previous) return;
    setValue("activity_type", next, { shouldDirty: true });
    setValue("distance_unit", defaultDistanceUnit(next, profile));
    if (!supportsDistance(next)) setValue("distance", "");
    setValue("indoor", next === "bike" ? (profile.default_bike_indoor ? "indoor" : "outdoor") : "unset");
    if (next !== "bike") setValue("structure", "none");
    const title = getValues("title").trim();
    if (title === "" || title === defaultPlanTitle(previous)) setValue("title", defaultPlanTitle(next));
  }

  const onSubmit = handleSubmit((values) => {
    run(() => (session ? updateSession(session.id, values) : createSession(values)), { onSuccess: () => onOpenChange(false) }).then((r) => {
      if (!r.ok && r.fieldErrors) {
        for (const [name, messages] of Object.entries(r.fieldErrors)) {
          if (messages?.[0]) setError(name as keyof SessionFormValues, { message: messages[0] });
        }
      }
    });
  });

  const isRest = type === "rest";
  const unitOptions = type === "swim" ? (["yd", "m"] as const) : (["mi", "km"] as const);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{session ? "Edit planned session" : "Plan a session"}</DialogTitle>
          <DialogDescription>
            {session?.status === "completed"
              ? "This session has a logged workout. Editing the plan never changes what you recorded."
              : "Plans are provisional. Change them whenever you need to."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <DialogBody className="grid gap-5">
            <div role="radiogroup" aria-label="Session type" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {PLAN_TYPES.map((t) => {
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
                      "flex h-16 flex-col items-center justify-center gap-1.5 rounded-xl border text-[11px] font-medium transition-colors",
                      active ? "border-transparent text-ink" : "border-line bg-surface text-muted-ink hover:bg-muted",
                    )}
                    style={active ? { backgroundColor: `color-mix(in srgb, ${DISCIPLINES[t].colorVar} 16%, white)`, boxShadow: `inset 0 0 0 1.5px ${DISCIPLINES[t].colorVar}` } : undefined}
                  >
                    <Icon className="size-4" strokeWidth={1.8} />
                    {DISCIPLINES[t].label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
              <Field label="Title" htmlFor="sf-title" error={errors.title?.message}>
                <Input {...fieldAria("sf-title", errors.title?.message)} autoComplete="off" {...register("title")} />
              </Field>
              <Field label="Date" htmlFor="sf-date" error={errors.session_date?.message}>
                <Input type="date" {...fieldAria("sf-date", errors.session_date?.message)} {...register("session_date")} />
              </Field>
            </div>

            {!isRest ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Duration" htmlFor="sf-duration" optional error={errors.duration?.message} hint="Minutes, h:mm or 1h 30m">
                  <Input {...fieldAria("sf-duration", errors.duration?.message, "hint")} placeholder="45" autoComplete="off" {...register("duration")} />
                </Field>
                <Field label="Up to" htmlFor="sf-duration-max" optional error={errors.duration_max?.message} hint="For a range, e.g. 30–35 min">
                  <Input {...fieldAria("sf-duration-max", errors.duration_max?.message, "hint")} placeholder="—" autoComplete="off" {...register("duration_max")} />
                </Field>
              </div>
            ) : null}

            {supportsDistance(type) ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Distance" htmlFor="sf-distance" optional error={errors.distance?.message}>
                  <div className="flex gap-2">
                    <Input {...fieldAria("sf-distance", errors.distance?.message)} inputMode="decimal" autoComplete="off" {...register("distance")} />
                    <NativeSelect aria-label="Distance unit" className="w-[5.25rem] shrink-0" {...register("distance_unit")}>
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </Field>
                {type !== "swim" ? (
                  <Field label="Setting" htmlFor="sf-indoor" optional>
                    <NativeSelect id="sf-indoor" {...register("indoor")}>
                      <option value="unset">Not set</option>
                      <option value="indoor">{type === "bike" ? "Indoor / trainer" : "Indoor"}</option>
                      <option value="outdoor">Outdoor</option>
                    </NativeSelect>
                  </Field>
                ) : null}
              </div>
            ) : null}

            {type === "bike" ? (
              <Field
                label="Workout structure"
                htmlFor="sf-structure"
                optional
                error={errors.structure?.message}
                hint="Templates use a 10 min warm-up, one easy block and a 5 min cool-down, guided by feel. No FTP targets are assumed."
              >
                <NativeSelect {...fieldAria("sf-structure", errors.structure?.message, "hint")} {...register("structure")}>
                  <option value="none">No structure</option>
                  {session?.structured_workout ? <option value="keep">Keep current structure</option> : null}
                  <option value="easy_aerobic">Easy aerobic (rebuild from duration)</option>
                  <option value="easy_endurance">Easy endurance (rebuild from duration)</option>
                </NativeSelect>
                {structure === "keep" ? <p className="text-xs text-faint-ink">If you change the duration, pick a template to rebuild the steps.</p> : null}
              </Field>
            ) : null}

            <Field label={isRest ? "Note" : "Description"} htmlFor="sf-description" optional error={errors.description?.message}>
              <Textarea {...fieldAria("sf-description", errors.description?.message)} rows={3} placeholder={isRest ? "" : "Intensity, intervals, what to focus on…"} {...register("description")} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {session ? "Save changes" : "Add to plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
