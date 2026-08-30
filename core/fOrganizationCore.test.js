/* fOrganizationCore.test.js — MS-F11-01 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OC = require(path.join(ROOT, 'core/organizationCore.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const orgs = [{ id: 'O1', owner_user_id: 'U1' }, { id: 'O2', owner_user_id: 'U9' }];
const mems = [
  { user_id: 'U2', organization_id: 'O1', role: 'staff', status: 'active' },
  { user_id: 'U3', organization_id: 'O1', role: 'member', status: 'active' },
  { user_id: 'U4', organization_id: 'O1', role: 'staff', status: 'removed' }
];

ok(OC.hasRole('U1', 'O1', OC.STAFF_ROLES, mems, orgs) === true, 'A1: de owner heeft altijd de staff-rol');
ok(OC.hasRole('U2', 'O1', OC.STAFF_ROLES, mems, orgs) === true, 'A2: een actief staff-lid heeft de staff-rol');
ok(OC.hasRole('U3', 'O1', OC.STAFF_ROLES, mems, orgs) === false, 'A3: een gewoon member heeft geen staff-rol');
ok(OC.hasRole('U5', 'O1', OC.STAFF_ROLES, mems, orgs) === false, 'A4: een willekeurige, niet-gerelateerde gebruiker heeft geen rol');
ok(OC.hasRole('U4', 'O1', OC.STAFF_ROLES, mems, orgs) === false, 'A5: een removed lidmaatschap telt niet mee');
ok(OC.hasRole('U2', 'O2', OC.STAFF_ROLES, mems, orgs) === false, 'A6: cross-organisatie: staff van O1 heeft geen rol in O2');

ok(OC.canManageStaff('U2', 'O1', mems, orgs) === true, 'B1: canManageStaff correct voor staff-lid');
ok(OC.canManageStaff('U3', 'O1', mems, orgs) === false, 'B2: canManageStaff correct geweigerd voor gewoon member');

ok(OC.canSelfJoin('member') === true, 'C1: zelf-join als member is toegestaan');
['owner', 'admin', 'staff'].forEach(function (r) {
  ok(OC.canSelfJoin(r) === false, 'C2: zelf-join als "' + r + '" is nooit toegestaan');
});

ok(OC.canPromoteOther('U1', 'U3', 'O1', orgs) === true, 'D1: de owner mag een ander lid promoveren');
ok(OC.canPromoteOther('U1', 'U1', 'O1', orgs) === false, 'D2: de owner mag zichzelf niet promoveren via deze route');
ok(OC.canPromoteOther('U3', 'U4', 'O1', orgs) === false, 'D3: een gewoon lid mag nooit een ander lid promoveren');
ok(OC.canPromoteOther('U9', 'U3', 'O1', orgs) === false, 'D4: de owner van een andere organisatie mag geen leden van O1 promoveren');

console.log('fOrganizationCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
