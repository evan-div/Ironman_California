-- PROJECT 140.6 — initial schema
-- Every athlete-owned row carries athlete_id -> auth.users(id) and is protected by
-- Row Level Security using auth.uid(). Nothing here inserts athlete data: the
-- owner's starter plan is applied per-athlete, on request, by the application.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Private beta allowlist (no RLS policies: unreachable through the API)
-- ---------------------------------------------------------------------------
create table public.allowed_emails (
  email extensions.citext primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

-- Supabase Auth "Before User Created" hook. Rejects sign-ups whose email is not
-- on the allowlist. Enable it under Authentication -> Hooks (see README).
create or replace function public.hook_restrict_signup_to_allowlist(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_email text := lower(event -> 'user' ->> 'email');
begin
  if signup_email is null or not exists (
    select 1 from public.allowed_emails a where a.email = signup_email::extensions.citext
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'PROJECT 140.6 is in private beta. This email has not been invited yet.'
      )
    );
  end if;
  return '{}'::jsonb;
end;
$$;

revoke execute on function public.hook_restrict_signup_to_allowlist(jsonb) from public, anon, authenticated;
grant execute on function public.hook_restrict_signup_to_allowlist(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  preferred_name text check (preferred_name is null or char_length(preferred_name) <= 80),
  timezone text not null default 'America/Denver',
  distance_unit text not null default 'mi' check (distance_unit in ('mi', 'km')),
  swim_unit text not null default 'yd' check (swim_unit in ('yd', 'm')),
  weekly_goal_hours numeric(4, 1) check (weekly_goal_hours is null or (weekly_goal_hours >= 0 and weekly_goal_hours <= 40)),
  default_activity_type text not null default 'swim'
    check (default_activity_type in ('swim', 'bike', 'run', 'strength', 'recovery', 'other')),
  default_bike_indoor boolean not null default true,
  default_trainer_platform text,
  default_swim_environment text not null default 'pool' check (default_swim_environment in ('pool', 'open_water')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create an empty profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- goal_events
-- ---------------------------------------------------------------------------
create table public.goal_events (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  event_date date not null,
  location text,
  goal_description text,
  target_finish_seconds integer check (target_finish_seconds is null or target_finish_seconds > 0),
  target_swim_seconds integer check (target_swim_seconds is null or target_swim_seconds > 0),
  target_bike_seconds integer check (target_bike_seconds is null or target_bike_seconds > 0),
  target_run_seconds integer check (target_run_seconds is null or target_run_seconds > 0),
  target_transition_seconds integer check (target_transition_seconds is null or target_transition_seconds >= 0),
  is_primary boolean not null default false,
  seed_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_events_seed_unique unique (athlete_id, seed_key)
);
create unique index goal_events_one_primary_per_athlete on public.goal_events (athlete_id) where is_primary;
create index goal_events_athlete_date_idx on public.goal_events (athlete_id, event_date);
create trigger goal_events_set_updated_at before update on public.goal_events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- training_phases
-- ---------------------------------------------------------------------------
create table public.training_phases (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  start_date date not null,
  end_date date not null,
  target_hours_min numeric(4, 1) check (target_hours_min is null or target_hours_min >= 0),
  target_hours_max numeric(4, 1) check (target_hours_max is null or target_hours_max >= 0),
  focus text,
  sort_order integer not null default 0,
  seed_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_phases_dates_check check (end_date >= start_date),
  constraint training_phases_hours_check check (
    target_hours_min is null or target_hours_max is null or target_hours_max >= target_hours_min
  ),
  constraint training_phases_seed_unique unique (athlete_id, seed_key)
);
create index training_phases_athlete_dates_idx on public.training_phases (athlete_id, start_date, end_date);
create trigger training_phases_set_updated_at before update on public.training_phases
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- planned_sessions
-- ---------------------------------------------------------------------------
create table public.planned_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_date date not null,
  activity_type text not null
    check (activity_type in ('swim', 'bike', 'run', 'strength', 'recovery', 'other', 'rest')),
  title text not null check (char_length(title) between 1 and 160),
  description text,
  -- Planned duration. When *_max is set the plan is a range (e.g. 30–35 min).
  planned_duration_seconds integer check (planned_duration_seconds is null or planned_duration_seconds > 0),
  planned_duration_max_seconds integer,
  planned_distance_meters numeric(10, 2) check (planned_distance_meters is null or planned_distance_meters > 0),
  planned_distance_unit text check (planned_distance_unit is null or planned_distance_unit in ('yd', 'm', 'mi', 'km')),
  is_indoor boolean,
  -- 'completed' is derived: it is set if and only if at least one activity is linked.
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped')),
  -- Set the first time a session is moved, so reschedules stay visible.
  original_date date,
  rescheduled_at timestamptz,
  -- Optional structured prescription (e.g. for a future Zwift .zwo export).
  structured_workout jsonb check (structured_workout is null or jsonb_typeof(structured_workout) = 'object'),
  seed_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planned_sessions_duration_range_check check (
    planned_duration_max_seconds is null
    or (planned_duration_seconds is not null and planned_duration_max_seconds >= planned_duration_seconds)
  ),
  constraint planned_sessions_seed_unique unique (athlete_id, seed_key),
  -- Target for the composite ownership FK from activities.
  constraint planned_sessions_id_athlete_unique unique (id, athlete_id)
);
create index planned_sessions_athlete_date_idx on public.planned_sessions (athlete_id, session_date);
create trigger planned_sessions_set_updated_at before update on public.planned_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- activities (typed optional metric columns instead of a separate metrics table)
-- ---------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- When the activity happened, as a calendar date in the athlete's timezone.
  activity_date date not null,
  -- Optional local wall-clock start, plus the same instant as a timezone-aware timestamp.
  start_time time,
  started_at timestamptz,
  activity_type text not null
    check (activity_type in ('swim', 'bike', 'run', 'strength', 'recovery', 'other')),
  title text not null check (char_length(title) between 1 and 160),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  distance_meters numeric(10, 2) check (distance_meters is null or distance_meters > 0),
  -- The unit the athlete entered the distance in, for faithful display.
  distance_unit text check (distance_unit is null or distance_unit in ('yd', 'm', 'mi', 'km')),
  rpe smallint check (rpe is null or rpe between 1 and 10),
  avg_heart_rate smallint check (avg_heart_rate is null or avg_heart_rate between 20 and 260),
  max_heart_rate smallint check (max_heart_rate is null or max_heart_rate between 20 and 260),
  notes text,
  is_indoor boolean,
  -- Sport-specific optional metrics
  swim_environment text check (swim_environment is null or swim_environment in ('pool', 'open_water')),
  avg_power_watts smallint check (avg_power_watts is null or avg_power_watts between 0 and 2500),
  normalized_power_watts smallint check (normalized_power_watts is null or normalized_power_watts between 0 and 2500),
  avg_cadence_rpm smallint check (avg_cadence_rpm is null or avg_cadence_rpm between 0 and 300),
  trainer_platform text,
  is_run_walk boolean,
  strength_focus text,
  recovery_subtype text,
  -- Plan linkage and provenance
  planned_session_id uuid,
  origin text not null default 'manual' check (origin in ('manual', 'imported')),
  external_provider text,
  external_id text,
  seed_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_external_pair_check check ((external_provider is null) = (external_id is null)),
  constraint activities_manual_has_no_provider_check check (origin = 'imported' or external_provider is null),
  constraint activities_external_unique unique (athlete_id, external_provider, external_id),
  constraint activities_seed_unique unique (athlete_id, seed_key),
  -- A linked session must belong to the same athlete. Deleting the session only
  -- clears the link: the completed activity is never deleted with its plan.
  constraint activities_planned_session_fk
    foreign key (planned_session_id, athlete_id)
    references public.planned_sessions (id, athlete_id)
    on delete set null (planned_session_id)
);
create index activities_athlete_date_idx on public.activities (athlete_id, activity_date desc);
create index activities_athlete_type_date_idx on public.activities (athlete_id, activity_type, activity_date desc);
create index activities_planned_session_idx on public.activities (planned_session_id) where planned_session_id is not null;
create trigger activities_set_updated_at before update on public.activities
  for each row execute function public.set_updated_at();

-- Keep planned_sessions.status consistent with activity links.
-- These two functions are SECURITY DEFINER so they also work when rows are
-- removed by a cascade from auth.users (which runs as the auth service role).
-- They only ever touch the session referenced by the row being changed, and the
-- composite foreign key guarantees that session belongs to the same athlete.
create or replace function public.planned_sessions_enforce_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.activities a where a.planned_session_id = new.id) then
    new.status := 'completed';
  elsif new.status = 'completed' then
    new.status := 'planned';
  end if;
  return new;
