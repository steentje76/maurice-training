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
  var CMD = { SETHORIZONTAL: 0x21, SETPROGRAM: 0x24,
    /* Publieke CSAFE short commands (PM5 CSAFE Communication Definition rev. 0.27,
       "Public Short Commands"): command-byte zonder byte count en zonder data. */
    GETSTATUS: 0x80,            // response: statusbyte (Table 9)
    GOINUSE: 0x85,              // Ready/Idle/HaveID -> In Use: geconfigureerde workout wordt actief
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
  /* Short command (MS-bit gezet, 0x80-0xFF): uitsluitend het command-byte (Figure 4). */
  function encodeShortCommand(command) {
    if (!isByte(command) || command < 0x80) throw new Error('csafe: geen short command');
    return [command];
  }
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
  /* Fixed-distance workout via het PUBLIEKE CSAFE-pad.
   *
   *   0x21 CSAFE_SETHORIZONTAL_CMD   byte count 3
   *        Byte 0: Horizontal Distance (LSB)      <- 2-byte LITTLE-endian
   *        Byte 1: Horizontal Distance (MSB)
   *        Byte 2: Units Specifier = 0x24 (CSAFE_DISTANCE_METER_0_0)
   *   0x24 CSAFE_SETPROGRAM_CMD      byte count 2
   *        Byte 0: WORKOUTNUMBER_PROGRAMMED (0x00)
   *        Byte 1: <don't care>
   *   0x85 CSAFE_GOINUSE_CMD         short command
   *
   * CORRECTIE (hardware-bewezen, RowErg PM5 430621526, 500 m): de vorige versie
   * gebruikte units 0x21 en noemde dat "meters". 0x21 is CSAFE_DISTANCE_KM_0_0:
   *   - Concept2 PM3/PM4 CSAFE-spec, gewerkte sample: "0x21 0x03 0x02 0x00 0x21
   *     (CSAFE_SETHORIZONTAL_CMD, 2 x Km units specifier)";
   *   - Concept2 SDK csafe.h: CSAFE_DISTANCE_KM_0_0 = 0x21, CSAFE_DISTANCE_METER_0_0 = 0x24;
   *   - onafhankelijk: PyRow (36 = meters), easy-erg (36), ErgometerJS en een PM5-emulator
   *     (DISTANCE_METER_0_0 = 0x24).
   * TK vroeg dus 500 KM aan. Daarnaast ontbrak GOINUSE: volgens rev. 0.27 ("Setting Up
   * and Performing Workout") wordt vanuit READY eerst geconfigureerd en daarna de PM naar
   * het workoutscherm (INUSE) gebracht; op de hardware bleef de state Ready (1).
   * RESET is bewust NIET toegevoegd (eerst hardwaretest zonder RESET).
   *
   * Bereik: Table 19 (PM5 Workout Configuration Parameter Limits),
   * horizontal distance goal 100 m t/m 50.000 m.
   *
   * Let op: dit is een ANDER bereik en een ANDERE byte-order dan
   * CSAFE_PM_SET_WORKOUTDURATION (32-bit big-endian, 100-999999 m). Dat commando
   * hoort bij het PM-proprietary pad en wordt hier bewust niet gebruikt. */
  var UNITS = { METERS: 0x24 };
  var WORKOUTNUMBER = { PROGRAMMED: 0x00 };
  /* Table 19: horizontal distance goal 100 m - 50.000 m. */
  var HORIZONTAL_MIN_M = 100, HORIZONTAL_MAX_M = 50000;
  function validateHorizontalDistance(v) {
    if (v == null) return 'distance_required';
    var n = Number(v);
    if (!isFinite(n)) return 'distance_not_finite';
    if (Math.round(n) !== n) return 'distance_not_integer';
    if (n < HORIZONTAL_MIN_M) return 'distance_below_minimum';
    if (n > HORIZONTAL_MAX_M) return 'distance_above_maximum';
    return null;
  }
  function buildFixedDistanceWorkout(distanceMeters, options) {
    options = options || {};
    var err = validateHorizontalDistance(distanceMeters);
    if (err) return { ok: false, error: err, requestedDistanceM: distanceMeters };
    var d = Math.round(distanceMeters);
    var cmds = []
      .concat(encodeCommand(CMD.SETHORIZONTAL, [d & 0xFF, (d >>> 8) & 0xFF, UNITS.METERS]))
      .concat(encodeCommand(CMD.SETPROGRAM, [WORKOUTNUMBER.PROGRAMMED, 0x00]))
      .concat(encodeShortCommand(CMD.GOINUSE));
    var frame = encodeStandardFrame(cmds);
    return {
      ok: true,
      requestedDistanceM: d,
      /* De PM kent zelf standaard-splits toe na SETHORIZONTAL (Concept2 PM3/PM4 spec),
         dus de read-back mag FIXEDDIST_NOSPLITS (2) of FIXEDDIST_SPLITS (3) zijn. Het
         type ALLEEN bewijst nooit iets: duration + duration type moeten ook kloppen. */
      workoutType: null,
      acceptedWorkoutTypes: [WORKOUT_TYPE.FIXEDDIST_NOSPLITS, WORKOUT_TYPE.FIXEDDIST_SPLITS],
      durationType: DURATION_TYPE.DISTANCE,
      unitsSpecifier: UNITS.METERS,
      commandSequence: ['CSAFE_SETHORIZONTAL_CMD', 'CSAFE_SETPROGRAM_CMD', 'CSAFE_GOINUSE_CMD'],
      frame: frame,
      hex: frame.map(function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('')
    };
  }

  /* Finite variable intervals, official PM CSAFE Definition (2026-03 PDF), pp50,77-79,93-96.
   * Pure encoding only. This does NOT assert an ACK, a readback or physical programming.
   * Each interval's commands stay in one frame; no frame exceeds the existing 120-byte limit.
   * Fixed-time interval type 6 is intentionally never used: it has no defined end. */
  function buildVariableIntervals(intervals) {
    function fail(error){ return {ok:false,error:error,frames:[]}; }
    if(!Array.isArray(intervals)||!intervals.length||intervals.length>50)return fail('interval_count_out_of_range');
    var groups=[],expected=[];
    for(var i=0;i<intervals.length;i++){
      var it=intervals[i];
      if(!it||[0,128].indexOf(it.durationType)<0)return fail('unsupported_duration_type');
      var d=it.duration,rest=it.restSeconds;
      if(typeof d!=='number'||!isFinite(d)||Math.floor(d)!==d)return fail('invalid_interval_duration');
      if((it.durationType===0&&(d<2000||d>35999900))||(it.durationType===128&&(d<100||d>999999)))return fail('interval_duration_out_of_range');
      if(typeof rest!=='number'||!isFinite(rest)||Math.floor(rest)!==rest||rest<0||rest>595)return fail('rest_out_of_range');
      var pace=it.targetPaceCentiseconds;
      if(pace!=null&&(typeof pace!=='number'||!isFinite(pace)||Math.floor(pace)!==pace||pace<=0||pace>4294967295))return fail('invalid_target_pace');
      var cmds=encodeCommand(0x18,[i]);
      if(i===0)cmds=cmds.concat(encodeCommand(CMD.PM_SET_WORKOUTTYPE,[8]));
      cmds=cmds.concat(encodeCommand(0x17,[it.durationType===0?0:1]),
        encodeCommand(CMD.PM_SET_WORKOUTDURATION,[it.durationType].concat(encodeDistanceBE32(d))),
        encodeCommand(0x04,[(rest>>>8)&255,rest&255]));
      if(pace!=null)cmds=cmds.concat(encodeCommand(0x06,encodeDistanceBE32(pace)));
      cmds=cmds.concat(encodeCommand(CMD.PM_CONFIGURE_WORKOUT,[1]));
      groups.push(cmds);
      expected.push({index:i,durationType:it.durationType,duration:d,restSeconds:rest,targetPaceCentiseconds:pace==null?null:pace});
    }
    groups.push(encodeCommand(0x13,[1,1])); // workout screen / prepare to row
    var frames=[],pending=[];
    for(var g=0;g<groups.length;g++){
      var candidate=pending.concat(groups[g]);
      try{encodeStandardFrame(encodeC2Wrapper(candidate));pending=candidate;}
      catch(e){
        if(!pending.length)return fail('interval_frame_too_large');
        frames.push(encodeStandardFrame(encodeC2Wrapper(pending)));
        pending=groups[g].slice();
        try{encodeStandardFrame(encodeC2Wrapper(pending));}catch(e2){return fail('interval_frame_too_large');}
      }
    }
    if(pending.length)frames.push(encodeStandardFrame(encodeC2Wrapper(pending)));
    return {ok:true,workoutType:8,finite:true,intervalCount:expected.length,expected:expected,frames:frames,
      verificationRequired:['all_frame_statuses','complete_interval_structure_readback'],physicallyVerified:false};
  }
  /* Pure, offline-only proposal: repack complete proprietary commands into
   * BLE-value-sized CSAFE frames. Rev. 1.30 documents <=20 bytes for CE060021.
   * Retains order and exact commands; does NOT claim the PM accepts commands
   * split across frames, nor imply that sending them is safe or verified.
   * No caller may write these frames until staged transfer/ACK/readback and
   * physical firmware behavior have been independently verified. */
  function planBleCharacteristicFrames(compiled) {
    var MAX_BLE_CONTROL_BYTES = 20;
    function fail(error) { return {ok:false,error:error,frames:[],deviceVerified:false}; }
    if(!compiled||compiled.ok!==true||!Array.isArray(compiled.frames)||!compiled.frames.length)
      return fail('compiled_frames_required');
    var commands=[];
    for(var k=0;k<compiled.frames.length;k++){
      var src=compiled.frames[k];
      if(!Array.isArray(src)||src.length<5||src[0]!==FLAG.STANDARD_START||src[src.length-1]!==FLAG.STOP)
        return fail('invalid_source_frame');
      var raw=unstuff(src.slice(1,-1));
      if(!raw||raw.length<4||checksum(raw.slice(0,-1))!==raw[raw.length-1])
        return fail('invalid_source_checksum');
      var contents=raw.slice(0,-1);
      if(contents[0]!==CMD.C2_PROPRIETARY_WRAPPER||contents[1]!==contents.length-2)
        return fail('invalid_proprietary_wrapper');
      for(var pos=2;pos<contents.length;){
        var start=pos,opcode=contents[pos++];
        if(opcode<0x80){
          if(pos>=contents.length)return fail('truncated_command');
          var count=contents[pos++];
          if(pos+count>contents.length)return fail('partial_command');
          pos+=count;
        }
        commands.push(contents.slice(start,pos));
      }
    }
    var frames=[],pending=[];
    for(var i=0;i<commands.length;i++){
      var candidate=pending.concat(commands[i]),frame;
      try{frame=encodeStandardFrame(encodeC2Wrapper(candidate));}catch(_e){frame=null;}
      if(frame&&frame.length<=MAX_BLE_CONTROL_BYTES){pending=candidate;continue;}
      if(pending.length)frames.push(encodeStandardFrame(encodeC2Wrapper(pending)));
      pending=commands[i].slice();
      try{frame=encodeStandardFrame(encodeC2Wrapper(pending));}catch(_e2){return fail('single_command_exceeds_ble_value_limit');}
      if(frame.length>MAX_BLE_CONTROL_BYTES)return fail('single_command_exceeds_ble_value_limit');
    }
    if(pending.length)frames.push(encodeStandardFrame(encodeC2Wrapper(pending)));
    return {ok:true,frames:frames,commandCount:commands.length,sourceFrameCount:compiled.frames.length,
      maxBleControlValueBytes:MAX_BLE_CONTROL_BYTES,deviceVerified:false,requiresSequentialAck:true,
      verificationRequired:['all_frame_statuses','complete_interval_structure_readback']};
  }

  /* Input is the EXISTING IntervalEngineCore.normalizePrescription result. No new repeat engine.
   * Recovery becomes the preceding PM5 interval's defined rest. Warmup/cooldown remain explicit
   * intervals, so they are neither lost nor silently treated as an unbounded warmup. */
  function compileFiniteIntervalPrescription(normalized){
    function fail(error){return {ok:false,error:error,frames:[]};}
    if(!normalized||normalized.geldig!==true||!Array.isArray(normalized.blocks)||!normalized.blocks.length||normalized.blocks.length>100)return fail('normalized_prescription_required');
    if(['rowing','rowerg','skierg','bikeerg'].indexOf(normalized.sport)<0)return fail('unsupported_machine_sport');
    var intervals=[],mapping=[],recoverySeen=false;
    for(var i=0;i<normalized.blocks.length;i++){
      var b=normalized.blocks[i],t=b&&b.termination;
      if(!b||['warmup','work','recovery','cooldown'].indexOf(b.type)<0||!t)return fail('invalid_block');
      if(b.target&&(b.target.pace!=null||b.target.power!=null))return fail('unsupported_device_target');
      if(b.type==='recovery'){
        if(!intervals.length||recoverySeen||t.type!=='time')return fail('unsupported_recovery_structure');
        if(typeof t.seconds!=='number'||!isFinite(t.seconds)||Math.floor(t.seconds)!==t.seconds||t.seconds<=0||t.seconds>595)return fail('rest_out_of_range');
        intervals[intervals.length-1].restSeconds=t.seconds;mapping[mapping.length-1].recoveryBlockIndex=i;recoverySeen=true;continue;
      }
      recoverySeen=false;var dtype,d;
      if(t.type==='time'){
        if(typeof t.seconds!=='number'||!isFinite(t.seconds)||Math.round(t.seconds*100)/100!==t.seconds)return fail('unsupported_time_precision');
        dtype=0;d=Math.round(t.seconds*100);
      }else if(t.type==='distance'){dtype=128;d=t.meters;}else return fail('unsupported_termination');
      intervals.push({durationType:dtype,duration:d,restSeconds:0});
      mapping.push({intervalIndex:intervals.length-1,blockIndex:i,blockType:b.type,recoveryBlockIndex:null,appTarget:b.target?{rpe:b.target.rpe||null,pace:b.target.pace||null,power:b.target.power||null}:null});
    }
    var result=buildVariableIntervals(intervals);if(!result.ok)return result;
    result.blockMapping=mapping;result.sport=normalized.sport;return result;
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

  /* GETSTATUS follow-up (FIX 4). Het statusbyte draagt "Previous Frame Status" (Table 9):
   * de uitkomst van het VORIGE frame. Parameterfouten worden bij SETPROGRAM gemeld als
   * "PrevReject" (rev. 0.27, Programmed Workout Parameter Limits). Het antwoord op dit
   * GETSTATUS-frame rapporteert dus de uitkomst van het programmeerframe. */
  function buildGetStatusFrame() {
    var frame = encodeStandardFrame(encodeShortCommand(CMD.GETSTATUS));
    return { ok: true, frame: frame, commandSequence: ['CSAFE_GETSTATUS_CMD'],
             hex: frame.map(function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('') };
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
    buildVariableIntervals:buildVariableIntervals, compileFiniteIntervalPrescription:compileFiniteIntervalPrescription,
    planBleCharacteristicFrames:planBleCharacteristicFrames,
    parseResponseFrame: parseResponseFrame, isProgrammingConfirmed: isProgrammingConfirmed,
    encodeShortCommand: encodeShortCommand, buildGetStatusFrame: buildGetStatusFrame,
    UNITS: UNITS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Concept2Csafe;
  else global.Concept2Csafe = Concept2Csafe;
})(typeof self !== 'undefined' ? self : this);
