/* fBleCyclingSpeedCadence.test.js — DEVICES/WEARABLES MASTER SPRINT.
 * Test parser + calculation tegen handmatig afgeleide, spec-conforme
 * testvectoren, inclusief 16-bit rollover (event time elke 64s, revolutions
 * elke 65536 omwentelingen) -- expliciet vereist door sectie 9 van de
 * opdracht ("units/wrap behavior").
 */
'use strict';
const BleCscCore = require('../core/bleCyclingSpeedCadence.js');

let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; } else { fail++; console.error('MISLUKT: ' + label); } }

console.log('DEVICES/WEARABLES MASTER SPRINT — BLE CSC (0x2A5B) parser + cadans-calculation');

function dv(bytes) {
  const buf = new ArrayBuffer(bytes.length);
  const view = new DataView(buf);
  bytes.forEach((b, i) => view.setUint8(i, b));
  return view;
}
function u16le(n) { const b = new ArrayBuffer(2); new DataView(b).setUint16(0, n, true); return [...new Uint8Array(b)]; }
function u32le(n) { const b = new ArrayBuffer(4); new DataView(b).setUint32(0, n, true); return [...new Uint8Array(b)]; }

// ---- A. Parser: alleen wiel-data (flags bit0=1, bit1=0) ----
{
  const bytes = [0x01, ...u32le(123456), ...u16le(5000)];
  const r = BleCscCore.parseCscMeasurement(dv(bytes));
  ok(r && r.wheelRevolutions === 123456 && r.wheelEventTime === 5000 && r.crankRevolutions === null,
    'A1: alleen wiel-data correct gedecodeerd, crank-velden blijven null (niet aanwezig in deze notificatie)');
}

// ---- B. Parser: alleen crank-data (flags bit0=0, bit1=1) ----
{
  const bytes = [0x02, ...u16le(300), ...u16le(1024)];
  const r = BleCscCore.parseCscMeasurement(dv(bytes));
  ok(r && r.crankRevolutions === 300 && r.crankEventTime === 1024 && r.wheelRevolutions === null,
    'B1: alleen crank-data correct gedecodeerd op de juiste offset (direct na flags, geen wiel-velden ervoor)');
}

// ---- C. Parser: beide aanwezig (flags=0x03) -- crank-velden NA wiel-velden ----
{
  const bytes = [0x03, ...u32le(100), ...u16le(200), ...u16le(50), ...u16le(300)];
  const r = BleCscCore.parseCscMeasurement(dv(bytes));
  ok(r && r.wheelRevolutions === 100 && r.wheelEventTime === 200 && r.crankRevolutions === 50 && r.crankEventTime === 300,
    'C1: bij beide flags gezet staan de crank-velden op de juiste offset ná de 6 wiel-bytes');
}

// ---- D. Parser: malformed ----
ok(BleCscCore.parseCscMeasurement(dv([0x00])) === null, 'D1: flags=0x00 (geen enkel type data) -> null');
ok(BleCscCore.parseCscMeasurement(dv([])) === null, 'D2: lege payload -> null');
ok(BleCscCore.parseCscMeasurement(dv([0x02, 0x01])) === null, 'D3: crank-bit gezet maar te weinig bytes -> null, geen halve/gegokte waarde');
ok(BleCscCore.parseCscMeasurement(null) === null, 'D4: null-input -> null (geen crash)');

// ---- E. Cadans-calculation: eerste meting (geen vorige) ----
{
  const r = BleCscCore.deriveCadenceRpm(null, { crankRevolutions: 10, crankEventTime: 1024 });
  ok(r.status === 'INSUFFICIENT_INPUT', 'E1: geen vorige meting -> INSUFFICIENT_INPUT (eerste notificatie na koppelen levert nog geen cadans)');
}

// ---- F. Cadans-calculation: normale berekening, geen rollover ----
{
  // 10 omwentelingen in 1024 ticks = 1 seconde -> 10 omw/s = 600 rpm... te hoog,
  // gebruik realistischer: 1 omwenteling per 1024 ticks (1s) = 60 rpm.
  const prev = { crankRevolutions: 100, crankEventTime: 0 };
  const curr = { crankRevolutions: 101, crankEventTime: 1024 };
  const r = BleCscCore.deriveCadenceRpm(prev, curr);
  ok(r.status === 'OK' && r.cadenceRpm === 60, 'F1: 1 omwenteling per seconde = 60 rpm, correct berekend zonder rollover');
}

