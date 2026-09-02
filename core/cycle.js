/* ==========================================================================
 * TrainingKompas — CYCLE CALCULATION  (cycle.v1)
 * --------------------------------------------------------------------------
 * WAAROM DEZE MODULE BESTAAT
 * Cyclustracking is GEEN losstaande health-feature — het is CONTEXT voor
 * training, herstel en belasting. De bestaande Calculation Engine
 * (core/calculation.js, PROTECTED) heeft al `cyclusDagFactor(fase)`, die
 * precies de vier fasewaarden 'menstruatie'/'folliculair'/'ovulatie'/
 * 'luteaal' verwacht — dat is een reeds bestaande, product-eigenaar-
 * goedgekeurde vocabulaire (self-reported in de dagelijkse HRV-check-in,
 * hrv_log.cyclus_fase). Deze module dupliceert die logica NIET en wijzigt
 * protected core NIET. Ze levert uitsluitend een GESCHATTE cyclusdag/fase
 * uit gelogde periode-start/einddatums (RAW DATA, tabel cycle_periods),
 * zodat die schatting het bestaande systeem kan VOEDEN (als suggestie,
 * nooit als automatische, ongeziene overschrijving).
 *
 * MEDISCHE GRENZEN — HARD
 * - Geen diagnose, geen medische zekerheid, geen anticonceptie- of
 *   zwangerschapsclaims.
 * - "ovulatie" hier is een GESCHATTE, dag-tellingsgebaseerde fase-indicatie
 *   (hetzelfde concept als in de bestaande, self-reported check-in) — nooit
 *   een gemeten of gegarandeerd fysiologisch feit.
 * - Voorspellingen (volgende periode) worden UITSLUITEND getoond bij
 *   voldoende historische data (≥2 volledige cycli). Onvoldoende data ->
 *   expliciet null, nooit een verzonnen getal.
 *
 * PUUR EN DETERMINISTISCH. Geen Date.now(), geen Math.random(), geen DOM,
 * geen netwerk, geen fetch. Elke functie is een zuivere functie van haar
 * argumenten — reproduceerbaar en testbaar zonder mocks.
 * ========================================================================== */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CycleCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CYCLE_VERSIE = 'cycle.v1';

  // Standaard, in de literatuur/apps (Clue/Flo/Garmin) breed gebruikte
  // typische cyclusfase-vensters, uitgedrukt als cyclusdag-range op een
  // 28-dagen-cyclus. Bij een afwijkende gemiddelde cycluslengte wordt dit
  // proportioneel herschaald (zie faseVanDag). Puur een SCHATTING, geen
  // gemeten fysiologisch feit.
  var TYPISCHE_MENSTRUATIE_DAGEN = 5;   // dag 1 t/m 5
  var TYPISCHE_OVULATIE_VENSTER = 2;    // ± dagen rond het midden van de cyclus

  function parseISODate(d) {
    if (!d) return null;
    var t = (d instanceof Date) ? d : new Date(d + 'T00:00:00Z');
    return isFinite(t.getTime()) ? t : null;
  }
  function daysBetween(a, b) {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  /* ── RAW DATA-NORMALISATIE ────────────────────────────────────────────────
   * Sorteert gelogde periodes op start_date (oplopend), filtert ongeldige
   * rijen. Geen enkele aanname over volledigheid — ontbrekende/lege invoer
   * geeft gewoon een lege lijst terug. */
  function normalizePeriods(periods) {
    return (periods || [])
      .filter(function (p) { return p && p.start_date && parseISODate(p.start_date); })
      .map(function (p) {
        return {
          start: parseISODate(p.start_date),
          end: p.end_date ? parseISODate(p.end_date) : null,
          start_date: p.start_date,
          end_date: p.end_date || null
        };
      })
      .sort(function (a, b) { return a.start.getTime() - b.start.getTime(); });
  }

  /* ── cycle_day.v1 ─────────────────────────────────────────────────────────
   * Cyclusdag van `referenceDate`, geteld vanaf de start van de MEEST RECENTE
   * periode die vóór of op referenceDate begon (dag 1 = startdatum zelf).
   * Geen periodes gelogd, of geen enkele periode ligt vóór referenceDate ->
   * null (nooit een verzonnen dag). */
  function cycleDay(periods, referenceDate) {
    var ref = parseISODate(referenceDate);
    if (!ref) return null;
    var norm = normalizePeriods(periods);
    var laatste = null;
    for (var i = 0; i < norm.length; i++) {
      if (norm[i].start.getTime() <= ref.getTime()) laatste = norm[i];
    }
    if (!laatste) return null;
    return daysBetween(laatste.start, ref) + 1;
  }

  /* ── average_cycle_length.v1 ──────────────────────────────────────────────
   * Gemiddelde afstand (in dagen) tussen opeenvolgende periode-startdatums.
   * Minder dan 2 gelogde periodes -> onvoldoende data -> null. Geen enkele
   * aanname/default-waarde bij onvoldoende data. */
  function averageCycleLength(periods) {
    var norm = normalizePeriods(periods);
    if (norm.length < 2) return null;
    var totaal = 0, n = 0;
    for (var i = 1; i < norm.length; i++) {
      var afstand = daysBetween(norm[i - 1].start, norm[i].start);
      if (afstand > 0) { totaal += afstand; n++; }
    }
    if (n === 0) return null;
    return Math.round((totaal / n) * 10) / 10;
  }

  /* ── estimated_next_period.v1 ─────────────────────────────────────────────
   * Geschatte datum van de volgende menstruatie = laatste startdatum +
   * gemiddelde cycluslengte. Uitsluitend beschikbaar bij >=2 gelogde
   * cycli (dezelfde drempel die averageCycleLength hanteert) — bij minder
   * data expliciet null, ZODAT de UI "onvoldoende data" kan tonen i.p.v.
   * een geschatte datum te verzinnen op basis van één enkel datapunt. */
  function estimatedNextPeriod(periods) {
    var norm = normalizePeriods(periods);
    var gemLengte = averageCycleLength(periods);
    if (gemLengte == null || !norm.length) return null;
    var laatste = norm[norm.length - 1];
    var geschat = new Date(laatste.start.getTime());
    geschat.setUTCDate(geschat.getUTCDate() + Math.round(gemLengte));
    return geschat.toISOString().slice(0, 10);
  }

  /* ── estimated_phase_confidence.v1 (B9-H5, zelf gevonden en gerepareerd) ──
   * ECHTE, ZELF GEVONDEN GAP: estimatedPhaseFromDay() gebruikte tot deze
   * sprint altijd 28 dagen als stille fallback wanneer geen gemeten
   * gemiddelde cycluslengte beschikbaar was (bijv. bij de eerste, enige
   * gelogde cyclus) -- zonder dit te onderscheiden van een gebruiker met
   * meerdere, bekende cycli. Dit is exact het "forced 28-day model"/
   * "missing != normal"-risico. Confidence is nu expliciet, deterministisch,
   * en uitsluitend gebaseerd op data-volledigheid (aantal bekende
   * cyclus-intervallen), niet op een willekeurige AI-score.
   * Categorieën: 'unavailable' (geen schatting mogelijk), 'low' (28-dagen-
   * fallback gebruikt, <2 bekende cyclus-intervallen), 'medium' (2 bekende
   * intervallen), 'high' (>=3 bekende intervallen, stabielere gemiddelde). */
  function estimatedPhaseConfidence(cycleDayNr, periods) {
    if (cycleDayNr == null || cycleDayNr <= 0) return 'unavailable';
    var norm = normalizePeriods(periods);
    var n = 0;
    for (var i = 1; i < norm.length; i++) {
      if (daysBetween(norm[i - 1].start, norm[i].start) > 0) n++;
    }
    if (n === 0) return 'low';        // 28-dagen-fallback wordt gebruikt
    if (n <= 1) return 'medium';      // exact 1 gemeten interval
    return 'high';                    // >=2 gemeten intervallen
  }

  /* ── estimated_phase_from_day.v1 ──────────────────────────────────────────
   * Vertaalt een cyclusdag (+ eventueel een bekende gemiddelde cycluslengte)
   * naar één van de VIER AL BESTAANDE fasewaarden die
   * CalcCore.cyclusDagFactor() (protected core/calculation.js) verwacht:
   * 'menstruatie' | 'folliculair' | 'ovulatie' | 'luteaal'. Geen nieuwe
   * vocabulaire — deze functie VOEDT het bestaande systeem.
   * cycleDayNr null/<=0 -> null (geen schatting mogelijk).
   * "ovulatie" is hier een geschat venster rond het midden van de cyclus,
   * NOOIT een gemeten fysiologisch feit — exact hetzelfde voorbehoud als bij
   * de bestaande, self-reported check-in-optie met dezelfde naam. */
  function estimatedPhaseFromDay(cycleDayNr, gemiddeldeCyclusLengte) {
    if (cycleDayNr == null || cycleDayNr <= 0) return null;
    var lengte = (gemiddeldeCyclusLengte && gemiddeldeCyclusLengte > 0) ? gemiddeldeCyclusLengte : 28;
    if (cycleDayNr <= TYPISCHE_MENSTRUATIE_DAGEN) return 'menstruatie';
    var midden = lengte / 2;
    if (Math.abs(cycleDayNr - midden) <= TYPISCHE_OVULATIE_VENSTER) return 'ovulatie';
    if (cycleDayNr < midden) return 'folliculair';
    return 'luteaal';
  }

  /* ── cycle_context.v1 ─────────────────────────────────────────────────────
   * ÉÉN samengesteld, reeds-berekend contextobject -- klaar voor de Context
   * Engine / eventuele toekomstige AI-koppeling (NIET in deze MVP gekoppeld
   * aan buildCtx(); dat blijft een aparte, latere, expliciete beslissing).
   * Bevat uitsluitend afgeleide, deterministische waarden -- geen ruwe rijen. */
  function cycleContext(periods, referenceDate) {
    var dag = cycleDay(periods, referenceDate);
    var gemLengte = averageCycleLength(periods);
    var norm = normalizePeriods(periods);
    var actief = false;
    var ref = parseISODate(referenceDate);
    // BUGFIX (v4.53.0) — voorheen werd hier ALTIJD de LAATST GELOGDE periode gecontroleerd
    // (norm[norm.length-1]), ongeacht referenceDate. Dat klopte toevallig zolang uitsluitend
    // "vandaag" werd bevraagd (de laatst gelogde periode is dan per definitie ook de relevante),
    // maar gaf een fout resultaat bij een HISTORISCHE referenceDate -- ontdekt bij de bouw van
    // de cyclus-training-correlatie, die cycleContext() voor eerdere trainingsdata aanroept.
    // Nu: dezelfde "meest recente periode die vóór of op referenceDate begon"-logica als
    // cycleDay() al hanteert, in plaats van blind de laatste array-index.
    var relevant = null;
    for (var i = 0; i < norm.length; i++) {
      if (ref && norm[i].start.getTime() <= ref.getTime()) relevant = norm[i];
    }
    if (relevant) {
      if (relevant.end == null) {
        actief = !!(ref && daysBetween(relevant.start, ref) < TYPISCHE_MENSTRUATIE_DAGEN + 2);
      } else {
        actief = !!(ref && relevant.end.getTime() >= ref.getTime());
      }
    }
    return {
      versie: CYCLE_VERSIE,
      trackingBeschikbaar: norm.length > 0,
      cyclusDag: dag,
      geschatteFase: estimatedPhaseFromDay(dag, gemLengte),
      geschatteFaseConfidence: estimatedPhaseConfidence(dag, periods),
      menstruatieActief: actief,
      gemiddeldeCyclusLengte: gemLengte,
      geschatteVolgendePeriode: estimatedNextPeriod(periods),
      voldoendeDataVoorVoorspelling: gemLengte != null,
      aantalGeregistreerdeCycli: norm.length
    };
  }

  /* ── symptom_pattern.v1 ────────────────────────────────────────────────────
   * NEUTRALE, feitelijke patroondetectie op zelf-gerapporteerde symptomen.
   * GEEN diagnose, GEEN causaliteitsclaim (nooit "je hormonen veroorzaken..."),
   * uitsluitend een feitelijke telling: "je registreerde X op Y van Z
   * vergelijkbare cyclusdagen". Toont pas iets bij voldoende data (>=3
   * cycli met ten minste één registratie), anders expliciet "onvoldoende
   * data" -- nooit een patroon suggereren op 1-2 datapunten.
   *
   * symptomLogs: [{ log_date, symptoms: {key: 0-10, ...} }, ...]
   * Retourneert per symptoolkey een samenvatting, alleen voor symptomen die
   * daadwerkelijk >=1x gelogd zijn EN waarvoor genoeg cyclusdekking bestaat. */
  var MIN_CYCLI_VOOR_PATROON = 3;

  function symptomPatternSummary(symptomLogs, periods) {
    var logs = (symptomLogs || []).filter(function (l) { return l && l.log_date && l.symptoms; });
    var norm = normalizePeriods(periods);
    if (norm.length < MIN_CYCLI_VOOR_PATROON || !logs.length) {
      return { voldoendeData: false, patronen: [] };
    }
    // Groepeer elke logregel op haar cyclusdag t.o.v. de op dat moment geldende periode-start.
    var perSymptoomPerDag = {}; // { symptoomKey: { dag: [waarden] } }
    logs.forEach(function (log) {
      var dag = cycleDay(periods, log.log_date);
      if (dag == null) return;
      Object.keys(log.symptoms).forEach(function (key) {
        var waarde = log.symptoms[key];
        if (waarde == null) return;
        if (!perSymptoomPerDag[key]) perSymptoomPerDag[key] = {};
        if (!perSymptoomPerDag[key][dag]) perSymptoomPerDag[key][dag] = [];
        perSymptoomPerDag[key][dag].push(waarde);
      });
    });
    var patronen = [];
    Object.keys(perSymptoomPerDag).forEach(function (key) {
      var perDag = perSymptoomPerDag[key];
      var totaalRegistraties = 0;
      Object.keys(perDag).forEach(function (d) { totaalRegistraties += perDag[d].length; });
      // Alleen een patroon melden als het symptoom op MEERDERE verschillende cycli is
      // teruggekomen (niet slechts vaak binnen één cyclus) -- benaderd via het totaal
      // aantal registraties t.o.v. het aantal gelogde cycli.
      if (totaalRegistraties < MIN_CYCLI_VOOR_PATROON) return;
      patronen.push({
        symptoom: key,
        aantalRegistraties: totaalRegistraties,
        aantalCycliMetData: norm.length
      });
    });
    return { voldoendeData: true, patronen: patronen };
  }

  return {
    versie: CYCLE_VERSIE,
    normalizePeriods: normalizePeriods,
    cycleDay: cycleDay,
    averageCycleLength: averageCycleLength,
    estimatedNextPeriod: estimatedNextPeriod,
    estimatedPhaseFromDay: estimatedPhaseFromDay,
    estimatedPhaseConfidence: estimatedPhaseConfidence,
    cycleContext: cycleContext,
    symptomPatternSummary: symptomPatternSummary
  };
});

