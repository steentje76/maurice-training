/* core/nutritionDiscoveryService.js — product discovery zonder
 * verplichte barcode-scan (Fase 11).
 *
 * Pure query-bouwlogica + client-side ranking. De daadwerkelijke
 * database-query (PostgREST-filter) wordt door de aanroeper
 * uitgevoerd; deze module bepaalt de filter-parameters en de,
 * deterministische, ranking van reeds opgehaalde resultaten.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionDiscoveryService = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* buildSearchFilter: normaliseert een vrije zoekterm naar een
   * PostgREST-veilige, case-insensitive ilike-patroon. Voorkomt lege/
   * te-korte queries (geen zinvolle resultaten, onnodige belasting). */
  function buildSearchFilter(query) {
    if (!query || typeof query !== 'string') return null;
    var trimmed = query.trim();
    if (trimmed.length < 2) return { status: 'TOO_SHORT' };
    // Escape PostgREST-speciale tekens (%, *, komma) om injectie/
    // onbedoelde wildcard-patronen te voorkomen.
    var escaped = trimmed.replace(/[%*,]/g, '');
    return { status: 'OK', ilikePattern: '*' + escaped + '*' };
  }

  /* rankRecentFoods: de meest recent gelogde, unieke producten/foods
   * eerst -- puur een sortering op reeds opgehaalde logs, geen
   * database-aggregatie hier zelf uitgevoerd. */
  function rankRecentFoods(mealItemsWithTimestamp, limit) {
    var seen = {};
    var deduped = [];
    var sorted = (mealItemsWithTimestamp || []).slice().sort(function (a, b) {
      return new Date(b.occurred_at) - new Date(a.occurred_at);
    });
    sorted.forEach(function (item) {
      var key = item.food_id || item.product_id;
      if (key && !seen[key]) { seen[key] = true; deduped.push(item); }
    });
    return deduped.slice(0, limit || 10);
  }

  /* rankFrequentFoods: telt hoe vaak elk food/product in een gegeven
   * periode is gelogd, sorteert aflopend op frequentie. Deterministisch,
   * geen AI-inferentie over "voorkeur". */
  function rankFrequentFoods(mealItems, limit) {
    var counts = {};
    (mealItems || []).forEach(function (item) {
      var key = item.food_id || item.product_id;
      if (!key) return;
      counts[key] = counts[key] || { key: key, food_id: item.food_id, product_id: item.product_id, count: 0 };
      counts[key].count++;
    });
    return Object.keys(counts)
      .map(function (k) { return counts[k]; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, limit || 10);
  }

  var NutritionDiscoveryService = {
    buildSearchFilter: buildSearchFilter,
    rankRecentFoods: rankRecentFoods,
    rankFrequentFoods: rankFrequentFoods
  };

  return NutritionDiscoveryService;
}));
