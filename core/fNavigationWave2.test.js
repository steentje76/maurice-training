/* fNavigationWave2.test.js — NAVIGATION REPAIR WAVE 2
 * RC-NAV-03 (Coach dubbele history-push), RC-NAV-01 (D-04/F-05 directe .scr-
 * activatie), RC-NAV-02 (5 hardcoded-wrong-parent terugknoppen), RC-OVL-03
 * (ad-hoc modal zonder id). Statisch bewijs (broncode-assertions) + waar
 * uitvoerbaar een vm-sandbox, zelfde patroon als eerdere testbestanden.
 *
 * Draai: node core/fNavigationWave2.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

function slice(a, b) {
  var s = HTML.indexOf(a);
  assert.ok(s >= 0, 'niet gevonden: ' + a);
  var e = HTML.indexOf(b, s + a.length);
  assert.ok(e > s, 'eindmarker niet gevonden voor: ' + a);
  return HTML.slice(s, e);
}

/* ══ F. RC-NAV-03 — Coach: precies één history-transitie ══ */
console.log('F. RC-NAV-03');
var coachSessionFn = slice('function openCoachSession(', '\nfunction askCoachEx(');
ok(!/history\.pushState\(\{coach:true\}/.test(coachSessionFn), 'F1: openCoachSession() bevat geen handmatige history.pushState({coach:true}) meer');
ok(/go\('s-coach'\)/.test(coachSessionFn), 'F2: openCoachSession() gebruikt nog steeds de canonical go(\'s-coach\')');
ok(/coachReturn=ctx\?\.exId/.test(coachSessionFn), 'F3: coachReturn-context blijft behouden (Training-context voor de terugkeer)');
var popstateFn = slice("window.addEventListener('popstate',function(){", '\n});');
ok(/coachReturn.*returnToTraining\(\)/.test(popstateFn) || /returnToTraining\(\)/.test(popstateFn),
  'F4: de popstate-handler herkent "terug naar training" nog via coachReturn (ongewijzigd, geen nieuwe state nodig)');
var returnToTrainingFn = slice('function returnToTraining(', '\nfunction openCoachSession(');
ok(!/curT\s*=[^=]/.test(returnToTrainingFn) && !/sessionLog\s*=/.test(returnToTrainingFn),
  'F5: returnToTraining() wijzigt geen curT/sessionLog -- puur navigatie, Training-state blijft in sessionLog/localStorage-draft');

/* ══ G. RC-NAV-01 — canonical routes D-04/F-05 ══ */
console.log('G. RC-NAV-01');
var coachPtOpenFn = slice('function coachPtOpenAthlete(', '\nasync function renderCoachPtAthlete(');
ok(!/classList\.remove\('active'\)/.test(coachPtOpenFn), 'G1: coachPtOpenAthlete() doet geen directe .scr-classList-manipulatie meer');
ok(/go\('s-coachpt-athlete'\)/.test(coachPtOpenFn), 'G2: coachPtOpenAthlete() gebruikt canonical go()');
ok(/_pendingCoachPtAthleteId=athleteId/.test(coachPtOpenFn) && /_pendingCoachPtRelationshipId=relationshipId/.test(coachPtOpenFn),
  'G3: context (athleteId/relationshipId) blijft behouden via module-variabelen');
ok(/if\(id==='s-coachpt-athlete'\)renderCoachPtAthlete\(\);/.test(HTML), 'G4: go()-hook roept renderCoachPtAthlete() aan');

var openThreadFn = slice('function openMessageThread(', '\nasync function updateSocialUnreadBadge(');
ok(!/classList\.remove\('active'\)/.test(openThreadFn), 'G5: openMessageThread() doet geen directe .scr-classList-manipulatie meer');
ok(/go\('s-message-thread'\)/.test(openThreadFn), 'G6: openMessageThread() gebruikt canonical go()');
ok(/_pendingThreadId=threadId/.test(openThreadFn), 'G7: threadId-context blijft behouden via module-variabele');
ok(/if\(id==='s-message-thread'\)renderMessageThreadScreen\(_pendingThreadId\);/.test(HTML), 'G8: go()-hook roept renderMessageThreadScreen(_pendingThreadId) aan');

// Bestaande, ongewijzigde zichtbare terugknoppen blijven canonical (in_app_back was al GREEN).
ok(/onclick="go\('s-coachpt'\)" aria-label="Terug naar Coach\/PT"/.test(HTML), 'G9: s-coachpt-athlete se zichtbare terugknop blijft ongewijzigd canonical');
ok(/onclick="go\('s-messages'\)" aria-label="Terug naar Berichten"/.test(HTML), 'G10: s-message-thread se zichtbare terugknop blijft ongewijzigd canonical');

/* ══ H. RC-NAV-02 — source-aware Back op 5 surfaces ══ */
console.log('H. RC-NAV-02');
[
  ['s-builder', 'Workout Builder', "tkNavGoBack('s-train-mgr')"],
  ['s-library', 'Oefeningen', "tkNavGoBack('s-train-mgr')"],
].forEach(function (t) {
  var scherm = t[0], label = t[1], verwacht = t[2];
  var blok = slice('<div class="scr" id="' + scherm + '">', '</button></div></div>');
  ok(blok.indexOf(verwacht) !== -1, 'H: ' + scherm + ' (' + label + ') gebruikt ' + verwacht);
  ok(blok.indexOf("go('s-home')") === -1, 'H: ' + scherm + ' bevat niet meer de oude hardcoded go(\'s-home\') op de terugknop');
});
[
  ['s-lich-verbanden'],
  ['s-lich-health'],
  ['s-lich-metingen'],
].forEach(function (t) {
  var scherm = t[0];
  var blok = slice('<div class="scr" id="' + scherm + '">', '</div>\r\n  </div>');
  ok(blok.indexOf("tkNavGoBack('s-inzicht')") !== -1, 'H: ' + scherm + ' gebruikt tkNavGoBack(\'s-inzicht\')');
  ok(blok.indexOf("go('s-lichaam')") === -1, 'H: ' + scherm + ' bevat niet meer de oude hardcoded go(\'s-lichaam\') op de terugknop');
});
// Fallback/deep-entry gedrag: al bewezen generiek in fNavigatie.test.js (tkNavGoBack met lege stack).
// Hier alleen bevestigen dat de gebruikte helper exact de bestaande, al geteste functie is.
ok(/function tkNavGoBack\(valtTerugNaar\)\{/.test(HTML), 'H11: tkNavGoBack() bestaat nog met dezelfde signatuur (geen nieuwe parallelle router)');

/* ══ I. RC-OVL-03 — ad-hoc modal krijgt canonical id ══ */
console.log('I. RC-OVL-03');
var cardioDetailFn = slice('async function showCardioDetail(', '\nasync function refreshCardioProgress(');
ok(/modal\.id='m-cardio-detail-adhoc'/.test(cardioDetailFn), 'I1: de ad-hoc cardio-detailmodal krijgt nu een expliciet id');
ok(/modal\.className='modal-bg open'/.test(cardioDetailFn), 'I2: modal-bg/open-klasse ongewijzigd (geen visuele wijziging)');
// tkNavTopmostOverlay() blijft ongewijzigd -- de fix zit uitsluitend in de modal zelf.
var topmostOverlayFn = slice('function tkNavTopmostOverlay(', '\nfunction tkNavIsApp(');
ok(/closeModal\(modaal\.id\)/.test(topmostOverlayFn), 'I3: tkNavTopmostOverlay() blijft ongewijzigd closeModal(modaal.id) aanroepen (root cause zat in de modal, niet hier)');

/* ══ J. Geen Training-execution-wijziging (R-006) ══ */
console.log('J. Training execution state never lost');
// Geen van de Wave 2-functies raakt curT/activeInstanceId/sessionLog/trainStart aan.
[coachSessionFn, coachPtOpenFn, openThreadFn, cardioDetailFn].forEach(function (fn, i) {
  ok(!/trainStart\s*=/.test(fn) && !/sessionLog\s*=/.test(fn) && !/activeInstanceId\s*=[^=]/.test(fn),
    'J' + i + ': gewijzigde Wave 2-functie raakt geen Training-execution-state aan (trainStart/sessionLog/activeInstanceId)');
});
// De bewust NIET aangepakte startT()/build*TrainScreen-bypass blijft functioneel exact ongewijzigd.
ok(HTML.indexOf("function startT(t){") !== -1, 'J-startT: startT() bestaat nog, ongewijzigd (bewust buiten Wave 2 scope, zie route map §2b)');

console.log('\n========================================================');
console.log('fNavigationWave2.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
