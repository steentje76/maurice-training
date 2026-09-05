'use strict';
const assert = require('assert');
const Supplement = require('./nutritionSupplementService.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

t('validateSupplementDefinition: geldig met een naam', () => {
  assert.strictEqual(Supplement.validateSupplementDefinition({ name: 'Vitamine D' }).valid, true);
});
t('validateSupplementDefinition: NAME_REQUIRED zonder naam (adversarial)', () => {
  assert.strictEqual(Supplement.validateSupplementDefinition({}).reason, 'NAME_REQUIRED');
  assert.strictEqual(Supplement.validateSupplementDefinition({ name: '   ' }).reason, 'NAME_REQUIRED');
});
t('validateSupplementDefinition: geen enkel dosering-/werkzaamheidsveld vereist of gecontroleerd (adversarial structuurcheck, medische grens)', () => {
  const r = Supplement.validateSupplementDefinition({ name: 'Magnesium', recommended_dose: '9999mg' });
  assert.strictEqual(r.valid, true); // het systeem beoordeelt nooit of een dosis "juist" is
});

t('validateSupplementLog: geldig met supplement_id', () => {
  assert.strictEqual(Supplement.validateSupplementLog({ supplement_id: 's1', dose: 500 }).valid, true);
});
t('validateSupplementLog: SUPPLEMENT_ID_REQUIRED zonder id (adversarial)', () => {
  assert.strictEqual(Supplement.validateSupplementLog({}).reason, 'SUPPLEMENT_ID_REQUIRED');
});
t('validateSupplementLog: INVALID_DOSE bij negatieve/niet-numerieke dosis (adversarial)', () => {
  assert.strictEqual(Supplement.validateSupplementLog({ supplement_id: 's1', dose: -5 }).reason, 'INVALID_DOSE');
  assert.strictEqual(Supplement.validateSupplementLog({ supplement_id: 's1', dose: 'veel' }).reason, 'INVALID_DOSE');
});
t('validateSupplementLog: geldig zonder dosis (dosis is optioneel, puur registratie)', () => {
  assert.strictEqual(Supplement.validateSupplementLog({ supplement_id: 's1' }).valid, true);
});

t('canModifySupplementLog: alleen de eigenaar', () => {
  const log = { user_id: 'u1' };
  assert.strictEqual(Supplement.canModifySupplementLog('u1', log), true);
  assert.strictEqual(Supplement.canModifySupplementLog('u2', log), false);
});

console.log(`NutritionSupplementService: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
