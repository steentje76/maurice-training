/* fProfielSprint2VisualFidelity.test.js — PROFIEL SPRINT 2: hero-CSS-consolidatie,
 * copy-waarheid, source-aware back-navigation, Help/Feedback-deeplink.
 *
 * AANLEIDING. Root cause van de donkere hero was een verouderde Sprint 5.2 CSS-regel
 * die later in de cascade stond dan de canonical witte regel en dus won (zelfde
 * specificity, latere brondocumentvolgorde). Daarnaast waren s-privacy/s-help/
 * s-meldingen hardcoded terug naar s-settings, ook als de gebruiker via Profiel
 * binnenkwam, en deden "Feedback" en "Help & ondersteuning" op Profiel allebei kaal
 * go('s-help') zonder enig verschil voor de gebruiker.
 *
 * Deze suite legt vast:
 *   A. de vier oude, conflicterende hero-declaraties zijn uit het Sprint 5.2-blok
 *      verwijderd en bestaan nog maar één keer in de stylesheet (single source);
 *   B. Privacy & delen / Account & data-copy komt exact overeen met de werkelijke
 *      functionaliteit (geen "onderzoek en export" op een rij die daar niet naartoe
 *      leidt, geen "verwijderen" op de non-destructieve accountflow);
 *   C. tkNavGoBack() gaat terug naar de daadwerkelijke schermherkomst (Profiel of
 *      Instellingen), met een veilige fallback wanneer de stack leeg is;
 *   D. openHelpFeedback() navigeert naar Help en scrollt/focust de bestaande
 *      Contact & feedback-kaart (geen tweede formulier).
 *
 * Draai: node core/fProfielSprint2VisualFidelity.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

/* ══ A. HERO CSS — single source of truth ═══════════════════════════════════ */
console.log('A. Hero CSS-consolidatie');

