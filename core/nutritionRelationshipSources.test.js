/* core/nutritionRelationshipSources.test.js — NUT-REL-01B.
 *
 * Puur, deterministisch. Test de dag-serie-opbouw en de harde
 * per-rij-provenance-filter, los van UI/database/Relationship Engine.
 */
'use strict';
const NRS = require('./nutritionRelationshipSources.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }
function findDay(series, date) { return (series || []).find((p) => p.date === date); }

function item(kcal, protein, carbs) {
  return { nutrient_snapshot: { energy_kcal: kcal, protein_g: protein, carbohydrate_g: carbs } };
}
function meal(consumedAtIso, source, items) {
  return { consumed_at: consumedAtIso, consumed_at_source: source, items: items };
}
function hyd(consumedAtIso, source, amountMl) {
  return { consumed_at: consumedAtIso, consumed_at_source: source, amount_ml: amountMl };
}

// ---- A/B/C: kcal/protein/carbs day-series correct ----
(function () {
  const meals = [
    meal('2026-03-10T08:00:00.000Z', 'user_confirmed', [item(400, 30, 40)]),
    meal('2026-03-10T18:00:00.000Z', 'user_confirmed', [item(600, 20, 60)]) // zelfde lokale dag, moet optellen
  ];
  const out = NRS.build(meals, []);
  const dag = findDay(out.nutrition_kcal, '2026-03-10');
  ok(!!dag && dag.value === 1000, 'A1: kcal van twee meals op dezelfde dag correct opgeteld (400+600=1000): kreeg ' + (dag && dag.value));
  const dagP = findDay(out.nutrition_protein, '2026-03-10');
  ok(!!dagP && dagP.value === 50, 'B1: protein correct opgeteld (30+20=50): kreeg ' + (dagP && dagP.value));
  const dagC = findDay(out.nutrition_carbs, '2026-03-10');
  ok(!!dagC && dagC.value === 100, 'C1: carbs correct opgeteld (40+60=100): kreeg ' + (dagC && dagC.value));
})();

// ---- D: hydration day-series correct ----
(function () {
  const rows = [hyd('2026-03-11T07:00:00.000Z', 'user_confirmed', 250), hyd('2026-03-11T12:00:00.000Z', 'user_confirmed', 500)];
  const out = NRS.build([], rows);
  const dag = findDay(out.nutrition_hydration, '2026-03-11');
  ok(!!dag && dag.value === 750, 'D1: hydration correct opgeteld (250+500=750): kreeg ' + (dag && dag.value));
})();

// ---- E: dag zonder gekwalificeerde data wordt weggelaten, niet 0 ----
(function () {
  const out = NRS.build([], []);
  ok(out.nutrition_kcal === undefined, 'E1: geen meals -> nutrition_kcal helemaal afwezig (geen 0-reeks)');
  ok(out.nutrition_hydration === undefined, 'E2: geen hydratatie -> nutrition_hydration helemaal afwezig');
})();

// ---- F: legacy_occurred_at_fallback wordt uitgesloten ----
(function () {
  const meals = [meal('2026-03-12T08:00:00.000Z', 'legacy_occurred_at_fallback', [item(500, 30, 40)])];
  const out = NRS.build(meals, []);
  ok(out.nutrition_kcal === undefined, 'F1: uitsluitend legacy_occurred_at_fallback-meal -> dag komt nergens in voor');
  const rows = [hyd('2026-03-12T08:00:00.000Z', 'legacy_occurred_at_fallback', 300)];
  const outH = NRS.build([], rows);
  ok(outH.nutrition_hydration === undefined, 'F2: idem voor hydratatie');
})();

// ---- G: mixed provenance -- alleen toegestane rows worden geaggregeerd (PER RIJ, niet per dag) ----
(function () {
  const meals = [
    meal('2026-03-13T08:00:00.000Z', 'user_confirmed', [item(400, 30, 40)]),
    meal('2026-03-13T18:00:00.000Z', 'legacy_occurred_at_fallback', [item(600, 20, 60)]) // zelfde dag, maar deze rij telt niet mee
  ];
  const out = NRS.build(meals, []);
  const dag = findDay(out.nutrition_kcal, '2026-03-13');
  ok(!!dag && dag.value === 400, 'G1: alleen de user_confirmed-rij telt mee (400, niet 1000) -- bewijst filtering per rij, niet per dag');
})();

// ---- H: nutrition_entries wordt nergens FUNCTIONEEL gebruikt door deze module
// (de bare tabelnaam mag in verklarende commentaarregels staan om uit te leggen
// waarom hij NIET gebruikt wordt -- dit checkt op een echte tabelverwijzing,
// zoals elders in de repo altijd als aangehaalde string 'nutrition_entries'). ----
(function () {
  const fs = require('fs');
  const src = fs.readFileSync(__filename.replace('.test.js', '.js'), 'utf8');
  ok(!src.includes("'nutrition_entries'") && !src.includes('.nutrition_entries'),
    'H1: geen enkele functionele verwijzing (query/property) naar nutrition_entries in nutritionRelationshipSources.js');
})();

// ---- I: geen dubbele Foundation/legacy-aggregatie (module kent uitsluitend Foundation 2.0-vorm) ----
(function () {
  // De module accepteert alleen meal-rijen met .items (Foundation 2.0-vorm);
  // een legacy nutrition_entries-rij (entry_type/energy_kcal direct op de
  // rij, geen .items) levert bij toeval GEEN items op en telt dus sowieso
  // niet mee, zelfs als hij ooit per ongeluk zou worden doorgegeven.
  const legacyShapedRow = { consumed_at: '2026-03-14T08:00:00.000Z', consumed_at_source: 'user_confirmed', entry_type: 'meal', energy_kcal: 500 };
  const out = NRS.build([legacyShapedRow], []);
  ok(out.nutrition_kcal === undefined, 'I1: een legacy-vormige rij (geen .items) levert geen kcal-punt op -- geen sluipende dubbeltelling mogelijk');
})();

// ---- J: timezone/lokale dag correct (Amsterdam, net na lokale middernacht) ----
(function () {
  const orig = process.env.TZ;
  process.env.TZ = 'Europe/Amsterdam';
  try {
    // 2026-09-06T22:30:00Z = 07-09-2026 00:30 lokaal (CEST, UTC+2) -- de dag
    // moet 2026-09-07 zijn, niet de UTC-dag 2026-09-06.
    const meals = [meal('2026-09-06T22:30:00.000Z', 'user_confirmed', [item(300, 10, 20)])];
    const out = NRS.build(meals, []);
    ok(!!findDay(out.nutrition_kcal, '2026-09-07'), 'J1: consumed_at net na lokale middernacht valt op de juiste lokale dag (07-09), niet de UTC-dag (06-09)');
  } finally { process.env.TZ = orig; }
})();

// ---- rows zonder consumed_at_source (bv. ontbrekend/oud) tellen niet mee ----
(function () {
  const meals = [{ consumed_at: '2026-03-15T08:00:00.000Z', items: [item(400, 30, 40)] }]; // geen consumed_at_source
  const out = NRS.build(meals, []);
  ok(out.nutrition_kcal === undefined, 'K1: een rij zonder consumed_at_source telt niet mee (geen impliciete promotie tot betrouwbaar)');
})();

console.log('nutritionRelationshipSources: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
