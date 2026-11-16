import { z } from "zod";
import { ACTIVITY_TYPES } from "@/types";
import { isValidTimeZone } from "@/lib/training/dates";
import { parseDuration } from "@/lib/training/duration";
import { dateString, optionalNumberString } from "./common";

const raceClock = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => {
      if (v === "") return true;
      if (!/^\d+:[0-5]\d(:[0-5]\d)?$/.test(v) && !/h|m/.test(v)) return false;
      const p = parseDuration(v);
      return p != null && !Number.isNaN(p) && p > 0;
    }, `${label}: use h:mm, e.g. 13:44`);

export const profileFormSchema = z.object({
  preferred_name: z.string().trim().min(1, "Tell us what to call you").max(80),
  timezone: z.string().refine(isValidTimeZone, "Choose a valid timezone"),
  distance_unit: z.enum(["mi", "km"]),
  swim_unit: z.enum(["yd", "m"]),
  weekly_goal_hours: optionalNumberString({ min: 0, max: 40, label: "Weekly goal" }),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const preferencesFormSchema = z.object({
  default_activity_type: z.enum(ACTIVITY_TYPES),
  default_bike_indoor: z.boolean(),
  default_trainer_platform: z.string().trim().max(60),
  default_swim_environment: z.enum(["pool", "open_water"]),
});
export type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

export const goalEventFormSchema = z.object({
  name: z.string().trim().min(1, "Name the event").max(120),
  event_date: dateString,
  location: z.string().trim().max(120),
  goal_description: z.string().trim().max(300),
  target_finish: raceClock("Target finish"),
  target_swim: raceClock("Swim"),
  target_bike: raceClock("Bike"),
  target_run: raceClock("Run"),
  target_transition: raceClock("Transitions"),
});
export type GoalEventFormValues = z.infer<typeof goalEventFormSchema>;

export const onboardingFormSchema = profileFormSchema.extend({
  event_name: z.string().trim().max(120),
  event_date: z.union([dateString, z.literal("")]),
  load_starter_plan: z.boolean(),
});
export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export const phaseFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name the phase").max(120),
    start_date: dateString,
    end_date: dateString,
    target_hours_min: optionalNumberString({ min: 0, max: 40, label: "Minimum hours" }),
    target_hours_max: optionalNumberString({ min: 0, max: 40, label: "Maximum hours" }),
    focus: z.string().trim().max(500),
  })
  .superRefine((v, ctx) => {
    if (v.end_date < v.start_date) ctx.addIssue({ code: "custom", path: ["end_date"], message: "The end date must be on or after the start" });
    if (v.target_hours_min !== "" && v.target_hours_max !== "" && Number(v.target_hours_max) < Number(v.target_hours_min)) {
      ctx.addIssue({ code: "custom", path: ["target_hours_max"], message: "Maximum must be at least the minimum" });
    }
  });
export type PhaseFormValues = z.infer<typeof phaseFormSchema>;

export const milestoneFormSchema = z.object({
  title: z.string().trim().min(1, "Give the milestone a title").max(160),
  description: z.string().trim().max(1000),
  target_date: dateString,
});
export type MilestoneFormValues = z.infer<typeof milestoneFormSchema>;

export const credentialsSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});
export const emailSchema = z.object({ email: z.email("Enter a valid email address").max(254) });
