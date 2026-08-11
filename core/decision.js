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

  var DecisionCore = {
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
