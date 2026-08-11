/* TrainingKompas — F1.10 RELEASE GATE (node, standalone).
 * Draai vanuit repo-root: node core/release-gate.js
 * Eén poort die de Definition-of-Done afdwingt vóór een merge/deploy:
 *   1. logic_tests.js                (regressie)
 *   2. core/calculation.test.js      (calc: golden + old===new + purity)
 *   3. core/decision.test.js         (decision + evidence + old===new)
 *   4. core/sw-guard.test.js         (core-wijziging vereist sw.js CACHE_STATIC + CORE_SIG bump)
 *   5. syntax-check van index.html   (alle inline <script> parsen)
 *   6. Calculation Core purity        (geen DOM/DB/network in core/*.js)
 * Exit 0 = groen; exit 1 = BLOCKER (merge/deploy geblokkeerd).
 * TK_INDEX kan naar de originele blob wijzen voor een echte old===new (anders default ../index.html). */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function run(label, file, env) {
  try {
    const out = execFileSync('node', [path.join(ROOT, file)], { cwd: ROOT, env: Object.assign({}, process.env, env || {}), encoding: 'utf8' });
    const m = out.match(/(?:RESULTAAT|Resultaat):\s*([0-9]+)\s*geslaagd,\s*([0-9]+)\s*mislukt/);
    const detail = m ? (m[1] + '/' + (Number(m[1]) + Number(m[2]))) : 'ok';
    return { label, ok: true, detail };
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    const m = out.match(/(?:RESULTAAT|Resultaat):\s*([0-9]+)\s*geslaagd,\s*([0-9]+)\s*mislukt/);
    return { label, ok: false, detail: m ? (m[1] + ' geslaagd / ' + m[2] + ' mislukt') : (out.trim().split('\n').pop() || 'FAIL').slice(0, 120) };
  }
}
function checkSyntax() {
  try {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m, i = 0, errs = 0;
    while ((m = re.exec(html))) { if (!m[1].trim()) continue; i++; try { new Function(m[1]); } catch (e) { errs++; } }
    return { label: 'syntax index.html (' + i + ' scripts)', ok: errs === 0, detail: errs === 0 ? 'ok' : (errs + ' syntax-errors') };
  } catch (e) { return { label: 'syntax index.html', ok: false, detail: String(e).slice(0, 80) }; }
}
function checkPurity() {
  const forbidden = ['document', 'supabase', 'fetch(', 'localStorage', 'sessionStorage', 'querySelector', '.from(', 'XMLHttpRequest'];
  const files = ['core/calculation.js', 'core/decision.js', 'core/cardio.js', 'core/progression.js'];
  let bad = [];
  files.forEach(f => {
    const raw = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    forbidden.forEach(tok => { if (raw.includes(tok)) bad.push(f + ':' + tok); });
  });
  return { label: 'Calculation/Decision Core purity', ok: bad.length === 0, detail: bad.length ? bad.join(', ') : 'geen DOM/DB/network' };
}

const results = [
  run('logic_tests (regressie)', 'logic_tests.js'),
  run('core/calculation.test', 'core/calculation.test.js'),
  run('core/decision.test', 'core/decision.test.js'),
  run('core/cardio.test', 'core/cardio.test.js'),
  run('core/progression.test', 'core/progression.test.js'),
  run('core/sw-guard.test', 'core/sw-guard.test.js'),
  checkSyntax(),
  checkPurity()
];

console.log('\n══════ TRAININGSKOMPAS RELEASE GATE (F1.10) ══════');
results.forEach(r => console.log('  ' + (r.ok ? '🟢' : '🔴') + ' ' + r.label.padEnd(34) + ' ' + r.detail));
const failed = results.filter(r => !r.ok);
console.log('─'.repeat(52));
if (failed.length) {
  console.log('🔴 RELEASE GEBLOKKEERD — ' + failed.length + ' gate(s) rood. Niet mergen/deployen.');
  process.exit(1);
}
console.log('🟢 RELEASE GATE GROEN — alle poorten geslaagd. Merge/deploy toegestaan.');
console.log('   Herinnering: core gewijzigd? sw-guard is groen ⇒ CORE_SIG + CACHE_STATIC zijn gebumpt.');
