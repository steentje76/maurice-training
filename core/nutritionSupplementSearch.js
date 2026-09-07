/* core/nutritionSupplementSearch.js — SUP-EVIDENCE-03A.
 *
 * Pure, DOM-vrije zoeklaag boven NutritionSupplementCatalog, uitsluitend
 * voor de mobiele autocomplete-UI. Twee, strikt verschillende functies:
 *
 *   search(query)      -> SUGGESTIES (substring-match, canonical_name of
 *                         synonym, case-insensitive). Puur om te tonen in
 *                         een lijst; NOOIT om automatisch te koppelen.
 *   exactMatch(query)   -> de ENIGE manier waarop een getypte naam (zonder
 *                         expliciete klik op een suggestie) aan een
 *                         supplement_id mag worden gekoppeld. Hergebruikt
 *                         Catalog.bySynonymOrName rechtstreeks -- geen
 *                         tweede, eigen matchdefinitie.
 *
 * Nooit fuzzy/typo-tolerant: substring-match zonder afstandsberekening,
 * zodat nooit "per ongeluk" de verkeerde stof wordt gesuggereerd of
 * gekoppeld. Selectie van een suggestie is altijd een expliciete
 * gebruikersactie (klik), nooit automatisch bij het typen.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./nutritionSupplementCatalog.js'));
  } else {
    root.NutritionSupplementSearch = factory(root.NutritionSupplementCatalog);
  }
}(typeof self !== 'undefined' ? self : this, function (Catalog) {
  'use strict';

  var MAX_RESULTS = 8;

  function normalize(s) { return String(s || '').toLowerCase().trim(); }

  /* search: substring-match, canonical_name EERST gecontroleerd, anders
   * elke synonym. Eén resultaat per catalogitem (nooit dubbel voor
   * canonical+synonym tegelijk), gesorteerd op volgorde van voorkomen in
   * de catalogus (geen eigen "relevantie"-score -- dat zou fuzzy-gedrag
   * introduceren). */
  function search(query, maxResults) {
    var q = normalize(query);
    if (!q) return [];
    var limit = maxResults || MAX_RESULTS;
    var results = [];
    Catalog.allItems().forEach(function (item) {
      if (results.length >= limit) return;
      var canonical = normalize(item.canonical_name);
      if (canonical.indexOf(q) >= 0) {
        results.push({ supplement_id: item.supplement_id, canonical_name: item.canonical_name, matched_via: 'canonical_name', matched_text: item.canonical_name });
        return;
      }
      var syns = item.synonyms || [];
      for (var i = 0; i < syns.length; i++) {
        if (normalize(syns[i]).indexOf(q) >= 0) {
          results.push({ supplement_id: item.supplement_id, canonical_name: item.canonical_name, matched_via: 'synonym', matched_text: syns[i] });
          return;
        }
      }
    });
    return results;
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
