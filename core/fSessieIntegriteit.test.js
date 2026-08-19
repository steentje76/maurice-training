/* fSessieIntegriteit.test.js — RC0: de sessie-veilige fetch-laag
 *
 * AANLEIDING. Trainingskompas gaat als Android-app naar de Play Store. Android bevriest
 * achtergrondtimers, dus de proactieve token-refresh (scheduleAuthRefresh, setTimeout)
 * loopt niet door zolang de app in de achtergrond staat. Komt de sporter uren later
 * terug, dan is het access-token verlopen. Vóór deze laag reageerde de app daar
 * misleidend op:
 *
 *   sbGet   -> []      elk scherm toonde 'geen data' — niet te onderscheiden van
 *                      daadwerkelijk dataverlies
 *   sbPostQ -> false   de zojuist ingevoerde sets werden NIET gequeued en waren echt weg
 *
 * Deze suite draait de verzonden implementaties uit index.html in een zandbak met een
 * bestuurbare fetch en legt vast: één 401 leidt tot één gedeelde refresh en één retry
 * met een VERS opgebouwde header; mislukt de refresh, dan wordt dat expliciet gemeld en
 * belandt schrijfwerk in de wachtrij in plaats van in de prullenbak.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var n = 0;
var wachtend = [];
function t(naam, fn) { fn(); n++; }
function tAsync(naam, fn) { wachtend.push({ naam: naam, fn: fn }); }

function pak(naam) {
  var m = HTML.match(new RegExp('(?:^|\\n)(?:async )?function ' + naam + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
  assert.ok(m, 'functie niet gevonden in index.html: ' + naam);
  return m[0];
}
function konst(naam) {
  var enkel = HTML.match(new RegExp('(?:^|\\n)(?:const|var|let) ' + naam + "\\s*=[^\\n]*?;", 'm'));
  if (enkel) return enkel[0];
  var array = HTML.match(new RegExp('(?:^|\\n)(?:const|var|let) ' + naam + '\\s*=\\s*\\[[\\s\\S]*?\\n\\];', 'm'));
  assert.ok(array, 'constante niet gevonden: ' + naam);
  return array[0];
}
function konstVar(naam) { return konst(naam).replace(/^(\s*)(?:const|let) /m, '$1var '); }

/* Minimale IndexedDB — gelijk aan die van fFase2, bewust apart zodat beide suites
   onafhankelijk blijven draaien. */
function nepIndexedDB() {
  var store = [], volgende = 1;
  function tx() {
    var handlers = {};
    var obj = {
      add: function (item) { store.push(Object.assign({ id: volgende++ }, item)); klaar(); },
      getAll: function () { var r = {}; setTimeout(function () { r.result = store.slice(); r.onsuccess && r.onsuccess(); }, 0); return r; },
      delete: function (id) { store = store.filter(function (x) { return x.id !== id; }); klaar(); }
    };
    function klaar() { setTimeout(function () { handlers.oncomplete && handlers.oncomplete(); }, 0); }
    return { objectStore: function () { return obj; },
             set oncomplete(f) { handlers.oncomplete = f; },
             set onerror(f) { handlers.onerror = f; } };
  }
  return { _store: function () { return store; },
    open: function () {
      var req = {};
      setTimeout(function () { req.result = { transaction: tx, createObjectStore: function () {} }; req.onsuccess && req.onsuccess(); }, 0);
      return req;
    } };
}

/* opts:
 *   antwoord(url, init, nr)  -> {ok,status,body} | Error
 *   refreshLukt              -> of refreshAuthToken() slaagt (en dan het token roteert)
 *   sessie                   -> expliciet authSession-object of null
 */
