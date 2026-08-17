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
  'icon-192.png', 'icon-512.png', 'logo-wordmark.png',
  'exercise-catalog.json', 'exercise-intelligence_6.json'
];
const COPY_DIRS = ['core', 'videos'];

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function rimraf(p) {
  if (await exists(p)) await fs.rm(p, { recursive: true, force: true });
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
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
