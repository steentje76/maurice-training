/* fOfflineHardening.test.js — v4.49.0: wachtrij, sessieherstel en service worker
 *
 * Vier bevindingen uit de mastersprint-audit op FASE 9 en 10, alle vier in de categorie
 * "de app zegt dat het goed ging". Ze staan hier bij elkaar omdat ze dezelfde belofte
 * dragen: er gaat niets verloren, en wat wél misgaat wordt gemeld.
 *
 *  P0  De offline-wachtrij was niet gebruiker-gescoped. Sporter A logde uit met openstaande
 *      items, B logde in op hetzelfde toestel, en de flush stuurde A's trainingen met B's
 *      token weg. A raakte zijn training kwijt, B kreeg gegevens die niet van hem waren.
 *  P0  Een mislukte schrijfactie naar de wachtrij (IndexedDB vol, private mode) leverde
 *      tóch `true` op: finishSession telde de oefening als opgeslagen en wiste het logboek.
 *  P0  Elke mislukte token-refresh — ook een netwerkfout — leidde tot uitloggen. Eén
 *      netwerkwissel betekende opnieuw inloggen, en de wachtrij kon niet meer flushen.
 *  P0  Een mislukte service-worker-install liet de complete offline-cache leeg achter.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var SW = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

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
  var enkel = HTML.match(new RegExp('(?:^|\\n)(?:const|var|let) ' + naam + "\\s*=[^\\n]*?;", 'm'));
  if (enkel) return enkel[0];
  var array = HTML.match(new RegExp('(?:^|\\n)(?:const|var|let) ' + naam + '\\s*=\\s*\\[[\\s\\S]*?\\n\\];', 'm'));
  assert.ok(array, 'constante niet gevonden: ' + naam);
  return array[0];
}
function konstVar(naam) { return konst(naam).replace(/^(\s*)(?:const|let) /m, '$1var '); }

/* Minimale IndexedDB. `kapot:true` laat elke schrijfactie falen — het scenario van een
   vol of geblokkeerd toestel. */
function nepIndexedDB(kapot) {
  var store = [], volgende = 1;
  function tx() {
    var handlers = {};
    var obj = {
      add: function (item) { if (kapot) { fout(); return; } store.push(Object.assign({ id: volgende++ }, item)); klaar(); },
      getAll: function () { var r = {}; setTimeout(function () { r.result = store.slice(); r.onsuccess && r.onsuccess(); }, 0); return r; },
      delete: function (id) { store = store.filter(function (x) { return x.id !== id; }); klaar(); }
    };
    function klaar() { setTimeout(function () { handlers.oncomplete && handlers.oncomplete(); }, 0); }
    function fout() { setTimeout(function () { handlers.onerror && handlers.onerror(); }, 0); }
    return { objectStore: function () { return obj; },
             set oncomplete(f) { handlers.oncomplete = f; },
             set onerror(f) { handlers.onerror = f; },
             get error() { return new Error('IndexedDB geweigerd'); } };
  }
  return { _store: function () { return store; },
    open: function () {
      var req = {};
      setTimeout(function () {
        req.result = { transaction: function () { return tx(); },
                       objectStoreNames: { contains: function () { return true; } } };
        req.onsuccess && req.onsuccess();
      }, 0);
      return req;
    } };
}

