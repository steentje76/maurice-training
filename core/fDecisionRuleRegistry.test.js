/* fDecisionRuleRegistry.test.js — MS-F3-07 regressietest.
 *
 * A. Functionele tests voor de kern-Decision-Rules (golden cases, determinisme).
 * B. Structurele registry-tests voor DECISION_RULE_REGISTRY.md.
 * C. Sabotagebewijs voor de belangrijkste guardrail: readinessDay() mag nooit een
 *    "rest"/"stop"-zone verzinnen die niet uit de bestaande regels volgt.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DecisionCore = require(path.join(ROOT, 'core/decision.js'));
const registryText = fs.readFileSync(path.join(ROOT, 'docs/DECISION_RULE_REGISTRY.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Golden cases per Decision Rule ----
ok(DecisionCore.computeProgression(7, 100).label === 'Verhogen', 'DEC-PROG-001: RPE 7 -> Verhogen');
ok(DecisionCore.computeProgression(8, 100).delta === 0, 'DEC-PROG-001: RPE 8 -> gelijk houden (delta 0)');
ok(DecisionCore.computeProgression(9.5, 100).label === 'Deload', 'DEC-PROG-001: RPE 9.5 -> Deload');
ok(DecisionCore.computeProgression(null, 100) === null, 'DEC-PROG-001: geen RPE -> null (geen fabricage)');

ok(DecisionCore.trainReadiness({ factor: 1.02 }).cls === 'g', 'DEC-READY-001: factor 1.02 -> klaar (g)');
ok(DecisionCore.trainReadiness({ factor: 0.95 }).cls === 'y', 'DEC-READY-001: factor 0.95 -> op gevoel (y)');
ok(DecisionCore.trainReadiness({ factor: 0.85 }).cls === 'r', 'DEC-READY-001: factor 0.85 -> licht houden (r)');
ok(DecisionCore.trainReadiness(null) === null, 'DEC-READY-001: geen dfInfo -> null');

ok(DecisionCore.restForSet(90, 6) === 70, 'DEC-REST-001: RPE6 -> 0.75x (90*0.75=67.5, afgerond op 5s -> 70)');
ok(DecisionCore.restForSet(90, null) === 90, 'DEC-REST-001: geen RPE -> basisrust ongewijzigd, geen fabricage');
ok(DecisionCore.restForSet(10, 9) === 30, 'DEC-REST-001: ondergrens van 30s wordt gerespecteerd');

// Determinisme: zelfde input, zelfde output
ok(JSON.stringify(DecisionCore.computeProgression(7, 100)) === JSON.stringify(DecisionCore.computeProgression(7, 100)),
  'DEC-PROG-001 is deterministisch');

// ---- B. readinessDay(): geen fabricage bij ontbrekende dagfactor ----
{
  const geenData = DecisionCore.readinessDay({ dagfactor: null, herstel: null, signalen: {} });
  ok(geenData.bruikbaar === false, 'readinessDay(): zonder dagfactor is de uitkomst niet bruikbaar (geen geschat advies)');
  ok(geenData.zone === null, 'readinessDay(): zonder dagfactor bestaat er geen zone (niet geschat)');
  ok(geenData.trainingsadvies.soort === 'geen_advies', 'readinessDay(): zonder data expliciet "geen_advies", geen verzonnen keuze');
}

// ---- C. GUARDRAIL-SABOTAGETEST: readinessDay() mag nooit meer dan de 3 gedefinieerde
// zones ('ready'/'caution'/'reduce') opleveren -- met name nooit een verzonnen
// 'rest'/'stop'-zone die niet uit trainReadiness() volgt. ----
{
  const volledigeInput = {
    dagfactor: 0.80,
    herstel: { score: 40, band: 'laag', confidence: 'hoog' },
    signalen: {
      hrv: { waarde: 30 }, rhr: { waarde: 60 }, slaap: { waarde: 5 },
      spierherstel: [{ muscle: 'borst', pct: 50 }], gevoel: 'slecht', pijn: null,
      trainingsdagen7: 5
    }
  };
  const uitkomst = DecisionCore.readinessDay(volledigeInput);
  const TOEGESTANE_ZONES = ['ready', 'caution', 'reduce'];
  ok(TOEGESTANE_ZONES.indexOf(uitkomst.zone) >= 0,
    'readinessDay() geeft zelfs bij een zeer slechte dag alleen een van de 3 gedefinieerde zones -- nooit een verzonnen "rest"/"stop"-zone zonder onderliggende regel');
}

// ---- D. Registry-structuur ----
const rules = registryText.match(/\| (DEC-[A-Z0-9-]+) \|/g) || [];
const uniqueRuleIds = new Set(rules.map(r => r.replace(/[|\s]/g, '')));
ok(uniqueRuleIds.size === 9, 'exact 9 unieke Decision Rule ID\'s geregistreerd');

ok(/ACWR-guardrail: BEVESTIGD INTACT/.test(registryText), 'registry bevestigt expliciet de ACWR-guardrail-heraudit');
ok(/HRV-guardrail: BEVESTIGD INTACT/.test(registryText), 'registry bevestigt expliciet de HRV-guardrail-heraudit');
ok(/GEEN VIOLATIE GEVONDEN/.test(registryText), 'registry bevestigt expliciet dat geen AI-als-decision-engine-violatie is gevonden');

console.log('fDecisionRuleRegistry: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
