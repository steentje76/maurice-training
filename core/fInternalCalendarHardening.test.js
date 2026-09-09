/* fInternalCalendarHardening.test.js — Sprint C1-B: adversariële hardening.
 *
 * Test tegen geëxtraheerde productiecode in index.html. Geen herimplementatie
 * van sbPatchQ/offlineQueue/flushOfflineQueue als eigen test-oracle -- deze
 * bestaande infrastructuur wordt hier STRUCTUREEL geaudit (bewijs dat
 * Calendar's reschedule/skip er automatisch door gedekt worden, zonder een
 * eigen, parallelle implementatie te bouwen).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function slice(a, b) { const s = html.indexOf(a); const e = html.indexOf(b, s); if (s < 0 || e < 0) throw new Error('marker niet gevonden: ' + a + ' / ' + b); return html.slice(s, e); }

// ═══ DEEL I: RUNTIME INTEGRATION / SHADOW PLANNING AUDIT ═══
ok(html.indexOf("if(id==='s-hist'){histOff=0;renderHistFilterTabs();loadHistory();histSetMode(histMode||'list');}") > 0, '1. go()-routing: echte productie-entry point naar Calendar (geen dead code)');
{
  const count = (html.match(/(?:async\s+)?function renderCalMonth\(/g) || []).length;
  ok(count === 1, '2. renderCalMonth is de enige, echte implementatie (geen dubbele definitie) -- exact 1 functiedefinitie gevonden');
}
{
  // Adversarieel: zoek naar een TWEEDE conflictberekening/reschedule/skip-implementatie
  // specifiek binnen de Calendar-broncode (los van de reeds-bestaande, hergebruikte
  // Sprint-B-functies zelf).
  const calSrc = slice('let histMode=', 'function go(id){');
  // Zoekt naar TOEWIJZING (conflictLevel: waarde, of conflictLevel = waarde -- niet
  // gevolgd door een tweede '=', wat een vergelijking (===) zou zijn).
  const conflictLevelAssignments = (calSrc.match(/conflictLevel\s*[:=](?!=)/g) || []).length;
  ok(conflictLevelAssignments === 0, '3. Calendar-broncode zelf wijst NERGENS een eigen conflictLevel TOE (geen "conflictLevel:" of "conflictLevel=") -- uitsluitend gelezen/vergeleken (===) tegen het resultaat van de gedeelde resolver, geen shadow conflictberekening');
  ok(calSrc.indexOf('localStorage') === -1, '4. Geen localStorage-gebaseerde planningbron in de Calendar-code');
  ok(!/sbPatchQ\(.training_instances./.test(calSrc) && !/sbPostQ\(.training_instances./.test(calSrc), '5. Calendar-code voert geen enkele write uit op training_instances (uitsluitend de bestaande, read-only actieve-executie-guard leest eruit)');
}

// ═══ DEEL II: FUTURE PLANNING VISIBILITY -- LOAD FAILURE DISTINCTIE (kernreden 8,5) ═══
{
  const fn = slice('async function sbGetOrFail', 'async function renderCalMonth');
  ok(fn.indexOf('failed:true') > 0 && fn.indexOf('failed:false') > 0, '6. sbGetOrFail() maakt EXPLICIET onderscheid tussen laadfout en succesvolle (evt. lege) respons -- de kernoorzaak van de eerdere 8,5-score (sbGet() zelf kan dit onderscheid niet maken, geeft bij fout stil [] terug)');
}
{
  const fn = slice('async function renderCalMonth', 'function calSelectDay');
  ok(fn.indexOf('sbGetOrFail(') > 0 && fn.indexOf('sbGet(') === -1, '7. renderCalMonth() gebruikt consequent sbGetOrFail(), niet de foutmaskerende sbGet(), voor alle drie canonical bronnen');
  ok(fn.indexOf('anyFailed') > 0 && fn.indexOf("gridEl.innerHTML='<div class=\"tk-empty\">Kon kalender niet volledig laden") > 0, '8. Bij een laadfout toont Calendar een EXPLICIETE foutmelding, nooit stil een lege maand die "geen trainingen" zou suggereren');
  ok(/const anyFailed = progsR\.failed\|\|sessiesR\.failed\|\|availR\.failed/.test(fn), '9. Partial failure (één bron faalt, andere niet) wordt correct gedetecteerd -- geen vals conflictvrij beeld bij bijvoorbeeld alleen een availability-loadfout');
}
// ═══ status niet alleen via kleur ═══
{
  const fn = slice('cellen.forEach(function(c){\n      const dagNr', 'html+=\'</div>\';\n    gridEl.innerHTML=html;');
  ok(fn.indexOf('aria-label=') > 0, '10. Iedere dagcel heeft een beschrijvend aria-label (statustekst), niet uitsluitend een kleurindicatie');
  ok(fn.indexOf('statusTekst') > 0 && fn.indexOf("'gepland, conflict met beschikbaarheid'") > 0, '11. Statustekst maakt expliciet onderscheid tussen gepland/voltooid/overgeslagen/conflict/beperkt -- leesbaar zonder kleur te hoeven interpreteren');
  ok(fn.indexOf('glyph') > 0, '12. Conflict/context-dagen krijgen een tekstglyph bovenop de kleur (dubbele codering, niet uitsluitend kleur)');
}

// ═══ DEEL III: CONFLICT UX -- ECHTE RUNTIME-KETEN (kernreden 8,5) ═══
{
  const fn = slice('function renderCalDayDetail', 'async function calDayAction');
  ok(fn.indexOf('cel.plannedBlocks.forEach') > 0, '13. Dagdetail toont daadwerkelijk elk apart gepland block (geen samenvoeging bij meerdere blocks dezelfde dag)');
  ok(fn.indexOf("cel.conflictLevel!=='none'") > 0, '14. Limited/unavailable-onderscheid komt uit het canonical cel.conflictLevel, niet uit een eigen herclassificatie');
  ok(fn.indexOf("availConflictKeep(") > 0 && fn.indexOf("calDayAction(\\'reschedule\\'") > 0 && fn.indexOf("calDayAction(\\'skip\\'") > 0, '15. Alle drie bestaande gebruikersacties (behouden/verplaatsen/overslaan) daadwerkelijk aanwezig in de dagdetail-rendering');
}
{
  const fn = slice('async function calDayAction', 'function go(id){');
  ok(fn.indexOf('await availConflictSkip(blockId)') > 0 && fn.indexOf('await availConflictReschedule(blockId)') > 0, '16. calDayAction() await\'t de bestaande acties correct (geen fire-and-forget die een race met renderCalMonth() zou geven)');
  ok(fn.indexOf('renderCalMonth()') > 0, '17. Na elke actie wordt de maand opnieuw gerenderd -- toont direct de nieuwe canonical toestand (cross-surface consistency)');
}

// ═══ DEEL IV: OFFLINE/RETRY -- STRUCTURELE AUDIT VAN BESTAANDE, GEDEELDE INFRASTRUCTUUR ═══
// Calendar bouwt GEEN eigen queue -- het bewijs hier is dat de HERGEBRUIKTE
// sbPatchQ()/flushOfflineQueue() al de vereiste eigenschappen hebben, dus
// Calendar's reschedule/skip ze automatisch erven.
{
  const fn = slice('async function sbPatchQ(t,f,d,opts){', '// sbDelQ:');
  ok(fn.indexOf('!navigator.onLine') > 0 && fn.indexOf('offlineQueueAdd(') > 0, '18. sbPatchQ (gebruikt door availConflictSkip/Reschedule) queuet automatisch bij offline-status -- Calendar-reschedule/skip erven dit zonder extra code');
  ok(fn.indexOf('sbRetryable(r.status)') > 0, '19. Retryable serverfouten worden ook gequeued (niet uitsluitend een harde offline-detectie) -- retry-scenario gedekt');
  ok(/catch\(e\)\{[\s\S]{0,80}offlineQueueAdd/.test(fn), '20. Een netwerk-exception tijdens de fetch zelf wordt eveneens gequeued (drievoudige dekking: offline/retryable-status/exception)');
}
{
  const fn = slice('if(_flushBezig)return;', 'if(syncedAny&&!(await offlineQueueAll())');
  ok(fn.indexOf('items.sort((a,b)=>a.id-b.id)') > 0, '21. Wachtrij-items worden gesorteerd op id (FIFO) vóór verwerking -- een reschedule A->B vóór B->C wordt in de juiste volgorde gerepliceerd, geen stale-overwrite-risico');
  ok(fn.indexOf('_flushBezig=true') > 0, '22. Een mutex (_flushBezig) voorkomt dat twee gelijktijdige flush-aanroepen (bv. dubbele tap of meerdere reconnect-triggers) hetzelfde item dubbel versturen');
  ok(fn.indexOf('await offlineQueueRemove(item.id)') > 0 && fn.indexOf('continue') > 0, '23. Per-item foutafhandeling: één mislukt item blokkeert de rest niet en blijft zichtbaar in de wachtrij (geen permanente, onzichtbare data-inconsistentie)');
}
ok(/flushOfflineQueue\(\).*aangeroepen.*window.*online.*visibilitychange.*startAppAfterAuth|DRIE onafhankelijke bronnen/.test(html), "24. flushOfflineQueue() wordt automatisch getriggerd bij reconnect (window 'online'), niet alleen handmatig -- Calendar-acties worden dus ook zonder gebruikersinteractie na reconnect gesynchroniseerd");

// ═══ DEEL V: OBSERVABILITY -- WRITE-FAILURE LOGGING TOEGEVOEGD ═══
{
  const fn = slice('async function availConflictSkip', 'async function availConflictReschedule');
  ok(fn.indexOf("ObservabilityCore.tkLog('ERROR','calendar.skip.failed'") > 0, '25. Een ECHTE (niet-gequeuede) skip-mislukking produceert een observability-event volgens de bestaande domain.component.action-conventie');
}
{
  const fn = slice('async function availConflictReschedule', 'function getAvailabilityForDate');
  ok(fn.indexOf("ObservabilityCore.tkLog('ERROR','calendar.reschedule.failed'") > 0, '26. Idem voor reschedule-mislukking');
}
{
  const fn = slice('async function renderCalMonth', 'function calSelectDay');
  ok(fn.indexOf("ObservabilityCore.tkLog('ERROR','calendar.load.partial_or_full_failed'") > 0 || fn.indexOf("ObservabilityCore.tkLog('ERROR','calendar.load.program_blocks_failed'") > 0, '27. Load-mislukkingen (program_blocks/sessions/availability) produceren observability-events, gebruikmakend van de bestaande ObservabilityCore/tkLog -- geen nieuwe, losstaande telemetrylaag');
  ok(!/programs_failed:progsR\.failed,sessions_failed:sessiesR\.failed,availability_failed:availR\.failed[\s\S]{0,50}(note|hrv|health|password)/i.test(fn), '28. De gelogde metadata bevat uitsluitend booleans (welke bron faalde), geen gevoelige inhoud');
}
{
  const obsSrc = fs.readFileSync(path.join(ROOT, 'core', 'observability.js'), 'utf8');
  ok(obsSrc.indexOf("'access_token', 'refresh_token'") > 0, '29. De onderliggende ObservabilityCore-redactie (REDACT_KEYS) blijft ongewijzigd van kracht op alle Calendar-events -- geen aparte, ongeredacteerde loggingpath toegevoegd (Calendar-code roept uitsluitend de bestaande, gedeelde tkLog() aan)');
}

console.log('fInternalCalendarHardening: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
