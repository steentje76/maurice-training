/* ==========================================================================
 * TrainingKompas — SHARED CALCULATION CORE  (F1.2 first extraction)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 * Geen document/window-DOM, geen Supabase/fetch, geen localStorage, geen AI,
 * geen globale mutable state. INPUT -> OUTPUT.
 *
 * Bevat UITSLUITEND bestaande legacy-semantiek (extractie, geen verbetering):
 *   - roundKg      : gewicht-afronding 0,5 kg, half -> +Infinity  (rounding.v1)
 *   - oneRMRaw     : Epley RAW (geen afronding)                    (e1rm.v1)
 *   - calculate1RM : Epley -> Math.round (hele kg)                 (e1rm.v1)
 *
 * Legacy quirks BEWUST behouden (niet stil wijzigen):
 *   - roundKg(null) === 0        (null*2 === 0)
 *   - roundKg(undefined/NaN/"abc") === NaN
 *   - half-afronding richting +Infinity (Math.round): 0.25->0.5, 2.75->3, -1.25->-1
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = {
    rounding: 'rounding.v1', e1rm: 'e1rm.v1', working_weight: 'working_weight.v1', ai_guard: 'ai_guard.v1',
    volume: 'volume.v1', percentage: 'percentage.v1', warmup: 'warmup.v1', recovery: 'recovery.v1', dayfactor: 'dayfactor.v1',
    goal: 'goal.v1', e1rm_weighted: 'e1rm_weighted.v1', recovery_score: 'recovery_score.v1',
    sleep_unit: 'sleep_unit.v1', correlation: 'correlation.v1',
    readiness_percent: 'readiness_percent.v1'
  };

  // --- rounding.v1 --- exact gelijk aan legacy index.html r.10668
  function roundKg(v) { return Math.round(v * 2) / 2; }

  // --- e1rm.v1 (RAW) --- exact gelijk aan legacy epley1RMRaw r.10661
  function oneRMRaw(kg, reps) { return reps === 1 ? kg : kg * (1 + reps / 30); }

  // --- e1rm.v1 (hele kg) --- exact gelijk aan legacy epley1RM r.10662-10666
  // Legacy-semantiek BEWUST 1-op-1: guard -> null; 1 rep -> kg (NIET afgerond); anders Math.round(raw).
  function calculate1RM(kg, reps) {
    if (!kg || !reps || reps < 1) return null;
    if (reps === 1) return kg;
    return Math.round(oneRMRaw(kg, reps));
  }

  // --- working_weight.v1 --- exact gelijk aan legacy suggestWeightForRepsRpe (index.html r.8094-8100)
  // Brzycki-inverse: RPE -> RIR -> reps-to-failure -> gewicht, afgerond met roundKg. Legacy-semantiek
  // BEWUST 1-op-1: guard (!oneRM||!reps)->null; default RPE 8; reps-to-failure geplafonneerd op 20; w>0 else null.
  function calculateWorkingWeight(oneRM, reps, rpe) {
    if (!oneRM || !reps) return null;
    var rir = Math.max(0, 10 - (parseFloat(rpe) || 8));
    var repsToFailure = Math.min(20, reps + rir);
    var w = oneRM * (37 - repsToFailure) / 36;
    return w > 0 ? roundKg(w) : null;
  }

  // --- ai_guard.v1 --- AI-BOUNDARY: valideert een AI-VOORGESTELD gewicht vóór het als suggestie
  // gebruikt mag worden. Pure/deterministisch: geen DOM/DB/AI/network. AI is nooit de bron van
  // numerieke waarheid — een voorstel wordt hier getypeerd, engine-afgerond (roundKg) en op
  // plausibiliteit begrensd. Ongeldig -> {ok:false}. Geldig -> {ok:true, value} (engine-rounded).
  //   kg    : het door de AI voorgestelde gewicht (number of parseable string)
  //   oneRM : bekend (geschat) 1RM voor plausibiliteitsgrens; null/onbekend -> absolute cap 500 kg
  function validateProposedWeight(kg, oneRM) {
    var n = (typeof kg === 'number') ? kg : parseFloat(kg);
    if (typeof n !== 'number' || !isFinite(n)) return { ok: false, reason: 'geen geldig getal', source: 'ai_suggested', calculationVersion: VERSIONS.ai_guard };
    if (n <= 0) return { ok: false, reason: 'niet-positief', source: 'ai_suggested', calculationVersion: VERSIONS.ai_guard };
    var rounded = roundKg(n);
    var cap = (typeof oneRM === 'number' && isFinite(oneRM) && oneRM > 0) ? oneRM * 1.2 : 500;
    if (rounded > cap) return { ok: false, reason: 'boven plausibele grens', source: 'ai_suggested', calculationVersion: VERSIONS.ai_guard };
    return { ok: true, value: rounded, unit: 'kg', source: 'ai_suggested', calculationVersion: VERSIONS.ai_guard };
  }

  // --- volume.v1 --- RAW tonnage-product (kg). Exact gelijk aan de inline legacy-product-sites
  // (index.html r.7144 `s.sets*s.reps*s.weight`, r.12451/13175 idem na caller-coercion).
  // BEWUST puur product met JS-`*`-semantiek: de callers coercen zelf (||0/||1/parseFloat) —
  // dat is data-extractie/boundary, GEEN calculation. Core rekent één geval. Geen afronding hier;
  // Math.round + ton/"k"-conversie zijn UI-formatters en verschillen per site (niet unificeren).
  //   input: { sets, reps, weight }  ->  sets*reps*weight (kg)   |  ontbrekende input -> null
  // Legacy-quirks bewust behouden: null*x===0, undefined*x===NaN, '3'*'8'*'100'===2400 (string-coercie).
  function calculateVolume(input) {
    if (!input) return null;
    return input.sets * input.reps * input.weight;
  }

  // --- percentage.v1 --- base * pct / 100 (RAW, geen afronding). Exact gelijk aan de inline legacy
  // `base*param/100` in getEffectiveKg (index.html r.11109/11113/11118). De caller past roundKg toe
  // (roundKg blijft de afrondingsbron). Puur/deterministisch.
  function applyPercentage(base, pct) {
    return base * pct / 100;
  }

  // --- rounding_increment.v1 --- praktische afronding op een beschikbare gewichtsstap (increment).
  // Puur/deterministisch. inc ontbreekt/≤0 → terugval op roundKg (0,5). Voorbeeld: 38,75 kg, inc 2,5 → 40.
  function roundToIncrement(kg, inc) {
    if (!(inc > 0)) return roundKg(kg);
    return Math.round(kg / inc) * inc;
  }
  // --- warmup.v1 --- exact gelijk aan legacy suggestWarmupScheme (index.html r.10957-10964).
  // Puur; gebruikt roundKg (rounding.v1). Legacy-semantiek 1-op-1: dezelfde drempels/percentages/reps.
  // OPTIONEEL increment (equipment-aware praktische afronding): meegegeven → roundToIncrement, anders roundKg
  // (achterwaarts compatibel; bestaande callers zonder increment houden exact het oude gedrag).
  function calculateWarmup(workKg, increment) {
    var pcts;
    if (workKg >= 120) pcts = [[0.4, 8], [0.55, 5], [0.7, 3], [0.8, 2], [0.9, 1]];
    else if (workKg >= 80) pcts = [[0.4, 8], [0.6, 5], [0.75, 3], [0.9, 1]];
    else if (workKg >= 40) pcts = [[0.5, 6], [0.7, 4], [0.85, 2]];
    else pcts = [[0.5, 8], [0.75, 4]];
    var rnd = (increment > 0) ? function (v) { return roundToIncrement(v, increment); } : roundKg;
    return pcts.map(function (pr) { return { kg: rnd(workKg * pr[0]), reps: pr[1] }; });
  }

  // --- recovery.v1 --- exact gelijk aan legacy rpeMultiplier (r.15318-15324) + computeMuscleRecoveryPct
  // (r.15326-15329). Puur/deterministisch. Legacy-quirks bewust behouden:
  //   rpeMultiplier: !r||isNaN(r) -> 1 (dus rpe 0/leeg/NaN -> 1); r>=9 -> 1.3; r>=8 -> 1.0; anders 0.85.
  //   calculateMuscleRecoveryPct: effHours = baseHours*rpeMultiplier(rpe); min(100, round(hoursSince/effHours*100)).
  function rpeMultiplier(rpe) {
    var r = parseFloat(rpe);
    if (!r || isNaN(r)) return 1;
    if (r >= 9) return 1.3;
    if (r >= 8) return 1.0;
    return 0.85;
  }
  function calculateMuscleRecoveryPct(hoursSince, baseHours, rpe) {
    var effHours = baseHours * rpeMultiplier(rpe);
    return Math.min(100, Math.round(hoursSince / effHours * 100));
  }

  // --- dayfactor.v1 --- pure numerieke dagfactor. Exact gelijk aan de rekenkern van legacy
  // slaapDagFactor (r.12673-12678) + cyclusDagFactor (r.12679-12681) + de combinatie in dagfactor
  // (r.12690-12691). De object-assembly (hrvSt/hrvBaseline-passthrough) blijft ORCHESTRATIE in de app.
  // Puur/deterministisch. Legacy-quirks bewust behouden: slaap !uren -> 1.00; onbekende fase -> 1.00;
  // clamp [0.85,1.05]; afronding op 2 decimalen.
  // --- sleep_unit.v1 --- COMPATIBILITEITSLAAG voor hrv_log.sleep.
  // Canoniek is DECIMALE UREN. De check-in schrijft dat al zo; de wearable-sync schreef tot
  // v4.26.0 minuten in dezelfde kolom, waardoor één kolom twee eenheden kon bevatten.
  // De sync is bij de bron gecorrigeerd; deze shim vangt uitsluitend BESTAANDE rijen op.
  // Regel, deterministisch en bewust conservatief: een nacht slaap is nooit meer dan
  // MAX_SLEEP_HOURS uur, dus alles daarboven kan alleen een minutenwaarde zijn.
  // Geen migratie: de opgeslagen rij blijft ongewijzigd, alleen het LEZEN normaliseert.
  var MAX_SLEEP_HOURS = 20;
  function normalizeSleepHours(v) {
    if (v == null || v === '') return null;
    var n = typeof v === 'number' ? v : parseFloat(v);
    if (!isFinite(n) || n <= 0) return null;
    if (n > MAX_SLEEP_HOURS) return Math.round(n / 60 * 100) / 100;   // legacy: minuten
    return Math.round(n * 100) / 100;                                  // canoniek: uren
  }
  // Uren + minuten → canonieke decimale uren. Eén plek voor de invoerkant.
  function sleepToHours(uren, minuten) {
    var u = Number(uren) || 0, m = Number(minuten) || 0;
    if (!u && !m) return null;
    return Math.round((u + m / 60) * 100) / 100;
  }

  function slaapDagFactor(uren) {
    if (!uren) return 1.00;
    if (uren >= 7) return 1.00;
    if (uren >= 6) return 0.97;
    return 0.92;
  }
  function cyclusDagFactor(fase) {
    return ({ menstruatie: 0.93, folliculair: 1.03, ovulatie: 1.00, luteaal: 0.97 })[fase] ?? 1.00;
  }
  // hrvFactor is de reeds-geresolveerde HRV-factor (app-side houdt de hrvComponent||{factor:1.00}
  // default als orchestratie/context). Kern = exact legacy: hrvFactor*slaap*cyclus, clamp, 2 decimalen.
  // sleepHours MOET decimale uren zijn. De normalisatie gebeurt hier één keer, zodat een
  // legacy-minutenwaarde de dagfactor niet meer kan vervuilen.
  function calculateDayFactor(input) {
    var i = input || {};
    var ruw = i.hrvFactor * slaapDagFactor(normalizeSleepHours(i.sleepHours)) * cyclusDagFactor(i.cyclePhase);
    return Math.round(Math.max(0.85, Math.min(1.05, ruw)) * 100) / 100;
  }

  // --- recovery_score.v1 --- ÉÉN deterministische 0-100 herstelscore uit de BESCHIKBARE signalen.
  // GEEN fabricage: alleen aanwezige componenten tellen mee; ontbrekende worden overgeslagen en de
  // gewichten herverdeeld. Ontbreken ALLE inputs → score:null ('onbekend'). Puur/deterministisch, geen AI.
  // input: { dayFactor?(0.85-1.05, uit calculateDayFactor = HRV·slaap·cyclus),
  //          muscleRecoveryPct?(0-100, gem. relevante spieren), rhrDelta?(bpm boven baseline; ≥0 = slechter),
  //          voelt?('slecht'|'matig'|'goed'|'top') }
  // Weging: dayFactor 0.45 · spierherstel 0.30 · RHR 0.15 · gevoel 0.10 (over aanwezige componenten).
  // --- readiness_percent.v1 --- de dagfactor als percentage: 0.85 -> 0, 1.00 -> 75, 1.05 -> 100.
  // Deze omzetting stond op TWEE plaatsen: hier binnen recoveryScore, en als v43GereedheidScore
  // in index.html — letterlijk dezelfde formule, met het risico dat ze uit elkaar lopen. Sinds
  // Sprint 14 staat hij één keer hier; beide plekken gebruiken hem. De uitkomst is ongewijzigd.
  // Buiten het bereik wordt de factor geklemd, nooit geëxtrapoleerd. Geen factor -> null.
  function readinessPercent(dayFactor) {
    if (dayFactor == null || isNaN(dayFactor)) return null;
    var df = Math.max(0.85, Math.min(1.05, Number(dayFactor)));
    return Math.round((df - 0.85) / 0.20 * 100);
  }

  function recoveryScore(input) {
    var i = input || {};
    var comps = [];
    if (typeof i.dayFactor === 'number' && isFinite(i.dayFactor)) {
      comps.push({ v: readinessPercent(i.dayFactor), w: 0.45 });   // readiness_percent.v1
    }
    if (typeof i.muscleRecoveryPct === 'number' && isFinite(i.muscleRecoveryPct)) {
      comps.push({ v: Math.max(0, Math.min(100, Math.round(i.muscleRecoveryPct))), w: 0.30 });
    }
    if (typeof i.rhrDelta === 'number' && isFinite(i.rhrDelta)) { // +0→100, +10→40, ≥+17→0
      comps.push({ v: Math.max(0, Math.min(100, Math.round(100 - Math.max(0, i.rhrDelta) * 6))), w: 0.15 });
    }
    if (i.voelt) {
      var vm = ({ slecht: 30, matig: 60, goed: 85, top: 100 })[i.voelt];
      if (vm != null) comps.push({ v: vm, w: 0.10 });
    }
    if (!comps.length) return { score: null, band: 'onbekend', confidence: 'geen', components: 0 };
    var wsum = comps.reduce(function (a, c) { return a + c.w; }, 0);
    var score = Math.max(0, Math.min(100, Math.round(comps.reduce(function (a, c) { return a + c.v * c.w; }, 0) / wsum)));
    return { score: score, band: recoveryBand(score), confidence: (comps.length >= 3 ? 'hoog' : comps.length === 2 ? 'gemiddeld' : 'laag'), components: comps.length };
  }
  // Bandindeling (sprint-default): ≥80 hoog, ≥60 gemiddeld, anders laag.
  function recoveryBand(score) {
    if (score == null || isNaN(score)) return 'onbekend';
    if (score >= 80) return 'hoog';
    if (score >= 60) return 'gemiddeld';
    return 'laag';
  }

  // --- goal.v1 --- exact gelijk aan legacy computeGoalProgress (index.html r.7097-7104).
  // PURE DataAccess-boundary: de caller haalt currentVal op (DB/DOM); de core rekent alleen.
  // Legacy-semantiek 1-op-1: null-guard; start = startwaarde ?? currentVal; span 0 -> 100/0;
  // pct = round((cur-start)/span*100), geplafonneerd op [0,100].
  //   goal: { startwaarde, doelwaarde }  ·  currentVal
  function calculateGoalProgress(goal, currentVal) {
    var g = goal || {};
    if (currentVal == null || g.doelwaarde == null) return null;
    var start = g.startwaarde != null ? g.startwaarde : currentVal;
    var span = g.doelwaarde - start;
    if (span === 0) return currentVal >= g.doelwaarde ? 100 : 0;
    var pct = Math.round(((currentVal - start) / span) * 100);
    return Math.max(0, Math.min(100, pct));
  }

  // --- e1rm_weighted.v1 --- exact gelijk aan legacy weightedEst1RM (index.html r.14203-14216).
  // DataAccess-split: de caller haalt `sessions` op (DataAccess) én bepaalt `ref` (de app-wrapper
  // houdt de `new Date()`-default = context/orchestratie); de core rekent zuiver decay-gewogen.
  //   sessions: [{date, weight, reps}]  ·  ref: Date (verplicht, deterministisch)  ·  decay: per-week factor
  // Gebruikt oneRMRaw (e1rm.v1) intern. Legacy-quirk: sessies zonder weight/reps worden overgeslagen.
  function weightedOneRM(sessions, ref, decay) {
    var sumW = 0, sumWV = 0, n = 0;
    (sessions || []).forEach(function (s) {
      if (!s.weight || !s.reps) return;
      var est = oneRMRaw(s.weight, s.reps);
      var days = Math.max(0, (ref - new Date(s.date)) / 86400000);
      var weken = days / 7;
      var w = Math.pow(decay, weken);
      sumW += w; sumWV += w * est; n++;
    });
    if (!n) return { est: null, n: 0 };
    return { est: sumWV / sumW, n: n };
  }

  // Optionele, kleine result-contracten (versioneerbaar; geen metadata-explosie).
  // De frontend mag de primitives gebruiken; Evidence/Decision kan later de *Result-vorm nemen.
  function roundKgResult(v) {
    return { value: roundKg(v), unit: 'kg', calculationType: 'rounding', calculationVersion: VERSIONS.rounding };
  }
  function oneRMResult(kg, reps) {
    return { value: calculate1RM(kg, reps), unit: 'kg', calculationType: 'e1rm', calculationVersion: VERSIONS.e1rm };
  }
  function workingWeightResult(oneRM, reps, rpe) {
    return { value: calculateWorkingWeight(oneRM, reps, rpe), unit: 'kg', calculationType: 'working_weight', calculationVersion: VERSIONS.working_weight };
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * SPEARMAN RANGCORRELATIE (correlation.v1) — Verbanden V1
   *
   * PUUR en DETERMINISTISCH. Geen Date.now, geen random, geen database, geen DOM,
   * geen externe bibliotheek. Dezelfde invoer geeft altijd exact dezelfde uitkomst.
   *
   * Spearman meet of de RANGORDE van twee reeksen meebeweegt, niet of er een rechte
   * lijn door de punten past. Gekozen omdat de gegevens ordinale schalen bevatten
   * (RPE) en losse uitschieters (één rusthartslag van 28 tussen veertig waarden van
   * 45-60); onder Pearson zou dat ene punt elk verband met RHR meetrekken.
   *
   * Implementatie: Pearson OVER DE RANGEN. Dat is de correcte vorm zodra er gelijke
   * waarden (ties) voorkomen — de bekende 6*sum(d^2)-formule is dan onjuist. Ties
   * krijgen de GEMIDDELDE rang (1, 2.5, 2.5, 4), wat deterministisch is en niet van
   * de invoervolgorde afhangt.
   *
   * Ongeldige paren (null, undefined, NaN, Infinity, niet-numeriek) worden VERWIJDERD,
   * nooit als 0 geteld. Is een van beide reeksen constant, dan bestaat er geen rang-
   * variatie en is de coëfficiënt niet te bepalen: dan null, niet 0 — 0 zou "geen
   * samenhang" beweren waar niets te bepalen valt.
   *
   * Geen zekerheids- of sterktescore hier: dat is een beslissing, geen berekening.
   * ══════════════════════════════════════════════════════════════════════════ */
  function _corrNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string') {
      var t = v.trim();
      if (!t || !/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(t)) return null;
      var n = Number(t);
      return isFinite(n) ? n : null;
    }
    return null;
  }
  // Rangen met gemiddelde rang bij gelijke waarden. Stabiel: bij exact gelijke waarden
  // beslist de oorspronkelijke index, zodat de uitkomst niet van de sorteervolgorde afhangt.
  function _ranks(values) {
    var idx = values.map(function (v, i) { return { v: v, i: i }; });
    idx.sort(function (x, y) { return (x.v - y.v) || (x.i - y.i); });
    var out = new Array(values.length);
    var k = 0;
    while (k < idx.length) {
      var j = k;
      while (j + 1 < idx.length && idx[j + 1].v === idx[k].v) j++;
      var gemiddeldeRang = (k + j) / 2 + 1;          // rangen zijn 1-based
      for (var m = k; m <= j; m++) out[idx[m].i] = gemiddeldeRang;
      k = j + 1;
    }
    return out;
  }
  // pairs: [{a,b}] of [[a,b]]. → { coefficient, n, direction }
  // direction: 'higher' (positief) · 'lower' (negatief) · 'none' (nul of onbepaalbaar)
  function spearman(pairs) {
    var arr = Array.isArray(pairs) ? pairs : [];
    var A = [], B = [];
    arr.forEach(function (p) {
      if (!p) return;
      var a = _corrNum(Array.isArray(p) ? p[0] : p.a);
      var b = _corrNum(Array.isArray(p) ? p[1] : p.b);
      if (a == null || b == null) return;
      A.push(a); B.push(b);
    });
    var n = A.length;
    if (n < 2) return { coefficient: null, n: n, direction: 'none' };
    var ra = _ranks(A), rb = _ranks(B);
    var ma = 0, mb = 0, i;
    for (i = 0; i < n; i++) { ma += ra[i]; mb += rb[i]; }
    ma /= n; mb /= n;
    var num = 0, da = 0, db = 0;
    for (i = 0; i < n; i++) {
      var xa = ra[i] - ma, xb = rb[i] - mb;
      num += xa * xb; da += xa * xa; db += xb * xb;
    }
    if (da === 0 || db === 0) return { coefficient: null, n: n, direction: 'none' };
    var r = num / Math.sqrt(da * db);
    if (!isFinite(r)) return { coefficient: null, n: n, direction: 'none' };
    if (r > 1) r = 1; if (r < -1) r = -1;            // numerieke afronding afvangen
    var coefficient = Math.round(r * 1000) / 1000;
    return {
      coefficient: coefficient,
      n: n,
      direction: coefficient > 0 ? 'higher' : (coefficient < 0 ? 'lower' : 'none')
    };
  }

  var CalcCore = {
    roundKg: roundKg,
    oneRMRaw: oneRMRaw,
    calculate1RM: calculate1RM,
    calculateWorkingWeight: calculateWorkingWeight,
    validateProposedWeight: validateProposedWeight,
    calculateVolume: calculateVolume,
    applyPercentage: applyPercentage,
    calculateWarmup: calculateWarmup,
    roundToIncrement: roundToIncrement,
    rpeMultiplier: rpeMultiplier,
    calculateMuscleRecoveryPct: calculateMuscleRecoveryPct,
    normalizeSleepHours: normalizeSleepHours,
    sleepToHours: sleepToHours,
    MAX_SLEEP_HOURS: MAX_SLEEP_HOURS,
    slaapDagFactor: slaapDagFactor,
    cyclusDagFactor: cyclusDagFactor,
    calculateDayFactor: calculateDayFactor,
    recoveryScore: recoveryScore,
    readinessPercent: readinessPercent,
    recoveryBand: recoveryBand,
    calculateGoalProgress: calculateGoalProgress,
    spearman: spearman,
    weightedOneRM: weightedOneRM,
    roundKgResult: roundKgResult,
    oneRMResult: oneRMResult,
    workingWeightResult: workingWeightResult,
    VERSIONS: VERSIONS
  };

  // UMD-achtige export: bruikbaar als CommonJS-module (node/tests) én als browser-global.
  if (typeof module !== 'undefined' && module.exports) { module.exports = CalcCore; }
  if (global) { global.CalcCore = CalcCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
