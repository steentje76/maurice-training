/* fEquipmentCore.test.js — MS-F11-02 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const EC = require(path.join(ROOT, 'core/equipmentCore.js'));
const OC = require(path.join(ROOT, 'core/organizationCore.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const orgs = [{ id: 'O1', owner_user_id: 'U1' }];
const mems = [
  { user_id: 'U2', organization_id: 'O1', role: 'staff', status: 'active' },
  { user_id: 'U3', organization_id: 'O1', role: 'member', status: 'active' }
];
const orgItem = { id: 'E1', organization_id: 'O1', gym_id: null, user_id: null };
const gymItem = { id: 'E2', organization_id: null, gym_id: 'gym-1', user_id: null };
const persItem = { id: 'E3', organization_id: null, gym_id: null, user_id: 'U5' };
const leegItem = { id: 'E4', organization_id: null, gym_id: null, user_id: null };

ok(EC.resolveOwnerContext(orgItem) === 'organization', 'A1: organization-context correct herkend');
ok(EC.resolveOwnerContext(gymItem) === 'gym', 'A2: gym-context correct herkend');
ok(EC.resolveOwnerContext(persItem) === 'personal', 'A3: persoonlijke context correct herkend');
ok(EC.resolveOwnerContext(leegItem) === null, 'A4: item zonder enige context geeft null');
ok(EC.resolveOwnerContext(null) === null, 'A5: ontbrekend item geeft veilig null');

ok(EC.canManageEquipment('U2', orgItem, mems, orgs, OC) === true, 'B1: staff mag organization-equipment beheren');
ok(EC.canManageEquipment('U3', orgItem, mems, orgs, OC) === false, 'B2: gewoon member mag niet beheren');
ok(EC.canManageEquipment('U1', orgItem, mems, orgs, OC) === true, 'B3: de organization-owner mag altijd beheren');
ok(EC.canManageEquipment('U9', orgItem, mems, orgs, OC) === false, 'B4: een willekeurige gebruiker mag niet beheren');

ok(EC.canManageEquipment('U2', gymItem, mems, orgs, OC) === false, 'C1: gym-context geeft nooit beheertoegang via deze module');

ok(EC.canManageEquipment('U5', persItem, mems, orgs, OC) === true, 'D1: de eigenaar mag het eigen item beheren');
ok(EC.canManageEquipment('U6', persItem, mems, orgs, OC) === false, 'D2: een ander mag een persoonlijk item niet beheren');

ok(EC.canViewEquipment('U3', orgItem, mems, orgs, OC) === true, 'E1: een gewoon member mag organization-equipment wel bekijken');
ok(EC.canViewEquipment('U9', orgItem, mems, orgs, OC) === false, 'E2: een niet-lid mag niet bekijken');
ok(EC.canViewEquipment('U5', persItem, mems, orgs, OC) === true, 'E3: de eigenaar mag het eigen item bekijken');
ok(EC.canViewEquipment('U6', persItem, mems, orgs, OC) === false, 'E4: een ander mag een persoonlijk item niet bekijken');

console.log('fEquipmentCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
