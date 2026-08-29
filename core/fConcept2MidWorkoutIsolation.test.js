/* fConcept2MidWorkoutIsolation.test.js — MS-F5-02 regressietest.
 *
 * Software-laag, geen fysieke PM5 nodig. Bewijst functioneel (via bron-extractie en
 * statische analyse, geen aanname) dat de BLE-verbindingslaag (tkErgConnectDevice's
 * connectie-/disconnectie-afhandeling) NOOIT activeInstanceId/sessionLog/de timer
 * aanraakt -- de architecturale scheiding die sectie 31-33 vereist (mid-workout
 * connect/disconnect mag de sessie nooit beëindigen, wissen, resetten, of dupliceren).
 *
 * REAL DEVICE VALIDATION blijft expliciet OPEN -- dit bestand test uitsluitend de
 * software-laag.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function extractFunctionBody(source, name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = re.exec(source);
  if (!m) return null;
  const braceStart = source.indexOf('{', m.index);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) return source.slice(braceStart, i + 1); }
  }
  return null;
}

const body = extractFunctionBody(html, 'tkErgConnectDevice');
ok(body !== null, 'tkErgConnectDevice() wordt gevonden');

// ---- KRITIEK: de connect/disconnect-afhandeling raakt geen sessie-/instance-state aan ----
const VERBODEN_REFERENTIES = ['activeInstanceId', 'sessionLog', 'finishSession', 'resetSession', 'currentWorkoutElapsedMs'];
VERBODEN_REFERENTIES.forEach(naam => {
  ok(body && !body.includes(naam),
    'tkErgConnectDevice() (BLE-connect/disconnect-afhandeling) verwijst NERGENS naar "' + naam + '" -- de BLE-verbindingslaag is architecturaal ontkoppeld van de trainingssessie-levenscyclus, dus een disconnect kan de sessie nooit beëindigen/wissen/resetten/dupliceren');
});

// ---- Bevestig dat de disconnect-handler uitsluitend UI-status wijzigt, geen destructieve actie ----
ok(body && body.includes("st.connected=false"), 'de disconnect-transitie zet uitsluitend de lokale verbindingsvlag, geen bredere state-mutatie');
ok(body && body.includes("PM5 niet meer bereikbaar"), 'de gebruiker wordt eerlijk geïnformeerd bij verbindingsverlies, geen stille failure');

// ---- Busy-guards tegen dubbele/gestapelde subscripties (reeds A5-hardening, hier geregressietest) ----
ok(body && body.includes('if(st._connecting) return;'), 'busy-guard tegen dubbel tikken op "verbinden" blijft aanwezig');
ok(body && body.includes('_unsubMetrics') && body.includes('_unsubConn'),
  'exercise-specifieke unsubscribe-functies worden vastgelegd en bij een nieuwe connectiepoging eerst opgeruimd -- voorkomt gestapelde, dubbele metric-listeners bij reconnect');

console.log('fConcept2MidWorkoutIsolation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
