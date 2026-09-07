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

  // ── NK-03: basisvoeding-topics (Koolhydraten, Vetten, Energie, Vezels, Gezonde voeding) ──
  var NK03_TOPICS = [
    {
      topic_id: 'CARBOHYDRATES',
      domain: 'NUTRITION',
      display_name: 'Koolhydraten',
      quick_summary_evidence_ref: 'NK-CARB-QUALITY-001',
      quick_summary_text: 'Koolhydraten zijn een belangrijke energiebron. Voor sporters is vooral de sportcontext (duur/intensiteit) relevant; voor gezondheid telt vooral de kwaliteit van de bron.',
      sections: [
        { section_id: 'wat-zijn-koolhydraten', title: 'Wat zijn koolhydraten?', body: 'Koolhydraten worden afgebroken tot glucose, de belangrijkste brandstof voor je lichaam en hersenen.', evidence_refs: ['NK-CARB-DEF-001'] },
        { section_id: 'functies-energiebron', title: 'Belangrijkste functies', body: 'Naast directe energie dient glucose als opslag (glycogeen) in spieren en lever voor later gebruik.', evidence_refs: ['NK-CARB-DEF-001'] },
        { section_id: 'rol-bij-inspanning', title: 'Rol bij inspanning', body: 'Bij langere of intensievere inspanning worden koolhydraten steeds belangrijker als brandstofbron.', evidence_refs: ['CARB-MID-001'] },
        { section_id: 'glycogeenbeschikbaarheid', title: 'Glycogeenbeschikbaarheid', body: 'Bij langere duurinspanning kan bijvullen tijdens het sporten nodig zijn omdat je glycogeenvoorraad beperkt is.', evidence_refs: ['CARB-LONG-001', 'CARB-ELITE-001'] },
        { section_id: 'herstel', title: 'Herstel', body: 'Na inspanning helpt koolhydraatinname om je glycogeenvoorraad weer aan te vullen.', evidence_refs: ['CARB-MID-001'] },
        { section_id: 'voedingsbronnen-kwaliteit', title: 'Voedingsbronnen en koolhydraatkwaliteit', body: 'Volkoren granen, groente, fruit en peulvruchten zijn de aanbevolen basisbronnen voor koolhydraten.', evidence_refs: ['NK-CARB-QUALITY-001'] },
        { section_id: 'koolhydraten-voor-training', title: 'Koolhydraten voor training', body: 'Bij kortere inspanning zijn koolhydraten vlak vooraf meestal niet nodig.', evidence_refs: ['CARB-SHORT-001'] },
        { section_id: 'koolhydraten-tijdens-training', title: 'Koolhydraten tijdens training', body: 'Bij langere duurinspanning is bijvullen tijdens het sporten onderzocht en kan het relevant zijn.', evidence_refs: ['CARB-MID-001', 'CARB-LONG-001'] },
        { section_id: 'koolhydraten-na-training', title: 'Koolhydraten na training', body: 'Na afloop helpt koolhydraatinname bij het herstellen van je energievoorraad.', evidence_refs: ['CARB-MID-001'] },
        { section_id: 'eenvoudig-complex-gi', title: 'Eenvoudige/complexe koolhydraten en glykemische index', body: 'De glykemische index kan nuttig zijn, maar zegt niet alles -- de voedingsmiddelbron en vezels tellen minstens zo zwaar mee.', evidence_refs: ['NK-CARB-GI-001'] },
        { section_id: 'low-carb-context', title: 'Low-carb in context', body: 'Low-carb-diëten geven vaak sneller resultaat, maar op langere termijn is er geen overtuigend voordeel t.o.v. een gewone, calorie-gecontroleerde manier van eten.', evidence_refs: ['NK-CARB-LOWCARB-001'] },
        { section_id: 'endurance-versus-kracht', title: 'Duursport versus krachtcontext', body: 'De behoefte aan koolhydraten tijdens inspanning hangt sterk af van duur en intensiteit van de activiteit.', evidence_refs: ['CARB-MID-001'] },
        { section_id: 'gut-training-gi-tolerantie', title: '"Gut training" en GI-tolerantie', body: 'Je spijsvertering kan wennen aan hogere koolhydraatinname tijdens sport -- dit is individueel en trainbaar.', evidence_refs: ['CARB-GI-001'] },
        { section_id: 'vrije-suikers', title: 'Vrije/toegevoegde suikers', body: 'Beperk toegevoegde suikers tot minder dan 10% van je totale energie-inname.', evidence_refs: ['NK-CARB-SUGAR-001'] },
        { section_id: 'misverstanden', title: 'Veelgemaakte misverstanden', body: 'Koolhydraten zijn niet inherent ongezond of dikmakend -- je totale energiebalans en de kwaliteit van de bron zijn bepalend.', evidence_refs: ['NK-CARB-NOTUNHEALTHY-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'CARB-FAQ-ONGEZOND', question: 'Zijn koolhydraten ongezond?', evidence_refs: ['NK-CARB-NOTUNHEALTHY-001'] },
        { faq_id: 'CARB-FAQ-DIK', question: 'Maken koolhydraten dik?', evidence_refs: ['NK-CARB-NOTUNHEALTHY-001'] },
        { faq_id: 'CARB-FAQ-KRACHT', question: 'Heb ik koolhydraten nodig voor krachttraining?', evidence_refs: ['CARB-MID-001'] },
        { faq_id: 'CARB-FAQ-VOOR-SPORT', question: 'Moet ik koolhydraten eten voor het sporten?', evidence_refs: ['CARB-SHORT-001'] },
        { faq_id: 'CARB-FAQ-SPORTDRANK', question: 'Wanneer zijn sportdranken nuttig?', evidence_refs: ['CARB-MID-001', 'CARB-LONG-001'] },
        { faq_id: 'CARB-FAQ-LOWCARB', question: 'Is low-carb beter voor vetverlies?', evidence_refs: ['NK-CARB-LOWCARB-001'] }
      ]
    },
    {
      topic_id: 'FATS',
      domain: 'NUTRITION',
      display_name: 'Vetten',
      quick_summary_evidence_ref: 'NK-FAT-NOTBAD-001',
      quick_summary_text: 'Vet is een essentiële voedingsstof, geen vijand. Het type vet en de context van je totale voedingspatroon bepalen de gezondheidsimpact.',
      sections: [
        { section_id: 'wat-zijn-vetten', title: 'Wat zijn voedingsvetten?', body: 'Vet is de meest energiedichte voedingsstof en bevat vetzuren die je lichaam voor veel processen nodig heeft.', evidence_refs: ['NK-FAT-DEF-001'] },
        { section_id: 'functies', title: 'Functies', body: 'Naast energie levert vet de bouwstenen voor celwanden, hormonen en andere lichaamsprocessen.', evidence_refs: ['NK-FAT-DEF-001'] },
        { section_id: 'essentiele-vetzuren', title: 'Essentiële vetzuren', body: 'Sommige vetzuren kan je lichaam niet zelf maken -- die moeten uit voeding komen.', evidence_refs: ['NK-FAT-DEF-001'] },
        { section_id: 'verzadigd-onverzadigd', title: 'Verzadigd/onverzadigd vet', body: 'Beperk verzadigd en transvet, en vervang deze bij voorkeur door onverzadigde vetten.', evidence_refs: ['NK-FAT-TYPES-001'] },
        { section_id: 'omega-3-omega-6', title: 'Omega-3/omega-6 context', body: 'Omega-3 en omega-6 zijn beide essentiële vetzuurfamilies met elk hun eigen rol.', evidence_refs: ['NK-FAT-TYPES-001'] },
        { section_id: 'vetoplosbare-vitaminen', title: 'Vetoplosbare vitaminen', body: 'Vet is nodig om de vitamines A, D, E en K goed op te nemen.', evidence_refs: ['NK-FAT-VITAMINS-001'] },
        { section_id: 'voedingsbronnen', title: 'Voedingsbronnen', body: 'Onverzadigde vetten vind je vooral in vis, noten, zaden en plantaardige oliën; verzadigd vet vooral in vet vlees en zuivel.', evidence_refs: ['NK-FAT-TYPES-001'] },
        { section_id: 'sportcontext', title: 'Sportcontext', body: 'Vet blijft ook voor sporters een normaal onderdeel van het voedingspatroon, naast koolhydraten en eiwit.', evidence_refs: ['NK-FAT-INTAKE-001'] },
        { section_id: 'energie-inname', title: 'Energie-inname', body: 'De totale vetinname ligt doorgaans tussen 15-20% (minimum) en circa 30% (maximum) van je energie-inname.', evidence_refs: ['NK-FAT-INTAKE-001'] },
        { section_id: 'vet-en-gezondheid', title: 'Vet en gezondheid', body: 'Vervanging van verzadigd/transvet door onverzadigd vet wordt geassocieerd met een lager cardiovasculair risico.', evidence_refs: ['NK-FAT-TYPES-001'] },
        { section_id: 'timing-rond-training', title: 'Timing rond training', body: 'Er is geen sterke reden om vet structureel te vermijden rond training; de totale dagelijkse inname is belangrijker.', evidence_refs: ['NK-FAT-INTAKE-001'] },
        { section_id: 'extreem-vetarme-voeding', title: 'Extreem vetarme voeding', body: 'Te weinig vet (onder het aanbevolen minimum) kan de opname van essentiële vetzuren en vitamines belemmeren.', evidence_refs: ['NK-FAT-INTAKE-001', 'NK-FAT-VITAMINS-001'] },
        { section_id: 'claims-vetverbranding', title: 'Claims rond "vetverbranding"', body: 'Voedingsvet eten is niet hetzelfde als lichaamsvet verbranden of opslaan -- dat hangt af van je totale energiebalans.', evidence_refs: ['NK-FAT-BODYFAT-001'] },
        { section_id: 'vet-versus-lichaamsvet', title: 'Voedingsvet ≠ automatisch lichaamsvet', body: 'Of je vet opslaat, hangt af van je totale energiebalans -- niet specifiek van hoeveel vet je eet.', evidence_refs: ['NK-FAT-BODYFAT-001'] },
        { section_id: 'misverstanden', title: 'Veelgemaakte misverstanden', body: 'Vet is niet per definitie ongezond -- het type vet en je totale voedingspatroon maken het verschil.', evidence_refs: ['NK-FAT-NOTBAD-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'FAT-FAQ-ONGEZOND', question: 'Is vet ongezond?', evidence_refs: ['NK-FAT-NOTBAD-001'] },
        { faq_id: 'FAT-FAQ-VERZADIGD', question: 'Is verzadigd vet hetzelfde als onverzadigd vet?', evidence_refs: ['NK-FAT-TYPES-001'] },
        { faq_id: 'FAT-FAQ-DIK', question: 'Word je dik van vet?', evidence_refs: ['NK-FAT-BODYFAT-001'] },
        { faq_id: 'FAT-FAQ-SPORTERS', question: 'Hebben sporters meer vet nodig?', evidence_refs: ['NK-FAT-INTAKE-001'] },
        { faq_id: 'FAT-FAQ-VETARM', question: 'Is een vetarm dieet beter?', evidence_refs: ['NK-FAT-INTAKE-001'] },
        { faq_id: 'FAT-FAQ-TRAINING', question: 'Moet je vet vermijden voor training?', evidence_refs: ['NK-FAT-INTAKE-001', 'NK-FAT-VITAMINS-001'] }
      ]
    },
    {
      topic_id: 'ENERGY',
      domain: 'NUTRITION',
      display_name: 'Energie',
      quick_summary_evidence_ref: 'NK-ENE-BALANCE-001',
      quick_summary_text: 'Energiebalans is de basis van gewichtsverandering: inname versus verbruik. Trainingskompas berekent geen persoonlijke calorie- of macrodoelen.',
      sections: [
        { section_id: 'energie-uit-voeding', title: 'Energie uit voeding', body: 'Voeding levert energie, gemeten in kcal of kJ.', evidence_refs: ['NK-ENE-DEF-001'] },
        { section_id: 'kcal-kj', title: 'kcal/kJ', body: 'Vet levert per gram meer dan twee keer zoveel energie als eiwit of koolhydraten.', evidence_refs: ['NK-ENE-DEF-001'] },
        { section_id: 'energiebalans', title: 'Energiebalans', body: 'Energiebalans is de verhouding tussen wat je binnenkrijgt en wat je verbruikt.', evidence_refs: ['NK-ENE-BALANCE-001'] },
        { section_id: 'inname-versus-verbruik', title: 'Energie-inname versus energieverbruik', body: 'Een langdurig overschot of tekort in deze balans verandert je gewicht over tijd.', evidence_refs: ['NK-ENE-BALANCE-001'] },
        { section_id: 'onderhoud', title: 'Onderhoud', body: 'Bij een gebalanceerde energie-inname en -verbruik blijft je gewicht over tijd ongeveer stabiel.', evidence_refs: ['NK-ENE-BALANCE-001'] },
        { section_id: 'energietekort', title: 'Energietekort', body: 'Een aanhoudend energietekort leidt over tijd tot gewichtsverlies.', evidence_refs: ['NK-ENE-BALANCE-001'] },
        { section_id: 'energieoverschot', title: 'Energieoverschot', body: 'Een aanhoudend energieoverschot leidt over tijd tot gewichtstoename.', evidence_refs: ['NK-ENE-BALANCE-001'] },
        { section_id: 'lichaamssamenstelling', title: 'Lichaamssamenstelling', body: 'Energiebalans beïnvloedt gewicht, maar de samenstelling van die verandering (vet/spier) hangt ook af van andere factoren zoals training en eiwitinname.', evidence_refs: ['NK-ENE-BALANCE-001'] },
        { section_id: 'sportprestatie-herstel', title: 'Sportprestatie en herstel', body: 'Voldoende energiebeschikbaarheid is een voorwaarde voor goede prestaties en herstel.', evidence_refs: ['NK-ENE-BALANCE-001'] },
        { section_id: 'bmr-rmr-tdee', title: 'BMR/RMR/TDEE', body: 'BMR is je energieverbruik in rust; TDEE is je totale dagelijkse verbruik. Dit zijn begrippen om te begrijpen, geen rekentool in Trainingskompas.', evidence_refs: ['NK-ENE-BMR-001'] },
        { section_id: 'lage-energiebeschikbaarheid', title: 'Lage energiebeschikbaarheid', body: 'Structureel te weinig energie voor je trainingsbelasting kan leiden tot gezondheids- en prestatieproblemen.', evidence_refs: ['NK-ENE-REDS-001'] },
        { section_id: 'red-s', title: 'RED-S', body: 'RED-S (Relative Energy Deficiency in Sport) is een erkend concept met mogelijke gevolgen voor hormonen, botten, afweer en prestatie -- diagnose vereist medische beoordeling.', evidence_refs: ['NK-ENE-REDS-001'] },
        { section_id: 'onzekerheid-energieverbruik', title: 'Onzekerheid in energieverbruik', body: 'Zowel BMR-schattingen als activiteitsverbruik kennen aanzienlijke individuele onzekerheidsmarges.', evidence_refs: ['NK-ENE-BMR-001', 'NK-ENE-WEARABLE-001'] },
        { section_id: 'wearable-schattingen', title: 'Wearable-calorieën zijn schattingen', body: 'De calorieën op je smartwatch zijn een schatting met een aanzienlijke foutmarge, geen exacte meting.', evidence_refs: ['NK-ENE-WEARABLE-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'ENE-FAQ-BALANS', question: 'Wat betekent energiebalans?', evidence_refs: ['NK-ENE-BALANCE-001'] },
        { faq_id: 'ENE-FAQ-BMR', question: 'Wat zijn BMR en TDEE?', evidence_refs: ['NK-ENE-BMR-001'] },
        { faq_id: 'ENE-FAQ-WEARABLE', question: 'Klopt het aantal calorieën op mijn smartwatch?', evidence_refs: ['NK-ENE-WEARABLE-001'] },
        { faq_id: 'ENE-FAQ-REDS', question: 'Wat is RED-S?', evidence_refs: ['NK-ENE-REDS-001'] }
      ]
    },
    {
      topic_id: 'FIBRE',
      domain: 'NUTRITION',
      display_name: 'Vezels',
      quick_summary_evidence_ref: 'NK-FIB-HEALTH-001',
      quick_summary_text: 'Vezels zijn belangrijk voor je spijsvertering en algemene gezondheid. Streef naar minstens 25 gram per dag, bij voorkeur uit voeding.',
      sections: [
        { section_id: 'wat-zijn-vezels', title: 'Wat zijn vezels?', body: 'Vezels zijn onverteerbare koolhydraten uit plantaardige voeding, met oplosbare en onoplosbare vormen.', evidence_refs: ['NK-FIB-DEF-001'] },
        { section_id: 'typen-vezels', title: 'Typen vezels', body: 'Oplosbare en onoplosbare vezels hebben elk net iets andere effecten op je spijsvertering.', evidence_refs: ['NK-FIB-DEF-001'] },
        { section_id: 'darmfunctie', title: 'Darmfunctie', body: 'Vezels dragen bij aan een gezonde spijsvertering.', evidence_refs: ['NK-FIB-DEF-001'] },
        { section_id: 'gezondheid', title: 'Gezondheid', body: 'Meer vezels hangen samen met een lager risico op hart- en vaatziekten, diabetes type 2 en bepaalde kankers.', evidence_refs: ['NK-FIB-HEALTH-001'] },
        { section_id: 'verzadiging', title: 'Verzadiging', body: 'Vezels kunnen een beetje helpen bij verzadiging, maar zijn geen garantie voor gewichtsverlies op zich.', evidence_refs: ['NK-FIB-SATIETY-001'] },
        { section_id: 'voedingsbronnen', title: 'Voedingsbronnen', body: 'Volkoren, groente, fruit en peulvruchten zijn de belangrijkste vezelbronnen.', evidence_refs: ['NK-FIB-INTAKE-001'] },
        { section_id: 'volkoren', title: 'Volkoren', body: 'Volkorenproducten leveren meer vezels dan geraffineerde granen.', evidence_refs: ['NK-FIB-INTAKE-001'] },
        { section_id: 'groente-fruit', title: 'Groente/fruit', body: 'Groente en fruit dragen substantieel bij aan je dagelijkse vezelinname.', evidence_refs: ['NK-FIB-INTAKE-001'] },
        { section_id: 'peulvruchten', title: 'Peulvruchten', body: 'Peulvruchten zijn een vezelrijke, veelzijdige bron.', evidence_refs: ['NK-FIB-INTAKE-001'] },
        { section_id: 'geleidelijk-verhogen', title: 'Geleidelijk verhogen', body: 'Bouw je vezelinname geleidelijk op, samen met voldoende vocht, om buikklachten te beperken.', evidence_refs: ['NK-FIB-GI-001'] },
        { section_id: 'vochtcontext', title: 'Vochtcontext', body: 'Voldoende drinken hoort bij een hogere vezelinname.', evidence_refs: ['NK-FIB-GI-001'] },
        { section_id: 'sportcontext', title: 'Sportcontext', body: 'Rond training kan een te hoge, plotselinge vezelinname bij gevoelige personen maag-darmklachten geven.', evidence_refs: ['NK-FIB-GI-001'] },
        { section_id: 'vezels-voor-wedstrijd', title: 'Vezels vlak voor training/wedstrijd', body: 'Overweeg vlak voor een wedstrijd wat minder vezels als je daar gevoelig voor bent -- dit is individueel.', evidence_refs: ['NK-FIB-GI-001'] },
        { section_id: 'individuele-tolerantie', title: 'Individuele tolerantie', body: 'Vezeltolerantie verschilt sterk van persoon tot persoon.', evidence_refs: ['NK-FIB-GI-001'] },
        { section_id: 'supplementvezels', title: 'Supplementvezels versus vezelrijke voeding', body: 'Een vezelsupplement is niet automatisch hetzelfde als vezelrijke, volledige voeding.', evidence_refs: ['NK-FIB-SUPPLEMENT-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'FIB-FAQ-WAAROM', question: 'Waarom zijn vezels belangrijk?', evidence_refs: ['NK-FIB-HEALTH-001'] },
        { faq_id: 'FIB-FAQ-MEER', question: 'Hoe krijg ik meer vezels binnen?', evidence_refs: ['NK-FIB-INTAKE-001'] },
        { faq_id: 'FIB-FAQ-AFVALLEN', question: 'Zijn vezels goed voor afvallen?', evidence_refs: ['NK-FIB-SATIETY-001'] },
        { faq_id: 'FIB-FAQ-WEDSTRIJD', question: 'Moet ik veel vezels eten voor een wedstrijd?', evidence_refs: ['NK-FIB-GI-001'] },
        { faq_id: 'FIB-FAQ-BUIKKLACHTEN', question: 'Kunnen vezels buikklachten geven?', evidence_refs: ['NK-FIB-GI-001'] },
        { faq_id: 'FIB-FAQ-SUPPLEMENT', question: 'Zijn supplementvezels hetzelfde als vezelrijke voeding?', evidence_refs: ['NK-FIB-SUPPLEMENT-001'] }
      ]
    },
    {
      topic_id: 'HEALTHY_EATING',
      domain: 'NUTRITION',
      display_name: 'Gezonde voeding',
      quick_summary_evidence_ref: 'NK-HE-PATTERN-001',
      quick_summary_text: 'Gezonde voeding draait om je totale voedingspatroon over tijd, variatie en balans -- niet om één goed of slecht product.',
      sections: [
        { section_id: 'wat-bedoelen-we', title: 'Wat bedoelen we met een gezond voedingspatroon?', body: 'Een gezond voedingspatroon is de optelsom van wat je over dagen en weken eet, niet één losse maaltijd of product.', evidence_refs: ['NK-HE-PATTERN-001'] },
        { section_id: 'patroon-boven-product', title: 'Voedingspatroon belangrijker dan één product', body: 'Eén "ongezond" of "superfood"-product bepaalt niet of je totale voeding gezond is.', evidence_refs: ['NK-HE-PATTERN-001'] },
        { section_id: 'variatie', title: 'Variatie', body: 'Variatie in voedingsmiddelen helpt om aan uiteenlopende voedingsstoffen te komen.', evidence_refs: ['NK-HE-PATTERN-001'] },
        { section_id: 'groente', title: 'Groente', body: 'Groente draagt bij aan de aanbevolen 400 gram groente en fruit per dag.', evidence_refs: ['NK-HE-FRUITVEG-001'] },
        { section_id: 'fruit', title: 'Fruit', body: 'Fruit telt mee voor de aanbevolen 400 gram groente en fruit per dag.', evidence_refs: ['NK-HE-FRUITVEG-001'] },
        { section_id: 'volkoren', title: 'Volkoren', body: 'Volkoren producten passen bij een gezond voedingspatroon.', evidence_refs: ['NK-HE-PATTERN-001'] },
        { section_id: 'peulvruchten', title: 'Peulvruchten', body: 'Peulvruchten zijn een waardevol onderdeel van een gezond, gevarieerd voedingspatroon.', evidence_refs: ['NK-HE-PATTERN-001'] },
        { section_id: 'eiwitbronnen', title: 'Eiwitbronnen', body: 'Een gezond patroon bevat gevarieerde eiwitbronnen, dierlijk en/of plantaardig.', evidence_refs: ['NK-HE-PATTERN-001'] },
        { section_id: 'vetkwaliteit', title: 'Vetkwaliteit', body: 'De kwaliteit van vet (verzadigd versus onverzadigd) is relevanter dan de totale hoeveelheid alleen.', evidence_refs: ['NK-HE-PATTERN-001'] },
        { section_id: 'vrije-suikers', title: 'Vrije/toegevoegde suikers', body: 'Beperk vrije/toegevoegde suikers als onderdeel van een gezond patroon.', evidence_refs: ['NK-HE-PATTERN-001'] },
        { section_id: 'zout-natrium', title: 'Zout/natrium', body: 'Ook zout/natrium is onderdeel van de bredere gezondheidsrichtlijnen rond voeding.', evidence_refs: ['NK-HE-PATTERN-001'] },
        { section_id: 'bewerkte-voeding', title: 'Sterk bewerkte voeding', body: '"Bewerkt" is geen eenduidige wetenschappelijke categorie die per definitie ongezond is -- het gehalte aan verzadigd vet, suiker en zout is relevanter.', evidence_refs: ['NK-HE-PROCESSED-001'] },
        { section_id: 'energiedichtheid', title: 'Energiedichtheid', body: 'Energiedichtheid van voeding is een van de factoren die meespelen in een gezond voedingspatroon.', evidence_refs: ['NK-HE-PATTERN-001'] },
        { section_id: 'sportvoeding-past', title: 'Sportvoeding binnen een gezond patroon', body: 'Sportvoeding zoals gels of eiwitpoeder kan prima passen binnen een verder gezond, gevarieerd voedingspatroon.', evidence_refs: ['NK-HE-SPORTFIT-001'] },
        { section_id: 'flexibiliteit', title: 'Flexibiliteit en context', body: 'Niet elke maaltijd hoeft perfect te zijn -- je patroon over tijd is bepalend.', evidence_refs: ['NK-HE-FLEX-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'HE-FAQ-WAT-IS', question: 'Wat is gezonde voeding?', evidence_refs: ['NK-HE-PATTERN-001'] },
        { faq_id: 'HE-FAQ-SUIKER', question: 'Moet je suiker volledig vermijden?', evidence_refs: ['NK-HE-PATTERN-001'] },
        { faq_id: 'HE-FAQ-BEWERKT', question: 'Is bewerkt voedsel altijd ongezond?', evidence_refs: ['NK-HE-PROCESSED-001'] },
        { faq_id: 'HE-FAQ-SPORTVOEDING', question: 'Past sportvoeding in een gezond voedingspatroon?', evidence_refs: ['NK-HE-SPORTFIT-001'] },
        { faq_id: 'HE-FAQ-PERFECT', question: 'Moet iedere maaltijd perfect gezond zijn?', evidence_refs: ['NK-HE-FLEX-001'] }
      ]
    }
  ];
  TOPICS.push.apply(TOPICS, NK03_TOPICS);

  /* ROADMAP: sectie 17 -- inhoudelijke roadmap, GEEN gebouwde topics.
   * Uitsluitend classificatiedata, geen evidence/claims. NK-03 heeft
   * Koolhydraten/Vetten/Energie/Vezels/Gezonde voeding gebouwd -- deze
   * zijn hieronder verwijderd uit de roadmap (niet langer "toekomstig"). */
  var ROADMAP = [
    { topic: 'Hydratatie', priority: 'P0', note: 'ELECTROLYTE_GROUP-evidence bestaat al; sterke EAH/veiligheidsnuance direct herbruikbaar.' },
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
