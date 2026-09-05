'use strict';
const assert = require('assert');
const Ingest = require('./nutritionIngestService.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

// -- resolveIngestDecision ----------------------------------------------------
t('resolveIngestDecision: REJECT bij onvolledige candidate (geen naam)', () => {
  const r = Ingest.resolveIngestDecision({ name: null }, null);
  assert.strictEqual(r.action, 'REJECT');
});
t('resolveIngestDecision: CREATE_NEW zonder bestaand lokaal product', () => {
  const r = Ingest.resolveIngestDecision({ name: 'Nutella' }, null);
  assert.strictEqual(r.action, 'CREATE_NEW');
});
t('resolveIngestDecision: KEEP_EXISTING_VERIFIED, nooit overschrijven (KERN PO-regel 10)', () => {
  const r = Ingest.resolveIngestDecision({ name: 'Nutella' }, { id: 'p1', verification_state: 'VERIFIED' });
  assert.strictEqual(r.action, 'KEEP_EXISTING_VERIFIED');
});
t('resolveIngestDecision: KEEP_EXISTING_USER_PRIVATE, geen automatische koppeling (adversarial)', () => {
  const r = Ingest.resolveIngestDecision({ name: 'Nutella' }, { id: 'p1', verification_state: 'USER_PRIVATE' });
  assert.strictEqual(r.action, 'KEEP_EXISTING_USER_PRIVATE');
});
t('resolveIngestDecision: ADD_REVISION bij COMMUNITY_UNVERIFIED (additief, geen UPDATE-in-place)', () => {
  const r = Ingest.resolveIngestDecision({ name: 'Nutella' }, { id: 'p1', verification_state: 'COMMUNITY_UNVERIFIED' });
  assert.strictEqual(r.action, 'ADD_REVISION');
});
t('resolveIngestDecision: ADD_REVISION bij COMMUNITY_REVIEWED (nooit stil degraderen, adversarial)', () => {
  const r = Ingest.resolveIngestDecision({ name: 'Nutella' }, { id: 'p1', verification_state: 'COMMUNITY_REVIEWED' });
  assert.strictEqual(r.action, 'ADD_REVISION');
});

// -- detectConflict (identity, niet "changed nutrients") --------------------
t('detectConflict: false wanneer alleen nutrients wijzigen (dat is een normale revisie, geen conflict)', () => {
  const r = Ingest.detectConflict({ name: 'Nutella' }, { name: 'Nutella' });
  assert.strictEqual(r.conflict, false);
});
t('detectConflict: true bij een echte identity-mismatch (adversarial, KERN)', () => {
  const r = Ingest.detectConflict({ name: 'Nutella' }, { name: 'Coca-Cola' });
  assert.strictEqual(r.conflict, true);
  assert.strictEqual(r.reason, 'IDENTITY_MISMATCH');
});
t('detectConflict: case/whitespace-ongevoelig (geen vals-positief conflict door triviale verschillen)', () => {
  const r = Ingest.detectConflict({ name: 'Nutella' }, { name: '  nutella  ' });
  assert.strictEqual(r.conflict, false);
});
t('detectConflict: false zonder voldoende data om te vergelijken (fail-safe, geen gok)', () => {
  assert.strictEqual(Ingest.detectConflict(null, { name: 'X' }).conflict, false);
  assert.strictEqual(Ingest.detectConflict({ name: 'X' }, null).conflict, false);
});

// -- buildNutrientSnapshot (historische reproduceerbaarheid, KERN, Fase 7) --
t('buildNutrientSnapshot: bevriest exacte waarden + bronversie', () => {
  const nv = { status: 'valid', basis: 'PER_100G', energy_kcal: 539, protein_g: 6.3, carbohydrate_g: 57.5, fat_g: 30.9, fiber_g: null, sugar_g: 56.3, saturated_fat_g: 10.6, sodium_mg: 43 };
  const snap = Ingest.buildNutrientSnapshot(nv, '105');
  assert.strictEqual(snap.energy_kcal, 539);
  assert.strictEqual(snap.snapshot_source_version, '105');
});
t('buildNutrientSnapshot: null bij ongeldige/ontbrekende nutrientValues (geen leeg snapshot als geldig presenteren)', () => {
  assert.strictEqual(Ingest.buildNutrientSnapshot(null, '1'), null);
  assert.strictEqual(Ingest.buildNutrientSnapshot({ status: 'UNKNOWN_BASIS' }, '1'), null);
});
t('buildNutrientSnapshot: UNKNOWN-nutrient (null) blijft null in de snapshot, wordt nooit 0 (UNKNOWN != 0)', () => {
  const nv = { status: 'valid', basis: 'PER_100G', energy_kcal: 100, protein_g: null };
  const snap = Ingest.buildNutrientSnapshot(nv, null);
  assert.strictEqual(snap.protein_g, null);
});

// -- isSnapshotStillValid (informatief, wijzigt nooit de snapshot zelf) -----
t('isSnapshotStillValid: true wanneer waarden nog exact overeenkomen', () => {
  const snap = { energy_kcal: 539, protein_g: 6.3, carbohydrate_g: 57.5, fat_g: 30.9 };
  const current = { status: 'valid', energy_kcal: 539, protein_g: 6.3, carbohydrate_g: 57.5, fat_g: 30.9 };
  assert.strictEqual(Ingest.isSnapshotStillValid(snap, current), true);
});
t('isSnapshotStillValid: false wanneer een OFF-herimport de waarde heeft gewijzigd (KERN, refresh-detectie)', () => {
  const snap = { energy_kcal: 539, protein_g: 6.3, carbohydrate_g: 57.5, fat_g: 30.9 };
  const current = { status: 'valid', energy_kcal: 545, protein_g: 6.3, carbohydrate_g: 57.5, fat_g: 30.9 }; // energie gewijzigd
  assert.strictEqual(Ingest.isSnapshotStillValid(snap, current), false);
});
t('isSnapshotStillValid: null bij ontbrekende input (geen gok)', () => {
  assert.strictEqual(Ingest.isSnapshotStillValid(null, {}), null);
});
t('isSnapshotStillValid: het aanroepen van deze functie wijzigt NOOIT de oorspronkelijke snapshot (adversarial, puurheid-check)', () => {
  const snap = { energy_kcal: 539, protein_g: 6.3, carbohydrate_g: 57.5, fat_g: 30.9 };
  const snapCopy = JSON.parse(JSON.stringify(snap));
  Ingest.isSnapshotStillValid(snap, { status: 'valid', energy_kcal: 999, protein_g: 1, carbohydrate_g: 1, fat_g: 1 });
  assert.deepStrictEqual(snap, snapCopy); // ongewijzigd na de aanroep
});

console.log(`NutritionIngestService: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
