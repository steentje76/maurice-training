/* ==========================================================================
 * TrainingKompas — DAILY ACTIVITY CALCULATION CORE
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * Devices/Wearables Master Sprint — sectie 4/5/7 van de opdracht: dagelijkse
 * activiteit (stappen) mag geen los dashboardgetal blijven, maar moet via een
 * geregistreerde, deterministische Calculation Registry-entry beschikbaar
 * worden voor de Context Engine. Vergelijkt uitsluitend met de EIGEN
 * historische activiteit van de sporter (personal baseline) -- nooit een
 * bevolkingsnorm, nooit een vaste "20.000 stappen = rood"-grens (sectie 5,
 * expliciet verboden).
 *
 * AI-BOUNDARY: AI mag de uitkomst van deze module UITLEGGEN (bijvoorbeeld:
 * "Je activiteit lag gisteren duidelijk boven je gebruikelijke niveau"),
 * maar NOOIT zelf een baseline/afwijking herberekenen, en NOOIT causale
 * claims toevoegen ("...daarom moet je vandaag minder trainen") -- die
 * beslissing hoort bij een expliciete Decision Engine-regel, die hier
 * bewust NIET wordt gebouwd (sectie 8: onvoldoende evidence voor een
 * automatische trainingsaanpassing op basis van dagelijkse stappen alleen).
 *
 * EVIDENCE LEVEL E (technisch/afgeleid, geen zelfstandige wetenschappelijke
 * claim) -- zelfde niveau als de bestaande Consistency-indicator elders in
 * de codebase. Mediaan i.p.v. gemiddelde als baseline: robuust tegen
 * incidentele extreme dagen (een enkele marathon of ziektedag trekt een
 * gemiddelde sterk scheef, een mediaan nauwelijks).
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { baseline: 'daily_steps_baseline.v1', deviation: 'daily_steps_deviation.v1' };

  var CALCULATION_REGISTRY = [
    {
      calculation_id: 'daily_steps_baseline.v1',
      domain: 'DAILY_ACTIVITY',
      name: 'Persoonlijke stappen-baseline (rolling mediaan)',
      version: 1,
      formula: 'baseline = mediaan(dagelijkse stappen over de laatste N bekende dagen, exclusief de doeldag zelf)',
      inputs: ['recentDailySteps (array van {date, steps}, alleen dagen met een BEKENDE (niet-null) stappenwaarde)', 'windowDays (optioneel, default 28)'],
      outputs: ['baselineSteps', 'sampleSize'],
      units: { activity: 'stappen/dag' },
      supported_sports: 'n.v.t. (dagelijkse context, geen trainingsmetric)',
      minimum_data: ['minimaal 7 dagen met een bekende stappenwaarde binnen het venster'],
      evidence_level: 'E',
      sources: [],
      limitations: [
        'Een korte trackinggeschiedenis (net onder de 7-dagen-drempel) levert INSUFFICIENT_DATA op -- geen baseline op te weinig dagen.',
        'Dagen zonder trackerdata (UNKNOWN) tellen niet mee als "0 stappen" en beïnvloeden de mediaan niet -- ontbrekende data wordt nooit als lage activiteit geteld.',
        'De baseline verandert vanzelf mee met echte, aanhoudende gedragsverandering (rolling window) -- geen vaste, verouderde referentie.'
      ],
      applicability: 'Uitsluitend een technische referentiewaarde voor de EIGEN historische activiteit -- geen bevolkingsnorm, geen gezondheidsadvies.',
      forbidden_interpretations: ['dit is een medisch aanbevolen dagelijks stappendoel', 'afwijking van deze baseline is een gezondheidsrisico'],
      allowed_decision_use: false,
      allowed_ai_use: true,
      user_visible_values: true
    },
    {
      calculation_id: 'daily_steps_deviation.v1',
      domain: 'DAILY_ACTIVITY',
      name: 'Afwijking van persoonlijke stappen-baseline',
      version: 1,
      formula: 'afwijking_% = (stappen_vandaag - baseline) / baseline * 100; classificatie op basis van vaste, technische drempelwaarden op dat percentage',
      inputs: ['todaySteps (bekende stappenwaarde van de te beoordelen dag)', 'baselineSteps (output van daily_steps_baseline.v1)'],
      outputs: ['deviationPercent', 'classification (well_below_baseline | below_baseline | within_baseline | above_baseline | well_above_baseline)'],
      units: { activity: 'stappen/dag', deviation: '%' },
      supported_sports: 'n.v.t.',
      minimum_data: ['todaySteps', 'baselineSteps (status OK)'],
      evidence_level: 'E',
      sources: [],
      limitations: [
        'De drempelwaarden (±30%/±75%) zijn technische, productmatige keuzes voor een leesbare classificatie -- geen gevalideerde klinische afkapwaarden.',
        'Zegt niets over herstel, vermoeidheid, blessurerisico of trainingskwaliteit -- uitsluitend een beschrijving van activiteitsvolume t.o.v. het eigen gebruikelijke niveau.'
      ],
      applicability: 'Contextsignaal voor de Context Engine -- nooit rechtstreeks een trainingsregel of gezondheidsclaim.',
      forbidden_interpretations: [
        'above_baseline betekent vermoeidheid of slecht herstel',
        'below_baseline betekent een geslaagde rustdag',
        'deze classificatie voorspelt blessurerisico'
      ],
      allowed_decision_use: false,
      allowed_ai_use: true,
      user_visible_values: true
    }
  ];

  function isFiniteNumber(v) { return typeof v === 'number' && isFinite(v); }
  function median(sortedAsc) {
    var n = sortedAsc.length;
    if (n === 0) return null;
    var mid = Math.floor(n / 2);
    return (n % 2 !== 0) ? sortedAsc[mid] : (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;
  }

  var MIN_SAMPLE_DAYS = 7;
  var DEFAULT_WINDOW_DAYS = 28;

  /**
   * dailyStepsBaseline(recentDailySteps, opts) -> pure, deterministisch.
   * recentDailySteps: array van {date:'YYYY-MM-DD', steps:number}. Dagen met
   * steps==null/undefined horen hier NIET in te zitten (UNKNOWN != ZERO,
   * sectie 3 van de opdracht) -- de aanroeper filtert die eruit vóórdat deze
   * functie wordt aangeroepen; deze functie zelf filtert defensief nogmaals.
   */
  function dailyStepsBaseline(recentDailySteps, opts) {
    opts = opts || {};
    var windowDays = isFiniteNumber(opts.windowDays) && opts.windowDays > 0 ? opts.windowDays : DEFAULT_WINDOW_DAYS;
    var known = (recentDailySteps || [])
      .filter(function (d) { return d && isFiniteNumber(d.steps) && d.steps >= 0; })
      .slice(-windowDays); // laatste N bekende dagen (aanroeper levert al chronologisch gesorteerd aan)

    if (known.length < MIN_SAMPLE_DAYS) {
      return { status: 'INSUFFICIENT_DATA', schema: VERSIONS.baseline, reason: 'minder dan ' + MIN_SAMPLE_DAYS + ' dagen met een bekende stappenwaarde', sampleSize: known.length };
    }

    var values = known.map(function (d) { return d.steps; }).sort(function (a, b) { return a - b; });
    var baseline = median(values);

    return { status: 'OK', schema: VERSIONS.baseline, baselineSteps: Math.round(baseline), sampleSize: known.length };
  }

  /**
   * dailyStepsDeviation(todaySteps, baselineResult) -> pure, deterministisch.
   * baselineResult: de output van dailyStepsBaseline() (of een object met
   * status:'OK'/baselineSteps in datzelfde formaat).
   */
  function dailyStepsDeviation(todaySteps, baselineResult) {
    if (!isFiniteNumber(todaySteps) || todaySteps < 0) {
      return { status: 'INSUFFICIENT_INPUT', schema: VERSIONS.deviation, reason: 'todaySteps ontbreekt of is geen geldig getal (UNKNOWN != ZERO -- niet aannemen dat dit 0 betekent)' };
    }
    if (!baselineResult || baselineResult.status !== 'OK' || !isFiniteNumber(baselineResult.baselineSteps) || baselineResult.baselineSteps <= 0) {
      return { status: 'NO_BASELINE', schema: VERSIONS.deviation, reason: 'geen geldige baseline beschikbaar' };
    }

    var baseline = baselineResult.baselineSteps;
    var deviationPercent = Math.round(((todaySteps - baseline) / baseline) * 1000) / 10; // 1 decimaal

    var classification;
    if (deviationPercent >= 75) classification = 'well_above_baseline';
    else if (deviationPercent >= 30) classification = 'above_baseline';
    else if (deviationPercent <= -75) classification = 'well_below_baseline';
    else if (deviationPercent <= -30) classification = 'below_baseline';
    else classification = 'within_baseline';

    return {
      status: 'OK', schema: VERSIONS.deviation,
      todaySteps: todaySteps, baselineSteps: baseline,
      deviationPercent: deviationPercent, classification: classification
    };
  }

  // Toegestane, sectie-19-conforme athlete-facing tekst per classificatie --
  // uitsluitend beschrijvend, nooit causaal (sectie 8 van de opdracht: geen
  // fake causaliteit, geen "daarom moet je..."-claim).
  var CONTEXT_TEXT = {
    well_above_baseline: 'Je activiteit lag duidelijk boven je gebruikelijke niveau. Dat kan relevante context zijn bij het beoordelen van je training.',
    above_baseline: 'Je activiteit lag boven je gebruikelijke niveau.',
    within_baseline: 'Je activiteit lag rond je gebruikelijke niveau.',
    below_baseline: 'Je activiteit lag onder je gebruikelijke niveau.',
    well_below_baseline: 'Je activiteit lag duidelijk onder je gebruikelijke niveau. Dat kan relevante context zijn bij het beoordelen van je training.'
  };
  function contextText(deviationResult) {
    if (!deviationResult || deviationResult.status !== 'OK') return null;
    return CONTEXT_TEXT[deviationResult.classification] || null;
  }

  var DailyActivityCalculationCore = {
    VERSIONS: VERSIONS,
    CALCULATION_REGISTRY: CALCULATION_REGISTRY,
    dailyStepsBaseline: dailyStepsBaseline,
    dailyStepsDeviation: dailyStepsDeviation,
    contextText: contextText
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = DailyActivityCalculationCore; }
  else { global.DailyActivityCalculationCore = DailyActivityCalculationCore; }
})(typeof self !== 'undefined' ? self : this);
