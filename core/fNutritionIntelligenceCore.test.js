/* fNutritionIntelligenceCore.test.js — B9-11 Nutrition Intelligence.
 * Bewaakt: determinisme, geen shadow calculation, logging-gap != nutrition-gap,
 * geen hidden thresholds, evidence-koppeling, geen dosering.
 */
'use strict';
const NIC = require('./nutritionIntelligence.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. trainingWindowSummary: puur tellen, geen dosering ----
{
  const r = NIC.trainingWindowSummary([{ timing_context: 'pre_training' }, { timing_context: 'post_training' }, { timing_context: 'post_training' }, { timing_context: null }]);
  ok(r.pre_training_entries === 1 && r.post_training_entries === 2 && r.during_training_entries === 0,
    'A1: entries worden correct geteld per timing_context, een entry zonder timing_context telt in geen enkele categorie');
}
ok(NIC.trainingWindowSummary(null).status === 'NOT_AVAILABLE',
  'A2: ontbrekende entries (null) geeft NOT_AVAILABLE, nooit 0 (missing != zero)');

// ---- B. buildNutritionContext: pure samenvatting, geen aanbeveling ----
{
  const dailyTotals = { energy_kcal_logged_total: 500, protein_g_logged_total: null, carbohydrate_g_logged_total: 60, fat_g_logged_total: null, fluid_ml_logged_total: 250, data_quality: { energy_kcal: 'PARTIAL' } };
  const ctx = NIC.buildNutritionContext([{ timing_context: 'pre_training' }], dailyTotals);
  ok(ctx.logged_energy === 500 && ctx.logged_protein === null, 'B1: de context neemt de reeds berekende totalen exact over, geen eigen herberekening');
  ok(ctx.pre_training_entries === 1, 'B2: de context bevat het trainingWindowSummary-resultaat');
  ok(!('recommendation' in ctx) && !('advice' in ctx) && !('target' in ctx), 'B3: de context bevat geen enkel aanbevelings-/doel-veld -- Context Engine contextualiseert, beslist niet');
}

// ---- C. evaluateNutritionDecisionRules: logging-gap != nutrition-gap (sectie 16) ----
{
  const ctx = { pre_training_entries: 0, during_training_entries: 0, post_training_entries: 0 };
  const r = NIC.evaluateNutritionDecisionRules(ctx);
  ok(r.outcome === 'insufficient_data', 'C1: 0 registraties geeft expliciet "insufficient_data"');
  ok(!r.message.match(/te weinig|niet genoeg gegeten|niet genoeg gedronken|tekort/i),
    'C2 (absolute regel): de boodschap claimt NOOIT dat de sporter te weinig at/dronk -- uitsluitend dat er geen registratie is (logging-gap != nutrition-gap)');
}
{
  const ctx = { pre_training_entries: 1, during_training_entries: 0, post_training_entries: 1 };
  const r = NIC.evaluateNutritionDecisionRules(ctx);
  ok(r.outcome === 'context_available' && r.signals.length === 2, 'C3: bij aanwezige registraties worden exact de juiste signalen geretourneerd (pre + post, geen during)');
  ok(r.signals.every(s => s.evidence_id), 'C4: elk signaal is gekoppeld aan een evidence_id -- geen ongeregistreerde, verzonnen bewering');
  ok(r.signals.every(s => s.confidence === 'LOW'), 'C5: elk signaal draagt expliciet een lage confidence (technische aanwezigheid, geen sterke claim)');
}
ok(NIC.evaluateNutritionDecisionRules(null).outcome === 'NOT_AVAILABLE',
  'C6: ontbrekende context geeft NOT_AVAILABLE, geen crash, geen stille aanname');

// ---- D. Geen hidden thresholds (sectie 48/49) ----
{
  const fs = require('fs');
  const code = fs.readFileSync(__filename.replace('fNutritionIntelligenceCore.test.js', 'nutritionIntelligence.js'), 'utf8');
  ok(!code.match(/protein[a-z_]*\s*[<>]|fluid[a-z_]*\s*[<>]|energy[a-z_]*\s*[<>]|carbohydrate[a-z_]*\s*[<>]|kcal[a-z_]*\s*[<>]/i),
    'D1: geen enkele "waarde < drempel"-vergelijking op een nutrition-veld -- geen "low protein"/"low hydration"-classificatie zonder contract');
}

// ---- E. Determinisme, geen mutatie ----
{
  const entries = [{ timing_context: 'pre_training' }];
  const kopie = JSON.parse(JSON.stringify(entries));
  const r1 = NIC.trainingWindowSummary(entries);
  const r2 = NIC.trainingWindowSummary(entries);
  ok(JSON.stringify(r1) === JSON.stringify(r2), 'E1 (determinisme): identieke input geeft identieke output');
  ok(JSON.stringify(entries) === JSON.stringify(kopie), 'E2 (geen mutatie): de input-array wordt niet gewijzigd');
}

console.log('fNutritionIntelligenceCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
