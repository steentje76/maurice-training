/* ==========================================================================
 * TrainingKompas — SOCIAL PRIVACY CORE  (F9.1, MS-F9-01)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage. INPUT -> OUTPUT.
 *
 * DOEL: het ENIGE, canonieke autorisatiecontract voor Social. Client-side
 * verbergen is GEEN autorisatie -- deze module dient voor consistente UI-
 * logica; de database-RLS blijft de daadwerkelijke bron van waarheid en moet
 * hiermee 1:1 overeenkomen.
 *
 * PRIVACY-MODEL (kleinst mogelijke, drie standen):
 *   'private'      -- uitsluitend de atleet zelf.
 *   'connections'  -- atleet + geaccepteerde connecties.
 *   'discoverable' -- profiel (NIET trainingsdata) vindbaar voor iedereen.
 *
 * RELATIEMODEL: eenvoudig, asymmetrisch "follow"-model, geen wederkerige
 * "friend" -- kleinste, meest voorspelbare model.
 *
 * BLOK WINT ALTIJD: overschrijft elke andere relatie/zichtbaarheid.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'social_privacy.v1' };
  var VISIBILITY_STATES = ['private', 'connections', 'discoverable'];

  function isBlocked(viewerId, athleteId, blockedPairs) {
    if (!Array.isArray(blockedPairs)) return false;
    return blockedPairs.some(function (b) {
      return (b.blocker_id === viewerId && b.blocked_id === athleteId) ||
             (b.blocker_id === athleteId && b.blocked_id === viewerId);
    });
  }

  function isConnection(viewerId, athleteId, connections) {
    if (!Array.isArray(connections)) return false;
    return connections.some(function (c) {
      return c.follower_id === viewerId && c.followee_id === athleteId && c.status === 'accepted';
    });
  }

  function canViewSocialProfile(viewerId, athlete, connections, blockedPairs) {
    if (!athlete || !athlete.id) return false;
    if (viewerId === athlete.id) return true;
    if (isBlocked(viewerId, athlete.id, blockedPairs)) return false;
    if (VISIBILITY_STATES.indexOf(athlete.visibility) === -1) return false;
    if (athlete.visibility === 'discoverable') return true;
    if (athlete.visibility === 'connections') return isConnection(viewerId, athlete.id, connections);
    return false;
  }

  function canViewSharedActivity(viewerId, activity, connections, blockedPairs) {
    if (!activity || !activity.athlete_id) return false;
    if (viewerId === activity.athlete_id) return true;
    if (isBlocked(viewerId, activity.athlete_id, blockedPairs)) return false;
    if (activity.visibility === 'public') return true;
    if (activity.visibility === 'connections') return isConnection(viewerId, activity.athlete_id, connections);
    return false;
  }

  var SocialPrivacyCore = {
    VERSIONS: VERSIONS,
    VISIBILITY_STATES: VISIBILITY_STATES,
    isBlocked: isBlocked,
    isConnection: isConnection,
    canViewSocialProfile: canViewSocialProfile,
    canViewSharedActivity: canViewSharedActivity
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = SocialPrivacyCore; }
  else { global.SocialPrivacyCore = SocialPrivacyCore; }
})(typeof window !== 'undefined' ? window : this);
