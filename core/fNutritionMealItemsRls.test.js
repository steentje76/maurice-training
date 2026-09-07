/* fNutritionMealItemsRls.test.js — NUT-RLS-01 regressietest.
 *
 * Doel: voorkomen dat de UPDATE-policy op nutrition_meal_items (toegevoegd
 * in migratie_v545.sql, nadat live was bevestigd dat hij ontbrak en de
 * app-aanroep sbPatchQ('nutrition_meal_items', ...) daardoor stil 0 rijen
 * raakte) ooit stilzwijgend weer verdwijnt of verzwakt wordt.
 *
 * STATISCHE CONTRACT-CHECK (geen netwerk nodig). De daadwerkelijke live-
 * RLS-gedragstest (eigen update toegestaan, andermans update geblokkeerd,
 * re-parenten naar andermans meal geblokkeerd, select/insert/delete
 * ongewijzigd) is apart uitgevoerd op de productiedatabase (transactie +
 * rollback per scenario, geen blijvende testdata), consistent met het
 * bestaande patroon (fSocialRlsMultiTenant.test.js).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v545.sql'), 'utf8');

// ---- De policy zelf ----
ok(/create policy nmi_update_own on public\.nutrition_meal_items\s*\n\s*for update/i.test(migratie),
  'A1: nmi_update_own bestaat als UPDATE-policy op nutrition_meal_items');

// ---- USING: zelfde ownership-model als select/insert/delete (via meal_id -> nutrition_meals.user_id) ----
ok(/using\s*\(\s*\n?\s*exists\s*\(\s*\n?\s*select 1 from public\.nutrition_meals m\s*\n\s*where m\.id = nutrition_meal_items\.meal_id\s*\n\s*and m\.user_id = auth\.uid\(\)/i.test(migratie),
  'B1: USING controleert eigenaarschap via nutrition_meals.user_id = auth.uid()');

// ---- WITH CHECK: dezelfde voorwaarde (voorkomt re-parenten naar andermans meal) ----
const updateBlockMatch = migratie.match(/create policy nmi_update_own[\s\S]*?;/i);
ok(!!updateBlockMatch, 'C0: het volledige nmi_update_own-statement is te vinden');
const updateBlock = updateBlockMatch ? updateBlockMatch[0] : '';
ok(/with check\s*\(\s*\n?\s*exists\s*\(\s*\n?\s*select 1 from public\.nutrition_meals m\s*\n\s*where m\.id = nutrition_meal_items\.meal_id\s*\n\s*and m\.user_id = auth\.uid\(\)/i.test(updateBlock),
  'C1: WITH CHECK gebruikt exact dezelfde ownership-voorwaarde als USING (voorkomt re-parenten naar andermans meal)');

// ---- Geen nieuw/ander ownership-concept: geen extra kolom, geen andere policy-naam voor dit doel ----
ok(!/nmi_update_own[\s\S]{0,300}created_by/i.test(migratie),
  'D1: geen nieuw created_by-gebaseerd ownership-concept geïntroduceerd voor meal_items');

// ---- Scope-discipline: geen andere Nutrition-policy in dit bestand aangeraakt ----
ok(!/drop policy[\s\S]{0,80}nmi_select_own|drop policy[\s\S]{0,80}nmi_insert_own|drop policy[\s\S]{0,80}nmi_delete_own/i.test(migratie),
  'E1: select/insert/delete-policies van nutrition_meal_items worden niet aangeraakt');
ok(!/create table|alter table[\s\S]{0,40}add column|drop table|truncate/i.test(migratie),
  'E2: geen tabelwijziging, nieuwe kolom of datawijziging in dit bestand');

// ---- Idempotentie: DROP POLICY IF EXISTS vóór CREATE POLICY ----
ok(/drop policy if exists nmi_update_own on public\.nutrition_meal_items;\s*\n\s*create policy nmi_update_own/i.test(migratie),
  'F1: idempotent via DROP POLICY IF EXISTS vóór CREATE POLICY');

console.log('fNutritionMealItemsRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
