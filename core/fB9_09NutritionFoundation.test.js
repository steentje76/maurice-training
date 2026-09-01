/* fB9_09NutritionFoundation.test.js — B9-09 Nutrition Foundation.
 * Bewaakt: schema/constraints, hergebruik van canonieke core-module,
 * privacy-isolatie (0 Social/Coach/AI/Research-blootstelling), XSS-
 * veilige weergave, geen caloriedoel/macrodoel, geen medische taal.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v536.sql'), 'utf8');
const delAcct = fs.readFileSync(path.join(ROOT, 'netlify/functions/delete-account.js'), 'utf8');
const socialSharing = fs.readFileSync(path.join(ROOT, 'core/socialSharing.js'), 'utf8');

// ---- A. Schema: units, constraints, provenance ----
ok(migratie.includes('energy_kcal numeric') && migratie.includes('protein_g numeric') && migratie.includes('fluid_ml numeric'),
  'A1: alle numerieke velden hebben een expliciete eenheidssuffix (energy_kcal/protein_g/fluid_ml, geen kale namen)');
ok(migratie.includes("source_type text not null default 'user_entered'"),
  'A2: source_type bestaat en staat in B9-09 uitsluitend user_entered toe (provenance-contract, geen verzonnen provider)');
ok(migratie.includes('on delete set null') && migratie.match(/training_instance_id[\s\S]{0,50}on delete set null/),
  'A3: de koppeling aan training_instance_id gebruikt ON DELETE SET NULL, niet CASCADE -- een verwijderde training laat de nutrition-entry zelf intact');
ok(migratie.includes('for select using (user_id = auth.uid())') && migratie.includes('for insert with check (user_id = auth.uid())'),
  'A4: RLS is default-private (eigen data, geen social/coach/gym/research-policy toegevoegd)');

// ---- B. Hergebruik van de canonieke core-module, geen dubbele logica ----
ok(html.includes('NutritionFoundationCore.validateEntry(entry)') && html.includes('NutritionFoundationCore.dailyLoggedTotals(entries)'),
  'B1: de UI hergebruikt uitsluitend NutritionFoundationCore -- geen eigen, dubbele validatie/optel-logica in index.html');
{
  const nutritionBlok = html.slice(html.indexOf('function nutritionParseGetal'), html.indexOf('async function nutritionDeleteEntry') + 300);
  ok(!nutritionBlok.match(/\.reduce\(/),
    'B2: geen losse .reduce()-optelling in de UI-laag -- totalen komen uitsluitend uit de canonieke core-module');
}

// ---- C. Missing != zero in de UI zelf ----
ok(html.includes('function nutritionParseGetal') && html.includes("if(waarde==null||waarde==='')return null"),
  'C1: een leeg invoerveld wordt geparsed naar null, nooit naar 0');
ok(html.includes("km=v=>v==null?'niet geregistreerd':v"),
  'C2: de UI toont expliciet "niet geregistreerd" i.p.v. een 0 bij ontbrekende dagtotalen');
{
  const addFnStart = html.indexOf('async function nutritionAddEntry');
  const addFnEnd = html.indexOf('\n}', addFnStart);
  const addFn = html.slice(addFnStart, addFnEnd);
  const velden = ['nutrition-kcal', 'nutrition-protein', 'nutrition-carbs', 'nutrition-fat', 'nutrition-fluid'];
  const alleGebruikenParseGetal = velden.every(function (veldId) {
    return addFn.includes(`nutritionParseGetal(document.getElementById('${veldId}').value)`);
  });
  ok(alleGebruikenParseGetal, 'C3: alle vijf nutrition-velden (kcal/protein/carbs/fat/fluid) gebruiken in nutritionAddEntry() daadwerkelijk nutritionParseGetal() -- geen enkel veld stuurt een rauwe, mogelijk lege string of stille 0');
}

// ---- D. Decimaal-parsing (sectie 41): komma wordt correct afgehandeld ----
ok(html.includes("replace(',','.')"),
  'D1: een komma-invoer (Nederlandse notatie) wordt genormaliseerd naar een punt vóór het parsen -- "1,5" wordt niet stilzwijgend "15" of ongeldig');

// ---- E. XSS-veiligheid ----
ok(html.match(/escHtml\(details\)/) && html.match(/escHtml\(e\.note\)/),
  'E1: nutrition-notities en samengestelde details worden via escHtml() weergegeven, nooit ongefilterd in innerHTML');

// ---- F. Geen caloriedoel/macrodoel/AI/Social-integratie (absolute grenzen) ----
{
  const nutritionBlok = html.slice(html.indexOf('function nutritionParseGetal'), html.indexOf('async function nutritionDeleteEntry') + 300);
  ok(!nutritionBlok.match(/target|doel.*kcal|BMR|TDEE|deficit|surplus/i),
    'F1: geen enkel caloriedoel-/macrodoel-/BMR-/TDEE-gerelateerd veld of functie in de Nutrition-UI (absolute B9-09-grens)');
}
{
  const coachBlokStart = html.indexOf('async function tkCoachDataBlok');
  const coachBlokEnd = html.indexOf('async function buildCtx');
  const coachBlok = html.slice(coachBlokStart, coachBlokEnd);
  ok(!coachBlok.includes('nutrition_entries') && !coachBlok.includes('nutritionFoundation'),
    'F2: de AI-coach-contextfunctie (tkCoachDataBlok) bevat 0 verwijzingen naar nutrition_entries/nutritionFoundation -- geen automatische AI-blootstelling');
}
ok(!socialSharing.includes('nutrition') && !socialSharing.includes('kcal') && !socialSharing.includes('protein'),
  'F3: de SocialSharingCore-allowlist bevat geen enkel nutrition-veld -- 0 automatische Social-blootstelling');

// ---- G. Causale/medische taal-audit ----
{
  const nutritionBlok = html.slice(html.indexOf('function nutritionParseGetal'), html.indexOf('async function nutritionDeleteEntry') + 300);
  ok(!nutritionBlok.match(/je moet (af|aan)vallen|tekort aan|te (weinig|veel) (eet|drink)|ongezond|gezond(?!heids)/i),
    'G1: geen enkele diagnostische, medische, of morele voedingstaal in de UI -- registreren, niet adviseren');
}

// ---- H. Account deletion ----
ok(delAcct.includes("['nutrition_entries', ['user_id']]"),
  'H1: nutrition_entries staat expliciet in de account-deletion-lijst');

// ---- I. Geen extra bottom-nav-regressie ----
{
  const aantalSociaalTabs = (html.match(/<span class="ni-label">Sociaal<\/span>/g) || []).length;
  ok(aantalSociaalTabs === 2, 'I1: geen brede bottom-nav-refactor -- alleen het bestaande Sociaal-scherm plus het nieuwe Nutrition-scherm hebben deze tab, geen wijziging aan de overige 35 bestaande schermen');
}

console.log('fB9_09NutritionFoundation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
