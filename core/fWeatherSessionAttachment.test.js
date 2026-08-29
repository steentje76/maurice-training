/* fWeatherSessionAttachment.test.js — MS-F5-06 regressietest.
 *
 * De pure WeatherCore-module is al uitgebreid getest (fWeatherEvidence.test.js,
 * 100/100). Dit bestand bewaakt specifiek de RUNTIME-KOPPELING: dat het weer
 * daadwerkelijk aan een sessie wordt vastgemaakt (met het volledige canonieke object,
 * dus inclusief provenance), uitsluitend bij outdoor-capable modaliteiten, nooit
 * fabricage bij een mislukte/geweigerde fetch, en nooit een blokkade van het afronden
 * van een sessie.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

ok(html.includes('weather:_weerData'),
  'writeSessionRow() neemt het canonieke weerobject op in de sessie-write (attachment)');
ok(html.includes("row.weather=_weerData"),
  'ook het tweede sessie-schrijfpad neemt het weerobject op -- geen inconsistentie tussen schrijfpaden');

{
  const re = /let _weerData = null;[\s\S]{0,600}catch\(_\)\{ \/\* weer mag nooit het afronden van een sessie blokkeren \*\/ \}/;
  ok(re.test(html), 'de weer-fetch-poging tijdens het afronden is expliciet in een try/catch met een nooit-blokkeren-garantie');
}

ok(html.includes("if(typeof TKWeather!=='undefined' && TKWeather.isEnabled())"),
  'de sessie-attachment respecteert dezelfde opt-in-gate als de live weer-context-balk');

ok(html.includes('TKWeather.OUTDOOR_CAPABLE[ct]'),
  'de sessie-attachment gebruikt dezelfde outdoor-capable-classificatie als de rest van de weer-architectuur');

ok(!html.includes('location_history') && !/INSERT INTO.*location/i.test(html),
  'geen permanente locatiegeschiedenis-opslag gevonden -- coördinaten uitsluitend transiënt gebruikt');

ok(html.includes("if(!canon || canon.temperature_c==null"),
  'een mislukte/onbruikbare fetch resulteert in null, nooit een gefabriceerde temperatuurwaarde');

console.log('fWeatherSessionAttachment: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
