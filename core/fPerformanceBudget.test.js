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

/* ── D. F13 Post-Audit Remediation (P1-12): query scalability ──
 * Bewaakt dat de kritieke database-index op sessions(user_id, date) --
 * live gemeten met 10.000 representatieve testrijen: 2.051ms Seq Scan
 * -> 0.052ms Index Scan, ~40x sneller -- gedocumenteerd blijft in de
 * repo-migratie, en dat de meest hoogfrequente queries (Home/History/
 * Progress) een expliciete limit blijven gebruiken (geen onbegrensde
 * full-table-fetch die met de trainingsgeschiedenis van een gebruiker
 * meegroeit zonder plafond). */
console.log('\nD. F13 Post-Audit P1-12: query scalability');
{
  const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v529.sql'), 'utf8');
  ok(migratie.includes('create index if not exists idx_sessions_user_date on public.sessions(user_id, date desc)'),
    'D1: de kritieke sessions(user_id, date)-index is vastgelegd in de repo-migratie');
  ok((migratie.match(/create index if not exists/g) || []).length >= 16,
    'D2: alle 16 index-toevoegingen (1 kritiek + 15 unindexed foreign keys) staan in de migratie');
}
{
  // De meest hoogfrequente, page-load-achtige sessions-queries (Home-
  // dashboard, algemene geschiedenis) moeten een expliciete limit hebben --
  // regressie-anker, geen volledige, nieuwe scan van elke sbGet-aanroep
  // (veel query's hebben bewust GEEN limit omdat ze een volledige som/
  // telling nodig hebben voor een doelberekening -- die blijven terecht
  // ongemoeid, dit anker richt zich specifiek op de bekende, page-load-
  // achtige aanroepen die al een limit hadden vóór deze sprint).
  ok(html.includes("await sbGet('sessions', '&order=date.desc&limit=90')"),
    "D3: de Home-dashboardquery op sessions behoudt een expliciete limit (geen onbegrensde full-table-fetch)");
}

console.log('fPerformanceBudget: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
