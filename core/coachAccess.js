/* ==========================================================================
 * TrainingKompas — COACH ACCESS CORE  (F10.1, MS-F10-01)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. UI is NOOIT de security boundary --
 * deze module dient voor consistente UI-logica; de database-RLS (via
 * coach_has_scope() en de bijbehorende policies) blijft de daadwerkelijke
 * bron van waarheid en moet hiermee 1:1 overeenkomen.
 *
 * AI COACH != HUMAN COACH: dit contract regelt UITSLUITEND de menselijke
 * coach/PT-rol. netlify/functions/coach.js (de AI-coach-proxy voor de
 * sporter zelf) verleent GEEN enkele extra recht aan een menselijke coach.
 *
 * SCOPE-MODEL (expliciet, versioneerbaar):
 *   TRAINING_CORE      -- programma/geschiedenis/sets/reps/RPE/adherence.
 *                         Default AAN bij activatie.
 *   RECOVERY_HEALTH     -- HRV/RHR/slaap/health-brondata. Default UIT.
 *   WOMENS_PERFORMANCE  -- F8-cyclus/symptomen. Default UIT, ALTIJD apart,
 *                         nooit impliciet via een andere scope of relatie.
 *
 * ZELF-ELEVATIE ONMOGELIJK: uitsluitend de athlete mag activeren/scopes
 * wijzigen (afgedwongen door RLS, hier gespiegeld voor UI-logica).
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'coach_access.v1' };
  var SCOPES = ['TRAINING_CORE', 'RECOVERY_HEALTH', 'WOMENS_PERFORMANCE'];
  var RELATIONSHIP_STATUSES = ['pending', 'active', 'revoked'];

  function hasActiveRelationship(coachId, athleteId, relationships) {
    if (!Array.isArray(relationships)) return false;
    return relationships.some(function (r) {
      return r.coach_user_id === coachId && r.athlete_user_id === athleteId && r.status === 'active';
    });
  }

  function findRelationship(coachId, athleteId, relationships) {
    if (!Array.isArray(relationships)) return null;
    return relationships.find(function (r) { return r.coach_user_id === coachId && r.athlete_user_id === athleteId; }) || null;
  }

  function hasScope(coachId, athleteId, scope, relationships, scopeRows) {
    if (SCOPES.indexOf(scope) === -1) return false;
    var rel = findRelationship(coachId, athleteId, relationships);
    if (!rel || rel.status !== 'active') return false;
    if (!Array.isArray(scopeRows)) return false;
    return scopeRows.some(function (s) { return s.relationship_id === rel.id && s.scope === scope && s.enabled === true; });
  }

  function canViewTrainingCore(coachId, athleteId, relationships, scopeRows) {
    return hasScope(coachId, athleteId, 'TRAINING_CORE', relationships, scopeRows);
  }
  function canViewRecoveryHealth(coachId, athleteId, relationships, scopeRows) {
    return hasScope(coachId, athleteId, 'RECOVERY_HEALTH', relationships, scopeRows);
  }
  function canViewWomensPerformance(coachId, athleteId, relationships, scopeRows) {
    return hasScope(coachId, athleteId, 'WOMENS_PERFORMANCE', relationships, scopeRows);
  }

  function canActivateRelationship(userId, relationship) {
    return !!relationship && relationship.athlete_user_id === userId && relationship.status === 'pending';
  }
  function canRevokeRelationship(userId, relationship) {
    return !!relationship && (relationship.coach_user_id === userId || relationship.athlete_user_id === userId) && relationship.status !== 'revoked';
  }
  function canModifyScope(userId, relationship) {
    return !!relationship && relationship.athlete_user_id === userId;
  }

  var CoachAccessCore = {
    VERSIONS: VERSIONS, SCOPES: SCOPES, RELATIONSHIP_STATUSES: RELATIONSHIP_STATUSES,
    hasActiveRelationship: hasActiveRelationship,
    hasScope: hasScope,
    canViewTrainingCore: canViewTrainingCore,
    canViewRecoveryHealth: canViewRecoveryHealth,
    canViewWomensPerformance: canViewWomensPerformance,
    canActivateRelationship: canActivateRelationship,
    canRevokeRelationship: canRevokeRelationship,
    canModifyScope: canModifyScope
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CoachAccessCore; }
  else { global.CoachAccessCore = CoachAccessCore; }
})(typeof window !== 'undefined' ? window : this);
