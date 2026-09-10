/* fBleHeartRate.test.js — DEVICES/WEARABLES MASTER SPRINT.
 * Test de parser tegen handmatig samengestelde, spec-conforme byte-vectoren
 * (Bluetooth SIG Heart Rate Measurement, 0x2A37) -- geen giswerk, elke
 * testvector is direct uit de officiële flags-layout afgeleid.
 */
'use strict';
const assert = require('assert');
const BleHeartRateCore = require('../core/bleHeartRate.js');

let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; } else { fail++; console.error('MISLUKT: ' + label); } }

console.log('DEVICES/WEARABLES MASTER SPRINT — BLE Heart Rate (0x2A37) parser');

function dv(bytes) {
  const buf = new ArrayBuffer(bytes.length);
  const view = new DataView(buf);
  bytes.forEach((b, i) => view.setUint8(i, b));
  return view;
}

// Flags=0x00 (UINT8, sensor contact not supported), HR=72
{
  const r = BleHeartRateCore.parseHeartRateMeasurement(dv([0x00, 72]));
  ok(r && r.bpm === 72 && r.sensorContact === 'not_supported', 'A1: 8-bit HR correct gedecodeerd, sensor-contact "not_supported" bij flags=0x00');
}

// Flags=0x01 (UINT16), HR=300 (0x012C, little-endian: 0x2C, 0x01)
{
  const r = BleHeartRateCore.parseHeartRateMeasurement(dv([0x01, 0x2C, 0x01]));
  ok(r && r.bpm === 300, 'A2: 16-bit HR (little-endian) correct gedecodeerd');
}

// Flags=0x06 (UINT8, contact bits=11 -> detected), HR=145
{
  const r = BleHeartRateCore.parseHeartRateMeasurement(dv([0x06, 145]));
  ok(r && r.bpm === 145 && r.sensorContact === 'detected', 'A3: sensor-contact "detected" correct uit flags-bits 1-2 gehaald');
}

// Flags=0x04 (UINT8, contact bits=10 -> not_detected), HR=80
{
  const r = BleHeartRateCore.parseHeartRateMeasurement(dv([0x04, 80]));
  ok(r && r.sensorContact === 'not_detected', 'A4: sensor-contact "not_detected" correct uit flags-bits 1-2 gehaald');
}

// Malformed: lege/te korte payload
ok(BleHeartRateCore.parseHeartRateMeasurement(dv([])) === null, 'B1: lege payload -> null, geen gegokte waarde');
ok(BleHeartRateCore.parseHeartRateMeasurement(dv([0x01])) === null, 'B2: 16-bit flag maar payload te kort voor 2 HR-bytes -> null');
ok(BleHeartRateCore.parseHeartRateMeasurement(null) === null, 'B3: null-input -> null (geen crash)');

// Plausibiliteitsgrens: 0 en >300 zijn geen geldige menselijke hartslag -- dit
// is een sanity-grens, GEEN medische claim (evidence-level E, technisch).
ok(BleHeartRateCore.parseHeartRateMeasurement(dv([0x00, 0])) === null, 'B4: HR=0 wordt geweigerd (geen malformed-waarde als geldige meting gepresenteerd)');
ok(BleHeartRateCore.parseHeartRateMeasurement(dv([0x01, 44, 2])) === null, 'B5: HR=300+ (0x022C=556) wordt geweigerd als implausibel');

// averageBpm: pure aggregatie, negeert non-finite/ongeldige samples
ok(BleHeartRateCore.averageBpm([120, 130, 140]) === 130, 'C1: gemiddelde correct berekend');
ok(BleHeartRateCore.averageBpm([120, null, 'x', 140]) === 130, 'C2: ongeldige samples worden genegeerd, niet als 0 meegeteld');
ok(BleHeartRateCore.averageBpm([]) === null, 'C3: lege reeks -> null, niet 0 (UNKNOWN != ZERO)');

// UUID's kloppen met de officiële 16-bit SIG-UUID's, uitgeschreven als volledige 128-bit BLE-UUID
ok(BleHeartRateCore.HEART_RATE_SERVICE_UUID === '0000180d-0000-1000-8000-00805f9b34fb', 'D1: Heart Rate Service UUID (0x180D) correct');
ok(BleHeartRateCore.HEART_RATE_MEASUREMENT_CHAR_UUID === '00002a37-0000-1000-8000-00805f9b34fb', 'D2: Heart Rate Measurement characteristic UUID (0x2A37) correct');

console.log('\n========================================================');
console.log('fBleHeartRate.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) process.exitCode = 1;
