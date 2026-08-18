/* ==========================================================================
 * TrainingKompas — COACHING CORE  (F6.1/F6.2 — Adaptive Coaching Foundation)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen Date, geen globale mutable state. INPUT -> OUTPUT.
 *
 * CoachingCore is de DETERMINISTISCHE SIGNAALLAAG tussen de rekenkernen en de AI.
 * Het BEREKENT NIETS zelf: het ontvangt reeds-berekende prestatiefeiten (uit
 * ProgressionCore/CalcCore/CardioCore) en zet die om in benoemde, versioned
 * coaching-signalen + status + prioriteit.
 *
 * AI-BOUNDARY (F6.3): de AI mag deze signalen later VERWOORDEN ("je was iets sterker"),
 * maar NOOIT zelf getallen/PR's/trends berekenen. Alle numerieke waarheid komt van buiten.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { signals: 'coaching_signals.v1', context: 'coaching_context.v1', conclusion: 'coaching_conclusion.v1' };

  // Prioriteit bepaalt welk signaal het "belangrijkste" is (voor ordening/uitlichting).
  // Hoger = belangrijker. Bewust expliciet zodat de UI/AI nooit hoeft te raden.
  var PRIORITY = {
    new_best: 100,
    trend_up: 80,
    improved: 70,
    declined: 60,
    trend_down: 55,
    trend_stable: 50,
    stable: 40,
    repeated_performance: 40,
    first_session: 35,
    insufficient_history: 30,
    unknown: 0
  };

  function priorityFor(signals) {
    var p = 0;
    for (var i = 0; i < signals.length; i++) { var v = PRIORITY[signals[i]] || 0; if (v > p) p = v; }
    return p;
  }

  // facts = {
  //   comparableCount : int   — # eerdere VERGELIJKBARE prestaties (excl. de huidige)
  //   better          : true|false|null|undefined — primaire metric t.o.v. vorige
  //                     (ProgressionCore.deltaReport.<primary>.better). null = gelijk, undefined = onbekend.
  //   isBest          : bool  — ProgressionCore.isNewBest op de best-metric
  //   canTrend        : bool  — ProgressionCore.sufficiency(...).canTrend
  //   trendImproving  : true|false|null|undefined — ProgressionCore.trendBy(...).improving
  // }
  // -> { status, signals:[...], priority }
  function deriveSignals(facts) {
    facts = facts || {};
    var n = facts.comparableCount | 0;
    var signals = [];

    if (n <= 0) {
      signals.push('first_session');
      return { status: 'first', signals: signals, priority: priorityFor(signals) };
    }

    var status;
    if (facts.better === true) { status = 'improved'; signals.push('improved'); }
    else if (facts.better === false) { status = 'declined'; signals.push('declined'); }
    else if (facts.better === null) { status = 'stable'; signals.push('stable'); signals.push('repeated_performance'); }
    else { status = 'unknown'; } // better === undefined -> geen uitspraak over richting

    if (facts.isBest === true) signals.push('new_best');

    if (facts.canTrend === true) {
      if (facts.trendImproving === true) signals.push('trend_up');
      else if (facts.trendImproving === false) signals.push('trend_down');
      else if (facts.trendImproving === null) signals.push('trend_stable');
    } else if (n >= 1 && n < 3) {
      // wel een vergelijking mogelijk, nog geen betrouwbare trend
      signals.push('insufficient_history');
    }

    return { status: status, signals: signals, priority: priorityFor(signals) };
  }

  function has(signals, name) { return signals.indexOf(name) !== -1; }

  // F6.2 Coaching Context Object — PUUR doorgeefluik voor de AI.
  // Bundelt de deterministische signalen met reeds-elders-berekende presentatiewaarden.
  // Berekent zelf NIETS (geen 1RM, geen split, geen trend) — dat is al gebeurd in de rekenkernen.
  function buildContext(input) {
    input = input || {};
    var d = deriveSignals(input.facts || {});
    var n = (input.facts && (input.facts.comparableCount | 0)) || 0;
    return {
      domain: input.domain != null ? input.domain : null,        // 'strength' | 'cardio'
      exercise: input.exercise != null ? input.exercise : null,
      status: d.status,
      signals: d.signals,
      priority: d.priority,
      current: input.current !== undefined ? input.current : null,   // reeds geformatteerd/berekend elders
      previous: input.previous !== undefined ? input.previous : null,
      best: input.best !== undefined ? input.best : null,
      sufficientHistory: n >= 1,
      version: VERSIONS.context
    };
  }

  // F6.4 AI-BOUNDARY CONTRACT — saniteert de per-oefening coaching-context tot UITSLUITEND
  // toegestane, reeds-DETERMINISTISCH-berekende velden. Alles wat de AI ontvangt loopt hier langs;
  // niet-toegestane velden (rauwe sessiedata, interne objecten) worden gestript zodat de AI nooit
  // iets krijgt om zelf mee te rekenen — hij mag de gegeven waarden alleen verwoorden.
  var AI_FIELDS = ['exercise', 'domain', 'status', 'signals', 'priority', 'metric', 'current', 'previous', 'best', 'nextAction'];
  function aiPayload(map) {
    var out = [];
    if (!map || typeof map !== 'object') return out;
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      var e = map[keys[i]];
      if (!e || typeof e !== 'object') continue;
      var clean = {};
      for (var j = 0; j < AI_FIELDS.length; j++) {
        var f = AI_FIELDS[j];
        if (e[f] !== undefined && e[f] !== null) clean[f] = e[f];
      }
      if (Object.keys(clean).length) out.push(clean);
    }
    return out;
  }

  // F7.9 "Waar ben ik beter geworden?" — aggregeert per-oefening verbeter-FEITEN (reeds deterministisch
  // bepaald door ProgressionCore) tot een sportersamenvatting. Berekent zelf niets; telt en selecteert.
  // items = [{ exercise, domain, newBest, improved, trendUp, reason }].
  function improvementsDigest(items, maxHighlights) {
    var max = maxHighlights || 5;
    var newBests = 0, improved = 0, trendUps = 0, highlights = [];
    (items || []).forEach(function (it) {
      if (!it) return;
      if (it.newBest) newBests++;
      if (it.improved) improved++;
      if (it.trendUp) trendUps++;
      if ((it.newBest || it.improved || it.trendUp) && it.exercise) {
        var pr = it.newBest ? 3 : (it.trendUp ? 2 : 1); // prioriteit: nieuwe beste > trend > verbeterd
        highlights.push({ exercise: it.exercise, reason: it.reason != null ? it.reason : null, newBest: !!it.newBest, domain: it.domain || null, priority: pr });
      }
    });
    highlights.sort(function (a, b) { return b.priority - a.priority; });
    return {
      counts: { newBests: newBests, improved: improved, trendUps: trendUps },
      highlights: highlights.slice(0, max),
      hasAny: (newBests + improved + trendUps) > 0
    };
  }

  // F9.5 POST-WORKOUT COACH CONCLUSION — aggregeert de per-oefening coaching-context (reeds
  // deterministisch bepaald door de rekenkernen + DecisionCore) tot ÉÉN workout-niveau conclusie.
  // BEREKENT NIETS zelf: telt, selecteert het meest saillante signaal en kiest de reeds-bepaalde
  // nextAction. De AI mag deze conclusie later verwoorden; hij bepaalt hem NIET.
  // entries = array (of map) van { domain, exercise, status, signals[], priority, current, previous, best, nextAction, metric }
  function _entriesArray(entries) {
    if (!entries || typeof entries !== 'object') return [];
    var arr = Array.isArray(entries) ? entries : Object.keys(entries).map(function (k) { return entries[k]; });
    return arr.filter(function (e) { return e && typeof e === 'object'; });
  }
  function buildCoachConclusion(entries) {
    var arr = _entriesArray(entries);
    var counts = { exercises: 0, newBests: 0, improved: 0, declined: 0, stable: 0, first: 0, trendUps: 0, trendDowns: 0 };
    var domains = { strength: false, cardio: false };
    var lead = null, next = null, nextEx = null;
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      var sig = Array.isArray(e.signals) ? e.signals : [];
      counts.exercises++;
      if (e.domain === 'strength') domains.strength = true;
      else if (e.domain === 'cardio') domains.cardio = true;
      if (sig.indexOf('new_best') !== -1) counts.newBests++;
      if (e.status === 'improved') counts.improved++;
      else if (e.status === 'declined') counts.declined++;
      else if (e.status === 'stable') counts.stable++;
      else if (e.status === 'first') counts.first++;
      if (sig.indexOf('trend_up') !== -1) counts.trendUps++;
      if (sig.indexOf('trend_down') !== -1) counts.trendDowns++;
      // meest saillante oefening = hoogste priority (new_best=100 > trend_up=80 > improved=70 ...)
      var p = (typeof e.priority === 'number') ? e.priority : priorityFor(sig);
      if (!lead || p > lead._p) lead = { exercise: e.exercise != null ? e.exercise : null, domain: e.domain != null ? e.domain : null, status: e.status != null ? e.status : null, metric: e.metric != null ? e.metric : null, current: e.current != null ? e.current : null, previous: e.previous != null ? e.previous : null, best: e.best != null ? e.best : null, _p: p };
      // nextAction: eerste (op priority) oefening die er een heeft; DecisionCore is de enige bron.
      if (next == null && e.nextAction != null && e.nextAction !== '') { next = e.nextAction; nextEx = e.exercise != null ? e.exercise : null; }
    }
    if (lead) delete lead._p;

    var overall;
    if (!counts.exercises) overall = 'unknown';
    else if (counts.newBests > 0) overall = 'new_best';
    else if (counts.improved > 0 && counts.declined > 0) overall = 'mixed';
    else if (counts.improved > 0) overall = 'improved';
    else if (counts.declined > 0) overall = 'declined';
    else if (counts.stable > 0) overall = 'stable';
    else if (counts.first > 0) overall = 'first';
    else overall = 'unknown';

    var tone = (overall === 'new_best' || overall === 'improved') ? 'positive'
      : (overall === 'declined' || overall === 'mixed') ? 'encouraging' : 'neutral';

    // Deterministisch KORT kop-label per uitkomst — één bron van waarheid voor UI-kaart én AI.
    // Presentatie-mapping (geen berekening); AI/UI hoeven zelf geen kop te verzinnen.
    var HEADLINES = {
      new_best: 'Nieuw persoonlijk record',
      improved: 'Sterker dan vorige keer',
      mixed: 'Wisselend beeld',
      declined: 'Rustiger dan vorige keer',
      stable: 'Niveau vastgehouden',
      first: 'Eerste registratie',
      unknown: ''
    };

    return {
      hasData: counts.exercises > 0,
      overall: overall,
      headline: HEADLINES[overall] || '',
      tone: tone,
      counts: counts,
      domains: domains,
      lead: lead,
      nextAction: next,
      nextActionExercise: nextEx,
      version: VERSIONS.conclusion
    };
  }

  // Deterministische Nederlandse verwoording van de conclusie — PUUR string-samenstelling.
  // Dient als (a) offline/AI-uitval fallback en (b) leidende "seed" voor de AI-terugblik.
  // Gebruikt UITSLUITEND reeds-geformatteerde waarden (current/previous/best zijn al presentatie-strings).
  // Gestylede "volgende stap"-zin. De nextAction-LABEL (uit DecisionCore) blijft identiek;
  // alleen de omringende formulering verschilt per coachstijl. Geen herberekening.
  function _styleNextAction(nextAction, exercise, style) {
    var ex = exercise ? (' (' + exercise + ')') : '';
    var na = nextAction + ex;
    switch (style) {
      case 'direct': return 'Volgende stap: ' + na + '.';
      case 'motivating': return 'Volgende keer ga je voor ' + na + '.';
      case 'analytical': return 'Volgens je trainingsregel is de volgende stap ' + na + '.';
      case 'calm': return 'Rustig door — volgende stap: ' + na + '.';
      case 'energetic': return 'Volgende keer knallen: ' + na + '!';
      default: return 'Volgens je huidige trainingsregel is de volgende stap: ' + na + '.';
    }
  }
  // Korte, feitloze opener die alleen TOON toevoegt (geen cijfers/feiten — die staan in de factlines).
  function _styleOpener(tone, style) {
    switch (style) {
      case 'direct': return '';
      case 'motivating': return (tone === 'encouraging') ? 'Kop op — ' : 'Sterk werk — ';
      case 'analytical': return 'Analyse: ';
      case 'calm': return 'Even rustig teruggekeken: ';
      case 'energetic': return (tone === 'encouraging') ? 'Kom op — ' : 'Yes! ';
      default: return '';
    }
  }

  // style is optioneel. Zonder style (of 'balanced') is de uitvoer IDENTIEK aan voorheen.
  // Andere stijlen: exact dezelfde FEITEN, andere toon + gestylede "volgende stap"-zin.
  function conclusionText(c, style) {
    if (!c || !c.hasData) return '';
    if (COACH_STYLES.indexOf(style) === -1) style = 'balanced';
    var L = c.lead || {};
    var name = L.exercise || 'je oefening';
    var factLines = [];
    if (c.overall === 'new_best') {
      factLines.push('Nieuw persoonlijk record: ' + name + (L.best ? (' — ' + L.best) : '') + '.');
      if (L.previous && L.current) factLines.push('Je ging van ' + L.previous + ' naar ' + L.current + '.');
    } else if (c.overall === 'improved') {
      factLines.push(name + ' was beter dan je vorige vergelijkbare training' + (L.previous && L.current ? (' (' + L.previous + ' → ' + L.current + ')') : '') + '.');
    } else if (c.overall === 'declined') {
      factLines.push(name + ' lag iets lager dan vorige keer' + (L.previous && L.current ? (' (' + L.previous + ' → ' + L.current + ')') : '') + '. Dat hoeft geen probleem te zijn; je training telt gewoon mee.');
    } else if (c.overall === 'mixed') {
      factLines.push('Wisselend beeld: ' + c.counts.improved + ' oefening' + (c.counts.improved === 1 ? '' : 'en') + ' beter, ' + c.counts.declined + ' iets lager.');
      if (name && L.current) factLines.push('Sterkste punt: ' + name + (L.current ? (' (' + L.current + ')') : '') + '.');
    } else if (c.overall === 'stable') {
      factLines.push('Je prestatie was vergelijkbaar met vorige keer — stabiel vasthouden is ook progressie.');
    } else if (c.overall === 'first') {
      factLines.push('Eerste registratie van deze oefening' + (c.counts.exercises === 1 ? '' : 'en') + ' — vanaf nu kun je je vooruitgang vergelijken.');
    }
    if (c.counts.newBests > 1) factLines.push('In totaal ' + c.counts.newBests + ' nieuwe records deze training.');

    if (style === 'balanced') {
      var lines = factLines.slice();
      if (c.nextAction) lines.push('Volgens je huidige trainingsregel is de volgende stap: ' + c.nextAction + (c.nextActionExercise ? (' (' + c.nextActionExercise + ')') : '') + '.');
      return lines.join(' ');
    }
    // Gestyled: opener (toon) + identieke feiten + gestylede volgende-stap-zin.
    var out = [];
    var opener = _styleOpener(c.tone, style);
    if (opener && factLines.length) { factLines[0] = opener + factLines[0]; }
    out = factLines.slice();
    if (c.nextAction) out.push(_styleNextAction(c.nextAction, c.nextActionExercise, style));
    return out.join(' ');
  }

  // S2 "Waarom dit advies?" — verwoordt de REEDS GENOMEN DecisionCore-beslissing (progressionDecision)
  // deterministisch. Berekent NIETS: leest outcome + inputs (rpe/curKg) uit het decision-object en
  // formatteert een korte uitleg. Geen nieuwe regel, geen AI. Toont de sporter zijn eigen data (geen AI-boundary).
  function explainProgression(decision) {
    if (!decision || !decision.outcome) return '';
    var inp = decision.inputs || {};
    var rpe = inp.rpe;
    var kg = (inp.curKg != null) ? inp.curKg : inp.kg;
    var kgTxt = (kg != null && kg !== '') ? (' op ' + kg + ' kg') : '';
    var rpeTxt = (rpe != null && rpe !== '') ? (' (RPE ' + rpe + ')') : '';
    if (decision.outcome === 'increase') {
      return 'Je vorige set' + kgTxt + ' voelde relatief licht' + rpeTxt + '. Binnen je huidige trainingsregel is dat de zone om te verhogen.';
    }
    if (decision.outcome === 'deload') {
      return 'Je vorige set' + kgTxt + ' was zwaar' + rpeTxt + '. Daarom bouw je de belasting de volgende keer even terug.';
    }
    if (decision.outcome === 'hold') {
      return 'Je vorige set' + kgTxt + ' zat rond de gewenste inspanning' + rpeTxt + '. Daarom houd je het gewicht gelijk.';
    }
    return '';
  }

  // ── Coach-stijl (presentatie-only) ────────────────────────────────────────
  // Presenteert EXACT dezelfde DecisionCore-beslissing (outcome + deltaKg) in de door de
  // sporter gekozen coachtoon. Wijzigt NOOIT de beslissing, het getal of de richting — die
  // komen 1-op-1 uit `decision`. Geen berekening, geen AI. Puur tekst.
  var COACH_STYLES = ['balanced', 'direct', 'motivating', 'analytical', 'calm', 'energetic'];

  function styleProgression(decision, style) {
    if (!decision || !decision.outcome) return '';
    if (COACH_STYLES.indexOf(style) === -1) style = 'balanced';
    var inp = decision.inputs || {};
    var rpe = inp.rpe;
    var kg = (inp.curKg != null) ? inp.curKg : inp.kg;
    var absd = (decision.deltaKg != null) ? Math.abs(decision.deltaKg) : null;
    var amt = (absd != null && absd !== 0) ? (absd + ' kg') : null;
    var rpeTxt = (rpe != null && rpe !== '') ? ('RPE ' + rpe) : null;
    var kgTxt = (kg != null && kg !== '') ? (kg + ' kg') : null;
    var o = decision.outcome;
    if (o === 'increase') {
      switch (style) {
        case 'direct': return 'Volgende keer +' + (amt || 'iets') + '.';
        case 'motivating': return 'Sterke set' + (rpeTxt ? (' op ' + rpeTxt) : '') + ' — die zat er licht in. Volgende keer mag er +' + (amt || 'wat') + ' bij.';
        case 'analytical': return (rpeTxt ? rpeTxt + ' ' : 'De inspanning ') + 'valt binnen de verhogingszone; daarom +' + (amt || 'een stap') + ' de volgende keer.';
        case 'calm': return 'Deze voelde relatief licht' + (rpeTxt ? (' (' + rpeTxt + ')') : '') + '. Rustig opbouwen: volgende keer +' + (amt || 'een klein beetje') + '.';
        case 'energetic': return 'Lekker bezig! Dat mag zwaarder — pak volgende keer +' + (amt || 'wat') + '!';
        default: return 'Je set' + (kgTxt ? (' op ' + kgTxt) : '') + ' voelde relatief licht' + (rpeTxt ? (' (' + rpeTxt + ')') : '') + '. Volgende keer kun je +' + (amt || 'een stap') + '.';
      }
    }
    if (o === 'deload') {
      switch (style) {
        case 'direct': return 'Volgende keer −' + (amt || 'iets') + '.';
        case 'motivating': return 'Zware set' + (rpeTxt ? (' op ' + rpeTxt) : '') + ' — knap volgehouden. Volgende keer even −' + (amt || 'wat') + ' zodat je scherp blijft.';
        case 'analytical': return (rpeTxt ? rpeTxt + ' ' : 'De inspanning ') + 'ligt boven de streefzone; daarom −' + (amt || 'een stap') + ' de volgende keer.';
        case 'calm': return 'Deze was zwaar' + (rpeTxt ? (' (' + rpeTxt + ')') : '') + '. Geen zorgen — bouw volgende keer −' + (amt || 'iets') + ' terug.';
        case 'energetic': return 'Pittig! Volgende keer −' + (amt || 'wat') + ' en dan knallen we weer.';
        default: return 'Je set' + (kgTxt ? (' op ' + kgTxt) : '') + ' was zwaar' + (rpeTxt ? (' (' + rpeTxt + ')') : '') + '. Volgende keer bouw je −' + (amt || 'iets') + ' terug.';
      }
    }
    if (o === 'hold') {
      switch (style) {
        case 'direct': return 'Volgende keer zelfde gewicht.';
        case 'motivating': return 'Goede set' + (rpeTxt ? (' op ' + rpeTxt) : '') + ' — precies goed. Houd dit gewicht vast.';
        case 'analytical': return (rpeTxt ? rpeTxt + ' ' : 'De inspanning ') + 'zit rond de streefzone; daarom blijft het gewicht gelijk.';
        case 'calm': return 'Deze zat prima' + (rpeTxt ? (' (' + rpeTxt + ')') : '') + '. Houd het rustig op hetzelfde gewicht.';
        case 'energetic': return 'Strak! Zelfde gewicht vasthouden en volgende keer nóg scherper.';
        default: return 'Je set' + (kgTxt ? (' op ' + kgTxt) : '') + ' zat rond de gewenste inspanning' + (rpeTxt ? (' (' + rpeTxt + ')') : '') + '. Daarom houd je het gewicht gelijk.';
      }
    }
    return '';
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * LIVE COACH TIJDENS DE TRAINING (livecoach.v1) — Sprint 13
   *
   * Tot nu toe kon de sporter tijdens een training alleen "Vraag de coach" gebruiken, wat
   * hem uit de training haalde. Deze laag maakt het antwoord op "wat moet ik nu doen?"
   * beschikbaar ZONDER de training te verlaten — en zonder dat er ergens een tweede
   * rekenwaarheid ontstaat.
   *
   * ROLVERDELING, strikt:
   *   Calculation Engine  rekent (gewicht, 1RM, herstel)
   *   Decision Engine     beslist (setOutcome -> progressionDecision, restForSet)
   *   deze laag           verwoordt, en bewaakt WAT er verwoord mag worden
   *   AI                  legt desgevraagd uitgebreider uit, op basis van exact dit contract
   *
   * Deze laag berekent niets en beslist niets. Ze mag ook niets toevoegen: staat een
   * uitspraak niet in het besluit van de Decision Engine, dan komt hij er niet.
   *
   * ONTBREKENDE GEGEVENS. Er wordt nooit gegokt. Elk ontbrekend veld staat in `ontbreekt`
   * en de bijbehorende uitspraak vervalt; de sporter krijgt dan te horen dát er iets mist,
   * niet een advies dat op lucht rust.
   *
   * TAAL. Geen oorzaak-gevolg, geen medische uitspraak, geen gereedheidsoordeel. De
   * verboden formuleringen staan hieronder expliciet zodat een test ze kan afdwingen.
   * ══════════════════════════════════════════════════════════════════════════ */
  var LIVECOACH_VERSIE = 'livecoach.v1';
  /* Uitsluitend voor tests en review: taal die deze laag nooit mag produceren. */
  var LIVE_VERBODEN_WOORDEN = ['veroorzaakt', 'zorgt voor', 'leidt tot', 'dankzij', 'omdat je slecht',
    'je bent hersteld', 'volledig hersteld', 'klaar voor een zware', 'je lichaam is klaar',
    'blessure', 'diagnose', 'symptoom', 'overtraind'];
  /* Herkomst per gegeven — zodat de sporter (en de AI) weet wat gemeten, berekend, besloten
     of alleen uitgelegd is. Geen van deze woorden is een oordeel. */
  var LIVE_HERKOMST = ['gemeten', 'berekend', 'besloten', 'instelling', 'uitgelegd'];

  /* buildLiveContext(input) — HET CONTRACT.
   * input: {
   *   oefening: {id, naam},
   *   setNummer, totaalSets,
   *   voorgeschreven: {kg, reps, rpe},
   *   uitgevoerd: {kg, reps, rpe},
   *   besluit: <DecisionCore.setOutcome resultaat>,     // VERPLICHT: deze laag beslist niet zelf
   *   herstel: {score, band, betrouwbaarheid} | null,
   *   datakwaliteit: 'current'|'partial'|'stale'|... | null
   * }
   * -> gecontroleerde context. `magUitleggen` zegt of er überhaupt iets zinnigs te zeggen is.
   */
  function buildLiveContext(input) {
    var i = input || {};
    var b = i.besluit || null;
    var ontbreekt = (b && Array.isArray(b.ontbreekt)) ? b.ontbreekt.slice() : ['besluit'];
    if (!i.oefening || !i.oefening.naam) ontbreekt.push('oefening');
    var heeftBesluit = !!(b && b.versie);
    return {
      versie: LIVECOACH_VERSIE,
      oefening: (i.oefening && i.oefening.naam) ? { id: i.oefening.id || null, naam: i.oefening.naam } : null,
      setNummer: (typeof i.setNummer === 'number' && isFinite(i.setNummer)) ? i.setNummer : null,
      totaalSets: (typeof i.totaalSets === 'number' && isFinite(i.totaalSets)) ? i.totaalSets : null,
      voorgeschreven: i.voorgeschreven || null,
      uitgevoerd: i.uitgevoerd || null,
      besluit: heeftBesluit ? b : null,
      herstel: (i.herstel && i.herstel.band && i.herstel.band !== 'onbekend') ? i.herstel : null,
      /* Sprint 14: de readiness-beslissing van vandaag wordt hier ALLEEN doorgegeven.
         Deze laag berekent readiness niet en herziet hem niet. */
      readiness: (i.readiness && i.readiness.zone) ? i.readiness : null,
      datakwaliteit: i.datakwaliteit || null,
      ontbreekt: ontbreekt,
      herkomst: {
        uitgevoerd: 'gemeten',
        voorgeschreven: 'berekend',
        volgendeActie: (heeftBesluit && b.herkomst) ? b.herkomst.actie : null,
        rust: (heeftBesluit && b.herkomst) ? b.herkomst.rust : null,
        uitleg: 'uitgelegd'
      },
      magUitleggen: !!(heeftBesluit && b.bruikbaar)
    };
  }

  /* liveCoachMessage(ctx) — de verwoording. Vertaalt UITSLUITEND wat er in het besluit staat.
   * -> { actie, waarom, onzekerheid, afwijking }  (elk veld string of null)
   */
  function _kg(n) { return (n == null) ? null : String(n).replace('.', ','); }
  function _sec(n) {
    if (n == null) return null;
    if (n < 60) return n + ' seconden';
    var m = Math.floor(n / 60), r = n % 60;
    var mTxt = m + (m === 1 ? ' minuut' : ' minuten');
    return r ? (mTxt + ' en ' + r + ' seconden') : mTxt;
  }
  var AFWIJKING_TEKST = {
    minder_reps:     'Je deed minder herhalingen dan er stond.',
    meer_reps:       'Je deed meer herhalingen dan er stond.',
    lager_gewicht:   'Je trainde met minder gewicht dan er stond.',
    hoger_gewicht:   'Je trainde met meer gewicht dan er stond.',
    hogere_rpe:      'Deze set voelde zwaarder dan de bedoeling was.',
    lagere_rpe:      'Deze set voelde lichter dan de bedoeling was.',
    set_overgeslagen:'Voor deze set is niets ingevuld.'
  };
  function liveCoachMessage(ctx) {
    var c = ctx || {};
    var b = c.besluit;
    var uit = { actie: null, waarom: null, onzekerheid: null, afwijking: null };

    if (!b) {
      uit.onzekerheid = 'Ik heb hiervoor nog niet genoeg gegevens.';
      return uit;
    }
    // Afwijkingen mogen altijd feitelijk gemeld worden — het is een waarneming, geen oordeel.
    var afw = (b.afwijkingen || []).map(function (a) { return AFWIJKING_TEKST[a.soort]; })
                                   .filter(function (t) { return !!t; });
    if (afw.length) uit.afwijking = afw.join(' ');

    if (!b.bruikbaar) {
      var mist = [];
      if ((b.ontbreekt || []).indexOf('rpe') >= 0) mist.push('je RPE');
      if ((b.ontbreekt || []).indexOf('uitgevoerd_gewicht') >= 0) mist.push('het gewicht');
      if ((b.ontbreekt || []).indexOf('uitgevoerde_reps') >= 0) mist.push('het aantal herhalingen');
      uit.onzekerheid = mist.length
        ? ('Ik heb hiervoor ' + _lijst(mist) + ' nodig. Zonder die gegevens geef ik geen advies.')
        : 'Ik heb hiervoor nog niet genoeg gegevens.';
      return uit;
    }

    var a = b.actie || {};
    if (a.soort === 'verhogen') {
      uit.actie = 'Ga naar ' + _kg(a.kg) + ' kg voor je volgende set.';
      uit.waarom = 'Je gaf RPE ' + _kg(b.progressie.inputs.rpe) + ' op ' + _kg(b.progressie.inputs.curKg) +
        ' kg. Binnen de progressieregel van de app is dat de zone om te verhogen, met ' + _kg(Math.abs(a.deltaKg)) + ' kg.';
    } else if (a.soort === 'verlagen') {
      uit.actie = 'Verlaag naar ' + _kg(a.kg) + ' kg voor je volgende set.';
      uit.waarom = 'Je gaf RPE ' + _kg(b.progressie.inputs.rpe) + ' op ' + _kg(b.progressie.inputs.curKg) +
        ' kg. Dat ligt boven de streefzone, dus bouwt de app de belasting terug met ' + _kg(Math.abs(a.deltaKg)) + ' kg.';
    } else if (a.soort === 'gelijk') {
      uit.actie = 'Blijf bij ' + _kg(b.progressie.inputs.curKg) + ' kg.';
      uit.waarom = 'Je gaf RPE ' + _kg(b.progressie.inputs.rpe) + '. Dat zit in de streefzone, dus blijft het gewicht gelijk.';
    } else if (a.soort === 'rust') {
      uit.actie = 'Rust ' + _sec(a.seconden) + ' en ga dan door.';
      uit.waarom = 'Dit is de rusttijd die voor deze oefening is ingesteld.';
    }
    // Rust erbij wanneer er óók een gewichtsadvies is.
    if (a.soort !== 'rust' && b.rust && b.rust.seconden != null) {
      uit.actie += ' Rust eerst ' + _sec(b.rust.seconden) + '.';
      // Alleen melden dat de rust is aangepast als het getal ook echt afwijkt van de instelling.
      if (b.rust.geschaald && b.rust.seconden !== b.rust.basis) {
        uit.waarom += ' De rusttijd is op je RPE aangepast ten opzichte van de ingestelde ' + _sec(b.rust.basis) + '.';
      }
    }
    if (b.doelGehaald === true && !afw.length) {
      uit.afwijking = 'Je hebt gehaald wat er stond.';
    }
    if ((b.ontbreekt || []).length) {
      uit.onzekerheid = 'Nog niet alles is ingevuld; dit advies gaat over wat er wél staat.';
    }
    return uit;
  }
  function _lijst(arr) {
    if (arr.length === 1) return arr[0];
    return arr.slice(0, -1).join(', ') + ' en ' + arr[arr.length - 1];
  }

  /* liveAiPayload(ctx) — wat de AI mag zien. Zelfde gedachte als aiPayload: een whitelist,
   * zodat de AI nooit ruwe sessiedata krijgt om zelf mee te rekenen. De beslissing en het
   * getal zitten er kant-en-klaar in; de AI mag ze uitleggen, niet herzien. */
  var LIVE_AI_FIELDS = ['oefening', 'setNummer', 'totaalSets', 'voorgeschreven', 'uitgevoerd',
                        'afwijkingen', 'doelGehaald', 'actie', 'rust', 'herstel', 'readiness',
                        'datakwaliteit', 'ontbreekt', 'herkomst'];
  function liveAiPayload(ctx) {
    var c = ctx || {};
    var b = c.besluit || {};
    var vol = {
      oefening: c.oefening ? c.oefening.naam : null,
      setNummer: c.setNummer, totaalSets: c.totaalSets,
      voorgeschreven: c.voorgeschreven || null,
      uitgevoerd: c.uitgevoerd || null,
      afwijkingen: (b.afwijkingen || []).map(function (a) { return a.soort; }),
      doelGehaald: (b.doelGehaald === undefined) ? null : b.doelGehaald,
      actie: b.actie || null,
      rust: b.rust || null,
      herstel: c.herstel || null,
      readiness: c.readiness || null,
      datakwaliteit: c.datakwaliteit || null,
      ontbreekt: c.ontbreekt || [],
      herkomst: c.herkomst || null
    };
    var out = {};
    for (var i = 0; i < LIVE_AI_FIELDS.length; i++) {
      var f = LIVE_AI_FIELDS[i];
      if (vol[f] !== undefined && vol[f] !== null) out[f] = vol[f];
    }
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * READINESS VAN DE DAG — VERWOORDING (readinesscoach.v1) — Sprint 14
   *
   * Zelfde rolverdeling als de live coach uit Sprint 13: de Decision Engine heeft al
   * besloten (readiness_day.v1), deze laag zegt het in gewone taal en bewaakt wat er
   * gezegd mag worden. Er wordt hier niets berekend, niets herzien en niets aangevuld.
   *
   * Wat hier NOOIT mag: een medische uitspraak, een oorzaak-gevolgclaim, of de suggestie
   * dat een lage readiness iets zegt over ziekte of gezondheid. 'Belasting aanpassen' gaat
   * over de training, niet over de sporter.
   * ══════════════════════════════════════════════════════════════════════════ */
  var READINESSCOACH_VERSIE = 'readinesscoach.v1';
  var READINESS_VERBODEN_WOORDEN = ['veroorzaakt', 'zorgt voor', 'leidt tot', 'dankzij', 'omdat je',
    'ziek', 'blessure', 'diagnose', 'symptoom', 'overtraind', 'ongezond', 'je bent hersteld',
    'volledig hersteld', 'klaar voor een zware', 'je lichaam is klaar'];
  var READINESS_SIGNAAL_NAAM = {
    hrv: 'je HRV', rhr: 'je rusthartslag', slaap: 'je slaap', spierherstel: 'je spierherstel',
    gevoel: 'hoe je je voelt', trainingsbelasting: 'je recente trainingsbelasting',
    herstelscore: 'je herstelscore'
  };

  /* buildReadinessContext(input) — het contract voor de dag.
   * input: { besluit: <DecisionCore.readinessDay resultaat>, geplandeTraining: {naam}|null,
   *          datakwaliteit: string|null }
   */
  function buildReadinessContext(input) {
    var i = input || {};
    var b = i.besluit || null;
    var heeft = !!(b && b.versie);
    return {
      versie: READINESSCOACH_VERSIE,
      besluit: heeft ? b : null,
      geplandeTraining: (i.geplandeTraining && i.geplandeTraining.naam) ? { naam: i.geplandeTraining.naam } : null,
      datakwaliteit: i.datakwaliteit || (heeft ? b.datakwaliteit : null),
      ontbreekt: heeft ? (b.ontbreekt || []) : ['besluit'],
      herkomst: heeft ? b.herkomst : null,
      magUitleggen: !!(heeft && b.bruikbaar)
    };
  }

  /* readinessCoachMessage(ctx) -> { kop, betekenis, aanpassing, waarom, onzekerheid } */
  function readinessCoachMessage(ctx) {
    var c = ctx || {};
    var b = c.besluit;
    var uit = { kop: null, betekenis: null, aanpassing: null, waarom: null, onzekerheid: null };
    if (!b || !b.bruikbaar) {
      uit.onzekerheid = 'Ik heb hiervoor vandaag niet genoeg gegevens.';
      var mist = ((b && b.ontbreekt) || []).map(function (k) { return READINESS_SIGNAAL_NAAM[k]; })
                                           .filter(function (t) { return !!t; });
      if (mist.length) uit.waarom = 'Wat ontbreekt: ' + _somOp(mist) + '. Vul je check-in in, dan kan ik er wel iets over zeggen.';
      return uit;
    }
    uit.kop = b.zoneLabel;
    uit.betekenis = b.zoneBetekenis;
    if (b.herstel) {
      uit.waarom = 'Je herstelscore van vandaag is ' + b.herstel.score + '/100 (' + b.herstel.band + ')';
      uit.waarom += (b.herstel.betrouwbaarheid === 'laag')
        ? ', en die is indicatief omdat er weinig signalen beschikbaar zijn.'
        : '.';
    }
    if (b.trainingsadvies && b.trainingsadvies.soort === 'aangepast') {
      var delen = [];
      if (b.trainingsadvies.setsDelta) delen.push(Math.abs(b.trainingsadvies.setsDelta) + ' set minder');
      if (b.trainingsadvies.rpeDelta) delen.push('RPE ' + String(b.trainingsadvies.rpeDelta).replace('.', ',').replace('-', '\u2212'));
      uit.aanpassing = delen.length ? ('Je training van vandaag wordt aangepast: ' + _somOp(delen) + '.')
                                    : 'Je training van vandaag wordt lichter ingepland.';
      if ((b.redenen || []).length) {
        uit.waarom = (uit.waarom ? uit.waarom + ' ' : '') + 'Meegewogen: ' + _somOp(b.redenen) + '.';
      }
    } else if (b.trainingsadvies && b.trainingsadvies.soort === 'ongewijzigd') {
      uit.aanpassing = 'Je geplande training blijft ongewijzigd.';
    }
    if ((b.ontbreekt || []).length) {
      var m2 = (b.ontbreekt || []).map(function (k) { return READINESS_SIGNAAL_NAAM[k]; })
                                  .filter(function (t) { return !!t; });
      if (m2.length) uit.onzekerheid = 'Nog niet alles is bekend: ' + _somOp(m2) + (m2.length === 1 ? ' ontbreekt.' : ' ontbreken.');
    }
    return uit;
  }
  function _somOp(arr) {
    if (!arr.length) return '';
    if (arr.length === 1) return arr[0];
    return arr.slice(0, -1).join(', ') + ' en ' + arr[arr.length - 1];
  }

  /* readinessAiPayload(ctx) — de grens naar de AI. Whitelist, net als aiPayload en
   * liveAiPayload: de beslissing en de reeds berekende waarden gaan mee, nooit de ruwe
   * signalen waarmee de AI zelf een readiness zou kunnen afleiden. */
  var READINESS_AI_FIELDS = ['zone', 'zoneLabel', 'zoneBetekenis', 'herstel', 'trainingsadvies',
                             'redenen', 'datakwaliteit', 'ontbreekt', 'herkomst', 'geplandeTraining', 'dagthema'];
  function readinessAiPayload(ctx) {
    var c = ctx || {};
    var b = c.besluit || {};
    var vol = {
      zone: b.zone || null, zoneLabel: b.zoneLabel || null, zoneBetekenis: b.zoneBetekenis || null,
      herstel: b.herstel || null, trainingsadvies: b.trainingsadvies || null,
      redenen: b.redenen || null, datakwaliteit: b.datakwaliteit || null,
      ontbreekt: (b.ontbreekt && b.ontbreekt.length) ? b.ontbreekt : null,
      herkomst: b.herkomst || null,
      geplandeTraining: c.geplandeTraining ? c.geplandeTraining.naam : null,
      dagthema: b.dagthema ? b.dagthema.key : null
    };
    var out = {};
    for (var i = 0; i < READINESS_AI_FIELDS.length; i++) {
      var f = READINESS_AI_FIELDS[i];
      if (vol[f] !== undefined && vol[f] !== null) out[f] = vol[f];
    }
    return out;
  }

  var CoachingCore = {
    buildReadinessContext: buildReadinessContext,
    readinessCoachMessage: readinessCoachMessage,
    readinessAiPayload: readinessAiPayload,
    READINESSCOACH_VERSIE: READINESSCOACH_VERSIE,
    READINESS_VERBODEN_WOORDEN: READINESS_VERBODEN_WOORDEN,
    READINESS_AI_FIELDS: READINESS_AI_FIELDS,
    READINESS_SIGNAAL_NAAM: READINESS_SIGNAAL_NAAM,
    buildLiveContext: buildLiveContext,
    liveCoachMessage: liveCoachMessage,
    liveAiPayload: liveAiPayload,
    LIVECOACH_VERSIE: LIVECOACH_VERSIE,
    LIVE_VERBODEN_WOORDEN: LIVE_VERBODEN_WOORDEN,
    LIVE_HERKOMST: LIVE_HERKOMST,
    LIVE_AI_FIELDS: LIVE_AI_FIELDS,
    AFWIJKING_TEKST: AFWIJKING_TEKST,
    deriveSignals: deriveSignals,
    styleProgression: styleProgression,
    COACH_STYLES: COACH_STYLES,
    buildContext: buildContext,
    aiPayload: aiPayload,
    improvementsDigest: improvementsDigest,
    buildCoachConclusion: buildCoachConclusion,
    conclusionText: conclusionText,
    explainProgression: explainProgression,
    has: has,
    AI_FIELDS: AI_FIELDS,
    PRIORITY: PRIORITY,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CoachingCore; }
  if (global) { global.CoachingCore = CoachingCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
