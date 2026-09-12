/* fNavigatie.test.js — RC0: terug-navigatie voor Android
 *
 * AANLEIDING. De app wordt als Capacitor-app naar Google Play gebracht. De standaard
 * BridgeActivity vertaalt de hardware-terugknop en de terugveeg naar webView.goBack()
 * zolang de WebView geschiedenis heeft, en sluit anders de activiteit. Trainingskompas
 * bouwde geen enkele history-entry op — go() wisselt alleen een .active-klasse — dus
 * elke terugveeg sloot de app af, ook vanuit een diep scherm. Deze suite draait de
 * verzonden navigatiecode uit index.html in een zandbak met een nagebouwde DOM en
 * history, en legt het gedrag vast dat een tester op een toestel ondervindt.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var n = 0;
function t(naam, fn) { fn(); n++; }

/* Het volledige navigatieblok zoals het wordt uitgeleverd — inclusief het omhulsel om
   go() en de popstate-handler. Die twee zijn geen functiedeclaraties en zouden met een
   functie-extractie gemist worden; juist daar zit het gedrag. */
function navBlok() {
  var start = HTML.indexOf('let tkNavStack=[];');
  assert.ok(start > 0, 'navigatieblok niet gevonden in index.html');
  var eind = HTML.indexOf('function openModal(id){', start);
  assert.ok(eind > start, 'einde van het navigatieblok niet gevonden');
  return HTML.slice(start, eind)
    .replace(/^let /gm, 'var ').replace(/^const /gm, 'var ');
}

/* ── Nagebouwde DOM ────────────────────────────────────────────────────────── */
// WAVE 1 (RC-OVL-01/RC-OVL-02): confirmIds en execIds simuleren respectievelijk
// een open confirmModal()-dialoog (.tk-confirm-bg) en een open execution-sheet
// (.exec-overlay.open). Een confirm-element krijgt een minimale querySelector
// die de echte '.tk-confirm-cancel'-knop nabootst: klikken zet 'open' op false
// en registreert de annulering, exact zoals confirmModal()'s eigen done(false).
function nepDom(schermIds, modalIds, confirmIds, execIds) {
  var el = {};
  var confirmCancelled = [];
  (schermIds || []).forEach(function (id) { el[id] = { id: id, soort: 'scr', actief: false }; });
  (modalIds || []).forEach(function (id) { el[id] = { id: id, soort: 'modal', open: false }; });
  (confirmIds || []).forEach(function (id) {
    el[id] = {
      id: id, soort: 'confirm', open: false,
      querySelector: function (sel) {
        if (sel !== '.tk-confirm-cancel') return null;
        var self = el[id];
        return { click: function () { self.open = false; confirmCancelled.push(id); } };
      }
    };
  });
  (execIds || []).forEach(function (id) { el[id] = { id: id, soort: 'exec', open: false }; });
  return {
    _el: el,
    _confirmCancelled: confirmCancelled,
    getElementById: function (id) { return el[id] || null; },
    querySelector: function (sel) {
      var ids = Object.keys(el);
      for (var i = 0; i < ids.length; i++) {
        var e = el[ids[i]];
        if (sel.indexOf('.modal-bg.open') === 0) { if (e.soort === 'modal' && e.open) return e; }
        else if (sel.indexOf('.tk-confirm-bg') === 0) { if (e.soort === 'confirm' && e.open) return e; }
        else if (sel.indexOf('.exec-overlay.open') === 0) { if (e.soort === 'exec' && e.open) return e; }
        else if (e.soort === 'scr' && e.actief) return e;
      }
      return null;
    },
    querySelectorAll: function () { return { forEach: function () {} }; }
  };
}

