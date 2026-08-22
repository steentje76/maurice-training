/* fDataStatus.test.js — v4.50.0: "geen gegevens" en "er ging iets mis" zijn niet hetzelfde
 *
 * DE BEVINDING. sbGet gaf `[]` terug bij ÉLKE fout — netwerkstoring, 500, verlopen sessie —
 * en v43SafeGet deed dat bovendien na een timeout van vier seconden. Met 54
 * aanroepplaatsen betekende dat: bij elke wifi-hapering meldde Home "Doe je check-in"
 * terwijl de sporter dat al had gedaan, en het logboek "Nog geen trainingen gelogd"
 * terwijl er honderd sessies in de database stonden. De app loog over zijn eigen
 * geschiedenis en de sporter kon dat niet zien.
 *
 * DE EIS UIT DE SPRINT. Onderscheid tussen: success + 0 rijen, success + data,
 * netwerkfout, timeout, 401/403, 5xx. En: nooit meer een fout als "geen data" tonen.
 *
 * DE VORM. Additief. Het retourtype blijft een array — alle 54 aanroepplaatsen werken
 * ongewijzigd door — met een NIET-OPSOMBARE statuseigenschap eraan. Deze suite bewaakt
 * beide kanten: dat de status klopt, én dat bestaande bewerkingen er niets van merken.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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
function konst(naam) {
  var m = HTML.match(new RegExp('(?:^|\\n)(?:const|var|let) ' + naam + "\\s*=[^\\n]*?;", 'm'));
  if (m) return m[0].replace(/^(\s*)(?:const|let) /m, '$1var ');
  m = HTML.match(new RegExp('(?:^|\\n)(?:const|var|let) ' + naam + '\\s*=\\s*\\{[\\s\\S]*?\\n\\};', 'm'));
  assert.ok(m, 'constante niet gevonden: ' + naam);
  return m[0].replace(/^(\s*)(?:const|let) /m, '$1var ');
}

/* Zandbak met een bestuurbare fetch, zodat sbGet en v43SafeGet ECHT draaien. */
function zandbak(opts) {
  opts = opts || {};
  var ctx = {
    console: { error: function () {}, warn: function () {}, log: function () {} },
    Object: Object, JSON: JSON, Array: Array, Promise: Promise, setTimeout: setTimeout,
    SB_URL: 'https://x.supabase.co', SB_H: { apikey: 'k' },
    authSession: { access_token: 't', refresh_token: 'r', user: { id: 'u1' } },
    document: { getElementById: function () { return null; } },
    sbFetch: function () {
      if (opts.gooi) return Promise.reject(new Error('netwerk weg'));
      if (opts.traag) return new Promise(function () {});     // antwoordt nooit
      return Promise.resolve({
        ok: opts.status ? opts.status < 400 : true,
        status: opts.status || 200,
        text: function () { return Promise.resolve(''); },
        json: function () { return Promise.resolve(opts.rijen || []); }
      });
    }
  };
  vm.createContext(ctx);
  vm.runInContext([
    konst('TK_STATUS_VELD'),
    pak('tkMarkeerStatus'), pak('tkDataStatus'), pak('tkDataFout'), pak('tkStatusReden'),
    pak('sbGet'), pak('v43SafeGet')
  ].join('\n'), ctx);
  return ctx;
}

/* ══ A. DE ZES TOESTANDEN ══════════════════════════════════════════════════ */
console.log('\nA. De zes toestanden');

tAsync('A1: success met data', function () {
  var c = zandbak({ rijen: [{ id: 1 }, { id: 2 }] });
  return c.sbGet('sessions').then(function (rows) {
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(c.tkDataStatus(rows).ok, true);
    assert.strictEqual(c.tkDataStatus(rows).reden, 'ok');
  });
});

tAsync('A2: success met NUL rijen is géén fout', function () {
  var c = zandbak({ rijen: [] });
  return c.sbGet('sessions').then(function (rows) {
    assert.strictEqual(rows.length, 0);
    assert.strictEqual(c.tkDataFout(rows), false, 'een lege tabel wordt als storing gepresenteerd');
    assert.strictEqual(c.tkDataStatus(rows).reden, 'ok');
  });
});

