/* ==========================================================================
 * TrainingKompas — EXTERNAL DATA MODEL CORE  (Sprint 10 fundering)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen browser-opslag, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: de specifiek-benoemde canonical record-types uit de sprintopdracht
 * (ExternalConnection, SleepRecord, RecoverySignal, HeartRateSample,
 * HRVSample, WeightRecord, VO2MaxRecord, ExternalWorkout, ExternalActivity)
 * als DUNNE, TYPED wrappers bovenop de reeds bestaande, generieke
 * CommonDataCore.normalizeDataPoint() (Unified Sport & Data Architecture-
 * sprint) — GEEN nieuw, los normalisatiesysteem, om duplicated logic te
 * voorkomen (harde eis uit de sprintopdracht).
 *
 * HARDE REGEL (roadmap-principe #3): externe data is INPUT, nooit de bron van
 * waarheid. Een WHOOP Recovery-score wordt hier NIET gelijkgesteld aan
 * TrainingKompas-readiness — het blijft een los, herkenbaar gelabeld
 * RecoverySignal-record; de daadwerkelijke readiness blijft berekend door
 * DecisionCore.trainReadiness().
 * ==========================================================================*/
(function (global) {
  'use strict';

  var CommonDataCore = (typeof require === 'function') ? require('./commonData.js') : global.CommonDataCore;

  var VERSIONS = { externalModel: 'external_data_model.v1' };

  var CONNECTION_STATUSES = ['pending', 'active', 'expired', 'revoked', 'error'];
  var KNOWN_PROVIDERS = ['apple_healthkit', 'health_connect', 'garmin', 'whoop', 'strava', 'google_health', 'concept2', 'egym', 'technogym'];

  // buildExternalConnection: representatie van ÉÉN OAuth/device-koppeling.
  // Bevat NOOIT het daadwerkelijke token/secret — uitsluitend metadata over de
  // koppeling (harde eis: "geen secrets in de repository/architectuur-laag").
  function buildExternalConnection(input) {
    var i = input || {};
    return {
      version: VERSIONS.externalModel,
      athleteId: i.athleteId != null ? String(i.athleteId) : null,
      provider: KNOWN_PROVIDERS.indexOf(i.provider) !== -1 ? i.provider : null,
      status: CONNECTION_STATUSES.indexOf(i.status) !== -1 ? i.status : 'pending',
      scopes: Array.isArray(i.scopes) ? i.scopes.slice() : [],
      connectedAt: i.connectedAt != null ? String(i.connectedAt) : null,
      expiresAt: i.expiresAt != null ? String(i.expiresAt) : null,
      revokedAt: i.revokedAt != null ? String(i.revokedAt) : null
      // BEWUST GEEN accessToken/refreshToken-veld — die horen uitsluitend
      // server-side (Netlify Function env/secret store), nooit in dit model.
    };
  }

  // Typed record-constructors — elk is een dun label bovenop normalizeDataPoint(),
  // zodat provider-adapters straks één en dezelfde onderliggende normalisatie
  // hergebruiken in plaats van elk hun eigen vorm te verzinnen.
  function heartRateSample(raw) { return typedRecord(raw, 'heart_rate', 'heart_rate'); }
  function hrvSample(raw) { return typedRecord(raw, 'hrv', 'hrv'); }
  function weightRecord(raw) { return typedRecord(raw, 'load', 'weight'); }
  function vo2MaxRecord(raw) { return typedRecord(raw, 'vo2max', 'vo2max'); }

  // typedRecord: dwingt de juiste canonical metric af (overschrijft raw.metric
  // indien nodig) en normaliseert daarna via de bestaande, geteste
  // CommonDataCore.normalizeDataPoint() — GEEN eigen validatielogica hier.
  function typedRecord(raw, expectedMetric, recordTypeLabel) {
    if (!raw || typeof raw !== 'object') return null;
    var point = CommonDataCore.normalizeDataPoint(Object.assign({}, raw, { metric: expectedMetric }));
    if (!point) return null;
    return Object.assign({}, point, { recordType: recordTypeLabel });
  }

  // sleepRecord: sleep heeft meerdere dimensies (duur + eventueel stadia) —
  // vandaar een breder object dan de andere, enkelvoudige metrics.
  // stages (optioneel): { awakeSeconds, remSeconds, coreSeconds, deepSeconds }
  // Alleen HealthKit (watchOS9+) en Health Connect leveren stadia; andere
  // providers leveren mogelijk alleen totale duur — daarom is stages optioneel.
  function sleepRecord(raw, stages) {
    var point = CommonDataCore.normalizeDataPoint(Object.assign({}, raw, { metric: 'sleep' }));
    if (!point) return null;
    return Object.assign({}, point, {
      recordType: 'sleep',
      stages: stages && typeof stages === 'object' ? {
        awakeSeconds: stages.awakeSeconds != null ? Number(stages.awakeSeconds) : null,
        remSeconds: stages.remSeconds != null ? Number(stages.remSeconds) : null,
        coreSeconds: stages.coreSeconds != null ? Number(stages.coreSeconds) : null,
        deepSeconds: stages.deepSeconds != null ? Number(stages.deepSeconds) : null
      } : null
    });
  }

  // recoverySignal: EXPLICIET geen TrainingKompas-readiness. Provider-eigen
  // recovery/readiness-scores (WHOOP Recovery, Garmin Body Battery) komen
  // hier binnen als los, herkenbaar gelabeld signaal — input voor
  // DecisionCore, nooit een vervanging van DecisionCore.trainReadiness().
  function recoverySignal(input) {
    var i = input || {};
    if (!i.provider || i.value == null || !i.timestamp) return null;
    return {
      version: VERSIONS.externalModel,
      recordType: 'recovery_signal',
      provider: i.provider,
      providerScoreLabel: i.providerScoreLabel != null ? String(i.providerScoreLabel) : 'recovery',  // bv. "WHOOP Recovery", "Garmin Body Battery"
      value: Number(i.value),
      scaleMin: i.scaleMin != null ? Number(i.scaleMin) : null,
      scaleMax: i.scaleMax != null ? Number(i.scaleMax) : null,
      timestamp: String(i.timestamp),
      isTrainingKompasReadiness: false  // hard-coded false: dit signaal IS NOOIT de TK-readiness zelf
    };
  }

  // externalWorkout / externalActivity: hoger-niveau records (een hele sessie,
  // i.p.v. één sample) — bouwen op groupByWindow() uit CommonDataCore om losse
  // samples (HR/power/cadence) bij dezelfde sessie te clusteren.
  function externalWorkout(input, relatedSamples) {
    var i = input || {};
    if (!i.provider || !i.startTimestamp) return null;
    return {
      version: VERSIONS.externalModel,
      recordType: 'external_workout',
      provider: i.provider,
      externalId: i.externalId != null ? String(i.externalId) : null,
      athleteId: i.athleteId != null ? String(i.athleteId) : null,
      sportType: i.sportType != null ? String(i.sportType) : null,
      startTimestamp: String(i.startTimestamp),
      durationSeconds: i.durationSeconds != null ? Number(i.durationSeconds) : null,
      distanceMeters: i.distanceMeters != null ? Number(i.distanceMeters) : null,
      samples: CommonDataCore.mergeDataPoints(relatedSamples || [])
    };
  }

  var ExternalDataModelCore = {
    CONNECTION_STATUSES: CONNECTION_STATUSES,
    KNOWN_PROVIDERS: KNOWN_PROVIDERS,
    buildExternalConnection: buildExternalConnection,
    heartRateSample: heartRateSample,
    hrvSample: hrvSample,
    weightRecord: weightRecord,
    vo2MaxRecord: vo2MaxRecord,
    sleepRecord: sleepRecord,
    recoverySignal: recoverySignal,
    externalWorkout: externalWorkout,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = ExternalDataModelCore; }
  if (global) { global.ExternalDataModelCore = ExternalDataModelCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
