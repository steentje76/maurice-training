/* fNutritionConsumedAtContract.test.js — NUT-TIME-01 regressietest.
 *
 * Statische contract-check (geen netwerk/DOM nodig) die vastlegt:
 *  - migratie_v546.sql voegt consumed_at/consumed_at_source uitsluitend
 *    toe aan de vier bedoelde tabellen, met behoudende backfill-logica;
 *  - index.html gebruikt consumed_at (niet occurred_at) voor dag-grenzen
 *    en toont/bewaart het via een editbaar datetime-local-veld;
 *  - edit behoudt het bestaande consumed_at tenzij de gebruiker het
 *    aanpast (het veld wordt voorgevuld, niet leeggemaakt of overschreven
 *    met "nu").
 *
 * De daadwerkelijke tijdzone-/DST-/roundtrip-logica wordt apart, puur
 * getest in core/nutritionTimeUtils.test.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v546.sql'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- Migratie: exact de vier bedoelde tabellen krijgen consumed_at ----
['nutrition_meals', 'nutrition_hydration_entries', 'nutrition_supplement_logs', 'nutrition_entries'].forEach((t) => {
  ok(new RegExp('alter table public\\.' + t + '[\\s\\S]{0,200}add column if not exists consumed_at timestamptz', 'i').test(migratie),
    'A: ' + t + ' krijgt consumed_at timestamptz (idempotent)');
});
ok(!/alter table public\.nutrition_meal_items[\s\S]{0,200}consumed_at/i.test(migratie),
  'A-neg: nutrition_meal_items krijgt GEEN eigen consumed_at (meal-niveau is voldoende, geen redesign)');
ok(!/alter table public\.nutrition_targets[\s\S]{0,200}consumed_at/i.test(migratie),
  'A-neg2: nutrition_targets wordt niet aangeraakt');
ok(!/alter table public\.nutrition_products/i.test(migratie) && !/alter table public\.nutrition_foods/i.test(migratie),
  'A-neg3: geen catalogustabel (products/foods) aangeraakt');

// ---- Provenance: exact de twee toegestane waarden ----
ok(/consumed_at_source in \('user_confirmed','legacy_occurred_at_fallback'\)/i.test(migratie),
  'B1: consumed_at_source staat uitsluitend user_confirmed/legacy_occurred_at_fallback toe');

// ---- Backfill: uitsluitend WHERE consumed_at IS NULL, nooit een blinde overschrijving ----
const backfillMatches = migratie.match(/update public\.\w+[\s\S]{0,150}where consumed_at is null;/gi) || [];
ok(backfillMatches.length === 4, 'C1: precies vier behoudende backfill-statements (where consumed_at is null), gevonden: ' + backfillMatches.length);
ok(backfillMatches.every((m) => /consumed_at_source = 'legacy_occurred_at_fallback'/i.test(m)),
  'C2: elke backfill markeert expliciet legacy_occurred_at_fallback, nooit user_confirmed');
ok(!/set consumed_at = occurred_at[\s\S]{0,80};(?!\s*--)/i.test(migratie.replace(/where consumed_at is null;/gi, '')),
  'C3: geen backfill zonder de where-consumed_at-is-null-guard');

// ---- NOT NULL alleen via guarded ALTER (na backfill) ----
ok(/alter column consumed_at set not null/gi.test(migratie) && (migratie.match(/alter column consumed_at set not null/gi) || []).length === 4,
  'D1: alle vier tabellen krijgen consumed_at NOT NULL, telkens ná de backfill-stap');

// ---- GAP-S3 blijft expliciet open, niet stilzwijgend opgelost ----
ok(/GAP-S3[\s\S]{0,200}(OPEN|blijft open)/i.test(migratie), 'E1: GAP-S3 (meal-uniqueness) staat expliciet als open/niet opgelost gedocumenteerd');
ok(!/unique[\s\S]{0,40}\(user_id,\s*meal_type/i.test(migratie), 'E2: geen (opnieuw toegevoegde) meal-unique-constraint in dit bestand');

// ---- App: dag-grenzen gebruiken consumed_at, niet occurred_at ----
ok(/consumed_at=gte\.'\+b\.startIso\+'&consumed_at=lt\.'\+b\.eindIso/.test(html.replace(/\r/g, '')),
  'F1: voedingFetchDayMeals/Hydration/Supplements filteren op consumed_at met lokale daggrenzen');
ok((html.match(/consumed_at=gte\.'\+b\.startIso/g) || []).length >= 3,
  'F2: alle drie de dag-fetch-functies (meals/hydration/supplements) zijn omgezet');

// ---- App: meal-aanmaak schrijft consumed_at ----
ok(/sbPostQ\('nutrition_meals',\{user_id:uid,occurred_at:nu,consumed_at:nu,consumed_at_source:'user_confirmed'/.test(html.replace(/\r/g, '')),
  'G1: nieuwe meal krijgt consumed_at + consumed_at_source=user_confirmed naast het ongewijzigde occurred_at');

// ---- App: nutrition_entries-formulier heeft een editbaar tijdstip-veld, voorgevuld bij edit ----
ok(/id="nutrition-consumed-at"/.test(html), 'H1: het nutrition_entries-formulier heeft een consumed_at-invoerveld');
ok(/bewerken&&bewerken\.consumed_at\?voedingIsoToLocalInputValue\(bewerken\.consumed_at\):voedingNowLocalInputValue\(\)/.test(html),
  'H2: bij edit wordt het veld voorgevuld met de BESTAANDE consumed_at (behoud tenzij gewijzigd), bij create met "nu"');
ok(/consumedAtIso=voedingLocalInputToIso\(document\.getElementById\('nutrition-consumed-at'\)\.value\)/.test(html.replace(/\r/g, '')),
  'H3: opslaan leest het (mogelijk ongewijzigde) veld uit, kloont nooit stilzwijgend een andere tijd');

// ---- App: meal-tijdstip is aanpasbaar via edit (conform "via edit" bij afwezige inline-stap) ----
ok(/function voedingEditMealTime/.test(html) && /function voedingSaveMealTime/.test(html),
  'I1: maaltijd-tijdstip is achteraf aanpasbaar via het detailscherm (edit-pad)');
ok(/sbPatchQ\('nutrition_meals','id=eq\.'\+mealId,\{consumed_at:iso,consumed_at_source:'user_confirmed'\}\)/.test(html.replace(/\r/g, '')),
  'I2: het opslaan van een aangepast maaltijdtijdstip schrijft uitsluitend consumed_at/consumed_at_source, geen andere velden');

// ---- Bestaande "Nogmaals toevoegen" (voedingRepeatItem) kloont geen oude tijd ----
const repeatMatch = html.match(/function voedingRepeatItem\(\)\{[\s\S]*?\n\}/);
ok(!!repeatMatch, 'J1: voedingRepeatItem bestaat (Concept B/UX-05, ongewijzigd)');
ok(!!repeatMatch && !/occurred_at|consumed_at/.test(repeatMatch[0]),
  'J2: voedingRepeatItem geeft alleen product/hoeveelheid/eenheid door, geen timestamp -- de nieuwe rij krijgt via voedingConfirmAddToMeal altijd een verse consumed_at ("nu"), nooit een gekloonde oude tijd');

console.log('fNutritionConsumedAtContract: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
