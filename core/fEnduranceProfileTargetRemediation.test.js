/* fEnduranceProfileTargetRemediation.test.js — ENDURANCE MASTER SPRINT
 * E0-correctie (CASE CYCLE-C): FTP/threshold-pace hadden een kolom,
 * provenance-weergave en RLS, maar NERGENS een schrijfpad (0 rijen in
 * productie). Dit bewijst dat setCyclingFtp()/setRunningThresholdPace()
 * daadwerkelijk via de offline/retry-veilige sbRpcQ schrijven, met correcte
 * clientvalidatie, tegen de ECHTE productiecode in index.html.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }
function fn(naam) {
  const m = html.match(new RegExp('(?:^|\\n)(?:async )?function ' + naam + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
  if (!m) throw new Error('functie niet gevonden: ' + naam);
  return m[0];
}

console.log('ENDURANCE MASTER SPRINT — FTP/pace-doel remediation (CASE CYCLE-C)');

const ftpFn = fn('setCyclingFtp');
ok(ftpFn.indexOf("sbRpcQ('upsert_endurance_profile_target'") > 0, '1. setCyclingFtp schrijft via de offline/retry-veilige sbRpcQ (geen sbPost/sbFetch rechtstreeks)');
ok(ftpFn.indexOf("p_sport:'cycling'") > 0, '2. setCyclingFtp geeft expliciet p_sport=cycling mee (kan het running-veld nooit raken)');
ok(ftpFn.indexOf('watt<=0||watt>2000') > 0, '3. setCyclingFtp valideert een plausibel bereik vóór verzenden (geen garbage-invoer)');
ok(ftpFn.indexOf('isFinite(watt)') > 0, '4. setCyclingFtp weigert niet-numerieke invoer');
ok(ftpFn.indexOf("result===true") > 0 && ftpFn.indexOf('wordt opgeslagen zodra je weer online') > 0,
  '5. setCyclingFtp toont een expliciete "wacht op sync"-status bij offline queueing (geen misleidende "opgeslagen"-claim)');
ok(ftpFn.indexOf('cpElig')===-1 && ftpFn.indexOf('criticalPower')===-1 && ftpFn.indexOf('activities')===-1,
  '6. setCyclingFtp berekent niets uit bestaande rit-/prestatiedata (uitsluitend de rechtstreekse, expliciete gebruikersinvoer)');

const paceFn = fn('setRunningThresholdPace');
ok(paceFn.indexOf("sbRpcQ('upsert_endurance_profile_target'") > 0, '7. setRunningThresholdPace schrijft via dezelfde offline/retry-veilige sbRpcQ');
ok(paceFn.indexOf("p_sport:'running'") > 0, '8. setRunningThresholdPace geeft expliciet p_sport=running mee (kan het cycling-veld nooit raken)');
ok(/\^\(\\d\{1,2\}\):\(\[0-5\]\\d\)\$/.test(paceFn.replace(/\\\\/g,'\\')) || paceFn.indexOf('[0-5]\\d') > 0,
  '9. setRunningThresholdPace parseert strikt mm:ss-formaat');
ok(paceFn.indexOf('seconden<=0||seconden>3600') > 0, '10. setRunningThresholdPace valideert een plausibel bereik');

// UI-aansluiting: beide knoppen moeten daadwerkelijk in hun Inzichten-scherm staan,
// anders is de functie onbereikbaar vanuit de product-flow (accessibility-eis,
// sectie "ACCESSIBILITY IN EXISTING PRODUCT FLOW" van de opdracht).
const cyclingInsightsFn = fn('renderCyclingInsights');
ok(cyclingInsightsFn.indexOf('onclick="setCyclingFtp()"') > 0, '11. "FTP instellen"-knop is daadwerkelijk aanwezig in renderCyclingInsights (niet alleen een losstaande functie)');
const runningInsightsFn = fn('renderRunningInsights');
ok(runningInsightsFn.indexOf('onclick="setRunningThresholdPace()"') > 0, '12. "Pace-doel instellen"-knop is daadwerkelijk aanwezig in renderRunningInsights');
ok(runningInsightsFn.indexOf("sbGet('athlete_endurance_profile'") > 0, '13. renderRunningInsights haalt het profiel daadwerkelijk op (voorheen ontbrak dit hier volledig)');

console.log('\n========================================================');
console.log('fEnduranceProfileTargetRemediation.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
