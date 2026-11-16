# PROJECT 140.6 — The Road to California

A personal training journal and coach-style planning calendar, built for one athlete preparing for **IRONMAN California (October 24, 2027)**, with a data model that already supports more athletes.

First phase: **Operation Get Off the Couch**.

- Next.js 16 (App Router, TypeScript strict) · Tailwind CSS 4 · shadcn-style components on Radix
- Supabase Postgres + Auth (`@supabase/ssr`), Row Level Security on every table
- Recharts, date-fns, dnd-kit, Zod, React Hook Form
- Vitest (unit + database integration) and Playwright (end-to-end)

---

## What's in the app

| Route | What it does |
| --- | --- |
| `/` | Landing page (signed-in users go straight to the dashboard) |
| `/login` | Email + password sign-in, invite-only sign-up, email sign-in link |
| `/onboarding` | Name, timezone, units, weekly goal; owner can opt in to the starter plan |
| `/dashboard` | Race countdown, current phase, today's plan and completed work, weekly volume, recent workouts |
| `/calendar` | Week and month views; add, edit, drag-to-reschedule, skip, delete, and complete planned sessions |
| `/activities`, `/activities/[id]` | Training log with search, filters and sorting; detail, edit, delete, link/unlink to plan |
| `/progress` | Weekly/monthly volume, per-discipline charts, planned vs completed, rolling average, adherence |
| `/roadmap` | Editable training phases and milestones |
| `/settings` | Profile, units, goal race, workout defaults, password, sign out |

Principles the code enforces:

- **No invented numbers.** A missing duration or distance stays `null`. Pace appears only when both exist. Totals say when an activity added no time.
- **Recovery never counts as training time.** Strength counts toward training time and is labelled wherever it does.
- **Calendar dates are plain local dates** (`yyyy-MM-dd`) in the athlete's timezone. They are never round-tripped through UTC.
- **Completed history is safe.** Editing, moving or deleting a planned session never changes or deletes a logged workout.
- **"Completed" is derived.** A planned session is completed if and only if a logged activity is linked to it (database triggers).

## Repository layout

```
src/app/                  routes, server actions (src/app/actions), auth callback
src/components/           ui/ (primitives), dashboard/, calendar/, activities/, charts/, roadmap/, settings/, auth/, layout/
src/lib/training/         pure calculations: units, durations, pace, dates, totals, adherence, countdown, phases, seed data
src/lib/validations/      Zod schemas + form <-> row converters (shared by client and server)
src/lib/data/             queries, auth helpers, idempotent owner seed
src/lib/ingestion/        boundary for future imports (normalize / deduplicate / upsert)
src/lib/supabase/         browser, server and proxy clients
src/types/                generated database types + domain types
supabase/migrations/      schema, RLS policies, triggers, allowlist hook
tests/unit|integration|e2e
```

---

## Local setup

Requirements: Node 20.9+ (22 recommended), Docker (for the local Supabase stack).

```bash
npm install
```

```bash
npx supabase start
```

`supabase start` applies `supabase/migrations` and `supabase/seed.sql` (the seed only allowlists two local test emails — it contains no athlete data). It prints the local API URL and keys.

```bash
cp .env.example .env.local
```

Fill `.env.local` with the values from `npx supabase status`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Publishable key from supabase status>
OWNER_EMAIL=owner@project1406.test
```

```bash
npm run dev
```

Open http://localhost:3000, choose **Create account**, and sign up as `owner@project1406.test` (allowlisted by the local seed; email confirmation is off locally). Onboarding offers the starter plan because the email matches `OWNER_EMAIL`.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` · `npm run typecheck` | ESLint · `tsc --noEmit` |
| `npm test` | Unit tests (pure calculations, validation, seed facts) |
| `npm run test:integration` | Database tests against **local** Supabase: RLS, seed idempotency, triggers, allowlist |
| `npm run test:e2e` | Playwright journey against local Supabase (starts its own dev server on port 3100) |
| `npm run db:reset` | Recreate the local database from migrations |
| `npm run db:types` | Regenerate `src/types/database.ts` after a schema change |

The integration and e2e suites read credentials from `supabase status` and **refuse to run against a non-local URL**, because they create and delete users.

---

## Supabase: production setup

1. **Create a project** at supabase.com.
2. **Apply the migrations:**

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```

   ```bash
   npx supabase db push
   ```

   Do **not** run `supabase/seed.sql` against production.
3. **Invite yourself** (SQL editor):

   ```sql
   insert into public.allowed_emails (email, note) values ('you@example.com', 'owner');
   ```

### Auth configuration (dashboard → Authentication)

- **Sign In / Providers → Email:** enabled. Keep "Confirm email" on for production.
- **URL Configuration → Site URL:** your production origin, e.g. `https://your-domain.com`.
- **URL Configuration → Redirect URLs:** add `https://your-domain.com/**` (and `http://localhost:3000/**` for local work against the hosted project; add your Vercel preview pattern if you use previews).
- **Hooks → Before User Created:** enable, type **Postgres**, schema `public`, function `hook_restrict_signup_to_allowlist`. This is the private-beta gate: sign-ups from emails not in `public.allowed_emails` are rejected by Supabase itself, whatever client is used.
- **Emails / SMTP:** the built-in mailer is rate-limited and meant for testing. Configure custom SMTP before relying on confirmation or sign-in-link emails.

**Alternative beta gate (simplest):** create your user under Authentication → Users → Add user, then turn off "Allow new users to sign up". The app shows a clear message when sign-ups are closed. You can use both.

