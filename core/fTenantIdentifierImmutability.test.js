/* fTenantIdentifierImmutability.test.js — MS-F11-01 Security Completion
 * Gate regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v513.sql'), 'utf8');

ok(migratie.includes('NEW.organization_id is distinct from OLD.organization_id') &&
   migratie.includes("raise exception 'organization_id van een membership is niet wijzigbaar"),
  'A1: memberships-trigger blokkeert organization_id-wijziging met een expliciete fout');
ok(migratie.includes('NEW.user_id is distinct from OLD.user_id') &&
   migratie.includes("raise exception 'user_id van een membership is niet wijzigbaar"),
  'A2: memberships-trigger blokkeert user_id-wijziging met een expliciete fout');
ok(migratie.includes('before update on public.memberships') && migratie.includes('trg_memberships_immutable_tenant_ids'),
  'A3: de memberships-trigger is correct gekoppeld als BEFORE UPDATE');

ok(migratie.includes('trg_locations_immutable_org') && migratie.includes('before update on public.locations'),
  'B1: locations heeft een BEFORE UPDATE-trigger tegen organization_id-wijziging');
ok(migratie.includes('trg_teams_immutable_org') && migratie.includes('before update on public.teams'),
  'B2: teams heeft een BEFORE UPDATE-trigger tegen organization_id-wijziging');
ok(migratie.includes('trg_training_groups_immutable_team') && migratie.includes('before update on public.training_groups'),
  'B3: training_groups heeft een BEFORE UPDATE-trigger tegen team_id-wijziging');

['memberships_prevent_tenant_identifier_change', 'prevent_organization_id_change', 'prevent_team_id_change'].forEach(function (fn) {
  ok(new RegExp('revoke execute on function public\\.' + fn + '\\(\\) from anon').test(migratie),
    'C: ' + fn + '() heeft geen EXECUTE-recht voor anon');
});

ok((migratie.match(/set search_path\s*=\s*public/gi) || []).length >= 3,
  'D1: alle drie de trigger-functies hebben een vastgezette search_path');

console.log('fTenantIdentifierImmutability: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