function zandbak(opts) {
  opts = opts || {};
  var doc = nepDom(opts.schermen || ['s-home', 's-lichaam', 's-lich-verbanden', 's-coach', 's-stats'],
                   opts.modals || ['m-hrv'], opts.confirms || [], opts.execs || []);
  var stapel = [];   /* nagebouwde browser-history */
  var handlers = [];
  var ctx = {
    console: console, Date: Date, Math: Math, Object: Object, JSON: JSON,
    document: doc,
    _historyDiepte: function () { return stapel.length; },
    history: { pushState: function (st) { stapel.push(st); } },
    window: {
      addEventListener: function (naam, fn) { if (naam === 'popstate') handlers.push(fn); },
      /* Draait de app als geïnstalleerde app (Capacitor/PWA) of als gewone browsertab?
         Dat onderscheid bepaalt of 'terug op het beginscherm' om bevestiging vraagt. */
      Capacitor: opts.appModus === false ? undefined : {},
      matchMedia: function () { return { matches: opts.appModus !== false }; }
    },
    coachReturn: opts.coachReturn || null,
    returnToTraining: function () { ctx._returnToTraining = (ctx._returnToTraining || 0) + 1; },
    closeModal: function (id) { doc._el[id].open = false; ctx._gesloten = (ctx._gesloten || []); ctx._gesloten.push(id); },
    // WAVE 1: closeExecOverlay() bestaat al in de echte app (buiten het geëxtraheerde
    // navBlok) — hier gestubd met exact hetzelfde effect (classList 'open' verwijderen).
    closeExecOverlay: function (id) { if (doc._el[id]) { doc._el[id].open = false; ctx._execGesloten = (ctx._execGesloten || []); ctx._execGesloten.push(id); } },
    toast: function (m) { (ctx._toasts = ctx._toasts || []).push(m); },
    /* de echte go() is 40 regels schermspecifieke render-aanroepen; alleen het
       schermwissel-effect is hier relevant en wordt exact nagebootst */
    go: function (id) {
      if (!doc._el[id]) return;
      Object.keys(doc._el).forEach(function (k) { if (doc._el[k].soort === 'scr') doc._el[k].actief = false; });
      doc._el[id].actief = true;
    }
  };
  ctx.window.go = null;
  vm.createContext(ctx);
  vm.runInContext(navBlok(), ctx);
  /* het omhulsel zet window.go; in de browser is dat dezelfde globale binding */
  ctx.go = ctx.window.go;
  ctx._terug = function () { handlers.forEach(function (f) { f({}); }); };
  ctx._stapel = stapel;
  ctx._confirmCancelled = doc._confirmCancelled;
  return ctx;
}

/* ══ A. Opbouw van de schermstapel ═════════════════════════════════════════ */
console.log('\nA. Schermstapel');

t('A1: een echte schermwissel legt één stap en één history-entry neer', function () {
  var ctx = zandbak();
  var ankerDiepte = ctx._historyDiepte();   /* het startanker uit C4 */
  ctx.go('s-home');
  assert.strictEqual(ctx.tkNavStack.length, 0, 'de eerste activering telt niet als stap terug');
  ctx.go('s-lichaam');
  assert.strictEqual(ctx.tkNavStack.length, 1);
  /* op naam vergelijken: het array leeft in de vm-realm en is dus nooit reference-equal */
  assert.strictEqual(ctx.tkNavStack.join(','), 's-home');
  assert.strictEqual(ctx._historyDiepte(), ankerDiepte + 1,
    'zonder history-entry doet Android niets met de terugknop');
});

t('A2: naar hetzelfde scherm navigeren legt geen stap neer', function () {
  var ctx = zandbak();
  ctx.go('s-home'); ctx.go('s-lichaam');
  var voor = ctx.tkNavStack.length;
  ctx.go('s-lichaam'); ctx.go('s-lichaam');
  assert.strictEqual(ctx.tkNavStack.length, voor, 'herhaalde go() naar hetzelfde scherm stapelt onnodig');
});

t('A3: een onbestaand scherm-id verandert niets', function () {
  var ctx = zandbak();
  ctx.go('s-home');
  ctx.go('s-bestaat-niet');
  assert.strictEqual(ctx.tkNavStack.length, 0);
  assert.strictEqual(ctx.document.querySelector('.scr.active').id, 's-home', 'het actieve scherm is gewisseld');
});