function zandbak(opts) {
  opts = opts || {};
  var idb = nepIndexedDB(!!opts.idbKapot);
  var verzoeken = [];
  var ctx = {
    indexedDB: idb,
    console: { error: function () {}, warn: function () {}, log: function () {} },
    navigator: { onLine: opts.online !== false },
    Date: Date, JSON: JSON, Object: Object, Promise: Promise, setTimeout: setTimeout,
    SB_URL: 'https://x.supabase.co', SB_H: { apikey: 'k', Authorization: 'Bearer t' },
    updateOfflineBadge: function () {},
    toast: function (m) { (ctx._toasts = ctx._toasts || []).push(m); },
    document: { getElementById: function () { return null; },
                querySelectorAll: function () { return { forEach: function () {} }; } },
    clearAuthSession: function () { ctx._gewist = (ctx._gewist || 0) + 1; ctx.authSession = null; },
    authSession: opts.sessie === undefined
      ? { access_token: 't', refresh_token: 'r', user: { id: opts.uid || 'u1' } }
      : opts.sessie,
    refreshAuthToken: function () { ctx._refreshes = (ctx._refreshes || 0) + 1; return Promise.resolve(opts.refreshStatus || 'ok'); },
    _verzoeken: verzoeken,
    fetch: function (url, init) {
      verzoeken.push({ url: url, method: (init && init.method) || 'GET', body: init && init.body });
      var res = opts.antwoord ? opts.antwoord(url, init, verzoeken.length) : { ok: true };
      if (res instanceof Error) return Promise.reject(res);
      return Promise.resolve({ ok: res.ok !== false, status: res.status || (res.ok === false ? 500 : 200),
                               text: function () { return Promise.resolve(''); } });
    }
  };
  vm.createContext(ctx);
  vm.runInContext([
    konstVar('OFFLINE_DB_NAME'), konstVar('SB_RETRY_STATUS'),
    konstVar('_sbRefreshInFlight'), konstVar('_sbSessieVerlopenGemeld'), konstVar('_flushBezig'),
    pak('sbRetryable'), pak('sbRefreshOnce'), pak('sbSessieVerlopen'), pak('sbFetch'),
    pak('_tkHuidigeUid'), pak('offlineDb'), pak('offlineQueueAdd'),
    pak('offlineQueueVanHuidigeGebruiker'), pak('offlineQueueAll'), pak('offlineQueueRemove'),
    pak('sbPostQ'), pak('sbPatchQ'), pak('sbDelQ'), pak('flushOfflineQueue')
  ].join('\n'), ctx);
  return ctx;
}

/* ══ A. DE WACHTRIJ HOORT BIJ EEN GEBRUIKER ════════════════════════════════ */
console.log('\nA. Wachtrij per gebruiker');

tAsync('A1: een gequeued item draagt de uid van de sporter die het aanmaakte', function () {
  var ctx = zandbak({ online: false, uid: 'sporter-A' });
  return ctx.sbPostQ('sessions', { date: '2026-08-19' })
    .then(function () { return ctx.offlineQueueAll(); })
    .then(function (items) {
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].uid, 'sporter-A', 'zonder eigenaar kan een ander account dit item versturen');
    });
});

tAsync('A2: de flush stuurt NOOIT een item van een andere sporter', function () {
  var ctx = zandbak({ online: false, uid: 'sporter-A' });
  return ctx.sbPostQ('sessions', { date: '2026-08-19', exercise_id: 'squat' })
    .then(function () {
      /* Sporter A logt uit, B logt in op hetzelfde toestel. */
      ctx.authSession = { access_token: 't2', refresh_token: 'r2', user: { id: 'sporter-B' } };
      ctx.navigator.onLine = true;
      return ctx.flushOfflineQueue();
    })
    .then(function () {
      assert.strictEqual(ctx._verzoeken.length, 0,
        'de training van sporter A is met de sessie van sporter B verstuurd — dataverlies bij A en vervuiling bij B');
      return ctx.offlineQueueAll();
    })
    .then(function (items) {
      assert.strictEqual(items.length, 1, 'het item van A mag ook niet weggegooid worden');
      assert.strictEqual(items[0].uid, 'sporter-A');
    });
});

tAsync('A3: dezelfde sporter krijgt zijn eigen items wél verstuurd', function () {
  var ctx = zandbak({ online: false, uid: 'sporter-A' });
  return ctx.sbPostQ('sessions', { date: '2026-08-19' })
    .then(function () { ctx.navigator.onLine = true; return ctx.flushOfflineQueue(); })
    .then(function () {
      assert.strictEqual(ctx._verzoeken.length, 1, 'de eigen wachtrij wordt niet meer afgespeeld');
      return ctx.offlineQueueAll();
    })
    .then(function (items) { assert.strictEqual(items.length, 0, 'het verstuurde item is niet opgeruimd'); });
});

