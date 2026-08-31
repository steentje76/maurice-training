/* fOfflineQueueCrossAccountLeakage.test.js — F13 Post-Audit Remediation
 * P1-05. Bewaakt het exacte, door de audit geeiste scenario: gebruiker A
 * schrijft offline (queue), logt uit/wisselt account op hetzelfde
 * toestel, gebruiker B logt in -- een latere flush mag NOOIT A's
 * gequeuede item onder B's sessie wegschrijven.
 *
 * Draait de ECHTE, verzonden sbPostQ/offlineQueueAdd/flushOfflineQueue-
 * implementaties uit index.html in een VM-sandbox met een nagebouwde
 * IndexedDB, exact hetzelfde patroon als het bestaande fFase2.test.js.
 */
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var n = 0;
function t(naam, fn) { fn(); n++; }
var wachtend = [];
function tAsync(naam, fn) { wachtend.push({ naam: naam, fn: fn }); }

function pak(naam) {
  var m = HTML.match(new RegExp('(?:^|\\n)(?:async )?function ' + naam + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
  assert.ok(m, 'functie niet gevonden in index.html: ' + naam);
  return m[0];
}
function konst(naam) {
  var m = HTML.match(new RegExp('(?:^|\\n)(?:const|let) ' + naam + '\\s*=.*?;', 'm'));
  if (m) return m[0];
  m = HTML.match(new RegExp('(?:^|\\n)(?:const|let) ' + naam + '\\s*=[\\s\\S]*?\\n\\};', 'm'));
  assert.ok(m, 'const/let niet gevonden in index.html: ' + naam);
  return m[0];
}
function konstVar(naam) { return konst(naam).replace(/^(\s*)(?:const|let) /m, '$1var '); }

/* Zelfde, minimale, deterministische nagebouwde IndexedDB als fFase2.test.js. */
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
  return {
    _store: function () { return store; },
    open: function () {
      var req = {};
      setTimeout(function () {
        req.result = { transaction: tx, createObjectStore: function () {} };
        req.onsuccess && req.onsuccess();
      }, 0);
      return req;
    }
  };
}

function queueZandbak(opts) {
  opts = opts || {};
  var idb = opts.idb || nepIndexedDB();
  var verzoeken = [];
  var ctx = {
    indexedDB: idb, console: { error: function () {}, warn: function () {}, log: function () {} },
    navigator: { onLine: opts.online !== false },
    Date: Date, JSON: JSON, Object: Object, Promise: Promise, setTimeout: setTimeout,
    SB_URL: 'https://x.supabase.co', SB_H: { apikey: 'k' },
    updateOfflineBadge: function () {},
    toast: function () {},
    document: { getElementById: function () { return null; } },
    _verzoeken: verzoeken,
    authSession: opts.sessie,
    refreshAuthToken: function () { return Promise.resolve(false); },
    fetch: function (url, o) {
      verzoeken.push({ url: url, method: (o && o.method) || 'GET', body: o && o.body });
      var res = opts.antwoord ? opts.antwoord(url, o, verzoeken.length) : { ok: true };
      if (res instanceof Error) return Promise.reject(res);
      return Promise.resolve({ ok: res.ok, status: res.status || (res.ok ? 200 : 500),
                               text: function () { return Promise.resolve(res.body || ''); },
                               json: function () { return Promise.resolve(res.json || []); } });
    }
  };
  vm.createContext(ctx);
  vm.runInContext([konstVar('OFFLINE_DB_NAME'), konstVar('SB_RETRY_STATUS'),
                   konstVar('_sbRefreshInFlight'), konstVar('_sbSessieVerlopenGemeld'),
                   konstVar('_flushBezig'), konstVar('IDEMPOTENT_TABELLEN_MET_CLIENT_ID'),
                   pak('newClientRowId'),
                   pak('sbRetryable'), pak('sbRefreshOnce'), pak('sbSessieVerlopen'),
                   pak('sbFetch'), pak('offlineDb'), pak('offlineQueueAdd'),
                   pak('offlineQueueAll'), pak('offlineQueueRemove'), pak('sbPostQ'),
                   pak('sbPatchQ'), pak('sbDelQ'), pak('flushOfflineQueue')].join('\n'), ctx);
  ctx._idb = idb;
  return ctx;
}

console.log('F13 Post-Audit — P1-05: Offline queue cross-account leakage');

/* ---- Het exacte, door de audit geeiste scenario ---- */
tAsync('P1-05-A: gebruiker A queuet offline, gebruiker B logt in op hetzelfde toestel -- A-item wordt NIET onder B geflushed', function () {
  var gedeeldeIdb = nepIndexedDB();
  // Stap 1: gebruiker A is offline, queuet een sessie.
  var ctxA = queueZandbak({ idb: gedeeldeIdb, online: false, sessie: { access_token: 'ta', refresh_token: 'ra', user: { id: 'user-A' } } });
  return ctxA.sbPostQ('sessions', { date: '2026-08-31', exercise_id: 'backsquat', note: 'van gebruiker A' }).then(function () {
    // Stap 2: gebruiker B logt in op hetzelfde toestel (gedeelde IndexedDB), gaat online, flush wordt getriggerd.
    var ctxB = queueZandbak({ idb: gedeeldeIdb, online: true, sessie: { access_token: 'tb', refresh_token: 'rb', user: { id: 'user-B' } } });
    return ctxB.flushOfflineQueue().then(function () {
      // KRITIEK: het A-item mag NOOIT daadwerkelijk gepost zijn onder B's sessie.
      var gepost = ctxB._verzoeken.filter(function (v) { return v.method === 'POST' && v.url.indexOf('/sessions') !== -1; });
      assert.strictEqual(gepost.length, 0, 'geen enkele POST mag zijn uitgevoerd -- het item van gebruiker A moet geisoleerd blijven, niet onder B geflushed worden');
      // Het item moet nog steeds in de gedeelde queue staan (niet stil weggegooid).
      assert.strictEqual(gedeeldeIdb._store().length, 1, 'het A-item moet in de wachtrij blijven staan, geisoleerd, niet verwijderd');
      assert.strictEqual(gedeeldeIdb._store()[0].owner_uid, 'user-A', 'het item draagt het eigenaar-uid van gebruiker A');
    });
  });
});

tAsync('P1-05-B: wanneer gebruiker A vervolgens terugkeert op hetzelfde toestel, wordt het eigen, geisoleerde item wél geflushed', function () {
  var gedeeldeIdb = nepIndexedDB();
  var ctxA1 = queueZandbak({ idb: gedeeldeIdb, online: false, sessie: { access_token: 'ta', refresh_token: 'ra', user: { id: 'user-A' } } });
  return ctxA1.sbPostQ('sessions', { date: '2026-08-31', exercise_id: 'backsquat' }).then(function () {
    // Gebruiker B logt tussentijds in, flush levert niets op voor B (bewezen in test A).
    var ctxB = queueZandbak({ idb: gedeeldeIdb, online: true, sessie: { access_token: 'tb', refresh_token: 'rb', user: { id: 'user-B' } } });
    return ctxB.flushOfflineQueue().then(function () {
      // Gebruiker A logt weer in, gaat online -- het eigen item hoort nu wél verwerkt te worden.
      var ctxA2 = queueZandbak({ idb: gedeeldeIdb, online: true, sessie: { access_token: 'ta2', refresh_token: 'ra2', user: { id: 'user-A' } } });
      return ctxA2.flushOfflineQueue().then(function () {
        var gepost = ctxA2._verzoeken.filter(function (v) { return v.method === 'POST' && v.url.indexOf('/sessions') !== -1; });
        assert.strictEqual(gepost.length, 1, 'het eigen item van gebruiker A wordt correct geflushed zodra A weer actief is, geen data-verlies');
        assert.strictEqual(gedeeldeIdb._store().length, 0, 'na een geslaagde flush is de wachtrij leeg voor het eigen item');
      });
    });
  });
});

tAsync('P1-05-C: een item zonder bekende owner_uid (legacy, van vóór deze fix) blijft flushbaar -- geen stille dataverlies-regressie', function () {
  var idb = nepIndexedDB();
  idb._store().push({ id: 1, table: 'sessions', method: 'POST', body: { date: '2026-08-31' }, ts: Date.now() }); // geen owner_uid-veld
  var ctx = queueZandbak({ idb: idb, online: true, sessie: { access_token: 't', refresh_token: 'r', user: { id: 'user-C' } } });
  return ctx.flushOfflineQueue().then(function () {
    var gepost = ctx._verzoeken.filter(function (v) { return v.method === 'POST' && v.url.indexOf('/sessions') !== -1; });
    assert.strictEqual(gepost.length, 1, 'een legacy-item zonder owner_uid wordt nog steeds geflushed (geen regressie t.o.v. het gedrag van vóór deze fix)');
  });
});

Promise.all(wachtend.map(function (w) {
  return Promise.resolve().then(w.fn).then(function () { n++; }, function (e) {
    console.error('MISLUKT:', w.naam, '\n ', e && e.message);
    process.exitCode = 1;
  });
})).then(function () {
  console.log('\n========================================================');
  console.log('fOfflineQueueCrossAccountLeakage.test.js — ' + n + ' tests geslaagd');
  if (process.exitCode) process.exit(1);
});
