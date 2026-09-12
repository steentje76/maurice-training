/* fUxAppShellCanonicalNav.test.js — UX APP SHELL MASTER SPRINT
 * Canonical primary navigation (Vandaag/Trainen/Inzicht/Coach/Samen), single
 * source of truth (TK_PRIMARY_NAV), prefix-gebaseerde actieve-tab-mapping
 * (TK_TAB_PREFIX_RULES), en reachability van alle vóór de migratie bestaande
 * functionele hoofddomeinen (Lichaam, Voortgang, Nutrition, Samen, Profiel).
 *
 * Draai: node core/fUxAppShellCanonicalNav.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

function slice(startMarker, endMarker) {
  var s = HTML.indexOf(startMarker);
  assert.ok(s >= 0, 'startmarker niet gevonden: ' + startMarker);
  var e = HTML.indexOf(endMarker, s + startMarker.length);
  assert.ok(e > s, 'eindmarker niet gevonden: ' + endMarker);
  return HTML.slice(s, e);
}

var VOLLEDIGE_NAV_BRON = slice('const TK_PRIMARY_NAV=[', 'function tkPaintBnav(')
  .replace(/^let /gm, 'var ').replace(/^const /gm, 'var ');

function zandbak(curTWaarde) {
  var ctx = { console: console, curT: curTWaarde === undefined ? null : curTWaarde };
  vm.createContext(ctx);
  new vm.Script(VOLLEDIGE_NAV_BRON, { filename: 'app-shell-nav.js' }).runInContext(ctx);
  return ctx;
}

/* ══ 1-4. Vijf canonical tabs, exacte labels/volgorde, geen Profile-tab ══ */
console.log('1-4. Canonical tabs');
var z = zandbak();
ok(z.TK_PRIMARY_NAV.length === 5, '1: exact vijf primary tabs');
var labels = z.TK_PRIMARY_NAV.map(function (t) { return t.label; });
ok(JSON.stringify(labels) === JSON.stringify(['Vandaag', 'Trainen', 'Inzicht', 'Coach', 'Samen']),
  '2/3: labels exact Vandaag/Trainen/Inzicht/Coach/Samen, in die volgorde');
ok(labels.indexOf('Profiel') === -1, '4: geen Profile-tab in de primary nav');

/* ══ 5. Legacy labels niet meer zichtbaar in primary nav ══ */
console.log('5. Legacy labels weg');
['Home', 'Training', 'Lichaam', 'Voortgang'].forEach(function (oud) {
  ok(labels.indexOf(oud) === -1, '5: legacy label "' + oud + '" komt niet meer voor in TK_PRIMARY_NAV');
});
ok(!/🏠|🏋️|🧍|📈|🤖/.test(HTML.slice(HTML.indexOf('const TK_PRIMARY_NAV='), HTML.indexOf('function tkPaintBnav('))),
  '5b: geen emoji meer in de canonical nav-definitie');
ok((HTML.match(/<nav class="bnav" role="navigation" aria-label="Hoofdnavigatie"><\/nav>/g) || []).length === 45,
  '5c: alle 45 bnav-instanties zijn lege canonical shells (geen hardcoded duplicaten meer)');

/* ══ 6-10. Elke tab opent de correcte bestaande root ══ */
console.log('6-10. Tab-bestemmingen');
var byId = {}; z.TK_PRIMARY_NAV.forEach(function (t) { byId[t.id] = t; });
ok(byId.vandaag.target === 's-home', '6: Vandaag opent s-home');
ok(typeof byId.trainen.target === 'function', '7a: Trainen-bestemming is dynamisch (curT-afhankelijk)');
ok(zandbak(null).TK_PRIMARY_NAV[1].target() === 's-train-mgr', '7b: zonder actieve trainingsdag -> s-train-mgr');
ok(zandbak('A').TK_PRIMARY_NAV[1].target() === 's-train-a', '7c: met actieve trainingsdag curT=A -> s-train-a (bestaand gedrag ongewijzigd)');
ok(byId.inzicht.target === 's-inzicht', '8: Inzicht opent s-inzicht (bestaand, al gebouwd summary-scherm)');
ok(byId.coach.target === 's-coach', '9: Coach opent s-coach');
ok(byId.samen.target === 's-social', '10: Samen opent s-social (bestaand Sociaal-scherm)');
ok(HTML.indexOf('<div class="scr" id="s-inzicht">') > -1, '8b: s-inzicht bestaat daadwerkelijk als scherm');
ok(HTML.indexOf('<div class="scr" id="s-social">') > -1, '10b: s-social bestaat daadwerkelijk als scherm');

/* ══ 11. Profiel bereikbaar via avatar, geen zesde tab ══ */
console.log('11. Profiel via avatar');
ok(/onclick="go\('s-profiel'\)"/.test(HTML), '11a: er bestaat minstens één avatar/profiel-ingang naar s-profiel');
ok(HTML.indexOf('<div class="scr" id="s-profiel">') > -1, '11b: s-profiel bestaat als scherm, bereikt via avatar, niet via TK_PRIMARY_NAV');

