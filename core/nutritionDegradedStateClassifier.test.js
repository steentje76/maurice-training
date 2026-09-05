'use strict';
const assert = require('assert');
const Degraded = require('./nutritionDegradedStateClassifier.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

t('classifyCapability: manual_meal_logging = LOCAL_OK', () => {
  assert.strictEqual(Degraded.classifyCapability('manual_meal_logging').status, 'LOCAL_OK');
});
t('classifyCapability: known_local_product_lookup = LOCAL_OK', () => {
  assert.strictEqual(Degraded.classifyCapability('known_local_product_lookup').status, 'LOCAL_OK');
});
t('classifyCapability: hydration_logging = LOCAL_OK', () => {
  assert.strictEqual(Degraded.classifyCapability('hydration_logging').status, 'LOCAL_OK');
});
t('classifyCapability: supplement_logging = LOCAL_OK', () => {
  assert.strictEqual(Degraded.classifyCapability('supplement_logging').status, 'LOCAL_OK');
});
t('classifyCapability: open_food_facts_lookup = REQUIRES_NETWORK (KERN, geen overclaim van offline-steun)', () => {
  assert.strictEqual(Degraded.classifyCapability('open_food_facts_lookup').status, 'REQUIRES_NETWORK');
});
t('classifyCapability: UNKNOWN_CAPABILITY voor een niet-vastgelegde capability (adversarial, geen aanname)', () => {
  assert.strictEqual(Degraded.classifyCapability('iets_verzonnens').status, 'UNKNOWN_CAPABILITY');
});

t('resolveProviderFailure: OFFLINE expliciet apart van andere fouten', () => {
  assert.strictEqual(Degraded.resolveProviderFailure({ offline: true }).status, 'OFFLINE');
});
t('resolveProviderFailure: RETRYABLE_FAILURE bij timeout', () => {
  assert.strictEqual(Degraded.resolveProviderFailure({ timeout: true }).status, 'RETRYABLE_FAILURE');
});
t('resolveProviderFailure: NOT_FOUND bij 404', () => {
  assert.strictEqual(Degraded.resolveProviderFailure({ httpStatus: 404 }).status, 'NOT_FOUND');
});
t('resolveProviderFailure: PROVIDER_UNAVAILABLE bij 5xx', () => {
  assert.strictEqual(Degraded.resolveProviderFailure({ httpStatus: 503 }).status, 'PROVIDER_UNAVAILABLE');
});
t('resolveProviderFailure: PERSISTENCE_FAILED apart van provider-fouten', () => {
  assert.strictEqual(Degraded.resolveProviderFailure({ persistenceFailed: true }).status, 'PERSISTENCE_FAILED');
});
t('resolveProviderFailure: geen silent fallback -- elke onbekende situatie krijgt een expliciete status, nooit stilzwijgend succes (adversarial)', () => {
  const r = Degraded.resolveProviderFailure({});
  assert.notStrictEqual(r.status, undefined);
  assert.notStrictEqual(r.status, 'OK');
});

console.log(`NutritionDegradedStateClassifier: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
