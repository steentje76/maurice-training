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

  var CoachingCore = {
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
