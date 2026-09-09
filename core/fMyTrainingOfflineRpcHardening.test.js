/* fMyTrainingOfflineRpcHardening.test.js — SPRINT C2-D
 * Offline RPC Create / Retry Hardening voor schedule_my_training().
 *
 * Draait de ECHTE sbRpcQ/flushOfflineQueue/offlineQueueAdd-implementaties uit
 * index.html in een VM-sandbox met een nagebouwde IndexedDB, exact hetzelfde
 * patroon als het bestaande fOfflineQueueCrossAccountLeakage.test.js.
 *
 * Dekt: online success, retryable failure -> queued, non-retryable failure ->
 * NIET queued, offline -> direct queued, replay verstuurt exact dezelfde args
 * (mutation-id nooit opnieuw gegenereerd), ordering (RPC create vóór een latere
 * PATCH-reschedule op dezelfde occurrence_id), en cross-user isolatie van
 * RPC-queue-items (hergebruikt exact hetzelfde owner_uid-mechanisme dat al voor
 * POST/PATCH/DELETE bewezen is in fOfflineQueueCrossAccountLeakage.test.js --
 * hier expliciet ook voor de nieuwe 'RPC'-operatie herbevestigd, niet aangenomen).
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
  m = HTML.match(new RegExp('(?:^|\\n)(?:const|let) ' + naam + '\\s*=\\s*\\{[\\s\\S]*?\\};', 'm'));
  if (m) return m[0];
  m = HTML.match(new RegExp('(?:^|\\n)(?:const|let) ' + naam + '\\s*=[\\s\\S]*?\\n\\};', 'm'));
  assert.ok(m, 'const/let niet gevonden in index.html: ' + naam);
  return m[0];
}
function konstVar(naam) { return konst(naam).replace(/^(\s*)(?:const|let) /m, '$1var '); }

/* Zelfde, minimale, deterministische nagebouwde IndexedDB als fOfflineQueueCrossAccountLeakage.test.js. */
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

var _sandboxScript = new vm.Script([konstVar('OFFLINE_DB_NAME'), konstVar('SB_RETRY_STATUS'),
                 konstVar('_sbRefreshInFlight'), konstVar('_sbSessieVerlopenGemeld'),
                 konstVar('_flushBezig'), konstVar('IDEMPOTENT_TABELLEN_MET_CLIENT_ID'),
                 pak('newClientRowId'), pak('newTrainingInstanceId'),
                 pak('sbRetryable'), pak('sbRefreshOnce'), pak('sbSessieVerlopen'),
                 pak('sbFetch'), pak('offlineDb'), pak('offlineQueueAdd'),
                 pak('offlineQueueAll'), pak('offlineQueueRemove'), pak('sbPostQ'),
                 pak('sbPatchQ'), pak('sbDelQ'), pak('sbRpcQ'),
                 pak('flushOfflineQueue')].join('\n'));

function queueZandbak(opts) {
  opts = opts || {};
  var idb = opts.idb || nepIndexedDB();
  var verzoeken = [];
  var ctx = {
    indexedDB: idb, console: { error: function () {}, warn: function () {}, log: function () {} },
    navigator: { onLine: opts.online !== false },
    Date: Date, JSON: JSON, Object: Object, Promise: Promise, setTimeout: setTimeout, crypto: global.crypto,
    SB_URL: 'https://x.supabase.co', SB_H: { apikey: 'k' },
    updateOfflineBadge: function () {},
    toast: function () {},
    document: { getElementById: function () { return null; } },
    _verzoeken: verzoeken,
    authSession: opts.sessie,
    refreshAuthToken: function () { return Promise.resolve(false); },
    fetch: function (url, o) {
      verzoeken.push({ url: url, method: (o && o.method) || 'GET', body: o && o.body });
      var res = opts.antwoord ? opts.antwoord(url, o, verzoeken.length) : { ok: true, json: {} };
      if (res instanceof Error) return Promise.reject(res);
      return Promise.resolve({ ok: res.ok, status: res.status || (res.ok ? 200 : 500),
                               text: function () { return Promise.resolve(res.body || ''); },
                               json: function () { return Promise.resolve(res.json || {}); } });
    }
  };
  vm.createContext(ctx);
  _sandboxScript.runInContext(ctx);
  ctx._idb = idb;
  return ctx;
}

console.log('SPRINT C2-D — Offline RPC Create / Retry Hardening (schedule_my_training)');

var GEBRUIKER_A = { access_token: 'ta', refresh_token: 'ra', user: { id: 'user-A' } };

tAsync('C2-D-1: online create succeeds -> geen queue, echte RPC-result teruggegeven (geen "true")', function () {
  var idb = nepIndexedDB();
  var ctx = queueZandbak({ idb: idb, online: true, sessie: GEBRUIKER_A,
    antwoord: function () { return { ok: true, json: 'occ-echte-uuid' }; } });
  return ctx.sbRpcQ('schedule_my_training', { p_workout_definition_id: 'w1', p_planned_date: '2026-09-10', p_occurrence_id: 'occ-1' }).then(function (result) {
    assert.strictEqual(result, 'occ-echte-uuid', 'bij online succes moet het echte RPC-resultaat terugkomen, geen boolean');
    assert.strictEqual(idb._store().length, 0, 'geen queue-item bij online succes');
  });
});

