# TK504 #614 OFFLINE SECURITY ACCEPTANCE for the original-226 auditor read lease + owner-only Storage policy.
# Applies the EXACT, UNMODIFIED repository files to a throwaway `postgres:17 --network none --rm` container:
#   supabase/migrations/20261111071021_tk504_original226_private_auditor_read_lease_stage.sql
#   docs/sql/TK504_ORIGINAL226_AUDITOR_STORAGE_POLICY_OWNER_ONLY.sql
# on top of tools/fixtures/tk504_original226_rls_fixture.sql (synthetic auth/storage stand-ins).
# No cloud DB, no production calls, no credentials, no tokens, no network. Proves nothing about production.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\tk504_original226_auditor_rls_acceptance.ps1
# Negative control (expected nonzero): add -NegativeControl; only changes the throwaway synthetic container.
param([string]$Image = 'postgres:17', [switch]$NegativeControl)
$ErrorActionPreference = 'Stop'
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$Root = Split-Path -Parent $PSScriptRoot
$Mig = 'supabase/migrations/20261111071021_tk504_original226_private_auditor_read_lease_stage.sql'
$Pol = 'docs/sql/TK504_ORIGINAL226_AUDITOR_STORAGE_POLICY_OWNER_ONLY.sql'
$Fix = 'tools/fixtures/tk504_original226_rls_fixture.sql'
$Name = 'tk504-rls-accept-' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$AUD = 'a0d17000-0000-4000-8000-000000000001'; $USR = 'b0b00000-0000-4000-8000-000000000002'
$APR = 'c0c00000-0000-4000-8000-000000000003'
$V1 = 'movekit/v2/video/abdominals-stretch-variation-four.mp4'
$P1 = 'movekit/v2/poster-optimized/abdominals-stretch-variation-four.webp'
$V2 = 'movekit/v2/video/abdominals-stretch-variation-one.mp4'
$P2 = 'movekit/v2/poster-optimized/abdominals-stretch-variation-one.webp'
function Claims($sub, $anon) { $j = '{"role":"authenticated"'; if ($sub) { $j += ',"sub":"' + $sub + '"' }; if ($anon -ne $null) { $j += ',"is_anonymous":' + $anon }; $j + '}' }
$CA = Claims $AUD 'false'; $CU = Claims $USR 'false'

