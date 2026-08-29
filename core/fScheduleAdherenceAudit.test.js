/* fScheduleAdherenceAudit.test.js — MS-F4-05 regressietest.
 *
 * A. Golden cases: alle 5 gap-statussen, conflict-detectie, event-proximity.
 * B. Regressie-lock: reschedule raakt uitsluitend het aangeklikte block.
 * C. Sabotagebewijs op de conflict-waarschuwing (nooit stille overschrijving).
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ScheduleAdherenceCore = require(path.join(ROOT, 'core/scheduleAdherence.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Golden cases: alle 5 gap-statussen ----
ok(ScheduleAdherenceCore.resolveScheduleGap('2026-08-01', '2026-08-10', '2026-08-01T10:00:00Z', null) === 'COMPLETED',
  'A1: completed_at aanwezig -> COMPLETED, ongeacht datum');
ok(ScheduleAdherenceCore.resolveScheduleGap('2026-08-01', '2026-08-10', null, 'skipped') === 'SKIPPED',
  'A2: schedule_status=skipped -> SKIPPED, nooit alsnog MISSED');
ok(ScheduleAdherenceCore.resolveScheduleGap('2026-08-20', '2026-08-10', null, null) === 'FUTURE',
  'A3: planned_date in de toekomst -> FUTURE');
ok(ScheduleAdherenceCore.resolveScheduleGap('2026-08-10', '2026-08-10', null, null) === 'TODAY',
  'A4: planned_date = vandaag -> TODAY');
ok(ScheduleAdherenceCore.resolveScheduleGap('2026-08-01', '2026-08-10', null, null) === 'MISSED',
  'A5: planned_date in het verleden, niet afgerond/overgeslagen -> MISSED');
ok(ScheduleAdherenceCore.resolveScheduleGap(null, '2026-08-10', null, null) === null,
  'A6: ontbrekende planned_date -> null, geen gok');

// ---- A2. Event proximity ----
ok(ScheduleAdherenceCore.daysUntilEvent(null, '2026-08-10') === null, 'geen event ingesteld -> null, geen verzonnen getal');
ok(ScheduleAdherenceCore.daysUntilEvent('2026-08-10', '2026-08-10') === 0, 'event vandaag -> 0');
ok(ScheduleAdherenceCore.weeksUntilEvent('2026-08-01', '2026-08-10') === null, 'verlopen event -> null (geen negatief-weken-getal)');
ok(ScheduleAdherenceCore.weeksUntilEvent('2026-08-18', '2026-08-10') === 2, '8 dagen te gaan -> naar boven afgerond naar 2 weken (Math.ceil)');

// ---- A3. sessionsMissed: feitelijke telling, geen fabricage ----
{
  const blocks = [
    { planned_date: '2026-08-01', completed_at: null, schedule_status: null },
    { planned_date: '2026-08-05', completed_at: '2026-08-05T10:00:00Z', schedule_status: null },
    { planned_date: '2026-08-08', completed_at: null, schedule_status: 'skipped' }
  ];
  ok(ScheduleAdherenceCore.sessionsMissed(blocks, '2026-08-10') === 1,
    'sessionsMissed: exact 1 (alleen het niet-afgeronde, niet-overgeslagen, verleden block telt)');
}

// ---- B. Reschedule raakt uitsluitend het aangeklikte block ----
{
  const blocks = [
    { id: 1, planned_date: '2026-08-10', completed_at: null, schedule_status: null },
    { id: 2, planned_date: '2026-08-12', completed_at: null, schedule_status: null }
  ];
  const decision = ScheduleAdherenceCore.resolveRescheduleDecision(blocks, '2026-08-15', 1);
  ok(decision === 'PROCEED', 'geen botsing op de nieuwe datum -> PROCEED');
}

// ---- C. Sabotagebewijs: conflict moet ALTIJD gedetecteerd worden, nooit gemist ----
{
  const blocksMetBotsing = [
    { id: 1, planned_date: '2026-08-10', completed_at: null, schedule_status: null },
    { id: 2, planned_date: '2026-08-15', completed_at: null, schedule_status: null }
  ];
  const decision = ScheduleAdherenceCore.resolveRescheduleDecision(blocksMetBotsing, '2026-08-15', 1);
  ok(decision === 'CONFLICT_WARNING',
    'KRITIEK: verplaatsen naar een datum waar al een ander, niet-afgerond block gepland staat -> CONFLICT_WARNING, nooit stilzwijgend PROCEED');
}

console.log('fScheduleAdherenceAudit: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
