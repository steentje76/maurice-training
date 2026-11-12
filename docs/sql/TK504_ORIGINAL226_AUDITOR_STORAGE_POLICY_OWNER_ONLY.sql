-- TK504 STORAGE OWNER DDL DRAFT ONLY. DO NOT AUTO-APPLY, IMPORT, OR MERGE AS A NORMAL MIGRATION.
-- Production storage.objects owner = supabase_storage_admin. Hosted Supabase may allow postgres
-- CREATE POLICY via supautils.policy_grants (without table ownership or SET ROLE).
-- Verified in THIS project with a false-only policy in a rolled-back transaction, 12 Nov 2026.
-- Authorization remains a SEPARATE owner + DBA + security review; policy creation is NOT media release.
-- Requires explicit owner+DBA+security approval, separate authorized owner-context execution, rollback plan.
-- Preconditions: pre-release lease/allowlist tables exist and are RLS protected. DBA must separately verify NO active lease before execution.
-- Applying this policy ALONE grants ZERO access because all leases are inactive/absent and allowlist empty.
-- Never embed a service-role key or grant postgres membership in supabase_storage_admin.
-- Rollback of ONLY this opt-in policy after approval: DROP POLICY tk504_original226_auditor_download_only ON storage.objects;

begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
do $$ begin
  if to_regclass('public.tk504_original226_audit_leases') is null
    or to_regclass('public.tk504_original226_audit_allowed_objects') is null then
    raise exception 'TK504_AUDIT_TABLES_NOT_PRESENT';
  end if;
  -- The Storage table owner need NOT have SELECT on the restricted lease table.
  -- A separate DBA preflight must assert zero active leases before approval.
  -- On hosted Supabase, postgres can be granted policy-only DDL by supautils.
  -- This does NOT grant table ownership, bypass RLS, or permit raw media access.
  if current_user <> (select pg_get_userbyid(c.relowner) from pg_class c
       join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='storage' and c.relname='objects')
     and not exists (select 1 from pg_roles where rolname=current_user and rolsuper)
     and not (
       current_user = 'postgres'
       and coalesce(
         (current_setting('supautils.policy_grants', true)::jsonb -> 'postgres') ? 'storage.objects',
         false
       )
     ) then
    raise exception 'TK504_STORAGE_POLICY_DDL_PERMISSION_REQUIRED';
  end if;
end $$;

-- 4. ONE additive download-only SELECT policy on existing storage.objects.
create policy tk504_original226_auditor_download_only
  on storage.objects
  as permissive
  for select
  to authenticated
  using (
    storage.allow_only_operation('object.get_authenticated')
    and bucket_id in ('exercise-media', 'exercise-posters')
    and auth.uid() is not null
    and coalesce(auth.jwt() ->> 'is_anonymous', '') = 'false'
    and exists (
      select 1
        from public.tk504_original226_audit_leases l
       where l.auditor_user_id = auth.uid()
         and l.active is true
         and l.starts_at <= now()
         and now() < l.expires_at
    )
    and exists (
      select 1
        from public.tk504_original226_audit_allowed_objects a
       where a.bucket_id   = storage.objects.bucket_id
         and a.object_name = storage.objects.name
    )
  );
comment on policy tk504_original226_auditor_download_only on storage.objects is
  'TK504 STAGED: original-226 auditor download-only (object.get_authenticated). Requires own active in-window lease (<=2h) AND exact allowlisted (bucket_id,name). Zero leases + zero allowlist = no access. Never authorizes user playback; ignores publication status by design.';

commit;
