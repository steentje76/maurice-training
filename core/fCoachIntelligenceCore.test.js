/* fCoachIntelligenceCore.test.js — MS-F10-04 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CI = require(path.join(ROOT, 'core/coachIntelligence.js'));
const CA = require(path.join(ROOT, 'core/coachAccess.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const rels = [{ id: 'R1', coach_user_id: 'C1', athlete_user_id: 'A1', status: 'active' }];
const outputs = { adherence: { percentage: 85 }, plateau: { detected: false }, readiness: { score: 70 }, womensPerformance: { phase: 'luteal' } };

{
  const p = CI.buildAthleteSummaryPayload('C1', 'A1', rels, [], outputs, CA);
  ok(Object.keys(p.sections).length === 0, 'A1: zonder enige scope bevat de payload geen enkele sectie');
  ok(CI.hasAnyContent(p) === false, 'A2: hasAnyContent detecteert correct een lege payload');
}

{
  const scopes = [{ relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true }];
  const p = CI.buildAthleteSummaryPayload('C1', 'A1', rels, scopes, outputs, CA);
  ok(p.sections.adherence !== undefined && p.sections.plateau !== undefined, 'B1: TRAINING_CORE geeft adherence en plateau');
  ok(p.sections.readiness === undefined, 'B2: TRAINING_CORE geeft geen readiness');
  ok(p.sections.womensPerformance === undefined, 'B3: TRAINING_CORE geeft geen Womens Performance');
}

{
  const scopes = [{ relationship_id: 'R1', scope: 'RECOVERY_HEALTH', enabled: true }];
  const p = CI.buildAthleteSummaryPayload('C1', 'A1', rels, scopes, outputs, CA);
  ok(p.sections.readiness !== undefined, 'C1: RECOVERY_HEALTH geeft readiness');
  ok(p.sections.adherence === undefined, 'C2: RECOVERY_HEALTH alleen geeft geen adherence');
}

{
  const scopes = [
    { relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true },
    { relationship_id: 'R1', scope: 'RECOVERY_HEALTH', enabled: true }
  ];
  const p = CI.buildAthleteSummaryPayload('C1', 'A1', rels, scopes, outputs, CA);
  ok(p.sections.womensPerformance === undefined, 'D1: Womens Performance blijft afwezig, zelfs met beide andere scopes actief');
}
{
  const scopes = [
    { relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true },
    { relationship_id: 'R1', scope: 'RECOVERY_HEALTH', enabled: true },
    { relationship_id: 'R1', scope: 'WOMENS_PERFORMANCE', enabled: true }
  ];
  const p = CI.buildAthleteSummaryPayload('C1', 'A1', rels, scopes, outputs, CA);
  ok(p.sections.womensPerformance !== undefined, 'D2: Womens Performance verschijnt uitsluitend met de eigen, expliciete scope');
}

{
  const geenRelatie = [];
  const scopes = [{ relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true }];
  const p = CI.buildAthleteSummaryPayload('C1', 'A1', geenRelatie, scopes, outputs, CA);
  ok(Object.keys(p.sections).length === 0, 'E1: geen relatie -> lege payload, ondanks een bestaande scope-rij');
}
{
  const revoked = [{ id: 'R1', coach_user_id: 'C1', athlete_user_id: 'A1', status: 'revoked' }];
  const scopes = [{ relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true }];
  const p = CI.buildAthleteSummaryPayload('C1', 'A1', revoked, scopes, outputs, CA);
  ok(Object.keys(p.sections).length === 0, 'E2: revoked relatie -> lege payload');
}

{
  const scopes = [{ relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true }];
  const p = CI.buildAthleteSummaryPayload('C1', 'A1', rels, scopes, {}, CA);
  ok(Object.keys(p.sections).length === 0, 'F1: geen canonieke outputs beschikbaar -> lege payload, geen verzonnen data');
}

console.log('fCoachIntelligenceCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
