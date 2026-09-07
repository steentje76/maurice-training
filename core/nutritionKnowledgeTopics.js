/* core/nutritionKnowledgeTopics.js — NK-01.
 *
 * Gedeeld topic-model voor zowel SUPPLEMENT- als NUTRITION-domein
 * (sectie 2 van de opdracht: één model, geen twee losse
 * kennissystemen). Puur data: elke sectie/FAQ-item bevat begrijpelijke,
 * ZELF GESCHREVEN tekst (nooit letterlijk overgenomen van een andere
 * app) plus evidence_refs -- ids die door
 * nutritionKnowledgeService.js worden opgelost tegen OFWEL
 * nutritionKnowledgeEvidenceRegistry.js OFWEL (voor reeds
 * gecertificeerde supplementclaims) nutritionSupplementEvidenceRegistry.js.
 * CONTENT != EVIDENCE: de tekst hieronder legt uit; de evidence_refs
 * bepalen wat daadwerkelijk feitelijk onderbouwd getoond mag worden in
 * niveau 3 ("Wetenschap") en aan de AI.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionKnowledgeTopics = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MODEL_VERSION = 'nutrition_knowledge_topics.v1';
  var DOMAINS = ['SUPPLEMENT', 'NUTRITION'];

  var TOPICS = [
    {
      topic_id: 'CREATINE',
      domain: 'SUPPLEMENT',
      display_name: 'Creatine',
      quick_summary_evidence_ref: 'CRE-PERF-001', // niveau 1 "sterk onderbouwd"-label komt hieruit, geen losse tekst
      quick_summary_text: 'Een van de best onderzochte supplementen in de sportvoeding, met consistent bewijs voor kracht- en vermogensverbetering.',
      sections: [
        { section_id: 'wat-is-het', title: 'Wat is creatine?', body: 'Creatine is een stof die je lichaam gedeeltelijk zelf aanmaakt en die ook in vlees en vis voorkomt. Het grootste deel wordt opgeslagen in je spieren.', evidence_refs: ['NK-CRE-DEF-001'] },
        { section_id: 'wat-doet-het', title: 'Wat doet het in het lichaam?', body: 'In je spieren fungeert creatine als een snelle energiebuffer, vooral bruikbaar tijdens korte, explosieve inspanning.', evidence_refs: ['NK-CRE-MECH-001'] },
        { section_id: 'effect-prestatie', title: 'Effect op sportprestatie', body: 'Creatine is een van de best onderbouwde ergogene supplementen: het verbetert consistent herhaalde, hoge-intensiteitsinspanning.', evidence_refs: ['CRE-PERF-001'] },
        { section_id: 'kracht-vermogen', title: 'Kracht en vermogen', body: 'Naast prestatie bij herhaalde sprints, is er ook sterk bewijs voor verbetering van maximale kracht en vermogen.', evidence_refs: ['CRE-STR-001'] },
        { section_id: 'spiermassa', title: 'Spiermassa / trainingsadaptatie', body: 'Creatine kan spiermassatoename ondersteunen, maar uitsluitend in combinatie met krachttraining -- het is geen vervanging daarvoor.', evidence_refs: ['CRE-MASS-001'] },
        { section_id: 'sportcontext', title: 'Voor welke sportcontext is het relevant?', body: 'Het meest relevant voor kracht-, vermogen- en herhaalde-sprintsporten; minder onderzocht/relevant voor puur duuraspecten.', evidence_refs: ['CRE-PERF-001', 'CRE-STR-001'] },
        { section_id: 'gebruik-onderzocht', title: 'Gebruik zoals onderzocht', body: 'In onderzoek wordt doorgaans een oplaadfase gevolgd door een onderhoudsdosis gebruikt. Dit is EDUCATION over wat er onderzocht is -- geen persoonlijk voorschrift.', evidence_refs: ['CRE-DOSE-001', 'CRE-DOSE-002'] },
        { section_id: 'laadfase', title: 'Laadfase versus geen laadfase', body: 'Een laadfase versnelt verzadiging van de spiervoorraad; zonder laadfase bereik je hetzelfde eindresultaat, alleen langzamer.', evidence_refs: ['CRE-DOSE-001', 'CRE-DOSE-002'] },
        { section_id: 'timing', title: 'Timing', body: 'Het exacte tijdstip van inname lijkt weinig uit te maken -- consistentie is belangrijker dan precieze timing.', evidence_refs: ['CRE-TIME-001'] },
        { section_id: 'wat-merk-je', title: 'Wat kun je merken?', body: 'Sommige mensen merken een lichte gewichtstoename in de eerste weken; prestatie-effecten zijn meestal geleidelijker merkbaar.', evidence_refs: ['NK-CRE-WEIGHT-001'] },
        { section_id: 'gewicht-water', title: 'Gewicht/water', body: 'Vroege gewichtstoename is vrijwel altijd water in de spiercellen, geen vet. Dit is een normaal, onschuldig effect.', evidence_refs: ['NK-CRE-WEIGHT-001'] },
        { section_id: 'veiligheid', title: 'Veiligheid', body: 'Bij gezonde volwassenen is creatine op de aanbevolen dosis veilig, ook bij langdurig gebruik. Cyclen is niet nodig.', evidence_refs: ['CRE-SAFE-001', 'NK-CRE-CYCLE-001'] },
        { section_id: 'creatinine-nuance', title: 'Creatinine/nierfunctie-nuance', body: 'Creatine kan de uitslag van een creatinine-gebaseerde nierfunctietest beïnvloeden, zonder dat dit nierschade betekent bij gezonde mensen. Vertel je arts dat je creatine gebruikt als je getest wordt.', evidence_refs: ['CRE-SAFE-002'] },
        { section_id: 'medische-afstemming', title: 'Wanneer medische afstemming nodig is', body: 'Bij een bestaande nierziekte is onvoldoende data beschikbaar -- overleg dan eerst met een arts.', evidence_refs: ['CRE-CONTRA-001'] },
        { section_id: 'misverstanden', title: 'Veelgemaakte misverstanden', body: 'Creatine is geen steroïde of hormoon, cyclen is niet nodig, en een hogere creatinine-waarde bewijst geen nierschade.', evidence_refs: ['NK-CRE-MISC-001', 'NK-CRE-CYCLE-001', 'CRE-SAFE-002'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder -- elk antwoord is gekoppeld aan dezelfde gecertificeerde claims als de rest van dit dossier.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen, met titel, organisatie/auteurs en jaar.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'CRE-FAQ-CYCLEN', question: 'Moet ik creatine cyclen?', evidence_refs: ['NK-CRE-CYCLE-001'] },
        { faq_id: 'CRE-FAQ-LAADFASE', question: 'Is een laadfase nodig?', evidence_refs: ['CRE-DOSE-001', 'CRE-DOSE-002'] },
        { faq_id: 'CRE-FAQ-ZWAARDER', question: 'Word je zwaarder van creatine?', evidence_refs: ['NK-CRE-WEIGHT-001'] },
        { faq_id: 'CRE-FAQ-KRACHTSPORT', question: 'Is creatine alleen voor krachtsport?', evidence_refs: ['CRE-PERF-001', 'CRE-STR-001'] },
        { faq_id: 'CRE-FAQ-WANNEER', question: 'Wanneer neem je creatine?', evidence_refs: ['CRE-TIME-001'] },
        { faq_id: 'CRE-FAQ-CREATININE', question: 'Is creatinine hetzelfde als nierschade?', evidence_refs: ['CRE-SAFE-002'] }
      ]
    },
    {
      topic_id: 'PROTEIN',
      domain: 'NUTRITION',
      display_name: 'Eiwitten',
      quick_summary_evidence_ref: 'PROT-TOTAL-001',
      quick_summary_text: 'Sterk onderbouwd voor relevante sportcontexten: voldoende, over de dag verdeeld eiwit ondersteunt spieropbouw en -herstel.',
      sections: [
        { section_id: 'wat-zijn-eiwitten', title: 'Wat zijn eiwitten?', body: 'Eiwit is een van de drie hoofdvoedingsstoffen. Het is opgebouwd uit aminozuren en heeft veel functies, van spieropbouw tot je afweersysteem.', evidence_refs: ['NK-PROT-DEF-001'] },
        { section_id: 'aminozuren', title: 'Aminozuren', body: 'Van de ongeveer 20 aminozuren zijn er 9 essentieel -- die moet je uit voeding halen, omdat je lichaam ze niet zelf maakt.', evidence_refs: ['NK-PROT-AA-001'] },
        { section_id: 'waarom-nodig', title: 'Waarom heeft het lichaam eiwit nodig?', body: 'Eiwit is nodig voor onderhoud en opbouw van weefsel. Voor de algemene, niet-sportende bevolking geldt een basisbehoefte van circa 0,8 g/kg/dag.', evidence_refs: ['NK-PROT-RDA-001'] },
        { section_id: 'eiwit-sport', title: 'Eiwit en sport', body: 'Sporters hebben doorgaans meer eiwit nodig dan de algemene bevolking: onderzoek bij sporters wijst op circa 1,4-2,0 g/kg/dag.', evidence_refs: ['PROT-TOTAL-001'] },
        { section_id: 'spieropbouw', title: 'Spieropbouw', body: 'Per portie is 20-40 g hoogwaardig eiwit (of 0,25 g/kg) genoeg om de spiereiwitsynthese te maximaliseren.', evidence_refs: ['PROT-DOSE-001'] },
        { section_id: 'herstel', title: 'Herstel', body: 'Eiwit vóór het slapen (30-40 g caseïne) kan het nachtelijke herstel ondersteunen.', evidence_refs: ['PROT-SLEEP-001'] },
        { section_id: 'totale-inname', title: 'Totale dagelijkse inname', body: 'De totale hoeveelheid eiwit over de dag is voor de meeste doelen belangrijker dan het exacte tijdstip van een portie.', evidence_refs: ['PROT-TOTAL-001', 'PROT-TIMING-001'] },
        { section_id: 'verdeling-dag', title: 'Verdeling over de dag', body: 'Verspreid je eiwitinname, ongeveer elke 3-4 uur een portie, voor een gelijkmatige spiereiwitsynthese.', evidence_refs: ['PROT-DISTRIB-001'] },
        { section_id: 'rond-training', title: 'Eiwit rond training', body: 'Er is geen strikt "anaboel venster" van 30-60 minuten -- het effect van training op spiereiwitsynthese houdt veel langer aan.', evidence_refs: ['PROT-TIMING-001'] },
        { section_id: 'eiwitkwaliteit', title: 'Eiwitkwaliteit', body: 'Eiwitkwaliteit wordt o.a. gemeten met DIAAS; dierlijke bronnen scoren als los voedingsmiddel doorgaans iets hoger dan losse plantaardige bronnen.', evidence_refs: ['NK-PROT-QUALITY-001'] },
        { section_id: 'dierlijk-plantaardig', title: 'Dierlijke en plantaardige bronnen', body: 'Door verschillende plantaardige bronnen over de dag te combineren, vul je elkaars aminozuurprofiel goed aan -- dat hoeft niet per se in dezelfde maaltijd.', evidence_refs: ['NK-PROT-PLANT-001'] },
        { section_id: 'vegetarisch-vegan', title: 'Vegetarisch/vegan aandachtspunten', body: 'Let bij een plantaardig voedingspatroon op voldoende variatie en eventueel een iets hogere totale inname.', evidence_refs: ['NK-PROT-VEGAN-001'] },
        { section_id: 'energietekort', title: 'Eiwit tijdens energietekort', body: 'Bij caloriebeperking kan een hogere eiwitinname (2,3-3,1 g/kg) helpen spiermassa te behouden.', evidence_refs: ['PROT-HYPOCAL-001'] },
        { section_id: 'eiwit-spieropbouw-hoog', title: 'Eiwit bij spieropbouw', body: 'Bij intensieve krachttraining kan meer dan 3,0 g/kg/dag mogelijk gunstig zijn, al is dat bewijs nog beperkt.', evidence_refs: ['PROT-HIGH-001'] },
        { section_id: 'shake-noodzakelijk', title: 'Is een eiwitshake noodzakelijk?', body: 'Nee -- een eiwitsupplement is nooit noodzakelijk als je de totale dagdosis via gewone voeding haalt.', evidence_refs: ['PROT-NECESSITY-001'] },
        { section_id: 'misverstanden', title: 'Veelgemaakte misverstanden', body: 'Meer eiwit dan nodig levert geen extra spiermassa op zonder training, een shake is geen vereiste, en een strikt tijdvenster na training bestaat niet.', evidence_refs: ['PROT-NECESSITY-001', 'PROT-TIMING-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder -- elk antwoord is gekoppeld aan dezelfde gecertificeerde claims als de rest van dit dossier.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen, met titel, organisatie/auteurs en jaar.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'PROT-FAQ-HOEVEEL', question: 'Hoeveel eiwit hebben sporters nodig?', evidence_refs: ['PROT-TOTAL-001'] },
        { faq_id: 'PROT-FAQ-DIRECT-NA', question: 'Moet ik direct na training eiwit nemen?', evidence_refs: ['PROT-TIMING-001'] },
        { faq_id: 'PROT-FAQ-SHAKE', question: 'Is een eiwitshake nodig?', evidence_refs: ['PROT-NECESSITY-001'] },
        { faq_id: 'PROT-FAQ-TEVEEL', question: 'Kun je te veel eiwit eten?', evidence_refs: ['PROT-HIGH-001'] },
        { faq_id: 'PROT-FAQ-PLANTAARDIG', question: 'Zijn plantaardige eiwitten minder goed?', evidence_refs: ['NK-PROT-QUALITY-001', 'NK-PROT-PLANT-001'] },
        { faq_id: 'PROT-FAQ-ELKE-MAALTIJD', question: 'Moet iedere maaltijd eiwit bevatten?', evidence_refs: ['PROT-DISTRIB-001'] }
      ]
    }
  ];

  /* ROADMAP: sectie 17 -- inhoudelijke roadmap, GEEN gebouwde topics.
   * Uitsluitend classificatiedata, geen evidence/claims. */
  var ROADMAP = [
    { topic: 'Koolhydraten', priority: 'P0', note: 'CARB_GROUP-evidence bestaat al in de Supplement Evidence Registry; kennisdossier is grotendeels hergebruik.' },
    { topic: 'Vetten', priority: 'P0', note: 'Nog geen gecertificeerde evidence-basis; nieuw onderzoek nodig.' },
    { topic: 'Hydratatie', priority: 'P0', note: 'ELECTROLYTE_GROUP-evidence bestaat al; sterke EAH/veiligheidsnuance direct herbruikbaar.' },
    { topic: 'Energie (calorieën/energiebalans)', priority: 'P1', note: 'Basisconcept, geen sport-supplement-overlap.' },
    { topic: 'Gezonde voeding (algemeen)', priority: 'P1', note: 'Breed onderwerp, vereist eigen scopeafbakening.' },
    { topic: 'Vezels', priority: 'P1', note: 'Nog geen evidence-onderzoek gedaan.' },
    { topic: 'IJzer', priority: 'P0', note: 'IRON-evidence bestaat al volledig gecertificeerd in de Supplement Evidence Registry.' },
    { topic: 'Vitamine D', priority: 'P0', note: 'VITAMIN_D-evidence bestaat al volledig gecertificeerd in de Supplement Evidence Registry.' },
    { topic: 'Calcium', priority: 'P1', note: 'Catalogitem bestaat (CALCIUM, P1), nog geen gecertificeerde claims.' },
    { topic: 'Vitamine B12', priority: 'P1', note: 'Catalogitem bestaat (VITAMIN_B12, P1), nog geen gecertificeerde claims.' },
    { topic: 'Voeding voor training', priority: 'P1', note: 'Deels dekbaar via CARB_GROUP/PROT-timing-claims.' },
    { topic: 'Voeding tijdens training', priority: 'P0', note: 'CARB_GROUP-evidence bestaat al volledig gecertificeerd.' },
    { topic: 'Voeding na training', priority: 'P1', note: 'Deels dekbaar via PROT-TIMING-001/PROT-SLEEP-001.' },
    { topic: 'Spieropbouw (overkoepelend)', priority: 'P2', note: 'Zou CREATINE + PROTEIN-topics combineren; wacht op meer losse topics.' },
    { topic: 'Vetverlies', priority: 'P2', note: 'Gevoelig onderwerp, vereist extra zorgvuldige scope en medische grenzen.' },
    { topic: 'Vegetarisch/vegan (overkoepelend)', priority: 'P2', note: 'PROTEIN-topic bevat al een vegetarisch/vegan-sectie; overkoepelend topic is toekomstig werk.' },
    { topic: 'Supplementen (overige, P1-P3 catalogus)', priority: 'P2', note: 'Catalogus bestaat al (73 items); vereist per item nieuw evidence-onderzoek (Batch B/C/D/E).' }
  ];

  function allTopics() { return TOPICS.slice(); }
  function getTopic(topicId) {
    for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i].topic_id === topicId) return TOPICS[i];
    return null;
  }
  function isValidDomain(d) { return DOMAINS.indexOf(d) >= 0; }

  var NutritionKnowledgeTopics = {
    MODEL_VERSION: MODEL_VERSION,
    DOMAINS: DOMAINS,
    TOPICS: TOPICS,
    ROADMAP: ROADMAP,
    allTopics: allTopics,
    getTopic: getTopic,
    isValidDomain: isValidDomain
  };

  return NutritionKnowledgeTopics;
}));
