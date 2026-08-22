/* MASTER SPRINT v4.52.0 — WEER PER SESSIE: DATA FOUNDATION
 * Dekt Fase 10 zoals gespecificeerd + de architectuurregels uit de audit-goedkeuring:
 *  1  normale weather snapshot (minimalSnapshot trimt correct)
 *  2  ontbrekende locatie -> geen snapshot (structureel: TKWeather.getCoords levert dan
 *     {error:...}, forContext -> data:null; hier getest op het niveau van minimalSnapshot
 *     dat null krijgt en null teruggeeft)
 *  3  ontbrekende weather response -> null
 *  4  gedeeltelijke weather response (bv. geen wind) -> de overige velden blijven, ontbrekend veld null
 *  5  ongeldige temperatuur (null/quality invalid) -> hele snapshot null (temperatuur is de poort)
 *  6  ongeldige humidity -> humidity_pct null, rest blijft (temperatuur bepaalt de poort, niet vocht)
 *  7  ongeldige wind -> wind_ms null, rest blijft
 *  8  verkeerde/ontbrekende timestamp -> timestamp null, geen crash, geen fabricatie
 *  9  offline training / 10 sync na offline / 11 duplicate sync: structureel — weather is een
 *     extra sleutel op de al bestaande sessions/training_instances-writes via de bestaande
 *     sbPostQ/sbPatchQ-offline-wachtrij; niet hier opnieuw getest (geen wijziging aan die laag)
 * 12  oude sessie zonder weather -> leesbaar (geen enkele consument vereist het veld)
 * 13  sessie zonder GPS -> geen coördinaten ooit in het opgeslagen object (architectuurcontrole)
 *  A  éénmalige opslag / geen dubbele opslag (broncode-audit van de gewijzigde functies)
 *  B  nooit een geldige snapshot overschrijven met null bij een mislukte eind-fetch
 *
 * Draai: node core/fWeatherSession.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const WeatherCore = require('./weather.js');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

function extractFn(name){
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  if (end < 0) throw new Error('einde niet gevonden: ' + name);
  return html.slice(start, end + 1);
}

console.log('\n[MASTER SPRINT v4.52.0] Weer per sessie — data foundation');

/* ── 1-8. WeatherCore.minimalSnapshot — de zuivere trim-regel ─────────────────────── */
console.log('\nA. WeatherCore.minimalSnapshot (weather_session_snapshot.v1)');
const canonVol = { schema:'weather_canonical.v1', temperature_c:18.4, feels_like_c:17.1, humidity_pct:65,
  pressure_hpa:1013, wind_ms:5, wind_gust_ms:10, precip_mmh:0.5, uv_index:4, condition:'3',
  timestamp:'2026-08-20T10:00:00Z', location_resolution:'city', observed_or_forecast:'observed',
  quality:{temperature_c:'valid',humidity_pct:'valid',wind_ms:'valid'},
  provenance:{provider:'open-meteo',method:'api',timestamp:'2026-08-20T10:00:00Z',receivedAt:1755680000000} };

const snap1 = WeatherCore.minimalSnapshot(canonVol);
eq(snap1.schema, 'weather_session_snapshot.v1', '1: eigen, versieerbaar schema');
eq(snap1.temperature_c, 18.4, '1: temperatuur behouden');
eq(snap1.humidity_pct, 65, '1: luchtvochtigheid behouden');
eq(snap1.wind_ms, 5, '1: wind behouden');
eq(snap1.feels_like_c, undefined, '1 (Fase 2-besluit): gevoelstemperatuur NIET meegenomen (minimaal veldenset)');
eq(snap1.precip_mmh, undefined, '1 (Fase 2-besluit): neerslag NIET meegenomen');
eq(snap1.wind_gust_ms, undefined, '1 (Fase 2-besluit): windrichting/windstoot NIET meegenomen');
eq(snap1.pressure_hpa, undefined, '1 (Fase 2-besluit): luchtdruk NIET meegenomen');
ok(snap1.provenance && snap1.provenance.provider === 'open-meteo', '1: provenance behouden (bron/methode/tijd)');

eq(WeatherCore.minimalSnapshot(null), null, '2/3: geen canoniek object -> null, geen fabricatie');
eq(WeatherCore.minimalSnapshot(undefined), null, '3: undefined -> null');

const canonGeenWind = Object.assign({}, canonVol, { wind_ms: null, quality: Object.assign({}, canonVol.quality, { wind_ms: 'invalid' }) });
const snap4 = WeatherCore.minimalSnapshot(canonGeenWind);
eq(snap4.wind_ms, null, '4: gedeeltelijke response — ontbrekende wind wordt null, geen 0');
eq(snap4.temperature_c, 18.4, '4: overige velden blijven intact');
eq(snap4.quality.wind_ms, 'invalid', '4: quality-vlag per veld blijft zichtbaar (auditeerbaar)');

eq(WeatherCore.minimalSnapshot(Object.assign({}, canonVol, { temperature_c: null })), null,
  '5: ongeldige/ontbrekende temperatuur -> hele snapshot null (temperatuur is de poort — geen halve, misleidende snapshot)');

const snap6 = WeatherCore.minimalSnapshot(Object.assign({}, canonVol, { humidity_pct: null }));
ok(snap6 !== null, '6: ongeldige humidity alleen -> snapshot blijft bestaan (temperatuur was wel geldig)');
eq(snap6.humidity_pct, null, '6: humidity zelf wordt null, geen 0');

