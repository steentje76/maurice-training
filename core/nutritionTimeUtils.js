/* core/nutritionTimeUtils.js — NUT-TIME-01.
 *
 * Pure, deterministische conversie tussen:
 *  - een UTC ISO-timestamp (zoals opgeslagen in consumed_at/occurred_at,
 *    timestamptz in Postgres),
 *  - een 'YYYY-MM-DDTHH:mm'-string voor een <input type="datetime-local">
 *    (altijd lokale tijd, geen tijdzone-aanduiding),
 *  - lokale-dag-grenzen (voor "toon alles van vandaag"-queries).
 *
 * GEEN DOM, GEEN netwerk, GEEN Date.now() binnen de conversiefuncties zelf
 * (nowLocalInputValue is de enige, expliciet benoemde uitzondering die de
 * huidige tijd nodig heeft door zijn aard). Dezelfde invoer geeft altijd
 * dezelfde uitvoer.
 *
 * WAAROM GEEN HANDMATIGE OFFSETBEREKENING
 * new Date('YYYY-MM-DDTHH:mm') (zonder 'Z' of offset) wordt door de
 * JS-Date-constructor geïnterpreteerd als LOKALE tijd van de omgeving
 * waarin de code draait -- dat is exact het gedrag van een <input
 * type="datetime-local">-veld (toont en accepteert altijd lokale tijd).
 * new Date(jaar, maand, dag, uur, minuut, ...) (los-argumenten-vorm)
 * bouwt eveneens een lokale tijd, inclusief automatische DST-correctie
 * door de JS-runtime -- geen enkele UTC-offsetsom hoeft hier zelf te
 * worden uitgerekend.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionTimeUtils = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function pad2(n) { return String(n).padStart(2, '0'); }

  /* isoToLocalInputValue: UTC ISO-timestamp -> 'YYYY-MM-DDTHH:mm' in lokale tijd. */
  function isoToLocalInputValue(iso) {
    var d = new Date(iso);
    if (!isFinite(d.getTime())) return null;
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
      + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /* localInputToIso: 'YYYY-MM-DDTHH:mm' (lokale tijd, geen tz-aanduiding)
   * -> correcte UTC ISO-timestamp. Ongeldige invoer geeft null (nooit een
   * gok, nooit een stille foute datum). */
  function localInputToIso(value) {
    if (!value) return null;
    var d = new Date(value);
    return isFinite(d.getTime()) ? d.toISOString() : null;
  }

  /* nowLocalInputValue: default-waarde voor een nieuw datetime-local-veld. */
  function nowLocalInputValue() {
    return isoToLocalInputValue(new Date().toISOString());
  }

  /* localDayBoundsIso: lokale kalenderdag van Date-object d -> UTC ISO-
   * grenzen (00:00:00.000 t/m 23:59:59.999 lokale tijd). DST-correct: de
   * los-argumenten Date-constructor rekent zelf de juiste UTC-offset uit
   * voor elk van de twee momenten (kan verschillen op een DST-omschakeldag). */
  function localDayBoundsIso(d) {
    var start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    var eind = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    return { startIso: start.toISOString(), eindIso: eind.toISOString() };
  }

  /* localDateStr: lokale kalenderdag als 'YYYY-MM-DD' (voor bv. effective_from
   * op targets). Vervangt een eerdere, foutieve UTC-gebaseerde implementatie
   * (d.toISOString().slice(0,10)) die rond middernacht de verkeerde dag gaf
   * voor tijdzones vóór op UTC. */
  function localDateStr(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  return {
    isoToLocalInputValue: isoToLocalInputValue,
    localInputToIso: localInputToIso,
    nowLocalInputValue: nowLocalInputValue,
    localDayBoundsIso: localDayBoundsIso,
    localDateStr: localDateStr
  };
}));
