/* ==========================================================================
 * TrainingKompas — SOCIAL SHARING CORE  (F9.3, MS-F9-03)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 *
 * DOEL: canoniek whitelist-contract voor gedeelde activiteiten. Een shared
 * activity is UITSLUITEND een REFERENTIE naar een bestaande, canonieke
 * training_instance + een expliciete, kleine presentatie-whitelist -- nooit
 * een kopie van het volledige trainingsrecord.
 *
 * SHARING IS EXPLICIET: standaard wordt niets automatisch gedeeld.
 *
 * VERBODEN VELDEN (nooit in een share-payload): HRV, RHR, slaap, readiness/
 * recovery, lichaamsgewicht/-samenstelling, Women's Performance, medische
 * context, coach-privénotities, exacte locatie tenzij expliciet toegestaan.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'social_shared_activity.v1' };
  var VISIBILITY_STATES = ['connections', 'public'];

  // Expliciete ALLOWLIST -- alles wat hier niet in staat wordt genegeerd.
  var ALLOWED_FIELDS = ['sport', 'title', 'completedAt', 'durationSeconds', 'distanceMeters', 'achievementLabel', 'athleteNote'];

  function sanitizeShare(input) {
    var out = {};
    if (!input || typeof input !== 'object') return out;
    ALLOWED_FIELDS.forEach(function (f) {
      if (input[f] !== undefined && input[f] !== null) out[f] = input[f];
    });
    return out;
  }

  function isBlocked(a, b, blockedPairs) {
    if (!Array.isArray(blockedPairs)) return false;
    return blockedPairs.some(function (p) {
      return (p.blocker_id === a && p.blocked_id === b) || (p.blocker_id === b && p.blocked_id === a);
    });
  }

  function isConnection(viewerId, athleteId, connections) {
    if (!Array.isArray(connections)) return false;
    return connections.some(function (c) { return c.follower_id === viewerId && c.followee_id === athleteId && c.status === 'accepted'; });
  }

  function canViewSharedActivity(viewerId, activity, connections, blockedPairs) {
    if (!activity || !activity.athlete_id) return false;
    if (viewerId === activity.athlete_id) return true;
    if (isBlocked(viewerId, activity.athlete_id, blockedPairs)) return false;
    if (activity.visibility === 'public') return true;
    if (activity.visibility === 'connections') return isConnection(viewerId, activity.athlete_id, connections);
    return false;
  }

  function canDeleteShare(userId, activity) {
    return !!activity && activity.athlete_id === userId;
  }

  var SocialSharingCore = {
    VERSIONS: VERSIONS, VISIBILITY_STATES: VISIBILITY_STATES, ALLOWED_FIELDS: ALLOWED_FIELDS,
    sanitizeShare: sanitizeShare,
    canViewSharedActivity: canViewSharedActivity,
    canDeleteShare: canDeleteShare
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = SocialSharingCore; }
  else { global.SocialSharingCore = SocialSharingCore; }
})(typeof window !== 'undefined' ? window : this);
