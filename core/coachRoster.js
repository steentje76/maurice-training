/* ==========================================================================
 * TrainingKompas — COACH ROSTER CORE  (F10.2, MS-F10-02)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 *
 * DOEL: welke athletes ziet een coach, en welke secties per athlete. Roster
 * is GEEN globale user directory -- uitsluitend athletes met een geldige,
 * ACTIEVE coach_athlete_relationships-rij. Dit contract voegt GEEN nieuwe
 * autorisatie toe -- het bouwt voort op CoachAccessCore/coach_has_scope() en
 * de bestaande, al-correcte RLS op coach_athlete_relationships
 * (car_select_involved: een coach ziet sowieso uitsluitend eigen relaties).
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'coach_roster.v1' };

  function buildRoster(coachId, relationships) {
    if (!Array.isArray(relationships)) return [];
    return relationships
      .filter(function (r) { return r.coach_user_id === coachId && r.status === 'active'; })
      .map(function (r) { return { relationshipId: r.id, athleteId: r.athlete_user_id, since: r.consented_at || null }; });
  }

  /* athleteOverviewSections: retourneert uitsluitend de secties die de coach
   * voor DEZE athlete mag zien -- een sectie zonder toestemming ontbreekt
   * volledig uit de array, geen "vergrendeld"-kaart met een hint. */
  function athleteOverviewSections(coachId, athleteId, relationships, scopeRows, CoachAccessCoreRef) {
    var CAC = CoachAccessCoreRef || ((typeof module !== 'undefined' && module.exports) ? require('./coachAccess.js') : global.CoachAccessCore);
    var sections = [];
    if (CAC.canViewTrainingCore(coachId, athleteId, relationships, scopeRows)) sections.push('TRAINING_CORE');
    if (CAC.canViewRecoveryHealth(coachId, athleteId, relationships, scopeRows)) sections.push('RECOVERY_HEALTH');
    if (CAC.canViewWomensPerformance(coachId, athleteId, relationships, scopeRows)) sections.push('WOMENS_PERFORMANCE');
    return sections;
  }

  function isInRoster(coachId, athleteId, relationships) {
    return buildRoster(coachId, relationships).some(function (r) { return r.athleteId === athleteId; });
  }

  var CoachRosterCore = {
    VERSIONS: VERSIONS,
    buildRoster: buildRoster,
    athleteOverviewSections: athleteOverviewSections,
    isInRoster: isInRoster
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CoachRosterCore; }
  else { global.CoachRosterCore = CoachRosterCore; }
})(typeof window !== 'undefined' ? window : this);