function zandbak(opts) {
  opts = opts || {};
  var verzoeken = [];
  var ctx = {
    indexedDB: nepIndexedDB(),
    console: { error: function () {}, warn: function () {}, log: function () {} },
    navigator: { onLine: opts.online !== false },
    Date: Date, JSON: JSON, Object: Object, Promise: Promise, setTimeout: setTimeout,
    SB_URL: 'https://x.supabase.co',
    SB_H: { apikey: 'publishable', Authorization: 'Bearer OUD', 'Content-Type': 'application/json' },
    authSession: opts.sessie === undefined ? { access_token: 'OUD', refresh_token: 'r1', user: { id: 'u1' } } : opts.sessie,
    updateOfflineBadge: function () {},
    toast: function (m) { (ctx._toasts = ctx._toasts || []).push(m); },
    document: {
      getElementById: function () { return null; },
      querySelectorAll: function () { return { forEach: function () {} }; }
    },
    clearAuthSession: function () { ctx._gewist = (ctx._gewist || 0) + 1; ctx.authSession = null; ctx.SB_H.Authorization = 'Bearer publishable'; },
    refreshAuthToken: function () {
      ctx._refreshes = (ctx._refreshes || 0) + 1;
      if (!opts.refreshLukt) return Promise.resolve(false);
      /* een geslaagde refresh roteert het token — precies wat de retry moet oppakken */
      ctx.SB_H.Authorization = 'Bearer NIEUW';
      ctx.authSession = { access_token: 'NIEUW', refresh_token: 'r2', user: { id: 'u1' } };
      return Promise.resolve(true);
    },
    _verzoeken: verzoeken,
    fetch: function (url, init) {
      verzoeken.push({ url: url, method: (init && init.method) || 'GET',
                       auth: init && init.headers && init.headers.Authorization,
                       prefer: init && init.headers && init.headers.Prefer,
                       body: init && init.body });
      var res = opts.antwoord ? opts.antwoord(url, init, verzoeken.length) : { ok: true };
      if (res instanceof Error) return Promise.reject(res);
      return Promise.resolve({
        ok: res.ok !== false && (res.status || 200) < 400,
        status: res.status || (res.ok === false ? 500 : 200),
        text: function () { return Promise.resolve(res.body || ''); },
        json: function () { return Promise.resolve(res.json || []); }
      });
    }
  };
  vm.createContext(ctx);
  vm.runInContext([
    konstVar('OFFLINE_DB_NAME'), konstVar('SB_RETRY_STATUS'),
    konstVar('_sbRefreshInFlight'), konstVar('_sbSessieVerlopenGemeld'), konstVar('_flushBezig'),
    pak('sbRetryable'), pak('sbRefreshOnce'), pak('sbSessieVerlopen'), pak('sbFetch'),
    pak('offlineDb'), pak('offlineQueueAdd'), pak('offlineQueueAll'), pak('offlineQueueRemove'),
    pak('sbGet'), pak('sbPostQ'), pak('sbPatchQ'), pak('sbDelQ'), pak('flushOfflineQueue')
  ].join('\n'), ctx);
  return ctx;
}

/* ══ A. sbFetch — 401-herstel ═══════════════════════════════════════════════ */
console.log('\nA. sbFetch — herstel na een verlopen token');

tAsync('A1: een 401 leidt tot precies één refresh en één retry', function () {
  var ctx = zandbak({ refreshLukt: true, antwoord: function (u, i, nr) { return nr === 1 ? { status: 401 } : { status: 200 }; } });
  return ctx.sbFetch('https://x.supabase.co/rest/v1/sessions', {}).then(function (r) {
    assert.strictEqual(r.status, 200, 'de retry is niet uitgevoerd');
    assert.strictEqual(ctx._refreshes, 1, 'aantal refreshes: ' + ctx._refreshes);
    assert.strictEqual(ctx._verzoeken.length, 2, 'aantal verzoeken: ' + ctx._verzoeken.length);
  });
});

tAsync('A2: de retry gebruikt het VERSE token, niet het gesnapshotte oude', function () {
  var ctx = zandbak({ refreshLukt: true, antwoord: function (u, i, nr) { return nr === 1 ? { status: 401 } : { status: 200 }; } });
  return ctx.sbFetch('https://x.supabase.co/rest/v1/sessions', { method: 'POST', body: { a: 1 } }).then(function () {
    assert.strictEqual(ctx._verzoeken[0].auth, 'Bearer OUD');
    assert.strictEqual(ctx._verzoeken[1].auth, 'Bearer NIEUW',
      'de retry ging opnieuw met het verlopen token — dan blijft het 401');
  });
});