t('A4: een item van vóór v4.49.0 (zonder uid) wordt geadopteerd, niet weggegooid', function () {
  var ctx = zandbak({ uid: 'sporter-A' });
  assert.strictEqual(ctx.offlineQueueVanHuidigeGebruiker({ table: 'sessions' }), true);
  assert.strictEqual(ctx.offlineQueueVanHuidigeGebruiker({ table: 'sessions', uid: 'sporter-B' }), false);
});

t('A5: zonder sessie hoort geen enkel item bij "de huidige gebruiker"', function () {
  var ctx = zandbak({ sessie: null });
  assert.strictEqual(ctx.offlineQueueVanHuidigeGebruiker({ uid: 'sporter-A' }), false);
  assert.strictEqual(ctx.offlineQueueVanHuidigeGebruiker({}), false);
});

/* ══ B. EEN MISLUKTE WACHTRIJ-SCHRIJFACTIE IS GEEN SUCCES ══════════════════ */
console.log('\nB. Mislukte wachtrij-schrijfactie');

tAsync('B1: offline + kapotte IndexedDB -> sbPostQ meldt FALSE', function () {
  var ctx = zandbak({ online: false, idbKapot: true });
  return ctx.sbPostQ('sessions', { date: '2026-08-19' }).then(function (ok) {
    assert.strictEqual(ok, false,
      'de oefening wordt als opgeslagen geteld terwijl hij nergens bestaat — het logboek wordt daarna gewist');
  });
});

tAsync('B2: hetzelfde voor PATCH en DELETE', function () {
  var ctx = zandbak({ online: false, idbKapot: true });
  return ctx.sbPatchQ('sessions', 'id=eq.1', { rpe: 8 }).then(function (ok) {
    assert.strictEqual(ok, false);
    return ctx.sbDelQ('sessions', 'id=eq.1');
  }).then(function (ok) { assert.strictEqual(ok, false); });
});

tAsync('B3: een netwerkfout met werkende wachtrij blijft gewoon TRUE', function () {
  var ctx = zandbak({ antwoord: function () { return new Error('netwerk weg'); } });
  return ctx.sbPostQ('sessions', { date: '2026-08-19' }).then(function (ok) {
    assert.strictEqual(ok, true, 'een gequeued item is wél veilig — dit mag geen foutmelding geven');
  });
});

/* ══ C. EEN NETWERKFOUT IS GEEN VERLOPEN SESSIE ════════════════════════════ */
console.log('\nC. Token-refresh');

tAsync('C1: bij een tijdelijke storing wordt de sessie NIET gewist', function () {
  var ctx = zandbak({ refreshStatus: 'tijdelijk',
                      antwoord: function () { return { ok: false, status: 401 }; } });
  return ctx.sbFetch('https://x.supabase.co/rest/v1/sessions', {}).then(function () {
    assert.strictEqual(ctx._gewist || 0, 0,
      'één netwerkwissel logt de sporter uit — en dan kan de offline-wachtrij nooit meer flushen');
    assert.ok(ctx.authSession, 'de sessie is weg');
  });
});

tAsync('C2: bij een echte afwijzing wordt er wél uitgelogd', function () {
  var ctx = zandbak({ refreshStatus: 'verlopen',
                      antwoord: function () { return { ok: false, status: 401 }; } });
  return ctx.sbFetch('https://x.supabase.co/rest/v1/sessions', {}).then(function () {
    assert.strictEqual(ctx._gewist, 1, 'een geweigerd refresh-token hoort wél tot uitloggen te leiden');
  });
});

tAsync('C3: na een geslaagde refresh volgt precies één retry', function () {
  var ctx = zandbak({ refreshStatus: 'ok',
                      antwoord: function (u, o, n) { return n === 1 ? { ok: false, status: 401 } : { ok: true }; } });
  return ctx.sbFetch('https://x.supabase.co/rest/v1/sessions', {}).then(function (r) {
    assert.strictEqual(r.status, 200, 'de retry is niet uitgevoerd');
    assert.strictEqual(ctx._refreshes, 1, 'er is meer dan één refresh gedaan');
    assert.strictEqual(ctx._verzoeken.length, 2, 'er is meer dan één retry gedaan');
  });
});

