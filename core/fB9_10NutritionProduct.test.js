/* fB9_10NutritionProduct.test.js — B9-10 Nutrition Product.
 * Bewaakt: edit-functionaliteit, datumnavigatie (lokale dag), offline-
 * queue-hergebruik (geen tweede engine), foreign-training-link-
 * security-fix, hydratatie-presets, completeness-taal, sabotage.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie537 = fs.readFileSync(path.join(ROOT, 'migratie_v537.sql'), 'utf8');

// ---- A. Edit-functionaliteit (ontbrak volledig in B9-09, zelf gevonden) ----
ok(html.includes('function nutritionEditEntry(entryId)') && html.includes('async function nutritionSaveEntry'),
  'A1: edit-functionaliteit bestaat nu (ontbrak volledig na B9-09) -- een gebruiker kan een fout corrigeren zonder delete+opnieuw-invoeren');
ok(html.match(/if\(_nutritionEditingId\)\{[\s\S]{0,20}ok=await sbPatchQ/),
  'A2: edit gebruikt PATCH (update), geen nieuwe insert -- created_at blijft ongewijzigd');
ok(!html.match(/nutritionSaveEntry[\s\S]{0,2000}user_id:[\s\S]{0,30}_nutritionEditingId/),
  'A3: de update-payload bevat nooit een user_id-veld -- de eigenaar kan niet via edit worden gewijzigd');

// ---- B. Datumnavigatie (lokale dag, geen UTC-grensfout) ----
ok(html.includes('function nutritionDagGrenzen') && html.includes('start.setHours(0,0,0,0)') && html.includes('eind.setHours(23,59,59,999)'),
  'B1: dagaggregatie gebruikt de lokale dag (Date.setHours), geen UTC-datumstring-vergelijking die rond middernacht fout kan gaan');
ok(html.includes('function nutritionGaNaarDag') && html.includes('function nutritionGaNaarVandaag'),
  'B2: vorige/volgende-dag-navigatie en een expliciete "naar vandaag"-actie bestaan');

// ---- C. Offline: hergebruik van de bestaande queue, geen tweede engine ----
ok(html.includes("ok=await sbPostQ('nutrition_entries'") && html.includes("ok=await sbPatchQ('nutrition_entries'") && html.includes("ok=await sbDelQ('nutrition_entries'"),
  'C1: create/update/delete gebruiken uitsluitend de bestaande sbPostQ()/sbPatchQ()/sbDelQ()-infrastructuur, geen eigen offline-mechanisme');
ok(html.includes('nutrition_entries: true') && html.includes('IDEMPOTENT_TABELLEN_MET_CLIENT_ID'),
  'C2: nutrition_entries is toegevoegd aan de bestaande idempotency-configuratie (client-gegenereerde id + merge-duplicates) -- voorkomt dubbele entries bij een offline-replay');

// ---- D. Foreign training-link security (P0, zelf gevonden en gerepareerd) ----
ok(migratie537.includes('exists (select 1 from public.training_instances ti where ti.id = training_instance_id and ti.user_id = auth.uid())'),
  'D1 (P0, zelf gevonden): de insert/update-RLS-policy controleert nu expliciet dat een gekoppelde training_instance_id van dezelfde gebruiker is -- niet alleen dat het record bestaat');
ok(migratie537.includes('exists (select 1 from public.activities a where a.id = activity_id and a.user_id = auth.uid())'),
  'D2 (P0, zelf gevonden): dezelfde ownership-check geldt voor activity_id');

// ---- E. Hydratatie quick-add (invoerhulp, geen gezondheidsdoel) ----
ok(html.includes('function nutritionHydrationPreset') && html.includes("nutritionHydrationPreset(250)") && html.includes("nutritionHydrationPreset(500)"),
  'E1: hydratatie-presets (+250ml/+500ml) bestaan als invoerhulp');
ok(!html.match(/nutritionHydrationPreset[\s\S]{0,500}(doel|target|moet.*drinken)/i),
  'E2: de presets bevatten geen dagdoel-taal ("je moet nog X drinken") -- uitsluitend invoerhulp, geen gezondheidsadvies');

// ---- F. Completeness-taal (sectie 17): informatiekwaliteit, geen beoordeling ----
{
  const nutritionBlokStart = html.indexOf('let _nutritionSelectedDate');
  const nutritionBlokEnd = html.indexOf('async function nutritionDeleteEntry') + 300;
  const blok = html.slice(nutritionBlokStart, nutritionBlokEnd);
  ok(blok.includes("dag mogelijk onvolledig") && !blok.match(/voedingsscore|slechte dag|incomplete dag.*rood/i),
    'F1: PARTIAL-data toont neutrale "dag mogelijk onvolledig"-taal, geen score of beoordeling van de sporter (uitsluitend binnen het Nutrition-blok gecontroleerd)');
}

// ---- G. Geen nutrition targets (absolute grens, herbevestigd) ----
{
  const nutritionBlokStart = html.indexOf('let _nutritionSelectedDate');
  const nutritionBlokEnd = html.indexOf('async function nutritionDeleteEntry') + 300;
  const blok = html.slice(nutritionBlokStart, nutritionBlokEnd);
  ok(!blok.match(/\btarget\b|\bBMR\b|\bTDEE\b|deficit|surplus/i),
    'G1: geen enkel caloriedoel-/macrodoel-/BMR-/TDEE-gerelateerd veld in de uitgebreide Nutrition-UI (B9-11-grens blijft intact)');
}

console.log('fB9_10NutritionProduct: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
