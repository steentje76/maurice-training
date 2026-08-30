/* fSocialChallengeCore.test.js — MS-F9-02 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SC = require(path.join(ROOT, 'core/socialChallenge.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

ok(SC.isSupportedMetric('completed_sessions_count') === true, 'A1: completed_sessions_count is de enige ondersteunde V1-metric');
['lowest_bodyweight', 'highest_calories_burned', 'lowest_resting_hr', 'highest_hrv',
 'least_sleep', 'total_distance', 'total_volume', 'e1rm'].forEach(function (m) {
  ok(SC.isSupportedMetric(m) === false, 'A2: "' + m + '" is expliciet niet ondersteund');
});

ok(SC.challengeStatus('2026-09-01', '2026-09-30', '2026-08-30') === 'upcoming', 'B1: toekomstige challenge is upcoming');
ok(SC.challengeStatus('2026-08-30', '2026-09-30', '2026-08-30') === 'active', 'B2: startdag zelf telt als active');
ok(SC.challengeStatus('2026-08-01', '2026-08-30', '2026-08-30') === 'active', 'B3: einddag zelf telt als active');
ok(SC.challengeStatus('2026-07-01', '2026-07-31', '2026-08-30') === 'ended', 'B4: verlopen challenge is ended');
ok(SC.challengeStatus(null, '2026-08-30', '2026-08-30') === null, 'B5: ontbrekende datum geeft null');

ok(SC.canManageChallenge('U1', { creator_id: 'U1' }) === true, 'C1: de creator mag de challenge beheren');
ok(SC.canManageChallenge('U2', { creator_id: 'U1' }) === false, 'C2: een gewone participant mag niet beheren');

{
  const challengeOngescoopt = { id: 'C1', creator_id: 'U1', metric_type: 'completed_sessions_count', group_id: null };
  ok(SC.canJoinChallenge('U2', challengeOngescoopt, [], []) === true, 'D1: ongescoopte challenge is joinbaar');

  const challengeGroup = { id: 'C2', creator_id: 'U1', metric_type: 'completed_sessions_count', group_id: 'G1' };
  ok(SC.canJoinChallenge('U2', challengeGroup, [], []) === false, 'D2: niet-lid kan group-only challenge niet joinen');
  const memberships = [{ user_id: 'U2', group_id: 'G1', status: 'active' }];
  ok(SC.canJoinChallenge('U2', challengeGroup, memberships, []) === true, 'D3: actief lid kan wel joinen');
  const removedMembership = [{ user_id: 'U2', group_id: 'G1', status: 'removed' }];
  ok(SC.canJoinChallenge('U2', challengeGroup, removedMembership, []) === false, 'D4: verwijderd lid krijgt geen toegang');
}

{
  const uitgeschakeldeChallenge = { id: 'C3', creator_id: 'U1', metric_type: 'lowest_bodyweight', group_id: null };
  ok(SC.canJoinChallenge('U2', uitgeschakeldeChallenge, [], []) === false, 'E1: niet-ondersteunde metric is nooit joinbaar');
}

{
  const challenge = { id: 'C4', creator_id: 'U1', metric_type: 'completed_sessions_count', group_id: null };
  const blocked = [{ blocker_id: 'U1', blocked_id: 'U2' }];
  ok(SC.canJoinChallenge('U2', challenge, [], blocked) === false, 'F1: block door de creator voorkomt joinen');
  const blockedOmgekeerd = [{ blocker_id: 'U2', blocked_id: 'U1' }];
  ok(SC.canJoinChallenge('U2', challenge, [], blockedOmgekeerd) === false, 'F2: block werkt symmetrisch');
}

ok(SC.aggregateProgress([{ date: '2026-08-05' }, { date: '2026-08-15' }, { date: '2026-07-01' }], '2026-08-01', '2026-08-31') === 2,
  'G1: telt uitsluitend sessies binnen de periode');
ok(SC.aggregateProgress([], '2026-08-01', '2026-08-31') === 0, 'G2: lege lijst geeft feitelijk 0');
ok(SC.aggregateProgress(null, '2026-08-01', '2026-08-31') === 0, 'G3: ontbrekende input geeft veilig 0');

console.log('fSocialChallengeCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
