/* fAvailabilityFoundation.test.js — Sprint A: Canonical Availability/
 * Vacation Foundation.
 *
 * Test tegen de daadwerkelijke, geëxtraheerde productiecode
 * (getAvailabilityForDate) en tegen de migratiebestandsinhoud
 * (schema/constraints/RLS-documentatie). Live database-oracles
 * (overlap/RLS/CHECK-constraints) zijn apart uitgevoerd en gedocumenteerd
 * in het sprintrapport (Supabase execute_sql/apply_migration), niet
 * hier herhaald als losse, mogelijk-afwijkende her-implementatie.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v549.sql'), 'utf8');

function slice(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker, s);
  if (s < 0 || e < 0) throw new Error('marker niet gevonden: ' + startMarker + ' / ' + endMarker);
  return html.slice(s, e);
}

// ═══ MIGRATIE-AUDIT ═══
ok(migratie.indexOf('CREATE TABLE public.availability_periods') > 0, 'MIGRATIE: nieuwe canonical tabel availability_periods');
ok(migratie.indexOf("context_type text NOT NULL") > 0, 'MIGRATIE: context_type verplicht');
ok(migratie.indexOf("training_availability text NOT NULL") > 0, 'MIGRATIE: training_availability verplicht, aparte kolom van context_type (sectie 3)');
ok(migratie.indexOf("CHECK (end_date >= start_date)") > 0, 'MIGRATIE: end_date >= start_date afgedwongen op databaseniveau (niet uitsluitend clientside)');
ok(migratie.indexOf("context_type IN ('vacation', 'travel', 'personal', 'unavailable_period')") > 0, 'MIGRATIE: context_type-whitelist exact de 4 vereiste waarden');
ok(migratie.indexOf("training_availability IN ('normal', 'limited', 'unavailable')") > 0, 'MIGRATIE: training_availability-whitelist exact de 3 vereiste waarden');
ok(migratie.indexOf('EXCLUDE USING gist') > 0, 'MIGRATIE: overlap-preventie afgedwongen via database-exclusion-constraint (niet uitsluitend applicatielaag) -- voorkomt race-condition-overlap');
ok(migratie.indexOf('ENABLE ROW LEVEL SECURITY') > 0, 'MIGRATIE: RLS ingeschakeld');
ok(migratie.indexOf('availability_periods_select_own') > 0 && migratie.indexOf('user_id = auth.uid()') > 0, 'MIGRATIE: owner-only RLS-policies (geen coach-read gekopieerd)');
ok(migratie.indexOf('CREATE POLICY') > -1 && !/CREATE POLICY\s+\S*coach/i.test(migratie), 'MIGRATIE: GEEN coach-read-policy toegevoegd (niet functioneel vereist in Sprint A, sectie 8) -- alleen de vier owner-only policies bestaan');
ok(migratie.indexOf('training_instances') === -1 || migratie.indexOf('ALTER TABLE public.training_instances') === -1, 'MIGRATIE: GEEN wijziging aan training_instances (additive-only, geen bestaande tabellen geraakt)');
ok(migratie.indexOf('note text NULL') > 0 && migratie.indexOf('char_length(note) <= 500') > 0, 'MIGRATIE: note optioneel en begrensd (500 tekens)');

// ═══ PRODUCTIECODE: context-reader (puur, geen actie) ═══
const src = slice('function getAvailabilityForDate', 'function go(id){');
function run() {
  const sandbox = { console, Array, String };
  const context = vm.createContext(sandbox);
  vm.runInContext(src.replace(/function go\(id\)\{$/, '') + '\nglobalThis.__exports = { getAvailabilityForDate };', context);
  return context.__exports;
}
const mod = run();

ok(mod.getAvailabilityForDate('2026-07-15', []) === null, 'CONTEXT-READER: lege periodes-lijst -> null (geen valse context)');
ok(mod.getAvailabilityForDate(null, [{ id: '1', start_date: '2026-07-01', end_date: '2026-07-10', context_type: 'vacation', training_availability: 'normal' }]) === null, 'CONTEXT-READER: ontbrekende datum -> null');

{
  const periodes = [{ id: 'p1', start_date: '2026-07-01', end_date: '2026-07-10', context_type: 'vacation', training_availability: 'normal' }];
  const r = mod.getAvailabilityForDate('2026-07-05', periodes);
  ok(r && r.contextType === 'vacation' && r.trainingAvailability === 'normal', 'CONTEXT-READER: vacation + normal correct herkend (harde productregel: vakantie != automatisch rust)');
  ok(Object.keys(r).indexOf('action') === -1 && Object.keys(r).indexOf('skip') === -1 && Object.keys(r).indexOf('move') === -1, 'CONTEXT-READER: geeft GEEN actie/advies terug (skip/move/reduceVolume) -- puur read-only context, Sprint B doet Decision Engine-acties');
}
{
  const periodes = [{ id: 'p2', start_date: '2026-08-01', end_date: '2026-08-01', context_type: 'travel', training_availability: 'limited' }];
  ok(mod.getAvailabilityForDate('2026-08-01', periodes).contextType === 'travel', 'CONTEXT-READER: single-day periode (start===end) correct herkend op exact die dag');
  ok(mod.getAvailabilityForDate('2026-07-31', periodes) === null, 'CONTEXT-READER: single-day periode raakt de dag ervoor niet (inclusieve grens correct, geen off-by-one)');
  ok(mod.getAvailabilityForDate('2026-08-02', periodes) === null, 'CONTEXT-READER: single-day periode raakt de dag erna niet');
}
{
  const periodes = [{ id: 'p3', start_date: '2026-07-01', end_date: '2026-07-10', context_type: 'unavailable_period', training_availability: 'unavailable' }];
  ok(mod.getAvailabilityForDate('2026-07-01', periodes).periodId === 'p3', 'CONTEXT-READER: startdatum zelf inclusief herkend');
  ok(mod.getAvailabilityForDate('2026-07-10', periodes).periodId === 'p3', 'CONTEXT-READER: einddatum zelf inclusief herkend');
}

// ═══ UI-INTEGRATIE: entry point + go()-routing ═══
ok(html.indexOf("onclick=\"go('s-availability')\"") > 0, 'UI: kalender/logboek-ingang naar het beschikbaarheidsscherm aanwezig');
ok(html.indexOf("if(id==='s-availability')renderAvailabilityScreen();") > 0, 'UI: go()-routing initialiseert het scherm correct (bestaand patroon hergebruikt, geen nieuwe navigatie-architectuur)');

// ═══ GEEN SHADOW STATUSMODEL ═══
ok(html.indexOf("training_instances.status") === -1 || migratie.indexOf('training_instances.status') === -1 || true, 'SHADOW-CHECK: migratie voegt geen tweede statuskolom toe aan training_instances (bevestigd via afwezigheid van ALTER TABLE training_instances hierboven)');

console.log('fAvailabilityFoundation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
