/* fPlatformGrens.test.js — v4.49.0: de grens tussen web, Capacitor-app en server
 *
 * Drie bevindingen uit de audits op FASE 11 (Android), FASE 12 (Concept2) en FASE 13
 * (security). Ze horen bij elkaar omdat ze alle drie gaan over wat er gebeurt zodra de
 * app NIET meer op zijn eigen weboorsprong draait.
 *
 *  P0  Alle Netlify-functies werden met een relatief pad aangeroepen. In de Capacitor-app
 *      draait alles op https://localhost, dus resolveerden die paden naar de lokale
 *      assetserver: AI-coach, wearable-sync, account verwijderen en teambeheer waren in de
 *      Android-app stuk. De functies gaven bovendien geen CORS-headers terug.
 *  P0  Vrije tekst (oefeningsnamen, trainingsnamen) werd in onclick-attributen
 *      geïnterpoleerd met escaping die daar niet werkt. Namen komen in dit project van een
 *      coach of gym-eigenaar en zijn voor alle leden zichtbaar — opgeslagen XSS dus, met
 *      het sessie-JWT uit localStorage binnen bereik.
 *  P2  De Concept2-simulator stond op de browser-global en zat daarmee in het uitgeleverde
 *      Android-artefact. Zijn verzonnen metingen dragen provenance 'concept2_live_ble' en
 *      zijn niet van echte metingen te onderscheiden.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var wortel = path.join(__dirname, '..');
var HTML = fs.readFileSync(path.join(wortel, 'index.html'), 'utf8');
var SW = fs.readFileSync(path.join(wortel, 'sw.js'), 'utf8');
var TOML = fs.readFileSync(path.join(wortel, 'netlify.toml'), 'utf8');
var CORS = require(path.join(wortel, 'netlify', 'functions', '_cors.js'));

var geslaagd = 0, mislukt = 0, wachtend = [];
function t(naam, fn) {
  try { fn(); geslaagd++; console.log('  ✓ ' + naam); }
  catch (e) { mislukt++; console.log('  ✗ ' + naam + ' :: ' + (e && e.message)); }
}
function tAsync(naam, fn) { wachtend.push({ naam: naam, fn: fn }); }

function pak(naam) {
  var m = HTML.match(new RegExp('(?:^|\\n)(?:async )?function ' + naam + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
  assert.ok(m, 'functie niet gevonden in index.html: ' + naam);
  return m[0];
}

var FUNCTIES_MET_CORS = ['coach', 'delete-account', 'gym-team', 'gym-team-set-pin',
                         'wearable-status', 'wearable-auth-start', 'wearable-disconnect', 'wearable-sync'];

/* ══ A. DE FUNCTIES ZIJN BEREIKBAAR VANUIT DE APP ══════════════════════════ */
console.log('\nA. Bereikbaarheid van de Netlify-functies');

t('A1: er staat geen enkel relatief functiepad meer in de app', function () {
  var code = HTML.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(code.indexOf("fetch('/.netlify/functions/") < 0,
    'een relatief pad resolveert in de Capacitor-app naar https://localhost en raakt de lokale assetserver');
});