/* ══ 12-13. Lichaam/Voortgang-functionaliteit blijft bereikbaar ══ */
console.log('12-13. Lichaam/Voortgang reachability');
ok(HTML.indexOf('<div class="scr" id="s-lichaam">') > -1, '12: s-lichaam bestaat nog als scherm');
ok(/onclick="go\('s-lichaam'\)"/.test(HTML), '12b: s-lichaam is nog ergens vanuit de UI bereikbaar');
ok(HTML.indexOf('<div class="scr" id="s-stats">') > -1, '13: s-stats (Voortgang-detail) bestaat nog als scherm');
ok(/onclick="go\('s-stats'\)"/.test(HTML), '13b: s-stats is nog ergens vanuit de UI bereikbaar (o.a. vanuit s-inzicht)');

/* ══ 14-16. Actieve tab-context klopt semantisch in detailflows ══ */
console.log('14-16. Actieve tab-context in detailflows');
ok(z.tkPrimaryTabFor('s-lichaam') === 'inzicht', '14a: s-lichaam -> Inzicht-context');
ok(z.tkPrimaryTabFor('s-lich-verbanden') === 'inzicht', '14b: s-lich-verbanden (detail) -> Inzicht-context');
ok(z.tkPrimaryTabFor('s-stats') === 'inzicht', '14c: s-stats (Voortgang-detail) -> Inzicht-context');
ok(z.tkPrimaryTabFor('s-nutrition') === 'inzicht', '14d: s-nutrition -> Inzicht-context');
ok(z.tkPrimaryTabFor('s-running-insights') === 'inzicht', '14e: analyse-schermen (-insights) -> Inzicht-context');
ok(z.tkPrimaryTabFor('s-running') === 'trainen', '15a: s-running (uitvoering) -> Trainen-context, niet Inzicht');
ok(z.tkPrimaryTabFor('s-train-detail') === 'trainen', '15b: s-train-detail -> Trainen-context');
ok(z.tkPrimaryTabFor('s-builder') === 'trainen', '15c: s-builder -> Trainen-context');
ok(z.tkPrimaryTabFor('s-social') === 'samen', '16a: s-social -> Samen-context');
ok(z.tkPrimaryTabFor('s-message-thread') === 'samen', '16b: s-message-thread (detail) -> Samen-context');
ok(z.tkPrimaryTabFor('s-coach') === 'coach', '16c: s-coach -> Coach-context (regressie t.o.v. bestaande tab)');

/* ══ Non-primary surfaces muteren de actieve tab niet (Profiel/Instellingen/Help/Privacy) ══ */
console.log('Non-primary surfaces');
ok(z.tkPrimaryTabFor('s-profiel') === null, 'NP1: s-profiel heeft geen eigen primary-tab-context (avatar-only surface)');
ok(z.tkPrimaryTabFor('s-settings') === null, 'NP2: s-settings heeft geen eigen primary-tab-context');
ok(z.tkPrimaryTabFor('s-help') === null, 'NP3: s-help heeft geen eigen primary-tab-context');
ok(z.tkPrimaryTabFor('s-privacy') === null, 'NP4: s-privacy heeft geen eigen primary-tab-context');
ok(z.tkPrimaryTabFor('s-auth') === null, 'NP5: s-auth (nog niet ingelogd) heeft geen primary-tab-context');
ok(z.tkPrimaryTabFor('s-onboarding') === null, 'NP6: s-onboarding heeft geen primary-tab-context');

/* ══ 20. Safe-area behouden ══ */
console.log('20. Safe-area');
ok(/\.bnav\{[^}]*env\(safe-area-inset-bottom/.test(HTML), '20: .bnav respecteert nog steeds de Android safe-area-inset-bottom');

/* ══ 21. Accessibility semantics ══ */
console.log('21. Accessibility');
ok(HTML.indexOf('<nav class="bnav" role="navigation" aria-label="Hoofdnavigatie">') > -1,
  '21a: elke nav-shell heeft role="navigation" + aria-label');
var renderFn = slice('function tkPrimaryNavHtml(', '\n}');
ok(/aria-current="page"/.test(renderFn), '21b: de actieve tab krijgt aria-current="page" (niet alleen kleur)');
ok(/aria-hidden="true"/.test(renderFn), '21c: het decoratieve icoon is aria-hidden, het label draagt de betekenis');

/* ══ 22. tkPaintBnav raakt geen trainingstoestand aan ══ */
console.log('22. Geen state-mutatie buiten de nav zelf');
var paintFn = slice('function tkPaintBnav(', '\n}');
ok(!/curT\s*=/.test(paintFn) && !/activeInstanceId\s*=/.test(paintFn),
  '22: tkPaintBnav() wijzigt geen trainings-/instance-state, alleen de zichtbare nav-shell');

/* ══ Prefix-mapping dekt ook dynamische schermen zonder onderhoud ══ */
console.log('Dynamische schermen');
ok(z.tkPrimaryTabFor('s-train-hyroxwod') === 'trainen',
  'DYN1: een dynamisch aangemaakt s-train-<naam>-scherm valt automatisch onder Trainen, zonder per-scherm regel');

console.log('\n========================================================');
console.log('fUxAppShellCanonicalNav.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