tAsync('C2-D-2: retryable serverfout (503) -> gequeued, sbRpcQ geeft true terug (net als sbPostQ/sbPatchQ)', function () {
  var idb = nepIndexedDB();
  var ctx = queueZandbak({ idb: idb, online: true, sessie: GEBRUIKER_A,
    antwoord: function () { return { ok: false, status: 503, body: 'tijdelijk niet beschikbaar' }; } });
  return ctx.sbRpcQ('schedule_my_training', { p_workout_definition_id: 'w1', p_planned_date: '2026-09-10', p_occurrence_id: 'occ-2' }).then(function (result) {
    assert.strictEqual(result, true, 'retryable fout moet gequeued worden en true teruggeven');
    assert.strictEqual(idb._store().length, 1);
    assert.strictEqual(idb._store()[0].method, 'RPC');
    assert.strictEqual(idb._store()[0].function, 'schedule_my_training');
    assert.strictEqual(idb._store()[0].args.p_occurrence_id, 'occ-2', 'de client-gegenereerde occurrence_id moet exact bewaard blijven in de queue');
    assert.strictEqual(idb._store()[0].owner_uid, 'user-A', 'RPC-items krijgen dezelfde owner_uid-isolatie als POST/PATCH/DELETE');
  });
});

tAsync('C2-D-3: permanente fout (400, validatie/ownership) -> NIET gequeued, sbRpcQ geeft false terug', function () {
  var idb = nepIndexedDB();
  var ctx = queueZandbak({ idb: idb, online: true, sessie: GEBRUIKER_A,
    antwoord: function () { return { ok: false, status: 400, body: 'workout_definition_id behoort niet toe aan de aanroepende gebruiker' }; } });
  return ctx.sbRpcQ('schedule_my_training', { p_workout_definition_id: 'w1', p_planned_date: '2026-09-10', p_occurrence_id: 'occ-3' }).then(function (result) {
    assert.strictEqual(result, false, 'permanente fout mag nooit gequeued worden -- zou eeuwig blijven falen');
    assert.strictEqual(idb._store().length, 0, 'geen queue-item bij een permanente fout');
  });
});

tAsync('C2-D-4: offline create -> direct gequeued zonder netwerkaanroep, mutation-id (occurrence_id) blijft bewaard', function () {
  var idb = nepIndexedDB();
  var ctx = queueZandbak({ idb: idb, online: false, sessie: GEBRUIKER_A });
  return ctx.sbRpcQ('schedule_my_training', { p_workout_definition_id: 'w1', p_planned_date: '2026-09-10', p_occurrence_id: 'occ-4' }).then(function (result) {
    assert.strictEqual(result, true);
    assert.strictEqual(ctx._verzoeken.length, 0, 'offline mag geen enkele netwerkaanroep doen');
    assert.strictEqual(idb._store()[0].args.p_occurrence_id, 'occ-4');
  });
});

tAsync('C2-D-5: replay via flushOfflineQueue verstuurt EXACT dezelfde args (occurrence_id nooit opnieuw gegenereerd)', function () {
  var idb = nepIndexedDB();
  idb._store().push({ id: 1, table: null, method: 'RPC', function: 'schedule_my_training',
    args: { p_workout_definition_id: 'w1', p_planned_date: '2026-09-10', p_definition_snapshot: { naam: 'Squat' }, p_occurrence_id: 'occ-stabiel' },
    owner_uid: 'user-A', ts: Date.now() });
  var ctx = queueZandbak({ idb: idb, online: true, sessie: GEBRUIKER_A,
    antwoord: function () { return { ok: true, json: 'occ-stabiel' }; } });
  return ctx.flushOfflineQueue().then(function () {
    var rpcCalls = ctx._verzoeken.filter(function (v) { return v.url.indexOf('/rpc/schedule_my_training') !== -1; });
    assert.strictEqual(rpcCalls.length, 1, 'exact één replay-aanroep');
    assert.strictEqual(rpcCalls[0].method, 'POST');
    assert.deepStrictEqual(JSON.parse(rpcCalls[0].body), { p_workout_definition_id: 'w1', p_planned_date: '2026-09-10', p_definition_snapshot: { naam: 'Squat' }, p_occurrence_id: 'occ-stabiel' },
      'de replay moet exact dezelfde args versturen als de oorspronkelijke, gefaalde poging -- geen nieuwe occurrence_id, geen gewijzigde payload');
    assert.strictEqual(idb._store().length, 0, 'succesvolle replay verwijdert het item uit de wachtrij');
  });
});