var heroBlokMatches = HTML.match(/#s-profiel \.pf-hero\{/g) || [];
ok(heroBlokMatches.length === 1, 'A1: #s-profiel .pf-hero komt precies één keer voor (geen tweede, conflicterende declaratie)');

var canonicalHero = HTML.slice(HTML.indexOf('WITTE canonical personal summary'), HTML.indexOf('WITTE canonical personal summary') + 900);
ok(/background:#fff/.test(canonicalHero), 'A2: canonical hero-regel zet een witte achtergrond');
ok(/position:relative/.test(canonicalHero), 'A3: canonical hero-regel bevat position:relative (nodig voor .pf-hero-edit-positionering, voorheen alleen in het oude blok)');
ok(/margin-bottom:6px/.test(canonicalHero), 'A4: canonical hero-regel bevat de margin-bottom uit het oude blok');

var oudSprintBlok = HTML.slice(HTML.indexOf('v4.19.0 — Sprint 5.2 Profiel Redesign'), HTML.indexOf('v4.19.0 — Sprint 5.2 Profiel Redesign') + 2200);
ok(!/#s-profiel \.pf-hero\{background:#0E3B4A/.test(oudSprintBlok), 'A5: de oude donkere .pf-hero-achtergrond staat niet meer in het Sprint 5.2-blok');
ok(!/#s-profiel \.pf-hero-nm\{[^}]*color:#fff/.test(oudSprintBlok), 'A6: de oude witte .pf-hero-nm-tekstkleur staat niet meer in het Sprint 5.2-blok');
ok(!/#s-profiel \.pf-hero-sub\{[^}]*color:rgba\(230,240,243/.test(oudSprintBlok), 'A7: de oude lichte .pf-hero-sub-tekstkleur staat niet meer in het Sprint 5.2-blok');
ok(!/#s-profiel \.pf-hero-edit svg\{[^}]*stroke:#fff/.test(oudSprintBlok), 'A8: de oude witte .pf-hero-edit svg-stroke staat niet meer in het Sprint 5.2-blok');
ok(/#s-profiel \.pf-hero-top\{/.test(oudSprintBlok), 'A9: niet-conflicterende layoutregels (pf-hero-top) blijven intact in het Sprint 5.2-blok');
ok(/\.pf-hero-edit\{position:absolute/.test(oudSprintBlok), 'A10: de edit-knop-positionering (P3-fix) blijft ongewijzigd in het Sprint 5.2-blok');

/* ══ B. COPY-WAARHEID ════════════════════════════════════════════════════════ */
console.log('B. Copy-waarheid');

function blok(id) {
  var s = HTML.indexOf('id="' + id + '"');
  assert.ok(s >= 0, id + ' niet gevonden');
  var e = HTML.indexOf('class="scr" id="s-', s + 10);
  return e > s ? HTML.slice(s, e) : HTML.slice(s);
}
var PROFIEL = blok('s-profiel');

ok(/Privacy &amp;delen|Privacy &amp; delen/.test(PROFIEL), 'B1: Privacy & delen-rij bestaat nog op Profiel');
ok(PROFIEL.indexOf('Wat we opslaan en waarom') !== -1, 'B2: Privacy & delen-subtitel is "Wat we opslaan en waarom" (identiek aan de kop van s-privacy zelf)');
ok(PROFIEL.indexOf('Wat je deelt, onderzoek en export') === -1, 'B3: de oude, misleidende Privacy-subtitel ("onderzoek en export") komt niet meer voor');

ok(PROFIEL.indexOf('E-mail, wachtwoord en gegevens exporteren') !== -1, 'B4: Account & data-subtitel noemt alleen non-destructieve functies');
ok(PROFIEL.indexOf('E-mail, wachtwoord, export en verwijderen') === -1, 'B5: de oude Account & data-subtitel (die "verwijderen" suggereerde) komt niet meer voor');

var mAccount = HTML.slice(HTML.indexOf('id="m-account"'), HTML.indexOf('id="m-account"') + 1500);
ok(mAccount.indexOf('deleteAccount()') === -1, 'B6: m-account bevat zelf geen deleteAccount()-actie (destructief blijft apart, dus de copy klopt met de werkelijke inhoud)');

/* ══ C. SOURCE-AWARE BACK-NAVIGATION ═════════════════════════════════════════ */
console.log('C. tkNavGoBack()');

function navBron() {
  var start = HTML.indexOf('let tkNavStack=[];');
  var eind = HTML.indexOf("window.addEventListener('popstate'", start);
  assert.ok(start > 0 && eind > start, 'navigatieblok (incl. tkNavGoBack) niet gevonden');
  return HTML.slice(start, eind).replace(/^let /gm, 'var ').replace(/^const /gm, 'var ');
}
var NAVBRON = navBron();
ok(NAVBRON.indexOf('function tkNavGoBack') !== -1, 'C0: tkNavGoBack() zit in het geëxtraheerde navigatieblok');

function nepDom(schermIds) {
  var el = {};
  (schermIds || []).forEach(function (id) { el[id] = { id: id, soort: 'scr', actief: false }; });
  return {
    _el: el,
    getElementById: function (id) { return el[id] || null; },
    querySelector: function (sel) {
      var ids = Object.keys(el);
      for (var i = 0; i < ids.length; i++) { if (el[ids[i]].soort === 'scr' && el[ids[i]].actief) return el[ids[i]]; }
      return null;
    },
    querySelectorAll: function () { return { forEach: function () {} }; }
  };
}
function zandbak(schermen, start) {
  var doc = nepDom(schermen);
  doc._el[start].actief = true;
  var ctx = {
    console: console,
    document: doc,
    history: { pushState: function () {} },
    focusScreenForA11y: function () {},
    stopTrainTimer: function () {},
    addEventListener: function () {}
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  new vm.Script(
    'function go(id){document.querySelectorAll(".scr").forEach(function(){});' +
    'Object.keys(document._el).forEach(function(k){document._el[k].actief=false;});' +
    'var el=document.getElementById(id); if(el)el.actief=true; }\n' + NAVBRON,
    { filename: 'nav-bron.js' }
  ).runInContext(ctx);
  return { ctx: ctx, doc: doc };
}

// C1: Profiel -> Privacy -> terug = Profiel
{
  var z = zandbak(['s-profiel', 's-privacy', 's-settings'], 's-profiel');
  z.ctx.go('s-privacy');
  ok(z.doc._el['s-privacy'].actief === true, 'C1a: op s-privacy na go() vanaf Profiel');
  z.ctx.tkNavGoBack('s-settings');
  ok(z.doc._el['s-profiel'].actief === true, 'C1b: tkNavGoBack() vanaf s-privacy (binnengekomen via Profiel) gaat terug naar Profiel, niet naar s-settings');
}

// C2: Instellingen -> Privacy -> terug = Instellingen
{
  var z = zandbak(['s-profiel', 's-settings', 's-privacy'], 's-settings');
  z.ctx.go('s-privacy');
  z.ctx.tkNavGoBack('s-settings');
  ok(z.doc._el['s-settings'].actief === true, 'C2: tkNavGoBack() vanaf s-privacy (binnengekomen via Instellingen) gaat terug naar Instellingen');
}

// C3: Profiel -> Help -> terug = Profiel
{
  var z = zandbak(['s-profiel', 's-help', 's-settings'], 's-profiel');
  z.ctx.go('s-help');
  z.ctx.tkNavGoBack('s-settings');
  ok(z.doc._el['s-profiel'].actief === true, 'C3: tkNavGoBack() vanaf s-help (binnengekomen via Profiel) gaat terug naar Profiel');
}

// C4: Instellingen -> Meldingen -> terug = Instellingen
{
  var z = zandbak(['s-profiel', 's-settings', 's-meldingen'], 's-settings');
  z.ctx.go('s-meldingen');
  z.ctx.tkNavGoBack('s-settings');
  ok(z.doc._el['s-settings'].actief === true, 'C4: tkNavGoBack() vanaf s-meldingen (binnengekomen via Instellingen) gaat terug naar Instellingen');
}

// C5: lege stack (bv. direct diep gelinkt) -> veilige fallback, geen crash
{
  var z = zandbak(['s-privacy', 's-settings'], 's-privacy');
  z.ctx.tkNavGoBack('s-settings');
  ok(z.doc._el['s-settings'].actief === true, 'C5: tkNavGoBack() met lege stack valt terug op het opgegeven fallback-scherm');
}

/* ══ D. HELP/FEEDBACK-DEEPLINK ═══════════════════════════════════════════════ */
console.log('D. openHelpFeedback()');

function feedbackBron() {
  var start = HTML.indexOf('function renderHelpContact(){');
  var eind = HTML.indexOf('function openBeheer(){', start);
  assert.ok(start > 0 && eind > start, 'openHelpFeedback niet gevonden op de verwachte plek');
  return HTML.slice(start, eind).replace(/^let /gm, 'var ').replace(/^const /gm, 'var ');
}
var FEEDBACKBRON = feedbackBron();
ok(FEEDBACKBRON.indexOf('function openHelpFeedback') !== -1, 'D0: openHelpFeedback() gevonden in de bron');

function feedbackZandbak() {
  var gos = [];
  var scrollCalled = false, focusCalled = false;
  var card = {
    scrollIntoView: function () { scrollCalled = true; },
    focus: function () { focusCalled = true; }
  };
  var raf = [];
  var ctx = {
    console: console,
    APP_VER: 'v4.69.68',
    escHtml: function (s) { return s; },
    document: { getElementById: function (id) { return id === 'help-contact-card' ? card : null; } },
    go: function (id) { gos.push(id); },
    requestAnimationFrame: function (fn) { raf.push(fn); }
  };
  vm.createContext(ctx);
  new vm.Script(FEEDBACKBRON, { filename: 'feedback-bron.js' }).runInContext(ctx);
  return { ctx: ctx, gos: gos, raf: raf, scrolled: function () { return scrollCalled; }, focused: function () { return focusCalled; } };
}

{
  var z = feedbackZandbak();
  z.ctx.openHelpFeedback();
  ok(z.gos[0] === 's-help', 'D1: openHelpFeedback() navigeert naar s-help');
  ok(z.raf.length === 1, 'D2: scroll/focus gebeurt via requestAnimationFrame (na de schermwissel, niet ervoor)');
  z.raf[0]();
  ok(z.scrolled() === true, 'D3: de Contact & feedback-kaart wordt in beeld gescrold');
  ok(z.focused() === true, 'D4: de Contact & feedback-kaart krijgt focus (toetsenbord/screenreader)');
}

ok(HTML.indexOf('id="help-contact-card" tabindex="-1"') !== -1, 'D5: de Contact & feedback-kaart is programmatisch focusbaar (tabindex="-1"), geen normale tab-stop');
ok(PROFIEL.indexOf('onclick="openHelpFeedback()"') !== -1, 'D6: de Feedback-rij op Profiel roept openHelpFeedback() aan, niet meer kaal go(\'s-help\')');

var helpFeedbackRowIdx = PROFIEL.indexOf('openHelpFeedback()');
var helpRowIdx = PROFIEL.indexOf("go('s-help')");
ok(helpFeedbackRowIdx !== -1 && helpRowIdx !== -1 && helpFeedbackRowIdx !== helpRowIdx,
  'D7: Feedback en Help & ondersteuning roepen verschillende functies aan (geen dubbele, identieke route meer)');

console.log('\n========================================================');
console.log('fProfielSprint2VisualFidelity.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
