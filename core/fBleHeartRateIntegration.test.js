/* fBleHeartRateIntegration.test.js — DEVICES/WEARABLES MASTER SPRINT.
 * Bewaakt: het HR-widget heeft nul invloed op _runningExecState (mid-workout
 * attach hard-invariant), eerlijke degradatie zonder native transport, geen
 * verzonnen BPM bij afwezige data, hergebruik van de bestaande generieke
 * BLE-gateway (geen tweede BLE-abstractielaag), en dat het gemiddelde als
 * null (niet 0) wordt opgeslagen wanneer er geen samples zijn.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const nativeTransport = fs.readFileSync(path.join(ROOT, 'native/src/nativeHeartRateBleTransport.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(ROOT, 'native/src/bootstrap.js'), 'utf8');

const nativeTransportCode = nativeTransport.replace(/\/\*[\s\S]*?\*\//g, ''); // block-commentaar eruit vóór de code-only checks

// ---- A. Hard invariant: device-lifecycle bezit nooit de workout-execution-lifecycle ----
ok(!nativeTransportCode.match(/_runningExecState|RunningExecutionCore|_swimmingExecState|EnduranceExecutionCore/),
  'A1: nativeHeartRateBleTransport.js heeft geen enkele verwijzing naar enige workout-execution-state -- puur een BPM-publisher');
{
  const widgetFn = html.split("function renderHrPairWidget(containerId)")[1].split('async function hrPairStart()')[0];
  ok(!widgetFn.match(/_runningExecState|RunningExecutionCore\.(pause|resume|requestFinish)/),
    'A2: renderHrPairWidget raakt nooit de running-execution-state aan');
}

// ---- B. Eerlijke degradatie zonder native transport (geen fake transport) ----
{
  const widgetFn = html.split("function renderHrPairWidget(containerId)")[1].split('async function hrPairStart()')[0];
  ok(widgetFn.includes('live koppeling in de app-versie'), 'B1: zonder TKHeartRateTransport toont de widget een eerlijke melding, geen fake "verbonden"');
}
ok(html.includes("window.TKHeartRateTransport && window.TKHeartRateTransport.available===true"),
  'B2: tkHrTransport() controleert expliciet .available===true, exact hetzelfde patroon als tkDeviceTransport() voor Concept2');
ok(bootstrap.includes('!Capacitor.isNativePlatform()') && bootstrap.match(/registerHeartRateTransport[\s\S]{0,120}return;/),
  'B3: de HR-transport wordt alleen op een echt native platform geregistreerd -- geen web/PWA-fallback die doet alsof');

// ---- C. Geen verzonnen BPM, UNKNOWN != ZERO ----
{
  const avgFn = html.split('function hrPairSessionAverage()')[1].split('function hrPairResetForNewSession()')[0];
  ok(avgFn.includes('BleHeartRateCore.averageBpm(_hrPair.samples)'), 'C1: hergebruikt de pure, geteste BleHeartRateCore.averageBpm() -- geen losse, ongeteste berekening');
}
ok(html.includes('avg_heart_rate_bpm:hrPairSessionAverage()'), 'C2: runningConfirmFinish geeft het HR-gemiddelde door aan de activity-payload (null, niet 0, als er geen samples zijn -- averageBpm() garandeert dit al, zie fBleHeartRate.test.js C3)');

// ---- D. Hergebruik van de bestaande generieke BLE-gateway (geen tweede BLE-laag) ----
ok(nativeTransport.includes('gateway.scan(') && nativeTransport.includes('gateway.connect(') && nativeTransport.includes('gateway.startNotifications('),
  'D1: gebruikt exact dezelfde BleGateway-interface (scan/connect/startNotifications) als NativeConcept2BleTransport -- geen nieuwe abstractie');
ok(!nativeTransport.match(/BleClient\.|@capacitor-community/), 'D2: geen rechtstreekse plugin-aanroep -- alles loopt via de gateway-parameter (dependency injection, testbaar zonder een echt device)');
ok(bootstrap.includes('makeCapacitorBleGateway()') && bootstrap.match(/makeCapacitorBleGateway\(\)[\s\S]{0,200}makeNativeHeartRateBleTransport/),
  'D3: bootstrap.js hergebruikt dezelfde makeCapacitorBleGateway() als het Concept2-transport, geen tweede gateway-instantie-strategie');

// ---- E. Officiële spec, geen gegokte byte-layout (Concept2-les direct toegepast) ----
ok(nativeTransportCode.includes('HR.parseHeartRateMeasurement') && !nativeTransportCode.match(/0x2a37|0x180d/i),
  'E1: de byte-decodering zelf leeft uitsluitend in core/bleHeartRate.js (BleHeartRateCore) -- het transport bevat geen eigen, gedupliceerde parsing-logica');

// ---- F. Reset-discipline: geen oud gemiddelde aan een nieuwe training toegeschreven ----
ok(html.includes('hrPairResetForNewSession();\n  renderRunningExecutionScreen();') || html.match(/hrPairResetForNewSession\(\);\s*\r?\n\s*renderRunningExecutionScreen\(\);/),
  'F1: startRunningExecution() reset de HR-samplebuffer bij het starten van een nieuwe sessie');
ok(html.match(/hrPairResetForNewSession\(\);\s*\r?\n\s*renderRunDetail\(activityId\);/),
  'F2: een succesvol afgeronde training reset de HR-samplebuffer vóór het tonen van het detailscherm');

// ---- G. Uitbreiding naar Cycling: zelfde generieke widget, eigen container-id (geen tweede implementatie) ----
ok(html.includes('id="hr-pair-widget-cycling"'), 'G1: Cycling execution-scherm heeft een eigen widget-container (geen DOM-id-botsing met Running)');
ok(html.includes("renderHrPairWidget('hr-pair-widget-cycling')"), 'G2: Cycling roept hetzelfde, generieke renderHrPairWidget() aan -- geen tweede HR-widget-implementatie');
ok(html.includes('avg_heart_rate_bpm:hrPairSessionAverage()') && (html.match(/avg_heart_rate_bpm:hrPairSessionAverage\(\)/g) || []).length === 2,
  'G3: zowel Running als Cycling geven het sessie-gemiddelde door aan hun activity-payload (2 call-sites, geen duplicaat-logica)');
ok(html.includes('_hrPair.containerId=containerId'), 'G4: het widget onthoudt per-aanroep welk scherm het bedient, zodat interne hertekeningen (scan/connect/disconnect) het juiste sportscherm raken i.p.v. altijd Running');

console.log('\n========================================================');
console.log('fBleHeartRateIntegration.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
