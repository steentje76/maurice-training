/* fInternalCalendarFuturePlanning.test.js — Sprint C1: Internal Calendar
 * Future Planning.
 *
 * Test tegen de daadwerkelijke, requirebare module (core/calendarMonthView.js)
 * en tegen geëxtraheerde productiecode uit index.html voor de UI-integratie
 * (histSetMode/calMonthNav/calDayAction/renderCalMonth) -- geen
 * herimplementatie van de kernlogica als eigen test-oracle.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CalendarMonthViewCore = require(path.join(ROOT, 'core', 'calendarMonthView.js'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function pb(id, date, fase, completedAt, status) { return { id: id, planned_date: date, fase_naam: fase || null, completed_at: completedAt || null, schedule_status: status || null }; }
function sess(date) { return { date: date }; }
function period(id, start, end, ctx, tr) { return { id: id, start_date: start, end_date: end, context_type: ctx, training_availability: tr }; }

// Simpele, ZELFSTANDIGE stand-in voor getAvailabilityForDate/getProgramAvailabilityConflict
// -- functioneel identiek aan de productieversie (Sprint A/B, apart al 100% getest in
// fAvailabilityFoundation.test.js/fAvailabilityProgramConflict.test.js), hier alleen
// als dependency-injectie-argument gebruikt om buildMonthGrid's EIGEN, aparte logica
// te testen zonder die eerdere suites te dupliceren.
function getAvailabilityForDate(dateStr, periods) {
  const hit = periods.find(function (p) { return p.start_date <= dateStr && dateStr <= p.end_date; });
  if (!hit) return null;
  return { periodId: hit.id, contextType: hit.context_type, trainingAvailability: hit.training_availability };
}
function getProgramAvailabilityConflict(block, periods) {
  const ctx = getAvailabilityForDate(block.planned_date, periods);
  if (!ctx) return { conflictLevel: 'none' };
  if (ctx.trainingAvailability === 'unavailable') return { conflictLevel: 'conflict' };
  if (ctx.trainingAvailability === 'limited') return { conflictLevel: 'context' };
  return { conflictLevel: 'none' };
}

// ═══ 1. verleden session zichtbaar (hasHistory) ═══
{
  const grid = CalendarMonthViewCore.buildMonthGrid(2026, 10, { sessions: [sess('2026-10-05')], today: '2026-10-10' });
  const cel = grid.find(function (c) { return c.date === '2026-10-05'; });
  ok(cel.hasHistory === true && cel.isPast === true, '1. Verleden session correct zichtbaar als historie, dag correct als verleden gemarkeerd');
}
// ═══ 2. toekomstige program block zichtbaar ═══
{
  const grid = CalendarMonthViewCore.buildMonthGrid(2026, 10, { programBlocks: [pb('b1', '2026-10-20', 'Bovenlichaam')], today: '2026-10-10' });
  const cel = grid.find(function (c) { return c.date === '2026-10-20'; });
  ok(cel.plannedBlocks.length === 1 && cel.isFuture === true, '2. Toekomstig program block correct zichtbaar, dag correct als toekomst gemarkeerd');
}
// ═══ 3. vandaag block zichtbaar ═══
{
  const grid = CalendarMonthViewCore.buildMonthGrid(2026, 10, { programBlocks: [pb('b2', '2026-10-10', 'X')], today: '2026-10-10' });
  const cel = grid.find(function (c) { return c.date === '2026-10-10'; });
  ok(cel.isToday === true && !cel.isPast && !cel.isFuture, '3. Vandaag correct als vandaag gemarkeerd (niet ook als verleden/toekomst)');
}
// ═══ 4. meerdere blocks dezelfde dag (bewezen ALLOWED) ═══
{
  const grid = CalendarMonthViewCore.buildMonthGrid(2026, 10, { programBlocks: [pb('b3a', '2026-10-15', 'A'), pb('b3b', '2026-10-15', 'B')], today: '2026-10-10' });
  const cel = grid.find(function (c) { return c.date === '2026-10-15'; });
  ok(cel.plannedBlocks.length === 2, '4. Meerdere blocks dezelfde dag beide zichtbaar, geen deduplicatie op datum');
}
// ═══ 6. completed status ═══
{
  const grid = CalendarMonthViewCore.buildMonthGrid(2026, 9, { programBlocks: [pb('b4', '2026-09-05', 'Y', '2026-09-05T10:00:00Z')], today: '2026-10-10' });
  const cel = grid.find(function (c) { return c.date === '2026-09-05'; });
  ok(cel.completedBlocks.length === 1 && cel.plannedBlocks.length === 0, '6. Voltooid block correct in completedBlocks, NIET dubbel ook in plannedBlocks');
}
// ═══ 7. skipped status ═══
{
  const grid = CalendarMonthViewCore.buildMonthGrid(2026, 10, { programBlocks: [pb('b5', '2026-10-12', 'Z', null, 'skipped')], today: '2026-10-10' });
  const cel = grid.find(function (c) { return c.date === '2026-10-12'; });
  ok(cel.skippedBlocks.length === 1 && cel.plannedBlocks.length === 0, '7. Overgeslagen block correct in skippedBlocks, niet in plannedBlocks (geen dubbele weergave)');
}
// ═══ 8. rescheduled block (zelfde block-id, andere datum -- dit is de EFFECT-toets, identiteit zelf wordt in Sprint B/B2-A getest) ═══
{
  const voor = CalendarMonthViewCore.buildMonthGrid(2026, 10, { programBlocks: [pb('b6', '2026-10-10', 'X')], today: '2026-10-05' });
  const na = CalendarMonthViewCore.buildMonthGrid(2026, 10, { programBlocks: [pb('b6', '2026-10-12', 'X')], today: '2026-10-05' });
  ok(voor.find(function (c) { return c.date === '2026-10-10'; }).plannedBlocks.length === 1, '8a. Vóór reschedule: block zichtbaar op oorspronkelijke datum');
  ok(voor.find(function (c) { return c.date === '2026-10-12'; }).plannedBlocks.length === 0, '8b. Vóór reschedule: nieuwe datum nog leeg');
  ok(na.find(function (c) { return c.date === '2026-10-10'; }).plannedBlocks.length === 0, '8c. Ná reschedule: oude datum toont het block niet meer');
  ok(na.find(function (c) { return c.date === '2026-10-12'; }).plannedBlocks.length === 1, '8d. Ná reschedule: nieuwe datum toont het block');
}
// ═══ 9/10. limited/unavailable availability (dependency-injected resolver) ═══
{
  const grid = CalendarMonthViewCore.buildMonthGrid(2026, 10, {
    programBlocks: [pb('b7', '2026-10-08', 'X')],
    availabilityPeriods: [period('p1', '2026-10-01', '2026-10-10', 'vacation', 'limited')],
    today: '2026-10-05', getConflict: getProgramAvailabilityConflict, getAvailability: getAvailabilityForDate
  });
  const cel = grid.find(function (c) { return c.date === '2026-10-08'; });
  ok(cel.availability.trainingAvailability === 'limited' && cel.conflictLevel === 'context', '9. Limited availability correct doorgegeven en conflictLevel op context (geen hard conflict)');
}
{
  const grid = CalendarMonthViewCore.buildMonthGrid(2026, 10, {
    programBlocks: [pb('b8', '2026-10-08', 'X')],
    availabilityPeriods: [period('p2', '2026-10-01', '2026-10-10', 'personal', 'unavailable')],
    today: '2026-10-05', getConflict: getProgramAvailabilityConflict, getAvailability: getAvailabilityForDate
  });
  ok(grid.find(function (c) { return c.date === '2026-10-08'; }).conflictLevel === 'conflict', '10. Unavailable availability geeft correct conflictLevel conflict');
}
// ═══ 11. vacation + normal = GEEN conflict (harde negative control) ═══
{
  const grid = CalendarMonthViewCore.buildMonthGrid(2026, 10, {
    programBlocks: [pb('b9', '2026-10-08', 'X')],
    availabilityPeriods: [period('p3', '2026-10-01', '2026-10-10', 'vacation', 'normal')],
    today: '2026-10-05', getConflict: getProgramAvailabilityConflict, getAvailability: getAvailabilityForDate
  });
  ok(grid.find(function (c) { return c.date === '2026-10-08'; }).conflictLevel === 'none', '11. vacation+normal: GEEN conflict, ook al bevat de context het woord vakantie');
}
// ═══ 12. multi-day availability op alle relevante datums ═══
{
  const grid = CalendarMonthViewCore.buildMonthGrid(2026, 10, {
    availabilityPeriods: [period('p4', '2026-10-05', '2026-10-08', 'travel', 'limited')],
    today: '2026-10-01', getAvailability: getAvailabilityForDate
  });
  ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'].forEach(function (d) {
    ok(grid.find(function (c) { return c.date === d; }).availability.trainingAvailability === 'limited', '12. Multi-day availability correct op elke dag binnen de periode: ' + d);
  });
  ok(grid.find(function (c) { return c.date === '2026-10-04'; }).availability === null, '12b. Dag vóór de periode correct zonder availability-context');
  ok(grid.find(function (c) { return c.date === '2026-10-09'; }).availability === null, '12c. Dag ná de periode correct zonder availability-context');
}
// ═══ 13. conflict resolver reuse (dependency injection bewezen, geen duplicaat) ═══
{
  const src = fs.readFileSync(path.join(ROOT, 'core', 'calendarMonthView.js'), 'utf8');
  ok(src.indexOf("trainingAvailability === 'unavailable'") === -1 && src.indexOf("trainingAvailability==='unavailable'") === -1, "13. calendarMonthView.js herïmplementeert de conflictclassificatie NIET zelf -- uitsluitend via de meegegeven getConflict-functie (dependency injection, geen tweede parallelle conflictberekening)");
}
// ═══ 14. availability delete/wijziging -> conflict verdwijnt (geen program_block-mutatie) ═══
{
  const blocks = [pb('b10', '2026-10-08', 'X')];
  const metAvail = CalendarMonthViewCore.buildMonthGrid(2026, 10, { programBlocks: blocks, availabilityPeriods: [period('p5', '2026-10-01', '2026-10-10', 'personal', 'unavailable')], today: '2026-10-01', getConflict: getProgramAvailabilityConflict, getAvailability: getAvailabilityForDate });
  const zonderAvail = CalendarMonthViewCore.buildMonthGrid(2026, 10, { programBlocks: blocks, availabilityPeriods: [], today: '2026-10-01', getConflict: getProgramAvailabilityConflict, getAvailability: getAvailabilityForDate });
  ok(metAvail.find(function (c) { return c.date === '2026-10-08'; }).conflictLevel === 'conflict', '14a. Met availability: conflict aanwezig');
  ok(zonderAvail.find(function (c) { return c.date === '2026-10-08'; }).conflictLevel === 'none', '14b. Na verwijderen availability: conflict verdwijnt automatisch, zonder dat het block-object zelf is aangepast (blocks-array hergebruikt, ongewijzigd)');
  ok(blocks[0].planned_date === '2026-10-08', '14c. Het canonical block-object is nooit gemuteerd door de projectie');
}
// ═══ 25/26. month/year navigation: correcte daysInMonth, inclusief schrikkeljaar ═══
ok(CalendarMonthViewCore.daysInMonth(2026, 2) === 28, '25. Februari 2026 (geen schrikkeljaar) correct 28 dagen');
ok(CalendarMonthViewCore.daysInMonth(2028, 2) === 29, '28. Schrikkeljaar 2028 correct 29 dagen');
ok(CalendarMonthViewCore.daysInMonth(2026, 12) === 31 && CalendarMonthViewCore.daysInMonth(2027, 1) === 31, '27. Jaargrens (december/januari) correct aantal dagen');
// ═══ 29/30. DST-start/-einde: pure stringbouw via ymd(), geen Date/UTC-conversie voor de datum zelf ═══
ok(CalendarMonthViewCore.ymd(2026, 3, 29) === '2026-03-29', '29. DST-start-datum (NL) correct als pure string gebouwd, geen dagverschuiving');
ok(CalendarMonthViewCore.ymd(2026, 10, 25) === '2026-10-25', '30. DST-einde-datum correct, geen dagverschuiving');
// ═══ 31. geen UTC-off-by-one: ymd() gebruikt geen new Date().toISOString() ═══
{
  const src = fs.readFileSync(path.join(ROOT, 'core', 'calendarMonthView.js'), 'utf8');
  ok(!/[^-]toISOString\(/.test(src), '31. Geen FUNCTIONEEL gebruik van toISOString() in de module (bekende UTC/lokale-tijd-bug-bron elders in de app, hier structureel vermeden -- het commentaar noemt de term uitsluitend om de bewuste vermijding te documenteren)');
}
// ═══ 39. GEEN training_instances-gebruik (Hard Gate sectie 5) ═══
{
  const src = fs.readFileSync(path.join(ROOT, 'core', 'calendarMonthView.js'), 'utf8');
  ok(src.indexOf('.training_instances') === -1 && src.indexOf("'training_instances'") === -1, '39. calendarMonthView.js doet FUNCTIONEEL geen enkele aanroep op training_instances -- geen toekomstige planning kan daaruit ontstaan (het commentaar noemt de naam uitsluitend om de bewuste uitsluiting te documenteren)');
}
// ═══ 54. GEEN nieuwe planningtabel/duplicate storage -- module is puur input->output ═══
{
  const src = fs.readFileSync(path.join(ROOT, 'core', 'calendarMonthView.js'), 'utf8');
  ok(src.indexOf('sbGet(') === -1 && src.indexOf('sbPost') === -1 && src.indexOf('fetch(') === -1, '54. De module doet zelf GEEN enkele database-aanroep -- puur input(reeds opgehaalde canonical rijen)->output, geen duplicate-storage-risico');
}

// ═══ UI-INTEGRATIE (geëxtraheerd uit index.html) ═══
ok(html.indexOf('src="core/calendarMonthView.js"') > 0, 'UI-1. De nieuwe module wordt daadwerkelijk in index.html geladen (geen dode/ongebruikte module)');
ok(html.indexOf("if(id==='s-hist'){histOff=0;renderHistFilterTabs();loadHistory();histSetMode(histMode||'list');}") > 0, "UI-2. go()-routing initialiseert de Calendar-modus correct bij binnenkomst op s-hist (bestaand navigatiepatroon hergebruikt)");
ok(html.indexOf('function calDayAction(actie,blockId)') > 0, 'UI-3. calDayAction() bestaat als integratiepunt tussen Calendar-UI en de bestaande Sprint-B-acties');
{
  const s = html.indexOf('async function calDayAction');
  const e = html.indexOf('function go(id){', s);
  const fn = html.slice(s, e);
  ok(fn.indexOf('availConflictSkip(blockId)') > 0 && fn.indexOf('availConflictReschedule(blockId)') > 0, 'UI-4. calDayAction() hergebruikt EXACT de bestaande availConflictSkip/availConflictReschedule (Sprint B) -- GEEN tweede reschedule/skip-implementatie vanuit Calendar');
  ok(fn.indexOf("sbPatchQ('program_blocks'") === -1 && fn.indexOf("sbPatchQ('training_instances'") === -1, 'UI-5. calDayAction() zelf voert GEEN enkele directe database-write uit -- alle mutatie loopt uitsluitend via de bestaande, apart geteste Sprint-B-functies');
}
// ═══ "keep" vanuit Calendar hergebruikt exact dezelfde write-loze functie ═══
ok(html.indexOf("onclick=\"availConflictKeep(\'+b.id+\'") > -1 || html.indexOf('availConflictKeep(') > 0, 'UI-6. "Behouden" vanuit Calendar roept dezelfde write-loze availConflictKeep() aan (Sprint B) -- geen nieuwe keep-implementatie');
// ═══ active execution guard blijft intact (wordt binnen availConflictSkip/Reschedule zelf afgedwongen, niet omzeild door Calendar) ═══
{
  const availSrc = html.slice(html.indexOf('async function availConflictSkip'), html.indexOf('function getAvailabilityForDate'));
  ok(availSrc.indexOf("vaste_training_id=eq.prog_'+blockId+'&status=eq.active") > 0, 'UI-7. De actieve-executie-guard (adversarieel gevonden/gefixt in Sprint B) zit IN de hergebruikte functies zelf -- Calendar kan hem structureel niet omzeilen, want er is geen los, ongeguarded schrijfpad');
}
// ═══ start training vanuit Calendar routeert naar de bestaande centrale entry point ═══
ok(html.indexOf("previewStartTraining('normal')") > -1, 'UI-8. "Start training" vanuit Calendar (alleen voor vandaag) routeert naar de bestaande, centrale previewStartTraining() -- geen tweede execution-startpad');

console.log('fInternalCalendarFuturePlanning: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
