/* ==========================================================================
 * TrainingKompas — DECISION + EVIDENCE CORE  (F1.7 / F1.8)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DECISION = "wat betekent de numerieke uitkomst voor de training?" — expliciete,
 * VERSIONEERDE sportregels. AI bepaalt deze uitkomsten NOOIT; AI mag ze alleen uitleggen.
 * CONTEXT  = periodiseringsfase (phaseForWeek) — los van decision, hier meegenomen als pure regel.
 * EVIDENCE = provenance-contract: legt vast WAAROM een uitkomst ontstond (bron + versies + regel).
 *
 * Alle functies zijn 1-op-1 uit index.html geëxtraheerd (old===new). Legacy-quirks bewust behouden.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = {
    progression: 'progression.v1',
    progression_adjust: 'progression_adjust.v1',
    readiness: 'readiness.v1',
    detraining: 'detraining.v1',
    phase: 'phase.v1',
    evidence: 'evidence.v1'
  };

  // --- progression.v1 --- exact gelijk aan legacy computeProgression(rpe,curKg).
  // Legacy-semantiek 1-op-1: guard -> null; rpe<=7.5 => +2.5; <=8.5 => 0; anders -7.5.
  function computeProgression(rpe, curKg) {
    if (rpe == null || isNaN(rpe) || !curKg) return null;
    if (rpe <= 7.5) return { delta: 2.5, label: 'Verhogen' };
    if (rpe <= 8.5) return { delta: 0, label: 'Gelijk houden' };
    return { delta: -7.5, label: 'Deload' };
  }

  // --- progression_adjust.v1 --- exact gelijk aan legacy computeProgAdjustment.
  function computeProgAdjustment(factor, muscleRecoveryRows, voelt, painMuscle) {
    var laag = (muscleRecoveryRows || []).filter(function (r) { return r.pct < 70; });
    var slecht = voelt === 'slecht';
    var matig = voelt === 'matig';
    var nodig = factor < 0.97 || laag.length > 0 || slecht || matig || !!painMuscle;
    if (!nodig) return null;
    var rpeDelta = 0, setsDelta = 0;
    if (factor < 0.90 || slecht) { rpeDelta = -1.5; setsDelta = -1; }
    else if (factor < 0.97 || matig || laag.length) { rpeDelta = -0.5; }
    var redenen = [];
    if (factor < 0.97) redenen.push('herstel-dagfactor ' + factor);
    if (laag.length) redenen.push('laag spierherstel: ' + laag.map(function (r) { return r.muscle + ' ' + r.pct + '%'; }).join(', '));
    if (slecht) redenen.push('je gaf aan je slecht te voelen');
    if (matig) redenen.push('je gaf aan je matig te voelen');
    if (painMuscle) redenen.push('pijn/ongemak gemeld: ' + painMuscle);
    return { rpeDelta: rpeDelta, setsDelta: setsDelta, redenen: redenen, painMuscle: painMuscle };
  }

  // --- readiness.v1 --- exact gelijk aan legacy trainReadiness(dfInfo).
  function trainReadiness(dfInfo) {
    if (!dfInfo) return null;
    var f = dfInfo.factor;
    if (f >= 1) return { cls: 'g', txt: 'Klaar om te trainen' };
    if (f >= 0.93) return { cls: 'y', txt: 'Train op gevoel' };
    return { cls: 'r', txt: 'Houd het licht vandaag' };
  }

  // --- detraining.v1 --- exact gelijk aan legacy detrainingFactor. rules is VERPLICHT
  // (de app-wrapper houdt de `rules||DETRAINING_RULES`-default als config/orchestratie).
  function detrainingFactor(daysSinceLastExecution, rules) {
    if (daysSinceLastExecution == null || isNaN(daysSinceLastExecution)) {
      return { factor: 1.00, version: rules.version, ruleId: rules.id, band: null, days: null, applicable: false };
    }
    var d = Math.max(0, Math.floor(daysSinceLastExecution));
    var band = rules.bands[rules.bands.length - 1];
    for (var i = 0; i < rules.bands.length; i++) { if (d <= rules.bands[i].maxDays) { band = rules.bands[i]; break; } }
    return { factor: band.factor, version: rules.version, ruleId: rules.id, band: band.maxDays, days: d, applicable: band.factor < 1.00 };
  }

  // --- phase.v1 (CONTEXT) --- exact gelijk aan legacy phaseForWeek(wk,weken).
  function phaseForWeek(wk, weken) {
    if (weken <= 1) return 'Opbouw';
    if (weken <= 3) return wk === 1 ? 'Anatomische Aanpassing' : 'Kracht';
    var adaptWeeks = Math.max(1, Math.round(weken * 0.2));
    var deloadWeeks = 1;
    var hyperWeeks = Math.max(1, Math.round((weken - adaptWeeks - deloadWeeks) * 0.55));
    var strengthWeeks = Math.max(0, weken - adaptWeeks - deloadWeeks - hyperWeeks);
    if (wk <= adaptWeeks) return 'Anatomische Aanpassing';
    if (wk <= adaptWeeks + hyperWeeks) return 'Hypertrofie';
    if (wk <= adaptWeeks + hyperWeeks + strengthWeeks) return 'Kracht';
    return 'Deload / Peak';
  }

  // ===== DECISION CONTRACT (additief; verandert de legacy-uitkomst NIET) =====
  // Lichtgewicht, versioned uitkomst — bedoeld voor AI-uitleg/Evidence. AI consumeert dit,
  // maar bepaalt de waarde NOOIT. Gebouwd BOVENOP computeProgression (zelfde getallen).
  function progressionDecision(rpe, curKg) {
    var p = computeProgression(rpe, curKg);
    if (!p) return null;
    var outcome = p.delta > 0 ? 'increase' : (p.delta < 0 ? 'deload' : 'hold');
    return {
      outcome: outcome, deltaKg: p.delta, label: p.label,
      ruleId: 'progression_rpe', ruleVersion: VERSIONS.progression,
      inputs: { rpe: rpe, curKg: curKg }
    };
  }

  // ===== EVIDENCE CONTRACT (evidence.v1) =====
  // decisionRulesSnapshot(rules): reproduceert EXACT de bestaande inline snapshot-provenance
  // (F0.7M): {detraining:{id,version}} of null. Delegatiedoel voor de 2 snapshot-sites.
  function decisionRulesSnapshot(rules) {
    return rules ? { detraining: { id: rules.id, version: rules.version } } : null;
  }
  // buildEvidence(): lichtgewicht superset-contract om een belangrijke trainingsuitkomst te
  // verklaren/reproduceren. Alleen de meegegeven velden komen mee (geen metadata-explosie).
  //   { source, calculationVersion, decision:{ruleId,ruleVersion}, inputs, override, ai:{validatedBy} }
  function buildEvidence(o) {
    o = o || {};
    var ev = { source: o.source || 'calculation', evidenceVersion: VERSIONS.evidence };
    if (o.calculationVersion != null) ev.calculationVersion = o.calculationVersion;
    if (o.decision != null) ev.decision = o.decision;
    if (o.inputs != null) ev.inputs = o.inputs;
    if (o.override != null) ev.override = o.override;
    if (o.ai != null) ev.ai = o.ai;
    return ev;
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * VERBANDEN (verband.v1) — vrijgave en verwoording
   *
   * De Decision Engine bepaalt ALS ENIGE of een verband getoond mag worden en hoe het
   * verwoord wordt. De UI plaatst alleen tekst; hij kent de drempel niet, bepaalt geen
   * sterkte en formuleert geen zinnen. PUUR en DETERMINISTISCH: geen Date.now, geen
   * random, geen DOM.
   *
   * Productbesluiten (vastgelegd door de Product Owner, niet hier bedacht):
   *   - minimum aantal vergelijkbare waarnemingen: 30
   *   - methode: Spearman rangcorrelatie (CalcCore.spearman)
   *
   * STERKTEGRENZEN. De UI heeft een woord nodig waar de engine een getal heeft. De
   * grenzen volgen de gangbare conventie van Cohen (1988) voor de grootte van een
   * correlatie, toegepast op |coëfficiënt|:
   *      |r| <  0.10  verwaarloosbaar   (geen richting claimen)
   *      |r| <  0.30  zwak
   *      |r| <  0.50  matig
   *      |r| >= 0.50  sterk
   * Ze staan hier expliciet zodat ze op één plek te herzien zijn en de UI ze niet kan
   * verschuiven. Ze zeggen iets over de GROOTTE van de samenhang, niet over bewijskracht.
   *
   * CIRCULARITEIT. Een verband tussen twee grootheden die uit dezelfde ruwe invoer
   * worden berekend, meet de formule zelf en niet de werkelijkheid — dagfactor komt uit
   * HRV en slaap, herstel komt uit trainingsbelasting en RPE. Elke definitie noemt
   * daarom haar ruwe invoer; overlappen die verzamelingen, dan weigert de engine het
   * verband. Dat gebeurt hier, niet in de UI: verbergen is geen weigeren.
   * ══════════════════════════════════════════════════════════════════════════ */
  var VERBAND_VERSIE = 'verband.v1';
  var VERBAND_MIN_N = 30;
  var VERBAND_STERKTE = [
    { grens: 0.10, key: 'verwaarloosbaar', label: 'Geen duidelijke samenhang' },
    { grens: 0.30, key: 'zwak',            label: 'Zwakke samenhang' },
    { grens: 0.50, key: 'matig',           label: 'Matige samenhang' },
    { grens: Infinity, key: 'sterk',       label: 'Sterke samenhang' }
  ];
  var VERBAND_DISCLAIMER = 'Dit is een samenhang, geen oorzaak.';
  // Woorden die een oorzaak-gevolgrelatie suggereren. Uitsluitend voor tests en review;
  // de engine bouwt zijn zinnen zo op dat ze er nooit in kunnen voorkomen.
  var VERBAND_VERBODEN_WOORDEN = ['veroorzaakt', 'zorgt voor', 'leidt tot', 'dankzij', 'waardoor', 'heeft als gevolg', 'door'];

  /* De eerste drie verbanden. UITSLUITEND productconfiguratie — geen logica per verband.
   * Een vierde verband is een extra item in deze lijst; er komt geen tweede correlatie-
   * implementatie bij.
   *   veld     : welk veld uit de bronreeks
   *   inputs   : de RUWE invoer waaruit de grootheid komt (basis van de circulariteitstoets)
   *   conditie : hoe "meer van A" in gewone taal heet
   *   noemer   : hoe B in een zin heet
   *   zinNaam  : hoe de grootheid in lopende tekst heet (HRV blijft HRV, geen 'hrv')
   */
  var VERBAND_DEFINITIES = [
    { id: 'sleep_hrv', label: 'Slaap en HRV', methode: 'spearman', minimumN: VERBAND_MIN_N, vensterDagen: 180,
      a: { veld: 'sleep', label: 'Slaap', eenheid: 'u',  inputs: ['sleep'], conditie: 'je langer sliep', zinNaam: 'slaap' },
      b: { veld: 'hrv',   label: 'HRV',    eenheid: 'ms', inputs: ['hrv'],  noemer: 'HRV', zinNaam: 'HRV' } },
    { id: 'sleep_rhr', label: 'Slaap en rusthartslag', methode: 'spearman', minimumN: VERBAND_MIN_N, vensterDagen: 180,
      a: { veld: 'sleep', label: 'Slaap',          eenheid: 'u',   inputs: ['sleep'], conditie: 'je langer sliep', zinNaam: 'slaap' },
      b: { veld: 'rhr',   label: 'Rusthartslag',   eenheid: 'bpm', inputs: ['rhr'],   noemer: 'rusthartslag', zinNaam: 'rusthartslag' } },
    { id: 'hrv_rhr',   label: 'HRV en rusthartslag', methode: 'spearman', minimumN: VERBAND_MIN_N, vensterDagen: 180,
      a: { veld: 'hrv',   label: 'HRV',            eenheid: 'ms',  inputs: ['hrv'],   conditie: 'je HRV hoger was', zinNaam: 'HRV' },
      b: { veld: 'rhr',   label: 'Rusthartslag',   eenheid: 'bpm', inputs: ['rhr'],   noemer: 'rusthartslag', zinNaam: 'rusthartslag' } }
  ];

  function _inputsVan(zijde) { return (zijde && Array.isArray(zijde.inputs)) ? zijde.inputs : []; }
  // true zodra beide zijden ten minste één ruwe invoer delen.
  function verbandIsCirculair(definition) {
    var d = definition || {};
    var A = _inputsVan(d.a), B = _inputsVan(d.b);
    if (!A.length || !B.length) return true;          // onbekende herkomst = niet vrijgeven
    for (var i = 0; i < A.length; i++) if (B.indexOf(A[i]) >= 0) return true;
    return false;
  }
  function verbandSterkte(coefficient) {
    if (coefficient == null || !isFinite(coefficient)) return null;
    var abs = Math.abs(coefficient);
    for (var i = 0; i < VERBAND_STERKTE.length; i++) if (abs < VERBAND_STERKTE[i].grens) return VERBAND_STERKTE[i];
    return VERBAND_STERKTE[VERBAND_STERKTE.length - 1];
  }

  /* releaseVerband(stat, definition)
   * stat: { coefficient, n, direction } uit CalcCore.spearman
   * → { vrijgegeven, reason, direction, strength, strengthLabel, coefficient, n,
   *     minimumN, zin, onderbouwing, disclaimer, versie }
   * reason: 'ok' · 'circulair' · 'te_weinig_data' · 'niet_bepaalbaar' · 'ongeldige_definitie'
   */
  function releaseVerband(stat, definition) {
    var st = stat || {}, d = definition || {};
    var n = (typeof st.n === 'number' && isFinite(st.n) && st.n >= 0) ? Math.floor(st.n) : 0;
    var coefficient = (typeof st.coefficient === 'number' && isFinite(st.coefficient)) ? st.coefficient : null;
    var minimumN = (typeof d.minimumN === 'number' && isFinite(d.minimumN)) ? d.minimumN : VERBAND_MIN_N;
    var basis = {
      id: d.id || null, versie: VERBAND_VERSIE, vrijgegeven: false, reason: 'ongeldige_definitie',
      direction: 'none', strength: null, strengthLabel: null,
      coefficient: coefficient, n: n, minimumN: minimumN,
      zin: null, onderbouwing: null, disclaimer: VERBAND_DISCLAIMER
    };
    if (!d.a || !d.b || !d.a.veld || !d.b.veld) return basis;
    if (verbandIsCirculair(d)) { basis.reason = 'circulair'; return basis; }
    if (n < minimumN) { basis.reason = 'te_weinig_data'; return basis; }
    var band = verbandSterkte(coefficient);
    if (coefficient == null || !band) { basis.reason = 'niet_bepaalbaar'; return basis; }

    // Richting komt UITSLUITEND uit het teken van de berekende coëfficiënt. Bij een
    // verwaarloosbare samenhang wordt bewust geen richting geclaimd.
    var richting = band.key === 'verwaarloosbaar' ? 'none' : (coefficient > 0 ? 'higher' : (coefficient < 0 ? 'lower' : 'none'));
    var zin = (richting === 'none')
      ? ('Tussen je ' + (d.a.zinNaam || d.a.label) + ' en je ' + (d.b.zinNaam || d.b.noemer || d.b.label) +
         ' is in deze periode geen duidelijke samenhang te zien.')
      : ('Op dagen waarop ' + d.a.conditie + ', lag je ' + (d.b.noemer || d.b.label) +
         ' gemiddeld ' + (richting === 'higher' ? 'hoger' : 'lager') + '.');
    return {
      id: d.id || null, versie: VERBAND_VERSIE, vrijgegeven: true, reason: 'ok',
      direction: richting, strength: band.key, strengthLabel: band.label,
      coefficient: coefficient, n: n, minimumN: minimumN,
      zin: zin,
      onderbouwing: 'Gebaseerd op ' + n + ' dagen met beide metingen.',
      disclaimer: VERBAND_DISCLAIMER
    };
  }

  var DecisionCore = {
    releaseVerband: releaseVerband,
    verbandIsCirculair: verbandIsCirculair,
    verbandSterkte: verbandSterkte,
    VERBAND_DEFINITIES: VERBAND_DEFINITIES,
    VERBAND_MIN_N: VERBAND_MIN_N,
    VERBAND_STERKTE: VERBAND_STERKTE,
    VERBAND_DISCLAIMER: VERBAND_DISCLAIMER,
    VERBAND_VERBODEN_WOORDEN: VERBAND_VERBODEN_WOORDEN,
    computeProgression: computeProgression,
    computeProgAdjustment: computeProgAdjustment,
    trainReadiness: trainReadiness,
    detrainingFactor: detrainingFactor,
    phaseForWeek: phaseForWeek,
    progressionDecision: progressionDecision,
    Evidence: {
      decisionRulesSnapshot: decisionRulesSnapshot,
      buildEvidence: buildEvidence
    },
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = DecisionCore; }
  if (global) { global.DecisionCore = DecisionCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
