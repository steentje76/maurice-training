/* fFtmsCore.test.js — DEVICES/WEARABLES MASTER SPRINT.
 * Bewaakt: FTMS-UUID's kloppen met de dubbel-gecorroboreerde bron, elke
 * Data-characteristic start als UNKNOWN (geen gefabriceerde meting vóór een
 * decoder expliciet bevestigd is), Control Point wordt nergens gebruikt.
 */
'use strict';
const FtmsCore = require('../core/ftmsCore.js');

let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; } else { fail++; console.error('MISLUKT: ' + label); } }

console.log('DEVICES/WEARABLES MASTER SPRINT — FTMS core (service discovery, UNKNOWN-decoder-precedent)');

// ---- A. Bevestigde UUID's (twee onafhankelijke bronnen, identiek) ----
ok(FtmsCore.FTMS_SERVICE_UUID === '00001826-0000-1000-8000-00805f9b34fb', 'A1: FTMS Service UUID (0x1826) correct');
ok(FtmsCore.MACHINE_DATA_CHARACTERISTICS.indoorBike.uuid === '00002ad2-0000-1000-8000-00805f9b34fb', 'A2: Indoor Bike Data UUID (0x2AD2) correct');
ok(FtmsCore.MACHINE_DATA_CHARACTERISTICS.treadmill.uuid === '00002acd-0000-1000-8000-00805f9b34fb', 'A3: Treadmill Data UUID (0x2ACD) correct');
ok(FtmsCore.MACHINE_DATA_CHARACTERISTICS.rower.uuid === '00002ad1-0000-1000-8000-00805f9b34fb', 'A4: Rower Data UUID (0x2AD1) correct');
ok(FtmsCore.MACHINE_DATA_CHARACTERISTICS.crossTrainer.uuid === '00002ace-0000-1000-8000-00805f9b34fb', 'A5: Cross Trainer Data UUID (0x2ACE) correct');
ok(FtmsCore.MACHINE_DATA_CHARACTERISTICS.stepClimber.uuid === '00002acf-0000-1000-8000-00805f9b34fb', 'A6: Step Climber Data UUID (0x2ACF) correct');
ok(FtmsCore.MACHINE_DATA_CHARACTERISTICS.stairClimber.uuid === '00002ad0-0000-1000-8000-00805f9b34fb', 'A7: Stair Climber Data UUID (0x2AD0) correct');

// ---- B. machineTypeForCharacteristic ----
{
  const r = FtmsCore.machineTypeForCharacteristic('00002ad2-0000-1000-8000-00805f9b34fb');
  ok(r && r.key === 'indoorBike' && r.label === 'Indoor bike', 'B1: correcte machinetype-herkenning uit een bevestigde UUID');
}
ok(FtmsCore.machineTypeForCharacteristic('0000ffff-0000-1000-8000-00805f9b34fb') === null, 'B2: een onbekende UUID levert null op, geen gegokt "dichtstbijzijnd" type');

// ---- C. UNKNOWN/CONFIRMED decoder-registry (Concept2-precedent) ----
{
  const registry = FtmsCore.createDecoderRegistry();
  const status = registry.status();
  ok(status['00002ad2-0000-1000-8000-00805f9b34fb'] === 'UNKNOWN', 'C1: Indoor Bike Data start als UNKNOWN -- geen decoder vooraf aangenomen');
  ok(status['00002acd-0000-1000-8000-00805f9b34fb'] === 'UNKNOWN', 'C2: Treadmill Data start als UNKNOWN');
  ok(Object.keys(status).length === 6, 'C3: alle zes bevestigde machinetype-characteristics zijn geregistreerd (geen ontbrekende, geen extra)');
}

// ---- D. decode() geeft NOOIT een waarde terug voor een UNKNOWN characteristic ----
{
  const registry = FtmsCore.createDecoderRegistry();
  const fakeDv = { byteLength: 4, getUint8: () => 0, getUint16: () => 100 };
  const result = registry.decode('00002ad2-0000-1000-8000-00805f9b34fb', fakeDv);
  ok(result === null, 'D1: decode() op een UNKNOWN characteristic retourneert null, nooit een gefabriceerde waarde uit de ruwe bytes');
}

// ---- E. Een later geregistreerde, bevestigde decoder werkt wel (extensiepunt voor na spec-toegang) ----
{
  const registry = FtmsCore.createDecoderRegistry();
  registry.registerDecoder('00002ad2-0000-1000-8000-00805f9b34fb', function (dv) { return { test: true }; }, 'CONFIRMED');
  const result = registry.decode('00002ad2-0000-1000-8000-00805f9b34fb', {});
  ok(result && result.test === true, 'E1: na expliciete registerDecoder() werkt decode() -- het extensiepunt voor zodra de officiele spec/een echte capture beschikbaar is, functioneert correct');
  ok(registry.status()['00002ad2-0000-1000-8000-00805f9b34fb'] === 'CONFIRMED', 'E2: status() toont CONFIRMED na registratie');
}

// ---- F. Control Point wordt uitsluitend gedocumenteerd, nooit als bruikbare decoder-target ----
{
  const registry = FtmsCore.createDecoderRegistry();
  ok(registry.status()[FtmsCore.OTHER_CHARACTERISTICS.controlPoint] === undefined,
    'F1: Control Point zit niet in de decoder-registry (sectie 13: control blijft uitdrukkelijk buiten scope, alleen UUID gedocumenteerd)');
}

