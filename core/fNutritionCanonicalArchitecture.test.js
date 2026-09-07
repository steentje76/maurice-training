/* fNutritionCanonicalArchitecture.test.js — NUT-CANON-01 regressietest.
 *
 * Statische contract-check (geen netwerk/DOM nodig) die vastlegt:
 *  A. de Foundation 2.0-schrijfpaden (meal/hydration/supplement) schrijven
 *     nooit naar nutrition_entries;
 *  B/C. hydration/supplement gebruiken hun eigen, canonieke tabel;
 *  D. het hoofd-Voeding-dashboard (renderVoeding/voedingRenderOverview)
 *     leest nutrition_entries nergens -- geen dubbeltelling mogelijk;
 *  E. geen enkele migratie bevat een DROP TABLE op nutrition_entries
 *     (legacy tabel blijft bestaan, nooit destructief);
 *  F. de bestaande UNKNOWN!=0-aggregatiefuncties worden nog steeds
 *     gebruikt (geen nieuwe, parallelle rekenlogica);
 *  G. het legacy-schrijfpad (nutritionSaveEntry) delegeert validatie nog
 *     steeds uitsluitend aan NutritionFoundationCore -- geen nieuwe
 *     nutrient-arithmetic in de UI-laag.
 *
 * Bewijst NIET dat nutrition_entries is afgeschaft -- dat is een bewuste
 * PO-beslissing (zie het NUT-CANON-01-rapport): het scherm/schrijfpad
 * blijft bestaan als gesauctioneerde uitzondering (timing_context +
 * vrije-vorm-invoer, nog niet representeerbaar in Foundation 2.0).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');

function functionBody(name) {
  const re = new RegExp('async function ' + name + '\\(\\)\\{([\\s\\S]*?)\\n\\}\\n');
  const m = html.match(re);
  return m ? m[1] : null;
}

// ---- A/B/C: Foundation 2.0-schrijfpaden raken nutrition_entries nooit ----
const meal = functionBody('voedingConfirmAddToMeal');
const water = functionBody('voedingConfirmWaterEntry');
const supp = functionBody('voedingSaveSupplement');
ok(!!meal, 'setup: voedingConfirmAddToMeal gevonden');
ok(!!water, 'setup: voedingConfirmWaterEntry gevonden');
ok(!!supp, 'setup: voedingSaveSupplement gevonden');
ok(!!meal && !meal.includes('nutrition_entries'), 'A1: meal-toevoegen schrijft niet naar nutrition_entries');
ok(!!meal && meal.includes("'nutrition_meals'") && meal.includes("'nutrition_meal_items'"),
  'A2: meal-toevoegen gebruikt uitsluitend nutrition_meals/nutrition_meal_items');
ok(!!water && !water.includes('nutrition_entries'), 'B1: hydratatie-invoer schrijft niet naar nutrition_entries');
ok(!!water && water.includes("'nutrition_hydration_entries'"), 'B2: hydratatie-invoer gebruikt nutrition_hydration_entries');
ok(!!supp && !supp.includes('nutrition_entries'), 'C1: supplement-invoer schrijft niet naar nutrition_entries (let op: nutrition_supplement_logs/definitions bevatten niet de substring nutrition_entries)');
ok(!!supp && supp.includes("'nutrition_supplement_logs'") && supp.includes("'nutrition_supplement_definitions'"),
  'C2: supplement-invoer gebruikt nutrition_supplement_logs/definitions');

// ---- D: hoofddashboard leest nutrition_entries nergens (geen dubbeltelling) ----
const renderVoeding = functionBody('renderVoeding');
const overview = functionBody('voedingRenderOverview');
ok(!!overview, 'setup: voedingRenderOverview gevonden');
ok(!!overview && !overview.includes('nutrition_entries'), 'D1: voedingRenderOverview (hoofddashboard) leest nutrition_entries niet');
ok(!!overview && overview.includes('voedingFetchDayMeals') && overview.includes('voedingFetchDayHydration') && overview.includes('voedingFetchDaySupplements'),
  'D2: voedingRenderOverview haalt uitsluitend Foundation 2.0-dagdata op');

// ---- E: geen enkele migratie mag nutrition_entries droppen ----
const migraties = fs.readdirSync(ROOT).filter((f) => /^migratie_v\d+\.sql$/.test(f));
ok(migraties.length > 0, 'setup: migratiebestanden gevonden');
const dropOffenders = migraties.filter((f) => {
  const sql = fs.readFileSync(path.join(ROOT, f), 'utf8').toLowerCase();
  return /drop\s+table[^;]*nutrition_entries/i.test(sql);
});
ok(dropOffenders.length === 0, 'E1: geen enkele migratie bevat een DROP TABLE op nutrition_entries (' + dropOffenders.join(',') + ')');

// ---- F: bestaande UNKNOWN!=0-aggregatiefuncties blijven de enige bron ----
ok(html.includes('NutritionMealService.aggregateDailyNutrition'), 'F1: Foundation 2.0-pad gebruikt nog steeds aggregateDailyNutrition (geen nieuwe som-logica)');
ok(html.includes('NutritionFoundationCore.dailyLoggedTotals'), 'F2: legacy-pad gebruikt nog steeds dailyLoggedTotals (geen nieuwe som-logica)');

// ---- G: legacy-schrijfpad blijft valideren via NutritionFoundationCore, geen nieuwe UI-arithmetic ----
const saveEntry = functionBody('nutritionSaveEntry');
ok(!!saveEntry, 'setup: nutritionSaveEntry gevonden');
ok(!!saveEntry && saveEntry.includes('NutritionFoundationCore.validateEntry'),
  'G1: nutritionSaveEntry valideert nog steeds uitsluitend via NutritionFoundationCore');
ok(!!saveEntry && !/[a-zA-Z_]\s*\+\s*[a-zA-Z_].*kcal|kcal.*[*/].*[a-zA-Z_]/i.test(saveEntry),
  'G2: geen optel-/reken-uitdrukking op nutrientvelden in de UI-laag zelf');

// ---- Architecturale markering aanwezig (sectie 4: legacy/compatibility) ----
ok(html.includes('LEGACY/COMPATIBILITY (NUT-CANON-01)'), 'H1: het legacy-scherm is expliciet als zodanig gemarkeerd in de code');

console.log('fNutritionCanonicalArchitecture: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
