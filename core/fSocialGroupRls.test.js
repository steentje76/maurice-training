/* fSocialGroupRls.test.js — MS-F9-02 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v504.sql'), 'utf8');

ok(!migratie.includes('references public.organizations') && !migratie.includes('references public.teams'),
  'A1: social_groups bevat geen foreign key naar de commerciële organizations/teams-tabellen');

ok(/create policy social_group_memberships_zelf_joinen[\s\S]{0,100}for insert/i.test(migratie),
  'B1: het lid heeft uitsluitend een INSERT-policy voor het eigen lidmaatschap');
ok(migratie.includes("with check (user_id = auth.uid() and role = 'member')"),
  'B2: de zelf-join-policy dwingt role=\'member\' af');
ok(/create policy social_group_memberships_owner_beheert[\s\S]{0,150}for update/i.test(migratie),
  'B3: uitsluitend een owner-gebonden UPDATE-policy bestaat voor rolwijzigingen');
ok(!/create policy social_group_memberships[\s\S]{0,80}for all/i.test(migratie),
  'B4: geen enkele FOR ALL-policy op social_group_memberships');

ok(migratie.includes('social_is_group_owner') && migratie.includes('social_is_group_member'),
  'C1: beide SECURITY DEFINER-helperfuncties bestaan');
ok(/revoke execute on function public\.social_is_group_member\(uuid, uuid\) from anon/i.test(migratie) &&
   /revoke execute on function public\.social_is_group_owner\(uuid, uuid\) from anon/i.test(migratie),
  'C2: anon heeft expliciet geen EXECUTE-recht op beide helperfuncties');
ok((migratie.match(/set search_path\s*=\s*public/gi) || []).length >= 2,
  'C3: beide functies hebben een vastgezette search_path');

ok(/social_groups_lezen[\s\S]{0,50}using\s*\(\s*auth\.uid\(\) is not null/i.test(migratie),
  'D1: social_groups_lezen vereist auth.uid() IS NOT NULL');

console.log('fSocialGroupRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
