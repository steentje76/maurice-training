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

  // ── NK-04: sportvoedingstopics (voor/tijdens/na training, langdurige inspanning, spieropbouw, vetverlies) ──
  var NK04_TOPICS = [
    {
      topic_id: 'PRE_TRAINING',
      domain: 'NUTRITION',
      display_name: 'Voeding voor training',
      quick_summary_evidence_ref: 'NK-PRE-CARB-001',
      quick_summary_text: 'Wat je voor het sporten eet, hangt af van duur en intensiteit. Er is geen universeel voorschrift -- wel bruikbare richtlijnen.',
      sections: [
        { section_id: 'doel-pre-exercise', title: 'Doel van pre-exercise voeding', body: 'Voeding vooraf ondersteunt voldoende brandstof en comfort tijdens het sporten.', evidence_refs: ['NK-PRE-CARB-001'] },
        { section_id: 'beschikbare-energie', title: 'Beschikbare energie', body: 'Voldoende energie vooraf helpt om de geplande trainingsintensiteit te kunnen halen.', evidence_refs: ['NK-PRE-CARB-001'] },
        { section_id: 'koolhydraatbeschikbaarheid', title: 'Koolhydraatbeschikbaarheid', body: 'Voor zwaardere, langere trainingen wordt vaak extra koolhydraat vooraf onderzocht/gebruikt.', evidence_refs: ['NK-PRE-CARB-001'] },
        { section_id: 'timing', title: 'Timing', body: 'Hoe dichter bij het sporten, hoe kleiner en lichter verteerbaar een maaltijd doorgaans moet zijn.', evidence_refs: ['NK-PRE-TIMING-001'] },
        { section_id: 'maaltijd-versus-snack', title: 'Maaltijd versus snack', body: 'Een volledige maaltijd ruim vooraf of een lichte snack vlak ervoor kunnen beide werken, afhankelijk van timing en tolerantie.', evidence_refs: ['NK-PRE-TIMING-001'] },
        { section_id: 'koolhydraatcontext', title: 'Koolhydraatcontext', body: 'Koolhydraten zijn meestal het belangrijkste aandachtspunt in een pre-exercise maaltijd bij langere/zwaardere inspanning.', evidence_refs: ['NK-PRE-CARB-001'] },
        { section_id: 'eiwitcontext', title: 'Eiwitcontext', body: 'Eiwit vooraf is geen vereiste, maar kan onderdeel zijn van een gebalanceerde maaltijd.', evidence_refs: ['PROT-TOTAL-001'] },
        { section_id: 'vetcontext', title: 'Vetcontext', body: 'Veel vet vlak voor het sporten kan de spijsvertering vertragen en oncomfortabel aanvoelen.', evidence_refs: ['NK-PRE-TIMING-001'] },
        { section_id: 'vezelcontext', title: 'Vezelcontext', body: 'Veel vezels vlak voor het sporten kan bij gevoelige personen buikklachten geven.', evidence_refs: ['NK-FIB-GI-001'] },
        { section_id: 'hydratatie-crosslink', title: 'Hydratatie (kort)', body: 'Voldoende gehydrateerd aan de start beginnen is relevant -- meer hierover volgt in een toekomstig Hydratatie-dossier.', evidence_refs: ['ELEC-HYDRA-001'] },
        { section_id: 'training-vroeg-ochtend', title: 'Training vroeg in de ochtend', body: 'Bij vroege training is er vaak minder tijd voor een uitgebreide maaltijd -- een lichte snack of nuchter trainen zijn beide onderzochte opties.', evidence_refs: ['NK-PRE-FASTED-001'] },
        { section_id: 'kort-versus-lang', title: 'Korte versus lange training', body: 'Bij kortere inspanning is pre-exercise voeding minder cruciaal dan bij langere, zwaardere sessies.', evidence_refs: ['CARB-SHORT-001'] },
        { section_id: 'hoge-lage-intensiteit', title: 'Hoge versus lage intensiteit', body: 'Bij hogere intensiteit wordt koolhydraatbeschikbaarheid vooraf relevanter dan bij rustige inspanning.', evidence_refs: ['NK-PRE-CARB-001'] },
        { section_id: 'individuele-tolerantie', title: 'Individuele tolerantie', body: 'Wat werkt voor pre-exercise voeding, verschilt sterk van persoon tot persoon -- test dit vooral in training, niet voor het eerst in een wedstrijd.', evidence_refs: ['NK-PRE-TIMING-001'] },
        { section_id: 'algemeen-versus-pre-workout', title: 'Algemene voeding over de dag versus één pre-workout maaltijd', body: 'Je totale voeding over de dag is minstens zo belangrijk als de ene maaltijd vlak voor het sporten.', evidence_refs: ['PROT-TIMING-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'PRE-FAQ-ALTIJD', question: 'Moet ik altijd eten voor training?', evidence_refs: ['CARB-SHORT-001'] },
        { faq_id: 'PRE-FAQ-HOELANG', question: 'Hoe lang voor training kun je eten?', evidence_refs: ['NK-PRE-TIMING-001'] },
        { faq_id: 'PRE-FAQ-KOOLHYDRAAT', question: 'Zijn koolhydraten voor training belangrijk?', evidence_refs: ['NK-PRE-CARB-001'] },
        { faq_id: 'PRE-FAQ-EIWIT', question: 'Moet ik eiwit voor training nemen?', evidence_refs: ['PROT-TOTAL-001'] },
        { faq_id: 'PRE-FAQ-BUIKKLACHTEN', question: 'Waarom krijg ik buikklachten tijdens sporten?', evidence_refs: ['NK-PRE-TIMING-001', 'NK-FIB-GI-001'] },
        { faq_id: 'PRE-FAQ-NUCHTER', question: 'Kun je nuchter trainen?', evidence_refs: ['NK-PRE-FASTED-001'] }
      ]
    },
    {
      topic_id: 'DURING_TRAINING',
      domain: 'NUTRITION',
      display_name: 'Voeding tijdens training',
      quick_summary_evidence_ref: 'CARB-MID-001',
      quick_summary_text: 'Bij kortere inspanning is voeding tijdens het sporten meestal niet nodig; bij langere duur wordt koolhydraatinname steeds relevanter.',
      sections: [
        { section_id: 'wanneer-relevant', title: 'Wanneer wordt voeding tijdens training relevant?', body: 'Vanaf ongeveer 45-75 minuten kan koolhydraatinname tijdens het sporten relevant worden.', evidence_refs: ['CARB-SHORT-001'] },
        { section_id: 'inspanningsduur', title: 'Inspanningsduur', body: 'Hoe langer de inspanning, hoe meer koolhydraten tijdens het sporten kunnen helpen.', evidence_refs: ['CARB-MID-001', 'CARB-LONG-001'] },
        { section_id: 'intensiteit', title: 'Intensiteit', body: 'Naast duur speelt ook intensiteit een rol in hoeveel koolhydraten tijdens inspanning zinvol zijn.', evidence_refs: ['CARB-MID-001'] },
        { section_id: 'koolhydraten-tijdens', title: 'Koolhydraten tijdens inspanning', body: 'Bij 1-2,5 uur inspanning wordt 30-60 g koolhydraten per uur onderzocht/gebruikt.', evidence_refs: ['CARB-MID-001'] },
        { section_id: 'mondspoeling', title: 'Mondspoeling (mouth rinse)', body: 'Bij kortere, intensieve inspanning kan zelfs een mondspoeling met koolhydraten al een licht effect geven.', evidence_refs: ['NK-DUR-RINSE-001'] },
        { section_id: 'dertig-zestig-context', title: '30-60 g/u-context', body: 'Dit bereik geldt met name voor inspanning van 1-2,5 uur.', evidence_refs: ['CARB-MID-001'] },
        { section_id: 'hogere-intake-langere-inspanning', title: 'Hogere intake bij langere inspanning', body: 'Bij meer dan 2,5-3 uur inspanning wordt tot circa 90 g/uur onderzocht, met een mix van koolhydraattypen.', evidence_refs: ['CARB-LONG-001'] },
        { section_id: 'glucose-fructose-mtc', title: 'Glucose/fructose (multiple transportable carbohydrates)', body: 'Boven circa 60 g/uur is een mix van glucose en fructose nodig vanwege een opnameplafond voor een enkel koolhydraattype.', evidence_refs: ['NK-DUR-MTC-001'] },
        { section_id: 'tot-90-correct-onderbouwd', title: 'Tot circa 90 g/u waar correct onderbouwd', body: 'Dit hogere bereik is specifiek onderzocht bij langere inspanning met een glucose+fructose-mix.', evidence_refs: ['CARB-LONG-001'] },
        { section_id: 'hogere-innames-120', title: 'Onderzoek naar hogere innames (~120 g/u)', body: 'Zeer hoge innames zijn vooral onderzocht bij specifieke, zeer getrainde ultra-atleten -- lage generaliseerbaarheid naar de meeste sporters.', evidence_refs: ['CARB-ELITE-001'] },
        { section_id: 'gi-tolerantie', title: 'GI-tolerantie', body: 'Je spijsvertering kan wennen aan hogere koolhydraatinname tijdens sport.', evidence_refs: ['CARB-GI-001'] },
        { section_id: 'gut-training', title: 'Gut training', body: 'Geleidelijk oefenen met hogere innames tijdens training kan de GI-tolerantie verbeteren.', evidence_refs: ['CARB-GI-001'] },
        { section_id: 'sportdrank-gel-vast', title: 'Sportdrank/gels/vaste voeding', body: 'Vloeibare en vaste koolhydraatbronnen kunnen beide werken -- de keuze hangt af van tolerantie en praktische haalbaarheid.', evidence_refs: ['NK-END-VLOEIBAAR-001'] },
        { section_id: 'individuele-verschillen', title: 'Individuele verschillen', body: 'Wat werkt tijdens inspanning verschilt sterk per persoon -- test dit in training.', evidence_refs: ['CARB-GI-001'] },
        { section_id: 'wedstrijd-versus-training', title: 'Wedstrijd versus training', body: 'Test je voedingsstrategie tijdens training, niet voor het eerst tijdens een wedstrijd.', evidence_refs: ['CARB-GI-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'DUR-FAQ-EEN-UUR', question: 'Heb ik tijdens een uur sporten koolhydraten nodig?', evidence_refs: ['CARB-MID-001'] },
        { faq_id: 'DUR-FAQ-GELS', question: 'Waarom gebruiken duursporters gels?', evidence_refs: ['CARB-LONG-001', 'NK-DUR-MTC-001'] },
        { faq_id: 'DUR-FAQ-MONDSPOELING', question: 'Helpt het om alleen mijn mond te spoelen met een sportdrank?', evidence_refs: ['NK-DUR-RINSE-001'] },
        { faq_id: 'DUR-FAQ-VEEL', question: 'Kan ik zoveel koolhydraten eten als ik wil tijdens het sporten?', evidence_refs: ['CARB-GI-001'] }
      ]
    },
    {
      topic_id: 'POST_TRAINING',
      domain: 'NUTRITION',
      display_name: 'Voeding na training & herstel',
      quick_summary_evidence_ref: 'NK-POST-TOTAL-001',
      quick_summary_text: 'Herstelvoeding draait om je totale dagelijkse inname. Er bestaat geen strikt "30-minuten-venster" dat voor iedereen geldt.',
      sections: [
        { section_id: 'doelen-herstelvoeding', title: 'Doelen van herstelvoeding', body: 'Herstelvoeding ondersteunt het aanvullen van energie/glycogeen en het herstel van spierweefsel.', evidence_refs: ['NK-POST-TOTAL-001'] },
        { section_id: 'totale-daginname', title: 'Totale daginname', body: 'Je totale dagelijkse koolhydraat- en eiwitinname is meestal belangrijker dan het exacte tijdstip na training.', evidence_refs: ['NK-POST-TOTAL-001'] },
        { section_id: 'glycogeenherstel', title: 'Glycogeenherstel', body: 'Koolhydraten na training helpen je glycogeenvoorraad weer aan te vullen.', evidence_refs: ['CARB-MID-001'] },
        { section_id: 'koolhydraten', title: 'Koolhydraten', body: 'De hoeveelheid koolhydraten die nodig is voor herstel hangt af van de duur/intensiteit van je training en de tijd tot je volgende sessie.', evidence_refs: ['NK-POST-GLYCOGEN-001'] },
        { section_id: 'eiwit', title: 'Eiwit', body: 'Eiwit na training ondersteunt spierherstel; 20-40 g hoogwaardig eiwit is hiervoor onderzocht.', evidence_refs: ['PROT-DOSE-001'] },
        { section_id: 'vocht-crosslink', title: 'Vocht (kort)', body: 'Herstel van vochtverlies hoort ook bij herstelvoeding -- meer hierover volgt in een toekomstig Hydratatie-dossier.', evidence_refs: ['ELEC-HYDRA-001'] },
        { section_id: 'timing', title: 'Timing', body: 'Er bestaat geen strikt "30-minuten-venster" -- het effect van training op spiereiwitsynthese houdt veel langer aan.', evidence_refs: ['PROT-TIMING-001'] },
        { section_id: 'snelle-aanvulling-relevant', title: 'Wanneer snelle aanvulling relevant is', body: 'Bij minder dan circa 8 uur tot de volgende training is snel aanvullen relevanter dan bij een langere hersteltijd.', evidence_refs: ['NK-POST-GLYCOGEN-001'] },
        { section_id: 'meerdere-trainingen-dag', title: 'Meerdere trainingen op één dag', body: 'Bij twee sessies op een dag is de timing van je tussenmaaltijd belangrijker dan bij één training per dag.', evidence_refs: ['NK-POST-GLYCOGEN-001'] },
        { section_id: 'lange-versus-korte-turnaround', title: 'Lange herstelperiode versus korte turnaround', body: 'Bij een lange hersteltijd (>24 uur) telt vooral je totale dagelijkse inname; bij een korte turnaround telt snelheid meer.', evidence_refs: ['NK-POST-GLYCOGEN-001'] },
        { section_id: 'maaltijd-versus-shake', title: 'Maaltijd versus shake', body: 'Een gewone maaltijd of een shake kunnen allebei prima werken voor herstel, zolang de totale inname klopt.', evidence_refs: ['PROT-NECESSITY-001'] },
        { section_id: 'totale-voedingskwaliteit', title: 'Totale voedingskwaliteit', body: 'De kwaliteit van je voeding over de hele dag is minstens zo belangrijk als één herstelmaaltijd.', evidence_refs: ['PROT-DISTRIB-001'] },
        { section_id: 'slaap-herstel', title: 'Slaap/herstel', body: 'Eiwit vlak voor het slapen kan het nachtelijke herstel ondersteunen.', evidence_refs: ['PROT-SLEEP-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'POST-FAQ-KRACHT', question: 'Moet ik direct na krachttraining eiwit nemen?', evidence_refs: ['PROT-TIMING-001'] },
        { faq_id: 'POST-FAQ-DERTIG-MIN', question: 'Klopt het dat je binnen 30 minuten moet eten na training?', evidence_refs: ['PROT-TIMING-001'] },
        { faq_id: 'POST-FAQ-TWEE-SESSIES', question: 'Wat als ik twee keer op een dag train?', evidence_refs: ['NK-POST-GLYCOGEN-001'] },
        { faq_id: 'POST-FAQ-SHAKE', question: 'Moet dat per se een shake zijn na het sporten?', evidence_refs: ['PROT-NECESSITY-001'] }
      ]
    },
    {
      topic_id: 'ENDURANCE_CARB',
      domain: 'NUTRITION',
      display_name: 'Koolhydraatstrategieën bij langdurige inspanning',
      quick_summary_evidence_ref: 'NK-END-LOAD-001',
      quick_summary_text: 'Bij lange, zware inspanning bestaan onderzochte koolhydraatstrategieën, van tijdens de inspanning tot in de dagen ervoor (carb loading).',
      sections: [
        { section_id: 'glycogeen', title: 'Glycogeen', body: 'Je glycogeenvoorraad is beperkt en bepaalt mede hoe lang je op hoog niveau kunt presteren.', evidence_refs: ['CARB-LONG-001'] },
        { section_id: 'duur-intensiteit', title: 'Duur/intensiteit', body: 'Hoe langer en intensiever de inspanning, hoe belangrijker koolhydraatstrategieën worden.', evidence_refs: ['CARB-LONG-001'] },
        { section_id: 'exogene-koolhydraten', title: 'Exogene koolhydraten', body: 'Koolhydraten die je tijdens het sporten inneemt, vullen je eigen voorraad aan.', evidence_refs: ['CARB-LONG-001'] },
        { section_id: 'koolhydraatoxidatie', title: 'Koolhydraatoxidatie', body: 'Je lichaam kan koolhydraten uit voeding tijdens inspanning maar tot op zekere hoogte gebruiken als brandstof.', evidence_refs: ['NK-DUR-MTC-001'] },
        { section_id: 'mtc', title: 'Multiple transportable carbohydrates', body: 'Een mix van glucose en fructose verhoogt het opnameplafond t.o.v. één koolhydraattype alleen.', evidence_refs: ['NK-DUR-MTC-001'] },
        { section_id: 'gi-tolerantie', title: 'GI-tolerantie', body: 'Hogere koolhydraatinname vraagt om een getrainde spijsvertering.', evidence_refs: ['CARB-GI-001'] },
        { section_id: 'gut-training', title: 'Gut training', body: 'Oefen hogere innames tijdens training, niet voor het eerst tijdens een wedstrijd.', evidence_refs: ['CARB-GI-001'] },
        { section_id: 'vloeibaar-versus-vast', title: 'Vloeibaar versus vast', body: 'Beide vormen kunnen werken -- kies wat voor jou praktisch en verdraagbaar is.', evidence_refs: ['NK-END-VLOEIBAAR-001'] },
        { section_id: 'wedstrijdstrategie', title: 'Wedstrijdstrategie', body: 'Bouw je wedstrijdvoedingsstrategie op basis van wat je in training hebt getest.', evidence_refs: ['CARB-GI-001'] },
        { section_id: 'training-van-strategie', title: 'Training van je voedingsstrategie', body: 'Gebruik trainingen om je koolhydraatstrategie te testen en te verfijnen.', evidence_refs: ['CARB-GI-001'] },
        { section_id: 'carb-loading', title: 'Carb loading als education', body: 'Carb loading (verhoogde koolhydraatinname 24-48u vooraf) wordt onderzocht voor wedstrijden langer dan circa 90 minuten.', evidence_refs: ['NK-END-LOAD-001'] },
        { section_id: 'carb-loading-gewicht', title: 'Carb loading en gewicht', body: 'Carb loading kan tijdelijke gewichtstoename geven door extra water bij het glycogeen -- geen vet.', evidence_refs: ['NK-END-LOAD-WEIGHT-001'] },
        { section_id: 'beperkingen-hoge-innames', title: 'Beperkingen van hoge innames', body: 'Zeer hoge innames (~120 g/u) zijn alleen onderzocht bij specifieke, zeer getrainde ultra-atleten.', evidence_refs: ['CARB-ELITE-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'END-FAQ-CARBLOADING', question: 'Wat is carb loading?', evidence_refs: ['NK-END-LOAD-001'] },
        { faq_id: 'END-FAQ-VOOR-WIE', question: 'Voor wie is carb loading relevant?', evidence_refs: ['NK-END-LOAD-001'] },
        { faq_id: 'END-FAQ-ZWAARDER', question: 'Word ik zwaarder van carb loading?', evidence_refs: ['NK-END-LOAD-WEIGHT-001'] },
        { faq_id: 'END-FAQ-120', question: 'Kan iedereen 120 g/uur koolhydraten verdragen?', evidence_refs: ['CARB-ELITE-001'] }
      ]
    },
    {
      topic_id: 'MUSCLE_GAIN',
      domain: 'NUTRITION',
      display_name: 'Spieropbouw & voeding',
      quick_summary_evidence_ref: 'NK-MUS-STIMULUS-001',
      quick_summary_text: 'Krachttraining is de motor achter spiergroei; voeding (energie, eiwit) ondersteunt dit, maar meer eiwit is geen onbeperkte hefboom.',
      sections: [
        { section_id: 'resistance-training-primair', title: 'Resistance training blijft primaire stimulus', body: 'Spieren groeien primair door krachttraining -- voeding ondersteunt, vervangt niet.', evidence_refs: ['NK-MUS-STIMULUS-001'] },
        { section_id: 'voldoende-energie', title: 'Voldoende energie', body: 'Voor spiermassatoename wordt doorgaans een licht energieoverschot aanbevolen naast training.', evidence_refs: ['NK-MUS-SURPLUS-001'] },
        { section_id: 'eiwitinname', title: 'Eiwitinname', body: 'Sporters die spiermassa opbouwen, hebben doorgaans 1,4-2,0 g/kg/dag eiwit nodig.', evidence_refs: ['PROT-TOTAL-001'] },
        { section_id: 'totale-dagelijkse-inname', title: 'Totale dagelijkse inname', body: 'Je totale eiwitinname over de dag is het belangrijkste, meer dan één specifieke maaltijd.', evidence_refs: ['PROT-TOTAL-001'] },
        { section_id: 'verdeling', title: 'Verdeling', body: 'Verspreid je eiwitinname over de dag, ongeveer elke 3-4 uur.', evidence_refs: ['PROT-DISTRIB-001'] },
        { section_id: 'eiwitkwaliteit', title: 'Eiwitkwaliteit', body: 'Hoogwaardige eiwitbronnen ondersteunen spiereiwitsynthese effectief.', evidence_refs: ['NK-PROT-QUALITY-001'] },
        { section_id: 'timing-nuance', title: 'Timing met nuance', body: 'Er is geen strikt tijdvenster -- je totale dagdosis telt het meest.', evidence_refs: ['PROT-TIMING-001'] },
        { section_id: 'koolhydraten-trainingskwaliteit', title: 'Koolhydraten en trainingskwaliteit', body: 'Voldoende koolhydraten ondersteunen de kwaliteit en intensiteit van je krachttraining.', evidence_refs: ['CARB-MID-001'] },
        { section_id: 'energietekort-versus-spieropbouw', title: 'Energietekort versus spieropbouw', body: 'Onder een aanhoudend energietekort is spiermassatoename beperkter dan bij onderhoud of een licht overschot.', evidence_refs: ['NK-MUS-SURPLUS-001'] },
        { section_id: 'supplementen-niet-noodzakelijk', title: 'Supplementen zijn niet automatisch noodzakelijk', body: 'Een eiwitsupplement is nooit noodzakelijk als je de totale dagdosis via gewone voeding haalt.', evidence_refs: ['PROT-NECESSITY-001'] },
        { section_id: 'creatine-crosslink', title: 'Creatine (kort)', body: 'Creatine kan spiermassatoename ondersteunen, uitsluitend in combinatie met krachttraining -- zie het aparte Creatine-dossier voor meer.', evidence_refs: ['CRE-MASS-001'] },
        { section_id: 'meer-eiwit-niet-onbeperkt', title: 'Meer eiwit is geen onbeperkte hefboom', body: 'Boven een bepaald niveau levert extra eiwit geen extra spiergroei meer op.', evidence_refs: ['PROT-HIGH-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'MUS-FAQ-MEER-EIWIT', question: 'Geeft meer eiwit altijd meer spiergroei?', evidence_refs: ['PROT-HIGH-001'] },
        { faq_id: 'MUS-FAQ-OVERSCHOT', question: 'Heb ik een calorie-overschot nodig om spieren op te bouwen?', evidence_refs: ['NK-MUS-SURPLUS-001'] },
        { faq_id: 'MUS-FAQ-CREATINE', question: 'Helpt creatine bij spieropbouw?', evidence_refs: ['CRE-MASS-001'] },
        { faq_id: 'MUS-FAQ-TEKORT', question: 'Kan ik spieren opbouwen in een energietekort?', evidence_refs: ['NK-MUS-SURPLUS-001'] }
      ]
    },
    {
      topic_id: 'FAT_LOSS_SPORT',
      domain: 'NUTRITION',
      display_name: 'Vetverlies & sport',
      quick_summary_evidence_ref: 'NK-FATLOSS-RATE-001',
      quick_summary_text: 'Verantwoord vetverlies bij sporters draait om een geleidelijk energietekort, met behoud van prestatie en spiermassa.',
      sections: [
        { section_id: 'energiebalans', title: 'Energiebalans', body: 'Vetverlies vereist een langdurig energietekort.', evidence_refs: ['NK-ENE-BALANCE-001'] },
        { section_id: 'duurzaam-tekort', title: 'Duurzaam energietekort als concept', body: 'Een geleidelijk, vol te houden tekort wordt geassocieerd met beter resultaat op langere termijn dan een streng, kortdurend dieet.', evidence_refs: ['NK-FATLOSS-RATE-001'] },
        { section_id: 'behoud-trainingskwaliteit', title: 'Behoud van trainingskwaliteit', body: 'Een te streng tekort kan je trainingskwaliteit en herstel negatief beïnvloeden.', evidence_refs: ['NK-FATLOSS-NOCRASH-001'] },
        { section_id: 'eiwitcontext', title: 'Eiwitcontext', body: 'Tijdens een energietekort kan een hogere eiwitinname (2,3-3,1 g/kg) helpen spiermassa te behouden.', evidence_refs: ['PROT-HYPOCAL-001'] },
        { section_id: 'resistance-training-context', title: 'Resistance training/context', body: 'Krachttraining tijdens een dieet helpt spiermassa te behouden.', evidence_refs: ['NK-MUS-STIMULUS-001'] },
        { section_id: 'snelheid-gewichtsverlies', title: 'Snelheid van gewichtsverlies', body: 'Een tempo van circa 0,5-1,0 kg per week wordt vaker geassocieerd met beter behoud van prestatie dan sneller gewichtsverlies.', evidence_refs: ['NK-FATLOSS-RATE-001'] },
        { section_id: 'behoud-vetvrije-massa', title: 'Behoud vetvrije massa', body: 'Voldoende eiwit en krachttraining helpen vetvrije massa te behouden tijdens een dieet.', evidence_refs: ['PROT-HYPOCAL-001'] },
        { section_id: 'sportprestatie', title: 'Sportprestatie', body: 'Een te streng tekort kan sportprestatie negatief beïnvloeden.', evidence_refs: ['NK-FATLOSS-NOCRASH-001'] },
        { section_id: 'herstel', title: 'Herstel', body: 'Een langdurig tekort kan herstel tussen trainingen bemoeilijken.', evidence_refs: ['NK-FATLOSS-NOCRASH-001'] },
        { section_id: 'lage-energiebeschikbaarheid', title: 'Lage energiebeschikbaarheid', body: 'Te weinig energie t.o.v. je trainingsbelasting kan leiden tot lage energiebeschikbaarheid.', evidence_refs: ['NK-FATLOSS-EA-001'] },
        { section_id: 'red-s', title: 'RED-S', body: 'Aanhoudende lage energiebeschikbaarheid kan RED-S veroorzaken -- diagnose vereist medische beoordeling.', evidence_refs: ['NK-ENE-REDS-001'] },
        { section_id: 'dieetkwaliteit', title: 'Dieetkwaliteit', body: 'Ook tijdens een energietekort blijft de kwaliteit van je voeding (vezels, micronutriënten) van belang.', evidence_refs: ['NK-FIB-HEALTH-001'] },
        { section_id: 'haalbaarheid', title: 'Gedrag/haalbaarheid', body: 'Een aanpak die je vol kunt houden, levert op de lange termijn meer op dan een streng, kortdurend dieet.', evidence_refs: ['NK-FATLOSS-NOCRASH-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'FATL-FAQ-VERPESTEN', question: 'Hoe verlies ik vet zonder mijn training te verpesten?', evidence_refs: ['NK-FATLOSS-RATE-001'] },
        { faq_id: 'FATL-FAQ-SNEL', question: 'Kan ik snel afvallen als sporter?', evidence_refs: ['NK-FATLOSS-NOCRASH-001'] },
        { faq_id: 'FATL-FAQ-SPIERBEHOUD', question: 'Hoe behoud ik spiermassa tijdens een dieet?', evidence_refs: ['PROT-HYPOCAL-001'] },
        { faq_id: 'FATL-FAQ-REDS', question: 'Wat is het risico van te streng lijnen als sporter?', evidence_refs: ['NK-FATLOSS-EA-001', 'NK-ENE-REDS-001'] }
      ]
    }
  ];
  TOPICS.push.apply(TOPICS, NK04_TOPICS);

  // ── NK-05: Hydratatie (vochtbalans, zweten, EAH-veiligheid, elektrolyten) ──
  var NK05_TOPICS = [
    {
      topic_id: 'HYDRATION',
      domain: 'NUTRITION',
      display_name: 'Hydratatie',
      quick_summary_evidence_ref: 'ELEC-OVERDRINK-001',
      quick_summary_text: 'Drink naar dorst. Te veel drinken is riskanter dan een beetje te weinig -- dat is de belangrijkste veiligheidsboodschap rond sport en vocht.',
      sections: [
        { section_id: 'vochtbalans-en-sport', title: 'Vochtbalans & sport', body: 'Elektrolyten spelen een basale rol in de vochtbalans van je lichaam.', evidence_refs: ['ELEC-HYDRA-001'] },
        { section_id: 'zweten', title: 'Zweten', body: 'Zweten is de manier waarop je lichaam zich tijdens het sporten koelt, waarbij je vocht en elektrolyten verliest.', evidence_refs: ['NK-HYD-SWEAT-001'] },
        { section_id: 'dehydratie', title: 'Dehydratie', body: 'Meer dan zo\'n 2% van je lichaamsgewicht aan vocht kwijtraken tijdens het sporten hangt samen met een lagere prestatie.', evidence_refs: ['NK-HYD-DEHYDRATION-001'] },
        { section_id: 'overdrinken-eah', title: 'Overdrinken & exercise-associated hyponatriëmie', body: 'Hyponatriëmie tijdens sport ontstaat vooral door te veel drinken, niet primair door te weinig zout.', evidence_refs: ['ELEC-HYPONATREMIA-CAUSE-001'] },
        { section_id: 'drink-naar-dorst', title: 'Drink naar dorst', body: 'Drink naar dorst; bewust meer drinken dan nodig is, is riskanter dan te weinig.', evidence_refs: ['ELEC-OVERDRINK-001'] },
        { section_id: 'noodgeval-herkennen', title: 'Noodgeval herkennen', body: 'Verwardheid, hevige hoofdpijn, braken of toevallen tijdens/na inspanning: zoek direct medische hulp.', evidence_refs: ['ELEC-EMERGENCY-001'] },
        { section_id: 'elektrolyten-en-natrium', title: 'Elektrolyten & natrium', body: '0,5-0,7 g natrium per liter is een gangbare richtlijn, vooral voor smaak en vochtopname -- geen bewezen middel tegen hyponatriëmie.', evidence_refs: ['ELEC-SODIUM-DOSE-001'] },
        { section_id: 'individuele-verschillen', title: 'Persoonlijke verschillen', body: 'Hoeveel natrium je verliest via zweet, verschilt sterk van persoon tot persoon.', evidence_refs: ['ELEC-VARIABILITY-001'] },
        { section_id: 'hitte-en-omgeving', title: 'Hitte & omgeving', body: 'Bij warm en vochtig weer zweet je meestal meer dan bij koel, droog weer.', evidence_refs: ['NK-HYD-HEAT-001'] },
        { section_id: 'hydratatie-voor-inspanning', title: 'Hydratatie vóór inspanning', body: 'Begin je training of wedstrijd het liefst goed gehydrateerd, met genoeg tijd vooraf om overtollig vocht kwijt te raken.', evidence_refs: ['NK-HYD-PRE-001'] },
        { section_id: 'hydratatie-tijdens-inspanning', title: 'Hydratatie tijdens inspanning', body: 'Bij inspanning langer dan een uur wordt een koolhydraat-elektrolytendrank vaker aanbevolen.', evidence_refs: ['ELEC-PROLONGED-001'] },
        { section_id: 'hydratatie-na-inspanning', title: 'Hydratatie na inspanning', body: 'Na het sporten vul je je vochtverlies het beste geleidelijk aan -- dat hoeft niet allemaal in één keer.', evidence_refs: ['NK-HYD-POST-001'] },
        { section_id: 'zweetverlies-inschatten', title: 'Zweetverlies inschatten', body: 'Jezelf wegen vlak vóór en na het sporten is een praktische manier om een schatting te krijgen van je zweetverlies. Trainingskompas kan deze schatting voor je berekenen (zie de rekenfunctie), maar geeft geen automatisch drinkadvies op basis daarvan.', evidence_refs: ['NK-HYD-MEASURE-001'] },
        { section_id: 'sportdranken', title: 'Sportdranken in context', body: 'Een koolhydraat-elektrolytendrank kan bij langere inspanning helpen, maar is geen vereiste voor kortere trainingen.', evidence_refs: ['ELEC-PROLONGED-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'HYD-FAQ-VEEL-BETER', question: 'Is meer drinken altijd beter?', evidence_refs: ['ELEC-OVERDRINK-001'] },
        { faq_id: 'HYD-FAQ-NATRIUM', question: 'Voorkomt natrium in mijn sportdrank hyponatriëmie?', evidence_refs: ['ELEC-SODIUM-DOSE-001', 'ELEC-HYPONATREMIA-CAUSE-001'] },
        { faq_id: 'HYD-FAQ-ZWEETVERLIES', question: 'Hoe kom ik erachter hoeveel ik zweet?', evidence_refs: ['NK-HYD-MEASURE-001'] },
        { faq_id: 'HYD-FAQ-SPORTDRANK', question: 'Wanneer heb ik een sportdrank nodig?', evidence_refs: ['ELEC-PROLONGED-001'] },
        { faq_id: 'HYD-FAQ-SYMPTOMEN', question: 'Welke symptomen zijn een noodgeval?', evidence_refs: ['ELEC-EMERGENCY-001'] },
        { faq_id: 'HYD-FAQ-WARM-WEER', question: 'Zweet ik meer bij warm weer?', evidence_refs: ['NK-HYD-HEAT-001'] }
      ]
    }
  ];
  TOPICS.push.apply(TOPICS, NK05_TOPICS);

  // ── NK-06: Micronutriënten (IJzer, Vitamine D, Calcium, Magnesium, Zink, B12, Folaat, Jodium) ──
  var NK06_TOPICS = [
    {
      topic_id: 'IRON', domain: 'SUPPLEMENT',
      display_name: 'IJzer', quick_summary_evidence_ref: 'IRON-PREVAL-001',
      quick_summary_text: 'IJzertekort komt veel voor bij sporters, met name vrouwen -- maar diagnose vereist bloedonderzoek, geen zelfbeoordeling.',
      sections: [
        { section_id: 'wat-is-ijzer', title: 'Wat is ijzer?', body: 'IJzer is nodig voor zuurstoftransport in je bloed.', evidence_refs: ['IRON-PREVAL-001'] },
        { section_id: 'prevalentie', title: 'Hoe vaak komt tekort voor?', body: 'IJzertekort komt veel voor bij sporters, met name bij vrouwen, tot 60% afhankelijk van discipline.', evidence_refs: ['IRON-PREVAL-001'] },
        { section_id: 'diagnose', title: 'Diagnose', body: 'Diagnose vereist minimaal twee bloedmarkers, bij vrouwen bij voorkeur op een vast cyclusmoment.', evidence_refs: ['IRON-DIAGNOSIS-001'] },
        { section_id: 'afkapwaarden', title: 'Afkapwaarden verschillen', body: 'Exacte afkapwaarden voor ijzertekort verschillen tussen studies en richtlijnen -- geen universeel getal.', evidence_refs: ['IRON-THRESHOLD-001'] },
        { section_id: 'bij-vastgesteld-tekort', title: 'Bij een vastgesteld tekort', body: 'Suppletie kan het uithoudingsvermogen merkbaar verbeteren bij een door een arts vastgesteld tekort.', evidence_refs: ['IRON-PERF-DEFICIENT-001'] },
        { section_id: 'bij-normale-status', title: 'Bij een normale ijzerstatus', body: 'Extra ijzer levert geen aangetoond voordeel op als je ijzerstatus al normaal is.', evidence_refs: ['IRON-PERF-NONDEF-001'] },
        { section_id: 'veiligheid', title: 'Veiligheid', body: 'Te veel ijzer kan schadelijk zijn, zeker bij een ijzerstapelingsaandoening.', evidence_refs: ['IRON-SAFETY-001'] },
        { section_id: 'geen-zelfdiagnose', title: 'Geen zelfdiagnose', body: 'Trainingskompas kan geen ijzertekort vaststellen; dat kan alleen een arts, via bloedonderzoek.', evidence_refs: ['IRON-FORBIDDEN-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'FE-FAQ-WAAROM', question: 'Waarom is ijzer belangrijk voor sporters?', evidence_refs: ['IRON-PREVAL-001'] },
        { faq_id: 'FE-FAQ-VERMOEIDHEID', question: 'Kan vermoeidheid betekenen dat ik ijzertekort heb?', evidence_refs: ['IRON-FORBIDDEN-001', 'IRON-DIAGNOSIS-001'] },
        { faq_id: 'FE-FAQ-EXTRA', question: 'Moet ik altijd extra ijzer nemen als sporter?', evidence_refs: ['IRON-PERF-NONDEF-001'] },
        { faq_id: 'FE-FAQ-VEILIG', question: 'Is ijzer supplementeren altijd veilig?', evidence_refs: ['IRON-SAFETY-001'] }
      ]
    },
    {
      topic_id: 'VITAMIN_D', domain: 'SUPPLEMENT',
      display_name: 'Vitamine D', quick_summary_evidence_ref: 'VITD-PHYS-001',
      quick_summary_text: 'Vitamine D is belangrijk voor botten, spieren en immuunfunctie -- maar verbetert prestaties niet automatisch bij mensen zonder vastgesteld tekort.',
      sections: [
        { section_id: 'wat-is-vitamine-d', title: 'Wat is vitamine D?', body: 'Vitamine D speelt een fundamentele rol in bot-, spier- en immuunfunctie.', evidence_refs: ['VITD-PHYS-001'] },
        { section_id: 'richtlijn-scope', title: 'Voor wie geldt de richtlijn?', body: 'De nieuwste richtlijn (2024) gaat over ziektepreventie bij specifieke groepen, niet over sportprestaties in het algemeen.', evidence_refs: ['VITD-PREVENT-001'] },
        { section_id: 'diagnose', title: 'Diagnose', body: 'Een tekort vaststellen vereist een bloedtest, geïnterpreteerd door een arts.', evidence_refs: ['VITD-DIAGNOSIS-001'] },
        { section_id: 'bij-tekort', title: 'Bij een vastgesteld tekort', body: 'Zelfs bij een vastgesteld tekort is niet zeker of suppletie je sportprestatie verbetert.', evidence_refs: ['VITD-PERF-DEFICIENT-001'] },
        { section_id: 'veiligheid', title: 'Veiligheid', body: 'Te veel vitamine D kan schadelijk zijn; er bestaat een veilige bovengrens.', evidence_refs: ['VITD-SAFE-001'] },
        { section_id: 'geen-zelfdiagnose', title: 'Geen zelfdiagnose', body: 'Alleen een bloedtest bij je arts kan een tekort vaststellen; Trainingskompas kan dit niet.', evidence_refs: ['VITD-DIAGNOSIS-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'VITD-FAQ-NEMEN', question: 'Moet ik vitamine D nemen?', evidence_refs: ['VITD-PREVENT-001', 'VITD-DIAGNOSIS-001'] },
        { faq_id: 'VITD-FAQ-PRESTATIE', question: 'Verbetert vitamine D mijn sportprestatie?', evidence_refs: ['VITD-PERF-DEFICIENT-001'] },
        { faq_id: 'VITD-FAQ-TEVEEL', question: 'Kan ik te veel vitamine D binnenkrijgen?', evidence_refs: ['VITD-SAFE-001'] }
      ]
    },
    {
      topic_id: 'CALCIUM', domain: 'SUPPLEMENT',
      display_name: 'Calcium', quick_summary_evidence_ref: 'CALC-FUNC-001',
      quick_summary_text: 'Calcium is onmisbaar voor sterke botten -- de meeste mensen halen genoeg uit voeding.',
      sections: [
        { section_id: 'functie', title: 'Functie', body: 'Calcium is essentieel voor botopbouw, spierfunctie en zenuwsignalering.', evidence_refs: ['CALC-FUNC-001'] },
        { section_id: 'voedingsbronnen', title: 'Voedingsbronnen', body: 'De meeste mensen halen voldoende calcium uit zuivel, bepaalde groenten en verrijkte plantaardige dranken.', evidence_refs: ['CALC-SOURCES-001'] },
        { section_id: 'sportcontext-red-s', title: 'Sportcontext & RED-S', body: 'Bij langdurige lage energiebeschikbaarheid spelen calcium en vitamine D een rol in botgezondheid, naast energiebeschikbaarheid zelf.', evidence_refs: ['CALC-REDS-001'] },
        { section_id: 'supplementen-context', title: 'Supplementen in context', body: 'Een calciumsupplement is niet voor iedereen nodig -- vooral relevant bij sterk beperkte diëten.', evidence_refs: ['CALC-SOURCES-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'CA-FAQ-BOT', question: 'Waarom is calcium belangrijk voor botten?', evidence_refs: ['CALC-FUNC-001'] },
        { faq_id: 'CA-FAQ-REDS', question: 'Wat heeft calcium met RED-S te maken?', evidence_refs: ['CALC-REDS-001'] },
        { faq_id: 'CA-FAQ-SUPPLEMENT', question: 'Heb ik een calciumsupplement nodig?', evidence_refs: ['CALC-SOURCES-001'] }
      ]
    },
    {
      topic_id: 'MAGNESIUM', domain: 'SUPPLEMENT',
      display_name: 'Magnesium', quick_summary_evidence_ref: 'MAG-FUNC-001',
      quick_summary_text: 'Magnesium is nodig voor energiestofwisseling en spierwerking -- maar het bewijs voor kramppreventie of extra prestatiewinst bij sporters is zwak.',
      sections: [
        { section_id: 'functie', title: 'Functie', body: 'Magnesium speelt een normale rol in energiestofwisseling, spiercontractie en zenuwfunctie.', evidence_refs: ['MAG-FUNC-001'] },
        { section_id: 'spierkramp', title: 'Spierkramp', body: 'Een grote wetenschappelijke review vindt onvoldoende bewijs dat magnesium spierkrampen voorkomt of verhelpt.', evidence_refs: ['MAG-CRAMP-001'] },
        { section_id: 'prestatie-sporters', title: 'Prestatie bij sporters', body: 'Bij een normale magnesiumstatus laat onderzoek bij sporters geen duidelijk prestatievoordeel van extra magnesium zien.', evidence_refs: ['MAG-PERF-001'] },
        { section_id: 'veiligheid', title: 'Veiligheid', body: 'Via voeding is een overdosis vrijwel onmogelijk; hoge supplementdoses kunnen diarree geven.', evidence_refs: ['MAG-SAFE-001'] },
        { section_id: 'misverstanden', title: 'Veelgemaakte misverstanden', body: '"Magnesium voorkomt kramp" en "magnesium verbetert altijd je herstel" zijn beide onvoldoende onderbouwd voor sporters met een normale status.', evidence_refs: ['MAG-CRAMP-001', 'MAG-PERF-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'MG-FAQ-KRAMP', question: 'Helpt magnesium tegen spierkramp?', evidence_refs: ['MAG-CRAMP-001'] },
        { faq_id: 'MG-FAQ-HERSTEL', question: 'Verbetert magnesium mijn herstel?', evidence_refs: ['MAG-PERF-001'] },
        { faq_id: 'MG-FAQ-TEVEEL', question: 'Kan ik te veel magnesium binnenkrijgen?', evidence_refs: ['MAG-SAFE-001'] }
      ]
    },
    {
      topic_id: 'ZINC', domain: 'SUPPLEMENT',
      display_name: 'Zink', quick_summary_evidence_ref: 'ZINC-FUNC-001',
      quick_summary_text: 'Zink ondersteunt je immuunsysteem -- het bewijs dat extra zink je testosteron of prestatie verhoogt, is onvoldoende.',
      sections: [
        { section_id: 'functie', title: 'Functie', body: 'Zink speelt een normale rol in immuunfunctie, wondheling en eiwitstofwisseling.', evidence_refs: ['ZINC-FUNC-001'] },
        { section_id: 'testosteron-hype', title: 'Zink en testosteron', body: 'Er is onvoldoende goed bewijs dat extra zink bij een normale zinkstatus je testosteron of prestatie verhoogt.', evidence_refs: ['ZINC-TESTOSTERONE-001'] },
        { section_id: 'restrictief-voedingspatroon', title: 'Restrictief/plantaardig voedingspatroon', body: 'Eet je overwegend plantaardig? Dan kan je zinkinname/-opname wat lager uitvallen.', evidence_refs: ['ZINC-RESTRICTIVE-001'] },
        { section_id: 'misverstanden', title: 'Veelgemaakte misverstanden', body: '"Zink verhoogt testosteron" is gebaseerd op zwak, vaak industrie-gelieerd onderzoek.', evidence_refs: ['ZINC-TESTOSTERONE-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'ZN-FAQ-TESTOSTERON', question: 'Verhoogt zink mijn testosteron?', evidence_refs: ['ZINC-TESTOSTERONE-001'] },
        { faq_id: 'ZN-FAQ-PLANTAARDIG', question: 'Krijg ik genoeg zink binnen als ik plantaardig eet?', evidence_refs: ['ZINC-RESTRICTIVE-001'] }
      ]
    },
    {
      topic_id: 'VITAMIN_B12', domain: 'SUPPLEMENT',
      display_name: 'Vitamine B12', quick_summary_evidence_ref: 'B12-FUNC-001',
      quick_summary_text: 'B12 is nodig voor bloed en zenuwstelsel -- extra aandachtspunt bij een veganistisch voedingspatroon.',
      sections: [
        { section_id: 'functie', title: 'Functie', body: 'Vitamine B12 is essentieel voor rode bloedcellen en een gezonde werking van het zenuwstelsel.', evidence_refs: ['B12-FUNC-001'] },
        { section_id: 'veganisme', title: 'Veganistisch voedingspatroon', body: 'B12 zit vrijwel alleen in dierlijke producten -- een verrijkt product of supplement wordt daarom vaak aanbevolen.', evidence_refs: ['B12-VEGAN-001'] },
        { section_id: 'diagnose', title: 'Diagnose', body: 'Alleen een bloedtest bij je arts kan een B12-tekort vaststellen; vermoeidheid alleen zegt dat niet.', evidence_refs: ['B12-DIAGNOSIS-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'B12-FAQ-VEGAN', question: 'Ik ben vegan, moet ik B12 gebruiken?', evidence_refs: ['B12-VEGAN-001'] },
        { faq_id: 'B12-FAQ-VERMOEID', question: 'Kan vermoeidheid door een B12-tekort komen?', evidence_refs: ['B12-DIAGNOSIS-001'] }
      ]
    },
    {
      topic_id: 'FOLATE', domain: 'SUPPLEMENT',
      display_name: 'Folaat', quick_summary_evidence_ref: 'FOL-FUNC-001',
      quick_summary_text: 'Folaat is nodig voor celdeling en bloedaanmaak, extra belangrijk rond een zwangerschap.',
      sections: [
        { section_id: 'functie', title: 'Functie', body: 'Folaat is nodig voor celdeling en de aanmaak van rode bloedcellen, en bijzonder belangrijk rond de zwangerschap.', evidence_refs: ['FOL-FUNC-001'] },
        { section_id: 'voedingsbronnen', title: 'Voedingsbronnen', body: 'Bladgroenten, peulvruchten en volkoren producten leveren van nature veel folaat.', evidence_refs: ['FOL-SOURCES-001'] },
        { section_id: 'bovengrens', title: 'Bovengrens ≠ streefdoel', body: 'Er bestaat een veilige bovengrens voor foliumzuur uit supplementen -- dat is geen streefdoel, maar een maximum.', evidence_refs: ['FOL-UL-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'FOL-FAQ-BRONNEN', question: 'Welke voeding levert veel folaat?', evidence_refs: ['FOL-SOURCES-001'] },
        { faq_id: 'FOL-FAQ-BOVENGRENS', question: 'Kan ik te veel foliumzuur binnenkrijgen?', evidence_refs: ['FOL-UL-001'] }
      ]
    },
    {
      topic_id: 'IODINE', domain: 'SUPPLEMENT',
      display_name: 'Jodium', quick_summary_evidence_ref: 'IOD-FUNC-001',
      quick_summary_text: 'Jodium is nodig voor je schildklier -- zowel te weinig als te veel kan de schildklierfunctie beïnvloeden.',
      sections: [
        { section_id: 'functie', title: 'Functie', body: 'Jodium is een essentieel bestanddeel van schildklierhormonen, die de stofwisseling reguleren.', evidence_refs: ['IOD-FUNC-001'] },
        { section_id: 'balans', title: 'Te weinig én te veel', body: 'Zowel te weinig als te veel jodium kan de schildklierfunctie negatief beïnvloeden.', evidence_refs: ['IOD-BALANCE-001'] },
        { section_id: 'diagnose', title: 'Diagnose', body: 'Schildklierklachten stel je niet zelf vast -- dat vereist bloedonderzoek bij een arts.', evidence_refs: ['IOD-DIAGNOSIS-001'] },
        { section_id: 'veelgestelde-vragen', title: 'Veelgestelde vragen', body: 'Zie de FAQ hieronder.', evidence_refs: [] },
        { section_id: 'wetenschap', title: 'Wetenschappelijke onderbouwing', body: 'Bekijk per uitspraak het bewijsniveau, de populatie/context en de beperkingen.', evidence_refs: [] },
        { section_id: 'bronnen', title: 'Bronnen', body: 'Alle bronnen die dit dossier onderbouwen.', evidence_refs: [] }
      ],
      faq: [
        { faq_id: 'IOD-FAQ-SCHILDKLIER', question: 'Wat doet jodium voor mijn schildklier?', evidence_refs: ['IOD-FUNC-001'] },
        { faq_id: 'IOD-FAQ-SUPPLEMENT', question: 'Verbetert een jodiumsupplement mijn sportprestatie?', evidence_refs: ['IOD-BALANCE-001'] }
      ]
    }
  ];
  TOPICS.push.apply(TOPICS, NK06_TOPICS);

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
