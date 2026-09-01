/* fB9_04CyclingCore.test.js — B9-04 Cycling Core.
 * Bewaakt: hergebruik van de gegeneraliseerde EnduranceExecutionCore
 * (geen tweede state machine), Running-non-regressie via de backward-
 * compatible alias, cycling-specifieke UI (km/h i.p.v. pace, FTP-
 * provenance, geen power-zone-formule), user-specifieke localStorage
 * (B9-02C-les direct toegepast), en de resterende, verplichte
 * sabotage-scenario's.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const enduranceSrc = fs.readFileSync(path.join(ROOT, 'core/enduranceExecution.js'), 'utf8');
const runningAliasSrc = fs.readFileSync(path.join(ROOT, 'core/runningExecution.js'), 'utf8');

// ---- A. Architectuur: gegeneraliseerde, gedeelde execution-engine ----
ok(enduranceSrc.includes('EnduranceExecutionCore') && !runningAliasSrc.match(/function\s+start\s*\(/),
  'A1: de kern-implementatie (state machine/timer) leeft uitsluitend in enduranceExecution.js -- runningExecution.js bevat geen eigen, gedupliceerde logica meer');
ok(runningAliasSrc.includes("require('./enduranceExecution.js')"),
  'A2: runningExecution.js is een dunne, backward-compatible alias die doorverwijst naar enduranceExecution.js');
ok(html.includes('EnduranceExecutionCore.createSession(nu)') && html.includes('_cyclingExecState'),
  'A3: Cycling gebruikt rechtstreeks EnduranceExecutionCore, geen eigen, tweede state machine');
ok(html.includes('<script src="core/enduranceExecution.js"></script>'),
  'A4: enduranceExecution.js wordt geladen (vóór runningExecution.js, conform de alias-vereiste)');
{
  const scriptVolgorde = html.indexOf('<script src="core/enduranceExecution.js">');
  const runningScriptVolgorde = html.indexOf('<script src="core/runningExecution.js">');
  ok(scriptVolgorde > 0 && scriptVolgorde < runningScriptVolgorde,
    'A5: enduranceExecution.js wordt VOOR runningExecution.js geladen (de browser-alias vereist dit)');
}

// ---- B. Training-IA blijft ongewijzigd (sectie 4): geen samenvoeging ----
ok(html.includes('id="s-running"') && html.includes('id="s-cycling"'),
  'B1: Hardlopen en Fietsen blijven twee aparte, first-class schermen');
ok(!html.match(/id="s-(cardio|endurance|duurtraining)"/i),
  'B2: geen samengevoegd Cardio/Endurance/Duurtraining-scherm is geintroduceerd');

// ---- C. Cycling-specifieke UI: km/h via canonical CardioCore, geen lokale formule ----
{
  const rideDetailFn = html.split('async function renderRideDetail(activityId)')[1].split('async function renderCyclingHistory')[0];
  ok(rideDetailFn.includes('CardioCore.splitFromDistTime(act.distance_meters,act.duration_seconds,1000)') && rideDetailFn.includes('3600/secPerKm'),
    'C1 (sabotage: lokale snelheidsformule): de km/h-weergave is een triviale eenheidsconversie van CardioCore.splitFromDistTime(), geen nieuwe distance/duration-formule');
  ok(!rideDetailFn.match(/distance_meters\/1000\)\s*\/\s*\(.*duration_seconds\/3600/),
    'C2: geen directe (afstand/1000)/(duur/3600)-berekening (de eerder overwogen, verworpen fallback-formule) in Ride Detail');
}

// ---- D. FTP: user-entered met expliciete provenance, geen bro-science ----
ok(html.includes("ftp+' W (bron: door jou ingesteld)'"),
  'D1: FTP wordt uitsluitend getoond met expliciete "door jou ingesteld"-provenance, geen anonieme waarde');
ok(html.includes('Powerzones nog niet beschikbaar (canonieke berekening ontbreekt)'),
  'D2: power-zones tonen expliciet "nog niet beschikbaar", geen lokale 95%-FTP-formule of vergelijkbare bro-science');
{
  const previewFn = html.split('async function toonCyclingPreview()')[1].split('// Execution: hergebruikt')[0];
  ok(!previewFn.match(/0\.95\s*\*|ftp.*\*\s*0\.95|95%/i),
    'D3 (sabotage: FTP-bro-science): geen "95% van 20-min-power"-achtige formule in de Cycling-preview');
}

// ---- E. Shared-device security: user-specifieke localStorage (B9-02C-les toegepast) ----
ok(html.includes("function cyclingExecLocalStorageKey()") && html.includes("return uid?('tk_cycling_execution_v1_'+uid):null"),
  'E1 (P1-les uit B9-02C): de cycling-execution-key is user-specifiek, nooit een vaste, gedeelde string');
ok(html.includes('_cyclingExecState.ownerUserId=authSession?.user?.id'),
  'E2: elke gestarte cycling-executie legt expliciet de eigenaar vast');
ok(html.match(/if\(!huidigeUid\|\|data\.state\.ownerUserId!==huidigeUid\)\{localStorage\.removeItem\(key\);return false;\}/),
  'E3 (wrong-user recovery): bij een owner-mismatch wordt de cycling-staat nooit geladen/getoond, direct gequarantaineerd');
ok(html.includes('Array.isArray(data.state.segments)') && html.match(/herstelCyclingExecutionIndienAanwezig[\s\S]{0,400}isFinite\(data\.state\.startedAt\)/),
  'E4 (corrupted-state-crash-preventie): dezelfde, strikte validatie als Running vóór acceptatie van een herstelde staat');

// ---- F. Idempotency + failure atomicity: dezelfde, bewezen strategie als Running ----
ok(html.includes("let _cyclingOpslagBezig=false") && html.includes("if(_cyclingOpslagBezig)return"),
  'F1: een client-side vlag voorkomt een dubbele cycling-opslagpoging');
ok(html.includes("dedupeKey='manual-exec-'+_cyclingExecState.startedAt+'-'+uid") && html.includes("'Prefer':'resolution=ignore-duplicates,return=minimal'"),
  'F2: server-side dedupe_key + ignore-duplicates voorkomt een dubbele activity bij een netwerkretry');
{
  const finishFn = html.split('async function cyclingConfirmFinish()')[1].split('// Ride Detail')[0];
  ok(finishFn.includes('let alleLapsGelukt=true') && finishFn.includes('if(!lapOk)alleLapsGelukt=false') && finishFn.includes("'Training opgeslagen, maar niet alle laps"),
    'F3 (failure atomicity): een gedeeltelijk falende lap-opslag geeft nooit een misleidende "opgeslagen"-melding, dezelfde bewezen strategie als Running');
}

// ---- G. RPE hergebruik, geen tweede Cycling-RPE-veld ----
ok(html.includes('id="cycling-finish-rpe"') && html.includes("rpe:isFinite(rpeWaarde)&&rpeWaarde>=0&&rpeWaarde<=10?rpeWaarde:null"),
  'G1: cycling hergebruikt het bestaande activities.rpe-veld (zelfde validatie als Running), geen nieuw, apart cycling-specifiek RPE-veld');

// ---- H. Geen extra bottom-nav-tab voor Cycling ----
{
  const cyclingScreenBlok = html.split('<div class="scr" id="s-cycling">')[1].split(/<div class="scr" id="s-/)[0];
  const aantalNavTabs = (cyclingScreenBlok.match(/<button class="ni/g) || []).length;
  ok(aantalNavTabs === 5, 'H1: het Fietsen-scherm gebruikt exact dezelfde, bestaande 5 bottom-nav-tabs, geen extra tab toegevoegd');
}

// ---- I. GPS: geen pseudo-GPS, capability-boundary blijft eerlijk (sectie 19) ----
ok(!html.match(/watchPosition/),
  'I1: geen live GPS-tracking gebouwd voor Cycling (bestaande capability-boundary blijft van kracht, geen pseudo-GPS)');

console.log('fB9_04CyclingCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
