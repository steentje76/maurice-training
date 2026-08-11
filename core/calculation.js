/* ==========================================================================
 * TrainingKompas — SHARED CALCULATION CORE  (F1.2 first extraction)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 * Geen document/window-DOM, geen Supabase/fetch, geen localStorage, geen AI,
 * geen globale mutable state. INPUT -> OUTPUT.
 *
 * Bevat UITSLUITEND bestaande legacy-semantiek (extractie, geen verbetering):
 *   - roundKg      : gewicht-afronding 0,5 kg, half -> +Infinity  (rounding.v1)
 *   - oneRMRaw     : Epley RAW (geen afronding)                    (e1rm.v1)
 *   - calculate1RM : Epley -> Math.round (hele kg)                 (e1rm.v1)
 *
 * Legacy quirks BEWUST behouden (niet stil wijzigen):
 *   - roundKg(null) === 0        (null*2 === 0)
 *   - roundKg(undefined/NaN/"abc") === NaN
 *   - half-afronding richting +Infinity (Math.round): 0.25->0.5, 2.75->3, -1.25->-1
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { rounding: 'rounding.v1', e1rm: 'e1rm.v1', working_weight: 'working_weight.v1', ai_guard: 'ai_guard.v1' };

  // --- rounding.v1 --- exact gelijk aan legacy index.html r.10668
  function roundKg(v) { return Math.round(v * 2) / 2; }

  // --- e1rm.v1 (RAW) --- exact gelijk aan legacy epley1RMRaw r.10661
  function oneRMRaw(kg, reps) { return reps === 1 ? kg : kg * (1 + reps / 30); }

  // --- e1rm.v1 (hele kg) --- exact gelijk aan legacy epley1RM r.10662-10666
  // Legacy-semantiek BEWUST 1-op-1: guard -> null; 1 rep -> kg (NIET afgerond); anders Math.round(raw).
  function calculate1RM(kg, reps) {
    if (!kg || !reps || reps < 1) return null;
    if (reps === 1) return kg;
    return Math.round(oneRMRaw(kg, reps));
  }

  // --- working_weight.v1 --- exact gelijk aan legacy suggestWeightForRepsRpe (index.html r.8094-8100)
  // Brzycki-inverse: RPE -> RIR -> reps-to-failure -> gewicht, afgerond met roundKg. Legacy-semantiek
  // BEWUST 1-op-1: guard (!oneRM||!reps)->null; default RPE 8; reps-to-failure geplafonneerd op 20; w>0 else null.
  function calculateWorkingWeight(oneRM, reps, rpe) {
    if (!oneRM || !reps) return null;
    var rir = Math.max(0, 10 - (parseFloat(rpe) || 8));
    var repsToFailure = Math.min(20, reps + rir);
    var w = oneRM * (37 - repsToFailure) / 36;
    return w > 0 ? roundKg(w) : null;
  }

  // --- ai_guard.v1 --- AI-BOUNDARY: valideert een AI-VOORGESTELD gewicht vóór het als suggestie
  // gebruikt mag worden. Pure/deterministisch: geen DOM/DB/AI/network. AI is nooit de bron van
  // numerieke waarheid — een voorstel wordt hier getypeerd, engine-afgerond (roundKg) en op
  // plausibiliteit begrensd. Ongeldig -> {ok:false}. Geldig -> {ok:true, value} (engine-rounded).
  //   kg    : het door de AI voorgestelde gewicht (number of parseable string)
  //   oneRM : bekend (geschat) 1RM voor plausibiliteitsgrens; null/onbekend -> absolute cap 500 kg
  function validateProposedWeight(kg, oneRM) {
    var n = (typeof kg === 'number') ? kg : parseFloat(kg);
    if (typeof n !== 'number' || !isFinite(n)) return { ok: false, reason: 'geen geldig getal', source: 'ai_suggested', calculationVersion: VERSIONS.ai_guard };
    if (n <= 0) return { ok: false, reason: 'niet-positief', source: 'ai_suggested', calculationVersion: VERSIONS.ai_guard };
    var rounded = roundKg(n);
    var cap = (typeof oneRM === 'number' && isFinite(oneRM) && oneRM > 0) ? oneRM * 1.2 : 500;
    if (rounded > cap) return { ok: false, reason: 'boven plausibele grens', source: 'ai_suggested', calculationVersion: VERSIONS.ai_guard };
    return { ok: true, value: rounded, unit: 'kg', source: 'ai_suggested', calculationVersion: VERSIONS.ai_guard };
  }

  // Optionele, kleine result-contracten (versioneerbaar; geen metadata-explosie).
  // De frontend mag de primitives gebruiken; Evidence/Decision kan later de *Result-vorm nemen.
  function roundKgResult(v) {
    return { value: roundKg(v), unit: 'kg', calculationType: 'rounding', calculationVersion: VERSIONS.rounding };
  }
  function oneRMResult(kg, reps) {
    return { value: calculate1RM(kg, reps), unit: 'kg', calculationType: 'e1rm', calculationVersion: VERSIONS.e1rm };
  }
  function workingWeightResult(oneRM, reps, rpe) {
    return { value: calculateWorkingWeight(oneRM, reps, rpe), unit: 'kg', calculationType: 'working_weight', calculationVersion: VERSIONS.working_weight };
  }

  var CalcCore = {
    roundKg: roundKg,
    oneRMRaw: oneRMRaw,
    calculate1RM: calculate1RM,
    calculateWorkingWeight: calculateWorkingWeight,
    validateProposedWeight: validateProposedWeight,
    roundKgResult: roundKgResult,
    oneRMResult: oneRMResult,
    workingWeightResult: workingWeightResult,
    VERSIONS: VERSIONS
  };

  // UMD-achtige export: bruikbaar als CommonJS-module (node/tests) én als browser-global.
  if (typeof module !== 'undefined' && module.exports) { module.exports = CalcCore; }
  if (global) { global.CalcCore = CalcCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