t('A4: de stapel groeit niet ongelimiteerd tijdens een lange sessie', function () {
  var ctx = zandbak();
  ctx.go('s-home');
  for (var i = 0; i < 200; i++) ctx.go(i % 2 ? 's-lichaam' : 's-stats');
  assert.ok(ctx.tkNavStack.length <= ctx.TK_NAV_MAX,
    'stapel is ' + ctx.tkNavStack.length + ', plafond is ' + ctx.TK_NAV_MAX);
});

/* ══ B. Terug ══════════════════════════════════════════════════════════════ */
console.log('\nB. Terug');

t('B1: terug keert naar het vorige scherm in plaats van de app te sluiten', function () {
  var ctx = zandbak();
  ctx.go('s-home'); ctx.go('s-lichaam'); ctx.go('s-lich-verbanden');
  ctx._terug();
  assert.strictEqual(ctx.document.querySelector('.scr.active').id, 's-lichaam');
  ctx._terug();
  assert.strictEqual(ctx.document.querySelector('.scr.active').id, 's-home');
});

t('B2: terugzetten legt zelf geen nieuwe stap neer (geen navigatielus)', function () {
  var ctx = zandbak();
  ctx.go('s-home'); ctx.go('s-lichaam');
  ctx._terug();
  assert.strictEqual(ctx.tkNavStack.length, 0,
    'de terugstap werd zelf weer als vooruitstap geteld — dan kom je nooit bij Home');
});

t('B3: een open modal wordt gesloten in plaats van het scherm te verlaten', function () {
  var ctx = zandbak();
  ctx.go('s-home'); ctx.go('s-lichaam');
  ctx.document._el['m-hrv'].open = true;
  var diepteVoor = ctx.tkNavStack.length;
  ctx._terug();
  assert.strictEqual((ctx._gesloten || []).join(','), 'm-hrv', 'de modal bleef openstaan boven een gewisseld scherm');
  assert.strictEqual(ctx.document.querySelector('.scr.active').id, 's-lichaam', 'het scherm is tóch gewisseld');
  assert.strictEqual(ctx.tkNavStack.length, diepteVoor, 'de schermstapel is aangetast door een modal');
});

t('B4: terug vanuit de coach keert terug naar de lopende training (v306 #7 blijft gelden)', function () {
  var ctx = zandbak({ coachReturn: { screen: 's-lichaam', exId: 'TK-1' } });
  ctx.go('s-home'); ctx.go('s-coach');
  ctx._terug();
  assert.strictEqual(ctx._returnToTraining, 1, 'de coach-regel uit v306 is verdwenen');
  assert.strictEqual(ctx.tkNavStack.length, 1, 'de coach-afhandeling heeft óók de schermstapel geconsumeerd');
});

/* ══ C. Afsluiten ══════════════════════════════════════════════════════════ */
console.log('\nC. Afsluiten vanaf het beginscherm');

t('C1: één keer terug op het beginscherm sluit de app NIET af', function () {
  var ctx = zandbak();
  ctx.go('s-home');
  var diepteVoor = ctx._historyDiepte();
  ctx._terug();
  assert.ok((ctx._toasts || []).length === 1, 'de sporter krijgt geen waarschuwing');
  assert.strictEqual(ctx._historyDiepte(), diepteVoor + 1,
    'er is geen history-entry teruggelegd — de volgende terugveeg sluit de app zonder meer af');
});

t('C2: twee keer kort achter elkaar laat de app wél afsluiten', function () {
  var ctx = zandbak();
  ctx.go('s-home');
  ctx._terug();
  var diepteVoor = ctx._historyDiepte();
  ctx._terug();
  assert.strictEqual(ctx._historyDiepte(), diepteVoor,
    'er wordt opnieuw een entry teruggelegd — de app is dan niet te sluiten');
});

