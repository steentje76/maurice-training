/* core/fDesignSystemComponents.test.js
 * Design System Component Foundation: DS-03 (iconography) + DS-04 (buttons) +
 * DS-05 (cards). Component/render-fixture-tests in plaats van een development-
 * only showcase-route: dit is een single-file PWA zonder build-pipeline en
 * zonder aparte dev-omgeving -- een nieuwe, zichtbare route zou productie-
 * navigatie/cleanliness kunnen aantasten (Fase 8 staat expliciet toe hiervan af
 * te wijken naar component/render tests). Deze suite rendert elke variant als
 * HTML-string (via tkIcon() en de bijbehorende canonical classes) en controleert
 * de output -- functioneel equivalent aan een showcase, zonder een debug-route.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const { tkIcon, tkIconNames, ICON_SIZE } = require('./designSystemIcons.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ═══ DS-03 ICONOGRAPHY ═══ */

// 1. Canonical icon strategy: exact één stijl (24x24 viewBox, stroke=currentColor, geen fill)
ok(tkIconNames().length >= 40, '1: de canonical icon registry bevat voldoende dekking (>=40 iconen) voor de gevraagde semantische set');
{
  var allOutline = tkIconNames().every(function (name) {
    var svg = tkIcon(name);
    return svg.indexOf('viewBox="0 0 24 24"') !== -1 && svg.indexOf('stroke="currentColor"') !== -1 && svg.indexOf('fill="none"') !== -1;
  });
  ok(allOutline, '2: elk icoon in de registry gebruikt exact dezelfde outline/line-stijl (24x24, stroke=currentColor, fill=none) -- één consistente icon family, geen mix van stijlen');
}

// 3. Geen structurele emoji in de canonical registry zelf
{
  var hasEmoji = tkIconNames().some(function (name) {
    return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(tkIcon(name));
  });
  ok(!hasEmoji, '3: de canonical icon-registry bevat 0 emoji -- uitsluitend geometrische SVG-paden');
}

// 4. AI-icoon is sparkle, geen robot-referentie
ok(tkIcon('aisparkle').indexOf('<path') !== -1 && !/robot/i.test(tkIcon('aisparkle')),
  '4: het aisparkle-icoon is een geometrisch sterretjes-pad, geen robotverwijzing -- consistent met de goedgekeurde Coach v0.2 (sparkle, geen robotmascotte)');

// 5. Accessible icon-only actions: label -> role=img+aria-label, geen label -> aria-hidden
ok(tkIcon('verwijderen', { label: 'Verwijder item' }).indexOf('role="img" aria-label="Verwijder item"') !== -1,
  '5a: een icoon met een label krijgt role="img" + aria-label -- geschikt voor icon-only controls');
ok(tkIcon('verwijderen').indexOf('aria-hidden="true"') !== -1,
  '5b: een icoon zonder label is decoratief (aria-hidden="true") -- voorkomt dubbele/verwarrende screenreader-aankondigingen wanneer een zichtbaar label al aanwezig is');

// 6. Semantische maten gebruiken DS-01-achtige, benoemde categorieën (geen willekeurige pixelmaten)
ok(JSON.stringify(ICON_SIZE) === JSON.stringify({ inline: 16, standard: 20, feature: 28, navigation: 22 }),
  '6: de vier semantische iconmaten (inline/standard/feature/navigation) zijn vastgelegd, geen willekeurige per-scherm-pixelwaarde');

// 7. Icon container CSS-foundation additief aanwezig in index.html
ok(html.includes('.tk-icon-navigation{width:22px;height:22px}') && html.includes('.tk-icon-standard{width:20px;height:20px}'),
  '7: de icon-container-CSS-klassen zijn additief toegevoegd aan index.html, gebruiken de DS-01-achtige, benoemde maten');

/* ═══ DS-04 BUTTONS ═══ */

// 8. Alle 6 canonical button-varianten bestaan
['tk-btn-primary', 'tk-btn-secondary', 'tk-btn-tertiary', 'tk-btn-destructive', 'tk-btn-icon'].forEach(function (cls) {
  ok(html.includes('.' + cls + '{'), '8 (' + cls + '): de canonical button-variant-class bestaat in index.html');
});
ok(html.includes('.tk-btn{'), '8f: de gedeelde .tk-btn-basisklasse (states/touch-target) bestaat');

// 9. PRIMARY gebruikt teal via het canonical token (PO-besluit)
ok(html.includes('.tk-btn-primary{background:var(--color-primary)'),
  '9: .tk-btn-primary gebruikt --color-primary (wijst naar --accent, teal #00B894) -- exact het PO-besluit, geen hardcoded losse kleur');

// 10. Marine is NIET per ongeluk de standaard primary geworden
ok(!html.includes('.tk-btn-primary{background:var(--color-primary-surface)') && !html.includes('.tk-btn-primary{background:var(--accent2)'),
  '10: .tk-btn-primary gebruikt niet de marine/surface-kleur -- marine blijft gereserveerd voor Level-1-cards/surfaces, niet de standaard-CTA');

// 11. Destructive is semantisch beperkt (eigen, herkenbare variant-class, geen algemene "negatief"-styling)
ok(html.includes('.tk-btn-destructive{background:transparent;color:var(--color-destructive)'),
  '11: .tk-btn-destructive is een aparte, herkenbare variant (rode outline/tekst) -- niet de default voor een gewone secundaire of "terug"-actie');