end;
$$;

create trigger planned_sessions_enforce_status before update on public.planned_sessions
  for each row execute function public.planned_sessions_enforce_status();

create or replace function public.planned_sessions_enforce_status_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    new.status := 'planned';
  end if;
  return new;
end;
$$;

create trigger planned_sessions_enforce_status_on_insert before insert on public.planned_sessions
  for each row execute function public.planned_sessions_enforce_status_on_insert();

create or replace function public.activities_sync_planned_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Touching the session row re-runs planned_sessions_enforce_status, which
  -- derives the right status from the links that exist after this statement.
  if tg_op in ('UPDATE', 'DELETE') and old.planned_session_id is not null
     and (tg_op = 'DELETE' or old.planned_session_id is distinct from new.planned_session_id) then
    update public.planned_sessions set updated_at = now() where id = old.planned_session_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.planned_session_id is not null
     and (tg_op = 'INSERT' or old.planned_session_id is distinct from new.planned_session_id) then
    update public.planned_sessions set updated_at = now() where id = new.planned_session_id;
  end if;
  return null;
end;
$$;

create trigger activities_sync_planned_session
  after insert or delete or update of planned_session_id on public.activities
  for each row execute function public.activities_sync_planned_session();

revoke execute on function public.planned_sessions_enforce_status() from public, anon, authenticated;
revoke execute on function public.activities_sync_planned_session() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  target_date date not null,
  completed_at timestamptz,
  seed_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint milestones_seed_unique unique (athlete_id, seed_key)
);
create index milestones_athlete_date_idx on public.milestones (athlete_id, target_date);
create trigger milestones_set_updated_at before update on public.milestones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- integrations (connection state only; v1 ships no OAuth and stores no tokens)
-- ---------------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider text not null check (provider in ('strava', 'zwift', 'garmin', 'apple_health', 'fit_file')),
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  external_athlete_id text,
  last_synced_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integrations_provider_unique unique (athlete_id, provider)
);
create trigger integrations_set_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- athlete_seeds: one row per (athlete, seed version) makes bootstrap idempotent
-- ---------------------------------------------------------------------------
create table public.athlete_seeds (
  athlete_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seed_key text not null,
  applied_at timestamptz not null default now(),
  primary key (athlete_id, seed_key)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.goal_events enable row level security;
alter table public.training_phases enable row level security;
alter table public.planned_sessions enable row level security;
alter table public.activities enable row level security;
alter table public.milestones enable row level security;
alter table public.integrations enable row level security;
alter table public.athlete_seeds enable row level security;

-- profiles: the row id is the user id. Rows are created by the auth trigger and
-- removed by cascading from auth.users.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using (id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'goal_events', 'training_phases', 'planned_sessions', 'activities', 'milestones', 'integrations'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (athlete_id = (select auth.uid()))',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (athlete_id = (select auth.uid()))',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()))',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (athlete_id = (select auth.uid()))',
      t || '_delete_own', t);
  end loop;
end;
$$;

create policy "athlete_seeds_select_own" on public.athlete_seeds
  for select to authenticated using (athlete_id = (select auth.uid()));
create policy "athlete_seeds_insert_own" on public.athlete_seeds
  for insert to authenticated with check (athlete_id = (select auth.uid()));

-- The anon role never needs table access.
revoke all on public.profiles, public.goal_events, public.training_phases, public.planned_sessions,
  public.activities, public.milestones, public.integrations, public.athlete_seeds from anon;
