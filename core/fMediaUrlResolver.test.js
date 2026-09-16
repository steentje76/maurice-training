/* fMediaUrlResolver.test.js — MEDIA-0C: ANDROID VIDEO ZONDER SERVICE WORKER
 *
 * Architectuurprincipe dat hier wordt bewaakt:
 *   BASALE ONLINE VIDEOWEERGAVE MAG NOOIT EEN SERVICE WORKER VEREISEN.
 *
 * Vóór MEDIA-0C hing Android-playback af van zes schakels achter elkaar:
 * SW-beschikbaarheid, -registratie, -activatie, cross-origin fetch binnen de SW,
 * geldige CORS en Cache-API-compatibiliteit. Elk daarvan was een single point of
 * failure. De canonieke resolver geeft het media-adres rechtstreeks aan <video src>,
 * zodat de WebView zelf een native media-request doet (no-cors, mét Range).
 *
 * Draai: node core/fMediaUrlResolver.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
var SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
var REMOTE = 'https://maurice-art.netlify.app';

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  \u2717 ' + m); } }

/* Laad de ECHTE resolver + ExerciseAssetProvider uit index.html (geen kopie). */
function load(hostname) {
  var s = HTML.indexOf('var ExerciseAssetProvider');
  var e = HTML.indexOf('var ExerciseIntelligence=(function(){');
  assert.ok(s >= 0 && e > s, 'ExerciseAssetProvider-blok niet gevonden');
  var f = new Function('window', 'location',
    HTML.slice(s, e) + '\n; return {P:ExerciseAssetProvider,R:window.MediaUrlResolver,VM:VIDEO_MANIFEST};');
  return f({}, { hostname: hostname });
}
/* Laad de ECHTE isVideoRequest uit sw.js voor een gegeven app-origin. */
function loadIsVideoRequest(origin) {
  var i = SW.indexOf('function isVideoRequest');
  var j = SW.indexOf('async function videoMeta');
  assert.ok(i >= 0 && j > i, 'isVideoRequest niet gevonden');
  return new Function('self', SW.slice(i, j) + '\nreturn isVideoRequest;')(
    { location: { href: origin + '/', origin: origin } });
}

var ANDROID = load('localhost');
var WEB = load('maurice-art.netlify.app');

/* ══ 1. Web-regressie: same-origin blijft exact zoals het was ══ */
console.log('1. Web-pad ongewijzigd');
ok(WEB.P.resolve('TK-000206', 'video') === 'videos/wall-sit.mp4',
  '1a: web resolvet relatief/same-origin (geen gedragsverandering)');
ok(WEB.P.videos('TK-000206')[0].url === 'videos/wall-sit.mp4', '1b: web videos().url relatief');
ok(loadIsVideoRequest('https://maurice-art.netlify.app')('https://maurice-art.netlify.app/videos/wall-sit.mp4') === true,
  '1c: op web onderschept de SW same-origin video nog steeds (offline-cache intact)');

/* ══ 2. Android: absolute remote URL zonder SW ══ */
console.log('2. Android resolvet naar de remote media-origin');
ok(ANDROID.P.resolve('TK-000206', 'video') === REMOTE + '/videos/wall-sit.mp4', '2a: Wall Sit -> remote URL');
ok(ANDROID.P.resolve('TK-000226', 'video') === REMOTE + '/videos/dead-bug.mp4', '2b: Dead Bug -> remote URL');
ok(ANDROID.P.videos('TK-000206')[0].file === 'videos/wall-sit.mp4',
  '2c: manifest-file blijft het canonieke pad (identiteit/checksum ongemoeid)');

/* ══ 3. Geen enkele afhankelijkheid van de service worker ══ */
console.log('3. Service-worker-onafhankelijkheid');
var savedNav = global.navigator;
try { delete global.navigator; } catch (e) { }
ok(load('localhost').P.resolve('TK-000206', 'video') === REMOTE + '/videos/wall-sit.mp4',
  '3a: resolutie werkt zonder enige navigator/serviceWorker');
