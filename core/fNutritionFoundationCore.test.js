/* fNutritionFoundationCore.test.js — B9-09 Nutrition Foundation.
 * Bewaakt: determinisme, missing != zero, validatie, partial totals.
 */
'use strict';
const NFC = require('./nutritionFoundation.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. validateEntry ----
ok(NFC.validateEntry({ occurred_at: '2026-01-01T08:00:00Z', entry_type: 'meal' }).valid,
  'A1: een minimale, geldige entry (alleen occurred_at + entry_type) is geldig -- nutrition-waarden zijn optioneel');
ok(!NFC.validateEntry({ occurred_at: '2026-01-01T08:00:00Z', entry_type: 'invalid_type' }).valid,
  'A2: een ongeldig entry_type wordt geweigerd');
ok(!NFC.validateEntry({ entry_type: 'meal' }).valid,
  'A3: ontbrekende occurred_at wordt geweigerd');
ok(!NFC.validateEntry({ occurred_at: '2026-01-01T08:00:00Z', entry_type: 'hydration', fluid_ml: -100 }).valid,
  'A4: een negatieve fluid_ml wordt geweigerd (technische sanity-check, sectie 24)');
ok(!NFC.validateEntry({ occurred_at: '2026-01-01T08:00:00Z', entry_type: 'meal', energy_kcal: 999999 }).valid,
  'A5: een absurd hoge energy_kcal wordt geweigerd (brede, technische limiet)');
ok(NFC.validateEntry({ occurred_at: '2026-01-01T08:00:00Z', entry_type: 'meal', protein_g: null }).valid,
  'A6: expliciet null voor protein_g is geldig -- missing is nooit een fout');
ok(!NFC.validateEntry({ occurred_at: '2026-01-01T08:00:00Z', entry_type: 'meal', note: 'x'.repeat(501) }).valid,
  'A7: een te lange notitie wordt geweigerd (lengtebeperking, sectie 25)');
ok(NFC.validateEntry({ occurred_at: '2026-01-01T08:00:00Z', entry_type: 'meal', timing_context: 'pre_training' }).valid,
  'A8: een geldige timing_context (losstaand van entry_type) is geldig');

// ---- B. dailyLoggedTotals: missing != zero, logged_total != actual_intake ----
{
  const r = NFC.dailyLoggedTotals([]);
  ok(r.status === 'NOT_AVAILABLE' && r.energy_kcal_logged_total === null,
    'B1: 0 entries geeft NOT_AVAILABLE, nooit "0 kcal" -- geen data is geen 0-inname');
}
{
  const entries = [{ protein_g: 30, energy_kcal: 500 }, { protein_g: 20, energy_kcal: 400 }, { protein_g: 25 }];
  const r = NFC.dailyLoggedTotals(entries);
  ok(r.protein_g_logged_total === 75, 'B2: protein_g wordt correct opgeteld over alle 3 entries (30+20+25)');
  ok(r.data_quality.protein_g === 'COMPLETE', 'B3: protein_g is COMPLETE -- alle 3 entries hadden een waarde');
  ok(r.energy_kcal_logged_total === 900, 'B4: energy_kcal wordt correct opgeteld over de 2 entries die het bevatten (500+400)');
  ok(r.data_quality.energy_kcal === 'PARTIAL', 'B5: energy_kcal is PARTIAL -- slechts 2 van de 3 entries hadden een waarde, dit is GEEN "totale daginname"');
  ok(r.data_quality.fat_g === 'NOT_AVAILABLE', 'B6: fat_g is NOT_AVAILABLE -- geen enkele entry had een waarde, nooit 0');
  ok(r.fat_g_logged_total === null, 'B7: fat_g_logged_total is expliciet null, niet 0');
}
{
  // Determinisme + geen mutatie
  const entries = [{ protein_g: 10 }];
  const kopie = JSON.parse(JSON.stringify(entries));
  const r1 = NFC.dailyLoggedTotals(entries);
  const r2 = NFC.dailyLoggedTotals(entries);
  ok(JSON.stringify(r1) === JSON.stringify(r2), 'B8 (determinisme): identieke input geeft identieke output');
  ok(JSON.stringify(entries) === JSON.stringify(kopie), 'B9 (geen mutatie): de input-array wordt niet gewijzigd');
}

// ---- C. Geen shadow decision: geen "low"/"high"/"warning"-classificatie ----
ok(!('warning' in NFC.dailyLoggedTotals([{ protein_g: 5 }])) && !('status_label' in NFC),
  'C1: geen enkel "warning"/"low"/"high"-veld in de output -- registreren, niet diagnosticeren');

console.log('fNutritionFoundationCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
