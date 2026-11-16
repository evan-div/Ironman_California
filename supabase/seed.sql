-- Local development only (`supabase db reset`). Never contains athlete data.
-- Allowlist the addresses used for local sign-up and the automated tests.
insert into public.allowed_emails (email, note) values
  ('owner@project1406.test', 'local owner'),
  ('athlete-b@project1406.test', 'local second athlete')
on conflict (email) do nothing;
