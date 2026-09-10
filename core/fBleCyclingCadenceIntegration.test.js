/* fBleCyclingCadenceIntegration.test.js — DEVICES/WEARABLES MASTER SPRINT.
 * Zelfde bewaking als de HR/Power-integratietests, nu voor CSC-cadans.
 * Extra nadruk (sectie 10/11): het widget zelf berekent NOOIT cadans -- dat
 * gebeurt uitsluitend in BleCyclingSpeedCadenceCore.deriveCadenceRpm()
 * binnen het native transport.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const nativeTransport = fs.readFileSync(path.join(ROOT, 'native/src/nativeCyclingSpeedCadenceBleTransport.js'), 'utf8');
const nativeTransportCode = nativeTransport.replace(/\/\*[\s\S]*?\*\//g, '');
const bootstrap = fs.readFileSync(path.join(ROOT, 'native/src/bootstrap.js'), 'utf8');

console.log('DEVICES/WEARABLES MASTER SPRINT — BLE Cycling Cadence (CSC) mid-workout attach');

// ---- A. Hard invariant: geen workout-execution-state-verwijzing ----
ok(!nativeTransportCode.match(/_cyclingExecState|EnduranceExecutionCore/), 'A1: nativeCyclingSpeedCadenceBleTransport.js heeft geen enkele verwijzing naar de cycling-execution-state');

// ---- B. Eerlijke degradatie ----
{
  const widgetFn = html.split('function renderCadencePairWidget(containerId)')[1].split('async function cadencePairStart()')[0];
  ok(widgetFn.includes('live koppeling in de app-versie'), 'B1: zonder TKCyclingCadenceTransport toont de widget een eerlijke melding');
}
ok(html.includes('window.TKCyclingCadenceTransport && window.TKCyclingCadenceTransport.available===true'), 'B2: tkCadenceTransport() controleert expliciet .available===true');
ok(bootstrap.match(/registerCscTransport[\s\S]{0,150}return;/), 'B3: alleen op een echt native platform geregistreerd');

// ---- C. Hergebruik van de bestaande generieke gateway (vier transports, één gateway-fabriek) ----
ok(nativeTransportCode.includes('gateway.scan(') && nativeTransportCode.includes('gateway.startNotifications('), 'C1: hergebruikt exact dezelfde BleGateway-interface');
ok((bootstrap.match(/makeCapacitorBleGateway\(\)/g) || []).length === 4, 'C2: alle vier transports (Concept2/HR/Power/CSC) delen dezelfde makeCapacitorBleGateway()-fabrieksfunctie');

// ---- D. Architectuurscheiding: parser/calculation in core/, transport roept alleen aan ----
ok(nativeTransportCode.includes('CSC.parseCscMeasurement') && nativeTransportCode.includes('CSC.deriveCadenceRpm'),
  'D1: het transport roept uitsluitend de bestaande parser/calculation-functies aan -- geen gedupliceerde decode- of rekenlogica in het transport zelf');
ok(!nativeTransportCode.match(/0x2a5b|0x1816/i), 'D2: geen hardcoded UUID-string in het transport (komt uitsluitend uit de core-module)');

// ---- E. Widget berekent zelf niets, toont uitsluitend het al-berekende resultaat ----
{
  const widgetBlock = html.split('let _cadencePair=')[1].split('function runningPause()')[0];
  ok(!widgetBlock.match(/deriveCadenceRpm|parseCscMeasurement/), 'E1: het UI-widget-blok roept zelf nergens de parser/calculation aan -- ontvangt uitsluitend result.cadenceRpm via de onCadence()-callback');
  ok(widgetBlock.includes('result.cadenceRpm'), 'E2: de widget leest het al-berekende cadenceRpm-veld, herberekent niets');
}

// ---- F. Device-measured heeft voorrang op handmatige invoer ----
{
  const finishFn = html.split('async function cyclingConfirmFinish()')[1].split('async function renderRideDetail')[0];
  ok(finishFn.includes('cadencePairSessionAverage()!=null?cadencePairSessionAverage():'),
    'F1: een echt BLE-cadansgemiddelde krijgt voorrang op de handmatig ingevoerde waarde');
}

// ---- G. Reset-discipline (drie sensoren: HR, power, cadans) ----
ok(html.match(/hrPairResetForNewSession\(\);\s*\r?\n\s*powerPairResetForNewSession\(\);\s*\r?\n\s*cadencePairResetForNewSession\(\);\s*\r?\n\s*renderCyclingExecutionScreen\(\);/),
  'G1: startCyclingExecution() reset alle drie de sensor-samplebuffers (HR, power, cadans)');
ok(html.match(/hrPairResetForNewSession\(\);\s*\r?\n\s*powerPairResetForNewSession\(\);\s*\r?\n\s*cadencePairResetForNewSession\(\);\s*\r?\n\s*renderRideDetail\(activityId\);/),
  'G2: een succesvolle afronding reset alle drie de samplebuffers vóór het tonen van het detailscherm');

// ---- H. Widget bereikbaar in het Cycling execution-scherm ----
ok(html.includes('id="cadence-pair-widget"') && html.includes("renderCadencePairWidget('cadence-pair-widget')"), 'H1: de widget is daadwerkelijk aangesloten op het Cycling execution-scherm');

console.log('\n========================================================');
console.log('fBleCyclingCadenceIntegration.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