tAsync('C4: bij een 401 met tijdelijke storing komt de schrijfactie in de wachtrij', function () {
  var ctx = zandbak({ refreshStatus: 'tijdelijk',
                      antwoord: function () { return { ok: false, status: 401 }; } });
  return ctx.sbPostQ('sessions', { date: '2026-08-19' }).then(function (ok) {
    assert.strictEqual(ok, true);
    return ctx.offlineQueueAll();
  }).then(function (items) {
    assert.strictEqual(items.length, 1, '401 is herhaalbaar en hoort in de wachtrij, niet in de prullenbak');
  });
});

t('C5: refreshAuthToken geeft een status terug, niet true/false', function () {
  var src = pak('refreshAuthToken');
  assert.ok(src.indexOf("return 'tijdelijk'") >= 0, "geen 'tijdelijk'-uitkomst — een netwerkfout logt dan weer uit");
  assert.ok(src.indexOf("return 'verlopen'") >= 0);
  assert.ok(src.indexOf("return 'ok'") >= 0);
  assert.ok(/r\.status===400\|\|r\.status===401\|\|r\.status===403/.test(src),
    'er wordt niet op statuscode onderscheiden tussen afwijzing en storing');
  assert.ok(src.indexOf('navigator.onLine') >= 0, 'offline wordt niet als tijdelijk herkend');
});

t('C6: bij het opstarten leidt een tijdelijke storing niet tot uitloggen', function () {
  var src = pak('ensureValidSession');
  assert.ok(src.indexOf("st==='verlopen'") >= 0 && src.indexOf('clearAuthSession()') >= 0,
    'ensureValidSession wist de sessie nog bij elke mislukte refresh');
  assert.ok(!/const ok=await refreshAuthToken\(\);\s*if\(!ok\)/.test(src.replace(/\s+/g, ' ')),
    'de oude booleaanse afhandeling staat er nog');
});

/* ══ D. SERVICE WORKER ═════════════════════════════════════════════════════ */
console.log('\nD. Service worker');