tAsync('A3: netwerkfout', function () {
  var c = zandbak({ gooi: true });
  return c.sbGet('sessions').then(function (rows) {
    assert.strictEqual(rows.length, 0);
    assert.strictEqual(c.tkDataFout(rows), true, 'een netwerkfout gaat nog steeds door voor "geen gegevens"');
    assert.strictEqual(c.tkDataStatus(rows).reden, 'netwerk');
  });
});

tAsync('A4: 401 en 403 zijn een sessieprobleem, geen leeg resultaat', function () {
  var c = zandbak({ status: 401 });
  return c.sbGet('sessions').then(function (rows) {
    assert.strictEqual(c.tkDataStatus(rows).reden, 'sessie');
    assert.strictEqual(c.tkDataStatus(rows).status, 401);
    return zandbak({ status: 403 }).sbGet('sessions');
  }).then(function (rows) {
    assert.strictEqual(c.tkDataStatus(rows).reden, 'sessie');
  });
});

tAsync('A5: 5xx is een serverfout', function () {
  var c = zandbak({ status: 500 });
  return c.sbGet('sessions').then(function (rows) {
    assert.strictEqual(c.tkDataStatus(rows).reden, 'server');
    assert.strictEqual(c.tkDataFout(rows), true);
  });
});

tAsync('A6: een 4xx die geen sessieprobleem is heet apart', function () {
  var c = zandbak({ status: 400 });
  return c.sbGet('sessions').then(function (rows) {
    assert.strictEqual(c.tkDataStatus(rows).reden, 'verzoek');
  });
});

tAsync('A7: een timeout heeft zijn eigen reden', function () {
  var c = zandbak({ traag: true });
  return c.v43SafeGet('sessions', '', 30).then(function (rows) {
    assert.strictEqual(rows.length, 0);
    assert.strictEqual(c.tkDataStatus(rows).reden, 'timeout',
      'een trage verbinding is niet te onderscheiden van "je hebt nog niets gelogd"');
    assert.strictEqual(c.tkDataFout(rows), true);
  });
});

tAsync('A8: v43SafeGet geeft bij succes gewoon de rijen én de status door', function () {
  var c = zandbak({ rijen: [{ id: 1 }] });
  return c.v43SafeGet('sessions', '', 500).then(function (rows) {
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(c.tkDataFout(rows), false);
  });
});

/* ══ B. ADDITIEF: BESTAANDE AANROEPPLAATSEN MERKEN NIETS ═══════════════════ */
console.log('\nB. Achterwaarts compatibel');

tAsync('B1: het retourtype blijft een gewone array', function () {
  var c = zandbak({ rijen: [{ id: 1 }] });
  return c.sbGet('sessions').then(function (rows) {
    assert.ok(Array.isArray(rows));
    assert.strictEqual(rows[0].id, 1);
    assert.strictEqual(rows.length, 1);
  });
});

tAsync('B2: de status is niet opsombaar — map, filter, keys en JSON zien hem niet', function () {
  var c = zandbak({ rijen: [{ id: 1 }] });
  return c.sbGet('sessions').then(function (rows) {
    assert.deepStrictEqual(Object.keys(rows), ['0'], 'de status duikt op in Object.keys');
    assert.strictEqual(JSON.stringify(rows), '[{"id":1}]', 'de status lekt in JSON.stringify');
    assert.strictEqual(rows.map(function (r) { return r.id; }).length, 1);
    var n = 0; for (var k in rows) n++;
    assert.strictEqual(n, 1, 'een for-in-lus loopt nu over een extra sleutel');
  });
});

tAsync('B3: unshift en push laten het label intact', function () {
  /* loadHistory doet ss.unshift(...pending) vóórdat het de status uitleest. */
  var c = zandbak({ rijen: [{ id: 2 }] });
  return c.sbGet('sessions').then(function (rows) {
    rows.unshift({ id: 1 });
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(c.tkDataStatus(rows).reden, 'ok', 'het statuslabel overleeft een unshift niet');
  });
});

t('B4: een array zonder label levert geen verzonnen storing op', function () {
  var c = zandbak({});
  assert.strictEqual(c.tkDataFout([]), false, 'een gewone lege array wordt als fout gezien');
  assert.strictEqual(c.tkDataStatus([]).reden, 'onbekend');
  assert.strictEqual(c.tkDataFout(null), false);
  assert.strictEqual(c.tkDataFout(undefined), false);
});

/* ══ C. DE SCHERMEN TONEN HET OOK ══════════════════════════════════════════ */
console.log('\nC. Zichtbaar op de schermen');

