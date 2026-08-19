/* ==========================================================================
 * TrainingKompas — RELATIONSHIP DISCOVERY ENGINE  (Sprint 19)
 * --------------------------------------------------------------------------
 * Contract: relationship.v1
 *
 * WAAROM DEZE LAAG BESTAAT
 * Tot en met v4.40.0 kende Trainingskompas drie vaste verbanden, met de hand
 * opgeschreven in DecisionCore.VERBAND_DEFINITIES. Dat schaalt niet: het aantal
 * mogelijke relaties tussen herstel, training, prestatie, lichaam en omgeving
 * loopt in de tientallen en groeit mee met elke nieuwe databron. Deze engine
 * draait de richting om. Hij kijkt eerst wat er WERKELIJK aan data is, leidt
 * daaruit kandidaatrelaties af, en laat er alleen die door die genoeg data,
 * genoeg kwaliteit en genoeg spreiding hebben.
 *
 * WAT DEZE ENGINE NIET DOET — en waarom dat belangrijk is
 *   - Hij berekent GEEN correlatie. Dat blijft CalcCore.spearman (correlation.v1).
 *   - Hij keurt GEEN meetreeksen. Dat blijft DeviceCore.pairQuality (dataquality.v1).
 *   - Hij formuleert GEEN zin en bepaalt GEEN sterktegrens. Dat blijft
 *     DecisionCore.releaseVerband (verband.v1). Er komt hier dus geen tweede
 *     correlatie-implementatie, geen tweede sterkteschaal en geen tweede taal.
 * Wat hij WEL toevoegt: inventarisatie, kandidaatvorming, spreidingstoets,
 * betrouwbaarheid, classificatie en rangschikking. Precies de stappen die
 * ontbraken tussen "we hebben data" en "dit mag een sporter zien".
 *
 * KETEN
 *   RAW DATA -> DATA QUALITY -> CALCULATION -> DECISION -> RELATIONSHIP -> COACH -> UI
 *
 * GEEN CAUSALITEIT. Nergens in dit bestand staat een woord dat oorzaak en gevolg
 * suggereert, en de zinnen komen sowieso uit DecisionCore. RELATIE_VERBODEN_WOORDEN
 * bestaat uitsluitend zodat een test dat kan afdwingen.
 *
 * GEEN POPULATIECLAIMS. Uitsluitend de eigen gegevens van deze sporter. Er is geen
 * referentiedataset, geen normgroep en geen vergelijking met anderen.
 *
 * PUUR EN DETERMINISTISCH. Geen Date.now(), geen Math.random(), geen DOM, geen
 * netwerk. Een tijdstempel komt binnen via `at`. Dezelfde invoer geeft altijd
 * exact dezelfde uitvoer — dat is wat "deterministisch" hier betekent en wat de
 * evidence-laag uit Sprint 18 nodig heeft om een uitkomst te kunnen reproduceren.
 * ========================================================================== */
