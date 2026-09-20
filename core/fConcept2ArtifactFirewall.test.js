/* Gate B.5 — DEPLOYMENT/ARTIFACT FIREWALL.
 * De eerdere runtime-firewall toetste de REPO-bron en gaf daardoor valse dekking:
 * broncode kan kloppen terwijl het gedeployde artefact verouderd of onvolledig is.
 * Deze suite draait een VERSE build en toetst uitsluitend de output.
 * (De hypothese dat build-www de modules niet kopieerde is WEERLEGD: COPY_DIRS=['core']
 *  kopieert de hele map. De eerdere waarneming kwam uit een stale www/.) */
const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')');
const ROOT = path.resolve('.');
const WWW = path.join(ROOT, 'www');

// ── verse build afdwingen: nooit op een bestaande www/ vertrouwen ────────────
fs.rmSync(WWW, { recursive: true, force: true });
ok(!fs.existsSync(WWW), 'A1: oude www/ verwijderd vóór de build');
execFileSync('npm', ['run', 'build:www'], { cwd: ROOT, stdio: 'pipe' });
ok(fs.existsSync(WWW), 'A2: verse build heeft www/ geproduceerd');

const read = f => fs.readFileSync(path.join(WWW, f), 'utf8');
const has = f => fs.existsSync(path.join(WWW, f));

// ── B. de Gate-B modules zitten in het artefact ─────────────────────────────
ok(has('core/concept2Csafe.js'), 'B1: www/core/concept2Csafe.js aanwezig');
ok(has('core/concept2Programming.js'), 'B2: www/core/concept2Programming.js aanwezig');
ok(has('core/concept2Live.js'), 'B3: www/core/concept2Live.js aanwezig (Gate A)');
ok(!has('core/fConcept2Csafe.test.js'), 'B4: testcode zit NIET in het release-artefact');

// ── C. script-tags en dependency-volgorde in de GEBOUWDE index ──────────────
const idx = read('index.html');
const iC = idx.indexOf('core/concept2Csafe.js');
const iP = idx.indexOf('core/concept2Programming.js');
const iL = idx.indexOf('core/concept2Live.js');
ok(iC > -1, 'C1: gebouwde index laadt concept2Csafe.js');
ok(iP > -1, 'C2: gebouwde index laadt concept2Programming.js');
ok(iL > -1 && iL < iC, 'C3: concept2Live blijft vóór de Gate-B modules');
ok(iC < iP, 'C4: Csafe wordt VOOR Programming geladen');
ok(iP < idx.indexOf('Concept2Programming.createProgrammingController'), 'C5: modules geladen vóór eerste gebruik');

// ── D. fail-closed en lifecycle-owner zitten in het artefact ────────────────
ok(idx.indexOf('var _c2rt={};') > -1, 'D1: runtime-owner _c2rt in het artefact');
ok(idx.indexOf('_c2rtTeardown') > -1, 'D2: teardown in het artefact');
ok(idx.indexOf('unavailable:true') > -1, 'D3: fail-closed pad in het artefact');
ok(idx.indexOf('tkErgProgramPm5IfNeeded') > -1, 'D4: programmeerhelper in het artefact');

// ── E. de gebundelde native runtime ─────────────────────────────────────────
const bundle = read('native-transport.js');
ok(bundle.indexOf('setProgrammingSource') > -1, 'E1: Developer Mode API exposeert setProgrammingSource');
ok(bundle.indexOf('writeControlFrame') > -1, 'E2: transport exposeert writeControlFrame');
ok(bundle.indexOf('setControlResponseHandler') > -1, 'E3: CE060022-routing aanwezig');
ok(bundle.indexOf('getControlContext') > -1, 'E4: generation/device-context aanwezig');
ok(bundle.indexOf('BleClient.write') > -1, 'E5: productie-gateway schrijft via BleClient.write');
ok(bundle.indexOf('Workout control (PM5 programmering)') > -1, 'E6: Developer Mode Workout Control-blok aanwezig');

// ── F. staleness: het artefact moet de HUIDIGE bron weerspiegelen ───────────
const srcCsafe = fs.readFileSync(path.join(ROOT, 'core/concept2Csafe.js'), 'utf8');
eq(read('core/concept2Csafe.js').length, srcCsafe.length, 'F1: concept2Csafe.js in artefact is niet stale');
const srcProg = fs.readFileSync(path.join(ROOT, 'core/concept2Programming.js'), 'utf8');
eq(read('core/concept2Programming.js').length, srcProg.length, 'F2: concept2Programming.js in artefact is niet stale');

// ── G. het browserpad werkt op de GEBOUWDE bestanden ────────────────────────
const vm = require('vm');
const sb = { console, setTimeout, clearTimeout, Date, JSON, Math, DataView, Uint8Array, ArrayBuffer, Promise };
sb.self = sb; sb.window = sb; sb.global = sb; vm.createContext(sb);
vm.runInContext(read('core/concept2Csafe.js'), sb, { filename: 'www/concept2Csafe.js' });
vm.runInContext(read('core/concept2Programming.js'), sb, { filename: 'www/concept2Programming.js' });
ok(sb.Concept2Csafe && typeof sb.Concept2Csafe.buildFixedDistanceWorkout === 'function', 'G1: Concept2Csafe werkt vanuit het artefact');
ok(sb.Concept2Programming && typeof sb.Concept2Programming.createProgrammingController === 'function', 'G2: Concept2Programming werkt vanuit het artefact');
const built = sb.Concept2Csafe.buildFixedDistanceWorkout(1000, {});
ok(built && built.ok === true && Array.isArray(built.frame), 'G3: gebouwde CSAFE-core levert een 1000 m frame');
let be = false; const f = built.frame;
for (let i = 0; i + 1 < f.length; i++) if (f[i] === 0xE8 && f[i+1] === 0x03) be = true;
ok(be, 'G4: 1000 m LITTLE-endian (E8 03) in het frame uit het artefact');

console.log('Concept2 artifact firewall: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
