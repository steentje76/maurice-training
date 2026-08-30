/* fMembershipsSelfElevationFix.test.js — F11 baseline-hotfix regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v511.sql'), 'utf8');

ok(migratie.includes("role = 'member'") && migratie.includes('memberships_insert_own'),
  'A1: de insert-policy beperkt zelf-insert tot role=member, tenzij owner-uitzondering');
ok(migratie.includes('o.owner_user_id = auth.uid()'),
  'A2: de owner-bootstrap-uitzondering verwijst naar organizations.owner_user_id');

{
  const delen = migratie.split('memberships_update_own');
  const updateBlok = delen[delen.length - 1] || '';
  ok(/using\s*\([\s\S]{0,150}owner_user_id = auth\.uid\(\)/i.test(updateBlok),
    'B1: de update-policy vereist owner_user_id = auth.uid()');
}

ok(!/with check\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)\s*;/i.test(migratie),
  'C1: geen enkele policy staat nog een kale (auth.uid()=user_id)-check toe zonder aanvullende voorwaarde');

console.log('fMembershipsSelfElevationFix: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
