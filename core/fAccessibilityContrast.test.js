/* MASTER SPRINT v4.53.0 — ACCESSIBILITY: CONTRAST, ZOOM, SCOPE
 *
 * Dekt de acceptatiecriteria uit deze sprint:
 *  A. Zoom staat weer aan (viewport-meta) zonder viewport-fit=cover te verliezen.
 *  B. --g4 als tekstkleur haalt WCAG AA (4,5:1) op zowel --bg als --card.
 *  C. --accent-text (nieuw token) haalt WCAG AA op elke daadwerkelijk voorkomende
 *     achtergrond waarop hij wordt gebruikt (--bg/--card/--g1/--v43-mint op 8%/10% dekking).
 *  D. --accent zelf is NIET gewijzigd (geen visuele regressie voor knoppen/branding/iconen).
 *  E. Precies één toepassing blijft bewust op --accent (accent2-achtergrond) — daar zou
 *     --accent-text de contrast juist verslechteren.
 *  F. Alle color:var(--accent)-tekst-toepassingen zijn ofwel vervangen ofwel de bewuste
 *     uitzondering — geen enkele blijft per ongeluk op de te-lage --accent staan.
 *  G. Regressie: bestaande functionaliteit/tests ongewijzigd.
 *
 * Draai: node core/fAccessibilityContrast.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

// ── WCAG 2.1 contrastberekening (relatieve luminantie) — puur, geen afhankelijkheden ──
function hexToRgb(h){ h=h.replace('#',''); return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)); }
function relLum([r,g,b]){
  const ch = c => { c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
  return 0.2126*ch(r)+0.7152*ch(g)+0.0722*ch(b);
}
function contrastRatio(hex1, hex2){
  const l1=relLum(hexToRgb(hex1)), l2=relLum(hexToRgb(hex2));
  const [lighter,darker]=[Math.max(l1,l2),Math.min(l1,l2)];
  return (lighter+0.05)/(darker+0.05);
}
function blendOverWhite(hex, alpha){
  const [r,g,b]=hexToRgb(hex);
  return [r*alpha+255*(1-alpha), g*alpha+255*(1-alpha), b*alpha+255*(1-alpha)]
    .map(v=>Math.round(v)).map(v=>v.toString(16).padStart(2,'0')).join('');
}

console.log('\n[MASTER SPRINT v4.53.0] Accessibility — contrast, zoom, scope');

/* ── A. Zoom ────────────────────────────────────────────────────────────────────── */
console.log('\nA. Viewport / zoom (WCAG 1.4.4)');
const viewportMatch = html.match(/<meta name="viewport" content="([^"]+)">/);
ok(!!viewportMatch, 'A1: viewport-meta gevonden');
if (viewportMatch) {
  const content = viewportMatch[1];
  ok(!/maximum-scale/.test(content), 'A2: maximum-scale is verwijderd');
  ok(!/user-scalable=no/.test(content), 'A3: user-scalable=no is verwijderd');
  ok(/viewport-fit=cover/.test(content), 'A4: viewport-fit=cover blijft behouden (safe-area-inset)');
  ok(/width=device-width/.test(content), 'A5: width=device-width blijft behouden');
}

