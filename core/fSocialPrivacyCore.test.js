/* fSocialPrivacyCore.test.js — MS-F9-01 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SP = require(path.join(ROOT, 'core/socialPrivacy.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const connections = [{ follower_id: 'B', followee_id: 'A', status: 'accepted' }];

// ---- A. Golden cases ----
ok(SP.canViewSocialProfile('A', { id: 'A', visibility: 'private' }, [], []) === true, 'A1: eigenaar ziet altijd zichzelf');
ok(SP.canViewSocialProfile('C', { id: 'A', visibility: 'private' }, connections, []) === false, 'A2: vreemde ziet geen private profiel');
ok(SP.canViewSocialProfile('B', { id: 'A', visibility: 'connections' }, connections, []) === true, 'A3: connectie ziet connections-only profiel');
ok(SP.canViewSocialProfile('C', { id: 'A', visibility: 'connections' }, connections, []) === false, 'A4: niet-connectie ziet geen connections-only profiel');
ok(SP.canViewSocialProfile('C', { id: 'A', visibility: 'discoverable' }, [], []) === true, 'A5: iedereen ziet discoverable profiel');
ok(SP.canViewSocialProfile('C', { id: 'A', visibility: 'onbekend' }, [], []) === false, 'A6: onbekende visibility weigert veilig');

// ---- B. Block wint altijd ----
{
  const blocked = [{ blocker_id: 'A', blocked_id: 'B' }];
  ok(SP.canViewSocialProfile('B', { id: 'A', visibility: 'discoverable' }, connections, blocked) === false, 'B1: block overschrijft discoverable');
  ok(SP.canViewSocialProfile('B', { id: 'A', visibility: 'connections' }, connections, blocked) === false, 'B2: block overschrijft connectie');
  const blockedOmgekeerd = [{ blocker_id: 'B', blocked_id: 'A' }];
  ok(SP.canViewSocialProfile('B', { id: 'A', visibility: 'discoverable' }, connections, blockedOmgekeerd) === false, 'B3: block werkt symmetrisch');
}

// ---- C. canViewSharedActivity ----
{
  const activityPublic = { athlete_id: 'A', visibility: 'public' };
  const activityConn = { athlete_id: 'A', visibility: 'connections' };
  ok(SP.canViewSharedActivity('C', activityPublic, [], []) === true, 'C1: publieke activiteit zichtbaar voor iedereen');
  ok(SP.canViewSharedActivity('C', activityConn, connections, []) === false, 'C2: connections-only niet zichtbaar voor vreemde');
  ok(SP.canViewSharedActivity('B', activityConn, connections, []) === true, 'C3: connections-only zichtbaar voor connectie');
  ok(SP.canViewSharedActivity('B', activityConn, connections, [{ blocker_id: 'A', blocked_id: 'B' }]) === false, 'C4: block overschrijft activiteit-zichtbaarheid');
  ok(SP.canViewSharedActivity('C', { athlete_id: 'A' }, [], []) === false, 'C5: ontbrekende visibility weigert veilig');
}

// ---- D. Determinisme ----
{
  const r1 = SP.canViewSocialProfile('B', { id: 'A', visibility: 'connections' }, connections, []);
  const r2 = SP.canViewSocialProfile('B', { id: 'A', visibility: 'connections' }, connections, []);
  ok(r1 === r2, 'D1: herhaalde aanroep geeft identiek resultaat');
}

console.log('fSocialPrivacyCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
