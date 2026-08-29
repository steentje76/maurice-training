/* fCyclingIntelligence.test.js — MS-F6-02 regressietest.
 *
 * A. Golden cases voor CardioCore.criticalPower(): geldig, onvoldoende data,
 *    identieke duren, ongeldige input.
 * B. Bevestigt dat de vier gecorrigeerde SPORT_BLOCKS-coachingteksten (HYROX/
 *    zwemmen/wielrennen/roeien) geen AI-herberekenings-/voorspellingsinstructies
 *    meer bevatten (regressie-lock op een kritieke, tijdens deze sprint gevonden
 *    en gefixte AI-boundary-schending).
 * C. Bevestigt dat FTP geen daadwerkelijk datamodel-veld is.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CardioCore = require(path.join(ROOT, 'core/cardio.js'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Golden cases: criticalPower() ----
{
  const r1 = CardioCore.criticalPower([{ avg_power_w: 250, duration_s: 1200 }, { avg_power_w: 320, duration_s: 300 }]);
  ok(r1.status === 'valid' && Math.abs(r1.cp_w - 226.667) < 0.01, 'A1: 2 geldige, verschillende duren -> geldige CP (~227W)');
  ok(r1.w_prime_j > 0, 'A1: W-prime (anaerobe werkcapaciteit) is positief en plausibel');

  const r2 = CardioCore.criticalPower([{ avg_power_w: 250, duration_s: 1200 }]);
  ok(r2.status === 'insufficient' && r2.reason === 'min_2_performances_required', 'A2: 1 performance -> insufficient');

  const r3 = CardioCore.criticalPower([{ avg_power_w: 250, duration_s: 1200 }, { avg_power_w: 300, duration_s: 1200 }]);
  ok(r3.status === 'insufficient' && r3.reason === 'durations_not_distinct', 'A3: identieke duren -> insufficient');

  const r4 = CardioCore.criticalPower('geen array');
  ok(r4.status === 'invalid', 'A4: niet-array-invoer -> invalid, fail-closed');
}

// ---- B. Regressie-lock: geen AI-herberekenings-/voorspellingsinstructies meer ----
ok(!html.includes('Pas vermogenszones aan, herschat FTP'), 'de cycling-coachingtekst instrueert de AI niet langer om vermogenszones aan te passen en FTP te herschatten');
ok(!html.includes('Herbereken CSS'), 'de zwem-coachingtekst instrueert de AI niet langer om CSS te herberekenen');
ok(!html.includes('voorspel racepace'), 'de HYROX-coachingtekst instrueert de AI niet langer om racepace te voorspellen');
ok(!html.includes('voorspel 2K/5K-prestaties'), 'de roei-coachingtekst instrueert de AI niet langer om prestaties te voorspellen');
ok(html.includes('AI herschat FTP zelf nooit'), 'de cycling-coachingtekst bevat nu de expliciete FTP-grens');
ok(html.includes('AI berekent of herberekent CSS zelf nooit'), 'de zwem-coachingtekst bevat nu de expliciete CSS-grens');
ok(html.includes('AI voorspelt zelf geen toekomstige prestatie'), 'de roei-coachingtekst bevat nu de expliciete voorspellingsgrens');

// ---- C. FTP is geen datamodel-veld ----
ok(!html.includes("col:'ftp'"),
  'FTP bestaat nergens als daadwerkelijk sessions-datamodel-veld -- uitsluitend conceptuele sportmetadata');

console.log('fCyclingIntelligence: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