tAsync('A3: mislukt de refresh, dan wordt de sessie expliciet als verlopen gemeld', function () {
  var ctx = zandbak({ refreshLukt: false, antwoord: function () { return { status: 401 }; } });
  return ctx.sbFetch('https://x.supabase.co/rest/v1/sessions', {}).then(function (r) {
    assert.strictEqual(r.status, 401);
    assert.strictEqual(ctx._verzoeken.length, 1, 'er is toch een retry gedaan na een mislukte refresh');
    assert.strictEqual(ctx._gewist, 1, 'de sessie is niet opgeruimd');
    assert.ok((ctx._toasts || []).some(function (m) { return /verlopen/i.test(m); }),
      'de sporter krijgt geen melding — dan lijkt het op dataverlies');
  });
});

tAsync('A4: tien gelijktijdige 401\'s doen samen ÉÉN refresh', function () {
  /* Supabase roteert refresh-tokens: parallelle refreshes maken elkaars token ongeldig. */
  var ctx = zandbak({ refreshLukt: true, antwoord: function (u, i, nr) { return nr <= 10 ? { status: 401 } : { status: 200 }; } });
  var reeks = [];
  for (var i = 0; i < 10; i++) reeks.push(ctx.sbFetch('https://x.supabase.co/rest/v1/t' + i, {}));
  return Promise.all(reeks).then(function () {
    assert.strictEqual(ctx._refreshes, 1, 'aantal refreshes: ' + ctx._refreshes + ' (moet 1 zijn)');
  });
});

tAsync('A5: een geslaagd verzoek raakt de refresh nooit aan', function () {
  var ctx = zandbak({ refreshLukt: true, antwoord: function () { return { status: 200 }; } });
  return ctx.sbFetch('https://x.supabase.co/rest/v1/sessions', {}).then(function () {
    assert.strictEqual(ctx._refreshes, undefined, 'er is onnodig ververst');
    assert.strictEqual(ctx._verzoeken.length, 1);
  });
});

tAsync('A6: zonder sessie wordt er niet ververst — de gebruiker is simpelweg uitgelogd', function () {
  var ctx = zandbak({ sessie: null, antwoord: function () { return { status: 401 }; } });
  return ctx.sbFetch('https://x.supabase.co/rest/v1/sessions', {}).then(function () {
    assert.strictEqual(ctx._refreshes, undefined);
    assert.strictEqual(ctx._verzoeken.length, 1);
  });
});

tAsync('A7: sbGet levert na herstel de ECHTE rijen, niet de lege lijst', function () {
  /* Dit was het gedrag dat op dataverlies leek: 401 -> [] -> "geen data" op elk scherm. */
  var ctx = zandbak({ refreshLukt: true, antwoord: function (u, i, nr) {
    return nr === 1 ? { status: 401 } : { status: 200, json: [{ id: 1 }, { id: 2 }] };
  } });
  return ctx.sbGet('sessions', '&limit=2').then(function (rows) {
    assert.strictEqual(rows.length, 2, 'sbGet gaf ' + rows.length + ' rijen — een leeg scherm liegt over de data');
  });
});

/* ══ B. Schrijfacties: wat is herstelbaar en wat niet ═══════════════════════ */
console.log('\nB. Schrijfacties — herstelbaar versus definitief');

t('B0: de statuslijst bevat alleen herstelbare codes', function () {
  var ctx = zandbak({});
  [401, 408, 425, 429, 500, 502, 503, 504].forEach(function (s) {
    assert.strictEqual(ctx.sbRetryable(s), true, s + ' hoort herstelbaar te zijn');
  });
  [400, 403, 404, 409, 422].forEach(function (s) {
    assert.strictEqual(ctx.sbRetryable(s), false, s + ' hoort NIET herstelbaar te zijn — dat zou eeuwig herhalen');
  });
});

tAsync('B1: een 500 verliest de invoer niet maar queuet', function () {
  var ctx = zandbak({ antwoord: function () { return { status: 500, body: 'boom' }; } });
  return ctx.sbPostQ('sessions', { date: '2026-08-19' }).then(function (ok) {
    assert.strictEqual(ok, true, 'de sporter krijgt "Fout bij opslaan" terwijl de data te redden was');
    return ctx.offlineQueueAll();
  }).then(function (items) {
    assert.strictEqual(items.length, 1, 'een tijdelijke serverfout gooit de set weg');
    assert.strictEqual(items[0].table, 'sessions');
  });
});

