/* fCalculationRegistryCoverage.test.js — F13 Post-Audit Remediation P1-06/07/11.
 * Bewaakt de herbeoordeelde staat: HRV-baseline is een echt tijdrollend
 * model (geen vaste rijentelling), CALC-REC-001 is volledig geregistreerd
 * met expliciete Implementation-locatie, en ai_guard.v1 is nu ook
 * formeel gedocumenteerd (CALC-GUARD-001).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'docs/CALCULATION_REGISTRY.md'), 'utf8');

// ---- P1-07: HRV-baseline gebruikt een echt tijdrollend venster, geen vaste rijentelling ----
ok(html.match(/days\s*=\s*Math\.max\(0,\s*Math\.round\(\(ref-rows\[0\]\.date\)\/86400000\)\)/),
  'A1: hrvBaseline() berekent het venster op basis van werkelijk verstreken dagen (tijdrollend), niet een vast aantal rijen');
ok(html.includes('HRV_BASELINE_MIN_DAYS = 14') && html.includes('HRV_BASELINE_FULL_DAYS = 28'),
  'A2: de baseline-vensterwaarden (14/28 dagen) zijn expliciet, benoemde constanten, geen magic numbers');

// ---- P1-06: CALC-REC-001 is volledig geregistreerd, inclusief expliciete locatie ----
ok(registry.includes('CALC-REC-001') && registry.includes('Implementation | `index.html`'),
  'B1: CALC-REC-001 vermeldt expliciet dat de implementatie in index.html staat -- transparant, geen verborgen shadow-calculation');
ok(registry.includes('Plews DJ'), 'B2: CALC-REC-001 bevat een concrete, geciteerde wetenschappelijke bron');

// ---- P1-11: ai_guard.v1 is nu ook formeel geregistreerd ----
ok(registry.includes('CALC-GUARD-001') && registry.includes('ai_guard.v1'),
  'C1: ai_guard.v1 is nu geregistreerd als CALC-GUARD-001, met een expliciete classificatie als guard (geen zelfstandige calculation)');

console.log('fCalculationRegistryCoverage: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
