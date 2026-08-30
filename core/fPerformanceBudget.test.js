/* fPerformanceBudget.test.js — MS-F13-03 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const bytes = Buffer.byteLength(html, 'utf8');
const MB = 1024 * 1024;

ok(bytes < 6 * MB, 'A1: index.html blijft onder het 6 MB-performance-budget (huidig: ' + (bytes / MB).toFixed(2) + ' MB)');

const dataUriMatches = html.match(/data:image\/webp;base64/g) || [];
ok(dataUriMatches.length <= 220, 'A2: het aantal ingebedde image/webp-data-URI\'s blijft binnen de verwachte marge (huidig: ' + dataUriMatches.length + ', baseline 206)');

{
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  ok(sw.includes("'/index.html'"), 'B1: sw.js precachet nog steeds /index.html (herhaalbezoek blijft snel)');
}

{
  const startupBlok = html.split('async function startAppAfterAuth()')[1] ? html.split('async function startAppAfterAuth()')[1].split('async function wearableSyncSilent')[0] : '';
  ['refreshHome\\(\\)', 'syncAtleetFromSupabase\\(\\)', 'syncCustomTrainingsFromSupabase\\(\\)', 'checkTeamAccess\\(\\)'].forEach(function (aanroep) {
    ok(!startupBlok.match(new RegExp('await\\s+' + aanroep)),
      'C: "' + aanroep + '" wordt niet ge-awaited in startAppAfterAuth() (blijft non-blocking/parallel)');
  });
}

console.log('fPerformanceBudget: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
