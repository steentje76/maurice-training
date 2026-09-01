/* core/nutritionFoundation.js — B9-09 Nutrition Foundation.
 *
 * Pure, deterministische aggregatie/validatie-laag. Geen DOM/database/
 * network-toegang. Registreert primair -- diagnosticeert niet.
 *
 * HARDE PRINCIPES (zie docs/B9_09_NUTRITION_FOUNDATION_REPORT.md):
 * - Missing != zero: een niet-ingevulde waarde is NOOIT 0.
 * - Geen caloriedoel-/macrodoel-engine, geen "logged_total" die zich
 *   voordoet als "actual_intake" wanneer de dag niet volledig is
 *   gelogd (sectie 26/27).
 * - Geen Decision Rules, geen thresholds ("low"/"high"/"warning").
 *
 * BEWUST NIET GEBOUWD in B9-09 (expliciete, toegestane uitkomsten):
 * caloriedoel-engine, macro-target-generator, voedingsmiddelendatabase,
 * AI-integratie, Nutrition Decision Rules.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionFoundationCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONS = { schema: 'nutrition_entry.v1', dailyTotals: 'nutrition_daily_totals.v1' };
  var ENTRY_TYPES = ['meal', 'snack', 'hydration', 'other'];
  var TIMING_CONTEXTS = ['pre_training', 'during_training', 'post_training'];

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  // Sectie 24 (input validation): technische, brede sanity-checks --
  // GEEN medische norm, uitsluitend "is dit technisch een zinnig getal".
  function validateEntry(entry) {
    var fouten = [];
    if (!entry || typeof entry !== 'object') return { valid: false, errors: ['entry_missing'] };
    if (!entry.occurred_at) fouten.push('occurred_at_required');
    if (ENTRY_TYPES.indexOf(entry.entry_type) === -1) fouten.push('entry_type_invalid');
    if (entry.timing_context != null && TIMING_CONTEXTS.indexOf(entry.timing_context) === -1) fouten.push('timing_context_invalid');
    var velden = [
      { naam: 'energy_kcal', max: 20000 }, { naam: 'protein_g', max: 1000 },
      { naam: 'carbohydrate_g', max: 2000 }, { naam: 'fat_g', max: 1000 }, { naam: 'fluid_ml', max: 20000 }
    ];
    velden.forEach(function (v) {
      var waarde = entry[v.naam];
      if (waarde == null) return; // missing is toegestaan, geen fout
      if (!isNum(waarde) || waarde < 0 || waarde >= v.max) fouten.push(v.naam + '_out_of_range');
    });
    if (entry.note != null && String(entry.note).length > 500) fouten.push('note_too_long');
    return { valid: fouten.length === 0, errors: fouten };
  }

  // Sectie 26/27: dagelijkse, geregistreerde totalen -- expliciet
  // "logged_total", NOOIT "actual_intake" (semantiek is cruciaal). Een
  // dag met 3 van de 4 maaltijden gevuld is PARTIAL, niet COMPLETE. Een
  // dag zonder enige entry is NOT_AVAILABLE, niet 0.
  function dailyLoggedTotals(entries) {
    var lijst = Array.isArray(entries) ? entries : [];
    if (!lijst.length) {
      return { schema: VERSIONS.dailyTotals, status: 'NOT_AVAILABLE', logged_entry_count: 0,
        energy_kcal_logged_total: null, protein_g_logged_total: null,
        carbohydrate_g_logged_total: null, fat_g_logged_total: null, fluid_ml_logged_total: null,
        data_quality: 'NOT_AVAILABLE' };
    }
    var velden = ['energy_kcal', 'protein_g', 'carbohydrate_g', 'fat_g', 'fluid_ml'];
    var totalen = {}, aantalMetWaarde = {};
    velden.forEach(function (v) { totalen[v] = 0; aantalMetWaarde[v] = 0; });
    lijst.forEach(function (e) {
      if (!e) return;
      velden.forEach(function (v) {
        if (isNum(e[v])) { totalen[v] += e[v]; aantalMetWaarde[v]++; }
      });
    });
    var out = { schema: VERSIONS.dailyTotals, status: 'valid', logged_entry_count: lijst.length, data_quality: {} };
    velden.forEach(function (v) {
      out[v + '_logged_total'] = aantalMetWaarde[v] > 0 ? Math.round(totalen[v] * 10) / 10 : null;
      // Per veld: COMPLETE alleen als ELKE entry een waarde had voor dit
      // veld, anders PARTIAL, en NOT_AVAILABLE als geen enkele entry een
      // waarde had. Nooit "actual_intake" claimen -- dit blijft altijd
      // uitsluitend een "logged_total", ongeacht de status.
      if (aantalMetWaarde[v] === 0) out.data_quality[v] = 'NOT_AVAILABLE';
      else if (aantalMetWaarde[v] === lijst.length) out.data_quality[v] = 'COMPLETE';
      else out.data_quality[v] = 'PARTIAL';
    });
    return out;
  }

  return {
    VERSIONS: VERSIONS,
    ENTRY_TYPES: ENTRY_TYPES,
    TIMING_CONTEXTS: TIMING_CONTEXTS,
    validateEntry: validateEntry,
    dailyLoggedTotals: dailyLoggedTotals
  };
}));
