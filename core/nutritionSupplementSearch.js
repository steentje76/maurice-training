/* core/nutritionSupplementSearch.js — SUP-EVIDENCE-03A/03B.
 *
 * Pure, DOM-vrije zoeklaag boven NutritionSupplementCatalog, uitsluitend
 * voor de mobiele autocomplete-UI. Twee, strikt verschillende functies:
 *
 *   search(query)      -> SUGGESTIES, deterministisch gerangschikt (zie
 *                         RANK_* hieronder). Puur om te tonen in een
 *                         lijst; NOOIT om automatisch te koppelen.
 *   exactMatch(query)   -> de ENIGE manier waarop een getypte naam (zonder
 *                         expliciete klik op een suggestie) aan een
 *                         supplement_id mag worden gekoppeld. Hergebruikt
 *                         Catalog.bySynonymOrName rechtstreeks -- geen
 *                         tweede, eigen matchdefinitie.
 *
 * Matcht op canonical_name, display_name (SUP-EVIDENCE-03B, uitsluitend
 * presentatie) en synonyms. Nooit fuzzy/typo-tolerant: alleen exacte,
 * prefix- en substring-vergelijkingen, geen afstandsberekening, geen
 * kansscore -- zodat nooit "per ongeluk" de verkeerde stof wordt
 * gesuggereerd of automatisch gekoppeld. Selectie van een suggestie is
 * altijd een expliciete gebruikersactie (klik), nooit automatisch bij
 * het typen.
 *
 * RANKING (sectie 5, laag getal = hoogste voorrang), binnen elke rang
 * blijft de volgorde de vaste catalogusvolgorde (stabiele sort, geen
 * eigen "relevantie"-score):
 *   1 exacte match op canonical_name of display_name
 *   2 canonical_name/display_name begint met de zoekterm
 *   3 exacte match op een synonym
 *   4 een synonym begint met de zoekterm
 *   5 overige substring-match (canonical_name, display_name of synonym
 *     bevat de zoekterm ergens)
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./nutritionSupplementCatalog.js'));
  } else {
    root.NutritionSupplementSearch = factory(root.NutritionSupplementCatalog);
  }
}(typeof self !== 'undefined' ? self : this, function (Catalog) {
  'use strict';

  /* Bewust beperkt (was 8): voorkomt een chaotische, moeilijk scanbare
   * lijst bij een zoekterm van 1 letter (fysiek Android-issue,
   * SUP-EVIDENCE-03B sectie 6), zonder een tweede "toon meer"-mechanisme
   * te bouwen -- de bestaande scrolllijst blijft, nu beter gerangschikt
   * en met minder ruis. */
  var MAX_RESULTS = 6;
  var RANK_EXACT_NAME = 1;
  var RANK_PREFIX_NAME = 2;
  var RANK_EXACT_SYNONYM = 3;
  var RANK_PREFIX_SYNONYM = 4;
  var RANK_SUBSTRING = 5;

  function normalize(s) { return String(s || '').toLowerCase().trim(); }

  /* classifyMatch: bepaalt of/hoe een catalogitem matcht met de
   * zoekterm, en welke rang dat oplevert. Retourneert null bij geen
   * match. Puur, geen state, geen willekeur -- zelfde input geeft altijd
   * dezelfde uitkomst (vereiste 9.E: deterministische ranking). */
  function classifyMatch(item, q) {
    var canonical = normalize(item.canonical_name);
    var display = normalize(Catalog.getDisplayName(item));
    var displayText = Catalog.getDisplayName(item);

    if (canonical === q) return { rank: RANK_EXACT_NAME, matched_via: 'canonical_name', matched_text: item.canonical_name };
    if (display === q) return { rank: RANK_EXACT_NAME, matched_via: 'display_name', matched_text: displayText };
    if (canonical.indexOf(q) === 0) return { rank: RANK_PREFIX_NAME, matched_via: 'canonical_name', matched_text: item.canonical_name };
    if (display.indexOf(q) === 0) return { rank: RANK_PREFIX_NAME, matched_via: 'display_name', matched_text: displayText };

    var syns = item.synonyms || [];
    for (var i = 0; i < syns.length; i++) {
      if (normalize(syns[i]) === q) return { rank: RANK_EXACT_SYNONYM, matched_via: 'synonym', matched_text: syns[i] };
    }
    for (var j = 0; j < syns.length; j++) {
      if (normalize(syns[j]).indexOf(q) === 0) return { rank: RANK_PREFIX_SYNONYM, matched_via: 'synonym', matched_text: syns[j] };
    }

    if (canonical.indexOf(q) >= 0) return { rank: RANK_SUBSTRING, matched_via: 'canonical_name', matched_text: item.canonical_name };
    if (display.indexOf(q) >= 0) return { rank: RANK_SUBSTRING, matched_via: 'display_name', matched_text: displayText };
    for (var k = 0; k < syns.length; k++) {
      if (normalize(syns[k]).indexOf(q) >= 0) return { rank: RANK_SUBSTRING, matched_via: 'synonym', matched_text: syns[k] };
    }
    return null;
  }

  function search(query, maxResults) {
    var q = normalize(query);
    if (!q) return [];
    var limit = maxResults || MAX_RESULTS;
    var scored = [];
    Catalog.allItems().forEach(function (item, index) {
      var m = classifyMatch(item, q);
      if (!m) return;
      scored.push({
        supplement_id: item.supplement_id,
        canonical_name: item.canonical_name,
        display_name: Catalog.getDisplayName(item),
        matched_via: m.matched_via,
        matched_text: m.matched_text,
        rank: m.rank,
        catalog_index: index // tie-breaker: vaste catalogusvolgorde, geen willekeur
      });
    });
    scored.sort(function (a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.catalog_index - b.catalog_index;
    });
    return scored.slice(0, limit).map(function (r) {
      return { supplement_id: r.supplement_id, canonical_name: r.canonical_name, display_name: r.display_name, matched_via: r.matched_via, matched_text: r.matched_text };
    });
  }

  function exactMatch(query) {
    return Catalog.bySynonymOrName(query);
  }

  var NutritionSupplementSearch = {
    MAX_RESULTS: MAX_RESULTS,
    search: search,
    exactMatch: exactMatch
  };

  return NutritionSupplementSearch;
}));