t('C3: na de tijdsvenster telt het opnieuw als eerste keer', function () {
  var ctx = zandbak();
  ctx.go('s-home');
  ctx._terug();
  ctx.tkNavAfsluitArm = Date.now() - (ctx.TK_NAV_AFSLUIT_MS + 500);
  var diepteVoor = ctx._historyDiepte();
  ctx._terug();
  assert.strictEqual(ctx._historyDiepte(), diepteVoor + 1,
    'een terugveeg van veel later wordt als bevestiging geteld — dat sluit de app onbedoeld');
});

t('C4: er is een startanker, anders sluit de allereerste terugveeg de app zonder waarschuwing', function () {
  /* Zonder deze entry is er op het beginscherm niets om terug te gaan: de WebView heeft
     geen geschiedenis, Capacitor sluit de activiteit en regel 4 komt nooit aan bod. */
  var ctx = zandbak();
  assert.ok(ctx._historyDiepte() >= 1, 'er wordt bij het laden geen history-anker gelegd');
});

t('C5: in een gewone browsertab wordt de terugknop niet vastgehouden', function () {
  /* Een website die je niet laat weggaan is onbeleefd. De bevestigingsregel geldt alleen
     voor de geïnstalleerde app, waar terug daadwerkelijk 'afsluiten' betekent. */
  var ctx = zandbak({ appModus: false });
  assert.strictEqual(ctx._historyDiepte(), 0, 'in een browsertab wordt tóch een anker gelegd');
  ctx.go('s-home');
  var diepteVoor = ctx._historyDiepte();
  ctx._terug();
  assert.strictEqual(ctx._historyDiepte(), diepteVoor,
    'de browsertab wordt vastgehouden met een teruggelegde history-entry');
  assert.strictEqual((ctx._toasts || []).length, 0, 'onnodige melding in een browsertab');
});

/* ══ E. Overlay-precedentie (WAVE 1 — RC-OVL-01/RC-OVL-02) ════════════════════
   confirmModal() (.tk-confirm-bg) en de execution-sheets (.exec-overlay.open)
   werden vóór deze wave niet door tkNavTopmostOverlay()/popstate herkend:
   Android Back sloeg ze over en navigeerde het onderliggende scherm weg terwijl
   de overlay zichtbaar bleef. Deze sectie bewijst dat de uitgebreide check nu
   vóór de normale schermstapel-afwikkeling gaat, voor beide overlaytypes, en
   dat een gewone terugstap zonder overlay ongewijzigd blijft werken. */
console.log('\nE. Overlay-precedentie (Wave 1)');

t('E1: Android Back sluit een open confirmModal-dialoog i.p.v. het scherm te wisselen', function () {
  var ctx = zandbak({ confirms: ['c1'] });
  ctx.go('s-home'); ctx.go('s-lichaam');
  ctx.document._el.c1.open = true;   /* confirmModal() staat open, bv. "Doel verwijderen?" */
  var schermVoor = ctx.document.querySelector('.scr.active') ? 's-lichaam' : null;
  ctx._terug();
  assert.strictEqual(ctx.document._el.c1.open, false, 'de confirm-dialoog is gesloten');
  assert.deepStrictEqual(ctx._confirmCancelled, ['c1'], 'sluiten liep via de eigen annuleer-knop (done(false)), geen apart sluitpad');
  var actief = ctx.document._el['s-lichaam'].actief;
  assert.ok(actief, 'het onderliggende scherm (s-lichaam) is NIET weggenavigeerd — bewijst schermVoor=' + schermVoor);
  assert.strictEqual(ctx.tkNavStack.length, 1, 'de schermstapel is niet gepopt door deze terugactie');
});

