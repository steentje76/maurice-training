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
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'www');

// Web-assets die de app runtime nodig heeft (allowlist; geen node_modules/android/docs/etc.)
const COPY_FILES = [
  'index.html', 'sw.js', 'manifest.json',
  'icon-192.png', 'icon-512.png', 'logo-wordmark.png'
];
// v4.49.0 — exercise-catalog.json (296 kB) en exercise-intelligence_6.json (8,3 MB) zijn
// hier WEGGEHAALD, op grond van een meting en niet op gevoel.
//
// Beide werden meegekopieerd naar www/ en daarmee naar het Android-artefact, maar er is
// geen enkele verwijzing naar: niet in index.html, niet in sw.js, niet in core/*.js, niet
// in de service-worker-precache. De catalogus zit als constante EX_CATALOG ín index.html;
// de intelligentie-bestanden worden nergens opgehaald. Netto was 8,6 MB van de 14 MB
// artefact-omvang dood gewicht — ruim 60 procent.
//
// De bestanden blijven gewoon in de repository staan: ze zijn de bron waaruit EX_CATALOG
// wordt gegenereerd en horen daar. Ze horen alleen niet in wat de gebruiker downloadt.
// Gaat de app ze op enig moment WEL runtime ophalen, dan hoort de betreffende naam hier
// terug — core/fPlatformGrens.test.js bewaakt beide kanten van die afspraak.
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
function overslaan(naam) {
  return naam.endsWith('.test.js');
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
  }

  console.log('[build:www] KLAAR -> www/');
}

main().catch((e) => { console.error('[build:www] FOUT:', e); process.exit(1); });
