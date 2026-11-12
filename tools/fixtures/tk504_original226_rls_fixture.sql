-- TK504 #614 OFFLINE SYNTHETIC FIXTURE for tools/tk504_original226_auditor_rls_acceptance.ps1.
-- Runs ONLY inside a throwaway `postgres:17 --network none --rm` container. Not a migration.
-- Minimal Supabase-shaped stand-ins: auth.users, auth.uid(), auth.jwt() (transaction-local
-- request.jwt.claims), storage.buckets/objects OWNED by a synthetic supabase_storage_admin role,
-- and a storage.allow_only_operation(text) stub that is true ONLY for an exact operation match.
-- All UUIDs, names and rows are synthetic. No secrets, no tokens, no network.
\set ON_ERROR_STOP 1
begin;

-- Client roles: never superuser, never BYPASSRLS.
create role anon                   nologin nosuperuser nobypassrls noinherit;
create role authenticated          nologin nosuperuser nobypassrls noinherit;
-- Synthetic Storage table owner (production owner role name).
create role supabase_storage_admin nologin nosuperuser nobypassrls noinherit;
-- Stand-in for Supabase's normal (non-superuser, non-owner) migration role "postgres".
create role tk_postgres_nonsuper   nologin nosuperuser nobypassrls noinherit;

create schema auth;
grant usage on schema auth to anon, authenticated, supabase_storage_admin, tk_postgres_nonsuper;
create table auth.users (id uuid primary key);
-- Same semantics as Supabase GoTrue helpers: claims come from transaction-local settings.
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''),
                  nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;

create schema storage authorization supabase_storage_admin;
grant usage on schema storage to anon, authenticated, tk_postgres_nonsuper;
create table storage.buckets (
  id text primary key, name text not null, public boolean not null default false);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id),
  name text not null, owner uuid, metadata jsonb,
  unique (bucket_id, name));
-- SYNTHETIC STUB (not the vendor body): true only when the Storage API set exactly this operation.
-- NULL/empty/any other operation (list, info, sign, move, copy, upload, ...) => false.
create function storage.allow_only_operation(expected_operation text) returns boolean
  language sql stable as $$
  select expected_operation is not null
     and coalesce(current_setting('storage.operation', true), '') = expected_operation $$;
alter table    storage.buckets owner to supabase_storage_admin;
alter table    storage.objects owner to supabase_storage_admin;
alter function storage.allow_only_operation(text) owner to supabase_storage_admin;
alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
-- Supabase-like default table grants: access is decided by RLS, not by grants.
grant select on storage.buckets to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;

-- Synthetic users: dedicated auditor, normal user, separate approver.
insert into auth.users (id) values
  ('a0d17000-0000-4000-8000-000000000001'),
  ('b0b00000-0000-4000-8000-000000000002'),
  ('c0c00000-0000-4000-8000-000000000003');

-- All buckets private.
insert into storage.buckets (id, name, public) values
  ('exercise-media', 'exercise-media', false),
  ('exercise-posters', 'exercise-posters', false),
  ('avatars', 'avatars', false);

-- First two allowlisted objects of TK-000001/TK-000002 from the pinned manifest (literal sample),
-- plus decoys: wrong bucket, case variant, suffix, non-allowlisted, another user's avatar.
insert into storage.objects (bucket_id, name, owner) values
  ('exercise-media',   'movekit/v2/video/abdominals-stretch-variation-four.mp4', null),
  ('exercise-posters', 'movekit/v2/poster-optimized/abdominals-stretch-variation-four.webp', null),
  ('exercise-media',   'movekit/v2/video/abdominals-stretch-variation-one.mp4', null),
  ('exercise-posters', 'movekit/v2/poster-optimized/abdominals-stretch-variation-one.webp', null),
  ('exercise-media',   'movekit/v2/video/tk-fixture-not-allowlisted.mp4', null),
  ('exercise-media',   'Movekit/v2/video/abdominals-stretch-variation-four.mp4', null),
  ('exercise-media',   'movekit/v2/video/abdominals-stretch-variation-four.mp4.bak', null),
  ('exercise-posters', 'movekit/v2/video/abdominals-stretch-variation-four.mp4', null),
  ('avatars',          'movekit/v2/video/abdominals-stretch-variation-four.mp4', null),
  ('avatars',          'b0b00000-0000-4000-8000-000000000002/avatar.png',
                       'b0b00000-0000-4000-8000-000000000002');

-- Pre-existing synthetic normal-user grant (owner-created), must stay unaffected.
set local role supabase_storage_admin;
create policy tk_fixture_avatars_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());
reset role;

-- Harness-only result sink (no client grants).
create schema tk_harness;
revoke all on schema tk_harness from public;
create table tk_harness.results (
  seq serial primary key, name text not null, expected text not null, actual text);
commit;
