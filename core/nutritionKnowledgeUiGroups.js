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
    ],
    CARBOHYDRATES: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['wat-zijn-koolhydraten', 'functies-energiebron', 'rol-bij-inspanning', 'glycogeenbeschikbaarheid', 'herstel'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['voedingsbronnen-kwaliteit', 'koolhydraten-voor-training', 'koolhydraten-tijdens-training', 'koolhydraten-na-training', 'vrije-suikers'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['eenvoudig-complex-gi', 'low-carb-context', 'endurance-versus-kracht', 'gut-training-gi-tolerantie', 'misverstanden'] }
    ],
    FATS: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['wat-zijn-vetten', 'functies', 'essentiele-vetzuren', 'verzadigd-onverzadigd', 'omega-3-omega-6'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['vetoplosbare-vitaminen', 'voedingsbronnen', 'sportcontext', 'energie-inname', 'timing-rond-training'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['vet-en-gezondheid', 'extreem-vetarme-voeding', 'claims-vetverbranding', 'vet-versus-lichaamsvet', 'misverstanden'] }
    ],
    ENERGY: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['energie-uit-voeding', 'kcal-kj', 'energiebalans', 'inname-versus-verbruik'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['onderhoud', 'energietekort', 'energieoverschot', 'lichaamssamenstelling', 'sportprestatie-herstel'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['bmr-rmr-tdee', 'lage-energiebeschikbaarheid', 'red-s', 'onzekerheid-energieverbruik', 'wearable-schattingen'] }
    ],
    FIBRE: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['wat-zijn-vezels', 'typen-vezels', 'darmfunctie', 'gezondheid'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['verzadiging', 'voedingsbronnen', 'volkoren', 'groente-fruit', 'peulvruchten'] },
      { group_id: 'verdieping', group_label: 'Sportcontext & verdieping', section_ids: ['geleidelijk-verhogen', 'vochtcontext', 'sportcontext', 'vezels-voor-wedstrijd', 'individuele-tolerantie', 'supplementvezels'] }
    ],
    HEALTHY_EATING: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['wat-bedoelen-we', 'patroon-boven-product', 'variatie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['groente', 'fruit', 'volkoren', 'peulvruchten', 'eiwitbronnen', 'vetkwaliteit', 'vrije-suikers', 'zout-natrium'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['bewerkte-voeding', 'energiedichtheid', 'sportvoeding-past', 'flexibiliteit'] }
    ],
    PRE_TRAINING: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['doel-pre-exercise', 'beschikbare-energie', 'koolhydraatbeschikbaarheid', 'koolhydraatcontext', 'eiwitcontext'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['timing', 'maaltijd-versus-snack', 'vetcontext', 'vezelcontext', 'hydratatie-crosslink'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['training-vroeg-ochtend', 'kort-versus-lang', 'hoge-lage-intensiteit', 'individuele-tolerantie', 'algemeen-versus-pre-workout'] }
    ],
    DURING_TRAINING: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['wanneer-relevant', 'inspanningsduur', 'intensiteit', 'koolhydraten-tijdens', 'mondspoeling'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['dertig-zestig-context', 'hogere-intake-langere-inspanning', 'sportdrank-gel-vast', 'gi-tolerantie', 'gut-training'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['glucose-fructose-mtc', 'tot-90-correct-onderbouwd', 'hogere-innames-120', 'individuele-verschillen', 'wedstrijd-versus-training'] }
    ],
    POST_TRAINING: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['doelen-herstelvoeding', 'totale-daginname', 'glycogeenherstel', 'koolhydraten'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['eiwit', 'vocht-crosslink', 'timing', 'maaltijd-versus-shake'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['snelle-aanvulling-relevant', 'meerdere-trainingen-dag', 'lange-versus-korte-turnaround', 'totale-voedingskwaliteit', 'slaap-herstel'] }
    ],
    ENDURANCE_CARB: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['glycogeen', 'duur-intensiteit', 'exogene-koolhydraten', 'koolhydraatoxidatie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['mtc', 'gi-tolerantie', 'gut-training', 'vloeibaar-versus-vast'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['wedstrijdstrategie', 'training-van-strategie', 'carb-loading', 'carb-loading-gewicht', 'beperkingen-hoge-innames'] }
    ],
    MUSCLE_GAIN: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['resistance-training-primair', 'voldoende-energie', 'eiwitinname', 'totale-dagelijkse-inname'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['verdeling', 'eiwitkwaliteit', 'timing-nuance', 'koolhydraten-trainingskwaliteit'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['energietekort-versus-spieropbouw', 'supplementen-niet-noodzakelijk', 'creatine-crosslink', 'meer-eiwit-niet-onbeperkt'] }
    ],
    FAT_LOSS_SPORT: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['energiebalans', 'duurzaam-tekort', 'behoud-trainingskwaliteit'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['eiwitcontext', 'resistance-training-context', 'snelheid-gewichtsverlies', 'behoud-vetvrije-massa'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['sportprestatie', 'herstel', 'lage-energiebeschikbaarheid', 'red-s', 'dieetkwaliteit', 'haalbaarheid'] }
    ],
    HYDRATION: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['vochtbalans-en-sport', 'zweten', 'dehydratie', 'individuele-verschillen'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['hydratatie-voor-inspanning', 'hydratatie-tijdens-inspanning', 'hydratatie-na-inspanning', 'zweetverlies-inschatten', 'sportdranken'] },
      { group_id: 'verdieping', group_label: 'Veiligheid & verdieping', section_ids: ['overdrinken-eah', 'drink-naar-dorst', 'noodgeval-herkennen', 'elektrolyten-en-natrium', 'hitte-en-omgeving'] }
    ],
    IRON: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['wat-is-ijzer', 'prevalentie', 'diagnose'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['afkapwaarden', 'bij-vastgesteld-tekort', 'bij-normale-status'] },
      { group_id: 'verdieping', group_label: 'Veiligheid & verdieping', section_ids: ['veiligheid', 'geen-zelfdiagnose'] }
    ],
    VITAMIN_D: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['wat-is-vitamine-d', 'richtlijn-scope', 'diagnose'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['bij-tekort'] },
      { group_id: 'verdieping', group_label: 'Veiligheid & verdieping', section_ids: ['veiligheid', 'geen-zelfdiagnose'] }
    ],
    CALCIUM: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie', 'voedingsbronnen'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['supplementen-context'] },
      { group_id: 'verdieping', group_label: 'Sportcontext & verdieping', section_ids: ['sportcontext-red-s'] }
    ],
    MAGNESIUM: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie', 'veiligheid'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['spierkramp', 'prestatie-sporters'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['misverstanden'] }
    ],
    ZINC: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['restrictief-voedingspatroon'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['testosteron-hype', 'misverstanden'] }
    ],
    VITAMIN_B12: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['veganisme'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['diagnose'] }
    ],
    FOLATE: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['voedingsbronnen'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['bovengrens'] }
    ],
    IODINE: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['balans'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['diagnose'] }
    ],
    SODIUM_BICARBONATE: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['prestatie'] },
      { group_id: 'verdieping', group_label: 'Veiligheid', section_ids: ['veiligheid'] }
    ],
    NITRATE_BEETROOT: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['prestatie'] },
      { group_id: 'verdieping', group_label: 'Veiligheid', section_ids: ['veiligheid'] }
    ],
    CITRULLINE: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['prestatie'] },
      { group_id: 'verdieping', group_label: 'Veiligheid', section_ids: ['veiligheid'] }
    ],
    OMEGA_3: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['herstel'] },
      { group_id: 'verdieping', group_label: 'Veiligheid', section_ids: ['veiligheid'] }
    ],
    EAA: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['context'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: [] }
    ],
    BCAA: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['context'] },
      { group_id: 'verdieping', group_label: 'Beperking', section_ids: ['beperking'] }
    ],
    COLLAGEN: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['spieropbouw'] },
      { group_id: 'verdieping', group_label: 'Veiligheid', section_ids: ['veiligheid'] }
    ],
    MULTIVITAMIN: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['prestatie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['context'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: [] }
    ],
    TART_CHERRY: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['herstel'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['veiligheid'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: [] }
    ],
    ANTIOXIDANTS_CE: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['trainingsaanpassing'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['voeding'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: [] }
    ],
    THEANINE: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['functie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['slaap'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: [] }
    ],
    ASHWAGANDHA: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['prestatie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['dosering'] },
      { group_id: 'verdieping', group_label: 'Veiligheid', section_ids: ['veiligheid'] }
    ],
    TESTOSTERONE_BOOSTER: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['categorie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['ingredienten'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: [] }
    ],
    FAT_BURNER: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['categorie'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['energiebalans'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: [] }
    ],
    DHEA: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['status'] }
    ],
    DMAA: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['status'] }
    ],
    DMBA: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['status'] }
    ],
    PROHORMONES: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['status'] }
    ],
    STIMULANT_ADULTERANTS: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['risico'] }
    ],
    UNDECLARED_CONTAMINATION: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['certificering'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['triage'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: [] }
    ],
    CAFFEINE: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['duurprestatie', 'kracht', 'individuele-verschillen'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['dosering', 'timing'] },
      { group_id: 'verdieping', group_label: 'Veiligheid & verdieping', section_ids: ['slaap', 'veiligheid', 'zwangerschap', 'interacties'] }
    ],
    BETA_ALANINE: [
      { group_id: 'basis', group_label: 'Basis', section_ids: ['kerneffect', 'bredere-context'] },
      { group_id: 'praktisch', group_label: 'Praktisch', section_ids: ['dosering', 'bijwerking'] },
      { group_id: 'verdieping', group_label: 'Verdieping', section_ids: ['geen-krachteffect', 'langere-duur', 'veiligheid'] }
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
