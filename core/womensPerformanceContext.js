/* ==========================================================================
 * TrainingKompas — WOMEN'S PERFORMANCE CONTEXT CORE  (F8.3, MS-F8-03)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: het ENIGE, canonieke women_performance_context.v1-contract dat de
 * AI-coach mag ontvangen. Herbruikt UITSLUITEND de bestaande, ongewijzigde
 * CycleCore.cycleContext()/symptomPatternSummary() -- geen nieuwe cyclus-
 * berekeningslogica. Deze module is een WHITELIST-FILTER: hij bepaalt exact
 * welke velden de AI wel/niet ziet, en labelt elk veld expliciet als
 * 'athlete_reported' of 'derived_estimate'.
 *
 * MS-F8-01-BESLISSING: uitsluitend Cycle en Symptoms zijn IMPLEMENT.
 * Contraceptie/zwangerschap-postpartum/perimenopauze-menopauze-bekkenbodem
 * blijven DEFER -- dit contract bevat daar dan ook GEEN velden voor.
 *
 * HARDE GRENZEN: geen fertility/ovulatie-met-zekerheid, geen hormoonwaarden,
 * geen diagnose. Als trackingBeschikbaar=false of enabled=false: het object
 * bevat uitsluitend { enabled:false } -- geen ander veld.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'women_performance_context.v1' };

  function build(enabled, cycleCtx, recentSymptoms) {
    if (!enabled || !cycleCtx || !cycleCtx.trackingBeschikbaar) {
      return { schema: VERSIONS.schema, enabled: false };
    }
    var laatsteSymptomen = null;
    if (Array.isArray(recentSymptoms) && recentSymptoms.length) {
      var laatste = recentSymptoms[0];
      if (laatste && laatste.symptoms && Object.keys(laatste.symptoms).length) {
        laatsteSymptomen = { provenance: 'athlete_reported', date: laatste.log_date, severity: laatste.symptoms };
      }
    }
    return {
      schema: VERSIONS.schema,
      enabled: true,
      cycle: {
        provenance: 'derived_estimate',
        cyclus_dag: cycleCtx.cyclusDag,
        geschatte_fase: cycleCtx.geschatteFase,
        voldoende_data_voor_voorspelling: cycleCtx.voldoendeDataVoorVoorspelling,
        geschatte_volgende_periode: cycleCtx.voldoendeDataVoorVoorspelling ? cycleCtx.geschatteVolgendePeriode : null
      },
      recent_symptoms: laatsteSymptomen,
      limitations: 'Cyclusdag en fase zijn een schatting op basis van zelf-gerapporteerde periodedatums, geen meting. Symptomen zijn zelf-gerapporteerd, geen diagnose.',
      forbidden_ai_use: 'Geen hormoonclaims, geen fertility/ovulatie-met-zekerheid, geen automatische trainingsaanpassing, geen causale taal.'
    };
  }

  var WomensPerformanceContextCore = { build: build, VERSIONS: VERSIONS };

  if (typeof module !== 'undefined' && module.exports) { module.exports = WomensPerformanceContextCore; }
  else { global.WomensPerformanceContextCore = WomensPerformanceContextCore; }
})(typeof window !== 'undefined' ? window : this);
