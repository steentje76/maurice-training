/* core/fScreenImplementationStandardDrift.test.js
 * Screen Implementation Standard v1 -- Fase 12 (drift detection).
 *
 * Bewaakt COMPONENT-CONTRACTEN (dat een canoniek token/component daadwerkelijk
 * wordt gebruikt), niet exacte pixelwaarden -- een legitieme, toekomstige
 * tokenwijziging (bv. --color-primary-soft aanpassen) mag deze tests niet laten
 * falen; een nieuw, lokaal, ongedocumenteerd duplicaat van een bestaand
 * component moet ze wel laten falen. Puur documentatie/contract-bewaking,
 * GEEN runtime-wijziging aan index.html in deze sprint.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- 1. Icon Container Standard: canoniek token, geen lokale duplicaten ----
ok(html.includes('.tk-icon-box{') && html.includes('background:var(--color-primary-soft)'),
  '1: .tk-icon-box gebruikt het canonieke --color-primary-soft-token (Icon Container Standard), geen hardcoded kleur');
ok(!html.match(/\.[a-z-]*-icon-box(?!-sm)[a-z-]*\{[^}]*background:rgba\(0,\s*184,\s*148/i) || html.match(/\.tk-icon-box\{[^}]*background:var\(--color-primary-soft\)/),
  '2: geen tweede, lokale icon-box-achtige class met een hardcoded, gedupliceerde teal-rgba-waarde in plaats van het token');

// ---- 2. Icon Row Pattern: de nieuwe .v43-tmt-inset-variant bestaat en is gedocumenteerd als variant, geen kopie ----
ok(html.includes('.v43-tmt-inset .row{padding:15px 16px}'),
  '3: de gedocumenteerde .v43-tmt-inset-variant (Icon Row Pattern, Fase 4) bestaat nog exact zoals vastgelegd');
ok((html.match(/\.v43-tmt(-inset)? \.row\{/g) || []).length === 2,
  '4: exact 2 varianten van de .row-regel binnen .v43-tmt-context (basis + inset) -- geen derde, ongedocumenteerde kopie geintroduceerd');

// ---- 3. Standard Card: canoniek radius-token, geen losse, nieuwe radius-waarde voor Level 3 ----
ok(html.includes('.tk-card{border-radius:var(--radius-card)'),
  '5: .tk-card (basis voor alle levels) gebruikt het canonieke --radius-card-token, geen losse pixelwaarde');

// ---- 4. Action Tile Grid: CSS Grid, niet flex-wrap (bewezen buggevoelig, zie DECISION_LOG) ----
ok(html.includes("style=\"display:grid;grid-template-columns:repeat(5,1fr)"),
  '6: de Action Tile Grid (Start een activiteit) gebruikt nog steeds CSS Grid, niet de eerder buggevoelige flex-wrap-aanpak');
ok(!html.match(/quick-act[^>]*style="[^"]*flex-wrap:wrap/i),
  '7: geen enkele quick-act-container is teruggevallen op flex-wrap (de root cause van de eerder gerepareerde "Meer"-dominantie-bug)');

// ---- 5. Primary CTA gebruikt canoniek token, geen nieuwe, lokale kleurdefinitie ----
ok(html.includes('.tk-btn-primary{background:var(--color-primary)'),
  '8: .tk-btn-primary (canonieke Primary Button) blijft het --color-primary-token gebruiken');

// ---- 6. Geen bijna-identieke, nieuwe lokale class zonder gedocumenteerde reden (steekproef op class-naamgeving) ----
ok(!html.match(/\.tk-icon-box-(?!sm)[a-z]+\{/),
  '9: geen ongedocumenteerde, derde .tk-icon-box-variant (alleen -sm is vastgelegd in de Screen Implementation Standard)');

// ---- 7. Documentatie zelf bestaat en is intern consistent ----
const docsDir = path.join(ROOT, 'docs', 'ux');
ok(fs.existsSync(path.join(docsDir, 'SCREEN_IMPLEMENTATION_STANDARD_v1.md')),
  '10: docs/ux/SCREEN_IMPLEMENTATION_STANDARD_v1.md bestaat');
ok(fs.existsSync(path.join(docsDir, 'SCREEN_MIGRATION_CHECKLIST_v1.md')),
  '11: docs/ux/SCREEN_MIGRATION_CHECKLIST_v1.md bestaat');

// ---- 8. Geen visuele runtimewijziging deze sprint (Fase 13) ----
ok(html.includes(".v43-plan,.v43-last{background:var(--card);border-radius:18px;box-shadow:var(--shadow);padding:18px;margin-bottom:16px}"),
  '12: de bestaande .v43-plan/.v43-last-basisregel is exact ongewijzigd (geen per-ongeluk visuele wijziging in deze documentatiesprint)');

console.log('fScreenImplementationStandardDrift: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