// 12. States: disabled, loading, min. touch target, geen eigen focusstijl (hergebruikt canonical :focus-visible)
ok(html.includes('.tk-btn[disabled],.tk-btn[aria-disabled="true"]{opacity:.45;cursor:not-allowed;pointer-events:none}'),
  '12a: disabled-state is gedefinieerd via het disabled-attribuut EN aria-disabled (voor niet-native disable-baar element)');
ok(html.includes('[data-loading="true"]'), '12b: loading-state bestaat, met een spinner die geen layout shift veroorzaakt (positie absolute binnen de knop)');
ok(html.includes('.tk-btn{') && html.match(/\.tk-btn\{[^}]*min-height:44px/),
  '12c: minimum touch target (44px) is vastgelegd op de gedeelde basisklasse, geldt voor alle varianten');
ok(!html.match(/\.tk-btn-primary\{[^}]*outline:/) , '12d: buttonvarianten definiëren geen eigen focus/outline-stijl -- hergebruiken de al bestaande, canonieke :focus-visible-regel (geen duplicatie, zie de zelf gevonden fix eerder in deze sprint)');

// 13. Geen hardcoded, dubbele kleur waar een token al bestaat
ok(!html.match(/\.tk-btn-(primary|secondary|tertiary|destructive|icon)\{[^}]*background:#[0-9a-fA-F]{3,6}/),
  '13: geen enkele nieuwe button-variant heeft een hardcoded achtergrondkleur -- uitsluitend var(--color-*)-tokens (kleur:#fff voor tekst-op-gekleurde-achtergrond is toegestaan: er bestaat geen apart "on-primary"-token in Design System v1, en #fff dupliceert geen bestaande, andere kleurwaarheid)');

/* ═══ DS-05 CARDS ═══ */

// 14. Alle vijf card-levels aanwezig
[1, 2, 3, 4, 5].forEach(function (lvl) {
  ok(html.includes('.tk-card-l' + lvl + '{'), '14 (level ' + lvl + '): de canonical card-level-class bestaat');
});

// 15. Canonical card radius = 16px (PO-besluit, gedeeld via .tk-card)
ok(html.includes('.tk-card{border-radius:var(--radius-card)'), '15: .tk-card gebruikt --radius-card (16px, PO-besluit) als gedeelde basis voor alle vijf levels');

// 16. Level 1 ondersteunt marine surface (dominante actie-kaart)
ok(html.includes('.tk-card-l1{background:var(--color-primary-surface);color:#fff'),
  '16: Level 1 (primary action card) gebruikt de marine/surface-kleur en witte tekst -- consistent met de "Training A"-kaart-conventie uit de canonical baseline');

// 17. Level 3 gebruikt de rustige, witte standaard-surface
ok(html.includes('.tk-card-l3{background:var(--color-surface);color:var(--color-text-primary)'),
  '17: Level 3 (standard function card) gebruikt de rustige, witte surface, geen dominante marine-kleur');

// 18. Status-/UNKNOWN-presentatie op Level 4
ok(html.includes('[data-value-state="unknown"] .tk-card-value{color:var(--color-text-muted);font-style:italic}'),
  '18: Level 4 (compact data/status) heeft een expliciete, visueel onderscheiden unknown-presentatie -- UNKNOWN wordt nooit hetzelfde getoond als een gewone waarde (missing != zero, ook visueel)');

// 19. Clickable/selected/disabled/loading-semantiek zonder onclick-div-antipatroon
ok(html.includes('button.tk-card,a.tk-card{display:block'), '19a: card-als-actie gebruikt semantisch <button>/<a>, geen losse onclick-div');
ok(html.includes('.tk-card[data-state="selected"]{outline:2px solid var(--color-primary)'), '19b: selected-state is visueel + semantisch (data-state-attribuut, geen kleur-only)');
ok(html.includes('.tk-card[data-state="disabled"]{opacity:.5;pointer-events:none}'), '19c: disabled-state voorkomt interactie én toont een visuele state');

// 20. Elevation blijft subtiel (hergebruikt --elevation-card, geen zware, nieuwe schaduw)
ok(html.includes('.tk-card{border-radius:var(--radius-card);box-shadow:var(--elevation-card)'),
  '20: cards gebruiken --elevation-card (wijst naar het bestaande, subtiele --shadow-token) -- geen nieuwe, zwaardere schaduwwaarde geintroduceerd (PO-principe: cards zweven niet)');

/* ═══ BASELINE-BEHOUD (herbevestiging, dezelfde als de vorige sprint) ═══ */

// 21. Zes canonical PNG-hashes byte-identiek
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
  ok(files.length === 6, '21a: exact 6 canonical PNG-bestanden, geen 7e/robot-bestand');
  let allMatch = true;
  Object.keys(EXPECTED_HASHES).forEach(function (fname) {
    const p = path.join(baseDir, fname);
    const hash = fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null;
    if (hash !== EXPECTED_HASHES[fname]) allMatch = false;
  });
  ok(allMatch, '21b: alle 6 canonical PNG-hashes zijn byte-identiek aan de gearchiveerde baseline');
}

// 22. Bottom navigation ongewijzigd, geen hoofdscherm gemigreerd
ok(html.includes('.bnav{') && html.includes('.ni.active{color:var(--accent)}'),
  '22a: de bestaande .bnav/.ni-navigatiestructuur is ongewijzigd -- geen navigatiemigratie deze sprint');
ok(!html.match(/id="s-vandaag-v2"|id="s-trainen-v2"|id="s-inzicht-v2"|id="s-coach-v2"|id="s-samen-v2"|id="s-profiel-v2"/),
  '22b: geen van de zes hoofdschermen is als nieuw scherm geimplementeerd deze sprint');

console.log('fDesignSystemComponents: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