function Invoke-Native([string]$Stdin, [string[]]$ArgList) {
  $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { $out = $Stdin | & docker @ArgList 2>&1 | ForEach-Object { "$_" }; $code = $LASTEXITCODE }
  finally { $ErrorActionPreference = $old }
  [pscustomobject]@{ Code = $code; Out = ($out -join "`n") }
}
function Psql([string]$Sql, [string[]]$Extra = @()) {
  Invoke-Native $Sql (@('exec', '-i', $Name, 'psql', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres') + $Extra)
}
function Must($r, $what) { if ($r.Code -ne 0) { throw "$what failed (exit $($r.Code)):`n$($r.Out)" } }
# One isolated client transaction: role + transaction-local claims/operation, query sets :actual, rollback, record.
function Case($Id, $Role, $Claims, $Op, $Query, $Expect) {
  "begin;`nset local role $Role;`n" +
  "select set_config('request.jwt.claims', '$Claims', true) as _c, set_config('storage.operation', '$Op', true) as _o \gset`n" +
  "$Query \gset`nrollback;`n" +
  "insert into tk_harness.results (name, expected, actual) values ('$Id', '$Expect', :'actual');`n"
}
function See($Id, $Role, $Claims, $Op, $Where, $Expect) { Case $Id $Role $Claims $Op "select count(*)::text as actual from storage.objects where $Where" $Expect }
function Deny($Id, $Role, $Claims, $Stmt) {
  Case $Id $Role $Claims 'object.get_authenticated' ("do `$t`$ begin begin $Stmt; perform set_config('tk.r','ALLOWED',true); " +
    "exception when insufficient_privilege then perform set_config('tk.r','DENIED',true); end; end `$t`$;`n" +
    "select current_setting('tk.r') as actual") 'DENIED'
}
function Admin($Id, $Stmt, $State) {
  "begin;`ndo `$t`$ begin begin $Stmt; perform set_config('tk.r','ACCEPTED',true); exception when sqlstate '$State' then perform set_config('tk.r','REJECTED',true); end; end `$t`$;`n" +
  "select current_setting('tk.r') as actual \gset`nrollback;`ninsert into tk_harness.results (name, expected, actual) values ('$Id', 'REJECTED', :'actual');`n"
}
function Check($Id, $Expr, $Expect) { "insert into tk_harness.results (name, expected, actual) select '$Id', '$Expect', ($Expr)::text;`n" }
function Lease($Active, $Start, $End) {
  "update public.tk504_original226_audit_leases set active = $Active, starts_at = now() + interval '$Start', expires_at = now() + interval '$End' where auditor_user_id = '$AUD';`n"
}
$Vid1 = "bucket_id = 'exercise-media' and name = '$V1'"
$Ok = 'object.get_authenticated'

# ---- Preflight: originals must be byte-identical to HEAD; image must be local (no pull).
Push-Location $Root
try {
  foreach ($f in @($Mig, $Pol)) { git diff --quiet HEAD -- $f; if ($LASTEXITCODE -ne 0) { throw "ORIGINAL_MODIFIED: $f" } }
  $before = @($Mig, $Pol) | ForEach-Object { (Get-FileHash -Algorithm SHA256 $_).Hash }
} finally { Pop-Location }
Must (Invoke-Native '' @('image', 'inspect', '--format', '{{.Id}}', $Image)) "local image $Image"

$exit = 1
try {
  Must (Invoke-Native '' @('run', '-d', '--rm', '--pull', 'never', '--network', 'none', '--name', $Name,
      '-e', 'POSTGRES_HOST_AUTH_METHOD=trust',
      '-v', "$(Join-Path $Root $Fix):/in/fixture.sql:ro", '-v', "$(Join-Path $Root $Mig):/in/migration.sql:ro",
      '-v', "$(Join-Path $Root $Pol):/in/owner_policy.sql:ro",
      $Image)) 'docker run'
  $ready = $false
  for ($i = 0; $i -lt 60 -and -not $ready; $i++) {
    Start-Sleep -Milliseconds 500
    $ready = (Invoke-Native '' @('exec', $Name, 'pg_isready', '-q', '-h', '127.0.0.1', '-U', 'postgres')).Code -eq 0
  }
  if (-not $ready) { throw 'postgres not ready' }
  Write-Host "container $Name up (network none)"
  $net = Invoke-Native '' @('inspect', '--format', '{{.HostConfig.NetworkMode}}', $Name)
  if ($net.Out.Trim() -ne 'none') { throw "NETWORK_NOT_NONE: $($net.Out)" }

  Must (Psql '' @('-f', '/in/fixture.sql')) 'fixture'
  Must (Psql '' @('-f', '/in/migration.sql')) 'exact migration'

  # ---- Owner restriction: a non-owner, non-superuser migration role must NOT be able to install the policy.
  $g = Psql '' @('-c', 'set role tk_postgres_nonsuper', '-f', '/in/owner_policy.sql')
  $guardOk = ($g.Code -ne 0) -and ($g.Out -match 'TK504_STORAGE_OBJECTS_OWNER_ROLE_REQUIRED')
  $d = Psql "set role tk_postgres_nonsuper;`ncreate policy tk_probe on storage.objects for select to authenticated using (true);"
  $ddlOk = ($d.Code -ne 0) -and ($d.Out -match 'must be owner of table objects')
  # ---- Authorized synthetic owner context executes the EXACT owner-only file.
  Must (Psql '' @('-c', 'set role supabase_storage_admin', '-f', '/in/owner_policy.sql')) 'owner policy as supabase_storage_admin'
  # NEGATIVE CONTROL runs ONLY in this isolated --network none synthetic container:
  # intentionally introduce an unsafe extra permissive SELECT policy; required DENY assertions MUST fail.
  if ($NegativeControl) {
    Write-Host 'NEGATIVE CONTROL: injecting unsafe synthetic policy into isolated container; EXPECT TEST FAIL'
    Must (Psql "set role supabase_storage_admin; create policy tk_fixture_intentional_bypass on storage.objects for select to authenticated using (bucket_id = 'exercise-media');") 'synthetic negative control injection'
  }

  $s = "insert into tk_harness.results (name, expected, actual) values ('owner_guard_blocks_nonsuper_postgres', 'true', '$("$guardOk".ToLower())'), ('raw_create_policy_blocked_for_non_owner', 'true', '$("$ddlOk".ToLower())');`n"
  # Allowlist seeded by privileged admin; object_name is derived by the migration's generated column.
  $s += "insert into public.tk504_original226_audit_allowed_objects (catalog_id, provider_id, bucket_id) values " +
        "('TK-000001','abdominals-stretch-variation-four','exercise-media'),('TK-000001','abdominals-stretch-variation-four','exercise-posters')," +
        "('TK-000002','abdominals-stretch-variation-one','exercise-media'),('TK-000002','abdominals-stretch-variation-one','exercise-posters');`n"
  $s += Check 'allowlist_derived_names_match_manifest' "(select string_agg(object_name, ',' order by catalog_id, bucket_id) from public.tk504_original226_audit_allowed_objects) = '$V1,$P1,$V2,$P2'" 'true'
  $s += Admin 'allowlist_rejects_catalog_outside_original226' "insert into public.tk504_original226_audit_allowed_objects values ('TK-000227','x','exercise-media')" '23514'
  $s += See 'normal_user_own_avatar_baseline' 'authenticated' $CU $Ok "bucket_id = 'avatars'" '1'
  # 1. no lease
  $s += See 'no_lease_video_denied' 'authenticated' $CA $Ok $Vid1 '0'
  $s += See 'no_lease_any_object_denied' 'authenticated' $CA $Ok 'true' '0'
  # 2. inactive lease (default active=false), approved by a different user, 1h window
  $s += "insert into public.tk504_original226_audit_leases (auditor_user_id, starts_at, expires_at, approved_by, approval_reference) values ('$AUD', now() - interval '1 minute', now() + interval '60 minutes', '$APR', 'TK504-SYNTHETIC-OFFLINE-ACCEPTANCE');`n"
  $s += Check 'lease_inserted_inactive_by_default' "(select not active from public.tk504_original226_audit_leases where auditor_user_id = '$AUD')" 'true'
  $s += Admin 'lease_over_2h_rejected' "update public.tk504_original226_audit_leases set expires_at = starts_at + interval '2 hours 1 second'" '23514'
  $s += Admin 'lease_self_approval_rejected' "update public.tk504_original226_audit_leases set approved_by = auditor_user_id" '23514'
  $s += See 'inactive_lease_video_denied' 'authenticated' $CA $Ok $Vid1 '0'
  $s += Case 'inactive_lease_allowlist_hidden' 'authenticated' $CA $Ok 'select count(*)::text as actual from public.tk504_original226_audit_allowed_objects' '0'
  # 3. active in-window lease
  $s += Lease 'true' '-1 minute' '60 minutes'
  $s += Admin 'second_active_lease_rejected' "insert into public.tk504_original226_audit_leases values ('$USR', true, now(), now() + interval '1 hour', '$APR', 'x')" '23505'
  $s += See 'active_exact_video1_allowed' 'authenticated' $CA $Ok $Vid1 '1'
  $s += See 'active_exact_poster1_allowed' 'authenticated' $CA $Ok "bucket_id = 'exercise-posters' and name = '$P1'" '1'
  $s += See 'active_exact_video2_allowed' 'authenticated' $CA $Ok "bucket_id = 'exercise-media' and name = '$V2'" '1'
  $s += See 'active_exact_poster2_allowed' 'authenticated' $CA $Ok "bucket_id = 'exercise-posters' and name = '$P2'" '1'
  $s += See 'active_visible_set_is_exactly_allowlist' 'authenticated' $CA $Ok 'true' '4'
  $s += See 'wrong_auditor_normal_user_denied' 'authenticated' $CU $Ok $Vid1 '0'
  $s += See 'wrong_bucket_posters_denied' 'authenticated' $CA $Ok "bucket_id = 'exercise-posters' and name = '$V1'" '0'
  $s += See 'wrong_bucket_avatars_denied' 'authenticated' $CA $Ok "bucket_id = 'avatars'" '0'
  $s += See 'wrong_path_case_variant_denied' 'authenticated' $CA $Ok "name = 'Movekit/v2/video/abdominals-stretch-variation-four.mp4'" '0'
  $s += See 'wrong_path_suffix_denied' 'authenticated' $CA $Ok "name like '%.mp4.bak'" '0'
  $s += See 'non_allowlisted_video_denied' 'authenticated' $CA $Ok "name = 'movekit/v2/video/tk-fixture-not-allowlisted.mp4'" '0'
  foreach ($op in @('object.list', 'object.list_v2', 'object.info_authenticated', 'object.sign', 'object.sign_upload', 'object.move',
                    'object.copy', 'object.upload', 'object.update', 'object.delete', 'object.get_public', 'bucket.list', '')) {
    $s += See ("op_denied_" + $(if ($op) { $op } else { 'unset' })) 'authenticated' $CA $op $Vid1 '0'
  }
  $s += See 'anonymous_signin_claim_denied' 'authenticated' (Claims $AUD 'true') $Ok $Vid1 '0'
  $s += See 'missing_is_anonymous_claim_denied' 'authenticated' (Claims $AUD $null) $Ok $Vid1 '0'
  $s += See 'no_claims_denied' 'authenticated' '' $Ok $Vid1 '0'
  $s += See 'anon_role_denied' 'anon' '{"role":"anon"}' $Ok 'true' '0'
  $s += See 'anon_role_with_auditor_sub_denied' 'anon' $CA $Ok $Vid1 '0'
  $s += Case 'auditor_sees_own_lease_only' 'authenticated' $CA $Ok 'select count(*)::text as actual from public.tk504_original226_audit_leases' '1'
  $s += Case 'auditor_sees_allowlist_while_active' 'authenticated' $CA $Ok 'select count(*)::text as actual from public.tk504_original226_audit_allowed_objects' '4'
  $s += Case 'normal_user_sees_no_lease' 'authenticated' $CU $Ok 'select count(*)::text as actual from public.tk504_original226_audit_leases' '0'
  $s += Case 'normal_user_sees_no_allowlist' 'authenticated' $CU $Ok 'select count(*)::text as actual from public.tk504_original226_audit_allowed_objects' '0'
  $s += See 'normal_user_own_avatar_unaffected' 'authenticated' $CU $Ok "bucket_id = 'avatars'" '1'
  $s += See 'normal_user_no_exercise_media' 'authenticated' $CU $Ok "bucket_id like 'exercise-%'" '0'
  # Writes by an ACTIVE auditor: no grants on lease/allowlist; no write policies on storage.objects.
  $L = 'public.tk504_original226_audit_leases'; $A = 'public.tk504_original226_audit_allowed_objects'
  $s += Deny 'auth_insert_lease_denied' 'authenticated' $CA "insert into $L values ('$USR', true, now(), now() + interval '1 hour', '$AUD', 'x')"
  $s += Deny 'auth_update_lease_denied' 'authenticated' $CA "update $L set expires_at = expires_at + interval '1 minute'"
  $s += Deny 'auth_delete_lease_denied' 'authenticated' $CA "delete from $L"
  $s += Deny 'auth_insert_allowlist_denied' 'authenticated' $CA "insert into $A values ('TK-000003','x','exercise-media')"
  $s += Deny 'auth_update_allowlist_denied' 'authenticated' $CA "update $A set provider_id = 'x'"
  $s += Deny 'auth_delete_allowlist_denied' 'authenticated' $CA "delete from $A"
  $s += Deny 'anon_select_lease_denied' 'anon' $CA "perform 1 from $L"
  $s += Deny 'auth_insert_storage_object_denied' 'authenticated' $CA "insert into storage.objects (bucket_id, name) values ('exercise-media', 'movekit/v2/video/x.mp4')"
  $s += Case 'auth_update_storage_object_noop' 'authenticated' $CA $Ok "with x as (update storage.objects set metadata = '{}'::jsonb where $Vid1 returning 1) select count(*)::text as actual from x" '0'
  $s += Case 'auth_delete_storage_object_noop' 'authenticated' $CA $Ok "with x as (delete from storage.objects where $Vid1 returning 1) select count(*)::text as actual from x" '0'
  # 4. expired, future, revoked, deleted
  $s += Lease 'true' '-2 hours' '-1 minute'
  $s += See 'expired_lease_denied' 'authenticated' $CA $Ok $Vid1 '0'
  $s += Lease 'true' '10 minutes' '70 minutes'
  $s += See 'future_lease_denied' 'authenticated' $CA $Ok $Vid1 '0'
  $s += Lease 'true' '-1 minute' '60 minutes'
  $s += See 'reactivated_control_allowed' 'authenticated' $CA $Ok $Vid1 '1'
  $s += Lease 'false' '-1 minute' '60 minutes'
  $s += See 'revoked_lease_denied' 'authenticated' $CA $Ok $Vid1 '0'
  $s += "delete from public.tk504_original226_audit_leases;`n"
  $s += See 'deleted_lease_denied' 'authenticated' $CA $Ok 'true' '0'
  # 5. Static posture
  $s += Check 'storage_objects_owner_is_storage_admin' "(select pg_get_userbyid(relowner) from pg_class where oid = 'storage.objects'::regclass)" 'supabase_storage_admin'
  $s += Check 'client_roles_not_super_or_bypassrls' "(select count(*) from pg_roles where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls))" '0'
  $s += Check 'nonsuper_postgres_not_member_of_storage_admin' "pg_has_role('tk_postgres_nonsuper', 'supabase_storage_admin', 'member')" 'false'
  $s += Check 'rls_enabled_objects_lease_allowlist' "(select count(*) from pg_class where oid in ('storage.objects'::regclass, '$L'::regclass, '$A'::regclass) and relrowsecurity)" '3'
  $s += Check 'auditor_policy_select_only_authenticated' "(select cmd || ':' || permissive || ':' || array_to_string(roles, ',') from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'tk504_original226_auditor_download_only')" 'SELECT:PERMISSIVE:authenticated'
  $s += Check 'storage_objects_policy_count' "(select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects')" '2'
  $s += Check 'no_write_policy_on_storage_objects' "(select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd <> 'SELECT')" '0'
  $s += Check 'no_anon_or_public_storage_policy' "(select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and roles && array['anon','public']::name[])" '0'
  $s += Check 'all_buckets_private' "(select count(*) from storage.buckets where public)" '0'
  $s += Check 'authenticated_lease_privs_select_only' "has_table_privilege('authenticated','$L','SELECT') and not has_table_privilege('authenticated','$L','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')" 'true'
  $s += Check 'authenticated_allowlist_privs_select_only' "has_table_privilege('authenticated','$A','SELECT') and not has_table_privilege('authenticated','$A','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')" 'true'
  $s += Check 'anon_no_privs_on_lease_or_allowlist' "has_table_privilege('anon','$L','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('anon','$A','SELECT,INSERT,UPDATE,DELETE')" 'false'
  $s += "select case when expected is not distinct from actual then 'PASS' else 'FAIL' end || ' ' || name || ' expected=' || expected || ' actual=' || coalesce(actual, '<null>') from tk_harness.results order by seq;`n"
  $r = Psql $s
  Must $r 'acceptance cases'
  $lines = @($r.Out -split "`n" | Where-Object { $_ -match '^(PASS|FAIL) ' })
  $lines | ForEach-Object { Write-Host $_ }
  $fail = @($lines | Where-Object { $_ -like 'FAIL *' }).Count
  if ($lines.Count -lt 60) { throw "TOO_FEW_RESULTS: $($lines.Count)" }
  $after = @($Mig, $Pol) | ForEach-Object { (Get-FileHash -Algorithm SHA256 (Join-Path $Root $_)).Hash }
  if (($before -join ',') -ne ($after -join ',')) { throw 'ORIGINALS_CHANGED_DURING_RUN' }
  Write-Host ("migration sha256 {0}`nowner-policy sha256 {1}" -f $after[0].ToLower(), $after[1].ToLower())
  if ($fail -eq 0) { Write-Host "TK504_ORIGINAL226_AUDITOR_RLS_ACCEPTANCE: PASS ($($lines.Count)/$($lines.Count))"; $exit = 0 }
  else { Write-Host "TK504_ORIGINAL226_AUDITOR_RLS_ACCEPTANCE: FAIL ($fail of $($lines.Count) failed)" }
} catch {
  Write-Host "TK504_ORIGINAL226_AUDITOR_RLS_ACCEPTANCE: FAIL (harness error) $_"
  $exit = 1
} finally {
  $null = Invoke-Native '' @('rm', '-f', $Name)
  $left = Invoke-Native '' @('ps', '-aq', '--filter', "name=$Name")
  if ($left.Out.Trim()) { Write-Host "CLEANUP_FAILED: $Name still present"; $exit = 1 } else { Write-Host "cleanup: container $Name removed" }
}
exit $exit
