-- TK504 #504 / TK614: original 226 private AUDITOR download-only read lease.
-- STAGED DRAFT ONLY. NOT PRODUCTION APPROVED. NOT TO APPLY WITHOUT A SEPARATE
-- OWNER + DBA + SECURITY REVIEW AND A WRITTEN ROLLBACK PLAN.
--
-- Purpose: a future, time-bounded, least-privilege, human-approved route for
-- ONE short-lived auditor account to download (object.get_authenticated only)
-- the exact 452 original-226 objects (226 video + 226 poster) from the two
-- existing private buckets, so their bytes can be SHA-verified against the
-- exact pinned approved manifest.
--
-- INERT BY DEFAULT:
--  * ZERO lease rows + ZERO allowlist rows are inserted here.
--    ZERO ACTIVE LEASES + ZERO ALLOWLIST ROWS = NO ACCESS FOR ANYONE.
--  * lease.active defaults to false; a lease is at most 2 hours long and is
--    revoked automatically by active=false OR by expiry (no job required).
--  * client roles (anon/authenticated) get NO insert/update/delete on either
--    table; authenticated gets SELECT only, further restricted by RLS.
--  * this migration DOES NOT change storage.objects. Its owner-controlled policy is
--    a SEPARATE DBA-approved operation; no list/info/sign/move/copy,
--    no INSERT/UPDATE/DELETE policy, no bucket created or made public, and the
--    existing 4 avatars policies are NOT touched.
--
-- NOT CHANGED BY THIS MIGRATION:
--  * no owner media release approval exists or is implied;
--  * the original-226 broker hard 404 is unchanged;
--  * V2 grants (movekit_media_grants), the 356 catalog, publication tables and
--    any non-MoveKit bucket are unchanged; no catalog table is read or joined
--    (those have RLS with no policies), the allowlist is self-contained.
--  * no SECURITY DEFINER / SQL functions, no secrets, no service keys, no JWT
--    user_metadata, no data migration.
--
-- INTENTIONAL: the storage policy does NOT check media publication status.
-- It is a temporary private auditor download to verify UNRELEASED media and
-- NEVER authorizes user playback.
--
-- OPERATIONAL CAVEATS (all out of scope of this file, all require approval):
--  * requires a signed, Supabase-issued user JWT; anonymous sign-ins are
--    rejected (is_anonymous must be exactly 'false'; missing claim fails closed).
--  * provisioning is admin-only and separate: one short-lived dedicated auditor
--    account, and the 452 allowlist rows seeded LATER only from the exact
--    pinned approved manifest with an owner + DBA check.
--  * enable the lease (active=true, starts_at/expires_at <= 2h) only AFTER the
--    manifest is verified; set active=false (and delete the lease row, disable
--    or delete the auditor account) immediately after the run.
--  * the separate DBA-only policy requires storage.allow_only_operation(text).
--    Production storage.objects is owned by supabase_storage_admin, not
--    the normal postgres migration role. Never elevate postgres to apply it.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '60s';

-- 1. Lease table: one optional lease per auditor account, inactive by default.
create table public.tk504_original226_audit_leases (
  auditor_user_id    uuid        primary key references auth.users (id) on delete cascade,
  active             boolean     not null default false,
  starts_at          timestamptz not null,
  expires_at         timestamptz not null,
  approved_by        uuid        not null,
  approval_reference text        not null,
  constraint tk504_audit_lease_window
    check (expires_at > starts_at and expires_at <= starts_at + interval '2 hours'),
  constraint tk504_audit_lease_four_eyes
    check (approved_by <> auditor_user_id),
  constraint tk504_audit_lease_approval_reference
    check (btrim(approval_reference) <> '' and length(approval_reference) <= 200)
);
-- At most ONE active auditor account globally. A stale expired active lease must be explicitly revoked before another is enabled.
create unique index tk504_original226_audit_single_active_lease
  on public.tk504_original226_audit_leases (active)
  where active is true;
comment on table public.tk504_original226_audit_leases is
  'TK504 STAGED: time-bounded (<=2h) human-approved original-226 auditor read lease. Empty by default; no rows = no access. Admin-only provisioning; client roles read own row only.';

-- 2. Exact allowlist: object path is DERIVED, never chosen as a raw path.
create table public.tk504_original226_audit_allowed_objects (
  catalog_id  text not null,
  provider_id text not null,
  bucket_id   text not null,
  object_name text generated always as (
    case bucket_id
      when 'exercise-media'   then 'movekit/v2/video/' || provider_id || '.mp4'
      when 'exercise-posters' then 'movekit/v2/poster-optimized/' || provider_id || '.webp'
    end
  ) stored not null,
  constraint tk504_audit_allowed_pk primary key (catalog_id, bucket_id),
  constraint tk504_audit_allowed_object_unique unique (bucket_id, object_name),
  -- exact ORIGINAL range TK-000001 .. TK-000226 only.
  constraint tk504_audit_allowed_catalog_original226
    check (catalog_id ~ '^TK-000(00[1-9]|0[1-9][0-9]|1[0-9][0-9]|2[01][0-9]|22[0-6])$'),
  -- strict canonical lowercase slug: no '/', '.', '_', spaces, or edge/double hyphens.
  constraint tk504_audit_allowed_provider_slug
    check (length(provider_id) between 1 and 128
           and provider_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tk504_audit_allowed_bucket
    check (bucket_id in ('exercise-media', 'exercise-posters'))
);
comment on table public.tk504_original226_audit_allowed_objects is
  'TK504 STAGED: exact (bucket_id, object_name) allowlist for original TK-000001..TK-000226 auditor verification. Empty by default; seed LATER only from the exact pinned approved manifest with owner + DBA check.';

-- 3. Privileges: deny-all for client roles, then SELECT only for authenticated.
revoke all on table public.tk504_original226_audit_leases          from public, anon, authenticated;
revoke all on table public.tk504_original226_audit_allowed_objects from public, anon, authenticated;
grant select on table public.tk504_original226_audit_leases          to authenticated;
grant select on table public.tk504_original226_audit_allowed_objects to authenticated;

alter table public.tk504_original226_audit_leases          enable row level security;
alter table public.tk504_original226_audit_allowed_objects enable row level security;

-- Lease: an auditor sees only their own lease row (active or not).
create policy tk504_audit_lease_select_self
  on public.tk504_original226_audit_leases
  as permissive
  for select
  to authenticated
  using (
    auth.uid() is not null
    and auditor_user_id = auth.uid()
  );

-- Allowlist: visible only while the caller holds an active, in-window lease.
create policy tk504_audit_allowed_select_active_lease
  on public.tk504_original226_audit_allowed_objects
  as permissive
  for select
  to authenticated
  using (
    auth.uid() is not null
    and coalesce(auth.jwt() ->> 'is_anonymous', '') = 'false'
    and exists (
      select 1
        from public.tk504_original226_audit_leases l
       where l.auditor_user_id = auth.uid()
         and l.active is true
         and l.starts_at <= now()
         and now() < l.expires_at
    )
  );
-- No INSERT/UPDATE/DELETE policies on either table (and no such grants).

-- 4. INTENTIONALLY NO storage.objects policy here: this normal migration role
--    is not the owner of storage.objects and cannot safely grant Storage access.
--    See DBA-owned draft docs/sql/TK504_ORIGINAL226_AUDITOR_STORAGE_POLICY_OWNER_ONLY.sql.
--    Owner-reviewed policy is a SEPARATE approval and DDL action; not automated.

commit;
