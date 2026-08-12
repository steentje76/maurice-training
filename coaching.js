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

  var VERSIONS = { signals: 'coaching_signals.v1', context: 'coaching_context.v1' };

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

  var CoachingCore = {
    deriveSignals: deriveSignals,
    buildContext: buildContext,
    aiPayload: aiPayload,
    improvementsDigest: improvementsDigest,
    has: has,
    AI_FIELDS: AI_FIELDS,
    PRIORITY: PRIORITY,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CoachingCore; }
  if (global) { global.CoachingCore = CoachingCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