tAsync('B2: een 429 (rate limit) queuet eveneens', function () {
  var ctx = zandbak({ antwoord: function () { return { status: 429 }; } });
  return ctx.sbPostQ('sessions', { date: '2026-08-19' }).then(function () { return ctx.offlineQueueAll(); })
    .then(function (items) { assert.strictEqual(items.length, 1); });
});

tAsync('B3: een 400 (validatiefout) queuet NIET en meldt geen succes', function () {
  var ctx = zandbak({ antwoord: function () { return { status: 400, body: 'ongeldig' }; } });
  return ctx.sbPostQ('sessions', { date: 'fout' }).then(function (ok) {
    assert.strictEqual(ok, false);
    return ctx.offlineQueueAll();
  }).then(function (items) { assert.strictEqual(items.length, 0, 'een blijvend ongeldig item zou eeuwig herhalen'); });
});

tAsync('B4: een 409 (conflict) queuet NIET', function () {
  var ctx = zandbak({ antwoord: function () { return { status: 409 }; } });
  return ctx.sbPostQ('sessions', {}).then(function (ok) {
    assert.strictEqual(ok, false);
    return ctx.offlineQueueAll();
  }).then(function (items) { assert.strictEqual(items.length, 0); });
});

tAsync('B5: een 401 die door de refresh wordt hersteld, schrijft gewoon door', function () {
  var ctx = zandbak({ refreshLukt: true, antwoord: function (u, i, nr) { return nr === 1 ? { status: 401 } : { status: 201 }; } });
  return ctx.sbPostQ('sessions', { date: '2026-08-19' }).then(function (ok) {
    assert.strictEqual(ok, true);
    return ctx.offlineQueueAll();
  }).then(function (items) {
    assert.strictEqual(items.length, 0, 'onnodig gequeued terwijl de schrijfactie geslaagd is — dat geeft een dubbele rij');
  });
});

tAsync('B6: een 401 die NIET herstelt, belandt in de wachtrij (nooit weggooien)', function () {
  var ctx = zandbak({ refreshLukt: false, antwoord: function () { return { status: 401 }; } });
  return ctx.sbPostQ('sessions', { date: '2026-08-19', exercise_id: 'TK-1' }).then(function (ok) {
    assert.strictEqual(ok, true);
    return ctx.offlineQueueAll();
  }).then(function (items) {
    assert.strictEqual(items.length, 1, 'de set van de sporter is verdwenen bij een verlopen sessie');
  });
});

tAsync('B7: PATCH en DELETE volgen dezelfde regel, mét hun filter', function () {
  var ctx = zandbak({ antwoord: function () { return { status: 503 }; } });
  return ctx.sbPatchQ('sessions', 'id=eq.1', { rpe: 8 })
    .then(function () { return ctx.sbDelQ('sessions', 'id=eq.2'); })
    .then(function () { return ctx.offlineQueueAll(); })
    .then(function (items) {
      assert.strictEqual(items.length, 2);
      assert.strictEqual(items.filter(function (i) { return i.method === 'PATCH'; })[0].filter, 'id=eq.1');
      assert.strictEqual(items.filter(function (i) { return i.method === 'DELETE'; })[0].filter, 'id=eq.2');
    });
});

/* ══ C. flushOfflineQueue — geen dubbele rijen ══════════════════════════════ */
console.log('\nC. Wachtrij afspelen — precies één keer');

