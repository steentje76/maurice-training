/* core/runningExecution.js — BACKWARD-COMPATIBLE ALIAS (B9-04).
 *
 * De volledige, oorspronkelijke logica van dit bestand (B9-02B) is
 * gegeneraliseerd naar core/enduranceExecution.js -- een deep audit
 * bevestigde dat de kern (state machine/timer/laps) altijd al volledig
 * sport-neutraal was (zie de uitgebreide motivatie in dat bestand).
 *
 * Dit bestand blijft ONGEWIJZIGD BESTAAN als een dunne re-export, zodat
 * geen enkele bestaande Running-aanroep in index.html
 * (RunningExecutionCore.start()/pause()/resume()/... ) hoeft te
 * veranderen -- nul regressierisico op de bewezen, B9-02/B9-02B/B9-02C-
 * geteste Running-functionaliteit.
 *
 * Nieuwe code (bijv. Cycling, B9-04) gebruikt rechtstreeks
 * core/enduranceExecution.js / EnduranceExecutionCore.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.RunningExecutionCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    return require('./enduranceExecution.js');
  }
  // Browser: EnduranceExecutionCore is al geladen door core/enduranceExecution.js
  // (moet VÓÓR dit bestand geladen worden in index.html).
  return (typeof self !== 'undefined' ? self : this).EnduranceExecutionCore;
}));
