/* core/fDesignSystemFoundation.test.js
 * Design System Foundation Masterprint: DS-01 (canonical tokens) + DS-02
 * (typography). Zuiver additieve, PO-goedgekeurde tokenlaag -- deze suite
 * bewaakt dat (1) de nieuwe tokens bestaan en de juiste, PO-goedgekeurde
 * waarden hebben, (2) GEEN enkele bestaande tokenwaarde is gewijzigd
 * (radius-card=16px is nieuw, --r blijft 8px; --shadow blijft ongewijzigd),
 * (3) de robot-Coach nergens is geintroduceerd, (4) de canonical visual
 * baseline (6 PNG's) intact en byte-identiek blijft, (5) geen bottom-nav-
 * wijziging, (6) de accessibility-foundations additief zijn.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- 1. Nieuwe DS-01-tokens bestaan met de PO-goedgekeurde waarden ----
ok(html.includes('--radius-card:16px'), '1a: --radius-card is 16px (PO-besluit Design System v1 §5)');
ok(html.includes('--radius-control:8px') && html.includes('--radius-small:8px'), '1b: kleinere radius-tokens hergebruiken de bestaande, kleinere waarde');
ok(html.includes('--space-xs:4px') && html.includes('--space-sm:8px') && html.includes('--space-md:12px') && html.includes('--space-lg:16px') && html.includes('--space-xl:20px'), '1c: spacing-schaal aanwezig op de bestaande, herhaald gebruikte waarden');
ok(html.includes('--elevation-subtle:var(--shadow)') && html.includes('--elevation-card:var(--shadow)'), '1d: elevation-tokens wijzen naar het bestaande --shadow-token, geen nieuwe schaduwwaarde verzonnen');

// ---- 2. Semantic color mapping wijst naar bestaande kleurtokens, geen nieuwe kleuren ----
ok(html.includes('--color-primary:var(--accent)') && html.includes('--color-primary-surface:var(--accent2)'),
  '2a: --color-primary=teal (--accent), --color-primary-surface=marine (--accent2) -- exact het PO-besluit (primary=teal, marine=surfaces, niet standaard-CTA)');
ok(html.includes('--color-surface:var(--card)') && html.includes('--color-text-primary:var(--dark)'),
  '2b: surface/text-primary wijzen naar bestaande tokens');
ok(html.includes('--color-destructive:var(--df-r)'), '2c: destructive-kleur wijst naar de bestaande rode statuskleur, geen nieuwe hardcoded kleur');

// ---- 3. DS-02 typography-schaal op bestaande, meest gebruikte maten ----
ok(html.includes('--text-body-sm:13px') && html.includes('--text-secondary-body:12px') && html.includes('--text-label:11px'),
  '3: typography-schaal gebruikt de drie meest voorkomende, bestaande font-sizes (13px/12px/11px) -- geen nieuwe waarde verzonnen');

// ---- 4. GEEN enkele bestaande tokenwaarde is gewijzigd (0 visuele regressie) ----
ok(html.includes("--r:8px"), '4a: de bestaande --r-token blijft exact 8px (ongewijzigd, geen radius-regressie op bestaande elementen)');
ok(html.includes("--shadow:0 1px 3px rgba(0,0,0,.1)"), '4b: de bestaande --shadow-token is exact ongewijzigd');
ok(html.includes("--accent:#00B894") && html.includes("--accent2:#0E3B4A"), '4c: de bestaande primaire kleurwaarden zijn exact ongewijzigd');
ok((html.match(/font-size:13px/g) || []).length >= 300, '4d: het bestaande, hoogfrequente font-size:13px-gebruik is niet vervangen door een token (0 automatische conversie deze sprint)');

// ---- 5. Accessibility-foundations zijn additief ----
ok(html.includes(':focus-visible{outline:3px solid var(--focus-ring);outline-offset:2px}'),
  '5a (gecorrigeerd tijdens DS-03/04/05, zelf gevonden): een consistente :focus-visible-foundation bestond al sinds Sprint 1 (outline:3px, --focus-ring) -- een eerdere DS-01/DS-02-poging voegde per abuis een tweede, redundante regel toe (dubbele waarheid); dat is teruggedraaid, de enige, canonieke bron is nu deze al bestaande regel');
ok(html.includes('prefers-reduced-motion: reduce'), '5b: een reduced-motion-foundation is toegevoegd, verwijdert geen bestaande transitie (verkort alleen duur)');

// ---- 6. Geen robot-Coach geintroduceerd, repo-breed ----
ok(!html.match(/robot.?mascotte|robotcoach/i), '6: geen robot-mascotte-referentie geintroduceerd in index.html');

// ---- 7. Canonical visual baseline: 6 PNG's, byte-identiek aan de gearchiveerde hashes ----
{
  const EXPECTED_HASHES = {
    'vandaag-v0.11.png': 'dce35fd2eb97f8666c52d47fcf31dfafda6a2833d05d5cf8644fe44c8c02f584',
    'trainen-v0.2.png': 'e9602c6e3527efbfa3bd9ecbaea8f5199a2d261cbc15bcfa0bd707682a70cf1a',
    'inzicht-v0.1.png': '7c1ed35fdc2b8d0fadbfe0ea88ca5a388d2c7a532cfa96667396e7c8a424bf8a',
    'coach-v0.2.png': 'ee209edcdd0ae3ece0fc24b64ac90bc784576ee5d26e4f1dc78eb329a0defca5',
    'samen-v0.1.png': 'cc4479b912b059c1c3f7749f758649fe432c4271a4aafe1e419de30fe0453ffb',
    'profiel-v0.1.png': 'adeca214e5dc3644ea0e98ad7d3346105361d8aa5449ae3b6997f56e4e343ad4'
  };
  const baseDir = path.join(ROOT, 'docs/ux/baseline/v1');
  const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.png'));
  ok(files.length === 6, '7a: exact 6 PNG-bestanden in docs/ux/baseline/v1/, geen 7e/robot-bestand');
  let allMatch = true;
  Object.keys(EXPECTED_HASHES).forEach(function (fname) {
    const p = path.join(baseDir, fname);
    if (!fs.existsSync(p)) { allMatch = false; return; }
    const hash = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    if (hash !== EXPECTED_HASHES[fname]) allMatch = false;
  });
  ok(allMatch, '7b: alle 6 canonical PNG-hashes zijn byte-identiek aan de eerder gearchiveerde baseline -- geen enkele mockup is stilzwijgend gewijzigd');
}

// ---- 8. Bottom navigation ongewijzigd (geen DS-06 in deze sprint) ----
ok(html.includes(".bnav{") && html.includes(".ni{") && html.includes(".ni.active{color:var(--accent)}"),
  '8: de bestaande .bnav/.ni-structuur en actieve kleur zijn ongewijzigd -- geen navigatiemigratie deze sprint');

console.log('fDesignSystemFoundation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