Auth emails land on `/auth/confirm`, which supports the default templates (`?code=`) and `token_hash` templates. The redirect origin comes from `NEXT_PUBLIC_SITE_URL`.

### The starter plan (owner data)

The IRONMAN California plan is **not** in any migration. It lives in `src/lib/training/seed-data.ts` and is applied by `applyOwnerSeed` only when the signed-in user whose email equals `OWNER_EMAIL` asks for it (onboarding switch, or Settings → "Load starter plan"). It is idempotent in two ways: `athlete_seeds (athlete_id, seed_key)` records that it ran, and every seeded row has a per-athlete unique `seed_key`. Re-running never duplicates rows and never restores something you deleted. Other athletes are never offered it and never receive it.

It contains exactly: the goal event; seven phases; five provisional milestones; week one (Nov 16–22, 2026); the Tuesday/Saturday bike progression through the week of Dec 28; and the two real activities from Nov 16 (a 1,000 yd swim with no duration, and a 12-minute sauna).

---

## Deploying to Vercel

1. Push this repository to GitHub and **import it in Vercel** (framework preset: Next.js; no build overrides needed).
2. Add the environment variables below for Production (and Preview if used).
3. Deploy, then set Supabase **Site URL** and **Redirect URLs** to the deployed domain (see above).
4. Sign up with your allowlisted email, complete onboarding, and load the starter plan.

### Environment variable checklist

| Variable | Required | Exposed to browser | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | yes | `sb_publishable_…` key |
| `NEXT_PUBLIC_SITE_URL` | production | yes | e.g. `https://your-domain.com`; used for auth email links |
| `OWNER_EMAIL` | for the starter plan | **no** | Email of the account allowed to load the starter plan |

No secret or service-role key is used by the app at all. Changing a `NEXT_PUBLIC_*` value requires a redeploy.

---

## Security notes

- **RLS everywhere.** Every athlete-owned table has SELECT/INSERT/UPDATE/DELETE policies on `athlete_id = auth.uid()`. `allowed_emails` has RLS enabled with no policies, so it is unreachable through the API.
- **Server-side validation.** Every write goes through a server action that re-validates with Zod; the database adds check constraints, a composite foreign key that stops linking to another athlete's session, and status triggers.
- **No elevated credentials in the app.** Only the publishable key is used; a user's own session decides what they can touch. The secret key appears only in local test helpers, read at runtime from `supabase status`.
- **The proxy (`src/proxy.ts`) is a convenience**, not the security boundary: it refreshes the session and redirects signed-out visitors. Pages re-check the user and Postgres enforces access.
- The schema stores **no integration tokens**. When OAuth integrations are added, keep tokens in Supabase Vault or a server-only table — never in `integrations.settings`.
- Next.js dev mode logs server-action arguments to the terminal; this does not happen in production builds.
- Security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.ts`. A Content-Security-Policy is not configured yet.

## Future integrations

`src/lib/ingestion/index.ts` is the single path for imported activities:

- `ActivityProviderAdapter` — interface a provider (Strava, Zwift/FIT, Garmin, Apple Health) implements
- `normalizeExternalActivity()` — maps a provider-agnostic activity onto the `activities` table (`origin = 'imported'`)
- `deduplicateActivity()` — exact provider-id match, or a flagged *possible* manual duplicate (never auto-merged)
- `upsertImportedActivity()` — upsert on the unique key `(athlete_id, external_provider, external_id)`

These are real and tested, but nothing calls them from the UI: v1 ships no OAuth, no sync, and no adapters. Planned bike sessions store an optional `structured_workout` JSON (warm-up / steady / cool-down, RPE-guided, FTP targets optional) so a Zwift `.zwo` export can be added later.

## Known limitations

- shadcn/ui components were written by hand in shadcn's conventions (`components.json` is present) because the shadcn registry was unreachable from the build environment. `npx shadcn add <component>` works normally from a regular network.
- The discipline colours come from the brand palette and are fairly close in hue for some colour-vision deficiencies (bike vs run in particular). Charts therefore always pair colour with labels, legends and a "View as table" option, and calendar chips pair it with an icon and title.
- The app is installable (manifest + icons) but has no service worker, so there is no offline mode.
- Activity search returns the first 200 matches; there is no pagination yet.
- Drag-and-drop rescheduling is pointer-based (desktop). Keyboard and touch users reschedule from the session dialog ("Move to another day", −1 / +1 day).

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Login page says Supabase isn't configured | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` missing. Set them and restart (redeploy on Vercel). |
| "…in private beta and this email hasn't been invited" | Add the email to `public.allowed_emails`. |
| Sign-up says "check your email" but nothing arrives | Configure SMTP in Supabase, or check the built-in mailer's rate limit. |
| Email link opens `localhost` or shows "link has expired" | Set `NEXT_PUBLIC_SITE_URL`, Supabase **Site URL**, and add the domain to **Redirect URLs**. Links are single-use. |
| Starter plan isn't offered | `OWNER_EMAIL` must exactly match the signed-in email (and be set in Vercel). |
| "Today" or the countdown is a day off | Check Settings → Timezone. |
| `permission denied` / empty lists after a schema change | Run `npx supabase db push` (or `npm run db:reset` locally) so policies and grants exist. |
| Tests fail with "Local Supabase is not running" | `npx supabase start`. |
| Types out of date after editing a migration | `npm run db:reset` then `npm run db:types`. |
