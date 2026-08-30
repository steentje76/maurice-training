/* fSocialGroupCore.test.js — MS-F9-02 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SG = require(path.join(ROOT, 'core/socialGroup.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const memberships = [
  { user_id: 'A', group_id: 'G1', status: 'active', role: 'owner' },
  { user_id: 'B', group_id: 'G1', status: 'active', role: 'member' }
];

ok(SG.canViewGroup('C', { id: 'G1', join_mode: 'open' }, memberships) === true, 'A1: open groep zichtbaar voor niet-lid');
ok(SG.canViewGroup('C', { id: 'G1', join_mode: 'invite_only' }, memberships) === false, 'A2: invite_only groep niet zichtbaar voor niet-lid');
ok(SG.canViewGroup('B', { id: 'G1', join_mode: 'invite_only' }, memberships) === true, 'A3: lid ziet de groep altijd');

ok(SG.canJoinDirectly({ join_mode: 'open' }) === true, 'B1: open groep kan direct gejoind worden');
ok(SG.canJoinDirectly({ join_mode: 'invite_only' }) === false, 'B2: invite_only groep kan niet direct gejoind worden');

ok(SG.canManageMembers('B', 'G1', memberships) === false, 'C1: een gewoon lid mag geen leden beheren');
ok(SG.canManageMembers('A', 'G1', memberships) === true, 'C2: de owner mag leden beheren');
ok(SG.canManageMembers('D', 'G1', memberships) === false, 'C3: een niet-lid mag nooit leden beheren');

{
  const memershipsMetInactief = memberships.concat([{ user_id: 'E', group_id: 'G1', status: 'removed', role: 'member' }]);
  ok(SG.isMember('E', 'G1', memershipsMetInactief) === false, 'D1: een verwijderd lid telt niet als lid');
}

console.log('fSocialGroupCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
