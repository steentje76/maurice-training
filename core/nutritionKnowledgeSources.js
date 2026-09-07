/* core/nutritionKnowledgeSources.js — NK-01.
 *
 * Aanvullende, concrete bronrecords voor de Nutrition Knowledge &
 * Evidence Platform -- uitsluitend voor claims die NIET al een bron
 * hebben in nutritionSupplementSourceRegistry.js (die wordt hergebruikt
 * via cross-reference, nooit gedupliceerd). Zelfde contract als de
 * Supplement Source Registry: DOI/officiele URL verplicht, geen losse
 * strings.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionKnowledgeSources = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var REGISTRY_VERSION = 'nutrition_knowledge_sources.v1';

  var SOURCES = [
    { source_id: 'WHO-FAO-UNU-PROTEIN-2007', title: 'Protein and amino acid requirements in human nutrition', authors_or_organisation: 'Joint WHO/FAO/UNU Expert Consultation', publication_date: '2007-01-01', source_type: 'official_report', doi: null, official_url: 'https://pubmed.ncbi.nlm.nih.gov/18330140/', source_status: 'CURRENT', last_verified_at: '2026-09-07' },
    { source_id: 'DIAAS-HERREMAN-2020', title: 'Comprehensive overview of the quality of plant- and animal-sourced proteins based on the digestible indispensable amino acid score', authors_or_organisation: 'Herreman L, Nommensen P, Pennings B, Laus MC', publication_date: '2020-08-25', source_type: 'review', doi: '10.1002/fsn3.1809', official_url: 'https://onlinelibrary.wiley.com/doi/full/10.1002/fsn3.1809', source_status: 'CURRENT', last_verified_at: '2026-09-07' }
  ];

  function allSources() { return SOURCES.slice(); }
  function getById(id) {
    for (var i = 0; i < SOURCES.length; i++) if (SOURCES[i].source_id === id) return SOURCES[i];
    return null;
  }

  var NutritionKnowledgeSources = { REGISTRY_VERSION: REGISTRY_VERSION, SOURCES: SOURCES, allSources: allSources, getById: getById };
  return NutritionKnowledgeSources;
}));
