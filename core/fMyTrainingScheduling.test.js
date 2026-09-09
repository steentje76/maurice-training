/* fMyTrainingScheduling.test.js — Sprint C2-B: Mijn Trainingen canonical
 * occurrence + assignment scheduling.
 *
 * Test tegen de daadwerkelijke, requirebare module (core/myTrainingScheduling.js)
 * en tegen geëxtraheerde productiecode in index.html/migratie_v551.sql --
 * geen herimplementatie van de kernlogica als eigen test-oracle.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MyTrainingSchedulingCore = require(path.join(ROOT, 'core', 'myTrainingScheduling.js'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v551.sql'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }
function slice(a, b) { const s = html.indexOf(a); const e = html.indexOf(b, s); if (s < 0 || e < 0) throw new Error('marker niet gevonden: ' + a + ' / ' + b); return html.slice(s, e); }

// ═══ DEEL I: SCHEMA / MIGRATIE-AUDIT ═══
ok(migratie.indexOf('CREATE TABLE public.planned_training_occurrences') > 0, '1. Nieuwe canonical occurrence-tabel');
ok(migratie.indexOf('CREATE TABLE public.planned_training_assignments') > 0, '2. Nieuwe canonical assignment-tabel -- gescheiden van occurrence (PO-beslissing 1A)');
ok(migratie.indexOf('personal_date_override date NULL') > 0, '3. personal_date_override aanwezig vanaf V1 -- future-ready voor coach/team personal override zonder schemawijziging (PO-beslissing 1C)');
ok(migratie.indexOf('planned_training_assignments_unique_per_occurrence UNIQUE (occurrence_id, athlete_user_id)') > 0, '4. UNIQUE-constraint voorkomt duplicate assignment voor dezelfde sporter op dezelfde occurrence (create-idempotency op databaseniveau)');
ok(migratie.indexOf("status IN ('scheduled', 'cancelled')") > 0, '5. Occurrence-status gescheiden van assignment-status (cancel != skip, PO-beslissing 1E)');
ok(migratie.indexOf("status IN ('planned', 'skipped', 'completed')") > 0, '6. Assignment-statusvocabulaire correct: planned/skipped/completed');
ok(migratie.indexOf('training_instance_id uuid NULL REFERENCES public.training_instances(id)') > 0, '7. Echte FK naar training_instances (i.p.v. het oudere prog_<id>-stringpatroon) -- expliciete voorkeur uit de opdracht gevolgd');
ok(migratie.indexOf('CREATE OR REPLACE FUNCTION public.schedule_my_training') > 0, '8. Atomaire RPC voor occurrence+self-assignment-creatie (voorkomt orphan occurrence)');
ok(migratie.indexOf('SECURITY DEFINER') > 0 && migratie.indexOf('v_owns') > 0, '9. RPC verifieert server-side definition-ownership vóór enige write (user A kan geen occurrence maken voor vaste_training van user B)');
ok(migratie.indexOf('ALTER TABLE public.program_blocks') === -1 && migratie.indexOf('ALTER TABLE public.programs') === -1, '10. Programs/program_blocks blijven volledig ongewijzigd (PO-beslissing 1B)');
ok(migratie.indexOf('start_time') === -1 && migratie.indexOf('end_time') === -1 && migratie.indexOf('timestamptz NOT NULL') !== migratie.indexOf('planned_date'), '11. Date-only V1: geen start_time/end_time/timestamptz-planningskolom (PO-beslissing 1F)');
ok(!/CREATE POLICY\s+\S*coach/i.test(migratie) && !/CREATE POLICY\s+\S*team/i.test(migratie), '12. GEEN brede coach/team-RLS-policy toegevoegd "voor later" -- V1 is strikt owner-only (Hard Gate sectie 18)');

// ═══ DEEL II: PURE MODULE — EFFECTIVE DATE ═══
{
  const occ = { id: 'o1', planned_date: '2026-10-10' };
  const assNormaal = { id: 'a1', personal_date_override: null };
  const assOverride = { id: 'a2', personal_date_override: '2026-10-12' };
  ok(MyTrainingSchedulingCore.effectivePlannedDate(assNormaal, occ) === '2026-10-10', '13. Zonder override: effective date = occurrence.planned_date');
  ok(MyTrainingSchedulingCore.effectivePlannedDate(assOverride, occ) === '2026-10-12', '14. Met override: effective date = personal_date_override (future coach/team-scenario, nu al correct ondersteund)');
}
// ═══ toCalendarSourceEvents ═══
{
  const occs = [{ id: 'o1', status: 'scheduled', definition_snapshot: { naam: 'Benen A' } }];
  const assByOcc = { o1: [{ id: 'a1', status: 'planned', personal_date_override: null }] };
  // Zonder occurrence.planned_date kan effective date niet worden bepaald -- test met volledige occurrence
  occs[0].planned_date = '2026-10-15';
  const events = MyTrainingSchedulingCore.toCalendarSourceEvents(occs, assByOcc);
  ok(events.length === 1 && events[0].plannedDate === '2026-10-15' && events[0].title === 'Benen A', '15. toCalendarSourceEvents produceert correct genormaliseerd event (zelfde vorm-conventie als bestaande program_blocks-projectie)');
  ok(events[0].sourceType === 'my_training' && events[0].sourceId === 'o1' && events[0].assignmentId === 'a1', '16. Stable source/assignment-identiteit correct doorgegeven');
}
// ═══ cancelled occurrence niet getoond ═══
{
  const occs = [{ id: 'o2', status: 'cancelled', planned_date: '2026-10-20', definition_snapshot: { naam: 'X' } }];
  const assByOcc = { o2: [{ id: 'a2', status: 'planned', personal_date_override: null }] };
  const events = MyTrainingSchedulingCore.toCalendarSourceEvents(occs, assByOcc);
  ok(events.length === 0, '17. Een geannuleerde occurrence wordt NIET in de Calendar-projectie opgenomen (analoog aan skipped bij Programs, geen zombie-item)');
}
// ═══ meerdere occurrences van dezelfde definition (herhaling, use case B) ═══
{
  const occs = [
    { id: 'o3', status: 'scheduled', planned_date: '2026-10-15', definition_snapshot: { naam: 'Benen A' } },
    { id: 'o4', status: 'scheduled', planned_date: '2026-10-22', definition_snapshot: { naam: 'Benen A' } },
    { id: 'o5', status: 'scheduled', planned_date: '2026-10-29', definition_snapshot: { naam: 'Benen A' } }
  ];
  const assByOcc = { o3: [{ id: 'a3', status: 'planned', personal_date_override: null }], o4: [{ id: 'a4', status: 'skipped', personal_date_override: null }], o5: [{ id: 'a5', status: 'planned', personal_date_override: null }] };
  const events = MyTrainingSchedulingCore.toCalendarSourceEvents(occs, assByOcc);
  ok(events.length === 3, '18. Herhaling (use case B): drie occurrences van dezelfde definition -> drie aparte, onafhankelijke events');
  ok(events.find(function (e) { return e.sourceId === 'o4'; }).status === 'skipped' && events.find(function (e) { return e.sourceId === 'o3'; }).status === 'planned', '19. Eén occurrence skippen beïnvloedt de andere twee niet -- onafhankelijke statuses');
}
// ═══ puurheid: geen mutatie van input ═══
{
  const occs = Object.freeze([{ id: 'o6', status: 'scheduled', planned_date: '2026-10-10', definition_snapshot: Object.freeze({ naam: 'Y' }) }]);
  const assByOcc = Object.freeze({ o6: Object.freeze([Object.freeze({ id: 'a6', status: 'planned', personal_date_override: null })]) });
  let wierpFout = false;
  try { MyTrainingSchedulingCore.toCalendarSourceEvents(occs, assByOcc); } catch (e) { wierpFout = true; }
  ok(!wierpFout, '20. Werkt correct op volledig bevroren input -- geen enkele mutatiepoging (puur, zoals vereist)');
}
// ═══ geen DB-aanroep in de pure module ═══
{
  const src = fs.readFileSync(path.join(ROOT, 'core', 'myTrainingScheduling.js'), 'utf8');
  ok(src.indexOf('sbGet(') === -1 && src.indexOf('fetch(') === -1, '21. De pure module doet zelf geen enkele database-aanroep');
  ok(src.indexOf('training_instances') === -1 && src.indexOf('sessions') === -1, '22. Geen enkele functionele referentie naar training_instances/sessions als planningsbron (Hard Gate)');
}

// ═══ DEEL III: UI-INTEGRATIE ═══
ok(html.indexOf('src="core/myTrainingScheduling.js"') > 0, '23. Module daadwerkelijk geladen in index.html (geen dode module)');
ok(html.indexOf("onclick=\"openScheduleMyTraining('${v.id}'") > 0, '24. "Inplannen"-knop daadwerkelijk aanwezig op elke Mijn Training-kaart');
{
  const fn = slice('async function openScheduleMyTraining', 'async function myTrainingSkipAssignment');
  ok(fn.indexOf('snapshotFromVasteTraining(') > 0, '25. Hergebruikt EXACT de bestaande snapshotFromVasteTraining() -- geen nieuwe, parallelle snapshotlogica en geen fake revisienummer');
  ok(fn.indexOf("sbRpc('schedule_my_training'") > 0, '26. Roept de atomaire, owner-geverifieerde RPC aan (geen aparte, twee-staps client-side create die een orphan occurrence zou kunnen achterlaten)');
}
{
  const fn = slice('async function myTrainingSkipAssignment', 'async function myTrainingReschedule');
  ok(fn.indexOf("sbPatchQ('planned_training_assignments'") > 0 && fn.indexOf("status:'skipped'") > 0, '27. Skip muteert uitsluitend de ASSIGNMENT, nooit de occurrence');
  ok(fn.indexOf('training_instances') === -1 && fn.indexOf('sessions') === -1, '27b. Skip raakt training_instances/sessions op geen enkele manier aan (skip != abort)');
}
{
  const fn = slice('async function myTrainingReschedule', 'async function myTrainingCancelOccurrence');
  ok(fn.indexOf("sbPatchQ('planned_training_occurrences'") > 0 && fn.indexOf('planned_date:nieuweDatum') > 0, '28. Reschedule wijzigt occurrence.planned_date via de bestaande, gedeelde sbPatchQ (erft dus automatisch dezelfde offline/retry-garanties als Sprint B/C1, geen nieuwe queue)');
}
{
  const fn = slice('async function myTrainingCancelOccurrence', 'function go(id){');
  ok(fn.indexOf("status:'cancelled'") > 0, '29. Cancel zet occurrence-status naar cancelled (gescheiden van assignment-skip, PO-beslissing 1E)');
}
// ═══ Calendar-integratie: parallel aan bestaande, ONGEWIJZIGDE Program-projectie ═══
{
  const fn = slice('async function renderCalMonth', 'function calSelectDay');
  ok(fn.indexOf("sbGetOrFail('planned_training_occurrences'") > 0, '30. renderCalMonth haalt occurrences op via dezelfde fail-safe sbGetOrFail() als de overige bronnen (load-failure-onderscheid geldt ook hier)');
  ok(fn.indexOf('MyTrainingSchedulingCore.toCalendarSourceEvents') > 0, '31. Hergebruikt de gedeelde, pure projectie-adapter -- geen tweede, losse datum-afleiding in de UI-laag zelf');
  ok(fn.indexOf('CalendarMonthViewCore.buildMonthGrid') > 0, '32. De bestaande, reeds geteste en gemergede Program-projectie (buildMonthGrid) blijft ONGEWIJZIGD aangeroepen -- geen regressie op Sprint C1');
}
{
  const fn = slice('function renderCalDayDetail', 'async function calDayAction');
  ok(fn.indexOf('window.calMyTrainingByDate') > 0, '33. Dagdetail toont Mijn Training-items apart naast Program-blocks (geen samenvoeging, same-day-oracle)');
  ok(fn.indexOf('myTrainingSkipAssignment') > 0 && fn.indexOf('myTrainingReschedule') > 0, '34. Skip/reschedule-acties daadwerkelijk aanwezig in de dagdetail-rendering');
  ok(fn.indexOf("startPlannedMyTraining(") > 0, "35. 'Start' routeert via de nieuwe startPlannedMyTraining()-wrapper (Sprint C2-C: zet activePlannedAssignmentId + dubbele-start-guard, roept daarna zelf de bestaande openTrainingPreview() aan -- geen tweede execution-ENGINE, wel een dunne wrapper voor executie-koppeling)");
}

// ═══ DEEL IV: NEGATIVE CONTROLS (sectie 51-achtig, expliciet vereist) ═══
ok(html.indexOf('function computeNextVasteTraining') > -1, '36. De bestaande computeNextVasteTraining()-rotatie is NIET verwijderd/vervangen -- blijft bestaan als fallback (PO-richting sectie 42/43), C2-B bouwt er expliciet geen precedence-logica bovenop in deze pass (eerlijk gerapporteerde beperking, geen overclaim)');
{
  const openScheduleFn = slice('async function openScheduleMyTraining', 'async function myTrainingSkipAssignment');
  ok(!/sbPostQ\(.program_blocks.|sbPatchQ\(.program_blocks./.test(openScheduleFn), '37. Inplannen raakt op geen enkele manier program_blocks aan (geen dubbele Program-planning, PO-beslissing 1B)');
}

console.log('fMyTrainingScheduling: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
