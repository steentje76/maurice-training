/* fSocialSharingCore.test.js — MS-F9-03 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SS = require(path.join(ROOT, 'core/socialSharing.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

{
  const poging = {
    sport: 'hardlopen', title: 'Ochtendrun', durationSeconds: 1800,
    hrv: 65, rhr: 52, sleepHours: 7.5, readiness: 82, recoveryScore: 90,
    bodyweight: 78, bodyFatPct: 15, cyclusFase: 'luteaal', symptomen: { cramps: 4 },
    zwangerschap: true, medicalNote: 'privé', coachPrivateNote: 'geheim', exactGpsLocation: '52.1,5.1'
  };
  const output = SS.sanitizeShare(poging);
  ok(output.sport === 'hardlopen' && output.title === 'Ochtendrun' && output.durationSeconds === 1800,
    'A1: toegestane velden blijven correct behouden');
  ['hrv', 'rhr', 'sleepHours', 'readiness', 'recoveryScore', 'bodyweight', 'bodyFatPct',
   'cyclusFase', 'symptomen', 'zwangerschap', 'medicalNote', 'coachPrivateNote', 'exactGpsLocation'
  ].forEach(function (f) {
    ok(output[f] === undefined, 'A2: veld "' + f + '" is altijd afwezig in de output');
  });
  ok(Object.keys(output).length === 3, 'A3: uitsluitend de drie toegestane velden staan in de output');
}

ok(Object.keys(SS.sanitizeShare(null)).length === 0, 'B1: null-input geeft een lege, veilige output');
ok(Object.keys(SS.sanitizeShare({})).length === 0, 'B2: lege input geeft een lege output');

{
  const connections = [{ follower_id: 'B', followee_id: 'A', status: 'accepted' }];
  ok(SS.canViewSharedActivity('C', { athlete_id: 'A', visibility: 'public' }, [], []) === true, 'C1: publieke activiteit zichtbaar voor iedereen');
  ok(SS.canViewSharedActivity('C', { athlete_id: 'A', visibility: 'connections' }, connections, []) === false, 'C2: connections-only niet zichtbaar voor vreemde');
  ok(SS.canViewSharedActivity('B', { athlete_id: 'A', visibility: 'connections' }, connections, []) === true, 'C3: connections-only zichtbaar voor connectie');
  const blocked = [{ blocker_id: 'A', blocked_id: 'B' }];
  ok(SS.canViewSharedActivity('B', { athlete_id: 'A', visibility: 'public' }, connections, blocked) === false, 'C4: block overschrijft zelfs publieke zichtbaarheid');
}

ok(SS.canDeleteShare('A', { athlete_id: 'A' }) === true, 'D1: de atleet zelf mag de eigen share verwijderen');
ok(SS.canDeleteShare('B', { athlete_id: 'A' }) === false, 'D2: een ander mag de share niet verwijderen');

console.log('fSocialSharingCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
