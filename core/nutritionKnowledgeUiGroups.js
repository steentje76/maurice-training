/* core/nutritionKnowledgeUiGroups.js — NK-02.
 *
 * ZUIVER PRESENTATIE: tab/groep-indeling voor de mobiele Kennis-UI.
 * Bevat GEEN claim-tekst, GEEN evidence, GEEN FAQ-antwoorden -- alleen
 * section_id-referenties naar het bevroren NK-01-model
 * (nutritionKnowledgeTopics.js, ongewijzigd) plus korte, generieke
 * navigatielabels ("Basis", "Praktisch", ...). Content Freeze (NK-02
 * sectie 14) blijft dus volledig intact: dit bestand herschrijft geen
 * enkele titel of body-tekst, het ordent alleen.
 *
 * TABS (vast, per topic): Overzicht, Praktisch, Verdieping, FAQ,
 * Wetenschap. FAQ en Wetenschap zijn geen accordion-groepen maar eigen
 * views (elders al bestaand in nutritionKnowledgeService.js/index.html),
 * hier alleen als tab-label opgenomen zodat de segmented nav voor beide
 * topics identiek is opgebouwd (sectie 15.P: zelfde componentstructuur).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionKnowledgeUiGroups = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MODEL_VERSION = 'nutrition_knowledge_ui_groups.v1';
  var TAB_IDS = ['overzicht', 'praktisch', 'verdieping', 'faq', 'wetenschap'];

  var TOPIC_GROUPS = {
    CREATINE: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['wat-is-het', 'wat-doet-het', 'effect-prestatie', 'kracht-vermogen', 'sportcontext'] },
      { group_id: 'praktisch', group_label: 'Gebruik', section_ids: ['gebruik-onderzocht', 'laadfase', 'timing', 'wat-merk-je', 'gewicht-water'] },
      { group_id: 'verdieping', group_label: 'Veiligheid & verdieping', section_ids: ['spiermassa', 'veiligheid', 'creatinine-nuance', 'medische-afstemming', 'misverstanden'] }
    ],
    PROTEIN: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['wat-zijn-eiwitten', 'aminozuren', 'waarom-nodig', 'eiwit-sport'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['totale-inname', 'verdeling-dag', 'rond-training', 'eiwitkwaliteit', 'spieropbouw', 'herstel'] },
      { group_id: 'verdieping', group_label: 'Voedingskeuzes & verdieping', section_ids: ['dierlijk-plantaardig', 'vegetarisch-vegan', 'energietekort', 'eiwit-spieropbouw-hoog', 'shake-noodzakelijk', 'misverstanden'] }
    ]
  };

  /* Tabtoewijzing: 'overzicht' en 'praktisch' zijn eigen tabs; 'verdieping'
   * is de derde accordion-tab; 'faq' en 'wetenschap' zijn losse, al
   * bestaande views (geen accordion-groepen). */
  var TAB_TO_GROUP_ID = { overzicht: 'basis', praktisch: 'praktisch', verdieping: 'verdieping' };

  function getGroupsForTopic(topicId) { return (TOPIC_GROUPS[topicId] || []).slice(); }
  function getGroupForTab(topicId, tabId) {
    var groupId = TAB_TO_GROUP_ID[tabId];
    if (!groupId) return null;
    return getGroupsForTopic(topicId).filter(function (g) { return g.group_id === groupId; })[0] || null;
  }
  function allGroupedSectionIds(topicId) {
    var ids = [];
    getGroupsForTopic(topicId).forEach(function (g) { g.section_ids.forEach(function (id) { ids.push(id); }); });
    return ids;
  }

  var NutritionKnowledgeUiGroups = {
    MODEL_VERSION: MODEL_VERSION,
    TAB_IDS: TAB_IDS,
    TOPIC_GROUPS: TOPIC_GROUPS,
    getGroupsForTopic: getGroupsForTopic,
    getGroupForTab: getGroupForTab,
    allGroupedSectionIds: allGroupedSectionIds
  };

  return NutritionKnowledgeUiGroups;
}));
