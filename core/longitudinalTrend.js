/* ==========================================================================
 * TrainingKompas — LONGITUDINAL TREND CORE  (F7.1, MS-F7-01)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: het "unified longitudinal trend layer"-contract (MS-F7-01-acceptance
 * gate) FORMALISEREN, niet een nieuwe berekeningsengine bouwen. TK heeft al
 * twee, legitiem verschillende, bestaande trendmethoden:
 *   - ProgressionCore.trendBy(): context-identity-gebonden (bv. exercise_id),
 *     stap-gebaseerde vergelijking. Geschikt voor prestatiematen (e1RM, pace,
 *     vermogen, split) waar identiteit/vergelijkbaarheid cruciaal is.
 *   - CalcCore.trendClassify(): ongefilterde dagreeks, eerste-helft/tweede-
 *     helft-gemiddelde-vergelijking. Geschikt voor dagelijkse gezondheids-
 *     metrics (HRV/RHR/slaap) zonder aparte identity-context.
 *
 * Deze module BLIJFT BEIDE bronnen ONGEWIJZIGD gebruiken (geen dubbele
 * berekeningslogica, geen herschrijving) en biedt uitsluitend een dunne,
 * gedeelde NORMALISATIE naar één canoniek outputschema. "Unified" betekent
 * hier: één gedeeld OUTPUTCONTRACT, niet één rekenformule.
 *
 * Canoniek schema (longitudinal_trend.v1):
 *   { schema, status, metric, domain, context, direction,
 *     observation_count, time_window, latest, baseline, magnitude,
 *     confidence, calculation_version, source_note }
 *
 * status: 'trend' | 'insufficient_data'
 * direction: 'improving' | 'stable' | 'declining' | 'insufficient_data'
 *   (NOOIT hardcoded "hoger=beter" -- de caller geeft de metric-semantiek mee)
 * confidence: 'hoog' | 'middel' | 'laag' -- afgeleid van observation_count.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'longitudinal_trend.v1' };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  function confidenceFromCount(n, minN) {
    if (!isNum(n) || !isNum(minN) || n < minN) return 'laag';
    if (n >= minN * 2) return 'hoog';
    return 'middel';
  }

  function fromTrendBy(raw, metric, domain, context, minN) {
    var r = raw || {};
    var basis = {
      schema: VERSIONS.schema, metric: metric || null, domain: domain || null,
      context: context || null, calculation_version: 'progression_trend.v1',
      time_window: null, source_note: 'ProgressionCore.trendBy() (identity-gebonden)'
    };
    if (r.status !== 'trend') {
      return Object.assign({}, basis, {
        status: 'insufficient_data', direction: 'insufficient_data',
        observation_count: (typeof r.n === 'number') ? r.n : 0,
        latest: null, baseline: null, magnitude: null, confidence: 'laag'
      });
    }
    var direction = (r.improving === true) ? 'improving' : (r.improving === false) ? 'declining' : 'stable';
    return Object.assign({}, basis, {
      status: 'trend', direction: direction, observation_count: r.n,
      latest: isNum(r.last) ? r.last : null, baseline: isNum(r.first) ? r.first : null,
      magnitude: isNum(r.avgStep) ? r.avgStep : null,
      confidence: confidenceFromCount(r.n, minN || 3)
    });
  }

  function fromTrendClassify(raw, metric, domain, context) {
    var r = raw || {};
    var basis = {
      schema: VERSIONS.schema, metric: metric || null, domain: domain || null,
      context: context || null, calculation_version: (r.versie || 'calc_trend.v1'),
      time_window: null, source_note: 'CalcCore.trendClassify() (dagreeks, geen identity-context)'
    };
    if (r.richting === 'onvoldoende_data' || r.richting == null) {
      return Object.assign({}, basis, {
        status: 'insufficient_data', direction: 'insufficient_data',
        observation_count: (typeof r.n === 'number') ? r.n : 0,
        latest: null, baseline: null, magnitude: null, confidence: 'laag'
      });
    }
    var directionMap = { stijgend: 'improving', dalend: 'declining', stabiel: 'stable' };
    var direction = directionMap[r.richting] || 'insufficient_data';
    return Object.assign({}, basis, {
      status: 'trend', direction: direction, observation_count: r.n,
      latest: isNum(r.tweede) ? r.tweede : null, baseline: isNum(r.eerste) ? r.eerste : null,
      magnitude: isNum(r.delta) ? r.delta : null,
      confidence: confidenceFromCount(r.n, r.minimum || 2)
    });
  }

  var LongitudinalTrendCore = {
    fromTrendBy: fromTrendBy,
    fromTrendClassify: fromTrendClassify,
    confidenceFromCount: confidenceFromCount,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = LongitudinalTrendCore; }
  else { global.LongitudinalTrendCore = LongitudinalTrendCore; }
})(typeof window !== 'undefined' ? window : this);
