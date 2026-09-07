/* core/nutritionRelationshipSources.js — NUT-REL-01B.
 *
 * Pure module: Foundation 2.0 Nutrition-data -> betrouwbare, per-lokale-dag
 * reeksen, geschikt om aan RelationshipCore.discover() te voeren. Geen
 * UI-code, geen database-IO -- de aanroepende laag (index.html,
 * tkNutritionBronnen) doet de query's en geeft de al-opgehaalde rijen door.
 *
 * Hergebruikt bestaande, canonieke berekeningslagen:
 * - NutritionMealService.aggregateDailyNutrition (som + coverage per dag,
 *   ONGEWIJZIGD) -- deze module voegt GEEN nieuwe nutrient-arithmetic toe
 *   en wordt GEEN tweede macro-engine.
 * - NutritionTimeUtils.localDateStr (lokale kalenderdag uit consumed_at,
 *   NUT-TIME-01, ONGEWIJZIGD).
 *
 * PROVENANCE (hard, PER RIJ, VOOR aggregatie -- NUT-REL-01B sectie 4):
 * Uitsluitend rijen met consumed_at_source === 'user_confirmed' tellen
 * mee. legacy_occurred_at_fallback (en elke andere of ontbrekende waarde)
 * wordt uitgesloten -- filtering gebeurt individueel per rij, NOOIT
 * "dag is geldig zodra één rij user_confirmed is". Een meal-rij draagt
 * zijn eigen consumed_at/consumed_at_source (NUT-TIME-01); de items eronder
 * hebben geen eigen tijdstip en erven dat van hun meal, dus filteren op
 * meal-niveau is filteren op het enige juiste rijniveau voor deze data.
 *
 * MISSING != ZERO: een lokale dag zonder een enkele gekwalificeerde rij (of
 * met uitsluitend UNKNOWN-coverage voor een veld) komt NIET in de reeks
 * voor -- nooit een 0-waarde ingevuld omdat logging ontbreekt.
 *
 * CANONIEKE BRONNEN UITSLUITEND (NUT-CANON-01): nutrition_meals +
 * nutrition_meal_items (food/macro) en nutrition_hydration_entries
 * (hydration). nutrition_entries (legacy/compatibility) en
 * nutrition_supplement_logs/nutrition_foods komen hier NIET in voor en
 * worden NOOIT bij Foundation 2.0 opgeteld.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./nutritionMealService.js'), require('./nutritionTimeUtils.js'));
  } else {
    root.NutritionRelationshipSources = factory(root.NutritionMealService, root.NutritionTimeUtils);
  }
}(typeof self !== 'undefined' ? self : this, function (NutritionMealService, NutritionTimeUtils) {
  'use strict';

  var VERSION = 'nutrition_relationship_sources.v1';

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* qualifiedMeals: filtert nutrition_meals-rijen individueel op
   * provenance. Geen enkele andere aanname over de rij-inhoud. */
  function qualifiedMeals(meals) {
    return (Array.isArray(meals) ? meals : []).filter(function (m) {
      return !!m && m.consumed_at_source === 'user_confirmed' && !!m.consumed_at;
    });
  }

  /* qualifiedHydration: idem voor nutrition_hydration_entries-rijen. */
  function qualifiedHydration(rows) {
    return (Array.isArray(rows) ? rows : []).filter(function (r) {
      return !!r && r.consumed_at_source === 'user_confirmed' && !!r.consumed_at && isNum(Number(r.amount_ml));
    });
  }

  /* dailyMacroSeries: groepeert gekwalificeerde meals per lokale dag,
   * somt hun items via de bestaande aggregateDailyNutrition (dus geen
   * eigen optel-logica), en levert per veld een {date,value}-reeks.
   * Een dag met uitsluitend UNKNOWN-coverage voor een veld levert GEEN
   * punt op voor dat veld. `meals` = array van meal-rijen, elk met een
   * `items`-array (nutrition_meal_items van die meal, elk met
   * nutrient_snapshot) -- exact de vorm die voedingFetchDayMeals al
   * levert, hier alleen over meerdere dagen tegelijk. */
  function dailyMacroSeries(meals) {
    var gekwalificeerd = qualifiedMeals(meals);
    var perDag = {};
    gekwalificeerd.forEach(function (m) {
      var dag = NutritionTimeUtils.localDateStr(new Date(m.consumed_at));
      if (!perDag[dag]) perDag[dag] = [];
      perDag[dag] = perDag[dag].concat(Array.isArray(m.items) ? m.items : []);
    });
    var dagen = Object.keys(perDag).sort();
    var VELD_MAP = { nutrition_kcal: 'energy_kcal', nutrition_protein: 'protein_g', nutrition_carbs: 'carbohydrate_g' };
    var out = { nutrition_kcal: [], nutrition_protein: [], nutrition_carbs: [] };
    dagen.forEach(function (dag) {
      var agg = NutritionMealService.aggregateDailyNutrition(perDag[dag]);
      Object.keys(VELD_MAP).forEach(function (key) {
        var veld = VELD_MAP[key];
        if (agg && agg.coverage && agg.coverage[veld] !== 'UNKNOWN' && isNum(agg[veld])) {
          out[key].push({ date: dag, value: agg[veld] });
        }
      });
    });
    return out;
  }

  /* dailyHydrationSeries: som van amount_ml per lokale dag, uitsluitend
   * gekwalificeerde rijen. Optellen van al-canonieke, opgeslagen waarden
   * is geen nieuwe berekening van een afgeleide grootheid (geen nieuwe
   * arithmetic, alleen een dagsom -- zelfde soort operatie als
   * NutritionFoundationCore.dailyLoggedTotals elders al doet). */
  function dailyHydrationSeries(rows) {
    var gekwalificeerd = qualifiedHydration(rows);
    var perDag = {};
    gekwalificeerd.forEach(function (r) {
      var dag = NutritionTimeUtils.localDateStr(new Date(r.consumed_at));
      var v = Number(r.amount_ml);
      if (!isNum(v)) return;
      perDag[dag] = (perDag[dag] || 0) + v;
    });
    return Object.keys(perDag).sort().map(function (dag) {
      return { date: dag, value: Math.round(perDag[dag] * 10) / 10 };
    });
  }

  /* build(meals, hydrationRows): de enige aanroep die de bronnen-laag
   * (tkNutritionBronnen) nodig heeft. Levert uitsluitend de reeksen die
   * ECHT data hebben -- een lege reeks wordt weggelaten, niet als lege
   * array meegegeven (zelfde conventie als AthleteCore.relationshipSources:
   * "niet aanwezig" != "aanwezig met nul punten"). */
  function build(meals, hydrationRows) {
    var macro = dailyMacroSeries(meals);
    var hydratie = dailyHydrationSeries(hydrationRows);
    var uit = {};
    if (macro.nutrition_kcal.length) uit.nutrition_kcal = macro.nutrition_kcal;
    if (macro.nutrition_protein.length) uit.nutrition_protein = macro.nutrition_protein;
    if (macro.nutrition_carbs.length) uit.nutrition_carbs = macro.nutrition_carbs;
    if (hydratie.length) uit.nutrition_hydration = hydratie;
    return uit;
  }

  var NutritionRelationshipSources = {
    VERSION: VERSION,
    qualifiedMeals: qualifiedMeals,
    qualifiedHydration: qualifiedHydration,
    dailyMacroSeries: dailyMacroSeries,
    dailyHydrationSeries: dailyHydrationSeries,
    build: build
  };

  return NutritionRelationshipSources;
}));
