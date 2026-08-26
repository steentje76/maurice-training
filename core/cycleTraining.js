/* ==========================================================================
 * TrainingKompas — CYCLE-TRAINING CORRELATION  (cycleTraining.v1)
 * --------------------------------------------------------------------------
 * WOMEN'S PERFORMANCE BLUEPRINT — Fase 2 (cyclus <-> training). Combineert
 * uitsluitend RAW DATA die al bestaat (cycle_periods + sessions.rpe/
 * duration_s) tot FEITELIJKE tellingen/gemiddelden. Geen enkele causaliteits-
 * claim, geen "je hormonen...", geen "in fase X moet je...". De gebruiker
 * interpreteert zelf.
 *
 * HARDE GRENZEN
 * - Nooit een gemiddelde tonen op basis van <3 sessies in een emmer (bucket).
 * - Nooit een fase-vergelijking tonen op basis van <3 gelogde cycli
 *   (CycleCore's eigen MIN_CYCLI_VOOR_PATROON-drempel, hergebruikt).
 * - Puur en deterministisch. Geen Date.now(), geen netwerk, geen DOM.
 * ========================================================================== */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(typeof require === 'function' ? require('./cycle.js') : root.CycleCore);
  } else {
    root.CycleTrainingCore = factory(root.CycleCore);
  }
})(typeof self !== 'undefined' ? self : this, function (CycleCore) {
  'use strict';

  var VERSIE = 'cycleTraining.v1';
  var MIN_SESSIES_PER_EMMER = 3;

  /* ── training_count_by_phase.v1 ───────────────────────────────────────────
   * Telt sessies per geschatte cyclusfase. sessions: [{date, ...}]. Geeft per
   * fase het AANTAL sessies -- puur feitelijk, geen gemiddelde/interpretatie. */
  function trainingCountByPhase(periods, sessions) {
    var tellingen = { menstruatie: 0, folliculair: 0, ovulatie: 0, luteaal: 0, onbekend: 0 };
    (sessions || []).forEach(function (s) {
      if (!s || !s.date) return;
      var dag = CycleCore.cycleDay(periods, s.date);
      var gemLengte = CycleCore.averageCycleLength(periods);
      var fase = CycleCore.estimatedPhaseFromDay(dag, gemLengte);
      tellingen[fase || 'onbekend']++;
    });
    return tellingen;
  }

  /* ── average_metric_by_phase.v1 ───────────────────────────────────────────
   * Gemiddelde van een numeriek sessieveld (bv. 'rpe', 'duration_s') per
   * geschatte cyclusfase. Toont een fase UITSLUITEND als er >=3 sessies met
   * een gevulde waarde voor die fase zijn -- anders wordt die fase simpelweg
   * weggelaten uit het resultaat (nooit een gemiddelde op 1-2 datapunten). */
  function averageMetricByPhase(periods, sessions, metricKey) {
    var perFase = {};
    (sessions || []).forEach(function (s) {
      if (!s || !s.date || s[metricKey] == null) return;
      var dag = CycleCore.cycleDay(periods, s.date);
      var gemLengte = CycleCore.averageCycleLength(periods);
      var fase = CycleCore.estimatedPhaseFromDay(dag, gemLengte);
      if (!fase) return;
      if (!perFase[fase]) perFase[fase] = [];
      perFase[fase].push(s[metricKey]);
    });
    var resultaat = {};
    Object.keys(perFase).forEach(function (fase) {
      var waarden = perFase[fase];
      if (waarden.length < MIN_SESSIES_PER_EMMER) return;
      var som = waarden.reduce(function (a, b) { return a + b; }, 0);
      resultaat[fase] = { gemiddelde: Math.round((som / waarden.length) * 10) / 10, aantalSessies: waarden.length };
    });
    return resultaat;
  }

  /* ── training_during_menstruation.v1 ──────────────────────────────────────
   * Feitelijke telling: hoeveel van de gelogde sessies vielen op een dag
   * waarop, volgens CycleCore.cycleContext(), menstruatie actief was
   * geregistreerd. Puur telling, geen advies. */
  function trainingDuringMenstruation(periods, sessions) {
    var lijst = (sessions || []).filter(function (s) { return s && s.date; });
    var actiefAantal = 0;
    lijst.forEach(function (s) {
      var ctx = CycleCore.cycleContext(periods, s.date);
      if (ctx.menstruatieActief) actiefAantal++;
    });
    return { totaalSessies: lijst.length, tijdensMenstruatie: actiefAantal };
  }

  /* ── cycle_training_summary.v1 ────────────────────────────────────────────
   * ÉÉN samengesteld resultaat voor het dashboard. Bevat uitsluitend
   * onderdelen waarvoor daadwerkelijk voldoende data bestaat; de UI-laag
   * bepaalt zelf de weergavetekst, deze functie levert alleen getallen. */
  function cycleTrainingSummary(periods, sessions) {
    var gemLengte = CycleCore.averageCycleLength(periods);
    var voldoendeCycli = gemLengte != null;
    return {
      versie: VERSIE,
      voldoendeCycliVoorFaseVergelijking: voldoendeCycli,
      aantalPerFase: voldoendeCycli ? trainingCountByPhase(periods, sessions) : null,
      gemiddeldeRpePerFase: voldoendeCycli ? averageMetricByPhase(periods, sessions, 'rpe') : {},
      gemiddeldeDuurPerFase: voldoendeCycli ? averageMetricByPhase(periods, sessions, 'duration_s') : {},
      menstruatieEnTraining: trainingDuringMenstruation(periods, sessions)
    };
  }

  return {
    versie: VERSIE,
    trainingCountByPhase: trainingCountByPhase,
    averageMetricByPhase: averageMetricByPhase,
    trainingDuringMenstruation: trainingDuringMenstruation,
    cycleTrainingSummary: cycleTrainingSummary
  };
});
