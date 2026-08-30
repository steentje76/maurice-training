/* fOrganizationRls.test.js — MS-F11-01 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v512.sql'), 'utf8');

ok(!/using\s*\(\s*true\s*\)/i.test(migratie), 'A1: geen enkele policy gebruikt een blanco USING (true)-shortcut');

['teams_manage_staff', 'training_groups_manage_staff', 'locations_manage_staff'].forEach(function (naam) {
  ok(new RegExp('create policy ' + naam + '[\\s\\S]{0,200}org_has_role\\([\\s\\S]{0,80}staff').test(migratie),
    'B: ' + naam + ' vereist een staff-rol via org_has_role()');
});

ok(migratie.includes('memberships_owner_manages_others') && migratie.includes('user_id <> auth.uid()'),
  'C1: de promotie-policy sluit expliciet de eigen rij van de aanroeper uit');
{
  const delen = migratie.split('memberships_owner_manages_others');
  const laatsteDeel = delen[delen.length - 1] || '';
  ok(laatsteDeel.indexOf('owner_user_id = auth.uid()') !== -1,
    'C2: uitsluitend de organization-owner mag deze promotie-policy gebruiken');
}

ok(migratie.includes('revoke execute on function public.org_has_role(text, text[]) from anon'),
  'D1: org_has_role() heeft geen EXECUTE-recht voor anon');
ok(migratie.includes('set search_path = public'), 'D2: org_has_role() heeft een vastgezette search_path');

ok(migratie.includes('organizations_insert_as_owner') && migratie.includes('owner_user_id = auth.uid()'),
  'E1: organisaties aanmaken vereist dat de aanmaker zichzelf als owner registreert');

ok(migratie.includes('organization_id text not null references public.organizations(id)'),
  'F1: locations heeft een verplichte, correcte FK naar organizations');

console.log('fOrganizationRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