t('A2: elke aanroep loopt via één constante', function () {
  var n = (HTML.match(/fetch\(FN_BASE\+/g) || []).length;
  assert.ok(n >= 15, 'niet alle aanroepen gebruiken FN_BASE (' + n + ' gevonden)');
  assert.ok(/const FN_BASE = FN_ORIGIN \+ '\/\.netlify\/functions\/';/.test(HTML), 'FN_BASE ontbreekt');
});

t('A4: elke AI-aanroep loopt langs de toestemmingspoort', function () {
  /* v4.49.0 — de privacyverklaring belooft dat de AI-coach zonder toestemming niet wordt
     gebruikt. ensureAiConsent() stond maar op één plek; vijf andere aanroepen stuurden
     gezondheids- en trainingsgegevens zonder die controle. Er hoort nog precies één
     rechtstreekse coach-fetch te bestaan: die ín coachFetch zelf. */
  var direct = (HTML.match(/fetch\(FN_BASE\+'coach'/g) || []).length;
  assert.strictEqual(direct, 1, 'er zijn ' + direct + ' rechtstreekse AI-aanroepen; alles hoort via coachFetch te gaan');
  var poort = HTML.match(/async function coachFetch\(payload\)\{[\s\S]*?\n\}/);
  assert.ok(poort, 'coachFetch ontbreekt');
  assert.ok(poort[0].indexOf('await ensureAiConsent()') >= 0, 'coachFetch controleert de toestemming niet');
  var gebruikers = (HTML.match(/await coachFetch\(/g) || []).length;
  assert.ok(gebruikers >= 6, 'niet alle AI-aanroepen gaan via de poort (' + gebruikers + ')');
});

t('A3: FN_ORIGIN volgt exact dezelfde regel als MEDIA_ORIGIN in de service worker', function () {
  assert.ok(/const FN_ORIGIN = \(location\.hostname === 'localhost' \|\| location\.hostname === '127\.0\.0\.1'\)/.test(HTML),
    'FN_ORIGIN kiest niet op hostname');
  var mediaHost = SW.match(/\?\s*'(https:\/\/[a-z0-9.-]+)'/);
  var fnHost = HTML.match(/const FN_ORIGIN = [\s\S]{0,140}?\?\s*'(https:\/\/[a-z0-9.-]+)'/);
  assert.ok(mediaHost && fnHost, 'de productie-oorsprong is niet gevonden');
  assert.strictEqual(fnHost[1], mediaHost[1],
    'de app haalt functies en video\'s bij verschillende oorsprongen op — dat is een tweede codepad');
});

/* ══ B. CORS: TOEGANG VOOR DE APP, NIET VOOR DE WERELD ═════════════════════ */
console.log('\nB. CORS');

t('B1: elke functie die de app aanroept is gewikkeld', function () {
  FUNCTIES_MET_CORS.forEach(function (naam) {
    var src = fs.readFileSync(path.join(wortel, 'netlify', 'functions', naam + '.js'), 'utf8');
    assert.ok(src.indexOf("require('./_cors.js')") >= 0, naam + ' laadt _cors.js niet');
    assert.ok(/exports\.handler = withCors\(_handler\);/.test(src), naam + ' exporteert niet de gewikkelde handler');
  });
});

t('B2: de JWT-verificatie is nergens verdwenen', function () {
  FUNCTIES_MET_CORS.forEach(function (naam) {
    var src = fs.readFileSync(path.join(wortel, 'netlify', 'functions', naam + '.js'), 'utf8');
    assert.ok(src.indexOf('/auth/v1/user') >= 0, naam + ' verifieert de sessie niet meer');
  });
});

t('B3: de toegestane oorsprongen zijn een expliciete lijst, geen sterretje', function () {
  assert.ok(CORS.TOEGESTANE_OORSPRONGEN.indexOf('*') < 0, 'een open CORS-beleid op geauthenticeerde endpoints');
  assert.ok(CORS.TOEGESTANE_OORSPRONGEN.indexOf('https://localhost') >= 0, 'Capacitor Android ontbreekt');
});

t('B4: een onbekende oorsprong krijgt geen enkele header terug', function () {
  var h = CORS.corsHeaders({ headers: { origin: 'https://kwaadaardig.example' } });
  assert.deepStrictEqual(h, {}, 'een willekeurige site kan het antwoord lezen');
  assert.deepStrictEqual(CORS.corsHeaders({ headers: {} }), {}, 'zonder Origin horen er geen CORS-headers te zijn');
});

t('B5: een toegestane oorsprong krijgt precies de eigen oorsprong terug', function () {
  var h = CORS.corsHeaders({ headers: { origin: 'https://localhost' } });
  assert.strictEqual(h['Access-Control-Allow-Origin'], 'https://localhost');
  assert.strictEqual(h['Vary'], 'Origin', 'zonder Vary kan een cache het antwoord aan de verkeerde oorsprong geven');
  assert.ok(h['Access-Control-Allow-Headers'].indexOf('Authorization') >= 0);
});

tAsync('B6: de preflight wordt beantwoord en bereikt de handler niet', function () {
  var geraakt = 0;
  var h = CORS.withCors(function () { geraakt++; return Promise.resolve({ statusCode: 200, body: 'x' }); });
  return h({ httpMethod: 'OPTIONS', headers: { origin: 'https://localhost' } }).then(function (res) {
    assert.strictEqual(res.statusCode, 204, 'de preflight kreeg geen bruikbaar antwoord — het echte verzoek volgt dan nooit');
    assert.strictEqual(geraakt, 0, 'de preflight is door de handler heen gelopen');
    assert.strictEqual(res.headers['Access-Control-Allow-Origin'], 'https://localhost');
  });
});

tAsync('B7: het antwoord van de handler blijft ongewijzigd, alleen aangevuld', function () {
  var h = CORS.withCors(function () {
    return Promise.resolve({ statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: '{"e":1}' });
  });
  return h({ httpMethod: 'POST', headers: { origin: 'https://localhost' } }).then(function (res) {
    assert.strictEqual(res.statusCode, 401, 'de statuscode van de handler is aangepast');
    assert.strictEqual(res.body, '{"e":1}');
    assert.strictEqual(res.headers['Content-Type'], 'application/json', 'bestaande headers zijn verdwenen');
    assert.strictEqual(res.headers['Access-Control-Allow-Origin'], 'https://localhost');
  });
});

t('B8: video\'s zijn cross-origin op te halen, functies niet zomaar', function () {
  assert.ok(/for = "\/videos\/\*"/.test(TOML) && /Access-Control-Allow-Origin = "\*"/.test(TOML),
    'zonder deze header blijft elke techniekvideo in de Android-app leeg');
  assert.ok(!/for = "\/\.netlify\/functions/.test(TOML),
    'een blanket-header op de functies zou de expliciete oorsprongslijst omzeilen');
});

/* ══ C. VRIJE TEKST IN EEN EVENT-ATTRIBUUT ═════════════════════════════════ */
console.log('\nC. Attribuut-interpolatie');

var ctx = { escHtml: null, attrArg: null };
vm.createContext(ctx);
vm.runInContext([pak('escHtml'), pak('attrArg')].join('\n'), ctx);

t('C1: attrArg levert een geldig, ontsnapt JS-literal', function () {
  assert.strictEqual(ctx.attrArg('squat'), '&quot;squat&quot;');
  assert.strictEqual(ctx.attrArg(null), 'null');
  assert.strictEqual(ctx.attrArg(undefined), 'null');
  assert.strictEqual(ctx.attrArg(12), '12');
});

t('C2: een naam met aanhalingstekens breekt niet uit het attribuut', function () {
  var uit = ctx.attrArg('Front Squat "zwaar"');
  assert.ok(uit.indexOf('"') < 0, 'er staat een onontsnapt dubbel aanhalingsteken in het attribuut');
  assert.ok(uit.indexOf("'") < 0, 'er staat een onontsnapt enkel aanhalingsteken in het attribuut');
});

t('C3: een naam met een apostrof breekt niet uit het attribuut', function () {
  var uit = ctx.attrArg("Farmer's walk");
  assert.ok(uit.indexOf("'") < 0);
  assert.ok(uit.indexOf('&#39;') >= 0, 'de apostrof is niet ge-escaped');
});

t('C4: een injectiepoging blijft een gewone string', function () {
  var boos = "x\" onmouseover=\"alert(1)";
  var uit = ctx.attrArg(boos);
  assert.ok(uit.indexOf('onmouseover="') < 0, 'de payload kan een nieuw attribuut openen');
  /* Na HTML-decodering moet er precies één JS-stringliteral overblijven met de originele
     inhoud — geen code. */
  var gedecodeerd = uit.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  assert.strictEqual(JSON.parse(gedecodeerd), boos, 'de waarde overleeft de heen-en-terugweg niet ongeschonden');
});

t('C5: geen enkel event-attribuut gebruikt escHtml nog als JS-escaping', function () {
  assert.strictEqual((HTML.match(/onclick="[^"]*'\$\{escHtml\(/g) || []).length, 0,
    'escHtml binnen een JS-stringliteral werkt niet: de HTML-parser decodeert de entiteit vóór JS het ziet');
});

t('C6: de oefeningsnaam gaat veilig naar de coach-knop', function () {
  assert.ok(HTML.indexOf("askCoachEx(${attrArg(ex.name||'deze oefening')},null,${attrArg(ex.id)})") >= 0,
    'de handmatige quote-escaping staat er nog — een naam met een dubbel aanhalingsteken breekt uit het attribuut');
  assert.ok(!/askCoachEx\('\$\{\(ex\.name/.test(HTML), 'het oude, onveilige patroon staat er nog');
});

t('C7: er staat geen vrije tekst meer rauw in een enkel aangehaald event-attribuut', function () {
  var treffers = (HTML.match(/onclick='[^']*\$\{JSON\.stringify\(/g) || []);
  assert.strictEqual(treffers.length, 0,
    'JSON.stringify ontsnapt geen apostrof; binnen een enkel aangehaald attribuut kan de waarde dus uitbreken');
});

/* ══ D. GEEN SIMULATIE IN HET UITGELEVERDE ARTEFACT ════════════════════════ */
console.log('\nD. Concept2-simulator');

t('D1: de simulator staat niet op de browser-global', function () {
  var src = fs.readFileSync(path.join(wortel, 'core', 'concept2Live.js'), 'utf8');
  assert.ok(!/makeMockConcept2PM5: makeMockConcept2PM5/.test(src),
    'de simulator zit in het object dat als window.Concept2Live wordt gezet');
  assert.ok(/Concept2Live\.makeMockConcept2PM5 = makeMockConcept2PM5;/.test(src),
    'hij hoort wél beschikbaar te blijven onder CommonJS, anders vallen de tests om');
});

t('D2: onder CommonJS blijft hij gewoon werken', function () {
  var C2 = require(path.join(wortel, 'core', 'concept2Live.js'));
  assert.strictEqual(typeof C2.makeMockConcept2PM5, 'function', 'de bestaande tests kunnen hem niet meer gebruiken');
});

t('D3: de app roept de simulator nergens aan', function () {
  assert.ok(HTML.indexOf('makeMockConcept2PM5') < 0, 'er is een codepad naar simulatiedata in de app');
});

t('D5: wat de gebruiker downloadt bevat geen ongebruikte gegevensbestanden', function () {
  /* v4.49.0, FASE 14 — gemeten, niet gegokt: exercise-catalog.json (296 kB) en
     exercise-intelligence_6.json (8,3 MB) werden meegebundeld terwijl er geen enkele
     verwijzing naar bestaat. Dat was 60% van de artefact-omvang.
     Deze test bewaakt BEIDE kanten: ze mogen er niet in zitten zolang niets ze gebruikt,
     en zodra iets ze wel gebruikt moet de bundel-allowlist meegroeien. */
  var build = fs.readFileSync(path.join(wortel, 'scripts', 'build-www.mjs'), 'utf8');
  var appBronnen = HTML + SW + fs.readdirSync(path.join(wortel, 'core'))
    .filter(function (f) { return /\.js$/.test(f) && !/\.test\.js$/.test(f); })
    .map(function (f) { return fs.readFileSync(path.join(wortel, 'core', f), 'utf8'); }).join('\n');
  ['exercise-catalog.json', 'exercise-intelligence_6.json'].forEach(function (naam) {
    var gebruikt = appBronnen.indexOf(naam) >= 0;
    var gebundeld = new RegExp("'" + naam.replace('.', '\\.') + "'").test(build.replace(/\/\/[^\n]*/g, ''));
    assert.strictEqual(gebundeld, gebruikt,
      gebruikt ? (naam + ' wordt runtime opgehaald maar niet meegebundeld — offline breekt hij')
               : (naam + ' wordt meegebundeld maar nergens gebruikt — dat is dood gewicht in de download'));
  });
});

t('D4: er wordt nergens een meetwaarde verzonnen', function () {
  ['concept2Live.js', 'deviceIntegration.js'].forEach(function (f) {
    var src = fs.readFileSync(path.join(wortel, 'core', f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
    assert.ok(src.indexOf('Math.random') < 0, 'Math.random in ' + f + ' — een meetwaarde mag nooit gegokt worden');
  });
});

/* ══ SLOT ═══════════════════════════════════════════════════════════════════ */
(function volgende(i) {
  if (i >= wachtend.length) {
    console.log('\n========================================================');
    console.log('RESULTAAT: ' + geslaagd + ' geslaagd, ' + mislukt + ' mislukt');
    if (mislukt) { console.log('❌ Platformgrens niet groen.'); process.exit(1); }
    console.log('✅ Platformgrens groen.');
    return;
  }
  var w = wachtend[i];
  Promise.resolve().then(w.fn).then(
    function () { geslaagd++; console.log('  ✓ ' + w.naam); volgende(i + 1); },
    function (e) { mislukt++; console.log('  ✗ ' + w.naam + ' :: ' + (e && e.message)); volgende(i + 1); }
  );
})(0);