// ---- G. Cadans-calculation: event-tijd-rollover (elke 64s, UINT16) ----
{
  // prev vlak vóór de rollover, curr vlak erna: tijd "lijkt" terug te lopen,
  // moet correct als een kleine positieve delta worden behandeld. Realistisch
  // getal: 1 omwenteling in ~0,667s (~90 rpm) = 683 ticks (1/1024s-eenheid).
  const prev = { crankRevolutions: 500, crankEventTime: 65500 };
  const curr = { crankRevolutions: 501, crankEventTime: 647 }; // 647 + (65536-65500) = 683 ticks verstreken
  const r = BleCscCore.deriveCadenceRpm(prev, curr);
  ok(r.status === 'OK' && r.deltaRevolutions === 1, 'G1: event-tijd-rollover correct herkend (curr < prev betekent NIET een negatieve/ongeldige delta)');
  ok(r.status === 'OK' && r.cadenceRpm > 0 && r.cadenceRpm < 300, 'G2: cadans na rollover-correctie valt binnen een plausibel bereik (geen absurde waarde door een ongecorrigeerde negatieve delta) -- berekend: ' + r.cadenceRpm + ' rpm');
}

// ---- H. Cadans-calculation: omwentelingen-rollover (UINT16, 65536) ----
{
  // 11 omwentelingen bij een realistische ~90 rpm duurt 11/1,5 ≈ 7,33s = 7509 ticks.
  const prev = { crankRevolutions: 65530, crankEventTime: 0 };
  const curr = { crankRevolutions: 5, crankEventTime: 7509 }; // 5 + (65536-65530) = 11 omwentelingen
  const r = BleCscCore.deriveCadenceRpm(prev, curr);
  ok(r.status === 'OK' && r.deltaRevolutions === 11, 'H1: omwentelingen-rollover correct herkend (curr < prev betekent NIET minder getrapt, maar een 16-bit wrap) -- status: ' + r.status);
}

// ---- I. Geen nieuw event (zelfde event-tijd) -- geen deling door nul ----
{
  const prev = { crankRevolutions: 100, crankEventTime: 500 };
  const curr = { crankRevolutions: 100, crankEventTime: 500 };
  const r = BleCscCore.deriveCadenceRpm(prev, curr);
  ok(r.status === 'NO_NEW_EVENT', 'I1: identieke event-tijd -> NO_NEW_EVENT, geen deling door nul, geen fake 0-cadans');
}

// ---- J. Ontbrekende crank-data in een van beide metingen ----
{
  const r = BleCscCore.deriveCadenceRpm({ crankRevolutions: null, crankEventTime: null }, { crankRevolutions: 10, crankEventTime: 100 });
  ok(r.status === 'INSUFFICIENT_INPUT', 'J1: device zonder crank-data (bv. alleen wiel-sensor) -> INSUFFICIENT_INPUT, geen gegokte cadans');
}

// ---- K. Calculation Registry-governance ----
{
  const entry = BleCscCore.CALCULATION_REGISTRY[0];
  ok(entry.allowed_decision_use === false, 'K1: allowed_decision_use=false -- geen automatische trainingsregel op cadans alleen');
  ok(entry.evidence_level === 'A', 'K2: Evidence Level A -- directe, deterministische afleiding uit officieel gespecificeerde protocoldata (geen schatting)');
  ok(entry.limitations.some(l => /snelheid/i.test(l) && /wielomtrek/i.test(l)), 'K3: de registry-entry documenteert expliciet waarom snelheid niet wordt afgeleid');
}

// ---- L. UUID's ----
ok(BleCscCore.CSC_SERVICE_UUID === '00001816-0000-1000-8000-00805f9b34fb', 'L1: CSC Service UUID (0x1816) correct');
ok(BleCscCore.CSC_MEASUREMENT_CHAR_UUID === '00002a5b-0000-1000-8000-00805f9b34fb', 'L2: CSC Measurement characteristic UUID (0x2A5B) correct');

console.log('\n========================================================');
console.log('fBleCyclingSpeedCadence.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) process.exitCode = 1;