t('E2: Android Back sluit een open execution-sheet i.p.v. de actieve training te verlaten', function () {
  var ctx = zandbak({ execs: ['exec-pause'] });
  ctx.go('s-home'); ctx.go('s-lichaam');   /* staat model voor een actief trainingsscherm */
  ctx.document._el['exec-pause'].open = true;
  ctx._terug();
  assert.strictEqual(ctx.document._el['exec-pause'].open, false, 'de execution-sheet is gesloten');
  assert.deepStrictEqual(ctx._execGesloten, ['exec-pause'], 'sluiten liep via closeExecOverlay(), geen classList-omweg');
  assert.ok(ctx.document._el['s-lichaam'].actief, 'het onderliggende trainingsscherm is niet weggenavigeerd');
  assert.strictEqual(ctx.tkNavStack.length, 1, 'de schermstapel is niet gepopt door deze terugactie');
});

t('E3: precedentie — een modal-bg gaat vóór een confirm en een exec-overlay als er toevallig meerdere open zouden staan', function () {
  var ctx = zandbak({ modals: ['m-hrv'], confirms: ['c1'], execs: ['exec-pause'] });
  ctx.document._el['m-hrv'].open = true;
  ctx.document._el.c1.open = true;
  ctx.document._el['exec-pause'].open = true;
  ctx._terug();
  assert.deepStrictEqual(ctx._gesloten, ['m-hrv'], 'de modal wordt als eerste/enige gesloten in deze terugactie');
  assert.strictEqual(ctx.document._el.c1.open, true, 'de confirm-dialoog blijft ongemoeid tot de volgende terugactie');
  assert.strictEqual(ctx.document._el['exec-pause'].open, true, 'de execution-sheet blijft ongemoeid tot de volgende terugactie');
});

t('E4: zonder open overlay verandert het bestaande scherm-terugpad niet', function () {
  var ctx = zandbak({ confirms: ['c1'], execs: ['exec-pause'] });
  ctx.go('s-home'); ctx.go('s-lichaam'); ctx.go('s-lich-verbanden');
  ctx._terug();
  assert.strictEqual(ctx.document.querySelector('.scr.active').id, 's-lichaam',
    'gewone terugnavigatie zonder overlay werkt exact als vóór Wave 1');
  assert.strictEqual((ctx._confirmCancelled || []).length, 0);
  assert.strictEqual((ctx._execGesloten || []).length, 0);
});

t('E5: Coach-vanuit-Training-terugkeer (bekende RC-NAV-03) blijft ongewijzigd naast de nieuwe overlay-check', function () {
  var ctx = zandbak({ coachReturn: { screen: 's-lichaam', exId: null } });
  ctx.go('s-home'); ctx.go('s-coach');
  ctx._terug();
  assert.strictEqual(ctx._returnToTraining, 1, 'de bestaande coachReturn-tak wordt nog steeds bereikt (niet per ongeluk afgevangen door de overlay-check)');
});

/* ══ D. Grenzen ════════════════════════════════════════════════════════════ */
console.log('\nD. Grenzen');

t('D1: de navigatie raakt geen enkele schermdefinitie aan', function () {
  var blok = navBlok();
  assert.ok(!/innerHTML/.test(blok), 'de navigatielaag schrijft HTML — dat hoort bij de schermen');
  assert.ok(!/classList\.(add|remove)/.test(blok),
    'de navigatielaag manipuleert zelf schermklassen i.p.v. go() te gebruiken');
});

t('D2: er is precies één popstate-handler in de app', function () {
  var aantal = (HTML.match(/addEventListener\('popstate'/g) || []).length;
  assert.strictEqual(aantal, 1,
    'meerdere popstate-handlers reageren op dezelfde terugveeg en navigeren dubbel (gevonden: ' + aantal + ')');
});

t('D3: het omhulsel roept de oorspronkelijke go() aan en vervangt hem niet', function () {
  var blok = navBlok();
  assert.ok(/const origineel=go;/.test(blok) || /var origineel=go;/.test(blok),
    'de oorspronkelijke go() wordt niet bewaard');
  assert.ok(/origineel\.apply\(this,arguments\)/.test(blok),
    'go() wordt niet met zijn eigen argumenten doorgegeven');
});

console.log('\n========================================================');
console.log('fNavigatie.test.js — ' + n + ' tests geslaagd');
