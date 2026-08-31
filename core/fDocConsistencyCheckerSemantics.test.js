/* fDocConsistencyCheckerSemantics.test.js — F13 Post-Audit Remediation P1-14.
 * Bewaakt dat tools/check-doc-consistency.js de "CLOSED-items als open gap"-
 * check semantisch correct uitvoert: een regel die het item expliciet als
 * CLOSED bevestigt, of een Target-oplossingsketen die meerdere MS-ID's via
 * een pijl aan elkaar rijgt, is GEEN verdachte vermelding. Een regel die
 * een CLOSED-item daadwerkelijk als "nog niet gebouwd"/"nog open" claimt,
 * moet wél gedetecteerd worden.
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

const gapPad = path.join(ROOT, 'docs/GAP_ANALYSIS_V2.md');
const origineel = fs.readFileSync(gapPad, 'utf8');

// ---- A. De schone, huidige documentatie geeft geen valse melding voor deze check ----
{
  const res = runChecker();
  ok(!res.output.includes('CLOSED roadmap-items die mogelijk nog als open gap'),
    'A1: de schone GAP_ANALYSIS_V2.md geeft geen valse "nog open"-melding voor legitieme CLOSED-vermeldingen (bijv. "MS-F11-03 CLOSED" of een Target-oplossingsketen)');
}

// ---- B. Een ECHTE, kunstmatige "nog open"-claim voor een CLOSED-ID wordt wél gedetecteerd ----
try {
  const gesaboteerd = origineel.replace(
    '### GAP-P2-008',
    '**Extra opmerking (test):** MS-F12-01 is helaas nog niet gebouwd en staat nog open.\n\n### GAP-P2-008'
  );
  fs.writeFileSync(gapPad, gesaboteerd);
  const res = runChecker();
  ok(res.exitCode !== 0 && res.output.includes('MS-F12-01'),
    'B1: een echte "nog niet gebouwd"-claim voor een CLOSED-ID (zonder CLOSED-bevestiging of Target-keten) wordt correct gedetecteerd -- geen loophole gecreeerd');
} finally {
  fs.writeFileSync(gapPad, origineel);
}

// ---- C. Na herstel is de checker weer volledig groen voor deze specifieke check ----
{
  const res = runChecker();
  ok(!res.output.includes('CLOSED roadmap-items die mogelijk nog als open gap'),
    'C1: na herstel van het testbestand is de check weer schoon (geen resterende sabotage-restanten)');
}

console.log('fDocConsistencyCheckerSemantics: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
