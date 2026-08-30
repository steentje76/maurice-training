/* fTeamAnalyticsRpc.test.js — MS-F11-03 regressietest voor de server-side
 * privacy-safe analytics-RPC. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v517.sql'), 'utf8');

ok(migratie.includes("team_has_access(p_team_id, array['owner','admin','staff'])"),
  'A1: de RPC vereist expliciet staff/admin/owner-toegang (geen member-toegang)');
ok(migratie.includes("raise exception 'geen toegang tot team-analytics voor dit team'"),
  'A2: een expliciete foutmelding bij geweigerde toegang');

ok(migratie.includes('if coalesce(v_response_count, 0) < p_min_cohort_size then') &&
   migratie.includes("'insufficient_data'"),
  'B1: onder de cohortdrempel wordt expliciet insufficient_data geretourneerd');
{
  const gateIndex = migratie.indexOf('if coalesce(v_response_count, 0) < p_min_cohort_size then');
  const gateBlock = migratie.slice(gateIndex, gateIndex + 300);
  ok(gateBlock.includes('null::numeric, null::numeric') && gateBlock.includes('return;'),
    'B2: de insufficient_data-tak geeft expliciet NULL-percentages en stopt met een vroege return');
}

{
  const returnsBlock = migratie.split('returns table (')[1].split(')')[0];
  ['team_id', 'event_count', 'eligible_participant_count', 'attendance_rate',
   'responsibility_completion_rate', 'privacy_status', 'period_start', 'period_end'
  ].forEach(function (veld) {
    ok(returnsBlock.includes(veld), 'C1: het toegestane veld "' + veld + '" is aanwezig');
  });
  ok(!/user_id|email|naam\s|hrv|sleep|recovery/i.test(returnsBlock),
    'C2: het outputcontract bevat geen enkel verboden, individueel-herleidbaar veld');
}

ok(migratie.includes('revoke execute on function public.get_team_attendance_summary') && migratie.includes('from anon'),
  'D1: de RPC heeft geen EXECUTE-recht voor anon');
ok(migratie.includes('set search_path = public'), 'D2: de RPC heeft een vastgezette search_path');

ok(!/select\s+\*\s+from\s+event_attendance/i.test(migratie) && !/select\s+user_id.*from\s+event_attendance/i.test(migratie),
  'E1: de RPC selecteert nergens individuele event_attendance-rijen om terug te geven');

console.log('fTeamAnalyticsRpc: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
