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
    var geldigeSessies = (sessions || []).filter(function (s) { return s && s.date; });
    var datums = geldigeSessies.map(function (s) { return s.date; }).sort();
    return {
      versie: VERSIE,
      voldoendeCycliVoorFaseVergelijking: voldoendeCycli,
      aantalPerFase: voldoendeCycli ? trainingCountByPhase(periods, sessions) : null,
      gemiddeldeRpePerFase: voldoendeCycli ? averageMetricByPhase(periods, sessions, 'rpe') : {},
      gemiddeldeDuurPerFase: voldoendeCycli ? averageMetricByPhase(periods, sessions, 'duration_s') : {},
      menstruatieEnTraining: trainingDuringMenstruation(periods, sessions),
      // FASE 3 (Advanced Insights) -- expliciete transparantie-velden, zodat de UI
      // altijd exact kan tonen "gebaseerd op X trainingen en Y cycli", i.p.v. dit
      // apart te moeten herberekenen (en daarmee mogelijk te laten afwijken).
      aantalGebruikteTrainingen: geldigeSessies.length,
      aantalGeregistreerdeCycli: CycleCore.normalizePeriods(periods).length,
      datumbereik: datums.length ? { van: datums[0], tot: datums[datums.length - 1] } : null
    };
  }

  /* ── training_trend_per_cycle.v1 ──────────────────────────────────────────
   * FASE 3 (Advanced Insights, blueprint sectie 7-D) — HISTORISCHE trend per
   * AFGERONDE, individuele cyclus (niet per fase-emmer over alle cycli heen).
   * Een cyclus is "afgerond" wanneer er een VOLGENDE periode is gelogd die
   * het einde ervan afbakent -- de huidige, nog lopende cyclus (na de laatst
   * gelogde periode) wordt NOOIT meegeteld, om extrapolatie/voorspelling te
   * vermijden (uitsluitend geregistreerde geschiedenis, geen toekomst).
   * Retourneert een array, chronologisch, één item per afgeronde cyclus:
   * { cyclusNummer, startDatum, eindDatum, aantalTrainingen, gemiddeldeRpe,
   *   gemiddeldeDuur }. Elk gemiddelde volgt dezelfde MIN_SESSIES_PER_EMMER-
   * drempel als averageMetricByPhase() -- ontbreekt data, dan blijft het veld
   * expliciet null i.p.v. een schijnbaar gemiddelde te tonen. */
  function trainingTrendPerCycle(periods, sessions) {
    var norm = CycleCore.normalizePeriods(periods);
    if (norm.length < 2) return []; // geen enkele AFGERONDE cyclus mogelijk met <2 periodes
    var geldigeSessies = (sessions || []).filter(function (s) { return s && s.date; });
    var resultaat = [];
    for (var i = 0; i < norm.length - 1; i++) {
      var start = norm[i].start_date;
      var eind = norm[i + 1].start_date; // exclusief: de volgende cyclus begint hier
      var sessiesInCyclus = geldigeSessies.filter(function (s) {
        return s.date >= start && s.date < eind;
      });
      var rpeWaarden = sessiesInCyclus.filter(function (s) { return s.rpe != null; }).map(function (s) { return s.rpe; });
      var duurWaarden = sessiesInCyclus.filter(function (s) { return s.duration_s != null; }).map(function (s) { return s.duration_s; });
      resultaat.push({
        cyclusNummer: i + 1,
        startDatum: start,
        eindDatum: eind,
        aantalTrainingen: sessiesInCyclus.length,
        gemiddeldeRpe: rpeWaarden.length >= MIN_SESSIES_PER_EMMER
          ? Math.round((rpeWaarden.reduce(function (a, b) { return a + b; }, 0) / rpeWaarden.length) * 10) / 10 : null,
        gemiddeldeDuur: duurWaarden.length >= MIN_SESSIES_PER_EMMER
          ? Math.round(duurWaarden.reduce(function (a, b) { return a + b; }, 0) / duurWaarden.length) : null
      });
    }
    return resultaat;
  }

  /* ── symptom_training_overlap.v1 ──────────────────────────────────────────
   * FASE 3 (Advanced Insights, blueprint sectie 7-E) — feitelijke, neutrale
   * telling: op hoeveel van de dagen waarop `symptomKey` is geregistreerd,
   * is OOK een training gelogd. GEEN causaliteit, GEEN "dit symptoom
   * beïnvloedt je training" -- uitsluitend "op X van de Y dagen met dit
   * symptoom is een training geregistreerd". Drempel: minimaal 3 dagen met
   * dit symptoom gelogd, anders expliciet onvoldoendeData:true (nooit een
   * telling tonen op 1-2 datapunten). */
  var MIN_SYMPTOOM_DAGEN = 3;
  function symptomTrainingOverlap(symptomLogs, sessions, symptomKey) {
    var symptoomDagen = (symptomLogs || [])
      .filter(function (l) { return l && l.log_date && l.symptoms && l.symptoms[symptomKey] != null; })
      .map(function (l) { return l.log_date; });
    if (symptoomDagen.length < MIN_SYMPTOOM_DAGEN) {
      return { onvoldoendeData: true, aantalDagenMetSymptoom: symptoomDagen.length };
    }
    var trainingsDagen = {};
    (sessions || []).forEach(function (s) { if (s && s.date) trainingsDagen[s.date] = true; });
    var overlap = symptoomDagen.filter(function (d) { return trainingsDagen[d]; }).length;
    return {
      onvoldoendeData: false,
      aantalDagenMetSymptoom: symptoomDagen.length,
      aantalMetTraining: overlap
    };
  }

  return {
    versie: VERSIE,
    trainingCountByPhase: trainingCountByPhase,
    averageMetricByPhase: averageMetricByPhase,
    trainingDuringMenstruation: trainingDuringMenstruation,
    cycleTrainingSummary: cycleTrainingSummary,
    trainingTrendPerCycle: trainingTrendPerCycle,
    symptomTrainingOverlap: symptomTrainingOverlap
  };
});