/* ── B. --g4 contrast ───────────────────────────────────────────────────────────── */
console.log('\nB. --g4 (secundaire tekst) — WCAG AA op --bg en --card');
const g4Match = html.match(/--g4:#([0-9A-Fa-f]{6})/);
ok(!!g4Match, 'B1: --g4-token gevonden');
if (g4Match) {
  const g4 = '#'+g4Match[1];
  const rBg = contrastRatio(g4, '#E6EBEF');
  const rCard = contrastRatio(g4, '#FFFFFF');
  ok(rBg >= 4.5, `B2: --g4 op --bg haalt AA (${rBg.toFixed(2)}:1, vereist 4,5:1)`);
  ok(rCard >= 4.5, `B3: --g4 op --card haalt AA (${rCard.toFixed(2)}:1, vereist 4,5:1)`);
}

/* ── C. --accent-text bestaat en haalt AA overal waar hij daadwerkelijk gebruikt wordt ── */
console.log('\nC. --accent-text (nieuw token) — WCAG AA op elke voorkomende achtergrond');
const atMatch = html.match(/--accent-text:#([0-9A-Fa-f]{6})/);
ok(!!atMatch, 'C1: --accent-text-token gevonden');
if (atMatch) {
  const at = '#'+atMatch[1];
  ok(contrastRatio(at, '#E6EBEF') >= 4.5, 'C2: --accent-text op --bg haalt AA');
  ok(contrastRatio(at, '#FFFFFF') >= 4.5, 'C3: --accent-text op --card (wit) haalt AA');
  ok(contrastRatio(at, '#F5F5F5') >= 4.5, 'C4: --accent-text op --g1 haalt AA');
  const mint10 = '#'+blendOverWhite('00B894', 0.10);
  const mint8  = '#'+blendOverWhite('00B894', 0.08);
  ok(contrastRatio(at, mint10) >= 4.5, `C5: --accent-text op --v43-mint (10% dekking, effectief ${mint10}) haalt AA`);
  ok(contrastRatio(at, mint8)  >= 4.5, `C6: --accent-text op de 8%-tint (.lib-cmp-btn, effectief ${mint8}) haalt AA`);
}

/* ── D. --accent zelf ongewijzigd ──────────────────────────────────────────────── */
console.log('\nD. --accent (merkkleur) ongewijzigd — geen visuele regressie voor knoppen/branding');
const accentMatch = html.match(/--accent:#([0-9A-Fa-f]{6})/);
ok(!!accentMatch && accentMatch[1].toUpperCase() === '00B894', 'D1: --accent staat nog op #00B894, niet aangepast');

/* ── E/F. Scope — exact één bewuste uitzondering, geen weggelekte lage-contrast-tekst ── */
console.log('\nE/F. Scope: precies één uitzondering, verder alles gemigreerd of terecht ongemoeid');
// Tel color:var(--accent) NIET voorafgegaan door een letter/koppelteken (sluit border-/outline-color uit)
const textAccentMatches = html.match(/(?<![a-zA-Z-])color:var\(--accent\)/g) || [];
ok(textAccentMatches.length === 1, `E1: nog precies 1 color:var(--accent)-tekst-toepassing over (gevonden: ${textAccentMatches.length})`);

// Die ene moet exact de accent2-achtergrond-regel zijn (.v43-plan-ic/.v43-last-ic)
const exceptionLine = html.split('\n').find(l => l.includes('background:var(--accent2)') && /(?<![a-zA-Z-])color:var\(--accent\)/.test(l));
ok(!!exceptionLine && exceptionLine.includes('.v43-plan-ic'), 'E2: de resterende uitzondering is exact de accent2-achtergrond-regel (.v43-plan-ic/.v43-last-ic)');

const accentTextMatches = html.match(/color:var\(--accent-text\)/g) || [];
// v4.62.0 — twee nieuwe, correct getokende toepassingen toegevoegd door de HYROX/
// triathlon-UI ("Vorige segment corrigeren" en de "race starten"-knop) — beide gebruiken
// bewust --accent-text (het toegankelijke token), niet het losse --accent. Het exacte
// aantal groeit dus legitiem mee met nieuwe schermen; deze test blijft zijn doel dienen
// (bevestigen dat NIEUWE accent-tekst altijd het AA-veilige token gebruikt) zolang het
// hier expliciet wordt bijgewerkt bij elke bewuste, geverifieerde toevoeging.
ok(accentTextMatches.length === 89, `F1: 89 toepassingen gemigreerd/toegevoegd naar --accent-text (gevonden: ${accentTextMatches.length}) — 87 uit v4.53.0 + 2 nieuwe, correct getokende toepassingen uit v4.62.0 (HYROX/triathlon-UI)`);

// Geen enkele overgebleven border-/outline-color:var(--accent) is per ongeluk mee veranderd —
// die vallen buiten deze sprint (niet-tekst-contrast is een andere WCAG-eis, 1.4.11) en moeten
// gewoon nog --accent zijn.
const borderAccent = html.match(/border-color:var\(--accent\)/g) || [];
ok(borderAccent.length > 0, `F2: border-color:var(--accent) bestaat nog ongewijzigd (buiten scope, ${borderAccent.length}×)`);

// Geen enkele foutieve dubbele of kapotte tokenreferentie
ok(!/var\(--accent-text-text\)/.test(html), 'F3: geen dubbel-vervangen tokenreferenties');
ok(!/color:var\(--accent-text-text\)/.test(html), 'F3b: geen dubbele --accent-text-text-referentie');

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
console.log(fail === 0 ? '✅ Accessibility-sprint v4.53.0: contrast, zoom en scope kloppen.' : '❌ Accessibility-sprint NIET groen.');
process.exitCode = fail === 0 ? 0 : 1;