(function (global) {
  'use strict';

  var RELATIONSHIP_VERSIE = 'relationship.v1';

  /* ────────────────────────────────────────────────────────────────────────
   * DOMEINEN
   * De vier categorieen waarin de sporter zijn verbanden filtert. Bewust vier
   * en niet twintig: een filterrij die niet op een telefoon past is geen filter.
   * 'body' hangt onder Herstel omdat lichaamsmetingen voor de sporter bij zijn
   * lichaam horen, niet bij zijn training.
   * ──────────────────────────────────────────────────────────────────────── */
  var DOMEINEN = [
    { key: 'recovery',    label: 'Herstel',    volgorde: 1 },
    { key: 'training',    label: 'Training',   volgorde: 2 },
    { key: 'performance', label: 'Prestaties', volgorde: 3 },
    { key: 'environment', label: 'Omgeving',   volgorde: 4 }
  ];
  function domeinLabel(key) {
    for (var i = 0; i < DOMEINEN.length; i++) if (DOMEINEN[i].key === key) return DOMEINEN[i].label;
    return null;
  }

  /* ────────────────────────────────────────────────────────────────────────
   * VARIABELENREGISTER
   *
   * Elke regel beschrijft EEN grootheid die als dagreeks beschikbaar kan zijn.
   * Dit is productconfiguratie, geen logica: een nieuwe grootheid is een extra
   * regel, geen nieuwe code.
   *
   *   key      : sleutel van de dagreeks in het `bronnen`-object
   *   label    : korte naam voor kaart en filter
   *   zinNaam  : hoe de grootheid in lopende tekst heet (HRV blijft HRV)
   *   conditie : hoe "meer van deze grootheid" in gewone taal klinkt; nodig
   *              zodra de grootheid als BRON (linkerkant) in een zin staat
   *   noemer   : hoe de grootheid als DOEL (rechterkant) in een zin heet
   *   eenheid  : voor as-labels en tooltips
   *   domein   : filtercategorie
   *   inputs   : de RUWE invoer waaruit de grootheid volgt. Dit is de basis van
   *              de circulariteitstoets in DecisionCore: twee grootheden die
   *              dezelfde ruwe invoer delen meten de formule en niet de sporter.
   *   veld     : veldnaam voor de datakwaliteitslaag (DQ_CONTRACT-sleutel) —
   *              null wanneer er geen brondatacontract is (afgeleide grootheden)
   *   afgeleid : true wanneer de waarde uit een berekening komt in plaats van
   *              uit een meting. Afgeleide grootheden mogen nooit tegen hun
   *              eigen invoer worden gecorreleerd (vangt de circulariteitstoets af)
   *   beschikbaarheid : 'nu' wanneer de app deze reeks vandaag kan leveren,
   *              'toekomstig' wanneer het register hem al kent maar er nog geen
   *              bron voor bestaat. Zo staat de uitbreidbaarheid in data en niet
   *              in een to-do-lijst, zonder dat er ooit iets verzonnen wordt.
   * ──────────────────────────────────────────────────────────────────────── */
  var VARIABLE_REGISTRY = [
    /* ── Herstel ─────────────────────────────────────────────────────────── */
    { key: 'hrv', label: 'HRV', zinNaam: 'HRV', conditie: 'je HRV hoger was', noemer: 'HRV',
      eenheid: 'ms', domein: 'recovery', inputs: ['hrv'], veld: 'hrv', afgeleid: false, beschikbaarheid: 'nu' },
    { key: 'rhr', label: 'Rusthartslag', zinNaam: 'rusthartslag', conditie: 'je rusthartslag hoger was',
      noemer: 'rusthartslag', eenheid: 'bpm', domein: 'recovery', inputs: ['rhr'], veld: 'rhr',
      afgeleid: false, beschikbaarheid: 'nu' },
    { key: 'sleep', label: 'Slaap', zinNaam: 'slaap', conditie: 'je langer sliep', noemer: 'slaapduur',
      eenheid: 'u', domein: 'recovery', inputs: ['sleep'], veld: 'sleep', afgeleid: false, beschikbaarheid: 'nu' },
    { key: 'dagfactor', label: 'Dagfactor', zinNaam: 'dagfactor', conditie: 'je dagfactor hoger was',
      noemer: 'dagfactor', eenheid: '', domein: 'recovery', inputs: ['hrv', 'sleep'], veld: null,
      afgeleid: true, beschikbaarheid: 'nu' },
    { key: 'readiness', label: 'Gereedheid', zinNaam: 'gereedheid', conditie: 'je gereedheid hoger was',
      noemer: 'gereedheid', eenheid: '%', domein: 'recovery', inputs: ['hrv', 'sleep'], veld: null,
      afgeleid: true, beschikbaarheid: 'nu' },
    { key: 'gewicht', label: 'Lichaamsgewicht', zinNaam: 'lichaamsgewicht', conditie: 'je zwaarder woog',
      noemer: 'lichaamsgewicht', eenheid: 'kg', domein: 'recovery', inputs: ['weight'], veld: 'weight',
      afgeleid: false, beschikbaarheid: 'nu' },

    /* ── Training ────────────────────────────────────────────────────────── */
    { key: 'volume', label: 'Trainingsvolume', zinNaam: 'trainingsvolume', conditie: 'je meer volume draaide',
      noemer: 'trainingsvolume', eenheid: 'kg', domein: 'training', inputs: ['sets', 'reps', 'weight_kg'],
      veld: null, afgeleid: true, beschikbaarheid: 'nu' },
    { key: 'rpe', label: 'RPE', zinNaam: 'RPE', conditie: 'je RPE hoger lag', noemer: 'RPE',
      eenheid: '', domein: 'training', inputs: ['rpe'], veld: null, afgeleid: false, beschikbaarheid: 'nu' },
    { key: 'sets', label: 'Aantal sets', zinNaam: 'aantal sets', conditie: 'je meer sets deed',
      noemer: 'aantal sets', eenheid: '', domein: 'training', inputs: ['sets'], veld: null,
      afgeleid: false, beschikbaarheid: 'nu' },
    { key: 'load', label: 'Trainingsbelasting', zinNaam: 'trainingsbelasting',
      conditie: 'je trainingsbelasting hoger was', noemer: 'trainingsbelasting', eenheid: '',
      domein: 'training', inputs: ['sets', 'reps', 'weight_kg', 'rpe'], veld: null,
      afgeleid: true, beschikbaarheid: 'nu' },
    { key: 'load_vorige_dag', label: 'Belasting vorige dag', zinNaam: 'trainingsbelasting van de dag ervoor',
      conditie: 'je de dag ervoor zwaarder had getraind', noemer: 'trainingsbelasting van de dag ervoor',
      eenheid: '', domein: 'training', inputs: ['sets_prev', 'reps_prev', 'weight_kg_prev', 'rpe_prev'],
      veld: null, afgeleid: true, beschikbaarheid: 'nu' },
    /* De weekbelasting is de rollende som van de belasting van de afgelopen zeven
       dagen — INCLUSIEF vandaag. Zijn ruwe invoer is daarom exact dezelfde als die
       van de dagbelasting, en niet een aparte "_7d"-variant. Dat is geen detail:
       met een eigen invoerlijst zou de circulariteitstoets weekbelasting tegen
       volume, sets en belasting toestaan, en dat levert per definitie een sterk
       verband op — je vergelijkt een som met een van zijn eigen termen. Zo'n
       uitkomst ziet er precies zo overtuigend uit als een echte bevinding.
       Om dezelfde reden staan ook de "_prev"-invoeren erbij: het venster van zeven
       dagen bevat gisteren, dus weekbelasting tegen belasting-van-gisteren zetten is
       net zo goed een som tegen een van zijn eigen termen.
       Tegenover HRV, slaap of rusthartslag blijft de weekbelasting wél een geldige
       kandidaat: die delen geen enkele ruwe invoer. */
    { key: 'weekbelasting', label: 'Weekbelasting', zinNaam: 'weekbelasting',
      conditie: 'je weekbelasting hoger was', noemer: 'weekbelasting', eenheid: '', domein: 'training',
      inputs: ['sets', 'reps', 'weight_kg', 'rpe',
               'sets_prev', 'reps_prev', 'weight_kg_prev', 'rpe_prev'], veld: null,
      afgeleid: true, beschikbaarheid: 'nu' },
    /* Duur per sessie wordt vandaag NIET opgeslagen (de sessions-tabel heeft geen
       duurkolom). Daarom 'toekomstig': het register kent de grootheid, er is alleen
       nog geen bron voor. Zie AthleteCore.unifiedLoad, dat om dezelfde reden geen
       gezamenlijke belasting kan leveren. */
    { key: 'duur', label: 'Trainingsduur', zinNaam: 'trainingsduur', conditie: 'je langer trainde',
      noemer: 'trainingsduur', eenheid: 'min', domein: 'training', inputs: ['duration'], veld: null,
      afgeleid: false, beschikbaarheid: 'toekomstig' },
    { key: 'rust', label: 'Rustduur', zinNaam: 'rustduur tussen sets', conditie: 'je langer rustte',
      noemer: 'rustduur tussen sets', eenheid: 's', domein: 'training', inputs: ['rest_sec'], veld: null,
      afgeleid: false, beschikbaarheid: 'toekomstig' },

    /* ── Prestaties ──────────────────────────────────────────────────────── */
    /* Geleverd als prestatie-INDEX (performance_index.v1): je e1RM gedeeld door je
       eigen mediane niveau voor dezelfde oefening. Een absolute e1RM-dagreeks zou
       vooral meten welke oefening je die dag deed, niet hoe je presteerde. */
    { key: 'e1rm', label: 'Prestatieniveau', zinNaam: 'prestatieniveau', conditie: 'je boven je eigen niveau presteerde',
      noemer: 'prestatieniveau', eenheid: '', domein: 'performance', inputs: ['weight_kg', 'reps'],
      veld: null, afgeleid: true, beschikbaarheid: 'nu' },
    { key: 'topgewicht', label: 'Topgewicht', zinNaam: 'zwaarste set', conditie: 'je zwaarder tilde',
      noemer: 'zwaarste set', eenheid: 'kg', domein: 'performance', inputs: ['weight_kg'], veld: null,
      afgeleid: false, beschikbaarheid: 'nu' },
    { key: 'cardio_split', label: 'Cardio-split', zinNaam: 'split per 500 m', conditie: 'je split lager lag',
      noemer: 'split per 500 m', eenheid: 's', domein: 'performance', inputs: ['distance', 'duration'],
      veld: null, afgeleid: true, beschikbaarheid: 'nu' },

    /* ── Omgeving ────────────────────────────────────────────────────────── */
    { key: 'temperatuur', label: 'Temperatuur', zinNaam: 'temperatuur', conditie: 'het warmer was',
      noemer: 'temperatuur', eenheid: '°C', domein: 'environment', inputs: ['temp_c'], veld: null,
      afgeleid: false, beschikbaarheid: 'toekomstig' },
    { key: 'luchtvochtigheid', label: 'Luchtvochtigheid', zinNaam: 'luchtvochtigheid',
      conditie: 'de luchtvochtigheid hoger was', noemer: 'luchtvochtigheid', eenheid: '%',
      domein: 'environment', inputs: ['humidity'], veld: null, afgeleid: false, beschikbaarheid: 'toekomstig' },
    { key: 'wind', label: 'Wind', zinNaam: 'windsnelheid', conditie: 'het harder waaide',
      noemer: 'windsnelheid', eenheid: 'km/u', domein: 'environment', inputs: ['wind_kmh'], veld: null,
      afgeleid: false, beschikbaarheid: 'toekomstig' }
  ];

  function variableRegistry() { return VARIABLE_REGISTRY.slice(); }
  function variableByKey(key) {
    for (var i = 0; i < VARIABLE_REGISTRY.length; i++) if (VARIABLE_REGISTRY[i].key === key) return VARIABLE_REGISTRY[i];
    return null;
  }

  /* ────────────────────────────────────────────────────────────────────────
   * DREMPELS
   *
   * REL_MIN_PATROON is bewust GELIJK aan DecisionCore.VERBAND_MIN_N (30). Dat is
   * een bestaand productbesluit; deze engine verlaagt het niet en verzint geen
   * eigen, soepeler grens. De tiers eronder bestaan puur om de sporter te laten
   * zien HOEVER hij is — "nog 18 dagen te gaan" is bruikbare informatie, een
   * lege lijst niet.
   * ──────────────────────────────────────────────────────────────────────── */
  var REL_MIN_KANDIDAAT = 10;   // onder dit aantal wordt een kandidaat niet eens getoond
  var REL_MIN_PATROON   = 30;   // vanaf hier mag van een patroon gesproken worden
  var REL_MIN_DISTINCT  = 5;    // minimaal aantal verschillende waarden per zijde
  var REL_MAX_UITSLUIT  = 0.35; // meer dan 35% uitgesloten dagen -> kwaliteit onvoldoende
  var REL_LAGE_KWALITEIT = 0.20;// vanaf 20% uitgesloten daalt de betrouwbaarheid
  var REL_TOON_MAX      = 12;   // maximum aantal relaties in een overzicht

  var SAMPLE_TIERS = [
    { key: 'geen',       grens: REL_MIN_KANDIDAAT, score: 0, label: 'Onvoldoende data' },
    { key: 'voorlopig',  grens: 20,                score: 1, label: 'Voorlopig beeld' },
    { key: 'opkomend',   grens: REL_MIN_PATROON,   score: 2, label: 'Bijna genoeg data' },
    { key: 'redelijk',   grens: 50,                score: 3, label: 'Redelijke basis' },
    { key: 'ruim',       grens: Infinity,          score: 4, label: 'Ruime basis' }
  ];
  function sampleTier(n) {
    var v = (typeof n === 'number' && isFinite(n) && n > 0) ? Math.floor(n) : 0;
    for (var i = 0; i < SAMPLE_TIERS.length; i++) if (v < SAMPLE_TIERS[i].grens) return SAMPLE_TIERS[i];
    return SAMPLE_TIERS[SAMPLE_TIERS.length - 1];
  }

  /* ────────────────────────────────────────────────────────────────────────
   * SPREIDING
   *
   * Een rangcorrelatie over een reeks die vrijwel stilstaat is wiskundig geldig
   * en inhoudelijk waardeloos: als je slaap 40 dagen lang 7,5 uur is, zegt de
   * uitkomst iets over afrondingsruis. Deze toets telt daarom het aantal
   * VERSCHILLENDE waarden. Bewust geen standaarddeviatie: die is niet vergelijkbaar
   * tussen eenheden (ms, uren, kg) zonder een drempel per grootheid te verzinnen.
   * ──────────────────────────────────────────────────────────────────────── */
  function spreiding(waarden) {
    var arr = Array.isArray(waarden) ? waarden : [];
    var gezien = {}, aantal = 0, n = 0;
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (typeof v !== 'number' || !isFinite(v)) continue;
      n++;
      var k = String(v);
      if (!gezien[k]) { gezien[k] = true; aantal++; }
    }
    return {
      versie: RELATIONSHIP_VERSIE,
      n: n,
      distinct: aantal,
      minimum: REL_MIN_DISTINCT,
      voldoende: aantal >= REL_MIN_DISTINCT,
      reden: aantal >= REL_MIN_DISTINCT ? 'ok' : 'te_weinig_variatie'
    };
  }

  /* ────────────────────────────────────────────────────────────────────────
   * DATAKWALITEIT VAN EEN KANDIDAAT
   *
   * Sample count alleen is niet genoeg. Een kandidaat met 40 gekoppelde dagen
   * waarvan er 20 zijn uitgesloten door de datakwaliteitslaag is minder waard
   * dan een kandidaat met 32 schone dagen. Deze functie zet die twee dingen bij
   * elkaar en levert een expliciet oordeel in plaats van een gevoel.
   * ──────────────────────────────────────────────────────────────────────── */
  function relationQuality(kwaliteit, spreidingA, spreidingB) {
    var kw = kwaliteit || {};
    var vergelijkbaar = (typeof kw.comparableDays === 'number' && isFinite(kw.comparableDays))
      ? Math.max(0, Math.floor(kw.comparableDays)) : 0;
    var uitgesloten = (typeof kw.excludedDays === 'number' && isFinite(kw.excludedDays))
      ? Math.max(0, Math.floor(kw.excludedDays)) : 0;
    var totaal = vergelijkbaar + uitgesloten;
    var aandeel = totaal > 0 ? (uitgesloten / totaal) : 0;
    var sprA = spreidingA || { voldoende: false }, sprB = spreidingB || { voldoende: false };

    var redenen = [];
    if (aandeel > REL_MAX_UITSLUIT) redenen.push('te_veel_uitgesloten');
    if (!sprA.voldoende) redenen.push('te_weinig_variatie_bron');
    if (!sprB.voldoende) redenen.push('te_weinig_variatie_doel');

    var niveau;
    if (redenen.length) niveau = 'onvoldoende';
    else if (aandeel > REL_LAGE_KWALITEIT) niveau = 'beperkt';
    else niveau = 'goed';

    return {
      versie: RELATIONSHIP_VERSIE,
      niveau: niveau,
      bruikbaar: niveau !== 'onvoldoende',
      vergelijkbaar: vergelijkbaar,
      uitgesloten: uitgesloten,
      uitgeslotenAandeel: Math.round(aandeel * 1000) / 1000,
      spreidingBron: sprA,
      spreidingDoel: sprB,
      redenen: redenen
    };
  }

  /* ────────────────────────────────────────────────────────────────────────
   * CLASSIFICATIE
   *
   * Vijf toestanden. De eerste twee zijn geen zwakkere versie van de andere
   * drie maar iets wezenlijk anders, en dat onderscheid is het hele punt:
   *   INSUFFICIENT_DATA — we weten het niet. Zegt NIETS over of er een verband is.
   *   NO_PATTERN        — genoeg data, en er is geen patroon zichtbaar. Dat is een
   *                       uitkomst, geen leegte, en hij hoort getoond te worden.
   *   POSSIBLE/MODERATE/STRONG_PATTERN — oplopende sterkte.
   *
   * De sterktebanden komen ONGEWIJZIGD uit DecisionCore.releaseVerband. Deze
   * functie vertaalt alleen; hij bepaalt geen grens. Zou hij dat wel doen, dan
   * had de app twee sterkteschalen die uit elkaar kunnen lopen.
   * ──────────────────────────────────────────────────────────────────────── */
  var CLASSIFICATIES = {
    INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
    NO_PATTERN:        'NO_PATTERN',
    POSSIBLE_PATTERN:  'POSSIBLE_PATTERN',
    MODERATE_PATTERN:  'MODERATE_PATTERN',
    STRONG_PATTERN:    'STRONG_PATTERN'
  };
  var STERKTE_NAAR_CLASSIFICATIE = {
    verwaarloosbaar: CLASSIFICATIES.NO_PATTERN,
    zwak:            CLASSIFICATIES.POSSIBLE_PATTERN,
    matig:           CLASSIFICATIES.MODERATE_PATTERN,
    sterk:           CLASSIFICATIES.STRONG_PATTERN
  };
  var CLASSIFICATIE_RANG = {
    INSUFFICIENT_DATA: 0, NO_PATTERN: 1, POSSIBLE_PATTERN: 2, MODERATE_PATTERN: 3, STRONG_PATTERN: 4
  };
  function classify(besluit, kwaliteitsOordeel) {
    var b = besluit || {}, q = kwaliteitsOordeel || {};
    if (!q.bruikbaar) return CLASSIFICATIES.INSUFFICIENT_DATA;
    if (!b.vrijgegeven) return CLASSIFICATIES.INSUFFICIENT_DATA;
    var c = STERKTE_NAAR_CLASSIFICATIE[b.strength];
    return c || CLASSIFICATIES.INSUFFICIENT_DATA;
  }

  /* ────────────────────────────────────────────────────────────────────────
   * BETROUWBAARHEID
   *
   * Sterkte en betrouwbaarheid zijn twee verschillende dingen en worden hier
   * bewust apart gehouden. Een sterke samenhang over 31 rommelige dagen is
   * minder te vertrouwen dan een matige samenhang over 90 schone dagen. De
   * sporter hoort dat verschil te zien.
   * ──────────────────────────────────────────────────────────────────────── */
  var CONFIDENCE_NIVEAUS = ['laag', 'gemiddeld', 'hoog'];
  function confidence(n, kwaliteitsOordeel) {
    var q = kwaliteitsOordeel || {};
    var tier = sampleTier(n);
    var score = tier.score;                        // 0..4
    if (q.niveau === 'onvoldoende') return 'laag';
    if (q.niveau === 'beperkt') score -= 1;
    if (score >= 3) return 'hoog';
    if (score >= 2) return 'gemiddeld';
    return 'laag';
  }

  /* ────────────────────────────────────────────────────────────────────────
   * KANDIDAATVORMING
   *
   * Uit N beschikbare grootheden volgen N*(N-1)/2 paren. Bij 20 grootheden zijn
   * dat er 190 — precies de "correlation spam" die we niet willen. Er wordt
   * daarom vroeg gefilterd, VOORDAT er ook maar iets gerekend wordt:
   *   1. beide grootheden moeten werkelijk data hebben
   *   2. geen paar met zichzelf
   *   3. geen circulair paar (gedeelde ruwe invoer) — de toets zelf staat in
   *      DecisionCore, hier wordt hij alleen aangeroepen
   *   4. richting vastleggen: de bron moet een `conditie` hebben, anders is er
   *      geen zin te maken en heeft het paar geen zin
   * ──────────────────────────────────────────────────────────────────────── */
  function _definitieVan(bron, doel) {
    return {
      id: bron.key + '__' + doel.key,
      label: bron.label + ' en ' + doel.label,
      methode: 'spearman',
      minimumN: REL_MIN_PATROON,
      vensterDagen: null,
      a: { veld: bron.key, label: bron.label, eenheid: bron.eenheid, inputs: bron.inputs,
           conditie: bron.conditie, zinNaam: bron.zinNaam },
      b: { veld: doel.key, label: doel.label, eenheid: doel.eenheid, inputs: doel.inputs,
           noemer: doel.noemer, zinNaam: doel.zinNaam }
    };
  }

  /* inventory(bronnen) → wat is er werkelijk?
   * `bronnen` is een object { variabelesleutel: [{date, value}] }. Er wordt niets
   * aangenomen over welke sleutels aanwezig zijn; ontbrekende reeksen leveren
   * gewoon aanwezig:false op. Nooit een lege reeks aanvullen. */
  function inventory(bronnen) {
    var src = bronnen || {};
    var items = VARIABLE_REGISTRY.map(function (v) {
      var reeks = Array.isArray(src[v.key]) ? src[v.key] : [];
      var geldig = reeks.filter(function (p) {
        return p && p.date && typeof p.value === 'number' && isFinite(p.value);
      });
      var datums = {};
      geldig.forEach(function (p) { datums[String(p.date).slice(0, 10)] = true; });
      var lijst = Object.keys(datums).sort();
      return {
        key: v.key, label: v.label, domein: v.domein, domeinLabel: domeinLabel(v.domein),
        eenheid: v.eenheid, afgeleid: !!v.afgeleid, beschikbaarheid: v.beschikbaarheid,
        aanwezig: lijst.length > 0,
        metingen: geldig.length,
        dagen: lijst.length,
        eerste: lijst.length ? lijst[0] : null,
        laatste: lijst.length ? lijst[lijst.length - 1] : null
      };
    });
    return {
      versie: RELATIONSHIP_VERSIE,
      variabelen: items,
      aanwezig: items.filter(function (i) { return i.aanwezig; }).map(function (i) { return i.key; }),
      ontbrekend: items.filter(function (i) { return !i.aanwezig; }).map(function (i) { return i.key; })
    };
  }

  /* candidates(inventarisatie, deps) → alle paren die het proberen waard zijn. */
  function candidates(inventarisatie, deps) {
    var inv = inventarisatie || {};
    var d = deps || {};
    var isCirculair = (typeof d.verbandIsCirculair === 'function') ? d.verbandIsCirculair : null;
    var beschikbaar = {};
    (inv.variabelen || []).forEach(function (i) { if (i.aanwezig) beschikbaar[i.key] = i; });

    var uit = [], overgeslagen = [];
    for (var i = 0; i < VARIABLE_REGISTRY.length; i++) {
      var bron = VARIABLE_REGISTRY[i];
      if (!beschikbaar[bron.key]) continue;
      if (!bron.conditie) continue;                       // zonder conditie geen zin te maken
      for (var j = 0; j < VARIABLE_REGISTRY.length; j++) {
        if (i === j) continue;
        var doel = VARIABLE_REGISTRY[j];
        if (!beschikbaar[doel.key]) continue;
        if (!doel.noemer) continue;
        // Elk paar precies een keer: alleen de richting bron-index < doel-index.
        if (i > j) continue;
        var def = _definitieVan(bron, doel);
        if (isCirculair && isCirculair(def)) {
          overgeslagen.push({ id: def.id, reden: 'circulair' });
          continue;
        }
        uit.push({
          id: def.id, definition: def,
          bron: bron.key, doel: doel.key,
          domein: bron.domein, doelDomein: doel.domein,
          domeinLabel: domeinLabel(bron.domein),
          crossDomein: bron.domein !== doel.domein
        });
      }
    }
    return { versie: RELATIONSHIP_VERSIE, kandidaten: uit, overgeslagen: overgeslagen };
  }

  /* ────────────────────────────────────────────────────────────────────────
   * EVALUATIE — het relationship.v1-record
   *
   * Alles wat een sporter (of de coach, of een test) nodig heeft om te
   * beoordelen of deze uitkomst te vertrouwen is, staat in dit ene object.
   * `at` komt van buiten: deze functie kent de tijd niet.
   * ──────────────────────────────────────────────────────────────────────── */
  function evaluate(kandidaat, invoer) {
    var k = kandidaat || {}, x = invoer || {};
    var def = k.definition || {};
    var besluit = x.besluit || {};
    var kwaliteit = x.kwaliteit || {};
    var sprA = x.spreidingBron || spreiding([]);
    var sprB = x.spreidingDoel || spreiding([]);

    var oordeel = relationQuality(kwaliteit, sprA, sprB);
    var n = (typeof besluit.n === 'number' && isFinite(besluit.n)) ? Math.floor(besluit.n)
          : (oordeel.vergelijkbaar || 0);
    var tier = sampleTier(n);
    var status = classify(besluit, oordeel);
    var isPatroon = CLASSIFICATIE_RANG[status] >= CLASSIFICATIE_RANG.POSSIBLE_PATTERN;

    return {
      versie: RELATIONSHIP_VERSIE,
      relationship_id: k.id || def.id || null,
      source_variable: k.bron || null,
      target_variable: k.doel || null,
      label: def.label || null,
      bronLabel: (def.a && def.a.label) || null,
      doelLabel: (def.b && def.b.label) || null,
      domein: k.domein || null,
      domeinLabel: k.domeinLabel || domeinLabel(k.domein),
      doelDomein: k.doelDomein || null,
      crossDomein: !!k.crossDomein,

      period: x.periode || null,
      period_days: (typeof x.vensterDagen === 'number' && isFinite(x.vensterDagen)) ? x.vensterDagen : null,

      sample_count: n,
      actual_sample_count: n,
      minimum_sample_required: (typeof besluit.minimumN === 'number' && isFinite(besluit.minimumN))
        ? besluit.minimumN : REL_MIN_PATROON,
      sample_tier: tier.key,
      sample_tier_label: tier.label,
      nog_nodig: Math.max(0, REL_MIN_PATROON - n),

      effect: (typeof besluit.coefficient === 'number' && isFinite(besluit.coefficient)) ? besluit.coefficient : null,
      effect_direction: besluit.direction || 'none',
      strength: besluit.strength || null,
      strength_label: besluit.strengthLabel || null,
      status: status,
      is_patroon: isPatroon,

      confidence: confidence(n, oordeel),
      data_quality: oordeel,

      // Taal komt UITSLUITEND uit DecisionCore. Deze engine schrijft geen zinnen.
      zin: besluit.zin || null,
      onderbouwing: besluit.onderbouwing || null,
      disclaimer: besluit.disclaimer || null,
      sterkte_uitleg: besluit.sterkteUitleg || null,
      kwaliteit_zin: besluit.kwaliteitZin || null,
      release_reason: besluit.reason || null,

      calculation_version: (def.methode || 'spearman'),
      decision_version: besluit.versie || null,
      created_at: (x.at != null) ? x.at : null
    };
  }

  /* ────────────────────────────────────────────────────────────────────────
   * RANGSCHIKKING — de laatste rem op correlatiespam
   *
   * Ook na alle filters kunnen er meer relaties overblijven dan iemand wil
   * lezen. De volgorde is: bewezen sterkte eerst, dan betrouwbaarheid, dan
   * steekproefomvang, dan cross-domein (een verband tussen twee domeinen is voor
   * een sporter interessanter dan twee herstelmetingen die uiteraard samenhangen),
   * en tot slot alfabetisch zodat de uitkomst stabiel is. Geen willekeur: dezelfde
   * invoer geeft dezelfde volgorde.
   * ──────────────────────────────────────────────────────────────────────── */
  var CONFIDENCE_SCORE = { hoog: 3, gemiddeld: 2, laag: 1 };
  function relevance(rel) {
    var r = rel || {};
    return (CLASSIFICATIE_RANG[r.status] || 0) * 1000
         + (CONFIDENCE_SCORE[r.confidence] || 0) * 100
         + Math.min(99, r.sample_count || 0)
         + (r.crossDomein ? 0.5 : 0);
  }
  function rank(relaties, opts) {
    var o = opts || {};
    var lijst = (Array.isArray(relaties) ? relaties : []).slice();
    lijst.sort(function (a, b) {
      var d = relevance(b) - relevance(a);
      if (d !== 0) return d;
      var ai = String(a.relationship_id || ''), bi = String(b.relationship_id || '');
      return ai < bi ? -1 : (ai > bi ? 1 : 0);
    });
    var max = (typeof o.max === 'number' && isFinite(o.max) && o.max > 0) ? Math.floor(o.max) : REL_TOON_MAX;
    /* inAanmerking = alles wat de sporter MAG zien, gerangschikt en NIET afgekapt.
     * zichtbaar    = de eerste schermvulling daarvan.
     *
     * Sprint 26: tot v4.45.1 leverde deze functie alleen de afgekapte lijst, waardoor de
     * UI 29 van de 43 doorgerekende kandidaten stil liet verdwijnen — de engine wist
     * ervan, de sporter niet. De afkapping blijft bestaan (een scherm met 43 kaarten
     * leest niemand), maar de volledige lijst reist nu mee zodat de UI kan uitklappen
     * in plaats van weggooien. Dit verandert GEEN drempel en GEEN rangschikking:
     * zichtbaar is exact het eerste stuk van inAanmerking. */
    var inAanmerking = lijst.filter(function (r) {
      // Kandidaten met te weinig data mogen zichtbaar zijn (dat is informatie),
      // maar alleen boven de ondergrens: 3 dagen tonen als "nog te weinig" is ruis.
      return (r.sample_count || 0) >= REL_MIN_KANDIDAAT;
    });
    return {
      versie: RELATIONSHIP_VERSIE,
      alle: lijst,
      inAanmerking: inAanmerking,
      zichtbaar: inAanmerking.slice(0, max),
      verborgen: Math.max(0, inAanmerking.length - max),
      maximum: max,
      patronen: lijst.filter(function (r) { return r.is_patroon; }).length,
      onvoldoende: lijst.filter(function (r) { return r.status === CLASSIFICATIES.INSUFFICIENT_DATA; }).length
    };
  }

  /* ────────────────────────────────────────────────────────────────────────
   * DISCOVER — de hele keten in een aanroep
   *
   * De rekenlagen worden INGESPOTEN (`deps`), niet geimporteerd. Daardoor blijft
   * dit bestand puur testbaar en, belangrijker, kan er nooit stiekem een tweede
   * correlatie-implementatie in sluipen: ontbreekt een dependency, dan levert
   * discover een expliciete `reason` in plaats van een zelfbedachte uitkomst.
   *
   * deps = { spearman, pairQuality, releaseVerband, verbandIsCirculair }
   * ──────────────────────────────────────────────────────────────────────── */
  function discover(bronnen, deps, opts) {
    var d = deps || {}, o = opts || {};
    var ontbreekt = [];
    ['spearman', 'pairQuality', 'releaseVerband'].forEach(function (naam) {
      if (typeof d[naam] !== 'function') ontbreekt.push(naam);
    });
    if (ontbreekt.length) {
      return { versie: RELATIONSHIP_VERSIE, ok: false, reason: 'engines_ontbreken',
               ontbreekt: ontbreekt, inventarisatie: null, relaties: [], overzicht: null };
    }
    var inv = inventory(bronnen);
    var kand = candidates(inv, d);
    var src = bronnen || {};

    var relaties = kand.kandidaten.map(function (k) {
      var reeksA = Array.isArray(src[k.bron]) ? src[k.bron] : [];
      var reeksB = Array.isArray(src[k.doel]) ? src[k.doel] : [];
      var varA = variableByKey(k.bron), varB = variableByKey(k.doel);
      var kw = d.pairQuality(reeksA, reeksB,
                             { field: (varA && varA.veld) || null },
                             { field: (varB && varB.veld) || null });
      var stat = d.spearman(kw.pairs);
      var besluit = d.releaseVerband(stat, k.definition,
                                     { excludedDays: kw.excludedDays, comparableDays: kw.comparableDays });
      var paren = kw.pairs || [];
      return evaluate(k, {
        besluit: besluit, kwaliteit: kw,
        spreidingBron: spreiding(paren.map(function (p) { return p.a; })),
        spreidingDoel: spreiding(paren.map(function (p) { return p.b; })),
        periode: o.periode || null, vensterDagen: o.vensterDagen || null, at: o.at != null ? o.at : null
      });
    });

    return {
      versie: RELATIONSHIP_VERSIE, ok: true, reason: 'ok',
      inventarisatie: inv,
      overgeslagen: kand.overgeslagen,
      relaties: relaties,
      overzicht: rank(relaties, { max: o.max })
    };
  }

  /* Uitsluitend voor tests en review: woorden die oorzaak en gevolg suggereren.
   * Deze engine bouwt geen zinnen; hij geeft door wat DecisionCore formuleert. */
  var RELATIE_VERBODEN_WOORDEN = ['veroorzaakt', 'zorgt voor', 'leidt tot', 'dankzij',
    'heeft als gevolg', 'omdat je', 'komt door', 'bewijst'];
  /* Idem: formuleringen die een populatieclaim zouden zijn. */
  var RELATIE_POPULATIE_WOORDEN = ['mensen die', 'gemiddelde sporter', 'andere gebruikers',
    'de meeste sporters', 'vergeleken met anderen'];

  var RelationshipCore = {
    RELATIONSHIP_VERSIE: RELATIONSHIP_VERSIE,
    DOMEINEN: DOMEINEN,
    domeinLabel: domeinLabel,
    VARIABLE_REGISTRY: VARIABLE_REGISTRY,
    variableRegistry: variableRegistry,
    variableByKey: variableByKey,
    REL_MIN_KANDIDAAT: REL_MIN_KANDIDAAT,
    REL_MIN_PATROON: REL_MIN_PATROON,
    REL_MIN_DISTINCT: REL_MIN_DISTINCT,
    REL_MAX_UITSLUIT: REL_MAX_UITSLUIT,
    REL_TOON_MAX: REL_TOON_MAX,
    SAMPLE_TIERS: SAMPLE_TIERS,
    sampleTier: sampleTier,
    spreiding: spreiding,
    relationQuality: relationQuality,
    CLASSIFICATIES: CLASSIFICATIES,
    CLASSIFICATIE_RANG: CLASSIFICATIE_RANG,
    classify: classify,
    CONFIDENCE_NIVEAUS: CONFIDENCE_NIVEAUS,
    confidence: confidence,
    inventory: inventory,
    candidates: candidates,
    evaluate: evaluate,
    relevance: relevance,
    rank: rank,
    discover: discover,
    RELATIE_VERBODEN_WOORDEN: RELATIE_VERBODEN_WOORDEN,
    RELATIE_POPULATIE_WOORDEN: RELATIE_POPULATIE_WOORDEN,
    VERSIONS: { relationship: RELATIONSHIP_VERSIE }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = RelationshipCore; }
  if (global) { global.RelationshipCore = RelationshipCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
