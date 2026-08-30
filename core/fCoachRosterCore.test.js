/* fCoachRosterCore.test.js — MS-F10-02 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CR = require(path.join(ROOT, 'core/coachRoster.js'));
const CA = require(path.join(ROOT, 'core/coachAccess.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const rels = [
  { id: 'R1', coach_user_id: 'C1', athlete_user_id: 'A1', status: 'active' },
  { id: 'R2', coach_user_id: 'C1', athlete_user_id: 'A2', status: 'pending' },
  { id: 'R3', coach_user_id: 'C1', athlete_user_id: 'A4', status: 'revoked' },
  { id: 'R5', coach_user_id: 'C2', athlete_user_id: 'A3', status: 'active' }
];

{
  const roster = CR.buildRoster('C1', rels);
  ok(roster.length === 1, 'A1: roster van C1 bevat exact 1 athlete');
  ok(roster[0].athleteId === 'A1', 'A2: de juiste athlete staat in de roster');
  ok(CR.isInRoster('C1', 'A2', rels) === false, 'A3: pending relatie -> niet in roster');
  ok(CR.isInRoster('C1', 'A4', rels) === false, 'A4: revoked relatie -> niet in roster');
}

ok(CR.isInRoster('C1', 'A3', rels) === false, 'B1: athlete van een andere coach staat niet in C1 se roster');
{
  const roster = CR.buildRoster('C2', rels);
  ok(roster.length === 1 && roster[0].athleteId === 'A3', 'B2: elke coach ziet uitsluitend de eigen roster');
}

ok(CR.buildRoster('C1', []).length === 0, 'C1: geen relaties -> lege roster');
ok(CR.buildRoster('C1', null).length === 0, 'C2: ontbrekende input -> lege roster, geen crash');

{
  const scopesAlleenTraining = [{ relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true }];
  const secties = CR.athleteOverviewSections('C1', 'A1', rels, scopesAlleenTraining, CA);
  ok(secties.length === 1 && secties[0] === 'TRAINING_CORE', 'D1: uitsluitend TRAINING_CORE aanwezig');

  const geenSecties = CR.athleteOverviewSections('C1', 'A1', rels, [], CA);
  ok(geenSecties.length === 0, 'D2: geen enkele scope aan -> volledig lege sectielijst');

  const scopesAlDrie = [
    { relationship_id: 'R1', scope: 'TRAINING_CORE', enabled: true },
    { relationship_id: 'R1', scope: 'RECOVERY_HEALTH', enabled: true },
    { relationship_id: 'R1', scope: 'WOMENS_PERFORMANCE', enabled: true }
  ];
  const alleSecties = CR.athleteOverviewSections('C1', 'A1', rels, scopesAlDrie, CA);
  ok(alleSecties.length === 3, 'D3: alle drie scopes aan -> alle drie secties aanwezig');
}

ok(CR.athleteOverviewSections('C1', 'A3', rels, [{ relationship_id: 'R5', scope: 'TRAINING_CORE', enabled: true }], CA).length === 0,
  'E1: geen enkele sectie voor een athlete waarmee C1 geen relatie heeft');

console.log('fCoachRosterCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
