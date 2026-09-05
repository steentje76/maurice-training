'use strict';
const assert = require('assert');
const Bridge = require('./nutritionLabelIngestBridge.js');
const MultiSource = require('./nutritionMultiSourceVerification.js');
const IngestService = require('./nutritionIngestService.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

var deps = { multiSourceVerification: MultiSource, ingestService: IngestService };

t('observationsToFlatNutrients: converteert normalized_value correct, UNKNOWN blijft null', () => {
  var flat = Bridge.observationsToFlatNutrients({
    energy_kcal: { normalized_value: 539 },
    protein_g: { normalized_value: null }
  });
  assert.strictEqual(flat.energy_kcal, 539);
  assert.strictEqual(flat.protein_g, null);
});
t('observationsToFlatNutrients: null bij ontbrekende observaties (adversarial)', () => {
  assert.strictEqual(Bridge.observationsToFlatNutrients(null), null);
});

t('processLabelScanAgainstExisting: OCR_FAILED wordt correct doorgegeven', () => {
  var r = Bridge.processLabelScanAgainstExisting({ status: 'OCR_FAILED' }, null, null, deps);
  assert.strictEqual(r.status, 'OCR_FAILED');
});
t('processLabelScanAgainstExisting: REJECT bij een volledig onbekend product zonder naam (VEILIG -- OCR haalt geen productnaam uit de tekst, geen naam verzinnen conform de opdracht)', () => {
  var ocr = { status: 'OK', basis: 'PER_100G', observations: { energy_kcal: { normalized_value: 539 } } };
  var r = Bridge.processLabelScanAgainstExisting(ocr, null, null, deps);
  assert.strictEqual(r.comparison, null);
  assert.strictEqual(r.hasConflict, false);
  assert.strictEqual(r.ingestDecision.action, 'REJECT'); // geen naam -> terecht geweigerd, geen gok
});
t('processLabelScanAgainstExisting: CREATE_NEW zodra de gebruiker expliciet een naam bevestigt voor een nieuw product (nooit een naam verzinnen)', () => {
  var ocr = { status: 'OK', basis: 'PER_100G', observations: { energy_kcal: { normalized_value: 539 } } };
  var r = Bridge.processLabelScanAgainstExisting(ocr, null, null, deps, 'Door gebruiker bevestigd product');
  assert.strictEqual(r.ingestDecision.action, 'CREATE_NEW');
});
t('processLabelScanAgainstExisting: MATCH bij overeenkomende waarden (KERN)', () => {
  var ocr = { status: 'OK', basis: 'PER_100G', observations: { energy_kcal: { normalized_value: 539 }, protein_g: { normalized_value: 6.3 } } };
  var existing = { energy_kcal: 539, protein_g: 6.3 };
  var r = Bridge.processLabelScanAgainstExisting(ocr, { name: 'Test', verification_state: 'COMMUNITY_UNVERIFIED' }, existing, deps);
  assert.strictEqual(r.comparison.fields.energy_kcal, 'MATCH');
  assert.strictEqual(r.hasConflict, false);
});
t('processLabelScanAgainstExisting: CONFLICT bij afwijkende waarden (KERN)', () => {
  var ocr = { status: 'OK', basis: 'PER_100G', observations: { protein_g: { normalized_value: 6.3 } } };
  var existing = { protein_g: 15.0 }; // duidelijk afwijkend
  var r = Bridge.processLabelScanAgainstExisting(ocr, { name: 'Test', verification_state: 'COMMUNITY_UNVERIFIED' }, existing, deps);
  assert.strictEqual(r.comparison.fields.protein_g, 'CONFLICT');
  assert.strictEqual(r.hasConflict, true);
});
t('processLabelScanAgainstExisting: VERIFIED blijft beschermd, ook bij conflict (KERN precedence)', () => {
  var ocr = { status: 'OK', basis: 'PER_100G', observations: { protein_g: { normalized_value: 6.3 } } };
  var existing = { protein_g: 15.0 };
  var r = Bridge.processLabelScanAgainstExisting(ocr, { name: 'Test', verification_state: 'VERIFIED' }, existing, deps);
  assert.strictEqual(r.hasConflict, true);
  assert.strictEqual(r.ingestDecision.action, 'KEEP_EXISTING_VERIFIED'); // conflict gedetecteerd, maar VERIFIED wordt niet overschreven
});
t('processLabelScanAgainstExisting: snapshotCandidate behoudt UNKNOWN != 0', () => {
  var ocr = { status: 'OK', basis: 'PER_100G', observations: { energy_kcal: { normalized_value: 539 }, fiber_g: { normalized_value: null } } };
  var r = Bridge.processLabelScanAgainstExisting(ocr, null, null, deps);
  assert.strictEqual(r.snapshotCandidate.fiber_g, null);
  assert.strictEqual(r.snapshotCandidate.energy_kcal, 539);
});

console.log(`NutritionLabelIngestBridge: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
