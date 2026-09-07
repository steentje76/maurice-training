/* core/nutritionKnowledgeEvidenceRegistry.js — NK-01.
 *
 * NIEUWE claims voor de Nutrition Knowledge & Evidence Platform --
 * uitsluitend content die nog niet gecertificeerd bestaat in
 * nutritionSupplementEvidenceRegistry.js. Sport-specifieke creatine-
 * en eiwitclaims (prestatie, dosering, timing, veiligheid) blijven
 * daar staan en worden door nutritionKnowledgeService.js via
 * cross-reference opgehaald -- NOOIT hier gedupliceerd met een
 * afwijkende formulering.
 *
 * Zelfde vocabulaire als de Supplement Evidence Registry (bewust GEEN
 * tweede, conflicterende schaal): evidence_level A-E,
 * status VERIFIED/INSUFFICIENT/REVISE/REMOVE.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./nutritionKnowledgeSources.js'));
  } else {
    root.NutritionKnowledgeEvidenceRegistry = factory(root.NutritionKnowledgeSources);
  }
}(typeof self !== 'undefined' ? self : this, function (KnowledgeSources) {
  'use strict';

  var REGISTRY_VERSION = 'nutrition_knowledge_evidence_registry.v1';
  var EVIDENCE_LEVELS = ['A', 'B', 'C', 'D', 'E'];
  var STATUSES = ['VERIFIED', 'INSUFFICIENT', 'REVISE', 'REMOVE'];

  var CLAIMS = [
    // ── CREATINE (nieuw, niet in Supplement Evidence Registry) ─────────
    { claim_id: 'NK-CRE-DEF-001', topic_id: 'CREATINE', domain: 'SUPPLEMENT', claim_text_internal: 'Creatine is een van nature in het lichaam voorkomende stof, gesynthetiseerd uit de aminozuren arginine, glycine en methionine (lever, nieren, pancreas), en wordt daarnaast via voeding (rood vlees, vis) binnengekregen. Circa 95% wordt opgeslagen in skeletspier.', user_friendly_summary: 'Creatine is geen kunstmatige of vreemde stof: je lichaam maakt het zelf, en het zit ook in vlees en vis. Het grootste deel wordt opgeslagen in je spieren.', evidence_level: 'A', population: 'algemeen', context: 'achtergrond/fysiologie', supported_outcomes: ['basiskennis'], limitations: [], source_ids: ['ISSN-CREATINE-2017'], last_reviewed: '2026-09-07', status: 'VERIFIED', allowed_ai_use: true, forbidden_interpretations: ['creatine is een kunstmatige/synthetische drug', 'creatine is een anabole steroïde'] },
    { claim_id: 'NK-CRE-MECH-001', topic_id: 'CREATINE', domain: 'SUPPLEMENT', claim_text_internal: 'Creatine wordt in spierweefsel omgezet naar fosfocreatine, dat dient als snel beschikbare energiebuffer voor de resynthese van ATP tijdens korte, zeer intensieve inspanning.', user_friendly_summary: 'In je spieren helpt creatine je lichaam om supersnel energie bij te vullen tijdens korte, zware inspanningen zoals sprinten of een zware herhaling.', evidence_level: 'A', population: 'algemeen', context: 'fysiologisch mechanisme', supported_outcomes: ['basiskennis'], limitations: [], source_ids: ['ISSN-CREATINE-2017'], last_reviewed: '2026-09-07', status: 'VERIFIED', allowed_ai_use: true, forbidden_interpretations: [] },
    { claim_id: 'NK-CRE-CYCLE-001', topic_id: 'CREATINE', domain: 'SUPPLEMENT', claim_text_internal: 'Er is geen wetenschappelijk bewijs dat cyclen (periodiek stoppen en herstarten) van creatinegebruik noodzakelijk of voordelig is; continu gebruik op de aanbevolen dosis is veilig en effectief op lange termijn.', user_friendly_summary: 'Je hoeft creatine niet af te wisselen met stopperiodes ("cyclen") -- continu gebruik werkt net zo goed en is niet minder veilig.', evidence_level: 'A', population: 'gezonde volwassenen', context: 'gebruikspatroon', supported_outcomes: ['geen noodzaak tot cyclen'], limitations: [], source_ids: ['ISSN-CREATINE-2017'], last_reviewed: '2026-09-07', status: 'VERIFIED', allowed_ai_use: true, forbidden_interpretations: ['cyclen is noodzakelijk voor effectiviteit', 'je lichaam went aan creatine waardoor het stopt met werken'] },
    { claim_id: 'NK-CRE-WEIGHT-001', topic_id: 'CREATINE', domain: 'SUPPLEMENT', claim_text_internal: 'Initiële gewichtstoename bij aanvang van creatinegebruik is vrijwel volledig toe te schrijven aan intracellulair watervasthouden (een normaal, osmotisch effect van het natrium-afhankelijke creatinetransport in de spiercel), niet aan vetopslag. Latere, blijvende gewichtsveranderingen komen primair van trainingsgedreven spiermassatoename.', user_friendly_summary: 'Merk je dat je iets zwaarder wordt als je met creatine begint? Dat is vooral extra water in je spieren, geen vet. Blijvende gewichtstoename op langere termijn komt van spiergroei door training.', evidence_level: 'B', population: 'algemeen', context: 'gewichtseffect', supported_outcomes: ['duiding van vroege gewichtstoename'], limitations: ['individuele variatie in de mate van watertoename'], source_ids: ['ISSN-CREATINE-2017'], last_reviewed: '2026-09-07', status: 'VERIFIED', allowed_ai_use: true, forbidden_interpretations: ['creatine laat je vet aankomen', 'gewichtstoename door creatine is altijd blijvend en ongewenst'] },
    { claim_id: 'NK-CRE-MISC-001', topic_id: 'CREATINE', domain: 'SUPPLEMENT', claim_text_internal: 'Creatine is geen anabole steroïde en geen hormoon; het is een van nature voorkomend, niet-hormonaal stikstofhoudend molecuul.', user_friendly_summary: 'Creatine wordt soms verward met doping of hormonen, maar dat is het niet -- het is een gewone, natuurlijke voedingsstof.', evidence_level: 'A', population: 'algemeen', context: 'veelgemaakt misverstand', supported_outcomes: ['correctie van een veelvoorkomend misverstand'], limitations: [], source_ids: ['ISSN-CREATINE-2017'], last_reviewed: '2026-09-07', status: 'VERIFIED', allowed_ai_use: true, forbidden_interpretations: ['creatine is een vorm van doping', 'creatine is een hormoonpreparaat'] },

    // ── EIWITTEN (nieuw, algemene voedingskennis) ──────────────────────
    { claim_id: 'NK-PROT-DEF-001', topic_id: 'PROTEIN', domain: 'NUTRITION', claim_text_internal: 'Eiwit (proteïne) is een macronutriënt opgebouwd uit ketens van aminozuren; het is een structurele bouwstof (o.a. spieren, huid, enzymen, hormonen, antilichamen).', user_friendly_summary: 'Eiwit is een van de drie hoofdvoedingsstoffen (naast koolhydraten en vet) en bestaat uit bouwstenen die aminozuren heten. Je lichaam gebruikt eiwit voor van alles: van spieren tot je afweersysteem.', evidence_level: 'A', population: 'algemeen', context: 'achtergrond/definitie', supported_outcomes: ['basiskennis'], limitations: [], source_ids: ['WHO-FAO-UNU-PROTEIN-2007'], last_reviewed: '2026-09-07', status: 'VERIFIED', allowed_ai_use: true, forbidden_interpretations: [] },
    { claim_id: 'NK-PROT-AA-001', topic_id: 'PROTEIN', domain: 'NUTRITION', claim_text_internal: 'Van de circa 20 aminozuren die eiwitten opbouwen, zijn er 9 essentieel: het lichaam kan ze niet zelf aanmaken en ze moeten via voeding worden verkregen.', user_friendly_summary: 'Er zijn 9 "essentiële" aminozuren die je alleen via voeding binnenkrijgt -- je lichaam kan ze niet zelf maken.', evidence_level: 'A', population: 'algemeen', context: 'achtergrond/definitie', supported_outcomes: ['basiskennis'], limitations: [], source_ids: ['WHO-FAO-UNU-PROTEIN-2007'], last_reviewed: '2026-09-07', status: 'VERIFIED', allowed_ai_use: true, forbidden_interpretations: [] },
    { claim_id: 'NK-PROT-RDA-001', topic_id: 'PROTEIN', domain: 'NUTRITION', claim_text_internal: 'Voor de algemene, niet-sportende volwassen bevolking geldt een gemiddelde eiwitbehoefte van circa 0,66 g/kg/dag en een "veilig niveau" (RDA-equivalent) van circa 0,83 g/kg/dag, gebaseerd op stikstofbalansonderzoek.', user_friendly_summary: 'Voor de gemiddelde, niet-sportende volwassene ligt de aanbevolen eiwitinname rond 0,8 g per kg lichaamsgewicht per dag -- sporters hebben vaak meer nodig (zie de sportgerichte secties hieronder).', evidence_level: 'A', population: 'algemene, niet-sportende volwassenen', context: 'algemene voedingsbehoefte, GEEN sportcontext', supported_outcomes: ['stikstofbalans/onderhoud'], limitations: ['geldt niet voor sporters -- zie PROT-TOTAL-001 voor de sportgerichte 1,4-2,0 g/kg-range'], source_ids: ['WHO-FAO-UNU-PROTEIN-2007'], last_reviewed: '2026-09-07', status: 'VERIFIED', allowed_ai_use: true, forbidden_interpretations: ['0,8 g/kg is ook voor sporters voldoende', 'de algemene RDA en de sportrichtlijn zijn hetzelfde getal'] },
    { claim_id: 'NK-PROT-QUALITY-001', topic_id: 'PROTEIN', domain: 'NUTRITION', claim_text_internal: 'Eiwitkwaliteit wordt o.a. bepaald met de Digestible Indispensable Amino Acid Score (DIAAS), die aminozuursamenstelling en verteerbaarheid combineert. Dierlijke eiwitbronnen (vlees, ei, wei, caseïne) scoren als individueel voedingsmiddel doorgaans hoger dan de meeste individuele plantaardige bronnen.', user_friendly_summary: 'Niet alle eiwit is precies gelijkwaardig: dierlijke eiwitbronnen scoren op zichzelf vaak iets hoger op erkende kwaliteitsmaten dan losse plantaardige bronnen.', evidence_level: 'A', population: 'algemeen', context: 'eiwitkwaliteit', supported_outcomes: ['begrip van eiwitkwaliteitverschillen'], limitations: ['DIAAS meet individuele voedingsmiddelen; complete maaltijden/diëten complementeren elkaar (zie NK-PROT-PLANT-001)'], source_ids: ['DIAAS-HERREMAN-2020'], last_reviewed: '2026-09-07', status: 'VERIFIED', allowed_ai_use: true, forbidden_interpretations: ['plantaardig eiwit is waardeloos', 'alleen dierlijk eiwit telt mee'] },
    { claim_id: 'NK-PROT-PLANT-001', topic_id: 'PROTEIN', domain: 'NUTRITION', claim_text_internal: 'Combinatie van verschillende plantaardige eiwitbronnen (bv. peulvruchten met granen) over de dag verhoogt de gecombineerde aminozuurkwaliteit tot een niveau vergelijkbaar met dierlijke bronnen; combineren in exact dezelfde maaltijd is daarvoor niet vereist.', user_friendly_summary: 'Eet je vooral plantaardig? Door verschillende plantaardige eiwitbronnen over de dag te verspreiden (bv. peulvruchten en granen), vul je elkaars aminozuren goed aan -- dat hoeft niet per se in één maaltijd.', evidence_level: 'B', population: 'algemeen, met name plantaardig etende mensen', context: 'eiwitkwaliteit/vegetarisch-veganistisch', supported_outcomes: ['complementaire eiwitstrategie'], limitations: [], source_ids: ['DIAAS-HERREMAN-2020'], last_reviewed: '2026-09-07', status: 'VERIFIED', allowed_ai_use: true, forbidden_interpretations: ['je moet elke maaltijd complementaire eiwitten combineren'] },
    { claim_id: 'NK-PROT-VEGAN-001', topic_id: 'PROTEIN', domain: 'NUTRITION', claim_text_internal: 'Bij een overwegend of volledig plantaardig voedingspatroon kan een enigszins hogere totale eiwitinname en aandacht voor voldoende variatie in eiwitbronnen aangewezen zijn, om eventuele lagere individuele eiwitkwaliteit te compenseren.', user_friendly_summary: 'Eet je vegetarisch of veganistisch? Let dan op voldoende variatie en eventueel een iets hogere totale eiwitinname om kwaliteitsverschillen te compenseren.', evidence_level: 'C', population: 'vegetariërs/veganisten', context: 'vegetarisch/veganistisch', supported_outcomes: ['aandachtspunt bij plantaardig voedingspatroon'], limitations: ['contextafhankelijk, geen vaste extra hoeveelheid gecertificeerd'], source_ids: ['DIAAS-HERREMAN-2020', 'WHO-FAO-UNU-PROTEIN-2007'], last_reviewed: '2026-09-07', status: 'VERIFIED', allowed_ai_use: true, forbidden_interpretations: ['plantaardig eten betekent automatisch een eiwittekort'] }
  ];

  function isValidLevel(l) { return EVIDENCE_LEVELS.indexOf(l) >= 0; }
  function isValidStatus(s) { return STATUSES.indexOf(s) >= 0; }
  /* confidenceLabel: GEEN los, los-instelbaar veld per claim (dat zou
   * kunnen gaan afwijken van evidence_level/status) -- uitsluitend een
   * vaste, deterministische afleiding, exact de vier toegestane labels
   * uit sectie 4 van de opdracht. Geen schijnprecisie (geen percentages). */
  function confidenceLabel(level, status) {
    if (status === 'INSUFFICIENT' || status === 'REVISE' || status === 'REMOVE') return 'Onvoldoende bewijs';
    if (level === 'A') return 'Sterk bewijs';
    if (level === 'B') return 'Redelijk bewijs';
    if (level === 'C') return 'Contextafhankelijk';
    return 'Onvoldoende bewijs';
  }
  function allClaims() { return CLAIMS.slice(); }
  function getById(id) {
    for (var i = 0; i < CLAIMS.length; i++) if (CLAIMS[i].claim_id === id) return CLAIMS[i];
    return null;
  }
  function byTopicId(topicId) { return CLAIMS.filter(function (c) { return c.topic_id === topicId; }); }

  var NutritionKnowledgeEvidenceRegistry = {
    REGISTRY_VERSION: REGISTRY_VERSION,
    EVIDENCE_LEVELS: EVIDENCE_LEVELS,
    STATUSES: STATUSES,
    CLAIMS: CLAIMS,
    isValidLevel: isValidLevel,
    isValidStatus: isValidStatus,
    confidenceLabel: confidenceLabel,
    allClaims: allClaims,
    getById: getById,
    byTopicId: byTopicId
  };

  return NutritionKnowledgeEvidenceRegistry;
}));
