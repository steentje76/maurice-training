/* ==========================================================================
 * TrainingKompas — TEAM ANALYTICS CORE  (F11.3, MS-F11-03)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 *
 * DOEL: privacy-safe, geaggregeerde teamdashboards. Dit is EXPLICIET GEEN
 * nieuwe calculation-engine voor individuele adherence/progressie -- die
 * blijft volledig bij AdherenceIntelligenceCore (F3/F10). Deze module
 * aggregeert uitsluitend AANWEZIGHEID BIJ TEAM_EVENTS (een nieuw, apart
 * concept t.o.v. individuele trainingsadherence).
 *
 * KERNPRINCIPE (minimum-cohort-drempel): een geaggregeerd cijfer wordt
 * uitsluitend getoond wanneer het cohort groot genoeg is dat een individu
 * niet herleidbaar is uit het gemiddelde. Standaarddrempel: 5 deelnemers
 * (MIN_COHORT_SIZE). Onder de drempel: 'insufficient_data', geen cijfer,
 * geen namen, geen benaderde waarde.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'team_analytics.v1' };
  var MIN_COHORT_SIZE = 5;

  /* aggregateAttendance(records, minCohortSize?): records = [{ user_id,
   * status }], status in 'present'/'absent'/'maybe'/'no_response'. Retourneert
   * { cohort_size, status: 'ok'|'insufficient_data', present_rate? }.
   * present_rate is uitsluitend aanwezig bij 'ok'. Nooit individuele
   * user_id's in de output. */
  function aggregateAttendance(records, minCohortSize) {
    var threshold = (typeof minCohortSize === 'number' && minCohortSize > 0) ? minCohortSize : MIN_COHORT_SIZE;
    if (!Array.isArray(records)) return { cohort_size: 0, status: 'insufficient_data' };
    var cohortSize = records.length;
    if (cohortSize < threshold) {
      return { cohort_size: cohortSize, status: 'insufficient_data' };
    }
    var presentCount = records.filter(function (r) { return r && r.status === 'present'; }).length;
    return {
      cohort_size: cohortSize,
      status: 'ok',
      present_rate: Math.round((presentCount / cohortSize) * 1000) / 1000
    };
  }

  /* aggregateResponsibilitiesCompletion(records, minCohortSize?): records =
   * [{ status }], status in 'open'/'done'. Zelfde privacy-contract. */
  function aggregateResponsibilitiesCompletion(records, minCohortSize) {
    var threshold = (typeof minCohortSize === 'number' && minCohortSize > 0) ? minCohortSize : MIN_COHORT_SIZE;
    if (!Array.isArray(records)) return { cohort_size: 0, status: 'insufficient_data' };
    var cohortSize = records.length;
    if (cohortSize < threshold) {
      return { cohort_size: cohortSize, status: 'insufficient_data' };
    }
    var doneCount = records.filter(function (r) { return r && r.status === 'done'; }).length;
    return {
      cohort_size: cohortSize,
      status: 'ok',
      completion_rate: Math.round((doneCount / cohortSize) * 1000) / 1000
    };
  }

  var TeamAnalyticsCore = {
    VERSIONS: VERSIONS, MIN_COHORT_SIZE: MIN_COHORT_SIZE,
    aggregateAttendance: aggregateAttendance,
    aggregateResponsibilitiesCompletion: aggregateResponsibilitiesCompletion
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = TeamAnalyticsCore; }
  else { global.TeamAnalyticsCore = TeamAnalyticsCore; }
})(typeof window !== 'undefined' ? window : this);
