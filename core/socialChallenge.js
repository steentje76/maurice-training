/* ==========================================================================
 * TrainingKompas — SOCIAL CHALLENGE CORE  (F9.2, MS-F9-02)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 *
 * DOEL: Social is een CONSUMENT van canonieke trainingsdata, GEEN tweede
 * Calculation Engine. Deze module berekent NOOIT afstand/volume/e1RM/
 * trainingsbelasting/recovery/readiness zelf.
 *
 * V1-SCOPE (kleinst mogelijke, veilige metric): UITSLUITEND
 * 'completed_sessions_count' -- een pure TELLING van reeds-bestaande,
 * voltooide training_instances-records binnen een periode. Geen berekening,
 * dus geen shadow-calculation-risico.
 *
 * EXPLICIET GEEN ondersteunde metrics: gewicht, lichaamssamenstelling,
 * calorieën, hartslag, slaap, readiness/recovery, e1RM, afstand, volume,
 * trainingsbelasting -- allemaal DEFER tot een toekomstige, apart
 * geauditeerde uitbreiding.
 *
 * TIJDGRENZEN: kalenderdag-strings (YYYY-MM-DD), nooit ruwe timestamp/
 * toISOString(). Start/eind zijn beide inclusief.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'social_challenge.v1' };
  var SUPPORTED_METRICS = ['completed_sessions_count'];
  var STATUSES = ['upcoming', 'active', 'ended'];

  function isSupportedMetric(metricType) {
    return SUPPORTED_METRICS.indexOf(metricType) !== -1;
  }

  function challengeStatus(startDateStr, endDateStr, todayStr) {
    if (!startDateStr || !endDateStr || !todayStr) return null;
    if (todayStr < startDateStr) return 'upcoming';
    if (todayStr > endDateStr) return 'ended';
    return 'active';
  }

  function canJoinChallenge(userId, challenge, groupMemberships, blockedPairs) {
    if (!challenge || !challenge.id) return false;
    if (!isSupportedMetric(challenge.metric_type)) return false;
    if (Array.isArray(blockedPairs) && blockedPairs.some(function (b) {
      return (b.blocker_id === userId && b.blocked_id === challenge.creator_id) ||
             (b.blocker_id === challenge.creator_id && b.blocked_id === userId);
    })) return false;
    if (challenge.group_id) {
      if (!Array.isArray(groupMemberships)) return false;
      return groupMemberships.some(function (m) {
        return m.user_id === userId && m.group_id === challenge.group_id && m.status === 'active';
      });
    }
    return true;
  }

  function canManageChallenge(userId, challenge) {
    return !!challenge && challenge.creator_id === userId;
  }

  function aggregateProgress(sessions, startDateStr, endDateStr) {
    if (!Array.isArray(sessions)) return 0;
    return sessions.filter(function (s) {
      return s && s.date && s.date >= startDateStr && s.date <= endDateStr;
    }).length;
  }

  var SocialChallengeCore = {
    VERSIONS: VERSIONS, SUPPORTED_METRICS: SUPPORTED_METRICS, STATUSES: STATUSES,
    isSupportedMetric: isSupportedMetric,
    challengeStatus: challengeStatus,
    canJoinChallenge: canJoinChallenge,
    canManageChallenge: canManageChallenge,
    aggregateProgress: aggregateProgress
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = SocialChallengeCore; }
  else { global.SocialChallengeCore = SocialChallengeCore; }
})(typeof window !== 'undefined' ? window : this);
