/* fFtmsIntegration.test.js — DEVICES/WEARABLES MASTER SPRINT.
 * Bewaakt: de widget toont NOOIT een gefabriceerd cijfer (decode blijft
 * UNKNOWN), geen invloed op de cycling-execution-state, hergebruik van
 * dezelfde generieke BLE-gateway (vijfde en laatste transport), Control
 * Point wordt nergens client-side aangeroepen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const nativeTransport = fs.readFileSync(path.join(ROOT, 'native/src/nativeFtmsBleTransport.js'), 'utf8');
const nativeTransportCode = nativeTransport.replace(/\/\*[\s\S]*?\*\//g, '');
const bootstrap = fs.readFileSync(path.join(ROOT, 'native/src/bootstrap.js'), 'utf8');

console.log('DEVICES/WEARABLES MASTER SPRINT — FTMS widget-integratie');

// ---- A. Nooit een gefabriceerd cijfer: de widget toont uitsluitend verbindingsstatus ----
{
  const widgetFn = html.split('function renderFtmsPairWidget(containerId)')[1].split('async function ftmsPairStart()')[0];
  ok(widgetFn.includes('wachten op bevestigde data'), 'A1: verbonden-status toont expliciet "wachten op bevestigde data", geen cijfer');
  ok(!widgetFn.match(/\d+\s*(bpm|watt|rpm|km\/u|w\b)/i), 'A2: geen enkele eenheid-met-placeholder-cijfer in de widget-HTML (geen schijnmeting)');
}

// ---- B. Hard invariant: geen workout-execution-state-verwijzing ----
ok(!nativeTransportCode.match(/_cyclingExecState|EnduranceExecutionCore/), 'B1: nativeFtmsBleTransport.js heeft geen enkele verwijzing naar de cycling-execution-state');

// ---- C. Hergebruik van de bestaande generieke gateway (vijf transports, één fabriek) ----
ok((bootstrap.match(/makeCapacitorBleGateway\(\)/g) || []).length === 5, 'C1: alle vijf transports (Concept2/HR/Power/CSC/FTMS) delen dezelfde makeCapacitorBleGateway()-fabrieksfunctie');
ok(bootstrap.match(/registerFtmsTransport[\s\S]{0,120}return;/), 'C2: FTMS-transport alleen op een echt native platform geregistreerd');

// ---- D. UNKNOWN-precedent: decode() nooit aangeroepen zonder de decoderRegistry ----
ok(nativeTransportCode.includes('decoderRegistry.decode(') && nativeTransportCode.includes('if (decoded) emitData(decoded)'),
  'D1: data wordt alleen doorgegeven als decoderRegistry.decode() een niet-null resultaat geeft (UNKNOWN blijft stil)');
ok(!nativeTransportCode.match(/0x2ad2|0x2acd|0x2ad1|0x1826/i), 'D2: geen hardcoded UUID-string in het transport zelf, komt uitsluitend uit ftmsCore.js');

// ---- E. Control Point nergens client-side aangeroepen (sectie 13: control expliciet buiten scope) ----
ok(!html.match(/ftmsPair.*[Cc]ontrol|writeControlPoint|FTMS.*[Cc]ontrolPoint\(/), 'E1: geen enkele client-side aanroep naar de FTMS Control Point -- uitsluitend read/discovery gebouwd');
ok(!nativeTransportCode.match(/controlPoint/i), 'E2: het transport zelf gebruikt de controlPoint-UUID nergens (alleen gedocumenteerd in ftmsCore.js, niet aangeroepen)');

// ---- F. Eerlijke degradatie ----
ok(html.includes("window.TKFtmsTransport && window.TKFtmsTransport.available===true"), 'F1: tkFtmsTransport() controleert expliciet .available===true, zelfde patroon als de andere vier transports');

// ---- G. Correctie verwerkt: Indoor Bike/Rower zijn nu CONFIRMED, overige machinetypes blijven UNKNOWN ----
ok(nativeTransportCode.includes("registerDecoder(FTMS.MACHINE_DATA_CHARACTERISTICS.indoorBike.uuid, FTMS.parseIndoorBikeData, 'CONFIRMED')"),
  'G1: Indoor Bike Data is expliciet als CONFIRMED geregistreerd met de nu bevestigde parser');
ok(nativeTransportCode.includes("registerDecoder(FTMS.MACHINE_DATA_CHARACTERISTICS.rower.uuid, FTMS.parseRowerData, 'CONFIRMED')"),
  'G2: Rower Data is expliciet als CONFIRMED geregistreerd met de nu bevestigde parser');
ok(!nativeTransportCode.match(/treadmill\.uuid.*registerDecoder|registerDecoder.*treadmill/i),
  'G3: Treadmill Data heeft nog GEEN geregistreerde decoder -- blijft eerlijk UNKNOWN totdat die byte-layout met dezelfde zekerheid bevestigd is');

// ---- H. Widget toont nu daadwerkelijk cijfers voor bevestigde machinetypes, blijft eerlijk voor de rest ----
{
  const summaryFn = html.split('function ftmsLiveSummary()')[1].split('function renderFtmsPairWidget(containerId)')[0];
  ok(summaryFn.includes('d.instantaneousSpeedKmh') && summaryFn.includes('d.strokeRatePerMin'),
    'H1: de live-samenvatting leest uitsluitend velden die parseIndoorBikeData()/parseRowerData() daadwerkelijk kunnen opleveren -- geen verzonnen veldnamen');
  ok(html.includes("'wachten op bevestigde data'"), 'H2: zolang er geen data binnenkomt (bv. bij een nog-UNKNOWN machinetype zoals Treadmill) blijft de eerlijke fallback-tekst bestaan');
}

console.log('\n========================================================');
console.log('fFtmsIntegration.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
