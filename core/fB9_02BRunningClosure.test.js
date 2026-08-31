/* fB9_02BRunningClosure.test.js — B9-02B Running Core Closure.
 * Bewaakt: preview, execution-integratie in de UI, idempotent finish,
 * profiel-provenance, crash-recovery, interval-structuur, en de
 * resterende, verplichte sabotage-scenario's (3, 6, 7, 8 uit sectie 27
 * -- scenario's 1/2/4/5 zijn al gedekt door respectievelijk
 * fRunningExecutionCore.test.js en fB9_02RunningCore.test.js).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- A. Preview toont ontbrekende targets als ontbrekend, nooit verzonnen ----
ok(html.includes("'Geen persoonlijk pace-doel beschikbaar'"),
  'A1: bij een ontbrekend profiel toont de preview expliciet "geen doel beschikbaar", nooit een verzonnen pace-getal');
ok(html.includes("'Geen doel opgegeven'"),
  'A2: een niet-ingevulde doelafstand/duur toont expliciet "geen doel opgegeven"');

// ---- B. Profielwaarde toont altijd provenance (sabotage-scenario 7) ----
ok(html.match(/threshold_pace_seconds_per_km\)\+'\/km \(bron: '\+/),
  'B1: een getoonde pace-doelwaarde bevat altijd een expliciete bron-aanduiding (nooit een kaal getal zonder herkomst)');

// ---- C. State machine correct geintegreerd (geen setInterval als bron van waarheid) ----
ok(html.includes('RunningExecutionCore.elapsedActiveMs') && !html.match(/running-exec-timer[\s\S]{0,50}\+\+/),
  'C1: de live timerweergave leest elapsedActiveMs() opnieuw uit, verhoogt nooit zelf een lokale teller');
ok(html.includes('setInterval(()=>renderRunningExecutionScreen()'),
  'C2: setInterval() wordt uitsluitend gebruikt om de weergave te verversen (elke aanroep herberekent de tijd opnieuw via de state machine)');

// ---- D. Idempotent finish (sabotage-scenario 3: dubbel finishen) ----
ok(html.includes('let _runningOpslagBezig=false') && html.includes('if(_runningOpslagBezig)return'),
  'D1: een client-side vlag voorkomt een dubbele opslagpoging bij dubbel tikken op bevestigen');
ok(html.includes("dedupeKey='manual-exec-'+_runningExecState.startedAt+'-'+uid"),
  'D2: een dedupe_key gebaseerd op de starttijd + gebruiker voorkomt een dubbele activity bij een netwerkretry (server-side, onafhankelijk van de client-vlag)');
ok(html.includes("'Prefer':'resolution=ignore-duplicates,return=minimal'"),
  'D3: de server-side upsert gebruikt ignore-duplicates -- een herhaalde poging met dezelfde dedupe_key creeert nooit een tweede rij');

// ---- E. Crash/refresh-herstel (sabotage-scenario 8) ----
ok(html.includes('function persisteerRunningExecState') && html.includes('localStorage.setItem(RUNNING_EXEC_LOCALSTORAGE_KEY'),
  'E1: de execution-state wordt bij elke transitie opgeslagen in localStorage');
ok(html.includes('function herstelRunningExecutionIndienAanwezig') && html.includes("if(herstelRunningExecutionIndienAanwezig())return"),
  'E2: het openen van het Hardlopen-scherm controleert eerst op een onafgeronde, herstelbare sessie');
ok(html.includes("localStorage.removeItem(RUNNING_EXEC_LOCALSTORAGE_KEY)") && html.includes('Training opgeslagen'),
  'E3: na een succesvolle afronding wordt de herstelbare state expliciet opgeruimd (geen "spooksessie" na een geldige finish)');

// ---- F. Interval-structuur: correcte repeat-logica (sabotage-scenario 6) ----
{
  const previewFn = html.split('async function toonRunningPreview()')[1].split('function renderRunningExecutionScreen')[0];
  ok(previewFn.includes("for(let i=1;i<=herhalingen;i++)"),
    'F1: de intervalblokken worden gegenereerd met exact het opgegeven aantal herhalingen (geen off-by-one)');
  ok(previewFn.match(/warmup/) && previewFn.match(/cooldown/),
    'F2: elke intervalstructuur bevat altijd een warm-up en cool-down blok, ongeacht het aantal herhalingen');
}

// ---- G. Interval-datamodel-beslissing expliciet gedocumenteerd (sectie 10) ----
ok(html.includes('B9-02B sectie 10 -- architectuurbeslissing') && html.includes('EPHEMERE structuur'),
  'G1: de keuze om de geplande intervalstructuur client-side/ephemeer te houden (i.p.v. een nieuwe databasetabel) is expliciet gemotiveerd in de code zelf');

// ---- H. State machine module correct geladen ----
ok(html.includes('<script src="core/runningExecution.js"></script>'),
  'H1: core/runningExecution.js wordt geladen, consistent met de bestaande core/cardio.js-conventie');

// ---- I. History -> Detail (sectie 17: geen dode lijstitems) ----
ok(html.match(/onclick="renderRunDetail\('\$\{r\.id\}'\)"/),
  'I1: elk item in de Running-geschiedenis is klikbaar en opent zijn eigen Run Detail -- geen dode lijstitems (sectie 17, expliciet verplicht)');

// ---- J. Failure atomicity (B9-02B sectie 5): falende lap-inserts nooit stil genegeerd ----
{
  const finishFn = html.split('async function runningConfirmFinish()')[1].split('// ── Run Detail')[0];
  ok(finishFn.includes('let alleLapsGelukt=true') && finishFn.includes('if(!lapOk)alleLapsGelukt=false'),
    'J1: elke lap-insert wordt individueel gecontroleerd op succes, niet stilzwijgend aangenomen');
  ok(finishFn.includes("toast('Training opgeslagen, maar niet alle laps"),
    'J2: bij een gedeeltelijk mislukte opslag krijgt de gebruiker een expliciete, eerlijke melding -- nooit een misleidende "Training opgeslagen"');
  ok(!finishFn.match(/if\(!alleLapsGelukt\)[\s\S]{0,80}localStorage\.removeItem/),
    'J3: bij een gedeeltelijk mislukte opslag wordt de herstelbare execution-state NIET opgeruimd (retry blijft mogelijk)');
}

// ---- K. HR-zones: bewust niet getoond, geen shadow calculation (B9-02B sectie 11) ----
ok(html.includes('CALC-END-005') && html.includes('HR-zones: nog niet beschikbaar (canonieke berekening ontbreekt)'),
  'K1: HR-zones worden expliciet, transparant NIET getoond omdat CALC-END-005 nog NOT IMPLEMENTED is -- geen lokale, verzonnen HR-zone-formule als shadow calculation');

console.log('fB9_02BRunningClosure: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
