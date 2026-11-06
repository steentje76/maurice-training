-- TK504 #603: server-only storage for reviewed extra catalog metadata.
-- STAGED ONLY: not applied to live Supabase; no content rows or user grants.
-- Release remains separate from owner batch content approval.
create table if not exists public.movekit_v2_catalog_publications(
  catalog_id text primary key references public.movekit_catalog_fk_bindings(catalog_id)
    on update restrict on delete restrict,
  provider_id text not null unique
    constraint tk504_publication_provider_format
    check (provider_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  metadata jsonb not null
    constraint tk504_publication_metadata_object
    check (jsonb_typeof(metadata)='object' and
      metadata->>'catalog_id'=catalog_id and
      metadata->'source'->>'provider'='movekit' and
      metadata->'source'->>'provider_id'=provider_id and
      jsonb_typeof(metadata->'identity')='object' and
      jsonb_typeof(metadata->'intelligence')='object' and
      jsonb_typeof(metadata->'relations')='object' and
      jsonb_typeof(metadata->'flags')='object' and
      (not (metadata ? 'assets') or metadata->'assets'='[]'::jsonb)),
  status text not null default 'staged'
    constraint tk504_publication_status_check
    check(status in ('staged','published','revoked')),
  reviewed_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tk504_publication_new_only
    check (catalog_id ~ '^TK-[0-9]{6}$' and
      substring(catalog_id from 4)::integer between 227 and 582),
  constraint tk504_publication_review_gate
    check (status<>'published' or
      (reviewed_at is not null and approved_at is not null and published_at is not null))
);
comment on table public.movekit_v2_catalog_publications is
 'Licensed 356 metadata records: admin-provisioned, default staged, no browser access, no media grant.';
alter table public.movekit_v2_catalog_publications enable row level security;
revoke all on public.movekit_v2_catalog_publications
  from public,anon,authenticated,service_role;
grant select on public.movekit_v2_catalog_publications to service_role;

-- Independently validate exact reference to the admin-controlled binding.
-- Admin activity is gated by account claim as well as current_user.
create or replace function public.tk504_guard_catalog_publication()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog
as $tk504$
declare b record;
begin
 if current_user<>'postgres' or auth.uid() is not null or
   coalesce(
    nullif(current_setting('request.jwt.claim.role',true),''),
    nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',''
   ) not in ('','postgres') then
   raise exception using errcode='42501',
    message='Movekit catalog publications are database-admin managed';
 end if;
 if TG_OP='DELETE' then return OLD; end if;
 select provider_id,exercise_id,active,reviewed_at into b
 from public.movekit_catalog_fk_bindings
 where catalog_id=NEW.catalog_id;
 if not found or b.provider_id is distinct from NEW.provider_id or
    b.exercise_id is distinct from
      'TKC-'||substring(NEW.catalog_id from 4) then
   raise exception using errcode='23514',
    message='Unverified catalog provider or exact FK binding';
 end if;
 if NEW.status='published' and
   (b.active is distinct from true or b.reviewed_at is null) then
   raise exception using errcode='23514',
    message='Catalog cannot publish without approved active session FK';
 end if;
 return NEW;
end
$tk504$;
revoke all on function public.tk504_guard_catalog_publication()
  from public,anon,authenticated,service_role;
drop trigger if exists tk504_catalog_publication_guard
  on public.movekit_v2_catalog_publications;
create trigger tk504_catalog_publication_guard
before insert or update or delete on public.movekit_v2_catalog_publications
for each row execute function public.tk504_guard_catalog_publication();
-- No 356 content inserted, no app flag, no media, and NO RLS policies.
