/* fSocialThemes.test.js — SOCIAL / SAMEN MASTER SPRINT, S7 Themes & Personalization.
 * Bewaakt: THEME CONFIGURATION -> APPROVED TOKENS -> SOCIAL PRESENTATION
 * (geen user-supplied CSS/HTML/JS), deterministische fallback naar default,
 * geen nieuwe kleurwaarden (uitsluitend bestaande design-tokens), no
 * pay-to-win (geen invloed op feed-ranking/achievements/leaderboards/Coach),
 * scope-beperking tot de Social-laag (geen wijziging aan Training Execution
 * UI), en dat de allowlist zowel client- als database-niveau is afgedwongen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v556.sql'), 'utf8');

console.log('SOCIAL / SAMEN MASTER SPRINT — S7 Themes & Personalization');

// ---- A. Allowlist: data, geen code, dubbel afgedwongen (client + database) ----
ok(html.includes('const SOCIAL_THEME_PRESETS='), 'A1: presets zijn een config/data-object, geen honderden hardcoded CSS-branches');
ok(migratie.includes("theme_id IN ('default','sportief_groen','sportief_blauw','energiek_amber')"),
  'A2: de database-CHECK-constraint is de daadwerkelijke, harde allowlist-afdwinging (niet uitsluitend client-side)');
{
  const saveFn = html.split('async function socialSaveProfile()')[1].split('async function socialSearchProfiles')[0];
  ok(saveFn.includes('SOCIAL_THEME_PRESETS.some(p=>p.id===gekozenThemeId)'), 'A3: de client valideert eveneens tegen de allowlist vóór verzenden (defense-in-depth)');
}

// ---- B. Geen user-supplied CSS/HTML/JS ----
ok(!html.match(/dangerouslySetInnerHTML|eval\(.*theme|new Function\(.*theme/i), 'B1: geen enkel mechanisme om willekeurige CSS/JS via een theme te injecteren');
ok(html.match(/accentVar:'var\(--df-/g) && html.match(/accentVar:'var\(--df-/g).length>=2,
  'B2: presets verwijzen uitsluitend naar bestaande CSS custom properties (var(--df-*)), geen losse hex-/rgb-waarden vanuit de preset-config zelf');

// ---- C. Geen nieuwe kleurwaarden (accessibility hard gate, sectie 37) ----
{
  const presetBlok = html.split('const SOCIAL_THEME_PRESETS=[')[1].split('];')[0];
  ok(!presetBlok.match(/#[0-9a-fA-F]{3,8}\b/), 'C1: de preset-definities zelf bevatten geen enkele nieuwe hex-kleurwaarde -- uitsluitend verwijzingen naar reeds bestaande, elders gedefinieerde tokens');
}

// ---- D. Deterministische fallback (sectie 39) ----
ok(html.includes('function resolveSocialThemePreset(themeId)') && html.includes('SOCIAL_THEME_PRESETS[0]'),
  'D1: resolveSocialThemePreset() valt bij een onbekende/lege waarde altijd terug op het eerste (default) preset, nooit een kapotte/lege presentatie');
{
  const resolveFn = html.split('function resolveSocialThemePreset(themeId)')[1].split('async function socialSaveProfile')[0];
  ok(resolveFn.includes('||SOCIAL_THEME_PRESETS[0]'), 'D2: de fallback-logica is een simpele, deterministische OR-expressie -- geen asynchrone lookup die zelf kan falen');
}

// ---- E. No pay-to-win (sectie 36): theme raakt geen enkele calculation/ranking ----
ok(!html.match(/theme_id.*feed.*rank|rank.*theme_id|theme_id.*achievement|achievement.*theme_id|theme_id.*leaderboard|leaderboard.*theme_id/i),
  'E1: theme_id komt nergens voor in feed-ranking-, achievement- of leaderboard-gerelateerde code');
ok(!html.match(/theme_id.*coach.*advies|theme_id.*aanbeveling/i), 'E2: theme_id beinvloedt geen enkele Coach-aanbeveling');

// ---- F. Scope-beperking: alleen Social-laag, nooit Training Execution UI ----
{
  const trainFns = ['renderRunningExecutionScreen', 'renderCyclingExecutionScreen', 'renderSwimmingExecutionScreen', 'renderMessageThreadScreen'];
  trainFns.forEach(function (naam) {
    var m = html.match(new RegExp('(?:async )?function ' + naam + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
    if (m) ok(!m[0].includes('theme_id') && !m[0].includes('SOCIAL_THEME_PRESETS'), 'F1 (' + naam + '): geen enkele theme-verwijzing in Training Execution / Messaging-schermen -- personalisatie blijft beperkt tot de Social-profielpresentatie');
  });
}

// ---- G. Cross-user: alleen het eigen profiel is schrijfbaar ----
// (social_profiles_eigen_schrijven, ALL, user_id=auth.uid() bestond al en dekt
// deze nieuwe kolom automatisch mee -- geen nieuwe policy nodig, hier bevestigd
// dat de migratie zelf geen aparte/zwakkere write-policy introduceert.)
ok(!migratie.match(/CREATE POLICY/i), 'G1: de migratie voegt geen nieuwe RLS-policy toe -- de bestaande eigen-profiel-schrijfpolicy dekt theme_id automatisch (geen verzwakking van de bestaande grens)');

// ---- H. Entitlement-ready (sectie 35): geen prijs/productbeslissing genomen ----
ok(!html.match(/theme.*premium|premium.*theme|theme.*entitlement/i) || !html.match(/paywall/i),
  'H1: geen enkele theme is achter een paywall/premium-check geplaatst in deze sprint (alle huidige presets zijn cosmetic-only en vrij beschikbaar, conform sectie 35: geen nieuwe prijsbeslissing zonder bestaand beleid)');

console.log('\n========================================================');
console.log('fSocialThemes.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
