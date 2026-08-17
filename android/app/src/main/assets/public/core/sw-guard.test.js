/* TrainingKompas — F1.9 SERVICE-WORKER CACHE GUARD (node, standalone).
 * Draai: node core/sw-guard.test.js
 * Doel: voorkomt dat een core/calculation.js- of core/decision.js-wijziging live gaat
 * ZONDER dat de service worker de nieuwe core aan bestaande browsers uitserveert.
 * Mechanisme: CORE_SIG in sw.js moet gelijk zijn aan de (CRLF-agnostische) hash van de core.
 * Wijzigt de core -> hash verandert -> deze test FAALT tot je CORE_SIG bijwerkt in sw.js.
 * Werk je CORE_SIG bij, bump dan ook CACHE_STATIC (anders serveert de SW de oude precache). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

const ROOT = path.join(__dirname, '..');
const CORE_FILES = ['core/calculation.js', 'core/decision.js', 'core/cardio.js', 'core/progression.js', 'core/coaching.js', 'core/movement.js', 'core/onboarding.js', 'core/athleteConstraints.js'];
function norm(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r/g, ''); }
const combined = CORE_FILES.map(norm).join('\n');
const sig = crypto.createHash('sha256').update(combined).digest('hex').slice(0, 16);

const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const mSig = sw.match(/CORE_SIG\s*=\s*['"]([0-9a-f]+)['"]/);
const mStatic = sw.match(/CACHE_STATIC\s*=\s*['"]([^'"]+)['"]/);

console.log('\n[F1.9] Service-worker cache guard');
console.log('  berekende CORE_SIG: ' + sig + (mSig ? ('  |  sw.js CORE_SIG: ' + mSig[1]) : '  |  sw.js CORE_SIG: (ontbreekt)'));
console.log('  sw.js CACHE_STATIC: ' + (mStatic ? mStatic[1] : '(ontbreekt)'));

T('sw.js bevat CORE_SIG', () => ok(!!mSig, 'CORE_SIG ontbreekt in sw.js'));
T('CORE_SIG === hash(core) — core-wijziging vereist sw.js-update', () => {
  ok(mSig && mSig[1] === sig, 'MISMATCH: werk CORE_SIG bij naar "' + sig + '" ÉN bump CACHE_STATIC in sw.js');
});
T('elke core-file staat in STATIC_ASSETS-precache', () => {
  CORE_FILES.forEach(f => ok(sw.indexOf("'/" + f + "'") !== -1, 'niet geprecached: /' + f));
});
T('activate verwijdert oude caches (CACHE_STATIC filter aanwezig)', () => {
  ok(/k\s*!==\s*CACHE_STATIC/.test(sw), 'activate-cleanup mist CACHE_STATIC-filter');
});

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ STOP: SW-cache guard faalt (core gewijzigd zonder sw.js-bump?).'); process.exit(1); }
console.log('✅ SW-cache guard groen — core en service worker zijn in sync.');
