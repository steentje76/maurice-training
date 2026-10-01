/* fAndroidOcrAssetPackaging.test.js — OCR-taaldata: runtimeconfig ↔ verpakt bestand
 *
 * Root cause die deze suite bewaakt: de Android Gradle Plugin pakt .gz-assets uit en haalt de
 * extensie weg. core/vendor/eng.traineddata.gz stond daardoor als eng.traineddata in de APK,
 * terwijl Tesseract (gzip:true) om eng.traineddata.gz vroeg -> 404 -> voedingslabel-OCR laadde
 * in de APK nooit. De native build (scripts/build-www.mjs) pakt de taaldata nu zelf uit en zet
 * in de www-kopie gzip:false; web/PWA blijft op de .gz met gzip:true.
 *
 * Vereist een verse `npm run cap:copy` (de Quality Gate draait die vóór de tests), net als
 * fAndroidRelease.test.js.
 */
var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var zlib = require('zlib');
var crypto = require('crypto');
var V = require('../tools/verify-ocr-packaging.js');

var ROOT = path.join(__dirname, '..');
var WWW = path.join(ROOT, 'www');
var ANDROID = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'public');
var GZ_BRON = path.join(ROOT, 'core', 'vendor', 'eng.traineddata.gz');
var n = 0;
function t(naam, fn) { fn(); n++; console.log('  ok  ' + naam); }
function sha(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function geenFouten(res, waar) { assert.deepStrictEqual(res.errors, [], waar + ': ' + res.errors.join(' | ')); }

/* In-memory bron voor de negatieve gevallen. */
var GZ = Buffer.from([0x1f, 0x8b, 8, 0]);
var RAW = Buffer.from([0x18, 0x00, 0, 0]);
function nep(bestanden) {
  return {
    has: function (p) { return Object.prototype.hasOwnProperty.call(bestanden, p); },
    head: function (p) { return bestanden[p].subarray(0, 2); },
    list: function () { return Object.keys(bestanden); }
  };
}
function html(gzip) {
  return "x=Tesseract.recognize(img,'eng',{ workerPath:'core/vendor/tesseract-worker.min.js', langPath:'core/vendor', " +
    "corePath:'core/vendor/tesseract-core'" + (gzip === null ? '' : ', gzip:' + gzip) + ' });';
}
var BASIS = { 'core/vendor/tesseract-worker.min.js': RAW, 'core/vendor/tesseract-core/tesseract-core-relaxedsimd-lstm.wasm.js': RAW };
function met(extra) { return nep(Object.assign({}, BASIS, extra)); }

/* Minimale ZIP-schrijver (stored) om de APK-modus zonder Android-toolchain te testen. */
var CRC = (function () { var tab = []; for (var i = 0; i < 256; i++) { var c = i; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tab[i] = c >>> 0; } return tab; })();
function crc32(b) { var c = 0xffffffff; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function maakZip(bestanden) {
  var lokaal = [], centraal = [], off = 0;
  Object.keys(bestanden).forEach(function (naam) {
    var data = Buffer.from(bestanden[naam]), nb = Buffer.from(naam, 'utf8'), crc = crc32(data);
    var lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nb.length, 26);
    var ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    lokaal.push(lh, nb, data); centraal.push(ch, nb); off += 30 + nb.length + data.length;
  });
  var cd = Buffer.concat(centraal), e = Buffer.alloc(22), aantal = Object.keys(bestanden).length;
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(aantal, 8); e.writeUInt16LE(aantal, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat(lokaal.concat([cd, e]));
}
function nepApk(indexHtml, extra) {
  var inhoud = { 'AndroidManifest.xml': 'x', 'assets/public/index.html': indexHtml };
  Object.keys(BASIS).forEach(function (k) { inhoud['assets/public/' + k] = BASIS[k]; });
  Object.keys(extra).forEach(function (k) { inhoud['assets/public/' + k] = extra[k]; });
  var p = path.join(os.tmpdir(), 'tk-ocr-' + process.pid + '-' + (n) + '-' + Math.random().toString(36).slice(2) + '.apk');
  fs.writeFileSync(p, maakZip(inhoud));
  try { return V.verify('apk', p); } finally { fs.unlinkSync(p); }
}

/* ══ A. WEB/PWA: ongewijzigd, .gz + gzip:true ═══════════════════════════════ */
console.log('\nA. Web/PWA-bron');
var REPO_HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
t('A1 repo-index.html bevat precies één Tesseract-config, met gzip:true en lokale langPath', function () {
  var c = V.parseTesseractConfigs(REPO_HTML);
  assert.strictEqual(c.length, 1);
  assert.deepStrictEqual([c[0].langs, c[0].langPath, c[0].gzip, c[0].gzipExplicit], [['eng'], 'core/vendor', true, true]);
});
t('A2 canonieke bron core/vendor/eng.traineddata.gz bestaat en is echt gzip', function () {
  assert.ok(V.isGzip(fs.readFileSync(GZ_BRON)));
});
t('A3 web-controle slaagt op de repo-root', function () { geenFouten(V.verify('web', ROOT), 'web'); });
t('A4 er is één canonieke taaldata-bron voor runtime (geen uitgepakte kopie in de repo)', function () {
  assert.ok(!fs.existsSync(path.join(ROOT, 'core', 'vendor', 'eng.traineddata')));
});

/* ══ B. NA build:www ════════════════════════════════════════════════════════ */
console.log('\nB. www/ na build:www');
assert.ok(fs.existsSync(path.join(WWW, 'index.html')), 'www/ ontbreekt — draai eerst: npm run cap:copy');
var UITGEPAKT = zlib.gunzipSync(fs.readFileSync(GZ_BRON));
var WWW_HTML = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
t('B1 OCR-controle slaagt op www/', function () { geenFouten(V.verify('native', WWW), 'www'); });
t('B2 www/core/vendor/eng.traineddata is byte-exact gunzip(canonieke .gz)', function () {
  assert.strictEqual(sha(fs.readFileSync(path.join(WWW, 'core', 'vendor', 'eng.traineddata'))), sha(UITGEPAKT));
});
t('B3 www/ bevat geen enkel .gz-bestand en geen core/fixtures', function () {
  assert.deepStrictEqual(V.dirSource(WWW).list().filter(function (f) { return /\.gz$/.test(f); }), []);
  assert.ok(!fs.existsSync(path.join(WWW, 'core', 'fixtures')));
});
t('B4 www/index.html vraagt gzip:false; verder identiek aan de web-index (alleen script-tag + gzip)', function () {
  var c = V.parseTesseractConfigs(WWW_HTML);
  assert.strictEqual(c.length, 1);
  assert.strictEqual(c[0].gzip, false);
  var terug = WWW_HTML.replace('  <script src="native-transport.js"></script>\n</body>', '</body>')
    .replace(/(Tesseract\.(?:recognize|createWorker)\([^;]*?gzip\s*:\s*)false/g, '$1true');
  assert.ok(terug === REPO_HTML, 'www/index.html wijkt op meer punten af van index.html dan de twee bedoelde native aanpassingen');
});

/* ══ C. NA Android-sync ═════════════════════════════════════════════════════ */
console.log('\nC. Android-assets na cap copy/sync');
assert.ok(fs.existsSync(path.join(ANDROID, 'index.html')), 'Android-assets ontbreken — draai eerst: npm run cap:copy');
t('C1 OCR-controle slaagt op android/app/src/main/assets/public', function () { geenFouten(V.verify('native', ANDROID), 'android'); });
t('C2 Android-kopie van de taaldata is byte-exact gunzip(canonieke .gz)', function () {
  assert.strictEqual(sha(fs.readFileSync(path.join(ANDROID, 'core', 'vendor', 'eng.traineddata'))), sha(UITGEPAKT));
});
t('C3 Android-index.html is byte-identiek aan www/index.html', function () {
  assert.ok(fs.readFileSync(path.join(ANDROID, 'index.html')).equals(fs.readFileSync(path.join(WWW, 'index.html'))));
});

/* ══ D. FOUTE COMBINATIES MOETEN FALEN ══════════════════════════════════════ */
console.log('\nD. Foute combinaties');
function faalt(res, patroon) {
  assert.ok(res.errors.length > 0, 'had moeten falen');
  assert.ok(res.errors.some(function (e) { return patroon.test(e); }), 'onverwachte foutmelding: ' + res.errors.join(' | '));
}
t('D1 gzip:true + alleen eng.traineddata -> FAIL (de oorspronkelijke APK-fout)', function () {
  faalt(V.checkPackaging(html(true), met({ 'core/vendor/eng.traineddata': RAW }), 'native'), /eng\.traineddata\.gz.*niet verpakt.*wel aanwezig/);
});
t('D2 gzip weggelaten (= true) + alleen eng.traineddata -> FAIL', function () {
  faalt(V.checkPackaging(html(null), met({ 'core/vendor/eng.traineddata': RAW }), 'native'), /niet verpakt/);
});
t('D3 gzip:false + alleen eng.traineddata.gz -> FAIL', function () {
  faalt(V.checkPackaging(html(false), met({ 'core/vendor/eng.traineddata.gz': GZ }), 'web'), /eng\.traineddata".*niet verpakt.*wel aanwezig/);
});
t('D4 gzip:false + eng.traineddata met gzip-inhoud -> FAIL', function () {
  faalt(V.checkPackaging(html(false), met({ 'core/vendor/eng.traineddata': GZ }), 'native'), /gzip-gecomprimeerd terwijl gzip:false/);
});
t('D5 gzip:true + .gz-naam zonder gzip-inhoud -> FAIL', function () {
  faalt(V.checkPackaging(html(true), met({ 'core/vendor/eng.traineddata.gz': RAW }), 'web'), /geen gzip-inhoud/);
});
t('D6 native bundel met een .gz-bestand -> FAIL (Android hernoemt het)', function () {
  faalt(V.checkPackaging(html(false), met({ 'core/vendor/eng.traineddata': RAW, 'core/x/nld.traineddata.gz': GZ }), 'native'), /pakt \.gz-assets uit/);
});
t('D7 geen Tesseract-config gevonden -> FAIL (controle mag niet leeg slagen)', function () {
  faalt(V.checkPackaging('<html></html>', met({}), 'native'), /Geen Tesseract-configuratie/);
});
t('D8 taaldata ontbreekt volledig -> FAIL', function () {
  faalt(V.checkPackaging(html(false), met({}), 'native'), /niet verpakt\.$/);
});
t('D9 correcte combinaties slagen (native: raw + gzip:false; web: .gz + gzip:true)', function () {
  geenFouten(V.checkPackaging(html(false), met({ 'core/vendor/eng.traineddata': RAW }), 'native'), 'native');
  geenFouten(V.checkPackaging(html(true), met({ 'core/vendor/eng.traineddata.gz': GZ }), 'web'), 'web');
});

/* ══ E. DE APK ZELF ═════════════════════════════════════════════════════════ */
console.log('\nE. APK-inspectie');
t('E1 APK met gzip:false + eng.traineddata slaagt', function () {
  geenFouten(nepApk(html(false), { 'core/vendor/eng.traineddata': RAW }), 'apk');
});
t('E2 APK met gzip:true + alleen eng.traineddata faalt (regressie van v4.70.7-ee277c920)', function () {
  faalt(nepApk(html(true), { 'core/vendor/eng.traineddata': RAW }), /niet verpakt.*wel aanwezig/);
});
t('E3 de APK-workflow inspecteert de gebouwde APK met deze controle', function () {
  var wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'android-debug-apk.yml'), 'utf8');
  assert.ok(/node tools\/verify-ocr-packaging\.js --apk "?\$APK"?/.test(wf), 'APK-controle ontbreekt in android-debug-apk.yml');
  assert.ok(wf.indexOf('verify-ocr-packaging.js --apk') > wf.indexOf('gradlew assembleDebug'), 'APK-controle moet na de build staan');
});
t('E4 build:www voert de controle zelf uit en sluit core/fixtures uit', function () {
  var b = fs.readFileSync(path.join(ROOT, 'scripts', 'build-www.mjs'), 'utf8');
  assert.ok(b.indexOf("verify-ocr-packaging.js") > 0 && b.indexOf("naam === 'fixtures'") > 0 && b.indexOf('gunzipSync') > 0);
});

console.log('\n========================================================');
console.log('fAndroidOcrAssetPackaging.test.js — ' + n + ' tests geslaagd');
