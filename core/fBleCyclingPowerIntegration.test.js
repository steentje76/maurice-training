/* fBleCyclingPowerIntegration.test.js — DEVICES/WEARABLES MASTER SPRINT.
 * Zelfde bewaking als fBleHeartRateIntegration.test.js, nu voor Cycling
 * Power: geen invloed op execution-state, eerlijke degradatie, hergebruik
 * van de bestaande generieke BLE-gateway, device-measured voorrang op
 * handmatige invoer.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const nativeTransport = fs.readFileSync(path.join(ROOT, 'native/src/nativeCyclingPowerBleTransport.js'), 'utf8');
const nativeTransportCode = nativeTransport.replace(/\/\*[\s\S]*?\*\//g, '');
const bootstrap = fs.readFileSync(path.join(ROOT, 'native/src/bootstrap.js'), 'utf8');

console.log('DEVICES/WEARABLES MASTER SPRINT — BLE Cycling Power mid-workout attach');

// ---- A. Hard invariant ----
ok(!nativeTransportCode.match(/_cyclingExecState|EnduranceExecutionCore/), 'A1: nativeCyclingPowerBleTransport.js heeft geen enkele verwijzing naar de cycling-execution-state');

// ---- B. Eerlijke degradatie ----
{
  const widgetFn = html.split('function renderPowerPairWidget(containerId)')[1].split('async function powerPairStart()')[0];
  ok(widgetFn.includes('live koppeling in de app-versie'), 'B1: zonder TKCyclingPowerTransport toont de widget een eerlijke melding');
}
ok(html.includes('window.TKCyclingPowerTransport && window.TKCyclingPowerTransport.available===true'), 'B2: tkPowerTransport() controleert expliciet .available===true');
ok(bootstrap.match(/registerCyclingPowerTransport[\s\S]{0,120}return;/), 'B3: alleen op een echt native platform geregistreerd');

// ---- C. Hergebruik van de bestaande generieke gateway ----
ok(nativeTransportCode.includes('gateway.scan(') && nativeTransportCode.includes('gateway.startNotifications('), 'C1: hergebruikt exact dezelfde BleGateway-interface');
ok(!nativeTransportCode.match(/BleClient\.|@capacitor-community/), 'C2: geen rechtstreekse plugin-aanroep, alles via de gateway-parameter');
ok(bootstrap.includes('makeCapacitorBleGateway()') && (bootstrap.match(/makeCapacitorBleGateway\(\)/g) || []).length === 3,
  'C3: drie transports (Concept2/HR/Power) delen dezelfde makeCapacitorBleGateway()-fabrieksfunctie, geen eigen gateway-strategie per transport');

// ---- D. Officiële spec, bewust beperkte scope (geen giswerk op optionele velden) ----
ok(nativeTransportCode.includes('CP.parseCyclingPowerMeasurement') && !nativeTransportCode.match(/0x2a63|0x1818/i),
  'D1: byte-decodering leeft uitsluitend in core/bleCyclingPower.js, geen gedupliceerde parsing in het transport');

// ---- E. Device-measured heeft voorrang op handmatige invoer ----
{
  const finishFn = html.split('async function cyclingConfirmFinish()')[1].split('async function renderRideDetail')[0];
  ok(finishFn.includes('powerPairSessionAverage()!=null?powerPairSessionAverage():'),
    'E1: een echt BLE-vermogensgemiddelde krijgt voorrang op de handmatig ingevoerde waarde (device-measured > manual)');
}

// ---- F. Reset-discipline ----
ok(html.match(/hrPairResetForNewSession\(\);\s*\r?\n\s*powerPairResetForNewSession\(\);\s*\r?\n\s*renderCyclingExecutionScreen\(\);/),
  'F1: startCyclingExecution() reset zowel de HR- als de power-samplebuffer');
ok(html.match(/hrPairResetForNewSession\(\);\s*\r?\n\s*powerPairResetForNewSession\(\);\s*\r?\n\s*renderRideDetail\(activityId\);/),
  'F2: een succesvolle afronding reset beide samplebuffers vóór het tonen van het detailscherm');

// ---- G. Widget bereikbaar in het Cycling execution-scherm ----
ok(html.includes('id="power-pair-widget"') && html.includes("renderPowerPairWidget('power-pair-widget')"), 'G1: de widget is daadwerkelijk aangesloten op het Cycling execution-scherm');

console.log('\n========================================================');
console.log('fBleCyclingPowerIntegration.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
