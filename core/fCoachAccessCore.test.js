/* fCoachAccessCore.test.js — MS-F10-01 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CA = require(path.join(ROOT, 'core/coachAccess.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const relActive = [{ id: 'R1', coach_user_id: 'C1', athlete_user_id: 'A1', status: 'active' }];
const relPending = [{ id: 'R2', coach_user_id: 'C1', athlete_user_id: 'A1', status: 'pending' }];
const relRevoked = [{ id: 'R3', coach_user_id: 'C1', athlete_user_id: 'A1', status: 'revoked' }];

ok(CA.hasScope('C1', 'A1', 'TRAINING_CORE', [], []) === false, '1: coach zonder relationship krijgt geen enkele scope');

ok(CA.hasScope('C1', 'A1', 'TRAINING_CORE', relPending, [{ relationship_id: 'R2', scope: 'TRAINING_CORE', enabled: true }]) === false,
  '2: pending relationship geeft geen toegang');

ok(CA.hasScope('C1', 'A1', 'TRAINING_CORE', relRevoked, [{ relationship_id: 'R3', scope: 'TRAINING_CORE', enabled: true }]) === false,
  '3: revoked relationship geeft geen toegang');

{
  const scopes = [{ relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true }];
  ok(CA.canViewTrainingCore('C1', 'A1', relActive, scopes) === true, '4a: active + TRAINING_CORE geeft training-toegang');
  ok(CA.canViewRecoveryHealth('C1', 'A1', relActive, scopes) === false, '4b: TRAINING_CORE alleen geeft geen recovery-toegang');
  ok(CA.canViewWomensPerformance('C1', 'A1', relActive, scopes) === false, '4c: TRAINING_CORE alleen geeft geen Womens Performance-toegang');
}

{
  const scopesUit = [{ relationship_id: 'R1', scope: 'RECOVERY_HEALTH', enabled: false }];
  ok(CA.canViewRecoveryHealth('C1', 'A1', relActive, scopesUit) === false, '5: RECOVERY_HEALTH=false geeft geen toegang');
  const scopesAan = [{ relationship_id: 'R1', scope: 'RECOVERY_HEALTH', enabled: true }];
  ok(CA.canViewRecoveryHealth('C1', 'A1', relActive, scopesAan) === true, '6: RECOVERY_HEALTH=true geeft toegang');
}

{
  const alleAnderenAan = [
    { relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true },
    { relationship_id: 'R1', scope: 'RECOVERY_HEALTH', enabled: true }
  ];
  ok(CA.canViewWomensPerformance('C1', 'A1', relActive, alleAnderenAan) === false,
    '7: WOMENS_PERFORMANCE blijft geweigerd, zelfs met TRAINING_CORE + RECOVERY_HEALTH beide aan');
  const metWomensAan = alleAnderenAan.concat([{ relationship_id: 'R1', scope: 'WOMENS_PERFORMANCE', enabled: true }]);
  ok(CA.canViewWomensPerformance('C1', 'A1', relActive, metWomensAan) === true,
    '8: WOMENS_PERFORMANCE geeft uitsluitend toegang via de eigen, expliciete scope');
}

ok(CA.hasScope('C1', 'B1', 'TRAINING_CORE', relActive, [{ relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true }]) === false,
  '9: geen relatie tussen Coach A en Athlete B -> geen toegang');

ok(CA.canActivateRelationship('C1', { athlete_user_id: 'A1', status: 'pending' }) === false,
  '10: de coach kan een relatie niet zelf activeren');
ok(CA.canActivateRelationship('A1', { athlete_user_id: 'A1', status: 'pending' }) === true,
  '10b: de athlete kan de eigen relatie wel activeren');
ok(CA.canModifyScope('C1', { athlete_user_id: 'A1' }) === false, '11: de coach kan eigen permissions niet vergroten');
ok(CA.canModifyScope('A1', { athlete_user_id: 'A1' }) === true, '11b: uitsluitend de athlete mag scopes wijzigen');

ok(CA.canRevokeRelationship('A1', { coach_user_id: 'C1', athlete_user_id: 'A1', status: 'active' }) === true,
  '12: de athlete kan de relatie intrekken');
ok(CA.canRevokeRelationship('C1', { coach_user_id: 'C1', athlete_user_id: 'A1', status: 'active' }) === true,
  '12b: de coach kan de relatie ook zelf beëindigen');
{
  const relNaRevoke = [{ id: 'R1', coach_user_id: 'C1', athlete_user_id: 'A1', status: 'revoked' }];
  ok(CA.canViewTrainingCore('C1', 'A1', relNaRevoke, [{ relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true }]) === false,
    '13: na revoke stopt toegang direct');
}

{
  const scopes = [{ relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true }];
  const r1 = CA.canViewTrainingCore('C1', 'A1', relActive, scopes);
  const r2 = CA.canViewTrainingCore('C1', 'A1', relActive, scopes);
  ok(r1 === r2, 'D1: herhaalde aanroep geeft identiek resultaat');
}

ok(CA.hasScope('C1', 'A1', 'ONBEKENDE_SCOPE', relActive, [{ relationship_id: 'R1', scope: 'ONBEKENDE_SCOPE', enabled: true }]) === false,
  'E1: een niet-canonieke scope-naam wordt altijd geweigerd');

console.log('fCoachAccessCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
