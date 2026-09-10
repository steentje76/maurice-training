/* fBleCyclingPower.test.js — DEVICES/WEARABLES MASTER SPRINT.
 * Test tegen handmatig samengestelde, spec-conforme byte-vectoren
 * (Bluetooth SIG Cycling Power Measurement, 0x2A63) -- uitsluitend het
 * verplichte instantaneous-power-veld, geen giswerk op de optionele velden.
 */
'use strict';
const BleCyclingPowerCore = require('../core/bleCyclingPower.js');

let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; } else { fail++; console.error('MISLUKT: ' + label); } }

console.log('DEVICES/WEARABLES MASTER SPRINT — BLE Cycling Power (0x2A63) parser');

function dv(bytes) {
  const buf = new ArrayBuffer(bytes.length);
  const view = new DataView(buf);
  bytes.forEach((b, i) => view.setUint8(i, b));
  return view;
}
function i16le(n) { // helper: signed 16-bit little-endian byte-paar
  const buf = new ArrayBuffer(2); new DataView(buf).setInt16(0, n, true);
  return [...new Uint8Array(buf)];
}

// Flags=0x0000 (geen optionele velden), power=250W
{
  const bytes = [0x00, 0x00, ...i16le(250)];
  const r = BleCyclingPowerCore.parseCyclingPowerMeasurement(dv(bytes));
  ok(r && r.watts === 250, 'A1: instantaneous power correct gedecodeerd zonder optionele velden');
}

// Flags met extra bits gezet (optionele velden aanwezig, hier genegeerd) -- power blijft
// op vaste offset 2-3 ongeacht welke optionele flags verder gezet zijn.
{
  const bytes = [0xFF, 0x1F, ...i16le(180), 0x99, 0x99, 0x99, 0x99]; // extra bytes = genegeerde optionele velden
  const r = BleCyclingPowerCore.parseCyclingPowerMeasurement(dv(bytes));
  ok(r && r.watts === 180, 'A2: power blijft op vaste offset leesbaar, ongeacht welke optionele flags gezet zijn en welke extra bytes volgen');
}

// Negatief vermogen (fysiek zeldzaam maar toegestaan door het sint16-formaat, bv. bij
// terugtrappen/regeneratieve trainers) blijft binnen de plausibiliteitsgrens toegestaan.
{
  const bytes = [0x00, 0x00, ...i16le(-5)];
  const r = BleCyclingPowerCore.parseCyclingPowerMeasurement(dv(bytes));
  ok(r === null, 'A3: een licht negatieve waarde (-5W) wordt afgewezen door de >=0-grens (geen "vrijwiel"-semantiek geraden)');
}

// Malformed: te korte payload
ok(BleCyclingPowerCore.parseCyclingPowerMeasurement(dv([0x00, 0x00])) === null, 'B1: alleen flags, geen power-bytes -> null');
ok(BleCyclingPowerCore.parseCyclingPowerMeasurement(dv([])) === null, 'B2: lege payload -> null');
ok(BleCyclingPowerCore.parseCyclingPowerMeasurement(null) === null, 'B3: null-input -> null (geen crash)');

// Plausibiliteitsgrens: >3000W wordt geweigerd
{
  const bytes = [0x00, 0x00, ...i16le(3001)];
  ok(BleCyclingPowerCore.parseCyclingPowerMeasurement(dv(bytes)) === null, 'B4: implausibel hoog vermogen (3001W) wordt geweigerd');
}

// averageWatts: pure aggregatie
ok(BleCyclingPowerCore.averageWatts([200, 220, 210]) === 210, 'C1: gemiddelde correct berekend');
ok(BleCyclingPowerCore.averageWatts([]) === null, 'C2: lege reeks -> null, niet 0');

// UUID's
ok(BleCyclingPowerCore.CYCLING_POWER_SERVICE_UUID === '00001818-0000-1000-8000-00805f9b34fb', 'D1: Cycling Power Service UUID (0x1818) correct');
ok(BleCyclingPowerCore.CYCLING_POWER_MEASUREMENT_CHAR_UUID === '00002a63-0000-1000-8000-00805f9b34fb', 'D2: Cycling Power Measurement characteristic UUID (0x2A63) correct');

console.log('\n========================================================');
console.log('fBleCyclingPower.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) process.exitCode = 1;