tAsync('C2-D-6: ordering -- offline create gevolgd door offline reschedule (PATCH op dezelfde occurrence_id) wordt FIFO gerepliceerd', function () {
  var idb = nepIndexedDB();
  var ctx1 = queueZandbak({ idb: idb, online: false, sessie: GEBRUIKER_A });
  return ctx1.sbRpcQ('schedule_my_training', { p_workout_definition_id: 'w1', p_planned_date: '2026-09-10', p_occurrence_id: 'occ-order' }).then(function () {
    return ctx1.sbPatchQ('planned_training_occurrences', 'id=eq.occ-order', { planned_date: '2026-09-11' });
  }).then(function () {
    assert.strictEqual(idb._store().length, 2, 'beide intenties staan in dezelfde, gedeelde wachtrij -- geen tweede queue');
    var ctx2 = queueZandbak({ idb: idb, online: true, sessie: GEBRUIKER_A,
      antwoord: function () { return { ok: true, json: 'occ-order' }; } });
    return ctx2.flushOfflineQueue().then(function () {
      assert.strictEqual(ctx2._verzoeken.length, 2);
      assert.ok(ctx2._verzoeken[0].url.indexOf('/rpc/schedule_my_training') !== -1, 'de create (RPC) moet EERST gerepliceerd worden');
      assert.ok(ctx2._verzoeken[1].url.indexOf('planned_training_occurrences') !== -1, 'de reschedule (PATCH) volgt daarna, exact de FIFO-volgorde waarin ze gequeued werden');
      assert.strictEqual(idb._store().length, 0, 'beide items succesvol verwerkt, wachtrij leeg -- eindstaat is de laatst bedoelde datum server-side (RPC-idempotency dekt de create, PATCH-volgorde dekt de reschedule)');
    });
  });
});

tAsync('C2-D-7: cross-user isolatie geldt ook voor RPC-items -- item van gebruiker A wordt niet onder gebruiker B geflushed', function () {
  var gedeeldeIdb = nepIndexedDB();
  var ctxA = queueZandbak({ idb: gedeeldeIdb, online: false, sessie: GEBRUIKER_A });
  return ctxA.sbRpcQ('schedule_my_training', { p_workout_definition_id: 'w1', p_planned_date: '2026-09-10', p_occurrence_id: 'occ-isol' }).then(function () {
    var ctxB = queueZandbak({ idb: gedeeldeIdb, online: true, sessie: { access_token: 'tb', refresh_token: 'rb', user: { id: 'user-B' } } });
    return ctxB.flushOfflineQueue().then(function () {
      var rpcCalls = ctxB._verzoeken.filter(function (v) { return v.url.indexOf('/rpc/schedule_my_training') !== -1; });
      assert.strictEqual(rpcCalls.length, 0, 'het RPC-item van gebruiker A mag nooit onder gebruiker B uitgevoerd worden');
      assert.strictEqual(gedeeldeIdb._store().length, 1, 'blijft geisoleerd in de gedeelde wachtrij');
      assert.strictEqual(gedeeldeIdb._store()[0].owner_uid, 'user-A');
    });
  });
});

tAsync('C2-D-8: poison item (blijft structureel falen) blokkeert de rest van de wachtrij niet', function () {
  var idb = nepIndexedDB();
  idb._store().push({ id: 1, table: null, method: 'RPC', function: 'schedule_my_training',
    args: { p_occurrence_id: 'occ-poison' }, owner_uid: 'user-A', ts: Date.now() - 1000 });
  idb._store().push({ id: 2, table: 'sessions', method: 'POST', body: { date: '2026-09-10', exercise_id: 'backsquat' }, owner_uid: 'user-A', ts: Date.now() });
  var teller = 0;
  var ctx = queueZandbak({ idb: idb, online: true, sessie: GEBRUIKER_A,
    antwoord: function (url) {
      if (url.indexOf('/rpc/schedule_my_training') !== -1) return { ok: false, status: 400, body: 'permanent ongeldig' };
      return { ok: true, json: {} };
    } });
  return ctx.flushOfflineQueue().then(function () {
    assert.strictEqual(idb._store().length, 1, 'het poison-item blijft in de wachtrij (niet stil weggegooid, niet eeuwig geretried binnen deze ene flush)');
    assert.strictEqual(idb._store()[0].function, 'schedule_my_training');
    var sessiePost = ctx._verzoeken.filter(function (v) { return v.url.indexOf('/sessions') !== -1; });
    assert.strictEqual(sessiePost.length, 1, 'het latere, op zichzelf staande item wordt gewoon verwerkt -- het poison-item blokkeert de rest niet');
  });
});

Promise.all(wachtend.map(function (w) {
  return Promise.resolve().then(w.fn).then(function () { n++; }, function (e) {
    console.error('MISLUKT:', w.naam, '\n ', e && e.message);
    process.exitCode = 1;
  });
})).then(function () {
  console.log('\n========================================================');
  console.log('fMyTrainingOfflineRpcHardening.test.js — ' + n + ' tests geslaagd');
  if (process.exitCode) process.exit(1);
});