tAsync('C1: twee gelijktijdige doorlopen versturen elk item maar één keer', function () {
  /* Het echte scenario: Android brengt de app terug (visibilitychange) op hetzelfde
     moment dat het netwerk terugkomt (online-event). Zonder slot ging hetzelfde
     wachtrij-item twee keer de deur uit — een dubbele sessierij in de database. */
  var ctx = zandbak({ online: false, antwoord: function () { return { status: 201 }; } });
  return ctx.sbPostQ('sessions', { date: 'a' })
    .then(function () { return ctx.offlineQueueAll(); })
    .then(function (items) { assert.strictEqual(items.length, 1, 'niets gequeued om te testen'); })
    .then(function () { ctx.navigator.onLine = true; })
    .then(function () { return Promise.all([ctx.flushOfflineQueue(), ctx.flushOfflineQueue()]); })
    .then(function () {
      var posts = ctx._verzoeken.filter(function (v) { return v.method === 'POST'; });
      assert.strictEqual(posts.length, 1, 'het item ging ' + posts.length + 'x de deur uit — dat is een dubbele sessierij');
      return ctx.offlineQueueAll();
    })
    .then(function (items) { assert.strictEqual(items.length, 0); });
});

tAsync('C2: zonder sessie wordt er niets verstuurd en blijft de wachtrij intact', function () {
  var ctx = zandbak({ sessie: null, online: false, antwoord: function () { return { status: 201 }; } });
  return ctx.sbPostQ('sessions', { date: 'a' })
    .then(function () { ctx.navigator.onLine = true; return ctx.flushOfflineQueue(); })
    .then(function () { return ctx.offlineQueueAll(); })
    .then(function (items) {
      assert.strictEqual(items.length, 1, 'de wachtrij is geleegd terwijl niemand ingelogd was — dataverlies');
      assert.strictEqual(ctx._verzoeken.length, 0);
    });
});

tAsync('C3: de volgorde van de wachtrij blijft behouden', function () {
  var ctx = zandbak({ online: false });
  return ctx.sbPostQ('sessions', { n: 1 })
    .then(function () { return ctx.sbPostQ('sessions', { n: 2 }); })
    .then(function () { return ctx.sbPostQ('sessions', { n: 3 }); })
    .then(function () { ctx.navigator.onLine = true; return ctx.flushOfflineQueue(); })
    .then(function () {
      var volgorde = ctx._verzoeken.map(function (v) { return JSON.parse(v.body).n; });
      assert.deepStrictEqual(volgorde, [1, 2, 3], 'volgorde: ' + volgorde.join(','));
    });
});

/* ══ D. Architectuurgrens ══════════════════════════════════════════════════ */
console.log('\nD. Architectuurgrens');

t('D1: geen enkele sb*-functie doet nog een kale fetch naar de REST-API', function () {
  /* Eén ontsnapping is genoeg om de 401-afhandeling weer te verliezen. */
  ['sbGet', 'sbPost', 'sbPostReturning', 'sbPatch', 'sbPostQ', 'sbPatchQ', 'sbDelQ', 'flushOfflineQueue'].forEach(function (fn) {
    var src = pak(fn);
    assert.ok(!/await fetch\(/.test(src) && !/=\s*fetch\(/.test(src),
      fn + ' omzeilt sbFetch met een directe fetch — dan is 401-herstel daar weg');
  });
});

t('D2: sbFetch bouwt de headers per poging opnieuw op', function () {
  var src = pak('sbFetch');
  assert.ok(/for\s*\(var k in SB_H\)/.test(src) || /Object\.assign\([^)]*SB_H/.test(src),
    'sbFetch kopieert SB_H niet per poging — een retry zou het oude token hergebruiken');
  assert.ok(/maak\(\)/.test(src), 'de header-opbouw wordt niet als functie hergebruikt');
});

t('D3: de refresh blijft in de auth-laag, niet in de fetch-laag', function () {
  var src = pak('sbFetch');
  assert.ok(/sbRefreshOnce\(\)/.test(src), 'sbFetch ververst zelf i.p.v. via de gedeelde refresh');
  assert.ok(!/grant_type=refresh_token/.test(src), 'sbFetch dupliceert het refresh-endpoint');
});

/* ── uitvoeren ─────────────────────────────────────────────────────────────── */
(function volgende(i) {
  if (i >= wachtend.length) {
    console.log('\n========================================================');
    console.log('fSessieIntegriteit.test.js — ' + (n + wachtend.length) + ' tests geslaagd');
    return;
  }
  var w = wachtend[i];
  Promise.resolve().then(w.fn).then(function () {
    n++; volgende(i + 1);
  }, function (e) {
    console.error('\n✗ ' + w.naam + '\n  ' + (e && e.message));
    process.exit(1);
  });
})(0);
