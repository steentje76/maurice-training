'use strict';
const assert = require('assert');
const CustomProduct = require('./nutritionCustomProductService.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

// -- validateCustomProduct ---------------------------------------------
t('validateCustomProduct: geldig, altijd source_type=USER + verification_state=USER_PRIVATE (KERN, nooit automatisch VERIFIED)', () => {
  const r = CustomProduct.validateCustomProduct({ name: 'Zelfgemaakte proteinereep', basis: 'PER_100G' });
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.canonicalFields.source_type, 'USER');
  assert.strictEqual(r.canonicalFields.verification_state, 'USER_PRIVATE');
});
t('validateCustomProduct: NAME_REQUIRED zonder naam (adversarial)', () => {
  assert.strictEqual(CustomProduct.validateCustomProduct({}).reason, 'NAME_REQUIRED');
});
t('validateCustomProduct: INVALID_BASIS bij een onbekende basis (adversarial)', () => {
  assert.strictEqual(CustomProduct.validateCustomProduct({ name: 'X', basis: 'PER_KG' }).reason, 'INVALID_BASIS');
});

// -- detectDuplicateCandidates -------------------------------------------
t('detectDuplicateCandidates: EXISTING_FOUND bij een matchende barcode (KERN)', () => {
  const r = CustomProduct.detectDuplicateCandidates('Test', '123', [{ id: 'p1' }], []);
  assert.strictEqual(r.status, 'EXISTING_FOUND');
});
t('detectDuplicateCandidates: POSSIBLE_DUPLICATE bij een exact overeenkomende naam, geen barcode (adversarial)', () => {
  const r = CustomProduct.detectDuplicateCandidates('Kipfilet', null, [], [{ name: 'kipfilet' }]);
  assert.strictEqual(r.status, 'POSSIBLE_DUPLICATE');
});
t('detectDuplicateCandidates: CREATE_NEW_ALLOWED zonder enige match', () => {
  const r = CustomProduct.detectDuplicateCandidates('Uniek product', null, [], []);
  assert.strictEqual(r.status, 'CREATE_NEW_ALLOWED');
});
t('detectDuplicateCandidates: geen destructieve samenvoeging -- resultaat bevat uitsluitend een status + kandidaten, nooit een automatische merge (adversarial structuurcheck)', () => {
  const r = CustomProduct.detectDuplicateCandidates('Kipfilet', null, [], [{ name: 'Kipfilet' }]);
  assert.strictEqual(r.hasOwnProperty('merged'), false);
});

// -- evaluateProductCorrection: scenario's A-E ---------------------------
t('evaluateProductCorrection: NEW_CANDIDATE zonder bestaand record', () => {
  const r = CustomProduct.evaluateProductCorrection('A', 'u1', null, () => true);
  assert.strictEqual(r.status, 'NEW_CANDIDATE');
});
t('evaluateProductCorrection: scenario A (foute externe waarde), eigenaar mag corrigeren, nooit stil (adversarial)', () => {
  const record = { verification_state: 'COMMUNITY_UNVERIFIED' };
  const r = CustomProduct.evaluateProductCorrection('A', 'u1', record, () => true);
  assert.strictEqual(r.status, 'CORRECTION_CANDIDATE_ALLOWED');
  assert.strictEqual(r.allowSilentApply, false);
});
t('evaluateProductCorrection: scenario E (conflict met VERIFIED) -- ALTIJD beschermd, ongeacht scenario (KERN)', () => {
  const record = { verification_state: 'VERIFIED' };
  const r = CustomProduct.evaluateProductCorrection('E', 'u1', record, () => true); // canModifyFn zegt zelfs true, maar VERIFIED wint
  assert.strictEqual(r.status, 'CONFLICT_VERIFIED_PROTECTED');
  assert.strictEqual(r.allowSilentApply, false);
  assert.strictEqual(r.requiresReview, true);
});
t('evaluateProductCorrection: NOT_OWNER wanneer een ander een niet-VERIFIED rij probeert te corrigeren (adversarial)', () => {
  const record = { verification_state: 'USER_PRIVATE' };
  const r = CustomProduct.evaluateProductCorrection('D', 'u2', record, () => false);
  assert.strictEqual(r.status, 'NOT_OWNER');
});
t('evaluateProductCorrection: label-scan-aanvulling (scenario C) volgt dezelfde, niet-stille regel als een handmatige correctie (adversarial, geen bronafhankelijke bypass)', () => {
  const record = { verification_state: 'COMMUNITY_UNVERIFIED' };
  const rC = CustomProduct.evaluateProductCorrection('C', 'u1', record, () => true);
  const rD = CustomProduct.evaluateProductCorrection('D', 'u1', record, () => true);
  assert.strictEqual(rC.allowSilentApply, rD.allowSilentApply);
  assert.strictEqual(rC.allowSilentApply, false);
});

console.log(`NutritionCustomProductService: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
