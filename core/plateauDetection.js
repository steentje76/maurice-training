/* ==========================================================================
 * TrainingKompas — PLATEAU DETECTION CORE  (F7.2, MS-F7-02)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: exercise-SPECIFIEKE stagnatie-classificatie, expliciet GEEN botte
 * globale-strain-trigger. Bouwt bovenop de BESTAANDE, ongewijzigde
 * ProgressionCore.trendBy()/comparableHistory()/isNewBest() -- geen tweede,
 * gedupliceerde vergelijkingslogica.
 *
 * GEREGISTREERDE SEMANTIEK (verplicht vóór implementatie):
 *   IMPROVING            -- trendBy() rapporteert improving=true.
 *   STABLE / STAGNATION_CANDIDATE -- voldoende observaties (>= MIN_OBSERVATIONS),
 *                            geen duidelijke verbetering, MAAR nog niet over de
 *                            langere PLATEAU-drempel. Voorzichtiger label dan
 *                            PLATEAU zolang het bewijs nog beperkt is.
 *   PLATEAU              -- >= PLATEAU_OBSERVATIONS vergelijkbare exposures
 *                            ZONDER meaningful verbetering EN zonder een
 *                            nieuwe PR in die periode. Dit is de enige term
 *                            die "plateau" mag heten -- nooit op basis van
 *                            een enkele sessie.
 *   TEMPORARY_REGRESSION -- duidelijk dalende trend maar met minder dan
 *                            PLATEAU_OBSERVATIONS -- te vroeg om "plateau" te
 *                            noemen, kan een tijdelijke dip zijn.
 *   INSUFFICIENT_DATA    -- minder dan MIN_OBSERVATIONS vergelijkbare
 *                            observaties. Nooit een classificatie fabriceren.
 *
 * Nooit "plateau" op basis van 1 mislukte set/lage e1RM/hoge RPE/gemiste
 * training -- afgedwongen door de harde drempels hieronder.
 *
 * Geen opaque gewogen "plateau-score" -- transparante, inspecteerbare regels.
 * Geen Decision-output ("neem een deload") -- expliciet buiten scope; dat
 * hoort, indien ooit gebouwd, in een apart geregistreerde Decision Rule.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'plateau_detection.v1' };
  var MIN_OBSERVATIONS = 4;
  var PLATEAU_OBSERVATIONS = 6;
  var STABLE_REL_THRESHOLD = 0.01;

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  function classify(history, key, field, dir, ProgressionCore) {
    if (!ProgressionCore || typeof ProgressionCore.trendBy !== 'function' || typeof ProgressionCore.comparableHistory !== 'function') {
      return { schema: VERSIONS.schema, status: 'invalid', reason: 'progression_core_missing' };
    }
    var comp = ProgressionCore.comparableHistory(history, key, null).filter(function (p) { return isNum(p[field]); });
    var n = comp.length;
    var basis = {
      schema: VERSIONS.schema, key: key, field: field, dir: dir,
      observation_count: n, min_observations: MIN_OBSERVATIONS,
      plateau_observations: PLATEAU_OBSERVATIONS
    };
    if (n < MIN_OBSERVATIONS) {
      return Object.assign({}, basis, { status: 'valid', state: 'INSUFFICIENT_DATA', has_recent_pr: null });
    }
    var trend = ProgressionCore.trendBy(history, key, field, dir, MIN_OBSERVATIONS);
    if (trend.status !== 'trend') {
      return Object.assign({}, basis, { status: 'valid', state: 'INSUFFICIENT_DATA', has_recent_pr: null });
    }
    var relStep = (trend.first !== 0) ? Math.abs(trend.avgStep / trend.first) : (trend.avgStep === 0 ? 0 : 1);
    var laatste = comp[comp.length - 1];
    var eerdereHistorie = comp.slice(0, comp.length - 1);
    var hasRecentPr = ProgressionCore.isNewBest(eerdereHistorie, key, laatste, field, dir);

    // Stabiliteitsdrempel EERST toetsen: een verwaarloosbare stap (bv. avgStep=0.2 op schaal 100)
    // mag nooit als "IMPROVING" gelden alleen omdat trendBy() een niet-exact-nul avgStep>0 zag --
    // trendBy() kent de relatieve schaal niet, deze module wel.
    if (relStep <= STABLE_REL_THRESHOLD) {
      if (n >= PLATEAU_OBSERVATIONS && !hasRecentPr) {
        return Object.assign({}, basis, { status: 'valid', state: 'PLATEAU', has_recent_pr: false, avg_step: trend.avgStep });
      }
      return Object.assign({}, basis, { status: 'valid', state: 'STAGNATION_CANDIDATE', has_recent_pr: hasRecentPr, avg_step: trend.avgStep });
    }
    if (trend.improving === true) {
      return Object.assign({}, basis, { status: 'valid', state: 'IMPROVING', has_recent_pr: hasRecentPr, avg_step: trend.avgStep });
    }
    if (n >= PLATEAU_OBSERVATIONS && !hasRecentPr) {
      return Object.assign({}, basis, { status: 'valid', state: 'PLATEAU', has_recent_pr: false, avg_step: trend.avgStep });
    }
    return Object.assign({}, basis, { status: 'valid', state: 'TEMPORARY_REGRESSION', has_recent_pr: hasRecentPr, avg_step: trend.avgStep });
  }

  var PlateauDetectionCore = {
    classify: classify,
    MIN_OBSERVATIONS: MIN_OBSERVATIONS,
    PLATEAU_OBSERVATIONS: PLATEAU_OBSERVATIONS,
    STABLE_REL_THRESHOLD: STABLE_REL_THRESHOLD,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = PlateauDetectionCore; }
  else { global.PlateauDetectionCore = PlateauDetectionCore; }
})(typeof window !== 'undefined' ? window : this);
