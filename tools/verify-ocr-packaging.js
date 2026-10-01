#!/usr/bin/env node
/* verify-ocr-packaging.js — bewijst dat de Tesseract-runtimeconfiguratie overeenkomt met de
 * taaldata die werkelijk is verpakt.
 *
 * AANLEIDING. tesseract.js vraagt `${langPath}/${lang}.traineddata` + ('.gz' als gzip !== false)
 * op en faalt hard op een 404. De Android Gradle Plugin pakt bij het samenvoegen van assets elk
 * `.gz`-bestand uit en haalt de extensie weg. `core/vendor/eng.traineddata.gz` kwam daardoor
 * als `eng.traineddata` in de APK terecht, terwijl de app (gzip:true) om `eng.traineddata.gz`
 * vroeg: voedingslabel-OCR kon in de APK zijn taaldata niet laden.
 *
 * GEBRUIK
 *   node tools/verify-ocr-packaging.js --web <map>          web/PWA-bron (repo-root)
 *   node tools/verify-ocr-packaging.js --native-dir <map>   www/ of android/.../assets/public
 *   node tools/verify-ocr-packaging.js --apk <bestand.apk>  de gebouwde APK zelf
 *
 * Geen externe afhankelijkheden: de APK wordt met een minimale ZIP-lezer geopend.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

/* ── Tesseract-configuraties uit de HTML halen ───────────────────────────── */
function parseTesseractConfigs(html) {
  var out = [];
  var re = /Tesseract\.(recognize|createWorker)\s*\(/g;
  var m;
  while ((m = re.exec(html))) {
    var seg = html.slice(m.index, m.index + 1200);
    var end = seg.indexOf('})');
    if (end >= 0) seg = seg.slice(0, end + 2);
    var lang = (seg.match(/\(\s*(?:[^,'"]+,\s*)?['"]([a-z_+]+)['"]/i) || [])[1] || null;
    var pick = function (key) {
      var r = seg.match(new RegExp(key + '\\s*:\\s*[\'"]([^\'"]+)[\'"]'));
      return r ? r[1] : null;
    };
    var gz = seg.match(/gzip\s*:\s*(true|false)/);
    out.push({
      call: m[1],
      langs: lang ? lang.split('+') : [],
      langPath: pick('langPath'),
      workerPath: pick('workerPath'),
      corePath: pick('corePath'),
      // tesseract.js: gzip is true tenzij expliciet false.
      gzip: gz ? gz[1] === 'true' : true,
      gzipExplicit: !!gz
    });
  }
  return out;
}

function isGzip(buf) { return !!buf && buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b; }
function clean(p) { return String(p).replace(/^\.?\//, '').replace(/\/$/, ''); }

/* ── De eigenlijke controle. `source` = { has(p), head(p), list() } ──────── */
function checkPackaging(html, source, mode) {
  var errors = [];
  var configs = parseTesseractConfigs(html);
  if (!configs.length) errors.push('Geen Tesseract-configuratie gevonden in index.html — de controle kan niets bewijzen.');
  configs.forEach(function (c, i) {
    var tag = 'Tesseract-config #' + (i + 1) + ': ';
    if (!c.langs.length) errors.push(tag + 'taalcode niet herkend.');
    if (!c.langPath) { errors.push(tag + 'langPath ontbreekt (taaldata zou van een CDN komen; de app hoort offline te bundelen).'); return; }
    if (/^https?:/i.test(c.langPath)) { errors.push(tag + 'langPath is een externe URL: ' + c.langPath); return; }
    c.langs.forEach(function (lang) {
      var base = clean(c.langPath) + '/' + lang + '.traineddata';
      var wanted = base + (c.gzip ? '.gz' : '');
      var other = base + (c.gzip ? '' : '.gz');
      if (!source.has(wanted)) {
        errors.push(tag + 'runtime vraagt "' + wanted + '" (gzip:' + c.gzip + ') maar dat bestand is niet verpakt' +
          (source.has(other) ? '; wel aanwezig: "' + other + '" — naam/compressievorm komt niet overeen met de runtimeconfig.' : '.'));
        return;
      }
      var gz = isGzip(source.head(wanted));
      if (c.gzip && !gz) errors.push(tag + '"' + wanted + '" heeft geen gzip-inhoud terwijl gzip:true.');
      if (!c.gzip && gz) errors.push(tag + '"' + wanted + '" is gzip-gecomprimeerd terwijl gzip:false.');
    });
    if (c.workerPath && !source.has(clean(c.workerPath))) errors.push(tag + 'workerPath "' + c.workerPath + '" is niet verpakt.');
    if (c.corePath) {
      var core = clean(c.corePath) + '/';
      var hit = source.list().some(function (f) { return f.indexOf(core) === 0 && /\.wasm\.js$/.test(f); });
      if (!hit) errors.push(tag + 'corePath "' + c.corePath + '" bevat geen tesseract-core *.wasm.js.');
    }
  });
  if (mode === 'native') {
    source.list().filter(function (f) { return /\.gz$/i.test(f); }).forEach(function (f) {
      errors.push('Native bundel bevat "' + f + '": de Android Gradle Plugin pakt .gz-assets uit en hernoemt ze, ' +
        'dus dit bestand bestaat in de APK niet onder deze naam.');
    });
  }
  return { configs: configs, errors: errors };
}

/* ── Bronnen ─────────────────────────────────────────────────────────────── */
function dirSource(root, shallow) {
  var cache = null;
  function walk(d, rel, acc) {
    fs.readdirSync(d, { withFileTypes: true }).forEach(function (e) {
      var r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), r, acc); else acc.push(r);
    });
    return acc;
  }
  return {
    has: function (p) { var f = path.join(root, p); return fs.existsSync(f) && fs.statSync(f).isFile(); },
    head: function (p) { var fd = fs.openSync(path.join(root, p), 'r'); var b = Buffer.alloc(2); fs.readSync(fd, b, 0, 2, 0); fs.closeSync(fd); return b; },
    // web-modus: alleen core/ doorlopen (de repo-root bevat node_modules, android, video's).
    list: function () { if (!cache) cache = shallow ? walk(path.join(root, 'core'), 'core', []) : walk(root, '', []); return cache; },
    read: function (p) { return fs.readFileSync(path.join(root, p)); }
  };
}

/* Minimale ZIP-lezer (central directory; stored + deflate). Voldoende voor een APK. */
function readZip(buf) {
  var eocd = -1;
  for (var i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Geen geldig ZIP/APK-bestand (EOCD niet gevonden).');
  var count = buf.readUInt16LE(eocd + 10);
  var off = buf.readUInt32LE(eocd + 16);
  var entries = {};
  for (var n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('Beschadigde central directory.');
    var method = buf.readUInt16LE(off + 10);
    var csize = buf.readUInt32LE(off + 20);
    var nlen = buf.readUInt16LE(off + 28), elen = buf.readUInt16LE(off + 30), clen = buf.readUInt16LE(off + 32);
    var lho = buf.readUInt32LE(off + 42);
    var name = buf.toString('utf8', off + 46, off + 46 + nlen);
    entries[name] = { method: method, csize: csize, lho: lho };
    off += 46 + nlen + elen + clen;
  }
  function data(name) {
    var e = entries[name];
    var start = e.lho + 30 + buf.readUInt16LE(e.lho + 26) + buf.readUInt16LE(e.lho + 28);
    var raw = buf.subarray(start, start + e.csize);
    if (e.method === 0) return raw;
    if (e.method === 8) return zlib.inflateRawSync(raw);
    throw new Error('Niet-ondersteunde compressiemethode ' + e.method + ' voor ' + name);
  }
  return { names: Object.keys(entries), data: data };
}
function apkSource(apkPath) {
  var zip = readZip(fs.readFileSync(apkPath));
  var PREFIX = 'assets/public/';
  var files = zip.names.filter(function (n) { return n.indexOf(PREFIX) === 0; }).map(function (n) { return n.slice(PREFIX.length); });
  var set = {}; files.forEach(function (f) { set[f] = true; });
  return {
    has: function (p) { return !!set[p]; },
    head: function (p) { return zip.data(PREFIX + p).subarray(0, 2); },
    list: function () { return files; },
    read: function (p) { return zip.data(PREFIX + p); }
  };
}

function verify(mode, target) {
  var source = mode === 'apk' ? apkSource(target) : dirSource(target, mode === 'web');
  if (!source.has('index.html')) return { configs: [], errors: ['index.html ontbreekt in ' + target] };
  var html = source.read('index.html').toString('utf8');
  return checkPackaging(html, source, mode === 'web' ? 'web' : 'native');
}

module.exports = { parseTesseractConfigs: parseTesseractConfigs, checkPackaging: checkPackaging, isGzip: isGzip,
  dirSource: dirSource, apkSource: apkSource, readZip: readZip, verify: verify };

if (require.main === module) {
  var arg = process.argv[2], target = process.argv[3];
  var mode = { '--web': 'web', '--native-dir': 'native', '--apk': 'apk' }[arg];
  if (!mode || !target) {
    console.error('Gebruik: node tools/verify-ocr-packaging.js (--web <map> | --native-dir <map> | --apk <bestand.apk>)');
    process.exit(2);
  }
  var res;
  try { res = verify(mode, target); } catch (e) { console.error('[ocr-packaging] FOUT: ' + e.message); process.exit(1); }
  res.configs.forEach(function (c, i) {
    console.log('[ocr-packaging] config #' + (i + 1) + ': langs=' + c.langs.join('+') + ' langPath=' + c.langPath + ' gzip=' + c.gzip);
  });
  if (res.errors.length) {
    res.errors.forEach(function (e) { console.error('[ocr-packaging] FAIL: ' + e); });
    process.exit(1);
  }
  console.log('[ocr-packaging] PASS (' + mode + '): ' + target);
}
