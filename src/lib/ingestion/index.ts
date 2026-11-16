/**
 * Activity ingestion boundary.
 *
 * v1 ships NO external integrations. This module defines the single path any
 * future importer (Strava, Zwift/FIT files, Garmin, Apple Health) must use:
 *
 *   provider payload ──adapter.toExternalActivity()──▶ ExternalActivity
 *        ──normalizeExternalActivity()──▶ activities row (origin = 'imported')
 *        ──deduplicateActivity()──▶ decide: update / possible manual duplicate / new
 *        ──upsertImportedActivity()──▶ database
 *
 * Manual activities never pass through here and never carry a provider id, so
 * connecting or disconnecting an integration cannot alter or delete them.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Activity, ActivityInsert, ActivityType } from "@/types";

export type IntegrationProvider = "strava" | "zwift" | "garmin" | "apple_health" | "fit_file";

/** Provider-agnostic shape every adapter must produce. All metrics optional. */
export type ExternalActivity = {
  provider: IntegrationProvider;
  /** Stable id of the activity at the provider. */
  externalId: string;
  type: ActivityType;
  title: string;
  /** Start instant (ISO 8601 with offset). */
  startedAt: string;
  /** IANA timezone used to derive the local calendar date. */
  timeZone: string;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  avgPowerWatts?: number | null;
  normalizedPowerWatts?: number | null;
  avgCadenceRpm?: number | null;
  isIndoor?: boolean | null;
  trainerPlatform?: string | null;
  swimEnvironment?: "pool" | "open_water" | null;
};

/** Contract a future provider integration implements. No adapters exist in v1. */
export interface ActivityProviderAdapter<Raw> {
  readonly provider: IntegrationProvider;
  toExternalActivity(raw: Raw, timeZone: string): ExternalActivity;
}

function localDateAndTime(iso: string, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

const positive = (n: number | null | undefined) => (n != null && n > 0 ? n : null);

/** Map an external activity onto the activities table. Missing metrics stay null. */
export function normalizeExternalActivity(ext: ExternalActivity, athleteId: string): ActivityInsert {
  if (!ext.externalId) throw new Error("External activities must have a provider id");
  if (Number.isNaN(new Date(ext.startedAt).getTime())) throw new Error("External activity has an invalid start time");
  const { date, time } = localDateAndTime(ext.startedAt, ext.timeZone);
  const distance = positive(ext.distanceMeters);
  return {
    athlete_id: athleteId,
    origin: "imported",
    external_provider: ext.provider,
    external_id: ext.externalId,
    activity_date: date,
    start_time: time,
    started_at: new Date(ext.startedAt).toISOString(),
    activity_type: ext.type,
    title: ext.title.trim().slice(0, 160) || "Imported activity",
    duration_seconds: positive(ext.durationSeconds) == null ? null : Math.round(ext.durationSeconds!),
    distance_meters: distance,
    distance_unit: distance == null ? null : ext.type === "swim" ? "m" : "km",
    avg_heart_rate: ext.avgHeartRate ?? null,
    max_heart_rate: ext.maxHeartRate ?? null,
    avg_power_watts: ext.type === "bike" ? (ext.avgPowerWatts ?? null) : null,
    normalized_power_watts: ext.type === "bike" ? (ext.normalizedPowerWatts ?? null) : null,
    avg_cadence_rpm: ext.type === "bike" ? (ext.avgCadenceRpm ?? null) : null,
    trainer_platform: ext.type === "bike" ? (ext.trainerPlatform ?? null) : null,
    is_indoor: ext.isIndoor ?? null,
    swim_environment: ext.type === "swim" ? (ext.swimEnvironment ?? null) : null,
  };
}

export type DedupCandidate = Pick<
  Activity,
  "id" | "activity_date" | "activity_type" | "duration_seconds" | "distance_meters" | "origin" | "external_provider" | "external_id"
>;

export type DedupDecision =
  /** Same provider + id already stored: update that row. */
  | { kind: "same-external"; existingId: string }
  /** A manual entry looks like the same workout: ask the athlete, never merge silently. */
  | { kind: "possible-manual-duplicate"; existingId: string }
  | { kind: "new" };

const within = (a: number, b: number, tolerance: number) => Math.abs(a - b) <= Math.max(a, b) * tolerance;

/**
 * Decide how an incoming activity relates to what is already stored.
 * A manual entry is only flagged when date and type match AND a recorded
 * duration or distance agrees within 10% — absent values are never treated as a match.
 */
export function deduplicateActivity(incoming: ActivityInsert, existing: DedupCandidate[]): DedupDecision {
  const exact = existing.find(
    (e) => e.external_provider != null && e.external_provider === incoming.external_provider && e.external_id === incoming.external_id,
  );
  if (exact) return { kind: "same-external", existingId: exact.id };

  const similar = existing.find((e) => {
    if (e.origin !== "manual") return false;
    if (e.activity_date !== incoming.activity_date || e.activity_type !== incoming.activity_type) return false;
    const durationMatch =
      e.duration_seconds != null && incoming.duration_seconds != null && within(e.duration_seconds, incoming.duration_seconds, 0.1);
    const distanceMatch =
      e.distance_meters != null && incoming.distance_meters != null && within(e.distance_meters, incoming.distance_meters, 0.1);
    return durationMatch || distanceMatch;
  });
  return similar ? { kind: "possible-manual-duplicate", existingId: similar.id } : { kind: "new" };
}

/**
 * Insert or update an imported activity, keyed on (athlete, provider, external id).
 * Re-importing the same provider activity updates it in place instead of duplicating it.
 */
export async function upsertImportedActivity(supabase: SupabaseClient<Database>, row: ActivityInsert) {
  if (row.origin !== "imported" || !row.external_provider || !row.external_id) {
    throw new Error("upsertImportedActivity only accepts imported activities with a provider id");
  }
  const { data, error } = await supabase
    .from("activities")
    .upsert(row, { onConflict: "athlete_id,external_provider,external_id" })
    .select("id")
    .single();
  if (error) throw new Error(`Import failed: ${error.message}`);
  return data.id;
}
