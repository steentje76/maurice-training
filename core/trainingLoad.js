/* ==========================================================================
 * TrainingKompas — TRAINING LOAD ADVISORY  (trainingLoad.v1)
 * --------------------------------------------------------------------------
 * PRODUCT GAP DISCOVERY V8 (v4.58.0). Dicht een echte, bewezen ketenbreuk:
 * de volume-gebaseerde ACWR (AthleteCore.acuteChronic(), protected core)
 * wordt al berekend en bereikt al de AI-coach-context (tkCoachBelasting() ->
 * tkCoachDataBlok() -> buildCtx()), maar zonder enige classificatie —
 * uitsluitend een kaal getal, geen enkele betekenis eraan gekoppeld.
 *
 * DEZE MODULE VOEGT UITSLUITEND EEN NEUTRALE CLASSIFICATIE TOE aan een
 * REEDS BESTAAND, REEDS PROTECTED-CORE-BEREKEND getal. Geen nieuwe
 * berekening van de ACWR zelf (die blijft AthleteCore.acuteChronic(),
 * ONGEWIJZIGD). Geen wijziging aan protected core/decision.js of
 * computeProgAdjustment() — die blijft exact zoals hij was, met haar eigen,
 * al geteste vier inputs (dagfactor/spierherstel/gevoel/pijn). Deze
 * classificatie is een AANVULLENDE, NEUTRALE contextregel voor de AI Coach —
 * GEEN automatische wijziging van sets/RPE, GEEN blessurerisico-claim.
 *
 * WETENSCHAPPELIJKE BASIS (niet zelfverzonnen): de acuut:chronisch-
 * belastingsratio-banden hieronder volgen de breed geciteerde, gepubliceerde
 * indeling (Gabbett, 2016, "The training-injury prevention paradox") die
 * ook door bestaande sportwetenschappelijke coaching-tools wordt gehanteerd:
 * <0.8 = duidelijk lager dan gebruikelijk, 0.8-1.3 = vergelijkbaar met
 * gebruikelijk ("sweet spot"), 1.3-1.5 = duidelijk hoger dan gebruikelijk,
 * >1.5 = sterk hoger dan gebruikelijk. Dit blijft een STATISTISCHE
 * classificatie van een verhouding — GEEN medische diagnose, GEEN
 * blessurevoorspelling. Taal is bewust neutraal-beschrijvend, nooit
 * alarmerend of diagnosticerend.
 * ========================================================================== */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TrainingLoadCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIE = 'trainingLoad.v1';

  /* ── classify_acwr.v1 ──────────────────────────────────────────────────────
   * Zuivere classificatie van een REEDS BEREKENDE ACWR-waarde (uit
   * AthleteCore.acuteChronic().waarde). Retourneert altijd exact één van:
   * 'lager' | 'vergelijkbaar' | 'hoger' | 'sterk_hoger' | null.
   * null bij ontbrekende/ongeldige waarde -- nooit een gok. Grenswaarden zijn
   * INCLUSIEF aan de onderkant van elke band (0.8 zelf valt in
   * 'vergelijkbaar', niet in 'lager'; 1.3 valt in 'hoger', niet in
   * 'vergelijkbaar') -- consistent, geen dubbelzinnige overlap. */
  function classifyAcwr(acwr) {
    if (acwr == null || typeof acwr !== 'number' || isNaN(acwr) || acwr < 0) return null;
    if (acwr < 0.8) return 'lager';
    if (acwr < 1.3) return 'vergelijkbaar';
    if (acwr < 1.5) return 'hoger';
    return 'sterk_hoger';
  }

  /* ── acwr_advisory_text.v1 ─────────────────────────────────────────────────
   * Neutrale, feitelijke Nederlandse tekst bij een classificatie -- geen
   * blessurerisico-claim, geen medische taal, geen automatisch advies om iets
   * te doen. Puur een beschrijving van waar de huidige belasting staat t.o.v.
   * het eigen gemiddelde. null-classificatie -> lege string (geen tekst,
   * geen verzonnen boodschap bij onvoldoende data). */
  function acwrAdvisoryText(classificatie) {
    switch (classificatie) {
      case 'lager': return 'Je trainingsbelasting deze week ligt duidelijk lager dan je eigen gemiddelde van de afgelopen weken.';
      case 'vergelijkbaar': return 'Je trainingsbelasting deze week ligt in lijn met je eigen gemiddelde van de afgelopen weken.';
      case 'hoger': return 'Je trainingsbelasting deze week ligt duidelijk hoger dan je eigen gemiddelde van de afgelopen weken.';
      case 'sterk_hoger': return 'Je trainingsbelasting deze week ligt sterk hoger dan je eigen gemiddelde van de afgelopen weken.';
      default: return '';
    }
  }

  /* ── corroborated_load_signal.v1 ──────────────────────────────────────────
   * G4-HERBEOORDELING (v4.60.0). Eerdere ronde wees een deload-advies op
   * ACWR ALLEEN af, omdat een enkel getal misleidend bleek (ACWR sterk_hoger,
   * maar monotonie laag -- tegenstrijdige signalen). In plaats van één
   * complex, persoonlijk-percentiel-vereisend "Training Strain"-getal te
   * ontwerpen (eveneens afgewezen, zie DEC-035), gebruikt deze functie een
   * EENVOUDIGER, robuuster patroon: CORROBORATIE. Een signaal wordt
   * uitsluitend afgegeven wanneer TWEE ONAFHANKELIJKE, AL BESTAANDE,
   * AL GETESTE bronnen HETZELFDE beeld geven:
   *   1. ACWR-classificatie (classifyAcwr(), hierboven) = 'hoger' of
   *      'sterk_hoger';
   *   2. minimaal twee oefeningen met een dalende progressie-trend
   *      (ProgressionCore.trendBy(), zie tkProgressionTrendContext()).
   * Vereist BEIDE signalen tegelijk -- nooit één los signaal. Dit is een
   * bewust conservatief, vals-positief-mijdend ontwerp: hoge belasting
   * ALLEEN is normaal na een zware, productieve week; dalende progressie
   * ALLEEN kan wijzen op techniek/motivatie/onvoldoende data. Uitsluitend
   * de COMBINATIE is een corroborerend, feitelijk signaal waard om te
   * benoemen -- nog steeds GEEN advies, GEEN automatische aanpassing.
   * Retourneert uitsluitend true/false -- de aanroeper (AI-coachcontext)
   * bepaalt de neutrale formulering, deze functie geeft geen tekst. */
  function corroboratedLoadSignal(acwrClassificatie, aantalDalendeOefeningen) {
    if (aantalDalendeOefeningen == null || typeof aantalDalendeOefeningen !== 'number' || aantalDalendeOefeningen < 0) return false;
    var acwrHoog = (acwrClassificatie === 'hoger' || acwrClassificatie === 'sterk_hoger');
    return acwrHoog && aantalDalendeOefeningen >= 2;
  }

  /* ── session_load_srpe.v1 ─────────────────────────────────────────────────
   * MS-F3-02 (Load & Progression Calculation Registry) — GEVONDEN LACUNE:
   * de acceptance gate noemt sRPE expliciet, maar geen enkele sRPE-berekening
   * bestond vóór deze sprint. sessions.duration_s en sessions.rpe bestaan al
   * (POST-V1 roadmap-item #1, live geverifieerd in Supabase), dus dit is een
   * minimale, direct bruikbare toevoeging — geen nieuwe databronnen nodig.
   *
   * FOSTER-METHODE (session-RPE): duur (minuten) × sessie-RPE (0-10 Borg CR10)
   * = arbitraire eenheden (AU) "interne trainingsbelasting" van één sessie.
   * BEWUST GEEN fysiologische belasting, GEEN externe load — een eenvoudige,
   * subjectieve, per-sessie samenvatting bedoeld voor RELATIEVE vergelijking
   * over tijd (bv. rolling/acute-chronic-gebruik), niet voor absolute
   * interpretatie op zichzelf.
   *
   * Bron: Foster C, Florhaug JA, Franklin J, Gottschall L, Hrovatin LA,
   * Parker S, Doleshal P, Dodge C. "A new approach to monitoring exercise
   * training." Journal of Strength & Conditioning Research. 2001;15(1):109-115.
   *
   * Puur/deterministisch. Ongeldige/ontbrekende input -> null (geen fabricage).
   *   durationSec: sessieduur in seconden (bv. sessions.duration_s)
   *   rpe: sessie-RPE, 0-10 (Borg CR10-schaal) */
  function sessionLoadSRPE(durationSec, rpe) {
    var d = (typeof durationSec === 'number') ? durationSec : parseFloat(durationSec);
    var r = (typeof rpe === 'number') ? rpe : parseFloat(rpe);
    if (!isFinite(d) || d <= 0 || !isFinite(r) || r < 0 || r > 10) return null;
    var minuten = d / 60;
    return Math.round(minuten * r);
  }

  /* ── rolling_load_sum.v1 ──────────────────────────────────────────────────
   * Zuivere optelling van sRPE-waarden binnen een venster — GEEN nieuwe
   * acute:chronic-ratio (die blijft AthleteCore.acuteChronic(), protected
   * core, hier bewust ongewijzigd). Deze functie levert alleen de
   * bouwsteen (som van sRPE over N sessies) waarmee een caller zelf een
   * rolling-venster kan samenstellen. Lege/ongeldige lijst -> 0 (een lege
   * periode heeft terecht nul belasting, geen "onbekend").
   *   srpeValues: array van sessionLoadSRPE()-uitkomsten (nulls worden genegeerd) */
  function rollingLoadSum(srpeValues) {
    var vals = Array.isArray(srpeValues) ? srpeValues : [];
    var som = 0;
    vals.forEach(function (v) { if (typeof v === 'number' && isFinite(v)) som += v; });
    return som;
  }

  return {
    versie: VERSIE,
    classifyAcwr: classifyAcwr,
    acwrAdvisoryText: acwrAdvisoryText,
    corroboratedLoadSignal: corroboratedLoadSignal,
    sessionLoadSRPE: sessionLoadSRPE,
    rollingLoadSum: rollingLoadSum
  };
});