global.navigator = { serviceWorker: { register: function () { return Promise.reject(new Error('SecurityError')); }, controller: null } };
ok(load('localhost').P.resolve('TK-000206', 'video') === REMOTE + '/videos/wall-sit.mp4',
  '3b: resolutie ongewijzigd terwijl register() afwijst en controller null is');
if (savedNav === undefined) { try { delete global.navigator; } catch (e) { } } else { global.navigator = savedNav; }

/* ══ 4. Exacte media-identiteit over de volledige catalogus ══ */
console.log('4. Media-identiteit');
var drift = [];
for (var tk in ANDROID.VM) {
  var slug = ANDROID.VM[tk].slug;
  if (ANDROID.P.resolve(tk, 'video') !== REMOTE + '/videos/' + slug + '.mp4') drift.push(tk);
}
ok(drift.length === 0, '4a: alle ' + Object.keys(ANDROID.VM).length + ' oefeningen resolven exact hun eigen slug (' + drift.slice(0, 3).join(',') + ')');
ok(ANDROID.P.resolve('TK-000206', 'video').indexOf('dead-bug') < 0 &&
   ANDROID.P.resolve('TK-000226', 'video').indexOf('wall-sit') < 0, '4b: geen kruisbesmetting tussen oefeningen');
ok(ANDROID.P.resolve('TK-999999', 'video') === null, '4c: onbekende catalog_id -> null, nooit andermans media');

/* ══ 5. Fail closed ══ */
console.log('5. Fail-closed gedrag');
[['../../etc/passwd', null], ['videos/../secret.mp4', null], ['videos/.mp4', null], ['', null],
 [null, null], [42, null], ['videos/x.exe', null], ['videos/wall-sit.txt', null],
 ['https://evil.com/videos/x.mp4', null], [REMOTE + '/other/x.mp4', null],
 [REMOTE + '/videos/../secret.mp4', null],
 ['/videos/wall-sit.mp4', REMOTE + '/videos/wall-sit.mp4'],
 [REMOTE + '/videos/wall-sit.mp4', REMOTE + '/videos/wall-sit.mp4']
].forEach(function (c, i) {
  ok(ANDROID.R.resolve(c[0]) === c[1], '5.' + i + ': resolve(' + JSON.stringify(c[0]) + ') -> ' + JSON.stringify(ANDROID.R.resolve(c[0])) + ' (verwacht ' + JSON.stringify(c[1]) + ')');
});

/* ══ 6. Range blijft intact op het online Android-pad ══ */
console.log('6. Range-behoud op het remote pad');
var isvAndroid = loadIsVideoRequest('https://localhost');
ok(isvAndroid(REMOTE + '/videos/wall-sit.mp4') === false,
  '6a: de SW onderschept de remote video NIET -> WebView doet zelf een native Range-request');
ok(isvAndroid('https://localhost/videos/wall-sit.mp4') === true,
  '6b: same-origin video wordt nog wel onderschept (bestaande offline-cache blijft werken)');
ok(isvAndroid('https://evil.com/videos/x.mp4') === false, '6c: vreemde origin wordt niet onderschept');
/* Let op: of de mediaserver werkelijk 206 teruggeeft is NIET gemeten en wordt hier
   ook niet geclaimd. Bewezen is alleen dat TK de Range niet langer vernietigt. */

/* ══ 7. Geen preload van volledige video's ══ */
console.log('7. Preload-gedrag');
ok(HTML.indexOf('preload="metadata"') < 0, '7a: geen enkel videopad gebruikt preload="metadata" meer');
ok(HTML.indexOf('preload="none"') >= 0 || HTML.indexOf("preload='none'") >= 0, '7b: preload staat op none');

console.log('\n========================================================');
console.log('fMediaUrlResolver.test.js \u2014 ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) process.exit(1);
