/* fUx1AppShellDesignSystem.test.js — UX-1 DESIGN SYSTEM + APP SHELL.
 * Bewaakt de door de PO goedgekeurde UX-1 richting. Semantische
 * componenttests, bewust GEEN fragiele pixelvergelijkingen.
 * Canonical bron: docs/ux/baseline/v1/ (SHA-256 geverifieerd).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0; const msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push(m); } }
console.log('UX-1 — App shell & design system');

ok(html.includes('ni-label">Vandaag'), 'A1: nav bevat Vandaag');
ok(html.includes('ni-label">Trainen'), 'A2: nav bevat Trainen');
ok(html.includes('ni-label">Inzicht'), 'A3: nav bevat Inzicht');
ok(html.includes('ni-label">Coach'), 'A4: nav bevat Coach');
ok(html.includes('ni-label">Samen'), 'A5: nav bevat Samen');
ok(!html.includes('ni-label">Voortgang'), 'A6: label Voortgang weg uit hoofdnavigatie');
ok(!html.includes('ni-label">Lichaam'), 'A7: label Lichaam weg uit hoofdnavigatie');
ok(!html.includes('ni-label">Home<'), 'A8: label Home weg uit hoofdnavigatie');
ok(!html.includes('ni-label">Sociaal'), 'A9: variant Sociaal genormaliseerd naar Samen');
ok(!/ni-label">Profiel/.test(html), 'B1: Profiel is GEEN zesde tab (canonical: via avatar)');

[['s-lichaam','Lichaam/Recovery'],['s-stats','Voortgang/Analytics'],['s-social','Samen'],
 ['s-profiel','Profiel'],['s-inzicht','Inzicht v0.1'],['s-coach','Coach']].forEach(function (p) {
  ok(html.indexOf("go('" + p[0] + "')") !== -1,
    'C-' + p[0] + ': ' + p[1] + ' blijft bereikbaar -- IA-wijziging verwijdert geen capability');
});

{
  const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok((code.match(/(^|[^a-zA-Z.$_])confirm\s*\(/g) || []).length === 0, 'D1: geen native confirm() (was 4)');
  ok((code.match(/(^|[^a-zA-Z.$_])prompt\s*\(/g) || []).length === 0, 'D2: geen native prompt() (was 6)');
  ok((code.match(/(^|[^a-zA-Z.$_])alert\s*\(/g) || []).length === 0, 'D3: geen native alert()');
}

ok(/function choiceSheet\(/.test(html), 'E1: canonical choiceSheet bestaat');
ok(/function inputSheet\(/.test(html),  'E2: canonical inputSheet bestaat');
ok(/function confirmModal\(/.test(html),'E3: confirmModal blijft de bevestigingscomponent');

{
  const i = html.indexOf('async function hyroxOpenCorrigeer');
  ok(i !== -1, 'F1: hyroxOpenCorrigeer is async (sheet-gebaseerd)');
  const body = html.slice(i, i + 1800);
  ok(body.includes('inputSheet('), 'F2: gebruikt inputSheet i.p.v. drie prompts');
  ok(body.includes('hyroxCorrigeerLaatste({ distance: v.distance, weight: v.weight, reps: v.reps })'),
    'F3: EXACT hetzelfde write-pad en argumentvorm -- geen shadow write, geen nieuwe berekening');
  ok(body.includes('if(v===null) return;'), 'F4: annuleren breekt af zonder write');
}
{
  const i = html.indexOf('async function socialOpenShareDialog');
  const body = html.slice(i, i + 2400);
  ok(body.includes('choiceSheet('), 'G1: privacykeuze gebruikt choiceSheet');
  ok(body.includes("value:'connections'") && body.includes("value:'public'"),
    'G2: exact dezelfde twee canonieke waarden behouden');
  ok(body.includes('if(zichtbaarheid===null)return;'),
    'G3: annuleren breekt af i.p.v. stil een privacyniveau kiezen');
}
ok(!html.includes('Preview: nieuw Inzicht-scherm'), 'H1: dev-previewbanner weg uit eindgebruikers-UI');

[['--tk-teal:#04AE9B','teal'],['--tk-navy:#053146','navy'],['--tk-ink:#223A4B','ink'],
 ['--tk-bg:#F4F6F9','achtergrond'],['--tk-tap:44px','touch-target']].forEach(function (t) {
  ok(html.includes(t[0]), 'I-' + t[1] + ': canonical token aanwezig');
});

ok(!/ni-icon">🤖/.test(html), 'J1: robot-emoji is geen nav-icoon meer (AI-contract: sparkle, robot REJECTED)');
ok(html.includes('.ilbl{font-size:12px;font-weight:600;color:var(--g6);min-width:72px'),
  'K1: .ilbl gebruikt min-width -- lost "E-/mailadres" systemisch op voor alle labels');
ok(/\.btn,\.tk-btn,\.seg-opt,\.filter-tab\{min-height:var\(--tk-tap\)\}/.test(html),
  'L1: tekstknoppen krijgen canonieke minimumhoogte via componentregel');
ok(/\.switch::after\{[^}]*height:var\(--tk-tap\)/.test(html),
  'L2: compacte schakelaar behoudt formaat maar krijgt vergroot raakvlak');

console.log('\n========================================================');
console.log('fUx1AppShellDesignSystem.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error('MISLUKT: ' + m)); process.exitCode = 1; }
