'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const migration=path.join(__dirname,'..','supabase','migrations','20261107191701_tk504_movekit_v2_media_grants.sql');
const sql=fs.readFileSync(migration,'utf8').toLowerCase();
const checks=[
 ['dedicated grants table',/create table if not exists public\.movekit_media_grants/],
 ['identity FK',/user_id uuid not null references auth\.users\(id\)/],
 ['scoped entitlement',/check \(scope = 'movekit_v2'\)/],
 ['inactive default',/active boolean not null default false/],
 ['review reference',/grant_reference text not null/],
 ['review evidence format',/tk504-\[0-9\]/],
 ['row security enabled',/alter table public\.movekit_media_grants enable row level security/],
 ['user rights revoked',/revoke all on table public\.movekit_media_grants from public, anon, authenticated/],
 ['server read only',/grant select on table public\.movekit_media_grants to service_role/],
 ['service role write explicitly revoked',/revoke insert, update, delete, truncate, references, trigger\s+on table public\.movekit_media_grants from service_role/]
];
for(const [name,re] of checks)assert.match(sql,re,name);
assert.doesNotMatch(sql,/grant\s+(?:all|insert|update|delete)\s+on\s+table\s+public\.movekit_media_grants\s+to\s+(?:authenticated|anon)/,'No browser writes');
assert.doesNotMatch(sql,/create policy\s+/,'No public grant read policy');
console.log('TK504 media grant migration: 12 fail-closed/static schema checks PASS; migration NOT applied');
