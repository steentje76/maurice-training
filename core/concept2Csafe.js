/* ============================================================================
 * Concept2 PM5 — CSAFE protocol core (Gate B)
 *
 * BRON (source of truth): Concept2 PM CSAFE Communication Definition, rev. 0.31.
 * Alle constanten hieronder zijn rechtstreeks uit die specificatie geverifieerd;
 * niets is afgeleid uit ErgData of uit eerdere samenvattingen.
 *
 * Deze laag is PUUR en deterministisch: geen BLE, geen UI, geen Calculation
 * Engine, geen tijd- of toevalsafhankelijkheid. De BLE-integratie (CE060021 write
 * en CE060022 response) leeft bewust buiten dit bestand.
 *
 * NOT_YET_PHYSICALLY_VERIFIED: geen enkele claim hier is op echte hardware getoetst.
 * ==========================================================================*/
(function (global) {
  'use strict';
  var VERSION = 'concept2_csafe.v1';

  // ── FRAMING (rev. 0.31, Figure 1 - Standard Frame Format) ──────────────────
  var FLAG = {
    EXTENDED_START: 0xF0,
    STANDARD_START: 0xF1,
    STOP: 0xF2,
    STUFF: 0xF3
  };
  // Byte stuffing: de vier vlaggen mogen niet in de frame contents of de checksum
  // voorkomen. rev. 0.31 definieert de vervanging als F3 gevolgd door 00..03.
  var STUFF_MAP = {};
  STUFF_MAP[FLAG.EXTENDED_START] = 0x00;
  STUFF_MAP[FLAG.STANDARD_START] = 0x01;
  STUFF_MAP[FLAG.STOP] = 0x02;
  STUFF_MAP[FLAG.STUFF] = 0x03;
  // Fysieke-linkbeperking van de PM: maximale framegrootte inclusief vlaggen,
  // checksum en stuffing.
  var MAX_FRAME_BYTES = 120;

  // ── COMMANDO'S (rev. 0.31, Table 11/12 + PM Set Configuration Commands) ────
  var CMD = {
    SETUSERCFG1: 0x1A,          // publieke CSAFE-wrapper voor PM-specifieke commando's
    C2_PROPRIETARY_WRAPPER: 0x76,
    PM_SET_WORKOUTTYPE: 0x01,   // Byte 0: Workout Type
    PM_SET_WORKOUTDURATION: 0x03, // Byte 0: duration type, Byte 1..4: duration MSB..LSB
    PM_CONFIGURE_WORKOUT: 0x14  // Byte 0: Programming mode (0 = Disable, 1 = Enable)
  };
  // Workout duration type (rev. 0.31; identiek aan BTS Interface Definition Appendix A)
  var DURATION_TYPE = { TIME: 0x00, CALORIES: 0x40, WATT_MIN: 0x60, DISTANCE: 0x80 };
  // Workout type enum (BTS Interface Definition rev. 1.30, Appendix A)
  var WORKOUT_TYPE = { FIXEDDIST_NOSPLITS: 2, FIXEDDIST_SPLITS: 3 };
  var CONFIGURE_WORKOUT_MODE = { DISABLE: 0, ENABLE: 1 };

  // Geverifieerd bereik voor CSAFE_PM_SET_WORKOUTDURATION, fixed distance duration.
  // LET OP: CSAFE_PM_SET_SPLITDURATION kent een ANDER bereik (100-60000 m) en mag
  // hier niet mee verward worden.
  var DISTANCE_MIN_M = 100;
  var DISTANCE_MAX_M = 999999;

  // ── RESPONSE STATUS (rev. 0.31, Table 9 - Response Status Byte Bit-Mapping) ─
  var STATUS_MASK = { FRAME_TOGGLE: 0x80, PREVIOUS_FRAME: 0x30, STATE_MACHINE: 0x0F };
  var PREVIOUS_FRAME_STATUS = { OK: 0x00, REJECT: 0x10, BAD: 0x20, NOT_READY: 0x30 };
  var PREVIOUS_FRAME_LABEL = { 0x00: 'ok', 0x10: 'reject', 0x20: 'bad', 0x30: 'not_ready' };
  var STATE_MACHINE_LABEL = {
    0x00: 'error', 0x01: 'ready', 0x02: 'idle', 0x03: 'have_id',
    0x05: 'in_use', 0x06: 'pause', 0x07: 'finish', 0x08: 'manual', 0x09: 'off_line'
  };

  function isByte(v) { return typeof v === 'number' && isFinite(v) && v >= 0 && v <= 255 && Math.floor(v) === v; }

  /* Checksum: XOR over de frame contents. Geverifieerd tegen de officiele vector
   * F1 76 07 01 01 01 13 02 01 01 61 F2 -> XOR(76 07 01 01 01 13 02 01 01) = 0x61. */
  function checksum(contents) {
    var c = 0;
    for (var i = 0; i < contents.length; i++) c ^= (contents[i] & 0xFF);
    return c & 0xFF;
  }

  /* Byte stuffing over contents + checksum (niet over de start/stop-vlaggen zelf). */
  function stuff(bytes) {
    var out = [];
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i] & 0xFF;
      if (Object.prototype.hasOwnProperty.call(STUFF_MAP, b)) { out.push(FLAG.STUFF); out.push(STUFF_MAP[b]); }
      else out.push(b);
    }
    return out;
  }
  function unstuff(bytes) {
    var out = [], i = 0;
    while (i < bytes.length) {
      var b = bytes[i] & 0xFF;
      if (b === FLAG.STUFF) {
        if (i + 1 >= bytes.length) return null; // afgekapte stuffing-sequentie
        var v = bytes[i + 1] & 0xFF;
        if (v === 0x00) out.push(FLAG.EXTENDED_START);
        else if (v === 0x01) out.push(FLAG.STANDARD_START);
        else if (v === 0x02) out.push(FLAG.STOP);
        else if (v === 0x03) out.push(FLAG.STUFF);
        else return null; // ongeldige stuffing-waarde
        i += 2;
      } else { out.push(b); i += 1; }
    }
    return out;
  }

  /* Eén CSAFE-commando: [command, byteCount, ...data] */
  function encodeCommand(command, data) {
    data = data || [];
    if (!isByte(command)) throw new Error('csafe: ongeldig command-byte');
    if (data.length > 255) throw new Error('csafe: commando-data te lang');
    for (var i = 0; i < data.length; i++) if (!isByte(data[i])) throw new Error('csafe: ongeldig data-byte');
    return [command, data.length].concat(data);
  }

  /* C2 proprietary wrapper: [0x76, wrapperByteCount, ...commandos] */
  function encodeC2Wrapper(commandBytes) {
    if (commandBytes.length > 255) throw new Error('csafe: wrapper-inhoud te lang');
    return [CMD.C2_PROPRIETARY_WRAPPER, commandBytes.length].concat(commandBytes);
  }

  /* Standard frame: F1 <contents> <checksum> F2, met stuffing over contents+checksum. */
  function encodeStandardFrame(contents) {
    var body = stuff(contents.concat([checksum(contents)]));
    var frame = [FLAG.STANDARD_START].concat(body, [FLAG.STOP]);
    if (frame.length > MAX_FRAME_BYTES) {
      throw new Error('csafe: frame van ' + frame.length + ' bytes overschrijdt de limiet van ' + MAX_FRAME_BYTES);
    }
    return frame;
  }

  /* 32-bit distance, BIG-ENDIAN: Byte 1 = MSB ... Byte 4 = LSB (rev. 0.31). */
  function encodeDistanceBE32(meters) {
    return [(meters >>> 24) & 0xFF, (meters >>> 16) & 0xFF, (meters >>> 8) & 0xFF, meters & 0xFF];
  }

  function validateDistance(meters) {
    if (meters === null || meters === undefined) return 'distance_required';
    if (typeof meters !== 'number' || !isFinite(meters)) return 'distance_not_finite';
    if (Math.floor(meters) !== meters) return 'distance_not_integer';
    if (meters < DISTANCE_MIN_M) return 'distance_below_minimum';
    if (meters > DISTANCE_MAX_M) return 'distance_above_maximum';
    return null;
  }

  /* Generieke fixed-distance workout. 1000 m is nergens een uitzondering. */
  function buildFixedDistanceWorkout(distanceMeters, options) {
    options = options || {};
    var err = validateDistance(distanceMeters);
    if (err) return { ok: false, error: err, requestedDistanceM: distanceMeters };
    var workoutType = options.splits ? WORKOUT_TYPE.FIXEDDIST_SPLITS : WORKOUT_TYPE.FIXEDDIST_NOSPLITS;
    var cmds = []
      .concat(encodeCommand(CMD.PM_SET_WORKOUTTYPE, [workoutType]))
      .concat(encodeCommand(CMD.PM_SET_WORKOUTDURATION,
        [DURATION_TYPE.DISTANCE].concat(encodeDistanceBE32(distanceMeters))))
      .concat(encodeCommand(CMD.PM_CONFIGURE_WORKOUT, [CONFIGURE_WORKOUT_MODE.ENABLE]));
    var frame = encodeStandardFrame(encodeC2Wrapper(cmds));
    return {
      ok: true,
      requestedDistanceM: distanceMeters,
      workoutType: workoutType,
      durationType: DURATION_TYPE.DISTANCE,
      frame: frame,
      hex: frame.map(function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('')
    };
  }

  /* Response-parser. CONFIRMED-semantiek volgt Table 9: het statusbyte draagt
   * Previous Frame Status in bitmask 0x30, waarbij 0x00 = Ok. Reject/Bad/Not ready
   * bevestigen NIET. Frame-level ACK/NAK bestaat niet in dit protocol. */
  function parseResponseFrame(bytes) {
    if (!bytes || !bytes.length) return { ok: false, error: 'empty' };
    var arr = [];
    for (var i = 0; i < bytes.length; i++) arr.push(bytes[i] & 0xFF);
    if (arr[0] !== FLAG.STANDARD_START) return { ok: false, error: 'no_start_flag' };
    if (arr[arr.length - 1] !== FLAG.STOP) return { ok: false, error: 'no_stop_flag' };
    var body = unstuff(arr.slice(1, arr.length - 1));
    if (!body) return { ok: false, error: 'bad_stuffing' };
    if (body.length < 2) return { ok: false, error: 'truncated' };
    var contents = body.slice(0, body.length - 1);
    var given = body[body.length - 1];
    if (checksum(contents) !== given) return { ok: false, error: 'bad_checksum' };
    var status = contents[0];
    var prev = status & STATUS_MASK.PREVIOUS_FRAME;
    return {
      ok: true,
      status: status,
      previousFrameStatus: prev,
      previousFrameLabel: PREVIOUS_FRAME_LABEL[prev] || 'unknown',
      stateMachineState: status & STATUS_MASK.STATE_MACHINE,
      stateMachineLabel: STATE_MACHINE_LABEL[status & STATUS_MASK.STATE_MACHINE] || 'unknown',
      frameToggle: (status & STATUS_MASK.FRAME_TOGGLE) ? 1 : 0,
      contents: contents
    };
  }

  /* Alleen Previous Frame Status = Ok bevestigt acceptatie van het vorige frame. */
  function isProgrammingConfirmed(parsed) {
    return !!(parsed && parsed.ok === true && parsed.previousFrameStatus === PREVIOUS_FRAME_STATUS.OK);
  }

  var Concept2Csafe = {
    VERSION: VERSION,
    FLAG: FLAG, MAX_FRAME_BYTES: MAX_FRAME_BYTES, CMD: CMD,
    DURATION_TYPE: DURATION_TYPE, WORKOUT_TYPE: WORKOUT_TYPE,
    CONFIGURE_WORKOUT_MODE: CONFIGURE_WORKOUT_MODE,
    DISTANCE_MIN_M: DISTANCE_MIN_M, DISTANCE_MAX_M: DISTANCE_MAX_M,
    STATUS_MASK: STATUS_MASK, PREVIOUS_FRAME_STATUS: PREVIOUS_FRAME_STATUS,
    checksum: checksum, stuff: stuff, unstuff: unstuff,
    encodeCommand: encodeCommand, encodeC2Wrapper: encodeC2Wrapper,
    encodeStandardFrame: encodeStandardFrame, encodeDistanceBE32: encodeDistanceBE32,
    validateDistance: validateDistance, buildFixedDistanceWorkout: buildFixedDistanceWorkout,
    parseResponseFrame: parseResponseFrame, isProgrammingConfirmed: isProgrammingConfirmed
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Concept2Csafe;
  else global.Concept2Csafe = Concept2Csafe;
})(typeof self !== 'undefined' ? self : this);
