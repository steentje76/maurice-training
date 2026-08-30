/* fTeamAnalyticsCore.test.js — MS-F11-03 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const TA = require(path.join(ROOT, 'core/teamAnalyticsCore.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

[0, 1, 2, 3, 4].forEach(function (n) {
  var records = [];
  for (var i = 0; i < n; i++) records.push({ user_id: 'U' + i, status: 'present' });
  var result = TA.aggregateAttendance(records);
  ok(result.status === 'insufficient_data', 'A: cohort van ' + n + ' geeft insufficient_data');
  ok(result.present_rate === undefined, 'A: cohort van ' + n + ' bevat geen present_rate');
});

{
  var vijf = [
    { user_id: 'U1', status: 'present' }, { user_id: 'U2', status: 'present' },
    { user_id: 'U3', status: 'absent' }, { user_id: 'U4', status: 'present' }, { user_id: 'U5', status: 'absent' }
  ];
  var r = TA.aggregateAttendance(vijf);
  ok(r.status === 'ok', 'B1: exact 5 deelnemers geeft status ok');
  ok(r.present_rate === 0.6, 'B2: present_rate correct berekend (3/5 = 0.6)');
}

{
  var klein = [{ user_id: 'GEHEIME_NAAM_1', status: 'absent' }, { user_id: 'GEHEIME_NAAM_2', status: 'present' }];
  var serialized = JSON.stringify(TA.aggregateAttendance(klein));
  ok(serialized.indexOf('GEHEIME_NAAM') === -1, 'C1: geen enkele user_id lekt in de output bij een klein cohort');
  var serializedGroot = JSON.stringify(TA.aggregateAttendance([
    { user_id: 'GEHEIME_NAAM_1', status: 'present' }, { user_id: 'GEHEIME_NAAM_2', status: 'present' },
    { user_id: 'GEHEIME_NAAM_3', status: 'absent' }, { user_id: 'GEHEIME_NAAM_4', status: 'present' },
    { user_id: 'GEHEIME_NAAM_5', status: 'absent' }
  ]));
  ok(serializedGroot.indexOf('GEHEIME_NAAM') === -1, 'C2: geen enkele user_id lekt in de output, ook niet bij een groot cohort');
}

{
  var drie = [{ user_id: 'U1', status: 'present' }, { user_id: 'U2', status: 'present' }, { user_id: 'U3', status: 'absent' }];
  ok(TA.aggregateAttendance(drie, 3).status === 'ok', 'D1: een expliciet lagere drempel (3) wordt gerespecteerd');
  ok(TA.aggregateAttendance(drie, 10).status === 'insufficient_data', 'D2: een expliciet hogere drempel (10) wordt gerespecteerd');
}

ok(TA.aggregateAttendance(null).status === 'insufficient_data', 'E1: null-input geeft veilig insufficient_data');
ok(TA.aggregateAttendance(undefined).status === 'insufficient_data', 'E2: undefined-input geeft veilig insufficient_data');

{
  var kleinResp = [{ status: 'done' }, { status: 'open' }];
  ok(TA.aggregateResponsibilitiesCompletion(kleinResp).status === 'insufficient_data', 'F1: klein cohort geeft insufficient_data voor responsibilities');
  var grootResp = [{ status: 'done' }, { status: 'done' }, { status: 'open' }, { status: 'done' }, { status: 'open' }];
  var rf = TA.aggregateResponsibilitiesCompletion(grootResp);
  ok(rf.status === 'ok' && rf.completion_rate === 0.6, 'F2: completion_rate correct berekend voor een groot cohort');
}

console.log('fTeamAnalyticsCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
