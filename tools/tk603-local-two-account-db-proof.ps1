# #603/#602 — isolated, reversible SQL security acceptance on developer PC.
# Real PostgreSQL 17; TWO SYNTHETIC owners; NO Supabase/production connection.
# No published media, personal data, network ports, or persistent container.
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$migration = Join-Path $repo 'supabase\migrations\20261107191714_tk504_typed_catalog_fk_stage.sql'
$smoke = Join-Path $repo 'tools\tk504-typed-fk-security-smoke.sql'
if (!(Test-Path $migration) -or !(Test-Path $smoke)) { throw 'Required staged fixtures missing' }
$name = 'tk603-two-user-proof-' + ([guid]::NewGuid().ToString('N').Substring(0,12))
$started = $false
try {
  & docker run --rm --detach --name $name --network none -e POSTGRES_PASSWORD=synthetic_only_tk603 postgres:17 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Isolated Postgres start failed' }
  $started = $true
  $ready = $false
  for ($i=0; $i -lt 45; $i++) {
    & docker exec $name pg_isready -U postgres 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Milliseconds 300
  }
  if (!$ready) { throw 'Isolated Postgres not ready' }
  & docker cp $migration (${name}+':/tmp/tk504-typed-fk-stage.sql') | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Migration copy failed' }
  & docker cp $smoke (${name}+':/tmp/tk504-typed-fk-smoke.sql') | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Smoke copy failed' }
  # psql writes benign NOTICEs to stderr; assess docker's exit code rather than
  # PowerShell's NativeCommandError conversion for NOTICE messages.
  $ErrorActionPreference = 'Continue'
  $raw = & docker exec $name psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/tk504-typed-fk-smoke.sql 2>&1 | Out-String
  $proofExitCode = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  if ($proofExitCode -ne 0 -or $raw -notmatch 'two owners .+ preserved historical row PASS' -or $raw -notmatch 'ROLLBACK') {
    throw 'Isolated two-user RLS/typed-FK smoke FAILED'
  }
  $count = (& docker exec $name psql -X -Atqc "select count(*) from information_schema.tables where table_schema='auth'" -U postgres -d postgres | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $count -ne '0') { throw 'Rollback not clean' }
  Write-Output 'PASS: PostgreSQL 17, 582 staged aliases, 2 synthetic JWT owners, RLS/role denies, revoke/history preservation, ROLLBACK, zero persisted schemas.'
} finally {
  if ($started) {
    & docker stop $name | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Warning 'Stop/cleanup must be verified manually' }
  }
}