t('D1: een mislukt asset kost niet de hele offline-cache', function () {
  assert.ok(SW.indexOf('cache.addAll(STATIC_ASSETS)') < 0,
    'cache.addAll is atomair: één mislukt asset laat de cache volledig leeg en de app is offline dood');
  assert.ok(/STATIC_ASSETS\.map\(url =>[\s\S]*?cache\.add\(url\)\.catch/.test(SW),
    'assets worden niet per stuk gecachet');
});

t('D2: alleen een echte app-respons mag de offline-shell worden', function () {
  assert.ok(/response\.ok && response\.type === 'basic'/.test(SW),
    'een captive-portal-pagina (status 200) wordt permanent als /index.html gecachet');
});

t('D3: de HTML-fallback geldt alleen voor documenten', function () {
  assert.ok(/e\.request\.destination === 'document'/.test(SW),
    'een mislukte /core/*.js krijgt HTML terug; de app draait dan half-kapot door');
  assert.ok(SW.indexOf('504') >= 0, 'er is geen expliciete foutstatus voor niet-documenten');
});

t('D4: de cachenamen blijven samen gebumpt en activate ruimt op', function () {
  assert.ok(/const CACHE_NAME = 'trainingskompas-v\d+'/.test(SW));
  assert.ok(/const CACHE_STATIC = 'trainingskompas-static-v\d+'/.test(SW));
  assert.ok(SW.indexOf('k !== CACHE_NAME && k !== CACHE_STATIC && k !== CACHE_VIDEOS') >= 0,
    'activate ruimt oude caches niet meer op');
});

/* ══ E. OVERIGE HARDENING ══════════════════════════════════════════════════ */
console.log('\nE. Overige hardening');

t('E1: sbDel en sbUpsert lopen via sbFetch', function () {
  ['sbDel', 'sbUpsert'].forEach(function (fn) {
    var src = pak(fn);
    assert.ok(src.indexOf('sbFetch(') >= 0, fn + ' doet nog een kale fetch — daar is 401-herstel dan weg');
    assert.ok(!/await fetch\(/.test(src), fn + ' bevat nog een directe fetch');
  });
});

t('E2: een gedeeltelijk mislukte sessie dupliceert niet bij een tweede poging', function () {
  var src = pak('finishSession');
  assert.ok(src.indexOf('_opgeslagenIds.push(ex.id)') >= 0, 'er wordt niet bijgehouden wat al is weggeschreven');
  assert.ok(/_opgeslagenIds\.forEach\(id=>\{ delete sessionLog\[id\]/.test(src),
    'de geslaagde oefeningen blijven in het logboek staan en worden bij een retry nogmaals weggeschreven');
});

t('E3: de intakevlag wordt pas gezet als het profiel echt is opgeslagen', function () {
  var src = pak('intakeConfirm');
  var iProfiel = src.indexOf("atleet_profiel niet opgeslagen");
  var iVlag = src.indexOf("tk_onboarding_done','1'");
  assert.ok(iProfiel > 0, 'de uitkomst van de profiel-upsert wordt nog genegeerd');
  assert.ok(iVlag > iProfiel, 'de vlag wordt gezet vóór de controle — de intake kan onherstelbaar verdwijnen');
});

t('E4: recovery wordt ook toegepast op een eigen training via Preview', function () {
  var src = pak('startCustomTraining');
  assert.ok(src.indexOf('sessionRxAdj[curT]=_cAdj') >= 0,
    'de herstelaanpassing wordt niet als sessie-delta gezet — via Preview gestarte eigen trainingen krijgen dan geen enkele aanpassing');
  var iAdj = src.indexOf('sessionRxAdj[curT]=_cAdj');
  var iItems = src.indexOf('resolvedItems&&resolvedItems.length');
  assert.ok(iAdj < iItems, 'de aanpassing staat nog steeds ná de tak die alleen zonder resolvedItems loopt');
  assert.ok(src.indexOf('_bSets=Math.max(1,4+') < 0,
    'de tweede, afwijkende kopie van dezelfde regel staat er nog');
});

t('E5: er is nog maar één schrijfroute voor de oefeningen van een eigen training', function () {
  var src = pak('pushCustomTrainingExercises');
  assert.ok(src.indexOf('pushCustomTrainingExercisesRich') >= 0,
    'de arme variant schrijft nog zelf en wist daarmee sets/reps/rpe/rest/pick van Builder-trainingen');
  assert.ok(src.indexOf("sbDel(") < 0 && src.indexOf("sbPost(") < 0,
    'er wordt nog buiten de offline-wachtrij om geschreven');
});

t('E6: de meest getikte knoppen halen de 44px-ondergrens', function () {
  assert.ok(/#s-guided \.g2-wt\{width:44px;height:44px/.test(HTML),
    'de gewicht-knop tijdens een set is nog kleiner dan 44px');
  assert.ok(/\.ibtn\{[^}]*width:44px;height:44px/.test(HTML),
    'de universele terugknop is nog kleiner dan 44px');
});

/* ══ SLOT ═══════════════════════════════════════════════════════════════════ */
(function volgende(i) {
  if (i >= wachtend.length) {
    console.log('\n========================================================');
    console.log('RESULTAAT: ' + geslaagd + ' geslaagd, ' + mislukt + ' mislukt');
    if (mislukt) { console.log('❌ Offline hardening niet groen.'); process.exit(1); }
    console.log('✅ Offline hardening groen.');
    return;
  }
  var w = wachtend[i];
  Promise.resolve().then(w.fn).then(
    function () { geslaagd++; console.log('  ✓ ' + w.naam); volgende(i + 1); },
    function (e) { mislukt++; console.log('  ✗ ' + w.naam + ' :: ' + (e && e.message)); volgende(i + 1); }
  );
})(0);
