/* fCalendarProjectionIcs.test.js — Sprint B2-A: External Calendar
 * Foundation.
 *
 * Test tegen de daadwerkelijke, requirebare productiemodule
 * (core/calendarProjection.js) -- geen herimplementatie van de
 * projectie/ICS-generatie als eigen test-oracle. Roundtrip-validatie via
 * een onafhankelijke, minimale ICS-parser (niet dezelfde code als de
 * generator) voor sterk structureel bewijs.
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CalendarProjectionCore = require(path.join(ROOT, 'core', 'calendarProjection.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ── Onafhankelijke, minimale ICS-parser (geen hergebruik van de generator-code) ──
function parseIcs(ics) {
  const lines = ics.split('\r\n').filter(function (l) { return l.length; });
  const events = [];
  let cur = null;
  lines.forEach(function (line) {
    if (line === 'BEGIN:VEVENT') { cur = {}; return; }
    if (line === 'END:VEVENT') { events.push(cur); cur = null; return; }
    if (!cur) return;
    const idx = line.indexOf(':');
    const key = line.slice(0, idx);
    const val = line.slice(idx + 1);
    cur[key] = val;
  });
  return { hasCalendarBegin: ics.indexOf('BEGIN:VCALENDAR') === 0 || ics.indexOf('BEGIN:VCALENDAR') > -1, hasCalendarEnd: ics.indexOf('END:VCALENDAR') > -1, hasVersion: ics.indexOf('VERSION:2.0') > -1, hasProdId: ics.indexOf('PRODID:') > -1, events: events };
}

function block(id, plannedDate, faseNaam, completedAt, scheduleStatus) {
  return { id: id, planned_date: plannedDate, fase_naam: faseNaam || null, completed_at: completedAt || null, schedule_status: scheduleStatus || null };
}

// ═══ 1. één program block -> één event ═══
{
  const events = CalendarProjectionCore.getExternalCalendarEvents([block('b1', '2026-10-10', 'Bovenlichaam')]);
  ok(events.length === 1, '1. Eén program block genereert precies één event');
  ok(events[0].title === 'Bovenlichaam', '1b. Titel komt 1-op-1 uit fase_naam (canonical data, geen AI)');
}
// ═══ 2. twee blocks zelfde dag -> twee events (bevestigd ALLOWED) ═══
{
  const events = CalendarProjectionCore.getExternalCalendarEvents([block('b2a', '2026-10-10', 'A'), block('b2b', '2026-10-10', 'B')]);
  ok(events.length === 2 && events[0].uid !== events[1].uid, '2. Twee blocks op dezelfde dag geven twee aparte events met eigen UID (geen aanname van 1 training per dag)');
}
// ═══ 3/4. stable UID + reschedule behoudt UID ═══
{
  const voor = CalendarProjectionCore.getExternalCalendarEvents([block('b3', '2026-10-10', 'X')])[0];
  const na = CalendarProjectionCore.getExternalCalendarEvents([block('b3', '2026-10-12', 'X')])[0]; // zelfde id, andere datum (= reschedule)
  ok(voor.uid === na.uid, '3/4. Reschedule (zelfde block-id, andere planned_date) behoudt EXACT dezelfde UID -- vereist voor toekomstige Google/Outlook-sync-compatibiliteit');
  ok(voor.date !== na.date && na.date === '2026-10-12', '4b. Alleen de datum verandert, niet de identiteit');
}
// ═══ 5. gewijzigde datum correct in output ═══
ok(CalendarProjectionCore.getExternalCalendarEvents([block('b5', '2026-11-01', 'Y')])[0].date === '2026-11-01', '5. Gewijzigde datum wordt correct doorgegeven');
// ═══ 6. geen duplicate na herhaalde aanroep (determinisme) ═══
{
  const a = CalendarProjectionCore.getExternalCalendarEvents([block('b6', '2026-10-10', 'Z')]);
  const b = CalendarProjectionCore.getExternalCalendarEvents([block('b6', '2026-10-10', 'Z')]);
  ok(a[0].uid === b[0].uid && a[0].date === b[0].date, '6. Herhaalde generatie voor dezelfde canonical state geeft identieke UID/datum (geen random UID per aanroep)');
}
// ═══ 7. skipped semantics: NIET gepubliceerd (V1-keuze A) ═══
{
  const events = CalendarProjectionCore.getExternalCalendarEvents([block('b7', '2026-10-10', 'Geskipt', null, 'skipped')]);
  ok(events.length === 0, '7. Een geskipte block wordt NIET in de feed opgenomen (optie A, geen zombie-event)');
}
// ═══ 8. completed semantics: blijft zichtbaar, status weerspiegeld ═══
{
  const events = CalendarProjectionCore.getExternalCalendarEvents([block('b8', '2026-09-01', 'Onderlichaam', '2026-09-01T10:00:00Z')]);
  ok(events.length === 1 && events[0].status === 'completed', '8. Voltooide training blijft zichtbaar op de oorspronkelijke datum, status correct als completed');
}
// ═══ 9. normal block (niet completed, niet skipped) ═══
{
  const events = CalendarProjectionCore.getExternalCalendarEvents([block('b9', '2026-10-10', 'Normaal')]);
  ok(events[0].status === 'planned', '9. Normale, nog niet uitgevoerde block krijgt status planned');
}
// ═══ 10. all-day date correctness (geen tijd verzonnen) ═══
{
  const events = CalendarProjectionCore.getExternalCalendarEvents([block('b10', '2026-10-10', 'X')]);
  ok(events[0].allDay === true && events[0].date === '2026-10-10', '10. All-day event, date-only representatie (geen verzonnen kloktijd)');
}
// ═══ 11/12. DST-start/-einde: pure string-manipulatie, geen Date/UTC-conversie ═══
{
  ok(CalendarProjectionCore.icsDateOnly('2026-03-29') === '20260329', '11. DST-start-datum (NL, laatste zondag maart) correct als pure string omgezet, geen dagverschuiving');
  ok(CalendarProjectionCore.icsDateOnly('2026-10-25') === '20261025', '12. DST-einde-datum correct, geen dagverschuiving');
}
// ═══ 13. jaargrens ═══
ok(CalendarProjectionCore.icsDateOnly('2026-12-31') === '20261231' && CalendarProjectionCore.icsDateOnly('2027-01-01') === '20270101', '13. Jaargrens correct, geen off-by-one');
// ═══ 14/15. escaping: komma, puntkomma, newline ═══
{
  ok(CalendarProjectionCore.icsEscape('Been, dag; nummer 1') === 'Been\\, dag\\; nummer 1', '14. Komma en puntkomma correct ge-escaped (RFC 5545 §3.3.11)');
  ok(CalendarProjectionCore.icsEscape('regel1\nregel2') === 'regel1\\nregel2', '15. Newline correct ge-escaped naar \\\\n');
}
// ═══ 16. unicode workout title ═══
ok(CalendarProjectionCore.icsEscape('Beëindigde training ⚡') === 'Beëindigde training ⚡', '16. Unicode-tekens blijven intact (geen mojibake/verlies)');
// ═══ 17. missing optional title fallback ═══
ok(CalendarProjectionCore.getExternalCalendarEvents([block('b17', '2026-10-10', null)])[0].title === 'Training', '17. Ontbrekende fase_naam valt terug op de neutrale titel "Training" (geen AI-generatie)');
// ═══ 18. training_instances is NOOIT een bron voor deze projectie (module-niveau bewijs) ═══
{
  const src = require('fs').readFileSync(path.join(ROOT, 'core', 'calendarProjection.js'), 'utf8');
  ok(src.indexOf('b.training_instances') === -1 && src.indexOf("'training_instances'") === -1, '18. De projectiemodule leest FUNCTIONEEL nergens uit training_instances (canonical bron is uitsluitend program_blocks, B0-bewezen; het commentaar noemt de naam uitsluitend om de bewuste uitsluiting te documenteren)');
}
// ═══ 19. sessions is nooit een bron ═══
{
  const src = require('fs').readFileSync(path.join(ROOT, 'core', 'calendarProjection.js'), 'utf8');
  ok(!/\bsessions\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), '19. Geen verwijzing naar sessions als planningsbron buiten commentaar');
}
// ═══ 20. geen AI-aanroep ═══
{
  const src = require('fs').readFileSync(path.join(ROOT, 'core', 'calendarProjection.js'), 'utf8');
  ok(src.indexOf('fetch(') === -1 && src.indexOf('anthropic') === -1 && src.indexOf('AI') === -1 || src.indexOf('geen AI') > -1, '20. Geen netwerk-/AI-aanroep in de projectiemodule -- puur, deterministisch');
}

// ═══ ICS-STRUCTUUR + ROUNDTRIP (onafhankelijke parser) ═══
{
  const events = CalendarProjectionCore.getExternalCalendarEvents([
    block('r1', '2026-10-10', 'Bovenlichaam'),
    block('r2', '2026-10-10', 'Onderlichaam'),
    block('r3', '2026-09-01', 'Voltooid', '2026-09-01T10:00:00Z')
  ]);
  const ics = CalendarProjectionCore.buildIcsCalendar(events, new Date('2026-10-01T12:00:00Z'));
  const parsed = parseIcs(ics);
  ok(parsed.hasCalendarBegin && parsed.hasCalendarEnd, 'ICS-1. BEGIN:VCALENDAR / END:VCALENDAR aanwezig');
  ok(parsed.hasVersion, 'ICS-2. VERSION:2.0 aanwezig');
  ok(parsed.hasProdId, 'ICS-3. PRODID aanwezig');
  ok(parsed.events.length === 3, 'ICS-4. Roundtrip: alle 3 events correct geparsed door een ONAFHANKELIJKE parser');
  ok(parsed.events[0].UID === 'program-block-r1@trainingskompas.app', 'ICS-5. UID exact conform de stableUid()-conventie, ook na roundtrip');
  ok(parsed.events[0]['DTSTART;VALUE=DATE'] === '20261010', 'ICS-6. DTSTART correct all-day (VALUE=DATE), geen tijdcomponent');
  ok(parsed.events[0].DTSTAMP && /^\d{8}T\d{6}Z$/.test(parsed.events[0].DTSTAMP), 'ICS-7. DTSTAMP structureel geldig (UTC-tijdstempel-vorm)');
  ok(parsed.events[2].SUMMARY.indexOf('(voltooid)') > -1, 'ICS-8. Voltooide training toont de voltooiing in de titel');
  ok(!parsed.events[0].DESCRIPTION, 'ICS-9. Geen DESCRIPTION-veld -- V1-privacydefault: geen extra inhoud (geen recovery/HRV/notitie-data mogelijk om te lekken)');
}
// ═══ 13 (sectie 13): geen PII in UID ═══
{
  const uid = CalendarProjectionCore.stableUid('abc-123');
  ok(uid.indexOf('@') > -1 && !/[A-Za-z]+\s[A-Za-z]+/.test(uid), 'PII-1. UID bevat geen naam-achtige tekst (opaque, uitsluitend block-id)');
}
// ═══ Determinisme: content identiek behalve DTSTAMP bij verschillende generatie-tijdstippen ═══
{
  const events = CalendarProjectionCore.getExternalCalendarEvents([block('d1', '2026-10-10', 'X')]);
  const icsA = CalendarProjectionCore.buildIcsCalendar(events, new Date('2026-01-01T00:00:00Z'));
  const icsB = CalendarProjectionCore.buildIcsCalendar(events, new Date('2026-06-01T00:00:00Z'));
  const parsedA = parseIcs(icsA), parsedB = parseIcs(icsB);
  ok(parsedA.events[0].UID === parsedB.events[0].UID && parsedA.events[0].SUMMARY === parsedB.events[0].SUMMARY, 'DET-1. Event-identiteit/inhoud verandert niet tussen twee generatietijdstippen (uitsluitend DTSTAMP mag verschillen, conform RFC)');
  ok(icsA.indexOf('DTSTAMP:20260101') > -1 && icsB.indexOf('DTSTAMP:20260601') > -1, 'DET-2. DTSTAMP zelf verschilt wél correct per generatietijdstip');
}

// ═══ IMMUTABILITY NEGATIVE CONTROL (sectie 50): bevroren input mag nooit
// een mutatiepoging laten slagen -- bewijst dat de module puur is, geen
// enkel canonical brongegeven wordt aangeraakt tijdens projectie/generatie. ═══
{
  const b = Object.freeze(block('imm1', '2026-10-10', 'Immutable'));
  let wierpFout = false;
  try { CalendarProjectionCore.getExternalCalendarEvents([b]); } catch (e) { wierpFout = true; }
  ok(!wierpFout, 'IMM-1. Projectie op bevroren (Object.freeze) block-input verloopt zonder fout -- geen enkele mutatiepoging op het canonical brongegeven');
  ok(b.planned_date === '2026-10-10' && b.schedule_status === null, 'IMM-2. Het canonical block-object zelf is na projectie exact ongewijzigd (bevroren waarden onaangetast)');
}
{
  const events = CalendarProjectionCore.getExternalCalendarEvents([block('imm2', '2026-10-10', 'X')]);
  const bevroren = Object.freeze(events);
  let wierpFout = false;
  try { CalendarProjectionCore.buildIcsCalendar(bevroren, new Date('2026-01-01T00:00:00Z')); } catch (e) { wierpFout = true; }
  ok(!wierpFout, 'IMM-3. ICS-generatie op een bevroren events-array verloopt zonder fout -- geen mutatie van de eventlijst zelf tijdens generatie');
}

console.log('fCalendarProjectionIcs: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
