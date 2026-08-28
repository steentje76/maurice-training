/* TrainingKompas — RELEASE GATE (node, standalone). v2 — DISCOVERY-BASED (P0-003 fix).
 * Draai vanuit repo-root: node core/release-gate.js
 *
 * P0-003-AANLEIDING: de vorige (v1, F1.10) gate had een HARDCODED lijst van 10
 * testbestanden. 65 van de ~75 bestaande core/*.test.js-bestanden draaiden dus
 * NOOIT mee in de merge-poort — een regressie daarin blokkeerde niets. Deze v2
 * ONTDEKT automatisch elk *.test.js-bestand in core/, zodat een nieuw testbestand
 * nooit meer vergeten kan worden. Nieuw toegevoegde security-tests uit de P0-002
 * closure (fCoachProxySecurity, fGymTeamSecurity, fGymsRlsSecurity,
 * fWearableAuthSecurity, fDeleteAccountSecurity) lopen hierdoor automatisch mee,
 * zonder dat ze hier met naam genoemd hoeven te worden.
 *
 * Vier groepen (zie ENV_DEPENDENT hieronder voor de enige bekende uitzondering):
 *   GROUP A — PURE / ALWAYS RUN: alle ontdekte core/*.test.js, standaard.
 *   GROUP B — ENVIRONMENT-DEPENDENT: draait alleen als de vereiste prerequisite
 *             aanwezig is; anders zichtbaar SKIPPED (nooit stilzwijgend groen).
 *   GROUP C — INTEGRATION: valt hier automatisch óók onder GROUP A, want de
 *             bestaande integratietests (bv. fWearableSyncHandler) zijn zelf al
 *             PURE-met-gemockte-fetch en hebben geen externe dependency nodig.
 *   GROUP D — EXPLICITLY EXCLUDED: leeg. Alles draait mee, of is expliciet als
 *             GROUP B gemarkeerd met reden. Geen enkel bestand wordt stilzwijgend
 *             overgeslagen.
 *
 * Exit 0 = groen (geen enkele FAIL; SKIPPED is toegestaan en wordt apart getoond).
 * Exit 1 = BLOCKER (merge/deploy geblokkeerd). */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// ---- GROUP B: bekende environment-dependent tests + hun prerequisite -------
const ENV_DEPENDENT = {
  'fAndroidRelease.test.js': {
    reason: 'vereist een gesynchroniseerde Android-buildmap (npm run cap:sync); niet aanwezig in een schone checkout/CI zonder Android-toolchain.',
    prerequisiteExists: () => fs.existsSync(path.join(ROOT, 'android/app/src/main/assets/public/index.html'))
  }
};

function runFile(label, absPath) {
  try {
    const out = execFileSync('node', [absPath], { cwd: ROOT, encoding: 'utf8' });
    const m = out.match(/(?:RESULTAAT|Resultaat):\s*([0-9]+)\s*geslaagd,\s*([0-9]+)\s*mislukt/);
    const detail = m ? (m[1] + '/' + (Number(m[1]) + Number(m[2]))) : 'ok';
    return { label, status: 'PASS', detail };
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    const m = out.match(/(?:RESULTAAT|Resultaat):\s*([0-9]+)\s*geslaagd,\s*([0-9]+)\s*mislukt/);
    return { label, status: 'FAIL', detail: m ? (m[1] + ' geslaagd / ' + m[2] + ' mislukt') : (out.trim().split('\n').pop() || 'FAIL').slice(0, 160) };
  }
}

function checkSyntax() {
  try {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m, i = 0, errs = 0;
    while ((m = re.exec(html))) { if (!m[1].trim()) continue; i++; try { new Function(m[1]); } catch (e) { errs++; } }
    return { label: 'syntax index.html (' + i + ' scripts)', status: errs === 0 ? 'PASS' : 'FAIL', detail: errs === 0 ? 'ok' : (errs + ' syntax-errors') };
  } catch (e) { return { label: 'syntax index.html', status: 'FAIL', detail: String(e).slice(0, 80) }; }
}
function checkPurity() {
  const forbidden = ['document', 'supabase', 'fetch(', 'localStorage', 'sessionStorage', 'querySelector', '.from(', 'XMLHttpRequest'];
  const files = ['core/calculation.js', 'core/decision.js', 'core/cardio.js', 'core/progression.js', 'core/coaching.js', 'core/movement.js', 'core/onboarding.js', 'core/athleteConstraints.js'];
  let bad = [];
  files.forEach(f => {
    const raw = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    forbidden.forEach(tok => { if (raw.includes(tok)) bad.push(f + ':' + tok); });
  });
  return { label: 'Calculation/Decision Core purity', status: bad.length === 0 ? 'PASS' : 'FAIL', detail: bad.length ? bad.join(', ') : 'geen DOM/DB/network' };
}

// ---- DISCOVERY --------------------------------------------------------------
const coreDir = path.join(ROOT, 'core');
const discovered = fs.readdirSync(coreDir).filter(f => f.endsWith('.test.js')).sort();

const results = [];
results.push(runFile('logic_tests (regressie)', path.join(ROOT, 'logic_tests.js')));

discovered.forEach((fname) => {
  const label = 'core/' + fname.replace(/\.test\.js$/, '') + '.test';
  const envRule = ENV_DEPENDENT[fname];
  if (envRule && !envRule.prerequisiteExists()) {
    results.push({ label, status: 'SKIPPED', detail: 'reason: ' + envRule.reason });
    return;
  }
  results.push(runFile(label, path.join(coreDir, fname)));
});

results.push(checkSyntax());
results.push(checkPurity());

console.log('\n══════ TRAININGSKOMPAS RELEASE GATE v2 (discovery-based, P0-003) ══════');
results.forEach(r => {
  const icon = r.status === 'PASS' ? '🟢' : r.status === 'SKIPPED' ? '🟡' : '🔴';
  console.log('  ' + icon + ' ' + r.label.padEnd(38) + ' ' + (r.status === 'SKIPPED' ? 'SKIPPED — ' + r.detail : r.detail));
});
const failed = results.filter(r => r.status === 'FAIL');
const skipped = results.filter(r => r.status === 'SKIPPED');
console.log('─'.repeat(70));
console.log('Testbestanden ontdekt in core/: ' + discovered.length + ' (+ logic_tests.js, + 2 statische checks)');
console.log('Automatisch uitgevoerd: ' + (results.length - skipped.length) + '  |  Geskipt (zichtbaar): ' + skipped.length + '  |  Gefaald: ' + failed.length);
if (failed.length) {
  console.log('🔴 RELEASE GEBLOKKEERD — ' + failed.length + ' gate(s) rood. Niet mergen/deployen.');
  process.exit(1);
}
console.log('🟢 RELEASE GATE GROEN — alle uitgevoerde poorten geslaagd. Merge/deploy toegestaan.');
console.log('   Herinnering: core gewijzigd? sw-guard is groen ⇒ CORE_SIG + CACHE_STATIC zijn gebumpt.');
