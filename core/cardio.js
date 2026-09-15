/* ==========================================================================
 * TrainingKompas — CARDIO CALCULATION CORE  (F1.12)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * Device-ONAFHANKELIJK: CardioCore weet NIET of data van Concept2, AssaultBike,
 * handmatige invoer of een wearable komt — dat hoort in de adapter/source-laag.
 *
 * EENHEDEN zijn expliciet (cardio is unit-gevoelig):
 *   - afstand: METERS (m)          — 1000 m ≠ 1 km
 *   - tijd:    SECONDEN (s)        — 500 s ≠ 500 min
 *   - split:   SECONDEN per `basis` meter (Concept2-basis = 500 m)
 *   - vermogen: WATT
 *
 * Alle functies zijn 1-op-1 uit legacy CardioEngine + parseTimeToSec geëxtraheerd (old===new).
 * De Concept2-formule (watt = 2.80/(split/500)^3) is BEWUST ongewijzigd.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { time: 'cardio_time.v1', split: 'cardio_split.v1', power: 'cardio_power.v1', criticalSpeed: 'critical_speed.v1', criticalPower: 'critical_power.v1', enduranceTarget: 'endurance_target.v1' };

  // --- cardio_time.v1 (parse) --- exact gelijk aan legacy parseTimeToSec.
  // "mm:ss" of "h:mm:ss" of los getal -> seconden. Legacy-quirk behouden: leeg/ongeldig -> null.
  function parseTime(str) {
    if (!str) return null;
    var p = String(str).trim().split(':');
    var sec;
    if (p.length === 2) sec = parseFloat(p[0]) * 60 + parseFloat(p[1]);
    else if (p.length === 3) sec = parseFloat(p[0]) * 3600 + parseFloat(p[1]) * 60 + parseFloat(p[2]);
    else sec = parseFloat(str);
    return isNaN(sec) ? null : sec;
  }

  // --- cardio_time.v1 (format) --- exact gelijk aan legacy CardioEngine.formatTime.
  // seconden -> "mm:ss" of "h:mm:ss". Ongeldig/negatief -> ''.
  function formatTime(sec) {
    if (sec == null || isNaN(sec) || sec < 0) return '';
    sec = Math.round(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    var ss = String(s).padStart(2, '0');
    return h > 0 ? (h + ':' + mm + ':' + ss) : (mm + ':' + ss);
  }

  // --- cardio_split.v1 --- split/pace = tijd (s) per `basis` meter. Exact legacy.
  function splitFromDistTime(dist, timeSec, basis) {
    if (!dist || !timeSec) return null;
    return (timeSec / dist) * basis;
  }
  function timeFromDistSplit(dist, splitSec, basis) {
    if (!dist || !splitSec) return null;
    return (splitSec / basis) * dist;
  }
  function distFromTimeSplit(timeSec, splitSec, basis) {
    if (!timeSec || !splitSec) return null;
    return (timeSec / splitSec) * basis;
  }

  // --- cardio_power.v1 --- Concept2-formule (roei/ski/bike-erg, split-basis 500 m):
  // watt = 2.80 / (split_per_500m_in_sec / 500)^3, en de inverse. BEWUST ongewijzigd.
  function wattFromSplit500(splitSec) {
    if (!splitSec) return null;
    return 2.80 / Math.pow(splitSec / 500, 3);
  }
  function splitFromWatt500(watt) {
    if (!watt) return null;
    return Math.cbrt(2.80 / watt) * 500;
  }

  // --- cardio_split.v1 (intervallen) --- gelijkmatige auto-splits + aggregatie van handmatige splits.
  function autoSplits(totalTimeSec, totalDist, splitDist) {
    if (!totalTimeSec || !totalDist || !splitDist) return [];
    var n = Math.max(1, Math.round(totalDist / splitDist));
    var per = totalTimeSec / n;
    var splits = {};
    for (var i = 1; i <= n; i++) splits[i] = per;
    return splits;
  }
  function fromManualSplits(splitSecMap) {
    var vals = Object.values(splitSecMap).filter(function (v) { return v != null && !isNaN(v) && v > 0; });
    if (!vals.length) return null;
    var total = vals.reduce(function (a, b) { return a + b; }, 0);
    return { total: total, avg: total / vals.length, count: vals.length };
  }

  // --- cardio_validate.v1 --- PURE input-classificatie (F3.6). Beschermt de actual-write:
  // een negatieve/niet-eindige/onmogelijke cardio-waarde mag NOOIT in een sessions-row belanden.
  // Onderscheid: 'empty' (leeg/whitespace) · 'invalid' (NaN/Infinity/negatief) · 'valid'.
  // Puur presentatie/validatie: geen DOM, geen clamping van geldige invoer.
  function classifyNumericInput(raw) {
    if (raw === undefined || raw === null) return { status: 'empty', value: null, reason: null };
    var s = String(raw).trim();
    if (s === '') return { status: 'empty', value: null, reason: null };
    var v = Number(s);
    if (!isFinite(v)) return { status: 'invalid', value: null, reason: 'niet-eindig' };
    if (v < 0) return { status: 'invalid', value: null, reason: 'negatief' };
    return { status: 'valid', value: v, reason: null };
  }
  // Tijd-invoer ("mm:ss"/"h:mm:ss"/getal) via parseTime; negatief of onleesbaar -> invalid.
  function classifyTimeInput(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === '') return { status: 'empty', value: null, reason: null };
    var sec = parseTime(raw);
    if (sec === null || !isFinite(sec)) return { status: 'invalid', value: null, reason: 'onleesbaar' };
    if (sec < 0) return { status: 'invalid', value: null, reason: 'negatief' };
    return { status: 'valid', value: sec, reason: null };
  }

  // PRE-MERGE REMEDIATION (PR #31, Calculation Architecture-audit) — station_duration.v1 /
  // segment_transition.v1. Deze twee functies bestonden tot deze fix uitsluitend als lokale,
  // functioneel identieke duplicaten in index.html (tkHyroxStationDurationS/
  // tkHyroxSegmentTransitionS), gebouwd om de destijds beschermde core/calculation.js niet
  // te hoeven aanraken tijdens de v4.77.0-integratie. core/cardio.js staat NIET op de
  // beschermde-bestandenlijst, dus dit is de correcte, veilige, enige bron van waarheid:
  // index.html roept nu uitsluitend CardioCore.stationDurationS()/segmentTransitionS() aan,
  // geen eigen kopie meer.
  function stationDurationS(startMs, endMs) {
    var a = (typeof startMs === 'number') ? startMs : parseFloat(startMs);
    var b = (typeof endMs === 'number') ? endMs : parseFloat(endMs);
    if (a == null || b == null || !isFinite(a) || !isFinite(b)) return null;
    var rawMs = b - a;
    if (rawMs < 0) return null;
    return Math.round(rawMs / 1000);
  }

  var SEGMENT_TRANSITIE_MAX_DUUR_S = 3600;
  function segmentTransitionS(prevSegmentEndMs, nextSegmentStartMs, pausedMsPrev, pausedMsThis) {
    var a = (typeof prevSegmentEndMs === 'number') ? prevSegmentEndMs : parseFloat(prevSegmentEndMs);
    var b = (typeof nextSegmentStartMs === 'number') ? nextSegmentStartMs : parseFloat(nextSegmentStartMs);
    if (a == null || b == null || !isFinite(a) || !isFinite(b)) return null;
    var pa = (pausedMsPrev == null || !isFinite(pausedMsPrev)) ? 0 : pausedMsPrev;
    var pb = (pausedMsThis == null || !isFinite(pausedMsThis)) ? 0 : pausedMsThis;
    var pausedDelta = pb - pa;
    if (!(pausedDelta > 0)) pausedDelta = 0;
    var rawMs = b - a - pausedDelta;
    if (rawMs < 0) return null;
    var s = Math.round(rawMs / 1000);
    if (s > SEGMENT_TRANSITIE_MAX_DUUR_S) return null;
    return s;
  }

  // --- critical_speed.v1 (MS-F6-01) --------------------------------------
  // Tweeparametermodel (Monod & Scherrer 1965; toegepast op hardlopen door o.a.
  // Hughson et al. 1984): afstand = CS·tijd + D' (D' = anaerobe-afstandscapaciteit).
  // Lineaire regressie op {distance_m, duration_s}-paren van NABIJ-MAXIMALE,
  // constante-inspanning tijdritten (2-15 min-bereik is gangbaar in de literatuur).
  //
  // KRITIEKE, EERLIJKE BEPERKING (bevestigd tijdens de F6 Entry Audit): het TK-
  // datamodel heeft GEEN manier om een gelogde sessie te markeren als een genuine
  // maximale-inspanning-tijdrit versus een rustige duurloop. Deze functie neemt
  // daarom NOOIT automatisch trainingsgeschiedenis als input — de aanroeper moet
  // expliciet, gecureerde tijdrit-prestaties aanleveren. Automatische wiring op
  // willekeurige sessiedata zou een wetenschappelijk ongeldig model opleveren
  // (het CS-model vereist genuine uitputtende inspanningen, geen duurlopen).
  //
  // Vereist minimaal 2 performances (3+ sterk aanbevolen voor stabiliteit), met
  // AANTOONBAAR VERSCHILLENDE duren (anders is de regressie ongedefinieerd/instabiel).
  // Bij onvoldoende/ongeldige input: expliciete 'insufficient'/'invalid'-status,
  // NOOIT een verzonnen of laag-confidence-maar-toch-getoond resultaat.
  function criticalSpeed(performances) {
    if (!Array.isArray(performances)) return { status: 'invalid', reason: 'not_array' };
    var valid = performances.filter(function (p) {
      return p && isFinite(p.distance_m) && isFinite(p.duration_s) && p.distance_m > 0 && p.duration_s > 0;
    });
    if (valid.length < 2) return { status: 'insufficient', reason: 'min_2_performances_required', n: valid.length };
    var durations = valid.map(function (p) { return p.duration_s; });
    var uniqueDurations = durations.filter(function (v, i) { return durations.indexOf(v) === i; });
    if (uniqueDurations.length < 2) return { status: 'insufficient', reason: 'durations_not_distinct', n: valid.length };
    // Lineaire regressie: distance = CS*time + D' (kleinste-kwadraten op (time, distance)).
    var n = valid.length;
    var sumT = 0, sumD = 0, sumTT = 0, sumTD = 0;
    valid.forEach(function (p) {
      sumT += p.duration_s; sumD += p.distance_m;
      sumTT += p.duration_s * p.duration_s; sumTD += p.duration_s * p.distance_m;
    });
    var denom = (n * sumTT - sumT * sumT);
    if (denom === 0) return { status: 'insufficient', reason: 'degenerate_regression', n: n };
    var cs = (n * sumTD - sumT * sumD) / denom; // m/s
    var dPrime = (sumD - cs * sumT) / n; // m
    if (!isFinite(cs) || cs <= 0) return { status: 'invalid', reason: 'non_positive_cs' };
    // R² voor transparantie (geen aparte 'confidence'-fabricage, puur statistische fit).
    var meanD = sumD / n;
    var ssTot = 0, ssRes = 0;
    valid.forEach(function (p) {
      var pred = cs * p.duration_s + dPrime;
      ssRes += Math.pow(p.distance_m - pred, 2);
      ssTot += Math.pow(p.distance_m - meanD, 2);
    });
    var rSquared = (ssTot === 0) ? null : (1 - ssRes / ssTot);
    var confidence = (n >= 3 && rSquared != null && rSquared >= 0.95) ? 'hoog'
      : (n >= 2 && rSquared != null && rSquared >= 0.85) ? 'middel' : 'laag';
    return {
      status: 'valid', schema: 'critical_speed.v1',
      cs_m_s: cs, d_prime_m: (dPrime > 0 ? dPrime : 0),
      n_performances: n, r_squared: rSquared, confidence: confidence,
      // D' < 0 is fysiologisch onmogelijk (regressie-artefact bij te weinig/inconsistente data) —
      // op 0 geklemd voor weergave, maar de R²/confidence blijft het onderliggende signaal.
      limitations: 'Vereist genuine maximale-inspanningsprestaties (geen duurlopen); model is minder betrouwbaar buiten het 2-15 min-duurbereik; TK identificeert zelf geen tijdritten in trainingsgeschiedenis.'
    };
  }

  // --- critical_power.v1 (MS-F6-02) ---------------------------------------
  // Analoog aan critical_speed.v1, maar het canonieke Critical Power-model
  // (Monod & Scherrer 1965; Moritani et al. 1981 toegepast op fietsen) gebruikt
  // TOTAAL VERRICHT WERK (joule = gemiddeld vermogen × tijd) als afhankelijke
  // variabele, niet afstand: werk = CP·tijd + W' (W' = anaerobe werkcapaciteit).
  // Dit is de correcte, in de literatuur gestandaardiseerde formulering (niet
  // simpelweg "vermogen over tijd uitzetten", wat een ander, minder robuust model zou zijn).
  //
  // KRITIEKE, EERLIJKE BEPERKING (identiek aan criticalSpeed(), F6 Entry Audit):
  // het TK-datamodel heeft geen mechanisme om een gelogde rit te markeren als een
  // genuine maximale-inspanning-tijdrit versus een rustige duurrit. Deze functie
  // wordt daarom NOOIT automatisch op trainingsgeschiedenis gewired.
  //
  // Vereist minimaal 2 performances met aantoonbaar verschillende duren.
  function criticalPower(performances) {
    if (!Array.isArray(performances)) return { status: 'invalid', reason: 'not_array' };
    var valid = performances.filter(function (p) {
      return p && isFinite(p.avg_power_w) && isFinite(p.duration_s) && p.avg_power_w > 0 && p.duration_s > 0;
    });
    if (valid.length < 2) return { status: 'insufficient', reason: 'min_2_performances_required', n: valid.length };
    var durations = valid.map(function (p) { return p.duration_s; });
    var uniqueDurations = durations.filter(function (v, i) { return durations.indexOf(v) === i; });
    if (uniqueDurations.length < 2) return { status: 'insufficient', reason: 'durations_not_distinct', n: valid.length };
    var work = valid.map(function (p) { return { t: p.duration_s, w: p.avg_power_w * p.duration_s }; });
    var n = work.length;
    var sumT = 0, sumW = 0, sumTT = 0, sumTW = 0;
    work.forEach(function (p) {
      sumT += p.t; sumW += p.w; sumTT += p.t * p.t; sumTW += p.t * p.w;
    });
    var denom = (n * sumTT - sumT * sumT);
    if (denom === 0) return { status: 'insufficient', reason: 'degenerate_regression', n: n };
    var cp = (n * sumTW - sumT * sumW) / denom; // watt
    var wPrime = (sumW - cp * sumT) / n; // joule
    if (!isFinite(cp) || cp <= 0) return { status: 'invalid', reason: 'non_positive_cp' };
    var meanW = sumW / n;
    var ssTot = 0, ssRes = 0;
    work.forEach(function (p) {
      var pred = cp * p.t + wPrime;
      ssRes += Math.pow(p.w - pred, 2);
      ssTot += Math.pow(p.w - meanW, 2);
    });
    var rSquared = (ssTot === 0) ? null : (1 - ssRes / ssTot);
    var confidence = (n >= 3 && rSquared != null && rSquared >= 0.95) ? 'hoog'
      : (n >= 2 && rSquared != null && rSquared >= 0.85) ? 'middel' : 'laag';
    return {
      status: 'valid', schema: 'critical_power.v1',
      cp_w: cp, w_prime_j: (wPrime > 0 ? wPrime : 0),
      n_performances: n, r_squared: rSquared, confidence: confidence,
      limitations: 'Vereist genuine maximale-inspanningsprestaties (geen duurritten); model minder betrouwbaar buiten het 2-15 min-duurbereik; TK identificeert zelf geen tijdritten in trainingsgeschiedenis. Dit is een technisch/fysiologisch model, geen vervanging voor een FTP-testprotocol.'
    };
  }

  // --- endurance_target.v1 (CALC-END-006) --------------------------------
  // Typed-normalisatielaag voor de vrije-tekst intervaldoelen in
  // interval_prescription.v1 (`block.target.pace` / `.power` / `.rpe`,
  // zie core/intervalEngine.js). Bewijs (B1/B2/B3-Builder, ivRaw(),
  // fStructuredIntervalsB3Erg.test.js): ALLE sporten schrijven hun
  // pace-/vermogensdoel als vrije tekst in `.pace`, ongeacht de fysieke
  // grootheid — "4:30/km" (hardlopen), "1:45/100m" (zwemmen),
  // "1:50/500m" (RowErg/SkiErg), "250 W" (fietsen ÉN BikeErg). Het
  // schemaveld `.power` bestaat wel in IntervalEngineCore maar heeft
  // GEEN enkele producent (repo-brede grep: alleen één defensieve
  // leesplek) — dus het "soort" doel wordt NOOIT afgeleid uit welk
  // objectveld het in staat, uitsluitend uit de tekstinhoud zelf.
  //
  // Dit bestand REKENT hier niets fysiologisch: het zet een reeds
  // ingevoerde tekstwaarde om naar een expliciet getypeerd getal + eenheid
  // en weer terug (en detecteert ongeldige/onbekende vormen). Geen
  // intensiteitstransformatie, geen readiness-koppeling, geen Decision
  // Rule — uitsluitend deterministische parse/format.
  //
  // Canonieke eenheden (géén stille omzetting tussen noemers — "1:50/500m"
  // wordt NOOIT "1:50/km"): pace blijft seconden PER DE OORSPRONKELIJKE
  // NOEMER (km · 100m · 500m — de enige drie die in de Builder/tests
  // voorkomen); vermogen blijft watt (bestaande cardio_power.v1-eenheid).
  var TARGET_PACE_DENOMS = { km: 'sec_per_km', '100m': 'sec_per_100m', '500m': 'sec_per_500m' };
  var TARGET_PACE_DENOM_LABEL = { sec_per_km: 'km', sec_per_100m: '100m', sec_per_500m: '500m' };
  // Sport/soort-compatibiliteit zoals die vandaag daadwerkelijk in de Builder/tests
  // voorkomt (geen verzonnen combinaties) — puur informatief voor toekomstige
  // consumenten, geen harde parse-restrictie (de tekst zelf is zelfbeschrijvend).
  var TARGET_KIND_BY_SPORT = {
    running: ['pace'], cycling: ['power'], swimming: ['pace'],
    rowing: ['pace'], bikeerg: ['power'], skierg: ['pace']
  };

  // Strikte mm:ss (of h:mm:ss) parse voor het tijd-deel van een pace-string.
  // Bewust NIET CardioCore.parseTime() hergebruikt: die accepteert ook een
  // kaal getal als "seconden" (legacy-quirk voor tijdsinvoervelden) — voor
  // een pace-tekst zou dat een niet-onderscheidbare gok zijn ("4" = 4 sec of
  // ongeldig?). Hier: alleen "m:ss"/"h:mm:ss" met exact numerieke, niet-
  // negatieve onderdelen; al het overige is expliciet ongeldig (fail closed).
  function _strictParseMmSs(str) {
    var s = String(str).trim();
    if (s === '' || s.indexOf(',') !== -1) return null; // komma = locale-ambigu, bewust NIET geraden
    var p = s.split(':');
    if (p.length !== 2 && p.length !== 3) return null;
    var nums = p.map(function (x) { return /^[0-9]+(\.[0-9]+)?$/.test(x) ? parseFloat(x) : NaN; });
    if (nums.some(function (n) { return isNaN(n) || n < 0; })) return null;
    var sec = (p.length === 2) ? (nums[0] * 60 + nums[1]) : (nums[0] * 3600 + nums[1] * 60 + nums[2]);
    return isFinite(sec) ? sec : null;
  }

  // parseEnduranceTarget: vrije-tekst pace/vermogen-doel -> getypeerd endurance_target.v1.
  // Retourneert { status:'empty'|'invalid'|'valid', kind, value, unit, raw, reason }
  // (zelfde status-vocabulaire als classifyNumericInput/classifyTimeInput hierboven).
  function parseEnduranceTarget(raw) {
    if (raw === undefined || raw === null) return { status: 'empty', kind: null, value: null, unit: null, raw: raw, reason: null };
    var s = String(raw).trim();
    if (s === '') return { status: 'empty', kind: null, value: null, unit: null, raw: raw, reason: null };
    // Vermogen: "<getal>[ ]W" — exact het patroon uit de Builder ("250 W"/"250W").
    var mW = /^([0-9]+(\.[0-9]+)?)\s?[Ww]$/.exec(s);
    if (mW) {
      if (s.indexOf(',') !== -1) return { status: 'invalid', kind: null, value: null, unit: null, raw: raw, reason: 'locale_ambiguous_decimal' };
      var watt = parseFloat(mW[1]);
      if (!isFinite(watt) || watt <= 0) return { status: 'invalid', kind: null, value: null, unit: null, raw: raw, reason: 'non_positive_or_non_finite' };
      return { status: 'valid', kind: 'power', value: watt, unit: 'watt', raw: raw, reason: null };
    }
    // Pace: "<mm:ss>/<denom>" — denom moet één van de drie bewezen noemers zijn.
    var slash = s.indexOf('/');
    if (slash === -1) return { status: 'invalid', kind: null, value: null, unit: null, raw: raw, reason: 'missing_denominator' };
    var timePart = s.slice(0, slash), denomPart = s.slice(slash + 1).trim();
    var unit = TARGET_PACE_DENOMS[denomPart];
    if (!unit) return { status: 'invalid', kind: null, value: null, unit: null, raw: raw, reason: 'unknown_denominator' };
    var sec = _strictParseMmSs(timePart);
    if (sec === null) return { status: 'invalid', kind: null, value: null, unit: null, raw: raw, reason: 'time_parse_failed' };
    if (!(sec > 0) || !isFinite(sec)) return { status: 'invalid', kind: null, value: null, unit: null, raw: raw, reason: 'non_positive_or_non_finite' };
    return { status: 'valid', kind: 'pace', value: sec, unit: unit, raw: raw, reason: null };
  }

  // formatEnduranceTarget: getypeerd endurance_target.v1 -> exact de bestaande
  // prescriptie-tekstvorm. Hergebruikt formatTime() voor het tijd-deel, zodat de
  // notatie (geen leidende nul op minuten, bv. "4:30") identiek blijft aan de rest
  // van de app. Ongeldige/onbekende invoer -> '' (zelfde conventie als formatTime).
  function formatEnduranceTarget(typed) {
    if (!typed || typed.value == null || !isFinite(typed.value) || typed.value <= 0) return '';
    if (typed.kind === 'power' && typed.unit === 'watt') {
      var w = typed.value;
      return (Math.round(w * 100) / 100).toString().replace(/\.0+$/, '') + ' W';
    }
    if (typed.kind === 'pace') {
      var label = TARGET_PACE_DENOM_LABEL[typed.unit];
      if (!label) return '';
      return formatTime(typed.value) + '/' + label;
    }
    return '';
  }

  // typedRpeTarget: wrapt de reeds-numerieke, reeds-canonieke RPE-waarde (0-10,
  // bestaand veld `target.rpe`) in dezelfde getypeerde vorm, voor uniforme
  // consumptie. Geen nieuwe schaal, geen herberekening — puur vormgelijkheid.
  function typedRpeTarget(rpe) {
    if (rpe === undefined || rpe === null || String(rpe).trim() === '') return { status: 'empty', kind: null, value: null, unit: null, raw: rpe, reason: null };
    var v = Number(rpe);
    if (!isFinite(v)) return { status: 'invalid', kind: null, value: null, unit: null, raw: rpe, reason: 'non_finite' };
    if (v < 0 || v > 10) return { status: 'invalid', kind: null, value: null, unit: null, raw: rpe, reason: 'out_of_range_0_10' };
    return { status: 'valid', kind: 'rpe', value: v, unit: 'rpe_0_10', raw: rpe, reason: null };
  }

  function isTargetKindSupportedForSport(sport, kind) {
    var list = TARGET_KIND_BY_SPORT[sport];
    return Array.isArray(list) && list.indexOf(kind) !== -1;
  }

  var CardioCore = {
    parseTime: parseTime,
    formatTime: formatTime,
    splitFromDistTime: splitFromDistTime,
    timeFromDistSplit: timeFromDistSplit,
    distFromTimeSplit: distFromTimeSplit,
    wattFromSplit500: wattFromSplit500,
    splitFromWatt500: splitFromWatt500,
    autoSplits: autoSplits,
    fromManualSplits: fromManualSplits,
    classifyNumericInput: classifyNumericInput,
    classifyTimeInput: classifyTimeInput,
    stationDurationS: stationDurationS,
    segmentTransitionS: segmentTransitionS,
    criticalSpeed: criticalSpeed,
    criticalPower: criticalPower,
    parseEnduranceTarget: parseEnduranceTarget,
    formatEnduranceTarget: formatEnduranceTarget,
    typedRpeTarget: typedRpeTarget,
    isTargetKindSupportedForSport: isTargetKindSupportedForSport,
    TARGET_KIND_BY_SPORT: TARGET_KIND_BY_SPORT,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CardioCore; }
  if (global) { global.CardioCore = CardioCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
