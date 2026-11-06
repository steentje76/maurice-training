-- TK #504 / #603 — TYPED MOVeKIT CATALOG -> SESSION FK CONTRACT
-- STAGED ONLY. DO NOT APPLY TO LIVE SUPABASE WITHOUT EXPLICIT OWNER APPROVAL.
--
-- Preconditions before application: reviewed 582-entry private provider manifest,
-- snapshot/rollback, independent RLS audit, release decision, and actual two-user
-- acceptance. NO catalog exercises or entitlement grants are inserted here.
-- Existing personal TK-shaped IDs and all historical sessions remain unchanged.

-- The provider-binding registry is admin-owned. There is no client-facing grant.
-- Exact FK alias cannot be substituted with an unrelated personal exercise row.
create table if not exists public.movekit_catalog_fk_bindings (
  catalog_id text primary key
    constraint tk504_catalog_id_format check (
      catalog_id ~ '^TK-[0-9]{6}$' and
      substring(catalog_id from 4)::integer between 1 and 582
    ),
  exercise_id text not null unique references public.exercises(id)
    on update restrict on delete restrict,
  provider_id text not null unique
    constraint tk504_provider_identity_check check (
      length(trim(provider_id)) between 1 and 256
    ),
  source_provider text not null default 'movekit'
    constraint tk504_source_provider_check check (source_provider = 'movekit'),
  active boolean not null default false,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tk504_exact_reserved_alias check (
    exercise_id = 'TKC-' || substring(catalog_id from 4)
  ),
  constraint tk504_active_requires_review check (
    not active or reviewed_at is not null
  )
);
comment on table public.movekit_catalog_fk_bindings is
  'TK504 server-managed exact global FK binding, separate from media entitlements. Default inactive; no client read or writes.';
alter table public.movekit_catalog_fk_bindings enable row level security;
revoke all on table public.movekit_catalog_fk_bindings
  from public, anon, authenticated, service_role;
-- The scoped server broker can verify a binding, but cannot create,
-- alter, enable, or remove one. No RLS policy for browser roles.
grant select on table public.movekit_catalog_fk_bindings to service_role;

-- Native RLS on public.exercises currently allows personal INSERT and has
-- privileged global UPDATE/DELETE. RLS policy edits risk unrelated users,
-- so guard ONLY the new reserved typed FK namespace via a narrow trigger.
-- Both current_user AND auth.uid() are checked: even a SECURITY DEFINER
-- function owned by postgres must not allow a logged-in client to mutate it.
create or replace function public.tk504_protect_reserved_catalog_fk()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog
as $tk504$
declare
  target_id text;
begin
  target_id := case when TG_OP='DELETE' then OLD.id else NEW.id end;
  if (target_id ~ '^TKC-[0-9]{6}$'
       or (TG_OP='UPDATE' and OLD.id ~ '^TKC-[0-9]{6}$')) then
    if current_user <> 'postgres' or auth.uid() is not null or
       coalesce(
         nullif(current_setting('request.jwt.claim.role',true),''),
         nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',
         ''
       ) not in ('','postgres') then
      raise exception using errcode='42501',
        message='Reserved catalog FK rows are admin-managed';
    end if;
    if TG_OP <> 'DELETE' and (
      NEW.scope is distinct from 'global' or
      NEW.created_by is not null or
      NEW.user_id is not null or
      NEW.gym_id is not null
    ) then
      raise exception using errcode='23514',
        message='Catalog FK aliases must be unowned global references';
    end if;
  end if;
  if TG_OP='DELETE' then return OLD; end if;
  return NEW;
end;
$tk504$;
revoke all on function public.tk504_protect_reserved_catalog_fk()
  from public, anon, authenticated, service_role;
drop trigger if exists tk504_reserved_catalog_fk_guard on public.exercises;
create trigger tk504_reserved_catalog_fk_guard
before insert or update or delete on public.exercises
for each row execute function public.tk504_protect_reserved_catalog_fk();

-- Registry permissions are also protected in trusted-definer contexts.
create or replace function public.tk504_protect_catalog_fk_bindings()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog
as $tk504$
begin
  if current_user <> 'postgres' or auth.uid() is not null or
       coalesce(
         nullif(current_setting('request.jwt.claim.role',true),''),
         nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',
         ''
       ) not in ('','postgres') then
    raise exception using errcode='42501',
      message='Catalog FK binding changes require trusted database admin';
  end if;
  if TG_OP='DELETE' then return OLD; end if;
  return NEW;
end;
$tk504$;
revoke all on function public.tk504_protect_catalog_fk_bindings()
  from public, anon, authenticated, service_role;
drop trigger if exists tk504_catalog_fk_bindings_guard on public.movekit_catalog_fk_bindings;
create trigger tk504_catalog_fk_bindings_guard
before insert or update or delete on public.movekit_catalog_fk_bindings
for each row execute function public.tk504_protect_catalog_fk_bindings();

-- No data migration, aliases, publication, RLS bypass function or media grants
-- are created/updated by this DDL. Admin seeding must be a separately reviewed,
-- manifest-verified action, never an app-client/API write.

-- The existing sessions writer remains the ONLY writer. This narrow trigger
-- refuses any new typed FK session until the independently reviewed binding is
-- active; a client cannot bypass it by sending 'TKC-...' directly via REST.
-- A historical session whose exercise_id has not changed can still be edited
-- after later revocation. Legacy IDs and nullable unrelated sessions remain.
create or replace function public.tk504_validate_typed_session_fk()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $tk504$
declare
  binding_active boolean;
begin
  if NEW.exercise_id is null or NEW.exercise_id !~ '^TKC-[0-9]{6}$' then
    return NEW;
  end if;
  if TG_OP='UPDATE' and NEW.exercise_id is not distinct from OLD.exercise_id then
    return NEW;
  end if;
  select (active and reviewed_at is not null) into binding_active
  from public.movekit_catalog_fk_bindings
  where exercise_id=NEW.exercise_id;
  if binding_active is distinct from true then
    raise exception using errcode='23514',
      message='Catalog FK logging is not released for this exercise';
  end if;
  return NEW;
end;
$tk504$;
revoke all on function public.tk504_validate_typed_session_fk()
  from public, anon, authenticated, service_role;
drop trigger if exists tk504_typed_session_fk_guard on public.sessions;
create trigger tk504_typed_session_fk_guard
before insert or update of exercise_id on public.sessions
for each row execute function public.tk504_validate_typed_session_fk();

-- Optional read-only, strictly scoped adapter for the existing authenticated
-- PostgREST client. It never seeds aliases or grants media access.
-- User supplies BOTH the typed catalog ID and exact manifest provider ID;
-- only an independently reviewed/active mapping returns the session FK.
create or replace function public.tk504_resolve_catalog_fk(
  p_catalog_id text,
  p_provider_id text
)
returns text
language sql
stable
security definer
set search_path=pg_catalog
as $tk504$
  select b.exercise_id
  from public.movekit_catalog_fk_bindings b
  where auth.uid() is not null
    and b.catalog_id=p_catalog_id
    and b.provider_id=p_provider_id
    and b.active=true
    and b.reviewed_at is not null
  limit 1;
$tk504$;
revoke all on function public.tk504_resolve_catalog_fk(text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.tk504_resolve_catalog_fk(text,text)
  to authenticated;
comment on function public.tk504_resolve_catalog_fk(text,text) is
  'Returns only an approved typed FK to a logged-in athlete; does not grant licensed media or create session rows.';
