/* core/nutritionHydrationService.js — waterinname-logging (geen
 * aanbevelingen, geen elektrolytenadvies -- uitsluitend registratie
 * en deterministische aggregatie).
 *
 * Pure logica; de daadwerkelijke database-IO (nutrition_hydration_
 * entries, Wave 3, ongewijzigd) gebeurt door de aanroeper.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionHydrationService = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* normalizeHydrationAmount: converteert een opgegeven hoeveelheid +
   * eenheid naar canonical ml. Ondersteunt uitsluitend ml/L (Fase 3,
   * "plain water intake only"). Onbekende eenheid -> UNSUPPORTED_UNIT,
   * nooit een gok. */
  function normalizeHydrationAmount(amount, unit) {
    if (!isNum(amount)) return { status: 'INVALID_QUANTITY' };
    if (amount <= 0) return { status: amount === 0 ? 'ZERO_QUANTITY' : 'INVALID_QUANTITY' };
    if (unit === 'ml') return { status: 'OK', amount_ml: Math.round(amount) };
    if (unit === 'l' || unit === 'L' || unit === 'liter' || unit === 'litre') return { status: 'OK', amount_ml: Math.round(amount * 1000) };
    return { status: 'UNSUPPORTED_UNIT', unit: unit };
  }

  /* aggregateDailyHydration: som van reeds opgehaalde entries (elk al
   * genormaliseerd naar amount_ml) -- geen nieuwe database-aggregatie
   * hier, puur een som over meegegeven rijen. */
  function aggregateDailyHydration(entries) {
    var valid = (Array.isArray(entries) ? entries : []).filter(function (e) { return e && isNum(e.amount_ml); });
    if (!valid.length) return { status: 'NO_ITEMS', total_ml: null, item_count: 0 };
    var total = valid.reduce(function (sum, e) { return sum + e.amount_ml; }, 0);
    return { status: 'valid', total_ml: Math.round(total), item_count: valid.length };
  }

  /* canModifyHydrationEntry: ownership-regel, spiegelt de bestaande
   * RLS (user_id = auth.uid()) -- niet de enige controle. */
  function canModifyHydrationEntry(userId, entry) {
    return !!userId && !!entry && entry.user_id === userId;
  }

  var NutritionHydrationService = {
    normalizeHydrationAmount: normalizeHydrationAmount,
    aggregateDailyHydration: aggregateDailyHydration,
    canModifyHydrationEntry: canModifyHydrationEntry
  };

  return NutritionHydrationService;
}));
