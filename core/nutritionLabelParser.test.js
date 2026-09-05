'use strict';
const assert = require('assert');
const Parser = require('./nutritionLabelParser.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

// -- parseLocaleNumber (KERN: 4,2 mag NOOIT 42 worden) -----------------
t('parseLocaleNumber: "4,2" -> 4.2, NOOIT 42 (KERN, Fase 11 hard test)', () => {
  assert.strictEqual(Parser.parseLocaleNumber('4,2'), 4.2);
});
t('parseLocaleNumber: "4.2" -> 4.2 (EN-punt)', () => {
  assert.strictEqual(Parser.parseLocaleNumber('4.2'), 4.2);
});
t('parseLocaleNumber: "4,2 g" met eenheidstekst -> 4.2', () => {
  assert.strictEqual(Parser.parseLocaleNumber('4,2 g'), 4.2);
});
t('parseLocaleNumber: "4.2g" zonder spatie -> 4.2', () => {
  assert.strictEqual(Parser.parseLocaleNumber('4.2g'), 4.2);
});
t('parseLocaleNumber: "420 mg" -> 420', () => {
  assert.strictEqual(Parser.parseLocaleNumber('420 mg'), 420);
});
t('parseLocaleNumber: ambigue "1.234,5" (komma EN punt) -> null, geen gok (adversarial)', () => {
  assert.strictEqual(Parser.parseLocaleNumber('1.234,5'), null);
});
t('parseLocaleNumber: null bij lege/ontbrekende input', () => {
  assert.strictEqual(Parser.parseLocaleNumber(null), null);
  assert.strictEqual(Parser.parseLocaleNumber(''), null);
});
t('parseLocaleNumber: null bij niet-numerieke tekst (adversarial, geen crash)', () => {
  assert.strictEqual(Parser.parseLocaleNumber('onleesbaar'), null);
});
t('parseLocaleNumber: meerdere komma\'s -> null, geen gok (adversarial)', () => {
  assert.strictEqual(Parser.parseLocaleNumber('4,2,3'), null);
});

// -- extractUnit ----------------------------------------------------------
t('extractUnit: herkent kJ/kcal/g/mg/ml correct, case-insensitive', () => {
  assert.strictEqual(Parser.extractUnit('180 kJ'), 'kJ');
  assert.strictEqual(Parser.extractUnit('42 KCAL'), 'kcal');
  assert.strictEqual(Parser.extractUnit('4,2 g'), 'g');
  assert.strictEqual(Parser.extractUnit('420 mg'), 'mg');
});
t('extractUnit: null bij onherkenbare eenheid (geen gok)', () => {
  assert.strictEqual(Parser.extractUnit('4,2 xyz'), null);
});

// -- parseEnergyObservation (KERN: kJ != kcal, Fase 12 hard gate) --------
t('parseEnergyObservation: "180 kJ / 42 kcal" -> beide apart, NOOIT kJ als kcal (KERN)', () => {
  const r = Parser.parseEnergyObservation('180 kJ / 42 kcal');
  assert.strictEqual(r.energy_kj, 180);
  assert.strictEqual(r.energy_kcal, 42);
  assert.notStrictEqual(r.energy_kcal, 180);
});
t('parseEnergyObservation: alleen kJ aanwezig -> energy_kcal blijft null (NOOIT automatisch berekend, geen OCR-shadow-calculation)', () => {
  const r = Parser.parseEnergyObservation('180 kJ');
  assert.strictEqual(r.energy_kj, 180);
  assert.strictEqual(r.energy_kcal, null);
});
t('parseEnergyObservation: null bij onleesbare/ontbrekende tekst', () => {
  const r = Parser.parseEnergyObservation(null);
  assert.strictEqual(r.energy_kj, null);
  assert.strictEqual(r.energy_kcal, null);
});
t('parseEnergyObservation: decimale komma binnen energie-tekst blijft veilig ("539,5 kcal")', () => {
  const r = Parser.parseEnergyObservation('539,5 kcal');
  assert.strictEqual(r.energy_kcal, 539.5);
});

// -- parseSaltSodiumObservation (KERN: salt != sodium, Fase 13 hard gate)
t('parseSaltSodiumObservation: "Zout 0,1 g" -> salt_g apart, sodium_mg blijft null (geen automatische conversie, KERN)', () => {
  const r = Parser.parseSaltSodiumObservation('Zout 0,1 g');
  assert.strictEqual(r.salt_g, 0.1);
  assert.strictEqual(r.sodium_mg, null);
});
t('parseSaltSodiumObservation: "Natrium 43 mg" -> sodium_mg apart, salt_g blijft null', () => {
  const r = Parser.parseSaltSodiumObservation('Natrium 43 mg');
  assert.strictEqual(r.sodium_mg, 43);
  assert.strictEqual(r.salt_g, null);
});
t('parseSaltSodiumObservation: beide op hetzelfde etiket blijven onafhankelijk geparst, geen kruisbesmetting (adversarial)', () => {
  const r = Parser.parseSaltSodiumObservation('Zout 0,1 g Natrium 43 mg');
  assert.strictEqual(r.salt_g, 0.1);
  assert.strictEqual(r.sodium_mg, 43);
});
t('parseSaltSodiumObservation: Engelse termen (salt/sodium) ook herkend', () => {
  const r = Parser.parseSaltSodiumObservation('Salt 0.11 g Sodium 43 mg');
  assert.strictEqual(r.salt_g, 0.11);
  assert.strictEqual(r.sodium_mg, 43);
});
t('parseSaltSodiumObservation: geen enkele functie converteert salt naar sodium of vice versa (structurele check, KERN)', () => {
  // Alleen 'Zout' aanwezig -- sodium_mg moet null blijven, NOOIT afgeleid
  // via een 2.5x-vermenigvuldiging of vergelijkbare berekening.
  const r = Parser.parseSaltSodiumObservation('Zout 1 g');
  assert.strictEqual(r.sodium_mg, null);
});

// -- detectBasis (Fase 7/14, geen aanname zonder expliciete tekst) ------
t('detectBasis: "per 100 g" -> PER_100G', () => {
  assert.strictEqual(Parser.detectBasis('Voedingswaarde per 100 g'), 'PER_100G');
});
t('detectBasis: "per 100ml" (geen spatie) -> PER_100ML', () => {
  assert.strictEqual(Parser.detectBasis('per 100ml'), 'PER_100ML');
});
t('detectBasis: "per portie" -> PER_SERVING', () => {
  assert.strictEqual(Parser.detectBasis('per portie'), 'PER_SERVING');
});
t('detectBasis: "per serving" (EN) -> PER_SERVING', () => {
  assert.strictEqual(Parser.detectBasis('per serving'), 'PER_SERVING');
});
t('detectBasis: null bij onherkenbare/ontbrekende header (geen gok, adversarial)', () => {
  assert.strictEqual(Parser.detectBasis('Ingrediënten'), null);
  assert.strictEqual(Parser.detectBasis(null), null);
});

// -- buildObservation (nooit een naakt getal, Fase 9) --------------------
t('buildObservation: bevat alle vereiste metadata-velden, source altijd USER_LABEL_SCAN', () => {
  const obs = Parser.buildObservation('4,2 g', 4.2, 'g', 'PER_100G', 0.9);
  assert.strictEqual(obs.raw_text, '4,2 g');
  assert.strictEqual(obs.normalized_value, 4.2);
  assert.strictEqual(obs.source, 'USER_LABEL_SCAN');
  assert.strictEqual(obs.extraction_method, 'ocr');
});

console.log(`NutritionLabelParser: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
