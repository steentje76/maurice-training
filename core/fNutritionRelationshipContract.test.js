/* fNutritionRelationshipContract.test.js — NUT-REL-01B.
 *
 * Bewijst dat het aansluiten van Nutrition de bestaande Relationship
 * Engine niet heeft heronwikkeld of verzwakt: dezelfde thresholds,
 * dezelfde circulariteitstoets, dezelfde taal/disclaimer, en dat de
 * bestaande (niet-Nutrition) grootheden ongewijzigd blijven.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const RC = require('./relationship.js');
const DC = require('./decision.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- K: bestaande thresholds ONGEWIJZIGD ----
ok(RC.REL_MIN_KANDIDAAT === 10, 'K1: REL_MIN_KANDIDAAT ongewijzigd (10)');
ok(RC.REL_MIN_PATROON === 30, 'K2: REL_MIN_PATROON ongewijzigd (30)');
ok(RC.REL_MIN_DISTINCT === 5, 'K3: REL_MIN_DISTINCT ongewijzigd (5)');
ok(RC.REL_MAX_UITSLUIT === 0.35, 'K4: REL_MAX_UITSLUIT ongewijzigd (0.35)');
ok(RC.REL_TOON_MAX === 12, 'K5: REL_TOON_MAX ongewijzigd (12)');
ok(DC.VERBAND_MIN_N === 30, 'K6: DecisionCore.VERBAND_MIN_N ongewijzigd (30), blijft gelijk aan REL_MIN_PATROON');

// ---- L: REL_MIN_DISTINCT blijft daadwerkelijk gelden (spreidingstoets) ----
const constantReeks = [50, 50, 50, 50, 50, 50, 50, 50]; // 1 distinct waarde
const spr = RC.spreiding(constantReeks);
ok(spr.voldoende === false, 'L1: een reeks met 1 distinct waarde faalt nog steeds de spreidingstoets');
const variabeleReeks = [10, 20, 30, 40, 50, 60];
ok(RC.spreiding(variabeleReeks).voldoende === true, 'L2: een reeks met >=5 distinct waarden slaagt nog steeds');

// ---- M: circulariteit blijft correct werken, ook voor nutrition ----
ok(DC.verbandIsCirculair({ a: { inputs: ['nutrition_kcal_raw'] }, b: { inputs: ['hrv'] } }) === false,
  'M1: nutrition_kcal vs hrv is NIET circulair (geen gedeelde raw input)');
ok(DC.verbandIsCirculair({ a: { inputs: ['nutrition_kcal_raw'] }, b: { inputs: ['nutrition_kcal_raw'] } }) === true,
  'M2: een grootheid tegen zichzelf (gedeelde input) blijft circulair geweigerd');
ok(DC.verbandIsCirculair({ a: { inputs: ['sets'] }, b: { inputs: ['sets', 'reps', 'weight_kg'] } }) === true,
  'M3: bestaande circulaire paren (sets vs volume) blijven correct geweigerd (regressie, niet nutrition-gerelateerd)');

// ---- N: releaseVerband-disclaimer blijft ongewijzigd, ook voor een nutrition-achtige definitie ----
const nutritionDef = {
  id: 'nutrition_kcal__hrv', minimumN: 30,
  a: { veld: 'nutrition_kcal', conditie: 'je calorie-inname hoger was', zinNaam: 'calorie-inname', inputs: ['nutrition_kcal_raw'] },
  b: { veld: 'hrv', noemer: 'HRV', zinNaam: 'HRV', inputs: ['hrv'] }
};
const besluitVoldoende = DC.releaseVerband({ coefficient: 0.42, n: 40 }, nutritionDef, { excludedDays: 0, comparableDays: 40 });
ok(besluitVoldoende.disclaimer === 'Dit is een samenhang, geen oorzaak.', 'N1: disclaimer ongewijzigd voor een nutrition-paar: "' + besluitVoldoende.disclaimer + '"');
ok(besluitVoldoende.vrijgegeven === true, 'N2: bij voldoende data/coefficient wordt het nutrition-paar net als elk ander paar vrijgegeven');

// ---- O: Nutrition-zinnen passeren dezelfde causaliteits-/populatietaaltoets ----
const verbodenWoorden = DC.VERBAND_VERBODEN_WOORDEN.concat(RC.RELATIE_VERBODEN_WOORDEN, RC.RELATIE_POPULATIE_WOORDEN);
const zin = (besluitVoldoende.zin || '').toLowerCase();
const overtredingen = verbodenWoorden.filter((w) => zin.indexOf(w.toLowerCase()) >= 0);
ok(overtredingen.length === 0, 'O1: de gegenereerde nutrition-zin bevat geen verboden causaliteits-/populatiewoorden: "' + besluitVoldoende.zin + '" (overtredingen: ' + overtredingen.join(',') + ')');
// Ook de "geen richting"-variant (verwaarloosbare samenhang) moet schoon zijn.
const besluitZwak = DC.releaseVerband({ coefficient: 0.02, n: 40 }, nutritionDef, { excludedDays: 0, comparableDays: 40 });
const zinZwak = (besluitZwak.zin || '').toLowerCase();
ok(verbodenWoorden.filter((w) => zinZwak.indexOf(w.toLowerCase()) >= 0).length === 0,
  'O2: ook de "geen duidelijke samenhang"-zin voor nutrition is schoon: "' + besluitZwak.zin + '"');

// ---- P: bestaande, niet-Nutrition grootheden ongewijzigd (regressie) ----
const nietNutrition = RC.VARIABLE_REGISTRY.filter((v) => v.domein !== 'nutrition');
ok(nietNutrition.length === 21, 'P1: exact de oorspronkelijke 21 niet-Nutrition grootheden blijven bestaan, kreeg ' + nietNutrition.length);
['hrv', 'rhr', 'sleep', 'dagfactor', 'readiness', 'gewicht', 'volume', 'rpe', 'sets', 'load',
  'load_vorige_dag', 'weekbelasting', 'rustdagen', 'duur', 'rust', 'e1rm', 'topgewicht',
  'cardio_split', 'temperatuur', 'luchtvochtigheid', 'wind'].forEach((k) => {
  ok(!!RC.variableByKey(k), 'P2: bestaande grootheid "' + k + '" bestaat nog exact zo');
});

// ---- Nieuw domein + vier metrics correct geregistreerd ----
ok(RC.DOMEINEN.some((d) => d.key === 'nutrition'), 'Q1: domein "nutrition" is toegevoegd aan DOMEINEN');
['nutrition_kcal', 'nutrition_protein', 'nutrition_carbs', 'nutrition_hydration'].forEach((k) => {
  const v = RC.variableByKey(k);
  ok(!!v, 'Q2: ' + k + ' bestaat in VARIABLE_REGISTRY');
  ok(!!v && v.domein === 'nutrition', 'Q3: ' + k + ' hoort bij domein nutrition');
  ok(!!v && v.beschikbaarheid === 'nu', 'Q4: ' + k + ' is beschikbaarheid "nu" (data is er al)');
  ok(!!v && Array.isArray(v.inputs) && v.inputs.length === 1 && v.inputs[0].indexOf('nutrition_') === 0,
    'Q5: ' + k + ' heeft een eigen, uniek nutrition_*-raw-input (geen overlap mogelijk met bestaande inputs)');
});
const eenheden = { nutrition_kcal: 'kcal', nutrition_protein: 'g', nutrition_carbs: 'g', nutrition_hydration: 'ml' };
Object.keys(eenheden).forEach((k) => {
  ok(RC.variableByKey(k).eenheid === eenheden[k], 'Q6: ' + k + ' heeft eenheid ' + eenheden[k]);
});

// ---- nutrition_entries komt nergens voor in de nieuwe/gewijzigde bestanden ----
const nieuweBestanden = ['nutritionRelationshipSources.js'];
nieuweBestanden.forEach((f) => {
  const src = fs.readFileSync(path.join(ROOT, 'core', f), 'utf8');
  ok(!src.includes("'nutrition_entries'") && !src.includes('.nutrition_entries'),
    'R1: ' + f + ' bevat geen functionele verwijzing naar nutrition_entries');
});
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');
const tkRelDataBody = (html.match(/async function tkRelData\(\)\{[\s\S]*?\n\}\n/) || [''])[0];
ok(tkRelDataBody.includes('nutrition_meals') && tkRelDataBody.includes('nutrition_hydration_entries'),
  'R2: tkRelData haalt nutrition_meals + nutrition_hydration_entries op');
ok(!tkRelDataBody.includes("'nutrition_entries'"), 'R3: tkRelData bevat geen query naar nutrition_entries');

// ---- tkNutritionBronnen bestaat, is gewired in tkRelBronnen, en rekent zelf niets ----
ok(html.includes('function tkNutritionBronnen()'), 'S1: tkNutritionBronnen is toegevoegd');
ok(html.includes('tkNutritionBronnen()||{}'), 'S2: tkNutritionBronnen wordt aangeroepen vanuit tkRelBronnen');
const tkNutritionBody = (html.match(/function tkNutritionBronnen\(\)\{[\s\S]*?\n\}\n/) || [''])[0];
ok(!!tkNutritionBody && !/CalcCore\.spearman|DeviceCore\.pairQuality|\.spearman\(|pairQuality\(/.test(tkNutritionBody),
  'S3 (AI/rekencontract): tkNutritionBronnen berekent zelf geen correlatie -- dat blijft exclusief in de bestaande keten (discover/spearman/pairQuality)');
ok(!!tkNutritionBody && !tkNutritionBody.includes("'nutrition_entries'"),
  'S4: tkNutritionBronnen gebruikt nutrition_entries nergens');

console.log('fNutritionRelationshipContract: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
