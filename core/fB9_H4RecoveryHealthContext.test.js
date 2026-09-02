/* core/fB9_H4RecoveryHealthContext.test.js
 * B9-H4 Recovery & Health Context 9+ Functional Hardening.
 * Bewaakt de forensische audit-bevindingen: missing != zero,
 * Decision Rules-grens (HRV nooit enkelvoudig doorslaggevend),
 * geen parallelle waarheden voor training load, en de nieuw
 * gedocumenteerde HRV-metric-type-limitatie.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SyncLib = require('../netlify/functions/_wearableSyncLib.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const decision = fs.readFileSync(path.join(ROOT, 'core/decision.js'), 'utf8');
const delAcct = fs.readFileSync(path.join(ROOT, 'netlify/functions/delete-account.js'), 'utf8');
const metricContracts = fs.readFileSync(path.join(ROOT, 'docs/B9_H4_RECOVERY_METRIC_CONTRACTS.md'), 'utf8');

// ---- 1. Missing != Zero, live herbevestigd, nu als regressietest vastgelegd ----
ok(SyncLib.parseHrvPoint({ dailyHeartRateVariability: { date: { year: 2026, month: 4, day: 20 } } }).value === null,
  '1a: ontbrekende HRV-waarde -> null, NOOIT 0 (live herbevestigd tijdens B9-H4)');
ok(SyncLib.parseRhrPoint({ dailyRestingHeartRate: { date: { year: 2026, month: 4, day: 20 } } }).value === null,
  '1b: ontbrekende RHR-waarde -> null, NOOIT 0');

// ---- 2. Decision Rules-grens: HRV is nooit enkelvoudig doorslaggevend (sectie 7) ----
ok(decision.includes("READINESS_SIGNALEN = ['hrv', 'rhr', 'slaap', 'spierherstel', 'gevoel', 'trainingsbelasting']"),
  '2a: HRV is één van zes gelijkwaardige readiness-signalen, geen aparte, dominante status');
ok(!decision.match(/if\s*\(\s*hrv[^)]*<[^)]*\)\s*{\s*[^}]*rust/i) && !decision.match(/hrv\s*<\s*\d+.*verplicht/i),
  '2b: geen harde, enkelvoudige HRV-drempel-regel die een rustdag afdwingt (repo-brede check op decision.js)');

// ---- 3. Geen parallelle waarheden voor training load (sectie 5) ----
{
  const calc = fs.readFileSync(path.join(ROOT, 'core/calculation.js'), 'utf8');
  ok(!calc.match(/recovery_training_load|hrv_log\.load|duplicate.*trainingsbelasting/i),
    '3: geen aparte, gedupliceerde training-load-kopie binnen de recovery-laag -- canonieke training-history blijft de enige bron');
}

// ---- 4. Account deletion (reeds bestaand, herbevestigd) ----
ok(delAcct.includes("'hrv_log'"),
  '4: hrv_log staat in de account-deletion-lijst (reeds bestaand)');

// ---- 5. HRV-metric-type-limitatie expliciet gedocumenteerd (nieuwe, zelf gevonden bevinding) ----
ok(metricContracts.includes('RMSSD vs SDNN') || metricContracts.match(/RMSSD.*SDNN/i),
  '5a (zelf gevonden, wetenschappelijk onderbouwd): de limitatie dat Google Health se HRV-veld zowel RMSSD (Garmin/Fitbit/Oura) als SDNN (Apple) kan representeren, zonder dit vast te leggen, is expliciet gedocumenteerd in de Metric Contracts -- niet stilzwijgend genegeerd');
{
  const syncLibSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_wearableSyncLib.js'), 'utf8');
  ok(syncLibSrc.includes('RMSSD'),
    '5b: de bestaande code-commentaar benoemt zelf al de RMSSD-aanname (traceerbaar, geen verborgen aanname)');
}

console.log('fB9_H4RecoveryHealthContext: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