var uictx = (function () {
  var ctx = {
    console: console, JSON: JSON, Object: Object,
    escHtml: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); },
    window: {}
  };
  vm.createContext(ctx);
  /* attrArg staat op één regel; de gewone pak()-regex loopt dan door tot het volgende
     blok en zou constanten dubbel meenemen. Vandaar een eigen, regel-exacte greep. */
  var attrArgSrc = HTML.match(/\nfunction attrArg\(v\)\{[^\n]*\}/)[0];
  vm.runInContext([
    konst('TK_STATUS_VELD'), konst('TK_OPNIEUW_ACTIES'), konst('TK_FOUT_TEKST'),
    attrArgSrc, pak('tkMarkeerStatus'), pak('tkDataStatus'), pak('tkDataFout'),
    pak('tkOpnieuw'), pak('tkFoutKaart')
  ].join('\n'), ctx);
  return ctx;
})();

t('C1: zonder fout is de foutkaart leeg', function () {
  assert.strictEqual(uictx.tkFoutKaart([], 'home'), '',
    'de kaart verschijnt ook als er niets aan de hand is');
  assert.strictEqual(uictx.tkFoutKaart(uictx.tkMarkeerStatus([], { ok: true, reden: 'ok' }), 'home'), '');
});

t('C2: bij een fout staat er een uitleg en een opnieuw-knop', function () {
  var h = uictx.tkFoutKaart(uictx.tkMarkeerStatus([], { ok: false, reden: 'netwerk' }), 'home');
  assert.ok(h.indexOf('Geen verbinding') >= 0, 'de reden wordt niet benoemd');
  assert.ok(h.indexOf('Opnieuw proberen') >= 0, 'er is geen manier om het opnieuw te proberen');
  assert.ok(h.indexOf('Er is niets kwijt') >= 0,
    'de sporter moet weten dat dit over ophalen gaat en niet over verlies');
});

t('C3: elke reden heeft een eigen tekst', function () {
  ['netwerk', 'timeout', 'server', 'sessie', 'verzoek'].forEach(function (reden) {
    var h = uictx.tkFoutKaart(uictx.tkMarkeerStatus([], { ok: false, reden: reden }), 'home');
    assert.ok(h.length > 50, 'geen kaart voor reden ' + reden);
  });
  assert.notStrictEqual(uictx.TK_FOUT_TEKST.timeout, uictx.TK_FOUT_TEKST.netwerk,
    'een timeout en een netwerkfout krijgen dezelfde tekst');
});

t('C4: de opnieuw-knop bouwt geen code uit gegevens', function () {
  var fn = pak('tkOpnieuw');
  assert.ok(fn.indexOf('TK_OPNIEUW_ACTIES[sleutel]') >= 0, 'de actie komt niet uit de vaste lijst');
  assert.ok(!/eval|new Function/.test(fn), 'er wordt code uit gegevens gemaakt');
  var kaart = pak('tkFoutKaart');
  assert.ok(kaart.indexOf('attrArg(sleutel)') >= 0, 'de sleutel gaat onbeschermd het attribuut in');
});

t('C5: een onbekende sleutel levert geen knop op in plaats van een kapotte', function () {
  var h = uictx.tkFoutKaart(uictx.tkMarkeerStatus([], { ok: false, reden: 'netwerk' }), 'bestaat-niet');
  assert.ok(h.indexOf('Opnieuw proberen') < 0);
  assert.ok(h.indexOf('Geen verbinding') >= 0, 'de melding zelf hoort wél te blijven staan');
});

t('C6: Home toont de status', function () {
  assert.ok(HTML.indexOf('<div id="home-datastatus"></div>') >= 0, 'Home heeft geen plek voor de status');
  var fn = pak('refreshHome');
  assert.ok(fn.indexOf("tkFoutKaart(hd,'home')") >= 0, 'Home meldt een mislukte ophaalactie niet');
});

t('C7: het logboek liegt niet meer over je geschiedenis', function () {
  var fn = pak('loadHistory');
  assert.ok(fn.indexOf("tkFoutKaart(ss,'logboek')") >= 0, 'het logboek toont geen foutstatus');
  var iFout = fn.indexOf('_histFout'), iLeeg = fn.indexOf('Nog geen trainingen gelogd');
  assert.ok(iFout > 0 && iFout < iLeeg, 'de lege staat wordt nog steeds vóór de foutcontrole getoond');
});

