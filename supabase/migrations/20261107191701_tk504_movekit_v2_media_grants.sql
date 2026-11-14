-- TK #504 — MoveKit Golden V2 media access, STAGED ONLY.
-- This migration is NOT applied to the live project. Apply only after
-- approved entitlement policy, backup, isolation/security review and
-- explicit production authorization. No automatically entitled users.
--
-- Data API: new public tables may need an explicit grant since 2026-10-30.
-- No policies for anon/authenticated: no client may read/create grants.
create table if not exists public.movekit_media_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'movekit_v2'
    constraint movekit_media_grants_scope_check check (scope = 'movekit_v2'),
  active boolean not null default false,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  grant_reference text not null
    constraint movekit_media_grants_reference_check
      check (grant_reference ~ '^TK504-[0-9]{8}-[0-9]{3,6}$'),
  primary key (user_id, scope),
  constraint movekit_media_grants_consistent_revoke
    check (not (active and revoked_at is not null)),
  constraint movekit_media_grants_valid_expiry
    check (expires_at is null or expires_at > granted_at)
);
comment on table public.movekit_media_grants is
  'Movekit V2 signing entitlement, admin-only provenance. No user-editable claims. Enforced by server broker; license and object release are separately gated.';
alter table public.movekit_media_grants enable row level security;
revoke all on table public.movekit_media_grants from public, anon, authenticated;
-- Server-only role may CHECK grants, but may not write them.
-- Supabase service_role can inherit broad default table grants; revoke them explicitly.
revoke insert, update, delete, truncate, references, trigger
  on table public.movekit_media_grants from service_role;
grant select on table public.movekit_media_grants to service_role;
-- Intentionally NO policies for anon or authenticated, NO auto-grants.
