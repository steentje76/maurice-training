/* ==========================================================================
 * TrainingKompas — DECISION + EVIDENCE CORE  (F1.7 / F1.8)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DECISION = "wat betekent de numerieke uitkomst voor de training?" — expliciete,
 * VERSIONEERDE sportregels. AI bepaalt deze uitkomsten NOOIT; AI mag ze alleen uitleggen.
 * CONTEXT  = periodiseringsfase (phaseForWeek) — los van decision, hier meegenomen als pure regel.
 * EVIDENCE = provenance-contract: legt vast WAAROM een uitkomst ontstond (bron + versies + regel).
 *
 * Alle functies zijn 1-op-1 uit index.html geëxtraheerd (old===new). Legacy-quirks bewust behouden.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = {
    progression: 'progression.v1',
    progression_adjust: 'progression_adjust.v1',
    readiness: 'readiness.v1',
    detraining: 'detraining.v1',
    phase: 'phase.v1',
    evidence: 'evidence.v1',
    dayzone: 'dayzone.v1',
    readiness_day: 'readiness_day.v1'
  };

  // --- progression.v1 --- exact gelijk aan legacy computeProgression(rpe,curKg).
  // Legacy-semantiek 1-op-1: guard -> null; rpe<=7.5 => +2.5; <=8.5 => 0; anders -7.5.
  function computeProgression(rpe, curKg) {
    if (rpe == null || isNaN(rpe) || !curKg) return null;
    if (rpe <= 7.5) return { delta: 2.5, label: 'Verhogen' };
    if (rpe <= 8.5) return { delta: 0, label: 'Gelijk houden' };
    return { delta: -7.5, label: 'Deload' };
  }

  // --- progression_adjust.v1 --- exact gelijk aan legacy computeProgAdjustment.
  function computeProgAdjustment(factor, muscleRecoveryRows, voelt, painMuscle) {
    var laag = (muscleRecoveryRows || []).filter(function (r) { return r.pct < 70; });
    var slecht = voelt === 'slecht';
    var matig = voelt === 'matig';
    var nodig = factor < 0.97 || laag.length > 0 || slecht || matig || !!painMuscle;
    if (!nodig) return null;
    var rpeDelta = 0, setsDelta = 0;
    if (factor < 0.90 || slecht) { rpeDelta = -1.5; setsDelta = -1; }
    else if (factor < 0.97 || matig || laag.length) { rpeDelta = -0.5; }
    var redenen = [];
    if (factor < 0.97) redenen.push('herstel-dagfactor ' + factor);
    if (laag.length) redenen.push('laag spierherstel: ' + laag.map(function (r) { return r.muscle + ' ' + r.pct + '%'; }).join(', '));
    if (slecht) redenen.push('je gaf aan je slecht te voelen');
    if (matig) redenen.push('je gaf aan je matig te voelen');
    if (painMuscle) redenen.push('pijn/ongemak gemeld: ' + painMuscle);
    return { rpeDelta: rpeDelta, setsDelta: setsDelta, redenen: redenen, painMuscle: painMuscle };
  }

  // --- readiness.v1 --- exact gelijk aan legacy trainReadiness(dfInfo).
  function trainReadiness(dfInfo) {
    if (!dfInfo) return null;
    var f = dfInfo.factor;
    if (f >= 1) return { cls: 'g', txt: 'Klaar om te trainen' };
    if (f >= 0.93) return { cls: 'y', txt: 'Train op gevoel' };
    return { cls: 'r', txt: 'Houd het licht vandaag' };
  }

  // --- detraining.v1 --- exact gelijk aan legacy detrainingFactor. rules is VERPLICHT
  // (de app-wrapper houdt de `rules||DETRAINING_RULES`-default als config/orchestratie).
  function detrainingFactor(daysSinceLastExecution, rules) {
    if (daysSinceLastExecution == null || isNaN(daysSinceLastExecution)) {
      return { factor: 1.00, version: rules.version, ruleId: rules.id, band: null, days: null, applicable: false };
    }
    var d = Math.max(0, Math.floor(daysSinceLastExecution));
    var band = rules.bands[rules.bands.length - 1];
    for (var i = 0; i < rules.bands.length; i++) { if (d <= rules.bands[i].maxDays) { band = rules.bands[i]; break; } }
    return { factor: band.factor, version: rules.version, ruleId: rules.id, band: band.maxDays, days: d, applicable: band.factor < 1.00 };
  }

  // --- phase.v1 (CONTEXT) --- exact gelijk aan legacy phaseForWeek(wk,weken).
  function phaseForWeek(wk, weken) {
    if (weken <= 1) return 'Opbouw';
    if (weken <= 3) return wk === 1 ? 'Anatomische Aanpassing' : 'Kracht';
    var adaptWeeks = Math.max(1, Math.round(weken * 0.2));
    var deloadWeeks = 1;
    var hyperWeeks = Math.max(1, Math.round((weken - adaptWeeks - deloadWeeks) * 0.55));
    var strengthWeeks = Math.max(0, weken - adaptWeeks - deloadWeeks - hyperWeeks);
    if (wk <= adaptWeeks) return 'Anatomische Aanpassing';
    if (wk <= adaptWeeks + hyperWeeks) return 'Hypertrofie';
    if (wk <= adaptWeeks + hyperWeeks + strengthWeeks) return 'Kracht';
    return 'Deload / Peak';
  }

  // ===== DECISION CONTRACT (additief; verandert de legacy-uitkomst NIET) =====
  // Lichtgewicht, versioned uitkomst — bedoeld voor AI-uitleg/Evidence. AI consumeert dit,
  // maar bepaalt de waarde NOOIT. Gebouwd BOVENOP computeProgression (zelfde getallen).
  function progressionDecision(rpe, curKg) {
    var p = computeProgression(rpe, curKg);
    if (!p) return null;
    var outcome = p.delta > 0 ? 'increase' : (p.delta < 0 ? 'deload' : 'hold');
    return {
      outcome: outcome, deltaKg: p.delta, label: p.label,
      ruleId: 'progression_rpe', ruleVersion: VERSIONS.progression,
      inputs: { rpe: rpe, curKg: curKg }
    };
  }

  // ===== EVIDENCE CONTRACT (evidence.v1) =====
  // decisionRulesSnapshot(rules): reproduceert EXACT de bestaande inline snapshot-provenance
  // (F0.7M): {detraining:{id,version}} of null. Delegatiedoel voor de 2 snapshot-sites.
  function decisionRulesSnapshot(rules) {
    return rules ? { detraining: { id: rules.id, version: rules.version } } : null;
  }
  // buildEvidence(): lichtgewicht superset-contract om een belangrijke trainingsuitkomst te
  // verklaren/reproduceren. Alleen de meegegeven velden komen mee (geen metadata-explosie).
  //   { source, calculationVersion, decision:{ruleId,ruleVersion}, inputs, override, ai:{validatedBy} }
  function buildEvidence(o) {
    o = o || {};
    var ev = { source: o.source || 'calculation', evidenceVersion: VERSIONS.evidence };
    if (o.calculationVersion != null) ev.calculationVersion = o.calculationVersion;
    if (o.decision != null) ev.decision = o.decision;
    if (o.inputs != null) ev.inputs = o.inputs;
    if (o.override != null) ev.override = o.override;
    if (o.ai != null) ev.ai = o.ai;
    return ev;
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * DAGZONE (dayzone.v1) — Sprint 14
   *
   * Deze indeling stond als dayState() in index.html: vijf zones met eigen drempels, náást
   * trainReadiness (readiness.v1) dat er drie kent. Twee indelingen voor dezelfde vraag, op
   * twee plaatsen, waarvan één in de UI-laag. De inhoud is hier ONGEWIJZIGD overgenomen —
   * zelfde drempels, zelfde koppen, zelfde betekenissen — alleen de plaats klopt nu.
   * index.html houdt een doorgeefwrapper, dus er verandert visueel niets.
   *
   * De vijf zones zijn fijner dan de drie van readiness.v1 en dienen een ander doel: het
   * dagthema en de toon op Home. readiness.v1 blijft leidend voor de trainingsbeslissing.
   * ══════════════════════════════════════════════════════════════════════════ */
  var DAYZONE_VERSIE = 'dayzone.v1';
  var DAYZONES = [
    { grens: 1.00, key: 'goed',     headline: 'Goede dag',     meaning: 'Een uitstekende dag om progressie te maken.' },
    { grens: 0.95, key: 'normaal',  headline: 'Normale dag',   meaning: 'Een prima dag om op gevoel te trainen.' },
    { grens: 0.90, key: 'vermoeid', headline: 'Licht vermoeid', meaning: 'Train beheerst — kwaliteit boven kwantiteit.' },
    { grens: 0.87, key: 'herstel',  headline: 'Hersteldag',    meaning: 'Focus vandaag op herstel en opladen.' },
    { grens: -Infinity, key: 'slecht', headline: 'Rustdag',    meaning: 'Je lichaam vraagt vandaag om rust.' }
  ];
  function dayZone(f) {
    for (var i = 0; i < DAYZONES.length; i++) {
      if (f >= DAYZONES[i].grens) {
        return { key: DAYZONES[i].key, headline: DAYZONES[i].headline, meaning: DAYZONES[i].meaning };
      }
    }
    var laatste = DAYZONES[DAYZONES.length - 1];
    return { key: laatste.key, headline: laatste.headline, meaning: laatste.meaning };
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * READINESS VAN DE DAG (readiness_day.v1) — Sprint 14
   *
   * ÉÉN antwoord op: hoe sta ik er vandaag voor, en wat betekent dat voor de training die
   * ik van plan was? De losse onderdelen bestonden al — de sporter moest ze zelf combineren.
   *
   * Deze functie REKENT NIETS en verzint GEEN nieuwe regel. Ze zet de reeds berekende
   * waarden naast elkaar en roept uitsluitend BESTAANDE regels aan:
   *     trainReadiness         (readiness.v1)          -> de zone
   *     dayZone                (dayzone.v1)            -> het dagthema
   *     computeProgAdjustment  (progression_adjust.v1) -> de trainingsaanpassing
   * De herstelscore komt kant-en-klaar binnen uit CalcCore.recoveryScore (recovery_score.v1);
   * die wordt hier niet nagerekend en niet gecorrigeerd.
   *
   * BESCHIKBAARHEID IS EEN FEIT, GEEN AANNAME. Elk signaal dat ontbreekt komt in `ontbreekt`
   * te staan. Er wordt niets geschat, niets ingevuld en niets gemiddeld om een gat te
   * dichten. Ontbreekt de dagfactor, dan is er geen zone en geen advies — dan zegt de app
   * dat ze het niet weet.
   *
   * GEEN MEDISCHE UITSPRAAK. 'reduce' betekent: pas de trainingsbelasting aan. Het zegt
   * niets over gezondheid, ziekte of geschiktheid. Een REST/STOP-zone bestaat bewust NIET:
   * daar is in deze applicatie geen expliciete regel voor (computeProgAdjustment gaat niet
   * verder dan -1 set en -1,5 RPE), en een zone zonder regel zou een verzonnen oordeel zijn.
   * ══════════════════════════════════════════════════════════════════════════ */
  var READINESS_DAY_VERSIE = 'readiness_day.v1';
  var READINESS_ZONES = ['ready', 'caution', 'reduce'];
  var READINESS_SIGNALEN = ['hrv', 'rhr', 'slaap', 'spierherstel', 'gevoel', 'trainingsbelasting'];
  var READINESS_ZONE_TEKST = {
    ready:   { label: 'Goed hersteld',   betekenis: 'Je geplande training kan normaal worden uitgevoerd.' },
    caution: { label: 'Voorzichtig vandaag', betekenis: 'Train beheerst en houd je inspanning in de gaten.' },
    reduce:  { label: 'Belasting aanpassen', betekenis: 'De trainingsbelasting wordt vandaag aangepast.' }
  };
  var READINESS_KWALITEIT = ['volledig', 'gedeeltelijk', 'onvoldoende'];

  /* readinessDay(input)
   * input: {
   *   dagfactor: number|null,                    // CalcCore.calculateDayFactor (dayfactor.v1)
   *   herstel: {score, band, confidence}|null,   // CalcCore.recoveryScore (recovery_score.v1)
   *   signalen: {                                // AANWEZIGHEID, geen herberekening
   *     hrv: {waarde, kwaliteit}|null, rhr: {...}|null, slaap: {...}|null,
   *     spierherstel: [{muscle, pct}]|null, gevoel: 'slecht'|'matig'|'goed'|'top'|null,
   *     pijn: string|null, trainingsdagen7: number|null
   *   }
   * }
   * -> readiness_day.v1-contract
   */
  function readinessDay(input) {
    var i = input || {};
    var sig = i.signalen || {};
    var factor = (typeof i.dagfactor === 'number' && isFinite(i.dagfactor)) ? i.dagfactor : null;

    var beschikbaar = [], ontbreekt = [];
    function noteer(naam, aanwezig) { (aanwezig ? beschikbaar : ontbreekt).push(naam); }
    noteer('hrv', !!(sig.hrv && sig.hrv.waarde != null));
    noteer('rhr', !!(sig.rhr && sig.rhr.waarde != null));
    noteer('slaap', !!(sig.slaap && sig.slaap.waarde != null));
    noteer('spierherstel', !!(sig.spierherstel && sig.spierherstel.length));
    noteer('gevoel', !!sig.gevoel);
    noteer('trainingsbelasting', typeof sig.trainingsdagen7 === 'number' && isFinite(sig.trainingsdagen7));

    // Datakwaliteit: hoeveel van de zes signalen staan er echt? Een expliciete telling,
    // geen weging en geen oordeel over de sporter.
    var kwaliteit = beschikbaar.length >= 5 ? 'volledig' : (beschikbaar.length >= 2 ? 'gedeeltelijk' : 'onvoldoende');
    // Een signaal dat als onbetrouwbaar is aangemerkt telt niet mee als aanwezig.
    ['hrv', 'rhr', 'slaap'].forEach(function (k) {
      var v = sig[k];
      if (v && v.waarde != null && v.kwaliteit && (v.kwaliteit === 'no_data' || v.kwaliteit === 'sync_failed')) {
        var idx = beschikbaar.indexOf(k);
        if (idx >= 0) { beschikbaar.splice(idx, 1); ontbreekt.push(k); }
      }
    });

    var herstel = null;
    if (i.herstel && typeof i.herstel.score === 'number' && isFinite(i.herstel.score) && i.herstel.band && i.herstel.band !== 'onbekend') {
      herstel = { score: Math.round(i.herstel.score), band: i.herstel.band,
                  betrouwbaarheid: i.herstel.confidence || null };
    } else {
      ontbreekt.push('herstelscore');
    }

    var basis = {
      versie: READINESS_DAY_VERSIE, bruikbaar: false, reden: 'onvoldoende_gegevens',
      beschikbaar: beschikbaar, ontbreekt: ontbreekt, datakwaliteit: kwaliteit,
      dagfactor: factor, gereedheid: null,
      herstel: herstel, dagthema: null,
      zone: null, zoneLabel: null, zoneBetekenis: null,
      aanpassing: null, trainingsadvies: { soort: 'geen_advies', setsDelta: 0, rpeDelta: 0 },
      redenen: [],
      herkomst: { signalen: 'gemeten', dagfactor: 'berekend', herstel: 'berekend',
                  zone: 'besloten', aanpassing: 'besloten' }
    };

    // Zonder dagfactor is er geen zone en geen advies. Niet schatten, niet middelen.
    if (factor == null) return basis;

    var zoneRuw = trainReadiness({ factor: factor });          // readiness.v1 — bestaand
    if (!zoneRuw) return basis;
    var zone = zoneRuw.cls === 'g' ? 'ready' : (zoneRuw.cls === 'y' ? 'caution' : 'reduce');
    var tekst = READINESS_ZONE_TEKST[zone];

    var aanpassing = computeProgAdjustment(factor, sig.spierherstel || [], sig.gevoel || null, sig.pijn || null);

    return {
      versie: READINESS_DAY_VERSIE, bruikbaar: true,
      reden: (kwaliteit === 'onvoldoende') ? 'ok_beperkte_gegevens' : 'ok',
      beschikbaar: beschikbaar, ontbreekt: ontbreekt, datakwaliteit: kwaliteit,
      dagfactor: factor, gereedheid: (typeof i.gereedheid === 'number' && isFinite(i.gereedheid)) ? i.gereedheid : null,
      herstel: herstel,
      dagthema: dayZone(factor),                               // dayzone.v1 — bestaand
      zone: zone, zoneLabel: tekst.label, zoneBetekenis: tekst.betekenis,
      aanpassing: aanpassing,
      trainingsadvies: aanpassing
        ? { soort: 'aangepast', setsDelta: aanpassing.setsDelta || 0, rpeDelta: aanpassing.rpeDelta || 0 }
        : { soort: 'ongewijzigd', setsDelta: 0, rpeDelta: 0 },
      redenen: aanpassing ? (aanpassing.redenen || []) : [],
      herkomst: { signalen: 'gemeten', dagfactor: 'berekend', herstel: 'berekend',
                  zone: 'besloten', aanpassing: 'besloten' }
    };
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * RUST NA EEN SET (rest.v1)
   *
   * Deze regel stond in index.html en was daarmee een businessregel in de UI-laag. De
   * inhoud is ONGEWIJZIGD overgenomen (zelfde factoren, zelfde ondergrens van 30s,
   * zelfde afronding op 5s); alleen de plaats klopt nu. index.html houdt een
   * doorgeefwrapper, zodat elke bestaande aanroep blijft werken.
   *
   * Zonder RPE gebeurt er niets: de basisrust blijft staan. Er wordt nooit een rusttijd
   * verzonnen op grond van gegevens die er niet zijn.
   * ══════════════════════════════════════════════════════════════════════════ */
  var REST_VERSIE = 'rest.v1';
  function restForSet(baseSec, rpe) {
    if (!(baseSec > 0)) return baseSec;
    var r = (rpe == null || isNaN(rpe)) ? null : Number(rpe);
    if (r == null) return baseSec;                 // geen RPE gelogd -> basisrust ongewijzigd
    var f;
    if (r <= 6) f = 0.75; else if (r <= 7) f = 0.9; else if (r <= 8) f = 1.0; else if (r <= 9) f = 1.25; else f = 1.5;
    return Math.max(30, Math.round(baseSec * f / 5) * 5);
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * UITKOMST VAN ÉÉN SET (setoutcome.v1) — Sprint 13
   *
   * De sporter logt een set. De vraag die daarna telt is: klopt dit met wat er stond, en
   * wat moet ik nu doen? Dat is een REGEL, geen coachpraatje, en hij hoort dus hier.
   *
   * Deze functie rekent NIETS nieuws uit. Ze vergelijkt wat er stond met wat er gebeurd
   * is, en haalt de gewichtsbeslissing op bij de BESTAANDE progressieregel
   * (progressionDecision -> computeProgression). Er komt geen tweede RPE-regel bij; als
   * de progressieregel niets zegt, zegt deze functie ook niets over gewicht.
   *
   * ONTBREKENDE GEGEVENS WORDEN NIET INGEVULD. Elk veld dat mist komt in `ontbreekt` te
   * staan en de bijbehorende uitspraak vervalt. Zonder RPE is er geen gewichtsadvies;
   * zonder voorgeschreven waarden zijn er geen afwijkingen vast te stellen.
   *
   * De uitkomst bevat geen zinnen — alleen feiten en sleutels. De verwoording gebeurt in
   * CoachingCore, precies zoals bij de verbanden.
   * ══════════════════════════════════════════════════════════════════════════ */
  var SETOUTCOME_VERSIE = 'setoutcome.v1';
  var SETOUTCOME_AFWIJKINGEN = ['minder_reps', 'meer_reps', 'lager_gewicht', 'hoger_gewicht',
                                'hogere_rpe', 'lagere_rpe', 'set_overgeslagen'];
  var SETOUTCOME_ACTIES = ['verhogen', 'gelijk', 'verlagen', 'rust', 'geen_advies'];

  function _soNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string') {
      var t = v.trim();
      if (!t || !/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(t)) return null;
      var n = Number(t);
      return isFinite(n) ? n : null;
    }
    return null;
  }
  function _rond1(n) { return Math.round(n * 10) / 10; }

  /* setOutcome(input)
   * input: {
   *   voorgeschreven: {kg, reps, rpe},   // de prescription (rxWeight / sets x reps @ RPE)
   *   uitgevoerd:     {kg, reps, rpe},   // wat de sporter logde
   *   restBasisSec:   number|null,       // ingestelde rust vóór schaling
   *   dynamischeRust: bool               // staat rustschaling aan?
   * }
   * -> { versie, bruikbaar, ontbreekt[], afwijkingen[], doelGehaald, actie{...}, rust{...}, herkomst{...}, reden }
   */
  function setOutcome(input) {
    var i = input || {};
    var v = i.voorgeschreven || {}, u = i.uitgevoerd || {};
    var vKg = _soNum(v.kg), vReps = _soNum(v.reps), vRpe = _soNum(v.rpe);
    var uKg = _soNum(u.kg), uReps = _soNum(u.reps), uRpe = _soNum(u.rpe);

    var ontbreekt = [];
    if (uKg == null) ontbreekt.push('uitgevoerd_gewicht');
    if (uReps == null) ontbreekt.push('uitgevoerde_reps');
    if (uRpe == null) ontbreekt.push('rpe');
    if (vKg == null) ontbreekt.push('voorgeschreven_gewicht');
    if (vReps == null) ontbreekt.push('voorgeschreven_reps');

    var basis = {
      versie: SETOUTCOME_VERSIE, bruikbaar: false, ontbreekt: ontbreekt,
      afwijkingen: [], doelGehaald: null,
      actie: { soort: 'geen_advies', kg: null, deltaKg: null, seconden: null },
      rust: { seconden: null, basis: null, geschaald: false },
      herkomst: { uitgevoerd: 'gemeten', voorgeschreven: (vKg != null ? 'berekend' : null),
                  actie: null, rust: null },
      reden: 'onvoldoende_gegevens'
    };

    // Een set zonder enige uitgevoerde waarde is een overgeslagen set: dat mag gemeld worden,
    // maar levert geen advies op.
    if (uKg == null && uReps == null) {
      basis.afwijkingen = [{ soort: 'set_overgeslagen', verschil: null }];
      return basis;
    }

    // Afwijkingen: alleen vaststelbaar als er iets was voorgeschreven om mee te vergelijken.
    var afw = [];
    if (vReps != null && uReps != null && uReps !== vReps) {
      afw.push({ soort: uReps < vReps ? 'minder_reps' : 'meer_reps', verschil: uReps - vReps });
    }
    if (vKg != null && uKg != null && uKg !== vKg) {
      afw.push({ soort: uKg < vKg ? 'lager_gewicht' : 'hoger_gewicht', verschil: _rond1(uKg - vKg) });
    }
    if (vRpe != null && uRpe != null && uRpe !== vRpe) {
      afw.push({ soort: uRpe > vRpe ? 'hogere_rpe' : 'lagere_rpe', verschil: _rond1(uRpe - vRpe) });
    }
    basis.afwijkingen = afw;

    // Doel gehaald: uitsluitend als beide kanten bekend zijn. Anders null, nooit 'nee'.
    if (vReps != null && uReps != null && vKg != null && uKg != null) {
      basis.doelGehaald = (uReps >= vReps && uKg >= vKg);
    }

    // Rust: de BESTAANDE regel, hier alleen aangeroepen.
    var rustBasis = _soNum(i.restBasisSec);
    if (rustBasis != null && rustBasis > 0) {
      var geschaald = (i.dynamischeRust === true) && (uRpe != null);
      var sec = geschaald ? restForSet(rustBasis, uRpe) : rustBasis;
      basis.rust = { seconden: sec, basis: rustBasis, geschaald: geschaald };
      basis.herkomst.rust = geschaald ? 'besloten' : 'instelling';
    }

    // Gewichtsadvies: UITSLUITEND uit de bestaande progressieregel. Geen RPE, geen advies.
    if (uRpe != null && uKg != null) {
      var besluit = progressionDecision(uRpe, uKg);
      if (besluit) {
        var soort = besluit.outcome === 'increase' ? 'verhogen' : (besluit.outcome === 'deload' ? 'verlagen' : 'gelijk');
        basis.actie = { soort: soort, kg: _rond1(uKg + besluit.deltaKg), deltaKg: besluit.deltaKg,
                        seconden: basis.rust.seconden };
        basis.herkomst.actie = 'besloten';
        basis.progressie = besluit;
        basis.bruikbaar = true;
        basis.reden = 'ok';
        return basis;
      }
    }
    // Geen gewichtsadvies mogelijk, maar rust wél: dan is dát de volgende actie.
    if (basis.rust.seconden != null) {
      basis.actie = { soort: 'rust', kg: null, deltaKg: null, seconden: basis.rust.seconden };
      basis.herkomst.actie = basis.herkomst.rust;
      basis.bruikbaar = true;
      basis.reden = 'ok_zonder_gewichtsadvies';
    }
    return basis;
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * PERSOONLIJKE RECORDS (record.v1) — mag dit gewicht als record gelden?
   *
   * Dit is een REGEL, geen presentatie. Hij stond tot Sprint 12 op drie plaatsen in
   * index.html los uitgeschreven: bij het afronden van een training, bij een losse
   * oefening en bij Guided Execution. Drie kopieën van dezelfde vergelijking, elk met
   * hun eigen invoer — precies het soort duplicatie waar een verkeerde basislijn zich
   * ongemerkt in kan nestelen. Nu staat de regel één keer hier.
   *
   * PUUR en DETERMINISTISCH: geen Date.now, geen random, geen DOM, geen opslag. Deze
   * functie beslist alleen; het wegschrijven blijft bij de aanroeper.
   *
   * Semantiek exact gelijk aan wat er stond: strikt zwaarder dan de basislijn is een
   * record, evenaren niet. Een ontbrekende basislijn telt als 0 (eerste record ooit).
   * Een waarde die geen bruikbaar getal is — leeg, tekst, NaN, 0 of negatief — levert
   * NOOIT een record op; er wordt niets gefabriceerd en niets overschreven.
   * ══════════════════════════════════════════════════════════════════════════ */
  var RECORD_VERSIE = 'record.v1';
  function _recordNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string') {
      var t = v.trim();
      if (!t || !/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(t)) return null;
      var n = Number(t);
      return isFinite(n) ? n : null;
    }
    return null;
  }
  /* releaseRecord(kandidaat, basislijn)
   * kandidaat : het zwaarste gewicht van deze sessie/oefening (uit de aggregatie)
   * basislijn : het record zoals dat vóór deze sessie bekend was (null/undefined = nog geen)
   * → { versie, isRecord, reason, waarde, basislijn }
   * reason: 'ok' · 'geen_geldige_waarde' · 'evenaart' · 'lager'
   */
  function releaseRecord(kandidaat, basislijn) {
    var k = _recordNum(kandidaat);
    var b = _recordNum(basislijn);
    var base = (b == null) ? 0 : b;
    if (k == null || k <= 0) {
      return { versie: RECORD_VERSIE, isRecord: false, reason: 'geen_geldige_waarde', waarde: null, basislijn: base };
    }
    if (k > base) return { versie: RECORD_VERSIE, isRecord: true, reason: 'ok', waarde: k, basislijn: base };
    return { versie: RECORD_VERSIE, isRecord: false, reason: (k === base ? 'evenaart' : 'lager'), waarde: k, basislijn: base };
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * VERBANDEN (verband.v1) — vrijgave en verwoording
   *
   * De Decision Engine bepaalt ALS ENIGE of een verband getoond mag worden en hoe het
   * verwoord wordt. De UI plaatst alleen tekst; hij kent de drempel niet, bepaalt geen
   * sterkte en formuleert geen zinnen. PUUR en DETERMINISTISCH: geen Date.now, geen
   * random, geen DOM.
   *
   * Productbesluiten (vastgelegd door de Product Owner, niet hier bedacht):
   *   - minimum aantal vergelijkbare waarnemingen: 30
   *   - methode: Spearman rangcorrelatie (CalcCore.spearman)
   *
   * STERKTEGRENZEN. De UI heeft een woord nodig waar de engine een getal heeft. De
   * grenzen volgen de gangbare conventie van Cohen (1988) voor de grootte van een
   * correlatie, toegepast op |coëfficiënt|:
   *      |r| <  0.10  verwaarloosbaar   (geen richting claimen)
   *      |r| <  0.30  zwak
   *      |r| <  0.50  matig
   *      |r| >= 0.50  sterk
   * Ze staan hier expliciet zodat ze op één plek te herzien zijn en de UI ze niet kan
   * verschuiven. Ze zeggen iets over de GROOTTE van de samenhang, niet over bewijskracht.
   *
   * CIRCULARITEIT. Een verband tussen twee grootheden die uit dezelfde ruwe invoer
   * worden berekend, meet de formule zelf en niet de werkelijkheid — dagfactor komt uit
   * HRV en slaap, herstel komt uit trainingsbelasting en RPE. Elke definitie noemt
   * daarom haar ruwe invoer; overlappen die verzamelingen, dan weigert de engine het
   * verband. Dat gebeurt hier, niet in de UI: verbergen is geen weigeren.
   * ══════════════════════════════════════════════════════════════════════════ */
  var VERBAND_VERSIE = 'verband.v1';
  var VERBAND_MIN_N = 30;
  var VERBAND_STERKTE = [
    { grens: 0.10, key: 'verwaarloosbaar', label: 'Geen duidelijke samenhang',
      uitleg: 'Er zit te weinig patroon in je metingen om van samenhang te spreken.' },
    { grens: 0.30, key: 'zwak',            label: 'Zwakke samenhang',
      uitleg: 'Het patroon is zichtbaar, maar zwak: veel dagen wijken ervan af.' },
    { grens: 0.50, key: 'matig',           label: 'Matige samenhang',
      uitleg: 'Het patroon is duidelijk zichtbaar, maar het geldt lang niet elke dag.' },
    { grens: Infinity, key: 'sterk',       label: 'Sterke samenhang',
      uitleg: 'Het patroon is duidelijk en consequent zichtbaar in je metingen.' }
  ];
  var VERBAND_DISCLAIMER = 'Dit is een samenhang, geen oorzaak.';
  // Woorden die een oorzaak-gevolgrelatie suggereren. Uitsluitend voor tests en review;
  // de engine bouwt zijn zinnen zo op dat ze er nooit in kunnen voorkomen.
  var VERBAND_VERBODEN_WOORDEN = ['veroorzaakt', 'zorgt voor', 'leidt tot', 'dankzij', 'waardoor', 'heeft als gevolg', 'door'];
  /* Sprint 10 — DATAKWALITEIT IN DE VRIJGAVE.
   * De Decision Engine krijgt van de datakwaliteitslaag te horen hoeveel vergelijkbare
   * dagen zijn afgevallen. Hij meldt dat neutraal: er wordt NIET beweerd dat een meting
   * fout was, alleen dat hij niet betrouwbaar vergelijkbaar was. De UI schrijft die zin
   * niet zelf; hij komt hier vandaan, net als alle andere tekst. */
  function verbandUitsluitingZin(aantal) {
    if (!(typeof aantal === 'number' && isFinite(aantal)) || aantal <= 0) return null;
    return (aantal === 1)
      ? 'Eén dag is niet meegenomen omdat de gegevens niet betrouwbaar vergelijkbaar waren.'
      : ('Enkele dagen (' + Math.floor(aantal) + ') zijn niet meegenomen omdat de gegevens niet betrouwbaar vergelijkbaar waren.');
  }

  /* Sprint 10 — dezelfde neutrale melding voor ÉÉN meetreeks (metric-detail). Ook hier
   * geen oordeel over de meting zelf: alleen dat hij niet is meegerekend. */
  function meetreeksUitsluitingZin(aantal) {
    if (!(typeof aantal === 'number' && isFinite(aantal)) || aantal <= 0) return null;
    return (aantal === 1)
      ? 'Eén meting is niet meegerekend omdat de waarde niet betrouwbaar bij deze reeks past.'
      : (Math.floor(aantal) + ' metingen zijn niet meegerekend omdat de waarden niet betrouwbaar bij deze reeks passen.');
  }

  /* Sprint 10 — PRAKTISCHE TRAININGSBETEKENIS (verbandtraining.v1).
   *
   * Een samenhang tussen twee metingen is op zichzelf geen trainingsadvies. Deze functie
   * mag daarom alleen iets zeggen wanneer de benodigde, REEDS BEREKENDE context er is:
   * een vrijgegeven verband met richting, en een herstelstatus uit recovery_score.v1.
   * Ontbreekt een van beide, dan is de uitkomst expliciet 'niet beschikbaar' met een
   * reden — er wordt niets aangevuld en niets aangenomen.
   *
   * Wat deze functie NOOIT doet: een gereedheidsoordeel vellen. Niet "je bent hersteld",
   * niet "je lichaam is klaar voor een zware training". Hij verwijst naar de bestaande
   * herstelstatus en laat de beslissing bij de gebruiker en de bestaande trainingsregels.
   * De Decision Engine berekent hier niets: score en band komen binnen als feit. */
  var VERBAND_TRAINING_VERSIE = 'verbandtraining.v1';
  var VERBAND_TRAINING_ONBRUIKBARE_KWALITEIT = ['no_data', 'source_unavailable', 'sync_failed', 'stale'];
  /* Uitsluitend voor tests en review: formuleringen die een gereedheidsoordeel zouden zijn. */
  var VERBAND_TRAINING_VERBODEN_WOORDEN = ['je bent hersteld', 'volledig hersteld', 'klaar voor een zware',
    'klaar om te presteren', 'ga vol', 'je lichaam is klaar', 'veilig zwaar'];

  function verbandTrainingContext(besluit, context, definition) {
    var b = besluit || {}, c = context || {}, d = definition || {};
    var basis = { versie: VERBAND_TRAINING_VERSIE, beschikbaar: false, reason: 'geen_verband', zin: null, actie: null,
                  herstelScore: null, herstelBand: null };
    if (!b.vrijgegeven) return basis;
    if (b.direction !== 'higher' && b.direction !== 'lower') { basis.reason = 'geen_richting'; return basis; }

    var naamA = (d.a && (d.a.zinNaam || d.a.label)) || null;
    var naamB = (d.b && (d.b.zinNaam || d.b.noemer || d.b.label)) || null;
    var paar = (naamA && naamB) ? ('je ' + naamA + ' en je ' + naamB) : 'deze twee metingen';
    var richtingWoord = (b.direction === 'higher') ? 'in dezelfde richting' : 'in tegengestelde richting';
    var opening = 'In deze periode bewegen ' + paar + ' ' + richtingWoord + '.';

    if (c.dataKwaliteit && VERBAND_TRAINING_ONBRUIKBARE_KWALITEIT.indexOf(c.dataKwaliteit) >= 0) {
      basis.reason = 'datakwaliteit_onvoldoende';
      basis.zin = opening + ' Je metingen van vandaag zijn niet actueel genoeg om daar iets over vandaag aan te verbinden.';
      basis.actie = 'Synchroniseer je wearable of vul je check-in in.';
      return basis;
    }
    var score = (typeof c.herstelScore === 'number' && isFinite(c.herstelScore)) ? Math.round(c.herstelScore) : null;
    var band = c.herstelBand && c.herstelBand !== 'onbekend' ? c.herstelBand : null;
    if (score == null || !band) {
      basis.reason = 'geen_herstelstatus';
      basis.zin = opening + ' Er is voor vandaag geen herstelstatus berekend, dus hier is geen conclusie voor je training aan te verbinden.';
      basis.actie = 'Vul je check-in in, dan berekent de app je herstelstatus.';
      return basis;
    }
    var bandTekst = ({ hoog: 'hoog', gemiddeld: 'gemiddeld', laag: 'laag' })[band] || String(band);
    var zin = opening + ' Je herstelstatus van vandaag is ' + bandTekst + ' (' + score + '/100).';
    if (c.herstelConfidence === 'laag') zin += ' Die status is indicatief: er zijn weinig signalen beschikbaar.';
    return {
      versie: VERBAND_TRAINING_VERSIE, beschikbaar: true, reason: 'ok', zin: zin,
      actie: 'Kijk naar je actuele herstelstatus voordat je de trainingsbelasting verhoogt.',
      herstelScore: score, herstelBand: band
    };
  }

  /* De eerste drie verbanden. UITSLUITEND productconfiguratie — geen logica per verband.
   * Een vierde verband is een extra item in deze lijst; er komt geen tweede correlatie-
   * implementatie bij.
   *   veld     : welk veld uit de bronreeks
   *   inputs   : de RUWE invoer waaruit de grootheid komt (basis van de circulariteitstoets)
   *   conditie : hoe "meer van A" in gewone taal heet
   *   noemer   : hoe B in een zin heet
   *   zinNaam  : hoe de grootheid in lopende tekst heet (HRV blijft HRV, geen 'hrv')
   */
  var VERBAND_DEFINITIES = [
    { id: 'sleep_hrv', label: 'Slaap en HRV', methode: 'spearman', minimumN: VERBAND_MIN_N, vensterDagen: 180,
      a: { veld: 'sleep', label: 'Slaap', eenheid: 'u',  inputs: ['sleep'], conditie: 'je langer sliep', zinNaam: 'slaap' },
      b: { veld: 'hrv',   label: 'HRV',    eenheid: 'ms', inputs: ['hrv'],  noemer: 'HRV', zinNaam: 'HRV' } },
    { id: 'sleep_rhr', label: 'Slaap en rusthartslag', methode: 'spearman', minimumN: VERBAND_MIN_N, vensterDagen: 180,
      a: { veld: 'sleep', label: 'Slaap',          eenheid: 'u',   inputs: ['sleep'], conditie: 'je langer sliep', zinNaam: 'slaap' },
      b: { veld: 'rhr',   label: 'Rusthartslag',   eenheid: 'bpm', inputs: ['rhr'],   noemer: 'rusthartslag', zinNaam: 'rusthartslag' } },
    { id: 'hrv_rhr',   label: 'HRV en rusthartslag', methode: 'spearman', minimumN: VERBAND_MIN_N, vensterDagen: 180,
      a: { veld: 'hrv',   label: 'HRV',            eenheid: 'ms',  inputs: ['hrv'],   conditie: 'je HRV hoger was', zinNaam: 'HRV' },
      b: { veld: 'rhr',   label: 'Rusthartslag',   eenheid: 'bpm', inputs: ['rhr'],   noemer: 'rusthartslag', zinNaam: 'rusthartslag' } }
  ];

  function _inputsVan(zijde) { return (zijde && Array.isArray(zijde.inputs)) ? zijde.inputs : []; }
  // true zodra beide zijden ten minste één ruwe invoer delen.
  function verbandIsCirculair(definition) {
    var d = definition || {};
    var A = _inputsVan(d.a), B = _inputsVan(d.b);
    if (!A.length || !B.length) return true;          // onbekende herkomst = niet vrijgeven
    for (var i = 0; i < A.length; i++) if (B.indexOf(A[i]) >= 0) return true;
    return false;
  }
  function verbandSterkte(coefficient) {
    if (coefficient == null || !isFinite(coefficient)) return null;
    var abs = Math.abs(coefficient);
    for (var i = 0; i < VERBAND_STERKTE.length; i++) if (abs < VERBAND_STERKTE[i].grens) return VERBAND_STERKTE[i];
    return VERBAND_STERKTE[VERBAND_STERKTE.length - 1];
  }

  /* releaseVerband(stat, definition)
   * stat: { coefficient, n, direction } uit CalcCore.spearman
   * → { vrijgegeven, reason, direction, strength, strengthLabel, coefficient, n,
   *     minimumN, zin, onderbouwing, disclaimer, versie }
   * reason: 'ok' · 'circulair' · 'te_weinig_data' · 'niet_bepaalbaar' · 'ongeldige_definitie'
   */
  function releaseVerband(stat, definition, kwaliteit) {
    var st = stat || {}, d = definition || {};
    var kw = kwaliteit || {};
    var uitgesloten = (typeof kw.excludedDays === 'number' && isFinite(kw.excludedDays) && kw.excludedDays > 0)
      ? Math.floor(kw.excludedDays) : 0;
    var n = (typeof st.n === 'number' && isFinite(st.n) && st.n >= 0) ? Math.floor(st.n) : 0;
    var coefficient = (typeof st.coefficient === 'number' && isFinite(st.coefficient)) ? st.coefficient : null;
    var minimumN = (typeof d.minimumN === 'number' && isFinite(d.minimumN)) ? d.minimumN : VERBAND_MIN_N;
    var basis = {
      id: d.id || null, versie: VERBAND_VERSIE, vrijgegeven: false, reason: 'ongeldige_definitie',
      direction: 'none', strength: null, strengthLabel: null,
      coefficient: coefficient, n: n, minimumN: minimumN,
      zin: null, onderbouwing: null, disclaimer: VERBAND_DISCLAIMER,
      sterkteUitleg: null, uitgesloten: uitgesloten, kwaliteitZin: verbandUitsluitingZin(uitgesloten)
    };
    if (!d.a || !d.b || !d.a.veld || !d.b.veld) return basis;
    if (verbandIsCirculair(d)) { basis.reason = 'circulair'; return basis; }
    if (n < minimumN) { basis.reason = 'te_weinig_data'; return basis; }
    var band = verbandSterkte(coefficient);
    if (coefficient == null || !band) { basis.reason = 'niet_bepaalbaar'; return basis; }

    // Richting komt UITSLUITEND uit het teken van de berekende coëfficiënt. Bij een
    // verwaarloosbare samenhang wordt bewust geen richting geclaimd.
    var richting = band.key === 'verwaarloosbaar' ? 'none' : (coefficient > 0 ? 'higher' : (coefficient < 0 ? 'lower' : 'none'));
    var zin = (richting === 'none')
      ? ('Tussen je ' + (d.a.zinNaam || d.a.label) + ' en je ' + (d.b.zinNaam || d.b.noemer || d.b.label) +
         ' is in deze periode geen duidelijke samenhang te zien.')
      : ('Op dagen waarop ' + d.a.conditie + ', lag je ' + (d.b.noemer || d.b.label) +
         ' gemiddeld ' + (richting === 'higher' ? 'hoger' : 'lager') + '.');
    return {
      id: d.id || null, versie: VERBAND_VERSIE, vrijgegeven: true, reason: 'ok',
      direction: richting, strength: band.key, strengthLabel: band.label,
      coefficient: coefficient, n: n, minimumN: minimumN,
      zin: zin,
      onderbouwing: 'Gebaseerd op ' + n + ' dagen met beide metingen.',
      disclaimer: VERBAND_DISCLAIMER,
      sterkteUitleg: band.uitleg || null,
      uitgesloten: uitgesloten,
      kwaliteitZin: verbandUitsluitingZin(uitgesloten)
    };
  }

  var DecisionCore = {
    dayZone: dayZone,
    DAYZONES: DAYZONES,
    DAYZONE_VERSIE: DAYZONE_VERSIE,
    readinessDay: readinessDay,
    READINESS_DAY_VERSIE: READINESS_DAY_VERSIE,
    READINESS_ZONES: READINESS_ZONES,
    READINESS_SIGNALEN: READINESS_SIGNALEN,
    READINESS_ZONE_TEKST: READINESS_ZONE_TEKST,
    READINESS_KWALITEIT: READINESS_KWALITEIT,
    restForSet: restForSet,
    REST_VERSIE: REST_VERSIE,
    setOutcome: setOutcome,
    SETOUTCOME_VERSIE: SETOUTCOME_VERSIE,
    SETOUTCOME_AFWIJKINGEN: SETOUTCOME_AFWIJKINGEN,
    SETOUTCOME_ACTIES: SETOUTCOME_ACTIES,
    releaseRecord: releaseRecord,
    RECORD_VERSIE: RECORD_VERSIE,
    releaseVerband: releaseVerband,
    verbandUitsluitingZin: verbandUitsluitingZin,
    meetreeksUitsluitingZin: meetreeksUitsluitingZin,
    verbandTrainingContext: verbandTrainingContext,
    VERBAND_TRAINING_VERSIE: VERBAND_TRAINING_VERSIE,
    VERBAND_TRAINING_VERBODEN_WOORDEN: VERBAND_TRAINING_VERBODEN_WOORDEN,
    VERBAND_TRAINING_ONBRUIKBARE_KWALITEIT: VERBAND_TRAINING_ONBRUIKBARE_KWALITEIT,
    verbandIsCirculair: verbandIsCirculair,
    verbandSterkte: verbandSterkte,
    VERBAND_DEFINITIES: VERBAND_DEFINITIES,
    VERBAND_MIN_N: VERBAND_MIN_N,
    VERBAND_STERKTE: VERBAND_STERKTE,
    VERBAND_DISCLAIMER: VERBAND_DISCLAIMER,
    VERBAND_VERBODEN_WOORDEN: VERBAND_VERBODEN_WOORDEN,
    computeProgression: computeProgression,
    computeProgAdjustment: computeProgAdjustment,
    trainReadiness: trainReadiness,
    detrainingFactor: detrainingFactor,
    phaseForWeek: phaseForWeek,
    progressionDecision: progressionDecision,
    Evidence: {
      decisionRulesSnapshot: decisionRulesSnapshot,
      buildEvidence: buildEvidence
    },
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = DecisionCore; }
  if (global) { global.DecisionCore = DecisionCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
