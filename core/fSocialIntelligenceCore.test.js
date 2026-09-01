/* fSocialIntelligenceCore.test.js — B9-08 Social Intelligence.
 * Bewaakt de pure aggregatie-laag: determinisme, missing != zero,
 * error != empty, hergebruik van bestaande engines, geen ranking.
 */
'use strict';
const SIC = require('./socialIntelligence.js');
const SocialChallengeCore = require('./socialChallenge.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. activitySummary: missing != zero, error != empty ----
{
  const r = SIC.activitySummary({ activeChallenges: [], pendingFollowRequests: null, unreadNotifications: [{}, {}], recentReactionsOnOwnShares: undefined });
  ok(r.activeChallenges === 0 && r.data_quality.activeChallenges === 'COMPLETE', 'A1: een lege array (echt 0 challenges) geeft 0 met status COMPLETE');
  ok(r.pendingFollowRequests === null && r.data_quality.pendingFollowRequests === 'NOT_AVAILABLE', 'A2: null (nog niet geladen/fout) geeft NOOIT 0 -- expliciet NOT_AVAILABLE, missing != zero');
  ok(r.unreadNotifications === 2, 'A3: 2 daadwerkelijke items worden correct geteld');
  ok(r.recentReactionsOnOwnShares === null && r.data_quality.recentReactionsOnOwnShares === 'NOT_AVAILABLE', 'A4: undefined (ontbrekende data) wordt nooit als 0 behandeld');
}
{
  // Determinisme: zelfde input -> zelfde output, geen mutatie van de input.
  const input = { activeChallenges: [{ id: 1 }], pendingFollowRequests: [], unreadNotifications: [], recentReactionsOnOwnShares: [] };
  const inputKopie = JSON.parse(JSON.stringify(input));
  const r1 = SIC.activitySummary(input);
  const r2 = SIC.activitySummary(input);
  ok(JSON.stringify(r1) === JSON.stringify(r2), 'A5 (determinisme): identieke input geeft identieke output');
  ok(JSON.stringify(input) === JSON.stringify(inputKopie), 'A6 (geen mutatie): de input-array wordt niet gewijzigd door activitySummary()');
}

// ---- B. challengeIntelligence: hergebruik, geen eigen berekening, geen ranking ----
{
  const challenge = { id: 'c1', starts_at: '2026-01-01', ends_at: '2026-01-31' };
  const sessions = [{ date: '2026-01-05' }, { date: '2026-01-10' }, { date: '2026-02-01' }];
  const r = SIC.challengeIntelligence(challenge, sessions, '2026-01-15', SocialChallengeCore);
  ok(r.status === 'valid' && r.own_progress_count === 2, 'B1: hergebruikt SocialChallengeCore.aggregateProgress() exact -- 2 van de 3 sessies vallen binnen de periode');
  ok(r.challenge_status === 'active', 'B2: challenge_status komt exact van SocialChallengeCore.challengeStatus(), geen eigen statuslogica');
  ok(!('ranking' in r) && !('rank' in r) && !('position' in r) && !('percentile' in r), 'B3: geen enkel ranking-/percentile-veld aanwezig in de output -- expliciet niet gebouwd');
}
{
  const r = SIC.challengeIntelligence({ id: 'c1', starts_at: '2026-01-01', ends_at: '2026-01-31' }, null, '2026-01-15', SocialChallengeCore);
  ok(r.status === 'NOT_AVAILABLE' && r.reason === 'sessions_not_loaded', 'B4: ontbrekende sessions (null, nog niet geladen) geeft NOT_AVAILABLE, nooit een stille 0-progressie');
}
{
  const r = SIC.challengeIntelligence(null, [], '2026-01-15', SocialChallengeCore);
  ok(r.status === 'NOT_AVAILABLE', 'B5: geen challenge geeft NOT_AVAILABLE, geen crash');
}

// ---- C. groupNotifications: deterministische groepering, privacy-neutraal ----
{
  const notifs = [
    { id: 'n1', event_type: 'reaction', target_type: 'shared_activity', target_id: 'a1', read_at: null },
    { id: 'n2', event_type: 'reaction', target_type: 'shared_activity', target_id: 'a1', read_at: null },
    { id: 'n3', event_type: 'reaction', target_type: 'shared_activity', target_id: 'a1', read_at: '2026-01-01T00:00:00Z' },
    { id: 'n4', event_type: 'connection_request', target_type: 'profile', target_id: 'u1', read_at: null },
  ];
  const r = SIC.groupNotifications(notifs);
  ok(r.groups.length === 2, 'C1: vier notificaties worden correct gegroepeerd tot 2 (3 reacties op a1 + 1 connection_request) -- "3 nieuwe reacties" i.p.v. drie losse kaarten');
  const groep1 = r.groups.find(g => g.target_id === 'a1');
  ok(groep1.count === 3 && groep1.any_unread === true, 'C2: de gegroepeerde reactie-notificaties tellen correct 3, met any_unread=true (2 van de 3 zijn ongelezen)');
  ok(groep1.notification_ids.length === 3, 'C3: alle onderliggende notification-ids blijven traceerbaar (geen dataverlies door groepering)');
}
{
  const r = SIC.groupNotifications(null);
  ok(r.status === 'NOT_AVAILABLE' && r.groups.length === 0, 'C4: ontbrekende notificaties (null) geeft NOT_AVAILABLE, geen crash');
}

console.log('fSocialIntelligenceCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
