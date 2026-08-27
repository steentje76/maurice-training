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

  return {
    versie: VERSIE,
    classifyAcwr: classifyAcwr,
    acwrAdvisoryText: acwrAdvisoryText
  };
});
