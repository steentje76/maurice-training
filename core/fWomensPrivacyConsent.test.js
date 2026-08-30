/* fWomensPrivacyConsent.test.js — MS-F8-02 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const consentDoc = fs.readFileSync(path.join(ROOT, 'docs/MS-F8-02_WOMENS_PRIVACY_CONSENT_MODEL.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const fnMatch = html.match(/async function cyclusVerwijderAlleData\(\)\{[\s\S]*?\n\}/);
const fnSrc = fnMatch ? fnMatch[0] : '';

// ---- A. Delete-fix ----
ok(fnSrc.length > 0, 'A0: cyclusVerwijderAlleData() bestaat');
ok(fnSrc.includes("sbDel('cycle_periods'"), 'A1: verwijdert cycle_periods');
ok(fnSrc.includes("sbDel('cycle_symptom_logs'"), 'A2: verwijdert OOK cycle_symptom_logs (gerepareerde bug)');
ok(/if\(!okPeriodes\|\|!okSymptomen\)/.test(fnSrc), 'A3: faalt zichtbaar als een van beide verwijderingen mislukt');

// ---- B. Geen coach-proxy-toegang tot cyclus-data (delete-account.js is een
//         legitieme uitzondering: verwijdert bij accountverwijdering, leest niet) ----
const netlifyDir = path.join(ROOT, 'netlify/functions');
let coachProxyRaaktCyclusAan = false;
if (fs.existsSync(netlifyDir)) {
  fs.readdirSync(netlifyDir).forEach(function (f) {
    if (!f.endsWith('.js') || f === 'delete-account.js') return;
    const src = fs.readFileSync(path.join(netlifyDir, f), 'utf8');
    if (/cycle_periods|cycle_symptom_logs/i.test(src)) coachProxyRaaktCyclusAan = true;
  });
}
ok(!coachProxyRaaktCyclusAan, 'B1: geen enkele coach-proxy/wearable-sync-functie raakt cycle_periods/cycle_symptom_logs aan (delete-account.js uitgezonderd -- legitieme volledige-verwijdering-flow)');
{
  const delAcc = fs.readFileSync(path.join(netlifyDir, 'delete-account.js'), 'utf8');
  ok(delAcc.includes("'cycle_periods'") && delAcc.includes("'cycle_symptom_logs'"),
    'B2: delete-account.js verwijdert bij volledige accountverwijdering wél beide cyclus-tabellen (correct, geen orphaned records)');
}

// ---- C. Geen observability/logging met cyclus-data ----
ok(!/ObservabilityCore\.[a-zA-Z]+\([^)]*cycl/i.test(html), 'C1: geen observability-aanroep met cyclus-data als argument');

// ---- D. Adversarial RLS-tests gedocumenteerd ----
ok(consentDoc.includes('user_b_ziet_van_user_a'), 'D1: het privacy-rapport documenteert de live cross-user-RLS-test');
ok(consentDoc.includes('anon_ziet_cycle_periods'), 'D2: het privacy-rapport documenteert de live anonieme-toegang-test');

console.log('fWomensPrivacyConsent: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
