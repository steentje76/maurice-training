'use strict';
const assert = require('assert');
const Contract = require('./nutritionCrossDomainContract.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

t('buildDailyNutritionContext: NO_DATA zonder aggregate', () => {
  assert.strictEqual(Contract.buildDailyNutritionContext(null).status, 'NO_DATA');
});
t('buildDailyNutritionContext: bevat uitsluitend feiten, geen advies-veld (adversarial, contract-structuur-check)', () => {
  const aggregate = { energy_kcal: 2000, protein_g: 100, carbohydrate_g: 200, fat_g: 70, coverage: { energy_kcal: 'COMPLETE' }, item_count: 3 };
  const ctx = Contract.buildDailyNutritionContext(aggregate, 1500);
  assert.strictEqual(ctx.energy_kcal, 2000);
  assert.strictEqual(ctx.hydration_ml, 1500);
  assert.strictEqual(ctx.hasOwnProperty('advies'), false);
  assert.strictEqual(ctx.hasOwnProperty('tekort'), false);
  assert.strictEqual(ctx.hasOwnProperty('advice'), false);
});
t('buildDailyNutritionContext: null hydratie wanneer niet numeriek (adversarial)', () => {
  const aggregate = { energy_kcal: 2000, coverage: {}, item_count: 1 };
  const ctx = Contract.buildDailyNutritionContext(aggregate, undefined);
  assert.strictEqual(ctx.hydration_ml, null);
});

t('evaluateCorrectionRequest: NEW_RECORD wanneer nog geen bestaande rij', () => {
  const r = Contract.evaluateCorrectionRequest('u1', null, () => true);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.reason, 'NEW_RECORD');
});
t('evaluateCorrectionRequest: VERIFIED_PROTECTED bij een VERIFIED-rij (KERN, adversarial)', () => {
  const record = { verification_state: 'VERIFIED' };
  const r = Contract.evaluateCorrectionRequest('u1', record, () => false);
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.reason, 'VERIFIED_PROTECTED');
});
t('evaluateCorrectionRequest: NOT_OWNER bij een niet-VERIFIED rij van een ander (adversarial)', () => {
  const record = { verification_state: 'COMMUNITY_UNVERIFIED' };
  const r = Contract.evaluateCorrectionRequest('u2', record, () => false);
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.reason, 'NOT_OWNER');
});
t('evaluateCorrectionRequest: OWNER_NON_VERIFIED wanneer toegestaan', () => {
  const record = { verification_state: 'USER_PRIVATE' };
  const r = Contract.evaluateCorrectionRequest('u1', record, () => true);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.reason, 'OWNER_NON_VERIFIED');
});

t('buildTargetContext: canonieke remaining doorgegeven, source_wording "je ingestelde doel" (AI mag niet herberekenen/herformuleren)', () => {
  const T=require('./nutritionTargetService.js');
  const prog=T.computeDailyProgress({energy_kcal:2400,protein_g:null,carbohydrate_g:null,fat_g:null},{status:'valid',item_count:1,energy_kcal:1820,coverage:{energy_kcal:'COMPLETE'}});
  const ctx=Contract.buildTargetContext(prog,{source:'USER_DEFINED'});
  assert.strictEqual(ctx.fields.energy_kcal.remaining,580); assert.strictEqual(ctx.source_wording,'je ingestelde doel'); assert.strictEqual(/optima/i.test(JSON.stringify(ctx)),false);
});
t('buildTargetContext: NO_TARGET zonder doelen (AI krijgt geen verzonnen doel)', () => { assert.strictEqual(Contract.buildTargetContext({has_any_target:false},null).status,'NO_TARGET'); });

console.log(`NutritionCrossDomainContract: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
