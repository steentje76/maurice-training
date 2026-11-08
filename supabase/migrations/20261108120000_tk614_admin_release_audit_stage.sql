-- TK614 / #603 -- ADMIN RELEASE AUDIT for the ORIGINAL 226 MoveKit bindings.
-- STAGED ONLY. DO NOT APPLY TO LIVE SUPABASE WITHOUT EXPLICIT DBA/OWNER APPROVAL.
--
-- Append-only ledger that every TK614 admin phase (A stage, B activate,
-- C reverse) must write in the SAME transaction as its data change.
--  * decision_id is UNIQUE: an owner approval can never be replayed.
--  * Activation must name the prior (committed) stage/reverse decision and the
--    registry snapshot that decision left behind, so ACTIVATE can never be
--    silently coupled to STAGE.
-- No client role can read or write it. No RLS policy. No data, alias,
-- binding, session, media grant or existing policy is touched by this DDL.
create table if not exists public.tk614_admin_release_audit (
  id bigint generated always as identity primary key,
  decision_id text not null unique
    constraint tk614_audit_decision_id_format check (
      decision_id ~ '^TK614-OWNER-(STAGE|ACTIVATE|REVERSE)-[0-9]{8}-[A-Z0-9]{2,32}$'
    ),
  phase text not null
    constraint tk614_audit_phase_check check (phase in ('stage','activate','reverse')),
  prior_decision_id text
    references public.tk614_admin_release_audit(decision_id)
    on update restrict on delete restrict,
  approval_sha256 text not null
    constraint tk614_audit_approval_sha check (approval_sha256 ~ '^[0-9a-f]{64}$'),
  all_sha256 text not null
    constraint tk614_audit_all_sha check (all_sha256 ~ '^[0-9a-f]{64}$'),
  source_mapping_sha256 text not null
    constraint tk614_audit_mapping_sha check (source_mapping_sha256 ~ '^[0-9a-f]{64}$'),
  source_catalog_sha256 text not null
    constraint tk614_audit_catalog_sha check (source_catalog_sha256 ~ '^[0-9a-f]{64}$'),
  precondition_sha256 text not null
    constraint tk614_audit_precondition_sha check (precondition_sha256 ~ '^[0-9a-f]{64}$'),
  registry_before_sha256 text not null
    constraint tk614_audit_registry_before_sha check (registry_before_sha256 ~ '^[0-9a-f]{64}$'),
  registry_after_sha256 text not null
    constraint tk614_audit_registry_after_sha check (registry_after_sha256 ~ '^[0-9a-f]{64}$'),
  rows_changed integer not null
    constraint tk614_audit_rows_changed check (rows_changed between 0 and 226),
  executed_by text not null default session_user,
  backend_pid integer not null default pg_backend_pid(),
  txid bigint not null default txid_current(),
  executed_at timestamptz not null default now(),
  constraint tk614_audit_phase_matches_decision check (
    decision_id like 'TK614-OWNER-' || upper(phase) || '-%'
  ),
  constraint tk614_audit_prior_required check (
    (phase = 'stage' and prior_decision_id is null) or
    (phase = 'activate' and prior_decision_id is not null) or
    phase = 'reverse'
  )
);
comment on table public.tk614_admin_release_audit is
  'TK614 append-only DBA ledger for the original 226 MoveKit binding phases. No client access.';
alter table public.tk614_admin_release_audit enable row level security;
revoke all on table public.tk614_admin_release_audit
  from public, anon, authenticated, service_role;

-- Append-only, and only from the trusted postgres admin chain (no JWT).
create or replace function public.tk614_protect_admin_release_audit()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog
as $tk614$
begin
  if TG_OP <> 'INSERT' then
    raise exception using errcode='42501',
      message='TK614 admin release audit is append-only';
  end if;
  if session_user <> 'postgres' or current_user <> 'postgres' or auth.uid() is not null or
       coalesce(
         nullif(current_setting('request.jwt.claim.role',true),''),
         nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',
         ''
       ) not in ('','postgres') then
    raise exception using errcode='42501',
      message='TK614 admin release audit requires trusted database admin';
  end if;
  return NEW;
end;
$tk614$;
revoke all on function public.tk614_protect_admin_release_audit()
  from public, anon, authenticated, service_role;
drop trigger if exists tk614_admin_release_audit_guard on public.tk614_admin_release_audit;
create trigger tk614_admin_release_audit_guard
before insert or update or delete on public.tk614_admin_release_audit
for each row execute function public.tk614_protect_admin_release_audit();
drop trigger if exists tk614_admin_release_audit_no_truncate on public.tk614_admin_release_audit;
create trigger tk614_admin_release_audit_no_truncate
before truncate on public.tk614_admin_release_audit
for each statement execute function public.tk614_protect_admin_release_audit();
