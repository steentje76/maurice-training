/* ==========================================================================
 * TrainingKompas — ERG CONTINUOUS PROTOCOL IDENTITY
 * --------------------------------------------------------------------------
 * PUUR · DETERMINISTISCH · OFFLINE. Geen DOM, geen Supabase/fetch, geen
 * localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: een CONTINUE (niet-gestructureerde) RowErg/BikeErg/SkiErg-inspanning
 * een canonieke protocol-identiteit geven VOORDAT er actuals bestaan.
 *
 * GEEN NIEUW CONTRACT. Deze module hergebruikt letterlijk de bestaande,
 * canonieke terminatiesemantiek van `interval_prescription.v1`
 * (core/intervalEngine.js):
 *
 *   TERMINATION_TYPES = ['time', 'distance', 'manual']
 *
 * en de daar expliciet vastgelegde architectuurregel:
 *
 *   "TARGETS vs TERMINATION: expliciet gescheiden. `termination` bepaalt
 *    WANNEER een block eindigt; `target` is uitsluitend informatief."
 *
 * Een continue inspanning is simpelweg de kleinst geldige prescriptie:
 * EEN work-block, repeat 1, met de gekozen terminatie. Dat is geverifieerd
 * geldig in de bestaande IntervalEngineCore.normalizePrescription() --
 * er is dus geen tweede protocolmodel nodig en er wordt niets aan B3
 * gestructureerde intervallen gewijzigd.
 *
 * ATLEET-LABELS vs CANONIEKE WAARDEN (PO-besluit):
 *   Vrij    -> 'manual'    (geen doel; logt normaal mee in volume/belasting,
 *                           later NIET protocol-PB/trend-geschikt)
 *   Afstand -> 'distance'  (doelafstand in meters, vóór uitvoering gekozen)
 *   Tijd    -> 'time'      (doelduur in seconden, vóór uitvoering gekozen)
 *
 * BRON VAN WAARHEID (hard):
 *   Prescriptie / immutable training_instances.snapshot = INTENTIE.
 *   sessions-protocolvelden = IMMUTABLE QUERY-PROJECTIE, nooit zelfstandige
 *   waarheid. Bij tegenspraak wint het snapshot.
 *
 * ACTUAL MAG NOOIT INTENTIE BEPALEN. Dat is hier STRUCTUREEL afgedwongen:
 * protocolProjectionFromPrescription() accepteert UITSLUITEND een prescriptie
 * en heeft geen enkele parameter waarlangs een gemeten afstand/duur/split
 * binnen kan komen. Een ronde uitkomst (2000 m, 30:00) kan dus per
 * constructie geen protocol worden.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { projection: 'erg_protocol_projection.v1' };

  // Canonieke Erg-sporten (spiegelt TK_ERG_SPORTS in index.html; hier herhaald
  // omdat deze module pure/offline blijft en geen app-globals leest).
  var ERG_SPORTS = ['rowing', 'bikeerg', 'skierg'];

  // Canonieke terminatietypes -- IDENTIEK aan intervalEngine.TERMINATION_TYPES.
  // Bewust geen eigen vocabulaire (geen fixed_distance/fixed_duration/free).
  var PROTOCOL_TYPES = ['manual', 'distance', 'time'];

  // Atleet-labels (NL) -> canonieke waarde. Alleen presentatie; de canonieke
  // waarde is wat gepersisteerd en vergeleken wordt.
  var PROTOCOL_LABEL_NL = { manual: 'Vrij', distance: 'Afstand', time: 'Tijd' };

  function isPosNum(v) { return typeof v === 'number' && isFinite(v) && v > 0; }
  function isErgSport(s) { return typeof s === 'string' && ERG_SPORTS.indexOf(s) !== -1; }

  /* continuousErgPrescription(sport, protocolType, protocolValue)
   * Bouwt de kleinst geldige `interval_prescription.v1`-vorm voor een CONTINUE
   * Erg-inspanning: één work-block, repeat 1, met de gekozen terminatie.
   * Retourneert null bij een ongeldige combinatie (fail closed) -- nooit een
   * halve of gegokte prescriptie.
   *
   * Let op: dit levert de RUWE prescriptievorm. De aanroeper haalt hem door de
   * bestaande IntervalEngineCore.normalizePrescription() heen; die blijft de
   * enige validator/normalisator (geen tweede validatielaag hier). */
  function continuousErgPrescription(sport, protocolType, protocolValue) {
    if (!isErgSport(sport)) return null;
    if (PROTOCOL_TYPES.indexOf(protocolType) === -1) return null;
    var termination;
    if (protocolType === 'manual') {
      termination = { type: 'manual' };
    } else if (protocolType === 'distance') {
      if (!isPosNum(protocolValue)) return null;
      termination = { type: 'distance', meters: Math.round(protocolValue) };
    } else {
      if (!isPosNum(protocolValue)) return null;
      termination = { type: 'time', seconds: Math.round(protocolValue) };
    }
    return {
      version: 'interval_prescription.v1',
      sport: sport,
      blocks: [{ repeat: 1, of: [{ type: 'work', termination: termination }] }]
    };
  }

  /* isContinuousPrescription(normalized)
   * Een genormaliseerde prescriptie is "continu" als hij exact één block bevat
   * dat één keer wordt uitgevoerd en van het type work is. Alles daarbuiten is
   * een B3 gestructureerde intervaltraining en valt buiten deze module. */
  function isContinuousPrescription(normalized) {
    if (!normalized || !Array.isArray(normalized.blocks)) return false;
    if (normalized.blocks.length !== 1) return false;
    var b = normalized.blocks[0];
    if (!b || b.type !== 'work') return false;
    if (b.repeatTotal != null && b.repeatTotal !== 1) return false;
    return true;
  }

  /* protocolProjectionFromPrescription(normalized)
   * Leidt de IMMUTABLE QUERY-PROJECTIE af uit een genormaliseerde prescriptie.
   *
   * STRUCTURELE GARANTIE: deze functie kent uitsluitend de prescriptie. Er is
   * geen parameter voor gemeten afstand, duur of split, dus een actual kan per
   * constructie nooit een protocol worden.
   *
   * Retourneert { protocol_type, protocol_value } of null wanneer er geen
   * canonieke continue intentie is (gestructureerd, ongeldig, of afwezig) --
   * dan blijft de projectie in de sessie NULL (= LEGACY_UNKNOWN / onbekend),
   * wat correct is: liever geen claim dan een gegokte. */
  function protocolProjectionFromPrescription(normalized) {
    if (!normalized || normalized.geldig === false) return null;
    if (!isContinuousPrescription(normalized)) return null;
    var t = normalized.blocks[0].termination;
    if (!t || PROTOCOL_TYPES.indexOf(t.type) === -1) return null;
    if (t.type === 'manual') return { protocol_type: 'manual', protocol_value: null };
    if (t.type === 'distance') return isPosNum(t.meters) ? { protocol_type: 'distance', protocol_value: Math.round(t.meters) } : null;
    return isPosNum(t.seconds) ? { protocol_type: 'time', protocol_value: Math.round(t.seconds) } : null;
  }

  /* protocolLabelNl(protocolType, protocolValue)
   * Atleet-facing weergave. Puur presentatie; verandert nooit de canonieke
   * waarde. 'manual' toont bewust GEEN doel (zou misleidend zijn). */
  function protocolLabelNl(protocolType, protocolValue) {
    if (protocolType === 'manual') return PROTOCOL_LABEL_NL.manual;
    if (protocolType === 'distance' && isPosNum(protocolValue)) return Math.round(protocolValue) + ' m';
    if (protocolType === 'time' && isPosNum(protocolValue)) {
      var s = Math.round(protocolValue), m = Math.floor(s / 60), r = s % 60;
      return r === 0 ? (m + ' min') : (m + ':' + (r < 10 ? '0' : '') + r);
    }
    return '';
  }

  var ErgProtocolIdentity = {
    VERSIONS: VERSIONS,
    ERG_SPORTS: ERG_SPORTS,
    PROTOCOL_TYPES: PROTOCOL_TYPES,
    PROTOCOL_LABEL_NL: PROTOCOL_LABEL_NL,
    continuousErgPrescription: continuousErgPrescription,
    isContinuousPrescription: isContinuousPrescription,
    protocolProjectionFromPrescription: protocolProjectionFromPrescription,
    protocolLabelNl: protocolLabelNl
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = ErgProtocolIdentity; }
  else { global.ErgProtocolIdentity = ErgProtocolIdentity; }
})(typeof window !== 'undefined' ? window : this);