// ---- G. parseIndoorBikeData: officieel bevestigde byte-layout (correctie -- volledige spec beschikbaar) ----
function dv(bytes) {
  const buf = new ArrayBuffer(bytes.length);
  const view = new DataView(buf);
  bytes.forEach((b, i) => view.setUint8(i, b));
  return view;
}
function u16le(n) { const b = new ArrayBuffer(2); new DataView(b).setUint16(0, n, true); return [...new Uint8Array(b)]; }
function i16le(n) { const b = new ArrayBuffer(2); new DataView(b).setInt16(0, n, true); return [...new Uint8Array(b)]; }

{
  // flags=0x0000 (bit0=0 -> Instantaneous Speed aanwezig), speed=25.50 km/h (2550 * 0.01)
  const bytes = [...u16le(0x0000), ...u16le(2550)];
  const r = FtmsCore.parseIndoorBikeData(dv(bytes));
  ok(r && r.instantaneousSpeedKmh === 25.5, 'G1: bit0=0 betekent Instantaneous Speed IS aanwezig (omgekeerde logica) en wordt correct met resolutie 0.01 gedecodeerd');
  ok(r.averageSpeedKmh === null, 'G2: Average Speed blijft null als bit1 niet gezet is (UNKNOWN, geen 0)');
}
{
  // flags met bit0=1 (Instantaneous Speed AFWEZIG) + bit2 (Instantaneous Cadence aanwezig, 90.0 rpm = 180*0.5)
  const bytes = [...u16le(0x0005), ...u16le(180)]; // 0x0005 = bit0 | bit2
  const r = FtmsCore.parseIndoorBikeData(dv(bytes));
  ok(r && r.instantaneousSpeedKmh === null, 'G3: bit0=1 betekent Instantaneous Speed juist AFWEZIG is');
  ok(r.instantaneousCadenceRpm === 90, 'G4: Instantaneous Cadence correct gedecodeerd met resolutie 0.5 op de juiste offset (direct na de 2-byte flags, want speed is afwezig)');
}
{
  // Instantaneous Power (bit6), negatieve waarde toegestaan (sint16)
  const bytes = [...u16le(0x0041), ...i16le(-15)]; // 0x0041 = bit0 (speed afwezig) | bit6 (power aanwezig)
  const r = FtmsCore.parseIndoorBikeData(dv(bytes));
  ok(r && r.instantaneousPowerW === -15, 'G5: Instantaneous Power is signed (sint16) en correct gedecodeerd, ook bij een negatieve waarde (bv. vrijwielen)');
}
{
  // Total Distance (uint24, bit4) -- 3-byte veld
  const bytes = [...u16le(0x0011), 0x10, 0x27, 0x00]; // 0x0011 = bit0|bit4; 0x002710 = 10000
  const r = FtmsCore.parseIndoorBikeData(dv(bytes));
  ok(r && r.totalDistanceM === 10000, 'G6: Total Distance (uint24, 3 bytes) correct gedecodeerd');
}
ok(FtmsCore.parseIndoorBikeData(dv([0x00])) === null, 'G7: te korte payload (alleen 1 flags-byte i.p.v. 2) -> null');
{
  // flag zet Resistance Level (bit5) maar payload is afgekapt -- offset moet correct doorschuiven en dan falen, geen halve waarde
  const bytes = [...u16le(0x0021)]; // bit0|bit5, maar geen databytes voor resistance
  ok(FtmsCore.parseIndoorBikeData(dv(bytes)) === null, 'G8: een aangekondigd maar afgekapt veld (Resistance Level) geeft null, geen gegokte/halve waarde');
}
ok(FtmsCore.parseIndoorBikeData(null) === null, 'G9: null-input -> null (geen crash)');

// ---- H. parseRowerData: officieel bevestigde byte-layout ----
{
  // flags=0x0000 (bit0=0 -> Stroke Rate + Stroke Count aanwezig): rate=30.0/min (60*0.5), count=142
  const bytes = [...u16le(0x0000), 60, ...u16le(142)];
  const r = FtmsCore.parseRowerData(dv(bytes));
  ok(r && r.strokeRatePerMin === 30 && r.strokeCount === 142, 'H1: bit0=0 betekent Stroke Rate + Stroke Count AANWEZIG (omgekeerde logica), correct gedecodeerd met resolutie 0.5 op Stroke Rate');
}
{
  // bit0=1 (stroke rate/count afwezig) + bit3 (Instantaneous Pace aanwezig) = 120 sec/500m
  const bytes = [...u16le(0x0009), ...u16le(120)]; // 0x0009 = bit0 | bit3
  const r = FtmsCore.parseRowerData(dv(bytes));
  ok(r && r.strokeRatePerMin === null && r.strokeCount === null, 'H2: bit0=1 betekent Stroke Rate/Count juist AFWEZIG');
  ok(r.instantaneousPaceSecPer500m === 120, 'H3: Instantaneous Pace correct gedecodeerd op de juiste offset');
}
{
  // Total Distance (bit2, uint24) na bit0=1 (geen stroke rate/count ervoor)
  const bytes = [...u16le(0x0005), 0xE8, 0x03, 0x00]; // 0x0005 = bit0|bit2; 0x0003E8 = 1000
  const r = FtmsCore.parseRowerData(dv(bytes));
  ok(r && r.totalDistanceM === 1000, 'H4: Total Distance (uint24) correct gedecodeerd op de juiste offset');
}
ok(FtmsCore.parseRowerData(dv([0x00])) === null, 'H5: te korte payload -> null');
ok(FtmsCore.parseRowerData(null) === null, 'H6: null-input -> null (geen crash)');

console.log('\n========================================================');
console.log('fFtmsCore.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) process.exitCode = 1;
