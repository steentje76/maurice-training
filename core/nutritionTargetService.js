/* core/nutritionTargetService.js — NUTRITION TARGETS V1 (USER_DEFINED).
 *
 * Pure, deterministische service. Geen DB-IO. Dit is de ENIGE plek waar
 * target/consumed/remaining/progress wordt berekend (UI rekent niet zelf,
 * AI ontvangt uitsluitend deze uitkomsten).
 *
 * V1-productbeslissing (zie NUTRITION_TARGETS_V1_REPORT.md): alleen
 * USER_DEFINED. SYSTEM_CALCULATED vereist BMR/TDEE, wat in het
 * Calculation Registry bewust NOT_IMPLEMENTED / PRODUCT_DECISION_REQUIRED
 * is (CALC-ENE-004). AI is nooit een canonical target-source.
 *
 * UNKNOWN != 0: een niet-ingesteld doel is null (NO_TARGET), een
 * ontbrekende consumptiewaarde is null (UNKNOWN_CONSUMED) -- nooit 0.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionTargetService = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TARGET_FIELDS = ['energy_kcal', 'protein_g', 'carbohydrate_g', 'fat_g'];
  var ALLOWED_SOURCES = ['USER_DEFINED'];            // V1. Later: SYSTEM_CALCULATED, PROFESSIONAL_DEFINED. Nooit AI.
  // Technische plausibiliteitsgrenzen -- GEEN medische claims. Buiten deze
  // range: 'CHECK_VALUE' (gebruiker bevestigt), geen stille correctie.
  var BOUNDS = { energy_kcal: [500, 10000], protein_g: [10, 600], carbohydrate_g: [10, 1500], fat_g: [10, 500] };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function round1(v) { return Math.round(v * 10) / 10; }

  /* validateTarget: partial targets zijn geldig (elk veld optioneel/null).
   * Minstens één veld moet gezet zijn. Waarden < 0 of niet-numeriek zijn
   * INVALID. Extreme-maar-mogelijke waarden geven CHECK_VALUE. */
  function validateTarget(input) {
    if (!input || typeof input !== 'object') return { valid: false, reason: 'INVALID_INPUT' };
    var anySet = false, checkFields = [], errors = [];
    TARGET_FIELDS.forEach(function (f) {
      var v = input[f];
      if (v === null || v === undefined || v === '') return;          // optioneel -> blijft UNKNOWN
      if (!isNum(v) || v <= 0) { errors.push(f); return; }              // 0 is geen doel; negatief ongeldig
      anySet = true;
      var b = BOUNDS[f];
      if (v < b[0] || v > b[1]) checkFields.push(f);
    });
    if (errors.length) return { valid: false, reason: 'INVALID_VALUE', fields: errors };
    if (!anySet) return { valid: false, reason: 'NO_FIELDS_SET' };
    if (input.source && ALLOWED_SOURCES.indexOf(input.source) === -1) return { valid: false, reason: 'INVALID_SOURCE' };
    return { valid: true, checkFields: checkFields, needsConfirmation: checkFields.length > 0 };
  }

  /* toCanonicalRow: normaliseert naar de canonical rij (null = UNKNOWN). */
  function toCanonicalRow(input, effectiveFrom) {
    var row = { effective_from: effectiveFrom, source: 'USER_DEFINED' };
    TARGET_FIELDS.forEach(function (f) {
      var v = input[f];
      row[f] = (v === null || v === undefined || v === '') ? null : Number(v);
    });
    return row;
  }

  /* resolveEffectiveTarget: historie via effective_from. Het doel dat op
   * `dateStr` (YYYY-MM-DD) geldt = de rij met de grootste effective_from
   * <= dateStr. Een wijziging vandaag (nieuwe rij) herschrijft dus NOOIT
   * eerdere dagen -- die blijven tegen hun eigen, toenmalige doel beoordeeld. */
  function resolveEffectiveTarget(rows, dateStr) {
    if (!Array.isArray(rows) || !rows.length || !dateStr) return null;
    var best = null;
    rows.forEach(function (r) {
      if (!r || !r.effective_from || r.effective_from > dateStr) return;
      if (!best || r.effective_from > best.effective_from || (r.effective_from === best.effective_from && (r.created_at || '') > (best.created_at || ''))) best = r;
    });
    return best;
  }

  /* computeDailyProgress: de centrale berekening. Input:
   *  - target: canonical rij of null
   *  - aggregate: uitkomst van NutritionMealService.aggregateDailyNutrition()
   * Output per veld: {target, consumed, remaining, progress_pct, status, coverage}
   * status: NO_TARGET | NOTHING_LOGGED | UNKNOWN_CONSUMED | ON_TRACK | OVER_TARGET */
  function computeDailyProgress(target, aggregate) {
    var out = { has_any_target: false, fields: {} };
    var nothingLogged = !aggregate || aggregate.status === 'NO_ITEMS' || !aggregate.item_count;
    TARGET_FIELDS.forEach(function (f) {
      var t = target && isNum(target[f]) ? target[f] : null;
      var coverage = (aggregate && aggregate.coverage && aggregate.coverage[f]) || 'UNKNOWN';
      var consumed;
      if (nothingLogged) consumed = 0;                                   // echte nul: niets gelogd
      else consumed = (aggregate && isNum(aggregate[f])) ? aggregate[f] : null; // UNKNOWN blijft null
      var res = { target: t, consumed: consumed, remaining: null, progress_pct: null, coverage: nothingLogged ? 'NONE' : coverage, status: null };
      if (t === null) res.status = 'NO_TARGET';
      else if (nothingLogged) { res.status = 'NOTHING_LOGGED'; res.remaining = t; res.progress_pct = 0; out.has_any_target = true; }
      else if (consumed === null) { res.status = 'UNKNOWN_CONSUMED'; out.has_any_target = true; }
      else {
        res.remaining = round1(t - consumed);
        res.progress_pct = Math.round((consumed / t) * 100);
        res.status = consumed > t ? 'OVER_TARGET' : 'ON_TRACK';
        out.has_any_target = true;
      }
      out.fields[f] = res;
    });
    return out;
  }

  /* formatRemaining: neutrale, niet-beoordelende presentatie (Fase 11).
   * Boven doel = feit, geen waarschuwing/schuld. */
  function formatRemaining(fieldResult, unit) {
    if (!fieldResult || fieldResult.status === 'NO_TARGET') return null;
    if (fieldResult.status === 'UNKNOWN_CONSUMED') return 'Inname onvolledig bekend';
    var r = fieldResult.remaining;
    if (r === null) return null;
    if (r < 0) return Math.abs(r) + ' ' + unit + ' boven doel';
    return 'Nog ' + r + ' ' + unit;
  }

  return {
    TARGET_FIELDS: TARGET_FIELDS,
    ALLOWED_SOURCES: ALLOWED_SOURCES,
    BOUNDS: BOUNDS,
    validateTarget: validateTarget,
    toCanonicalRow: toCanonicalRow,
    resolveEffectiveTarget: resolveEffectiveTarget,
    computeDailyProgress: computeDailyProgress,
    formatRemaining: formatRemaining
  };
}));
