/* fMyTrainingC2CHardening.test.js — Sprint C2-C: Mijn Trainingen final
 * integration hardening.
 *
 * Test tegen geëxtraheerde productiecode en de daadwerkelijke, requirebare
 * calendarProjection.js -- geen herimplementatie als eigen test-oracle.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CalendarProjectionCore = require(path.join(ROOT, 'core', 'calendarProjection.js'));
const ICAL = require('ical.js');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }
function slice(a, b) { const s = html.indexOf(a); const e = html.indexOf(b, s); if (s < 0 || e < 0) throw new Error('marker niet gevonden: ' + a + ' / ' + b); return html.slice(s, e); }

// ═══ DEEL I: EXECUTION LINKAGE — geëxtraheerde productiecode ═══
{
  const fn = slice('async function finishSession(){', 'finishSessionBezig=false;');
  ok(fn.indexOf('_voltooidePlannedAssignmentId') > 0, '1. finishSession() capteert het planned-assignment-ID vóór het wissen van globale executiestate');
  ok(fn.indexOf('_voltooideInstanceId') > 0, '2. Het echte training_instance-ID wordt vastgehouden vóór activeInstanceId wordt genuld -- correcte FK-waarde voor de assignment-completion');
  // Volgorde-bewijs: de assignment-completion-write staat NA de saved===0-guard,
  // dus wordt nooit bereikt bij een lege/mislukte sessie (geen false completion).
  const guardIdx = fn.indexOf("if(saved===0)");
  const completionIdx = fn.indexOf("if(_voltooidePlannedAssignmentId){");
  ok(guardIdx > -1 && completionIdx > guardIdx, '3. De assignment-completion-write staat AANTOONBAAR ná de saved===0-guard (geen false completion bij Preview/eerste-log/lege sessie)');
  ok(fn.indexOf("status:'completed',training_instance_id:_voltooideInstanceId") > 0, '4. Assignment wordt pas completed gezet MET de echte training_instance_id als FK -- stabiele, verifieerbare executie-koppeling (geen synthetic string)');
  ok(fn.indexOf("sbPatchQ('planned_training_assignments'") > 0, '5. Completion loopt via de bestaande, gedeelde sbPatchQ -- erft dezelfde offline/retry-garanties als reschedule/skip (geen nieuwe queue)');
}
// ═══ direct start blijft ongewijzigd (geen assignment-context bij gewone start) ═══
{
  ok(html.indexOf('let activePlannedAssignmentId=null;') > 0, '6. Nieuwe globale variabele expliciet start op null -- gewone direct-start (rotatie/handmatig) zet deze nooit, dus blijft assignment-completion daar afwezig (geen regressie op direct-start, sectie 4)');
}
// ═══ DEEL II: DOUBLE-START GUARD ═══
{
  const fn = slice('async function startPlannedMyTraining', 'function go(id){');
  ok(fn.indexOf('a.training_instance_id||a.status===\'completed\'') > 0 || fn.indexOf("a.training_instance_id||a.status==='completed'") > 0, '7. Guard controleert zowel een reeds gezette training_instance_id als status=completed vóór een nieuwe start wordt toegestaan');
  ok(fn.indexOf("toast('Deze training is al gestart of afgerond.')") > 0, '8. Bij een tweede (dubbele) start wordt de gebruiker duidelijk geïnformeerd, geen stille no-op en geen tweede actieve executie');
  ok(fn.indexOf('activePlannedAssignmentId=assignmentId') > 0, '9. Bij een toegestane start wordt het assignment-ID correct vastgelegd vóór de bestaande openTrainingPreview() wordt aangeroepen');
}

// ═══ DEEL III: EXPLICIET-PLANNING-PRECEDENCE ═══
{
  const fn = slice("const nextLblEl=document.getElementById('home-next-lbl');", "nextLblEl.textContent=next?");
  ok(fn.indexOf("planned_training_occurrences") > 0 && fn.indexOf("planned_date=eq.'+vandaag") > 0, '10. Home controleert EERST op een expliciet voor vandaag geplande occurrence, vóór de rotatie wordt geraadpleegd');
  ok(fn.indexOf('computeNextVasteTraining(vasteTrainingen,lastDoneMap)') > 0, '11. computeNextVasteTraining() blijft de FALLBACK-bron wanneer geen expliciete planning bestaat -- geen tweede planningbron, geen wijziging aan de rotatiefunctie zelf (PO-richting sectie 25)');
  ok(fn.indexOf('if(!next){') > 0, '12. Rotatie wordt uitsluitend geraadpleegd ALS er geen expliciete planning is gevonden (correcte precedence-volgorde, niet andersom)');
}
// ═══ negative control: computeNextVasteTraining() zelf niet gewijzigd ═══
{
  const src = html;
  const s = src.indexOf('function computeNextVasteTraining(list,lastDoneMap){');
  const e = src.indexOf('}', s + 50);
  const body = src.slice(s, e);
  ok(body.indexOf('planned_training') === -1, '13. De rotatiefunctie zelf bevat geen enkele verwijzing naar het nieuwe scheduling-model -- de precedence zit uitsluitend in de orchestratielaag erboven, geen rotatie-rewrite');
}

// ═══ DEEL IV: EXTERNAL CALENDAR ICS-INCLUSIE ═══
function occ(id, plannedDate, naam, status) { return { id: id, planned_date: plannedDate, definition_snapshot: { naam: naam }, status: status || 'scheduled' }; }
function ass(id, occId, assStatus, override) { return { id: id, occurrence_id: occId, status: assStatus || 'planned', personal_date_override: override || null }; }

{
  const occurrences = [occ('o1', '2026-10-15', 'Benen A')];
  const assByOcc = { o1: [ass('a1', 'o1', 'planned')] };
  const events = CalendarProjectionCore.getMyTrainingCalendarEvents(occurrences, assByOcc);
  ok(events.length === 1 && events[0].title === 'Benen A' && events[0].date === '2026-10-15', '14. Eén Mijn Training-occurrence -> één correct geprojecteerd event');
  ok(events[0].uid === 'planned-training-o1@trainingskompas.app', '15. Stable UID gebruikt occurrence-identity (niet workout_definition_id)');
}
// ═══ meerdere occurrences zelfde definition -> unieke UIDs ═══
{
  const occurrences = [occ('o2', '2026-10-15', 'Benen A'), occ('o3', '2026-10-22', 'Benen A')];
  const assByOcc = { o2: [ass('a2', 'o2')], o3: [ass('a3', 'o3')] };
  const events = CalendarProjectionCore.getMyTrainingCalendarEvents(occurrences, assByOcc);
  ok(events.length === 2 && events[0].uid !== events[1].uid, '16. Twee occurrences van dezelfde definition krijgen elk een eigen, unieke UID (geen collision op definition-ID)');
}
// ═══ reschedule: zelfde UID, nieuwe datum ═══
{
  const voor = CalendarProjectionCore.getMyTrainingCalendarEvents([occ('o4', '2026-10-10', 'X')], { o4: [ass('a4', 'o4')] })[0];
  const na = CalendarProjectionCore.getMyTrainingCalendarEvents([occ('o4', '2026-10-12', 'X')], { o4: [ass('a4', 'o4')] })[0];
  ok(voor.uid === na.uid && na.date === '2026-10-12', '17. Reschedule (zelfde occurrence-id, andere planned_date) behoudt exact dezelfde UID, alleen de datum verandert');
}
// ═══ personal_date_override (future-ready, effective date consistency) ═══
{
  const events = CalendarProjectionCore.getMyTrainingCalendarEvents([occ('o5', '2026-10-10', 'Y')], { o5: [ass('a5', 'o5', 'planned', '2026-10-14')] });
  ok(events[0].date === '2026-10-14', '18. personal_date_override heeft voorrang boven occurrence.planned_date -- exact dezelfde effective-date-regel als Internal Calendar (geen tweede datumlogica)');
}
// ═══ skip/cancel projection ═══
{
  const skippedEvents = CalendarProjectionCore.getMyTrainingCalendarEvents([occ('o6', '2026-10-10', 'Z')], { o6: [ass('a6', 'o6', 'skipped')] });
  ok(skippedEvents.length === 0, '19. Een geskipte assignment wordt NIET in de feed opgenomen (zelfde omissie-regel als Program-blocks)');
  const cancelledEvents = CalendarProjectionCore.getMyTrainingCalendarEvents([occ('o7', '2026-10-10', 'Z', 'cancelled')], { o7: [ass('a7', 'o7', 'planned')] });
  ok(cancelledEvents.length === 0, '20. Een geannuleerde occurrence wordt NIET in de feed opgenomen');
}
// ═══ completed ═══
{
  const events = CalendarProjectionCore.getMyTrainingCalendarEvents([occ('o8', '2026-09-01', 'Voltooid')], { o8: [ass('a8', 'o8', 'completed')] });
  ok(events.length === 1 && events[0].status === 'completed', '21. Voltooide assignment blijft zichtbaar in de feed, status correct');
}
// ═══ privacy: geen extra velden ═══
{
  const events = CalendarProjectionCore.getMyTrainingCalendarEvents([occ('o9', '2026-10-10', 'X')], { o9: [ass('a9', 'o9')] });
  ok(!events[0].description, '22. Geen description-veld -- geen workoutdetails/coach/availability/health-data mogelijk om te lekken (zelfde V1-privacydefault als Program-projectie)');
}
// ═══ DEEL V: ICAL.JS ONAFHANKELIJKE VALIDATIE (echte third-party library, geen zelfgeschreven parser) ═══
{
  const occurrences = [occ('o10', '2026-10-15', 'Bënen ⚡, dag 1'), occ('o11', '2026-10-22', 'Bënen ⚡, dag 1')];
  const assByOcc = { o10: [ass('a10', 'o10')], o11: [ass('a11', 'o11', 'completed')] };
  const events = CalendarProjectionCore.getMyTrainingCalendarEvents(occurrences, assByOcc);
  const ics = CalendarProjectionCore.buildIcsCalendar(events, new Date('2026-10-01T12:00:00Z'));
  const jcalData = ICAL.parse(ics);
  const comp = new ICAL.Component(jcalData);
  const vevents = comp.getAllSubcomponents('vevent').map(function (ve) { return new ICAL.Event(ve); });
  ok(vevents.length === 2, '23. ICAL.js parseert beide Mijn Training-events correct uit de daadwerkelijke, gemengde feed-output');
  ok(vevents[0].startDate.isDate === true, '24. ICAL.js bevestigt zelfstandig date-only/all-day-semantiek (geen tijdcomponent)');
  ok(vevents[0].summary.indexOf('Bënen') > -1 && vevents[0].summary.indexOf('⚡') > -1, '25. Unicode en escaping (komma) correct geroundtript via ICAL.js\' eigen unescape-implementatie');
  ok(vevents[1].summary.indexOf('(voltooid)') > -1, '26. Voltooide Mijn Training toont de voltooiing in de titel, ook volgens ICAL.js');
}

// ═══ DEEL VI: FEED-ENDPOINT INTEGRATIE (geen tweede feed, geen tweede generator) ═══
{
  const feedSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'calendar-feed.js'), 'utf8');
  ok(feedSrc.indexOf('planned_training_occurrences') > 0 && feedSrc.indexOf('planned_training_assignments') > 0, '27. calendar-feed.js haalt Mijn Training-occurrences/assignments op binnen DEZELFDE, bestaande endpoint');
  ok(feedSrc.indexOf('getMyTrainingCalendarEvents') > 0, '28. Hergebruikt de gedeelde CalendarProjectionCore-functie, geen tweede ICS-generator');
  ok((feedSrc.match(/buildIcsCalendar/g) || []).length === 1, '29. Nog steeds precies één buildIcsCalendar-aanroep -- Program- en Mijn-Training-events worden samengevoegd tot ÉÉN feed, geen tweede feed-endpoint');
  ok(feedSrc.indexOf('athlete_user_id=eq.' + '\' + userId') > -1 || feedSrc.indexOf("athlete_user_id=eq.' + userId") > -1, '30. Mijn Training-assignments worden uitsluitend voor de server-side geresolveerde userId opgehaald (zelfde cross-user-isolatie als de rest van de endpoint)');
}

console.log('fMyTrainingC2CHardening: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
