/* ==========================================================================
 * TrainingKompas — INTERVAL ENGINE CORE (A6 v1)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: één generiek, sport-onafhankelijk model voor gestructureerde
 * work/recovery-intervaltrainingen (WARMUP/WORK/RECOVERY/COOLDOWN, met
 * repeats). Dit vervangt GEEN bestaande cardio-infrastructuur
 * (CardioCore/CARDIO_TYPES blijven de canonieke bron voor eenheden/metrics
 * per sport) -- IntervalEngineCore voegt uitsluitend de PRESCRIPTIE- en
 * EXECUTIE-STATE-LAAG toe die tot nu toe nergens bestond (bevestigd via
 * uitputtende code-discovery: geen enkel bestaand block/repeat-model).
 *
 * Sportcontext bepaalt welke metrics geldig zijn -- dat blijft de
 * verantwoordelijkheid van CARDIO_TYPES (index.html), niet van deze module.
 * Deze module weet UITSLUITEND: welk block is nu actief, hoeveel tijd
 * resteert (bij TIME-terminatie), en wanneer de hele prescriptie voltooid is.
 *
 * TERMINATION TYPES (A6 v1): TIME | DISTANCE | MANUAL.
 * DISTANCE wordt in v1 UX-technisch als MANUAL behandeld (de sporter tikt
 * zelf door zodra de afstand is bereikt) -- er bestaat geen live,
 * device-onafhankelijke afstandsmeting, dus geen schijnprecisie: een
 * DISTANCE-block "eindigt" nooit automatisch op basis van een gegokte tijd.
 *
 * BLOCK TYPES (A6 v1): warmup | work | recovery | cooldown.
 * Dit zijn EXECUTIE-blocktypes, geen sportwetenschappelijke classificatie.
 *
 * TARGETS vs TERMINATION: expliciet gescheiden. `termination` bepaalt WANNEER
 * een block eindigt; `target` (optioneel, vrije vorm: {rpe, pace, power})
 * is uitsluitend informatief -- deze module rekent er niets mee uit, evalueert
 * niets, en verzint geen zones. Geen FTP/critical power/critical speed.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { prescription: 'interval_prescription.v1', state: 'interval_state.v1' };

  var BLOCK_TYPES = ['warmup', 'work', 'recovery', 'cooldown'];
  var TERMINATION_TYPES = ['time', 'distance', 'manual'];

  function isPosNum(v) { return typeof v === 'number' && isFinite(v) && v > 0; }

  // --- interval_prescription.v1 --- valideert/normaliseert een ruwe prescriptie tot een
  // platte, canonieke blocks-array (repeats al uitgerold -- geen impliciete lus-logica
  // meer verderop in de executie/UI-laag, dat voorkomt subtiele off-by-one-bugs).
  // GEEN mutatie van de input; retourneert altijd een NIEUW object.
  //
  // Invoervorm: raw.blocks is een array van OFWEL een los block-object (repeat=1 impliciet),
  // OFWEL een REPEAT-GROEP {repeat:N, of:[block,...]} die N keer de VOLLEDIGE, IN VOLGORDE
  // AFGEWISSELDE reeks in `of` uitrolt (bv. 8x [work,recovery] -> work,recovery,work,recovery,...
  // -- NIET work*8 gevolgd door recovery*8, wat een losse repeat-per-blocktype zou opleveren).
  function normalizePrescription(raw) {
    if (!raw || !Array.isArray(raw.blocks)) return { version: 1, sport: (raw && raw.sport) || null, blocks: [], geldig: false, reden: 'geen blocks' };
    var blocks = [];
    var fout = null;
    function valideerBlock(b) {
      if (!b || BLOCK_TYPES.indexOf(b.type) === -1) return 'ongeldig blocktype: ' + (b && b.type);
      if (!b.termination || TERMINATION_TYPES.indexOf(b.termination.type) === -1) return 'ongeldige terminatie op block: ' + b.type;
      if (b.termination.type === 'time' && !isPosNum(b.termination.seconds)) return 'time-terminatie vereist seconds > 0';
      if (b.termination.type === 'distance' && !isPosNum(b.termination.meters)) return 'distance-terminatie vereist meters > 0';
      return null;
    }
    function pushBlock(b, repeatIndex, repeatTotal) {
      blocks.push({
        type: b.type,
        termination: { type: b.termination.type, seconds: b.termination.seconds || null, meters: b.termination.meters || null },
        target: b.target ? { rpe: b.target.rpe || null, pace: b.target.pace || null, power: b.target.power || null } : null,
        repeatIndex: repeatIndex,
        repeatTotal: repeatTotal,
        label: b.label || null
      });
    }
    raw.blocks.forEach(function (entry) {
      if (fout) return;
      if (entry && Array.isArray(entry.of)) {
        var repeat = isPosNum(entry.repeat) ? Math.round(entry.repeat) : 1;
        for (var i = 0; i < entry.of.length; i++) { var e = valideerBlock(entry.of[i]); if (e) { fout = e; return; } }
        for (var r = 0; r < repeat; r++) {
          entry.of.forEach(function (b) { pushBlock(b, r, repeat); });
        }
      } else {
        var e2 = valideerBlock(entry);
        if (e2) { fout = e2; return; }
        pushBlock(entry, 0, 1);
      }
    });
    if (fout) return { version: 1, sport: raw.sport || null, blocks: [], geldig: false, reden: fout };
    return { version: 1, sport: raw.sport || null, blocks: blocks, geldig: blocks.length > 0, reden: blocks.length > 0 ? null : 'geen geldige blocks na normalisatie' };
  }

  // --- interval_prescription.v1 --- totale, VOORSPELBARE duur in seconden. Uitsluitend
  // zinvol als ALLE blocks time-terminatie hebben; anders null (geen schijnprecisie
  // -- een distance/manual-block heeft per definitie geen vooraf bekende duur).
  function totalPlannedSeconds(prescription) {
    if (!prescription || !Array.isArray(prescription.blocks) || !prescription.blocks.length) return null;
    var som = 0;
    for (var i = 0; i < prescription.blocks.length; i++) {
      var b = prescription.blocks[i];
      if (b.termination.type !== 'time') return null;
      som += b.termination.seconds;
    }
    return som;
  }

  // --- interval_state.v1 --- geeft de huidige executiestatus terug op basis van de
  // blockindex (NIET verstreken tijd sinds start van de hele prescriptie -- de
  // aanroeper beheert zelf de klok/pauze-boekhouding, exact zoals de bestaande
  // trainingstimer dat al doet; deze functie is puur en kent geen wall-clock).
  function stateAt(prescription, blockIndex) {
    if (!prescription || !Array.isArray(prescription.blocks) || !prescription.blocks.length) {
      return { status: 'leeg', blockIndex: 0, block: null, isLaatsteBlock: true, voltooid: true };
    }
    var n = prescription.blocks.length;
    if (blockIndex >= n) {
      return { status: 'voltooid', blockIndex: n, block: null, isLaatsteBlock: true, voltooid: true };
    }
    var block = prescription.blocks[blockIndex];
    return {
      status: 'bezig',
      blockIndex: blockIndex,
      block: block,
      isLaatsteBlock: blockIndex === n - 1,
      voltooid: false,
      resterendeBlocks: n - blockIndex - 1
    };
  }

  // --- interval_state.v1 --- volgende blockindex. Puur, geen zij-effecten.
  function nextBlockIndex(blockIndex) { return blockIndex + 1; }

  var IntervalEngineCore = {
    BLOCK_TYPES: BLOCK_TYPES,
    TERMINATION_TYPES: TERMINATION_TYPES,
    normalizePrescription: normalizePrescription,
    totalPlannedSeconds: totalPlannedSeconds,
    stateAt: stateAt,
    nextBlockIndex: nextBlockIndex,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = IntervalEngineCore; }
  if (global) { global.IntervalEngineCore = IntervalEngineCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