t('C6b: Home spreekt zichzelf niet tegen naast de foutmelding', function () {
  /* Gevonden in de release-audit. De banner werd toegevoegd, maar dfInfo bleef null, dus de
     hero toonde onveranderd "Doe je check-in" en de coachregel "Nog geen check-in vandaag".
     Binnen één beeldscherm stond dan "ik kon je gegevens niet ophalen" naast een verwijt dat
     de sporter iets niet gedaan zou hebben. */
  var fn = pak('refreshHome');
  assert.ok(/_tkHomeDataFout\s*=/.test(fn), 'Home onthoudt niet dat het ophalen mislukte');
  assert.ok(fn.indexOf('tkDataFout(hd)') >= 0, 'de vlag komt niet uit de echte status');
  assert.ok(/_homeFout\?'Herstelbeeld onbekend':'Doe je check-in'/.test(HTML),
    'de hero vraagt nog om een check-in die er misschien al is');
  var coach = pak('buildCoachAdvice'), ochtend = pak('buildMorningMessage');
  assert.ok(/_tkHomeDataFout/.test(coach), 'het coachadvies maakt geen verschil tussen niet ingevuld en niet opgehaald');
  assert.ok(/_tkHomeDataFout/.test(ochtend), 'het ochtendbericht doet dat evenmin');
});

t('C7b: "meer laden" dat mislukt verbergt de knop niet en slaat geen pagina over', function () {
  /* Gevonden in de release-audit van v4.50.0. De foutkaart hing alleen aan de else-tak: bij
     append werd er niets toegevoegd, de knop verdween (syncedCount 0 < 20) en histOff liep
     tóch door. Het logboek beweerde dus dat de geschiedenis daar ophield én sloeg bij een
     volgende poging een pagina over — precies de klasse fout die deze sprint oplost. */
  var fn = pak('loadHistory');
  assert.ok(/if\(append&&_histFout\)\{/.test(fn), 'de foutkaart geldt nog steeds niet bij "meer laden"');
  var blok = fn.slice(fn.indexOf('if(append&&_histFout){'));
  blok = blok.slice(0, blok.indexOf('\n  }') + 4);
  assert.ok(blok.indexOf("hist-more').style.display='block'") >= 0, 'de knop wordt alsnog verborgen');
  assert.ok(blok.indexOf('return;') >= 0, 'histOff loopt door en slaat een pagina over');
  assert.ok(blok.indexOf('hist-append-fout') >= 0, 'de foutkaart stapelt bij herhaald proberen');
  assert.ok(fn.indexOf("getElementById('hist-append-fout')") >= 0 && fn.indexOf('.remove()') >= 0,
    'een eerdere foutkaart wordt niet opgeruimd');
});

t('C8: Voortgang meldt alleen een storing als ALLES faalt', function () {
  var fn = pak('refreshStatsScreen');
  assert.ok(fn.indexOf("tkFoutKaart(_perEx[0].ss,'voortgang')") >= 0, 'Voortgang toont geen foutstatus');
  assert.ok(fn.indexOf('_mislukt===_perEx.length') >= 0,
    'één mislukte oefeningquery zou al een storing melden — dat is een vals alarm');
});

t('C9: de drie schermen delen één component', function () {
  var n = (HTML.match(/tkFoutKaart\(/g) || []).length;
  assert.ok(n >= 4, 'niet elk scherm gebruikt de gedeelde foutkaart (' + n + ')');
  assert.strictEqual((HTML.match(/function tkFoutKaart\(/g) || []).length, 1,
    'er is meer dan één foutkaart-implementatie');
});

/* ══ SLOT ═══════════════════════════════════════════════════════════════════ */
(function volgende(i) {
  if (i >= wachtend.length) {
    console.log('\n========================================================');
    console.log('RESULTAAT: ' + geslaagd + ' geslaagd, ' + mislukt + ' mislukt');
    if (mislukt) { console.log('❌ Datastatus niet groen.'); process.exit(1); }
    console.log('✅ Datastatus groen.');
    return;
  }
  var w = wachtend[i];
  Promise.resolve().then(w.fn).then(
    function () { geslaagd++; console.log('  ✓ ' + w.naam); volgende(i + 1); },
    function (e) { mislukt++; console.log('  ✗ ' + w.naam + ' :: ' + (e && e.message)); volgende(i + 1); }
  );
})(0);
