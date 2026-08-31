/* fDocConsistencyAppVerInternal.test.js — F14 Final Documentation
 * Integrity Hotfix. Bewaakt dat tools/check-doc-consistency.js de
 * interne APP_VER-consistentie tussen CURRENT_STATE.md se "## Huidige
 * versie"-sectie en de "1. Verified baseline"-"**APP_VER:**"-regel
 * daadwerkelijk controleert -- deze twee liepen eerder onopgemerkt uit
 * elkaar (v4.69.32 vs. v4.69.30), ontdekt tijdens een gerichte hotfix-
 * opdracht, omdat core/fAndroidRelease.test.js H2 uitsluitend de eerste
 * sectie controleert.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function runChecker() {
  try {
    execSync('node ' + path.join(ROOT, 'tools/check-doc-consistency.js'), { cwd: ROOT, stdio: 'pipe' });
    return { exitCode: 0, output: '' };
  } catch (e) {
    return { exitCode: e.status, output: (e.stdout || '').toString() + (e.stderr || '').toString() };
  }
}

const csPad = path.join(ROOT, 'docs/00_Project_Management/CURRENT_STATE.md');
const origineel = fs.readFileSync(csPad, 'utf8');

// ---- A. De schone, huidige documentatie is intern consistent ----
{
  const res = runChecker();
  ok(!res.output.includes('twee verschillende APP_VER-waarden'),
    'A1: de schone CURRENT_STATE.md geeft geen valse melding -- beide APP_VER-vermeldingen zijn identiek');
}

// ---- B. Een echte, kunstmatige drift (het exacte, oorspronkelijk gevonden scenario) wordt gedetecteerd ----
try {
  const gesaboteerd = origineel.replace(/\*\*APP_VER:\*\*\s*v[\d.]+/, '**APP_VER:** v4.69.30');
  fs.writeFileSync(csPad, gesaboteerd);
  const res = runChecker();
  ok(res.exitCode !== 0 && res.output.includes('twee verschillende APP_VER-waarden'),
    'B1: een kunstmatige drift tussen "Huidige versie" en de "Verified baseline"-APP_VER-regel wordt correct gedetecteerd -- exact het oorspronkelijk gevonden scenario');
} finally {
  fs.writeFileSync(csPad, origineel);
}

// ---- C. Na herstel is de checker weer volledig groen voor deze specifieke check ----
{
  const res = runChecker();
  ok(!res.output.includes('twee verschillende APP_VER-waarden'),
    'C1: na herstel van het testbestand is de check weer schoon');
}

console.log('fDocConsistencyAppVerInternal: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
