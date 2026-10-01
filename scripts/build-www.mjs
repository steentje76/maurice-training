/*
 * build-www.mjs — assembleert de bestaande web-assets in www/ en bundelt de
 * native BLE-transportlaag tot www/native-transport.js, met een <script>-tag
 * die ALLEEN in de native www/-kopie wordt geïnjecteerd.
 *
 * De repo-index.html / sw.js / core/*.js worden NIET gewijzigd -> geen SW-bump,
 * geen CORE_SIG-impact, Netlify-web ongewijzigd.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { gunzipSync } from 'zlib';
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'www');

// Web-assets die de app runtime nodig heeft (allowlist; geen node_modules/android/docs/etc.)
const COPY_FILES = [
  'index.html', 'sw.js', 'manifest.json',
  'icon-192.png', 'icon-512.png', 'logo-wordmark.png',
  'exercise-catalog.json', 'exercise-intelligence_6.json'
];
// RC0 — VIDEO'S WORDEN NIET MEEGEBUNDELD.
// videos/ is 437 MB. Meegebundeld levert dat een AAB van ruim 450 MB op, ver boven het
// Play-plafond van 200 MB voor de basismodule; de upload zou domweg worden geweigerd.
// De service worker haalt video's al on-demand op en cachet ze met een LRU-plafond van
// 250 MB (CACHE_VIDEOS), dus het gedrag is op Android identiek aan het web: eerste keer
// streamen, daarna offline beschikbaar. sw.js bepaalt in de native app zelf van welke
// oorsprong hij ze haalt (zie MEDIA_ORIGIN daar).
const COPY_DIRS = ['core'];

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function rimraf(p) {
  if (await exists(p)) await fs.rm(p, { recursive: true, force: true });
}

// RC0: testcode hoort niet in een release-artefact. core/ bevat 60+ *.test.js
// (ruim 300 kB) die anders integraal in de APK/AAB meegingen — onnodige omvang en
// onnodig veel interne details in een publiek gedistribueerd bestand.
// OCR-PACKAGING: core/fixtures/ is uitsluitend testmateriaal (o.a. tessdata/*.traineddata.gz
// voor de Node-integratietests). Geen runtime-code verwijst ernaar; meebundelen kostte ruim
// 11 MB aan uitgepakte taaldata in de APK.
function overslaan(naam) {
  return naam.endsWith('.test.js') || naam === 'fixtures';
}
async function alleBestanden(dir, rel = '') {
  const uit = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) uit.push(...await alleBestanden(path.join(dir, e.name), r));
    else uit.push(r);
  }
  return uit;
}
async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (overslaan(e.name)) continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

async function main() {
  console.log('[build:www] schoonmaken www/');
  await rimraf(WWW);
  await fs.mkdir(WWW, { recursive: true });

  // 1) web-assets kopiëren
  for (const f of COPY_FILES) {
    const src = path.join(ROOT, f);
    if (await exists(src)) { await fs.copyFile(src, path.join(WWW, f)); }
    else console.warn('[build:www] overslaan (ontbreekt): ' + f);
  }
  for (const dir of COPY_DIRS) {
    const src = path.join(ROOT, dir);
    if (await exists(src)) { await copyDir(src, path.join(WWW, dir)); console.log('[build:www] map gekopieerd: ' + dir); }
    else console.warn('[build:www] overslaan (map ontbreekt): ' + dir);
  }

  // 1b) OCR-taaldata: expliciet uitpakken voor de native bundel.
  // De Android Gradle Plugin pakt bij het samenvoegen van assets ELK .gz-bestand uit en haalt
  // de extensie weg. core/vendor/eng.traineddata.gz kwam zo als eng.traineddata in de APK,
  // terwijl de app (gzip:true) om eng.traineddata.gz vroeg -> 404 -> OCR laadde nooit.
  // Daarom doet deze build die stap zelf, zichtbaar en deterministisch: de ene canonieke bron
  // (de .gz in de repo) wordt hier uitgepakt, en de www-kopie van index.html krijgt gzip:false
  // (stap 3). www/ is daarmee byte-voor-byte wat in de APK belandt. Web/PWA blijft ongemoeid.
  for (const rel of await alleBestanden(WWW)) {
    if (!rel.endsWith('.gz')) continue;
    if (!rel.endsWith('.traineddata.gz')) {
      throw new Error('onverwacht .gz-bestand in www/: ' + rel + ' — Android pakt .gz-assets uit en hernoemt ze; sluit het uit of verwerk het hier expliciet.');
    }
    const gz = path.join(WWW, rel);
    await fs.writeFile(gz.slice(0, -3), gunzipSync(await fs.readFile(gz)));
    await fs.rm(gz);
    console.log('[build:www] OCR-taaldata uitgepakt: ' + rel + ' -> ' + rel.slice(0, -3));
  }

  // 2) native-transport bundelen (bootstrap -> IIFE)
  console.log('[build:www] esbuild native-transport.js');
  await build({
    entryPoints: [path.join(ROOT, 'native', 'src', 'bootstrap.js')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2017'],
    outfile: path.join(WWW, 'native-transport.js'),
    legalComments: 'none',
    logLevel: 'info'
  });

  // 3) <script>-tag injecteren in de www-kopie van index.html (repo blijft ongemoeid)
  const idxPath = path.join(WWW, 'index.html');
  if (await exists(idxPath)) {
    let html = await fs.readFile(idxPath, 'utf8');
    const tag = '<script src="native-transport.js"></script>';
    if (!html.includes('native-transport.js')) {
      if (html.includes('</body>')) html = html.replace('</body>', '  ' + tag + '\n</body>');
      else html += '\n' + tag + '\n';
      await fs.writeFile(idxPath, html);
      console.log('[build:www] native-transport script-tag geïnjecteerd in www/index.html');
    }

    // 3b) Tesseract in de native kopie laten vragen om de uitgepakte taaldata (zie stap 1b).
    html = await fs.readFile(idxPath, 'utf8');
    let ocrPatches = 0;
    html = html.replace(/(Tesseract\.(?:recognize|createWorker)\([^;]*?gzip\s*:\s*)true/g, (_, voor) => { ocrPatches++; return voor + 'false'; });
    if (ocrPatches === 0) {
      throw new Error('geen Tesseract-aanroep met gzip:true gevonden in index.html — de OCR-configuratie is gewijzigd; werk scripts/build-www.mjs (stap 1b/3b) bij.');
    }
    await fs.writeFile(idxPath, html);
    console.log('[build:www] Tesseract gzip:true -> gzip:false in www/index.html (' + ocrPatches + 'x)');
  }

  // 4) Bewijs dat runtimeconfig en verpakte taaldata overeenkomen; anders faalt de build hier
  //    en niet pas op een toestel.
  const { verify } = createRequire(import.meta.url)('../tools/verify-ocr-packaging.js');
  const ocr = verify('native', WWW);
  if (ocr.errors.length) throw new Error('OCR-packaging klopt niet:\n  - ' + ocr.errors.join('\n  - '));
  console.log('[build:www] OCR-packaging gecontroleerd: runtimeconfig komt overeen met de verpakte taaldata');

  console.log('[build:www] KLAAR -> www/');
}

main().catch((e) => { console.error('[build:www] FOUT:', e); process.exit(1); });
