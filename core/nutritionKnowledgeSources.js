/* core/nutritionKnowledgeSources.js — NK-01/NK-03.
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
    { source_id: 'DIAAS-HERREMAN-2020', title: 'Comprehensive overview of the quality of plant- and animal-sourced proteins based on the digestible indispensable amino acid score', authors_or_organisation: 'Herreman L, Nommensen P, Pennings B, Laus MC', publication_date: '2020-08-25', source_type: 'review', doi: '10.1002/fsn3.1809', official_url: 'https://onlinelibrary.wiley.com/doi/full/10.1002/fsn3.1809', source_status: 'CURRENT', last_verified_at: '2026-09-07' },
    // ── NK-03: basisvoeding (koolhydraten/vetten/energie/vezels/gezonde voeding) ──
    { source_id: 'WHO-CARBOHYDRATE-2023', title: 'Carbohydrate intake for adults and children: WHO guideline', authors_or_organisation: 'World Health Organization', publication_date: '2023-07-17', source_type: 'official_guideline', doi: null, official_url: 'https://iris.who.int/server/api/core/bitstreams/e6945e76-e34f-41d3-bd3d-bbd13ea99808/content', source_status: 'CURRENT', last_verified_at: '2026-09-07' },
    { source_id: 'WHO-TOTALFAT-2023', title: 'Total fat intake for the prevention of unhealthy weight gain in adults and children: WHO guideline', authors_or_organisation: 'World Health Organization', publication_date: '2023-07-17', source_type: 'official_guideline', doi: null, official_url: 'https://www.ncbi.nlm.nih.gov/books/NBK594740/', source_status: 'CURRENT', last_verified_at: '2026-09-07' },
    { source_id: 'WHO-SFA-TFA-2023', title: 'Saturated fatty acid and trans-fatty acid intake for adults and children: WHO guideline', authors_or_organisation: 'World Health Organization', publication_date: '2023-07-17', source_type: 'official_guideline', doi: null, official_url: 'https://www.ncbi.nlm.nih.gov/books/NBK594769/', source_status: 'CURRENT', last_verified_at: '2026-09-07' },
    { source_id: 'WHO-SUGARS-2015', title: 'Guideline: Sugars intake for adults and children', authors_or_organisation: 'World Health Organization', publication_date: '2015-03-04', source_type: 'official_guideline', doi: null, official_url: 'https://www.who.int/publications/i/item/WHO-NMH-NHD-15.3', source_status: 'CURRENT', last_verified_at: '2026-09-07' },
    { source_id: 'FAO-WHO-UNU-ENERGY-2004', title: 'Human energy requirements: Report of a Joint FAO/WHO/UNU Expert Consultation', authors_or_organisation: 'Joint FAO/WHO/UNU Expert Consultation', publication_date: '2004-01-01', source_type: 'official_report', doi: null, official_url: 'https://www.fao.org/4/y5686e/y5686e00.htm', source_status: 'CURRENT', last_verified_at: '2026-09-07' },
    { source_id: 'SHCHERBINA-WEARABLE-2017', title: 'Accuracy in Wrist-Worn, Sensor-Based Measurements of Heart Rate and Energy Expenditure in a Diverse Cohort', authors_or_organisation: 'Shcherbina A, Mattsson CM, Waggott D, Salisbury H, Christle JW, Hastie T, Wheeler MT, Ashley EA', publication_date: '2017-05-24', source_type: 'validation_study', doi: '10.3390/jpm7020003', official_url: 'https://www.mdpi.com/2075-4426/7/2/3', source_status: 'CURRENT', last_verified_at: '2026-09-07' },
    { source_id: 'WHO-HEALTHY-DIET-2020', title: 'Healthy diet (fact sheet)', authors_or_organisation: 'World Health Organization', publication_date: '2020-04-29', source_type: 'official_factsheet', doi: null, official_url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet', source_status: 'CURRENT', last_verified_at: '2026-09-07' },
    { source_id: 'NAUDE-LOWCARB-META-2014', title: 'Low Carbohydrate versus Isoenergetic Balanced Diets for Reducing Weight and Cardiovascular Risk: A Systematic Review and Meta-Analysis', authors_or_organisation: 'Naude CE, Schoonees A, Senekal M, Young T, Garner P, Volmink J', publication_date: '2014-07-09', source_type: 'systematic_review', doi: '10.1371/journal.pone.0100652', official_url: 'https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0100652', source_status: 'CURRENT', last_verified_at: '2026-09-07' },
    // ── NK-04: sportvoeding (voor/tijdens/na training, langdurige inspanning, spieropbouw, vetverlies) ──
    { source_id: 'JEUKENDRUP-ENDURANCE-2011', title: 'Nutrition for endurance sports: Marathon, triathlon, and road cycling', authors_or_organisation: 'Jeukendrup AE', publication_date: '2011-09-15', source_type: 'review', doi: '10.1080/02640414.2011.610348', official_url: 'https://www.tandfonline.com/doi/full/10.1080/02640414.2011.610348', source_status: 'CURRENT', last_verified_at: '2026-09-07' },
    { source_id: 'DELANY-BODYCOMP-SCOPING-2025', title: 'Dietary Recommendations for Body Mass and Composition Manipulation in Male and Female Athletes: a Scoping Review of Consensus Statements, Position Stands and Practice Guidelines from International Expert Groups', authors_or_organisation: 'Delany LV, Costello N, Jones B, Backhouse SH', publication_date: '2025-08-21', source_type: 'scoping_review', doi: '10.1007/s40279-025-02285-4', official_url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12513969/', source_status: 'CURRENT', last_verified_at: '2026-09-07' }
  ];

  function allSources() { return SOURCES.slice(); }
  function getById(id) {
    for (var i = 0; i < SOURCES.length; i++) if (SOURCES[i].source_id === id) return SOURCES[i];
    return null;
  }

  var NutritionKnowledgeSources = { REGISTRY_VERSION: REGISTRY_VERSION, SOURCES: SOURCES, allSources: allSources, getById: getById };
  return NutritionKnowledgeSources;
}));
