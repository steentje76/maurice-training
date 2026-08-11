/* ==========================================================================
 * TrainingKompas — PROGRESSION CORE  (F3.9)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * Vergelijkt trainingsprestaties DETERMINISTISCH (nooit via AI). Werkt op reeds-
 * genormaliseerde `perf`-objecten die de caller (DataAccess/UI) bouwt uit sessions —
 * ProgressionCore weet niets van DB/DOM/units-parsing; het vergelijkt kant-en-klare getallen.
 *
 * perf = { key, date, <metricvelden> }   (bv. { key:'roeien@2000', date:'2026-08-01',
 *          durationSec, splitSec, watts, calories, calPerMin, weight, reps, e1rm })
 * `key` groepeert vergelijkbare prestaties (zelfde oefening + zelfde afstand voor distance-cardio).
 *
 * Metric-semantiek is EXPLICIET (geen "hoogste getal = beste"):
 *   dir 'min' = lager is beter (split, tijd bij vaste afstand)
 *   dir 'max' = hoger is beter (watt, afstand, calories/min, e1rm, gewicht)
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { compare: 'progression_compare.v1', trend: 'progression_trend.v1', sufficiency: 'progression_sufficiency.v1' };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  // Data-sufficiency status uit het aantal VERGELIJKBARE eerdere prestaties (excl. de huidige).
  // Voorkomt misleidende conclusies bij te weinig data.
  function sufficiency(comparableCount) {
    var n = comparableCount | 0;
    if (n <= 0) return { status: 'first', label: 'Eerste registratie', canCompare: false, canTrend: false };
    if (n === 1) return { status: 'one_previous', label: 'Vergelijking met vorige training', canCompare: true, canTrend: false };
    if (n >= 2 && n < 3) return { status: 'comparison', label: 'Vergelijking beschikbaar', canCompare: true, canTrend: false };
    return { status: 'trend', label: 'Progressie beschikbaar', canCompare: true, canTrend: true };
  }

  // Alle eerdere perfs met dezelfde key (exclusief het huidige perf-object indien meegegeven),
  // gesorteerd oplopend op date (oud -> nieuw). date is een sorteerbare string 'YYYY-MM-DD'.
  function comparableHistory(history, key, excludeCurrent) {
    var cur = excludeCurrent || null;
    return (history || [])
      .filter(function (p) { return p && p.key === key && p !== cur; })
      .slice()
      .sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  }

  // De meest recente vergelijkbare eerdere prestatie (of null). before = optionele date-grens.
  function comparablePrevious(history, key, before, excludeCurrent) {
    var comp = comparableHistory(history, key, excludeCurrent);
    if (before != null) comp = comp.filter(function (p) { return p.date < before; });
    return comp.length ? comp[comp.length - 1] : null;
  }

  // Beste perf op een veld met expliciete richting ('min'|'max'). Alleen numerieke waarden tellen.
  function bestBy(history, key, field, dir) {
    var comp = comparableHistory(history, key, null).filter(function (p) { return isNum(p[field]); });
    if (!comp.length) return null;
    return comp.reduce(function (best, p) {
      if (!best) return p;
      return (dir === 'min' ? p[field] < best[field] : p[field] > best[field]) ? p : best;
    }, null);
  }

  // Deterministisch verschil-rapport tussen huidige en vorige prestatie voor opgegeven metrics.
  // metrics = [{ field, dir, unit, label }]. Retour per metric: {delta, better, dir, current, previous}.
  // better: true=verbeterd, false=slechter, null=gelijk of onvergelijkbaar.
  function deltaReport(current, previous, metrics) {
    var out = {};
    (metrics || []).forEach(function (m) {
      var c = current ? current[m.field] : undefined, p = previous ? previous[m.field] : undefined;
      if (!isNum(c) || !isNum(p)) { out[m.field] = { delta: null, better: null, dir: m.dir, current: isNum(c) ? c : null, previous: isNum(p) ? p : null, unit: m.unit, label: m.label }; return; }
      var delta = c - p;
      var better = delta === 0 ? null : (m.dir === 'min' ? delta < 0 : delta > 0);
      out[m.field] = { delta: delta, better: better, dir: m.dir, current: c, previous: p, unit: m.unit, label: m.label };
    });
    return out;
  }

  // Is de HUIDIGE prestatie een nieuwe beste t.o.v. alle EERDERE vergelijkbare prestaties?
  // history bevat uitsluitend eerdere prestaties (excl. current). Zonder eerdere prestatie -> false
  // (dat is een 'eerste registratie', geen 'nieuwe beste'). Metric-semantiek expliciet via dir.
  function isNewBest(history, key, current, field, dir) {
    if (!current || !isNum(current[field])) return false;
    var best = bestBy(history, key, field, dir);
    if (!best) return false;
    return dir === 'min' ? current[field] < best[field] : current[field] > best[field];
  }

  // Eenvoudige trend over >=minN vergelijkbare prestaties: gemiddelde verandering per stap
  // (laatste - eerste)/(n-1) op één veld, met richting. Onder de drempel -> insufficient.
  function trendBy(history, key, field, dir, minN) {
    minN = minN || 3;
    var comp = comparableHistory(history, key, null).filter(function (p) { return isNum(p[field]); });
    if (comp.length < minN) return { status: 'insufficient', label: 'Nog niet genoeg vergelijkbare data', n: comp.length };
    var first = comp[0][field], last = comp[comp.length - 1][field];
    var avgStep = (last - first) / (comp.length - 1);
    var improving = avgStep === 0 ? null : (dir === 'min' ? avgStep < 0 : avgStep > 0);
    return { status: 'trend', n: comp.length, field: field, dir: dir, first: first, last: last, avgStep: avgStep, improving: improving };
  }

  var ProgressionCore = {
    sufficiency: sufficiency,
    comparableHistory: comparableHistory,
    comparablePrevious: comparablePrevious,
    bestBy: bestBy,
    isNewBest: isNewBest,
    deltaReport: deltaReport,
    trendBy: trendBy,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = ProgressionCore; }
  if (global) { global.ProgressionCore = ProgressionCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
