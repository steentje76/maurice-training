/* fAdherenceIntelligence.test.js — MS-F7-03 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SA = require(path.join(ROOT, 'core/scheduleAdherence.js'));
const AI = require(path.join(ROOT, 'core/adherenceIntelligence.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Golden case: gemengde uitkomsten ----
{
  const items = [];
  for (let i = 0; i < 7; i++) items.push({ planned_date: '2026-08-0' + (i + 1), completed_at: '2026-08-0' + (i + 1) + 'T10:00:00Z' });
  items.push({ planned_date: '2026-08-08', completed_at: null, schedule_status: null });
  items.push({ planned_date: '2026-08-09', completed_at: null, schedule_status: null });
  items.push({ planned_date: '2026-08-10', completed_at: null, schedule_status: 'skipped' });
  const r = AI.aggregate(items, '2026-08-29', SA);
  ok(r.status === 'valid' && r.planned_eligible === 10 && r.completed === 7 && r.missed === 2 && r.skipped === 1,
    'A1: 10 items (7 completed, 2 missed, 1 skipped) -> correcte telling');
  ok(r.percentage === 70, 'A2: percentage correct berekend als 7/10 = 70%');
}

// ---- B. Closure-critical: noemer-definitie ----
{
  const itemsFuture = [{ planned_date: '2026-09-15', completed_at: null, schedule_status: null }];
  const rFuture = AI.aggregate(itemsFuture, '2026-08-29', SA);
  ok(rFuture.status === 'INSUFFICIENT_DATA' && rFuture.planned_eligible === 0,
    'B1: uitsluitend toekomstige items -> INSUFFICIENT_DATA, geen 0%-fabricage');

  const rNoSchedule = AI.aggregate([], '2026-08-29', SA);
  ok(rNoSchedule.status === 'NOT_AVAILABLE' && rNoSchedule.percentage === null,
    'B2: geen schema -> NOT_AVAILABLE, nooit een gefabriceerd 0%-percentage');

  const itemsToday = [{ planned_date: '2026-08-29', completed_at: null, schedule_status: null }];
  const rToday = AI.aggregate(itemsToday, '2026-08-29', SA);
  ok(rToday.status === 'INSUFFICIENT_DATA', 'B3: een vandaag-geplande, nog niet voltooide sessie telt nooit mee');

  const itemsResched = [{ planned_date: '2026-08-27', completed_at: '2026-08-27T10:00:00Z', schedule_status: 'rescheduled', rescheduled_from: '2026-08-25' }];
  const rResched = AI.aggregate(itemsResched, '2026-08-29', SA);
  ok(rResched.planned_eligible === 1 && rResched.completed === 1 && rResched.percentage === 100,
    'B4: een verplaatste, voltooide sessie telt precies EENMAAL mee, geen dubbele bestraffing/beloning');
}

// ---- C. SKIPPED-behandeling ----
{
  const itemsSkip = [{ planned_date: '2026-08-01', completed_at: null, schedule_status: 'skipped' }];
  const r = AI.aggregate(itemsSkip, '2026-08-29', SA);
  ok(r.skipped === 1 && r.completed === 0 && r.percentage === 0,
    'C1: SKIPPED telt als niet-voltooid, maar wel in de noemer');
}

// ---- D. Hergebruik, geen duplicatie ----
ok(!Object.keys(AI).some(function (k) { return /resolveScheduleGap|daysLate|hasScheduleConflict/.test(k); }),
  'D1: AdherenceIntelligenceCore herimplementeert geen schedule-gap-logica zelf');

console.log('fAdherenceIntelligence: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
