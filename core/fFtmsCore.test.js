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

console.log('\n========================================================');
console.log('fFtmsCore.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) process.exitCode = 1;
