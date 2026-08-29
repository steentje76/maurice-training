/* fRowingErgIntelligence.test.js — MS-F6-03 regressietest.
 *
 * A. Bevestigt dat CardioCore.criticalPower() (gebouwd in MS-F6-02) sportagnostisch
 *    is en correct werkt met realistische Concept2-ergdata -- geen nieuwe,
 *    gedupliceerde CP-functie voor roeien.
 * B. Bevestigt dat ProgressionCore.trendBy() ook direct herbruikbaar is voor
 *    roeisplit-trends -- geen nieuwe, gedupliceerde trendfunctie.
 * C. Regressie-lock: de rowing-coachingtekst blijft de MS-F6-02-fix bevatten.
 * D. Bevestigt dat measured-vs-derived-vermogen-onderscheid (uit F5-02) nog intact is.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CardioCore = require(path.join(ROOT, 'core/cardio.js'));
const ProgressionCore = require(path.join(ROOT, 'core/progression.js'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. criticalPower() herbruikbaar voor Concept2-ergdata (geen nieuwe functie) ----
{
  const split2k = 420 / (2000 / 500); // 2k roeien in 7:00 -> 105s/500m
  const split500 = 85; // 500m-sprint in 1:25
  const w2k = CardioCore.wattFromSplit500(split2k);
  const w500 = CardioCore.wattFromSplit500(split500);
  const r = CardioCore.criticalPower([{ avg_power_w: w2k, duration_s: 420 }, { avg_power_w: w500, duration_s: 85 }]);
  ok(r.status === 'valid' && r.cp_w > 200 && r.cp_w < 260,
    'A1: criticalPower() met realistische, uit de officiële Concept2-splitformule afgeleide watt-waarden -> plausibele CP (~234W)');
  ok(r.w_prime_j > 0, 'A1: W-prime plausibel positief');
}

// ---- B. trendBy() herbruikbaar voor roeisplit-trends ----
{
  const history = [
    { key: 'row_2k', split_500m_s: 110, date: '2026-07-01' },
    { key: 'row_2k', split_500m_s: 107, date: '2026-07-15' },
    { key: 'row_2k', split_500m_s: 104, date: '2026-08-01' }
  ];
  const trend = ProgressionCore.trendBy(history, 'row_2k', 'split_500m_s', 'min', 3);
  ok(trend.status === 'trend' && trend.improving === true,
    'B1: dalende 500m-split (sneller) over 3 vergelijkbare 2k-pogingen -> trend, improving=true');
}

// ---- C. Regressie-lock op de MS-F6-02-fix voor de rowing-coachingtekst ----
ok(!html.includes('voorspel 2K/5K-prestaties'), 'de roei-coachingtekst bevat nog steeds niet de eerder verwijderde voorspellingstaal');
ok(html.includes('AI voorspelt zelf geen toekomstige prestatie'), 'de roei-coachingtekst bevat nog steeds de expliciete MS-F6-02-grens');

// ---- D. Measured-vs-derived-vermogen-onderscheid (F5-02-erfenis) nog intact ----
ok(html.includes("concept2_derived") && html.includes("(afgeleid)"),
  'het measured-vs-derived-vermogen-onderscheid uit F5-02 blijft intact -- geen regressie tijdens deze sprint');

console.log('fRowingErgIntelligence: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