const snap7 = WeatherCore.minimalSnapshot(Object.assign({}, canonVol, { wind_ms: null }));
ok(snap7 !== null, '7: ongeldige wind alleen -> snapshot blijft bestaan');
eq(snap7.wind_ms, null, '7: wind zelf wordt null');

const snap8 = WeatherCore.minimalSnapshot(Object.assign({}, canonVol, { timestamp: undefined }));
eq(snap8.timestamp, null, '8: ontbrekende timestamp -> null, geen huidige tijd verzonnen, geen crash');

/* ── 12. Oude sessie zonder weather blijft leesbaar (geen enkele consument vereist het) ── */
console.log('\nB. Regressie — oude sessies zonder weather-veld');
const oudeSessieRij = { date:'2026-01-01', exercise_id:'sq', training_type:'A', note:'', sets_detail:[{kg:100,reps:5,rpe:7,rest_duration_s:null}] };
ok(!('weather' in oudeSessieRij), '12: representatieve oude rij heeft geen weather-sleutel — geen enkele geteste functie vereist hem');

/* ── 13. Architectuurcontrole: nooit coördinaten in het opgeslagen object ─────────── */
console.log('\nC. Architectuurcontrole (Fase 4/9 — privacy, geen GPS-opslag)');
const snapJson = JSON.stringify(snap1).toLowerCase();
ok(!/latitude|longitude|"lat"|"lng"|coord/.test(snapJson), '13: minimalSnapshot-output bevat nooit coördinaten/latitude/longitude');
const fs2 = require('fs');
const weatherSrc = fs2.readFileSync(path.join(__dirname, 'weather.js'), 'utf8');
const minimalSnapshotSrc = weatherSrc.slice(weatherSrc.indexOf('function minimalSnapshot'), weatherSrc.indexOf('function minimalSnapshot') + 900);
ok(!/lat|lng|latitude|longitude/i.test(minimalSnapshotSrc.replace(/\/\/.*$/gm,'')), '13c: minimalSnapshot() zelf leest nergens lat/lng/latitude/longitude uit — puur onmogelijk om coördinaten door te geven');

/* ── A. Éénmalige opslag / geen dubbele opslag — broncode-audit ──────────────────── */
console.log('\nD. Broncode-audit: éénmalige opslag, geen dubbele opslag, geen GPS-opslag in de write-paden');
const finishSessionSrc = extractFn('finishSession');
ok(/activeInstanceId.*await tkWeatherInstancesKolomBeschikbaar/.test(finishSessionSrc) || /tkWeatherInstancesKolomBeschikbaar/.test(finishSessionSrc),
  'D1: finishSession() probeert eerst het instance-pad (training_instances.weather)');
ok(/saved===0/.test(finishSessionSrc), 'D2: het sessions-fallbackpad is gebonden aan de EERSTE rij (saved===0) — geen duplicatie over meerdere oefeningen');
ok(/_weerGeschreven/.test(finishSessionSrc), 'D3: een "al geschreven"-vlag voorkomt dat zowel instance- als sessions-pad tegelijk schrijven');
ok(!/getCurrentPosition|navigator\.geolocation/.test(finishSessionSrc), 'D4: finishSession() roept zelf nooit geolocation aan — gaat via TKWeather, geen eigen coördinaten-logica');

const persistToSessionsSrc = extractFn('persistToSessions');
ok(/written===0/.test(persistToSessionsSrc), 'D5: Guided Workout-fallback ook gebonden aan de eerste geschreven rij');
ok(/_weerGeschrevenGW/.test(persistToSessionsSrc), 'D6: Guided Workout heeft dezelfde "al geschreven"-bewaking als de normale flow');

const captureSrc = extractFn('tkCaptureFinishWeather');
ok(/TKWeather\.isEnabled\(\)/.test(captureSrc), 'D7: geen fetch zonder de bestaande opt-in-vlag (consent gerespecteerd)');
ok(/minimalSnapshot/.test(captureSrc), 'D8: uitsluitend het al bestaande canonieke object wordt getrimd — geen nieuwe normalisatie/berekening');
ok(!/latitude|longitude/i.test(captureSrc), 'D9: tkCaptureFinishWeather() zelf raakt nooit coördinaten aan');

/* ── B. Fallback bij mislukte eind-fetch: nooit een geldige snapshot overschrijven met null ── */
console.log('\nE. Correctie-instructie: mislukte eind-fetch overschrijft nooit een geldige snapshot met NULL');
ok(/if\(!canon\)\{[\s\S]{0,200}window\._tkSessionWeatherStart/.test(captureSrc),
  'E1: bij een mislukte eind-fetch wordt teruggevallen op de eerder in de sessie opgehaalde snapshot');
ok(/start\.key===key/.test(captureSrc), 'E2: de fallback-snapshot moet bij DEZELFDE sessie horen (key-check) — geen kruisbesmetting tussen trainingen');
ok(/if\(_weerSnap && activeInstanceId/.test(finishSessionSrc), 'E3: de patch naar training_instances.weather gebeurt ALLEEN als er een snapshot is — nooit een expliciete null-patch die een bestaande waarde zou wissen');
ok(!/\{weather:null\}/.test(finishSessionSrc) && !/\{weather:null\}/.test(persistToSessionsSrc), 'E4: nergens in de write-paden wordt weather expliciet op null gezet');

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
console.log(fail === 0 ? '✅ Weer per sessie: puur, additief, éénmalig, geen GPS-opslag.' : '❌ Weer per sessie NIET groen.');
process.exitCode = fail === 0 ? 0 : 1;
