'use strict';
const assert = require('assert');
const CoachAccessCore = require('./coachAccess.js');
const CoachRosterCore = require('./coachRoster.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

const rels = [
  { id: 'r1', coach_user_id: 'coach1', athlete_user_id: 'ath1', status: 'active', consented_at: '2026-01-01T00:00:00Z' },
  { id: 'r2', coach_user_id: 'coach1', athlete_user_id: 'ath2', status: 'pending' },
  { id: 'r3', coach_user_id: 'coach1', athlete_user_id: 'ath3', status: 'revoked' },
  { id: 'r4', coach_user_id: 'coach2', athlete_user_id: 'ath1', status: 'active' } // andere coach, zelfde athlete
];

t('buildRoster: bevat alleen athletes met een ACTIEVE relatie met deze coach', () => {
  const roster = CoachRosterCore.buildRoster('coach1', rels);
  assert.strictEqual(roster.length, 1);
  assert.strictEqual(roster[0].athleteId, 'ath1');
});
t('buildRoster: pending/revoked lekken niet in het roster (adversarial)', () => {
  const roster = CoachRosterCore.buildRoster('coach1', rels);
  assert.strictEqual(roster.some(r => r.athleteId === 'ath2'), false);
  assert.strictEqual(roster.some(r => r.athleteId === 'ath3'), false);
});
t('buildRoster: een andere coach ziet niet dezelfde athlete via een niet-eigen relatie (adversarial cross-coach-check)', () => {
  const roster = CoachRosterCore.buildRoster('coach2', rels);
  assert.strictEqual(roster.length, 1);
  assert.strictEqual(roster[0].athleteId, 'ath1');
  // coach1's roster mag niet groeien doordat coach2 ook een relatie met ath1 heeft
  const roster1 = CoachRosterCore.buildRoster('coach1', rels);
  assert.strictEqual(roster1.length, 1);
});
t('buildRoster: lege array bij geen enkele relatie', () => {
  assert.deepStrictEqual(CoachRosterCore.buildRoster('unknown_coach', rels), []);
});
t('buildRoster: robuust bij niet-array input', () => {
  assert.deepStrictEqual(CoachRosterCore.buildRoster('coach1', null), []);
});

t('athleteOverviewSections: alleen expliciet toegestane secties (default-uit, KERN privacyregel)', () => {
  const scopeRows = [{ relationship_id: 'r1', scope: 'TRAINING_CORE', enabled: true }];
  const sections = CoachRosterCore.athleteOverviewSections('coach1', 'ath1', rels, scopeRows, CoachAccessCore);
  assert.deepStrictEqual(sections, ['TRAINING_CORE']);
});
t('athleteOverviewSections: lege array wanneer geen enkele scope actief is (geen "vergrendeld"-placeholder, echt afwezig)', () => {
  const sections = CoachRosterCore.athleteOverviewSections('coach1', 'ath1', rels, [], CoachAccessCore);
  assert.deepStrictEqual(sections, []);
});
t('athleteOverviewSections: RECOVERY_HEALTH/WOMENS_PERFORMANCE blijven afwezig zonder expliciete scope, zelfs met TRAINING_CORE actief (adversarial)', () => {
  const scopeRows = [{ relationship_id: 'r1', scope: 'TRAINING_CORE', enabled: true }];
  const sections = CoachRosterCore.athleteOverviewSections('coach1', 'ath1', rels, scopeRows, CoachAccessCore);
  assert.strictEqual(sections.indexOf('RECOVERY_HEALTH'), -1);
  assert.strictEqual(sections.indexOf('WOMENS_PERFORMANCE'), -1);
});

t('isInRoster: true voor een athlete in het actieve roster', () => {
  assert.strictEqual(CoachRosterCore.isInRoster('coach1', 'ath1', rels), true);
});
t('isInRoster: false voor een pending athlete (adversarial)', () => {
  assert.strictEqual(CoachRosterCore.isInRoster('coach1', 'ath2', rels), false);
});
t('isInRoster: false voor een revoked athlete (adversarial)', () => {
  assert.strictEqual(CoachRosterCore.isInRoster('coach1', 'ath3', rels), false);
});

console.log(`CoachRosterCore: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
