/* fFase2.test.js — Fase 2: login/RLS, per-user scheiding en offline sync
 *
 * De roadmap had voor Fase 2 twee vinkjes openstaan met exact dezelfde reden: het is
 * gebouwd, maar nog niet functioneel bevestigd. Deze suite is die bevestiging. Hij
 * draait de echte, verzonden implementaties uit index.html in een zandbak met een
 * nagebouwde localStorage, IndexedDB en fetch, zodat het gedrag dat een gebruiker
 * ondervindt — wisselen van account op één toestel, en trainen zonder verbinding —
 * deterministisch te controleren is.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var n = 0;
function t(naam, fn) { fn(); n++; }
/* Sommige tests zijn async; die wachten elk op hun eigen keten en draaien onderaan. */
var wachtend = [];
function tAsync(naam, fn) { wachtend.push({ naam: naam, fn: fn }); }

function pak(naam) {
  var m = HTML.match(new RegExp('(?:^|\\n)(?:async )?function ' + naam + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
  assert.ok(m, 'functie niet gevonden in index.html: ' + naam);
  return m[0];
}
/* Eerst de eenregelige vorm proberen. Andersom zou een `const X='y';` per ongeluk
   doorlopen tot de afsluitende `];` van een verderop staande array-declaratie, en dan
   twee declaraties tegelijk teruggeven. */
function konst(naam) {
  var enkel = HTML.match(new RegExp('(?:^|\\n)(?:const|var|let) ' + naam + "\\s*=[^\\n]*?;", 'm'));
  if (enkel) return enkel[0];
  var array = HTML.match(new RegExp('(?:^|\\n)(?:const|var|let) ' + naam + '\\s*=\\s*\\[[\\s\\S]*?\\n\\];', 'm'));
  assert.ok(array, 'constante niet gevonden: ' + naam);
  return array[0];
}
/* `const` en `let` zijn lexicaal en komen in een vm-context niet op het contextobject
   terecht; `var` wel. De declaratie wordt daarom omgezet, puur zodat de test de waarde
   kan uitlezen — de code zelf blijft inhoudelijk identiek. */
function konstVar(naam) { return konst(naam).replace(/^(\s*)(?:const|let) /m, '$1var '); }

/* ── Nagebouwde browseropslag ───────────────────────────────────────────────── */
/* De echte localStorage legt zijn sleutels als eigen, opsombare eigenschappen op het
   object neer — daar leunt wipePersonalCache op met Object.keys(localStorage) voor de
   tk_1rm_*-sleutels. Deze namaak doet dat dus ook, met de methodes bewust
   niet-opsombaar; anders zou de test een implementatie goedkeuren die in de browser
   faalt. */
function nepLocalStorage() {
  var ls = {};
  Object.defineProperties(ls, {
    getItem: { value: function (k) { return Object.prototype.hasOwnProperty.call(ls, k) ? ls[k] : null; } },
    setItem: { value: function (k, v) { ls[k] = String(v); } },
    removeItem: { value: function (k) { delete ls[k]; } },
    length: { get: function () { return Object.keys(ls).length; } }
  });
  return ls;
}

/* ══ A. PER-USER PROFIELSCHEIDING ═══════════════════════════════════════════
 * Het scenario dat ooit fout ging: twee accounts op één toestel, binnen dezelfde
 * browsersessie (geen page reload tussen uitloggen en opnieuw inloggen). Een
 * module-variabele die niet werd geleegd toonde toen de 1RM's van de vorige gebruiker.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log('\nA. Per-user profielscheiding');

function cacheZandbak() {
  var ls = nepLocalStorage();
  var ctx = {
    localStorage: ls, Object: Object, Set: Set, Map: Map, console: console,
    /* de module-variabelen die de reset moet legen */
    atleet: { naam: 'Vorige', leeftijd: 44 }, customTrainings: [{ id: 'x' }], activeSport: 'crossfit',
    progExData: { 'TK-1': { e1rm: 120 } }, estOneRMCache: { a: 1 }, repPRCache: { a: 1 },
    goalsCache: [{ id: 'g' }], programBlockExCache: { b: 1 }, exPickerRecentIds: ['e1'],
    vasteTrainingen: [{ id: 'v' }], vtMetaSel: { s: 1 }, _vasteTrainingenLoaded: true,
    exercises: [{ id: 'ex' }], _exercisesLoading: {}, favoriteExIds: new Set(['f']),
    _favoritesLoaded: true, exerciseGoals: new Map([['a', 1]]), _exerciseGoalsLoaded: true,
    equipmentTypes: [{ id: 'q' }], _equipmentTypesLoading: {},
    equipmentCatalog: [{ id: 'c' }], _equipmentCatalogLoading: {}
  };
  vm.createContext(ctx);
  vm.runInContext([konstVar('CACHE_OWNER_KEY'), konstVar('PERSONAL_CACHE_KEYS'),
                   pak('wipePersonalCache'), pak('resetPersonalCacheIfNewDeviceOwner')].join('\n'), ctx);
  return ctx;
}

t('A1: elke persoonlijke cachesleutel wordt gewist', function () {
  var ctx = cacheZandbak();
  ctx.PERSONAL_CACHE_KEYS.forEach(function (k) { ctx.localStorage.setItem(k, 'oud'); });
  ctx.localStorage.setItem('tk_1rm_TK-000030', '62.5');
  ctx.wipePersonalCache();
  ctx.PERSONAL_CACHE_KEYS.forEach(function (k) {
    assert.strictEqual(ctx.localStorage.getItem(k), null, 'blijft achter: ' + k);
  });
  assert.strictEqual(ctx.localStorage.getItem('tk_1rm_TK-000030'), null,
    'per-oefening-1RM van de vorige gebruiker blijft achter');
});

t('A2: sleutels van een andere app blijven ongemoeid', function () {
  var ctx = cacheZandbak();
  ctx.localStorage.setItem('iets_anders', 'bewaren');
  ctx.wipePersonalCache();
  assert.strictEqual(ctx.localStorage.getItem('iets_anders'), 'bewaren');
});

t('A3: een nieuwe eigenaar op hetzelfde toestel wist de cache', function () {
  var ctx = cacheZandbak();
  ctx.localStorage.setItem(ctx.CACHE_OWNER_KEY, 'gebruiker-A');
  ctx.localStorage.setItem('tk_atleet', '{"naam":"A"}');
  ctx.resetPersonalCacheIfNewDeviceOwner('gebruiker-B');
  assert.strictEqual(ctx.localStorage.getItem('tk_atleet'), null, 'cache van A overleeft de wissel');
  assert.strictEqual(ctx.localStorage.getItem(ctx.CACHE_OWNER_KEY), 'gebruiker-B');
});

t('A4: dezelfde gebruiker behoudt zijn cache', function () {
  var ctx = cacheZandbak();
  ctx.localStorage.setItem(ctx.CACHE_OWNER_KEY, 'gebruiker-A');
  ctx.localStorage.setItem('tk_atleet', '{"naam":"A"}');
  ctx.resetPersonalCacheIfNewDeviceOwner('gebruiker-A');
  assert.strictEqual(ctx.localStorage.getItem('tk_atleet'), '{"naam":"A"}',
    'cache wordt onnodig gewist bij dezelfde gebruiker');
});

t('A5: zonder uid gebeurt er niets', function () {
  var ctx = cacheZandbak();
  ctx.localStorage.setItem(ctx.CACHE_OWNER_KEY, 'gebruiker-A');
  ctx.localStorage.setItem('tk_atleet', '{"naam":"A"}');
  [null, undefined, ''].forEach(function (uid) {
    ctx.resetPersonalCacheIfNewDeviceOwner(uid);
    assert.strictEqual(ctx.localStorage.getItem('tk_atleet'), '{"naam":"A"}',
      'cache gewist bij ontbrekende uid (' + uid + ')');
  });
});

t('A6: het geheugen wordt óók geleegd — dit was de echte bug', function () {
  var ctx = cacheZandbak();
  ctx.localStorage.setItem(ctx.CACHE_OWNER_KEY, 'gebruiker-A');
  ctx.resetPersonalCacheIfNewDeviceOwner('gebruiker-B');
  /* Leeg-zijn wordt op sleutelaantal gecontroleerd en niet met deepStrictEqual: de
     objecten worden binnen de vm-realm opnieuw aangemaakt en hebben daar een ander
     prototype, waardoor een strikte vergelijking op realm-verschil zou struikelen in
     plaats van op inhoud. */
  var leeg = function (v, naam) {
    assert.strictEqual(Object.keys(v).length, 0, naam + ' bevat nog data van de vorige gebruiker');
  };
  leeg(ctx.progExData, 'progExData (geschatte 1RM)');
  leeg(ctx.estOneRMCache, 'estOneRMCache');
  leeg(ctx.repPRCache, 'repPRCache');
  leeg(ctx.goalsCache, 'goalsCache');
  leeg(ctx.customTrainings, 'customTrainings');
  leeg(ctx.vasteTrainingen, 'vasteTrainingen');
  leeg(ctx.exercises, 'exercises');
  assert.strictEqual(ctx.activeSport, null);
  assert.strictEqual(ctx.exerciseGoals.size, 0);
  assert.strictEqual(ctx.favoriteExIds.size, 0);
  assert.strictEqual(ctx.atleet.naam, '', 'atleetprofiel van de vorige gebruiker blijft staan');
});

t('A7: de "al geladen"-vlaggen gaan mee, anders blijft de stale cache vertrouwd', function () {
  var ctx = cacheZandbak();
  ctx.localStorage.setItem(ctx.CACHE_OWNER_KEY, 'gebruiker-A');
  ctx.resetPersonalCacheIfNewDeviceOwner('gebruiker-B');
  ['_vasteTrainingenLoaded', '_favoritesLoaded', '_exerciseGoalsLoaded'].forEach(function (v) {
    assert.strictEqual(ctx[v], false, v + ' blijft true — volgende ensureXLoaded() haalt niets op');
  });
  ['_exercisesLoading', '_equipmentTypesLoading', '_equipmentCatalogLoading'].forEach(function (v) {
    assert.strictEqual(ctx[v], null, v + ' houdt de oude belofte vast');
  });
});

t('A8: de reset hangt aan de sessiecontrole', function () {
  assert.ok(/resetPersonalCacheIfNewDeviceOwner\(authSession\?\.user\?\.id\)/.test(HTML),
    'de reset wordt niet vanuit de auth-sessie aangeroepen');
});

t('A9: elke schrijfactie naar een persoonlijke tabel draagt user_id of leunt op RLS', function () {
  /* Supabase vult user_id via RLS/default; de app mag hem niet vergeten waar de kolom
     NOT NULL is. Deze test bewaakt dat het patroon nog bestaat, niet elke aanroep. */
  assert.ok(HTML.indexOf('user_id') > 0);
  assert.ok(/auth\.uid\(\)|user_id:/.test(HTML), 'geen enkel spoor van user-scoping meer');
});

/* RC0 — generiek net. De lijst met persoonlijke sleutels is twee keer eerder
   achtergelopen op de code (DEC-032 en v5.8.5). Deze test vergelijkt daarom niet een
   handgeschreven opsomming, maar ELKE sleutel die de app daadwerkelijk wegschrijft met
   de lijst, en dwingt af dat een nieuwe sleutel bewust wordt geclassificeerd. */
var DEVICE_SLEUTELS = [
  'tk_theme',        /* weergavevoorkeur van het toestel, geen persoonsgegeven */
  'tk_ns_migrated',  /* eenmalige namespace-migratie van dit toestel */
  'tk_auth_session', /* de sessie zelf; wordt door clearAuthSession beheerd */
  'tk_cache_owner_uid',
  'tk_schema_duration_s' /* v4.49.0 — vastgestelde schema-capabiliteit van de BACKEND (bestaat
                            sessions.duration_s?), geen persoonsgegeven en niet gebruikersgebonden.
                            Wordt uitsluitend positief onthouden; zie tkDurationKolomBeschikbaar. */
];
function geschrevenSleutels() {
  var uit = {}, re = /localStorage\.setItem\(\s*'([^']+)'/g, m;
  while ((m = re.exec(HTML))) uit[m[1]] = true;
  return Object.keys(uit);
}

t('A10: elke geschreven localStorage-sleutel is bewust geclassificeerd', function () {
  var ctx = cacheZandbak();
  var lijst = ctx.PERSONAL_CACHE_KEYS;
  var onbekend = geschrevenSleutels().filter(function (k) {
    if (lijst.indexOf(k) >= 0) return false;
    if (DEVICE_SLEUTELS.indexOf(k) >= 0) return false;
    if (k === 'tk_1rm_' || k === 'sel_' || k === 'tk_...') return false; /* prefixen/documentatie */
    return true;
  });
  assert.deepStrictEqual(onbekend, [],
    'niet geclassificeerd (persoonlijk of toestel?): ' + onbekend.join(', '));
});

t('A11: de onboarding-vlag hoort bij de gebruiker, niet bij het toestel', function () {
  /* Dit was de zwaarste: een tweede sporter op hetzelfde toestel sloeg de hele intake
     over en had daardoor geen profiel, doel of sport — de coach had niets om op te
     staan en de kernlus begon met een leeg atleetmodel. */
  var ctx = cacheZandbak();
  assert.ok(ctx.PERSONAL_CACHE_KEYS.indexOf('tk_onboarding_done') >= 0,
    'tk_onboarding_done staat niet in de persoonlijke sleutels');
  ctx.localStorage.setItem(ctx.CACHE_OWNER_KEY, 'gebruiker-A');
  ctx.localStorage.setItem('tk_onboarding_done', '1');
  ctx.resetPersonalCacheIfNewDeviceOwner('gebruiker-B');
  assert.strictEqual(ctx.localStorage.getItem('tk_onboarding_done'), null,
    'de nieuwe sporter erft de afgeronde onboarding van de vorige');
});

t('A12: coachvoorkeuren en apparatuurgeheugen gaan mee bij een eigenaarswissel', function () {
  var ctx = cacheZandbak();
  ctx.localStorage.setItem(ctx.CACHE_OWNER_KEY, 'gebruiker-A');
  ['tk_coach_style', 'tk_coach_voice', 'tk_coach_detail', 'tk_eqmem', 'tk_wb_favs',
   'bikeerg_machines', 'skierg_machines', 'assault_machines'].forEach(function (k) {
    ctx.localStorage.setItem(k, 'van-A');
  });
  ctx.localStorage.setItem('sel_rowing', 'PM5 3');
  ctx.resetPersonalCacheIfNewDeviceOwner('gebruiker-B');
  ['tk_coach_style', 'tk_coach_voice', 'tk_coach_detail', 'tk_eqmem', 'tk_wb_favs',
   'bikeerg_machines', 'skierg_machines', 'assault_machines', 'sel_rowing'].forEach(function (k) {
    assert.strictEqual(ctx.localStorage.getItem(k), null, k + ' blijft van de vorige gebruiker');
  });
});

/* ── tkOnboardingAfgerond: het profiel in de database als tweede bron ─────── */
function onboardingZandbak(rijen) {
  var ls = nepLocalStorage();
  var ctx = {
    localStorage: ls, Object: Object, Promise: Promise, Array: Array, console: console,
    authSession: { user: { id: 'u1' } },
    v43SafeGet: function () { return Promise.resolve(rijen); }
  };
  vm.createContext(ctx);
  vm.runInContext(pak('tkOnboardingAfgerond'), ctx);
  return ctx;
}

tAsync('A13: een bestaand profiel telt als afgeronde onboarding (nieuw toestel)', function () {
  var ctx = onboardingZandbak([{ naam: 'Maurice', sport: 'crossfit' }]);
  return ctx.tkOnboardingAfgerond().then(function (klaar) {
    assert.strictEqual(klaar, true, 'dezelfde sporter moet op een nieuw toestel opnieuw door de intake');
    assert.strictEqual(ctx.localStorage.getItem('tk_onboarding_done'), '1',
      'de vlag wordt niet lokaal hersteld — dan gebeurt dit bij elke start opnieuw');
  });
});

tAsync('A14: een lege profielrij telt NIET als afgerond — er wordt niets verzonnen', function () {
  var ctx = onboardingZandbak([{ naam: null, sport: null, niveau: null, doel: null }]);
  return ctx.tkOnboardingAfgerond().then(function (klaar) {
    assert.strictEqual(klaar, false);
    assert.strictEqual(ctx.localStorage.getItem('tk_onboarding_done'), null);
  });
});

tAsync('A15: geen profiel en geen vlag -> de intake, zoals altijd', function () {
  var ctx = onboardingZandbak([]);
  return ctx.tkOnboardingAfgerond().then(function (klaar) { assert.strictEqual(klaar, false); });
});

tAsync('A16: de lokale vlag wint en bespaart een netwerkrondje', function () {
  var ctx = onboardingZandbak(null); /* zou crashen als er tóch gelezen wordt */
  ctx.localStorage.setItem('tk_onboarding_done', '1');
  return ctx.tkOnboardingAfgerond().then(function (klaar) { assert.strictEqual(klaar, true); });
});

/* ══ B. OFFLINE SYNC QUEUE ═════════════════════════════════════════════════
 * De roadmap: "gebouwd, nog niet functioneel bevestigd". Hieronder de bevestiging.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log('\nB. Offline sync queue');

/* Minimale, deterministische IndexedDB. Genoeg voor de drie queue-functies:
   add met autoIncrement, getAll, delete. Geen echte database, geen timers. */
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
  var idb = nepIndexedDB();
  var verzoeken = [];
  var ctx = {
    indexedDB: idb, console: { error: function () {}, warn: function () {}, log: function () {} },
    navigator: { onLine: opts.online !== false },
    Date: Date, JSON: JSON, Object: Object, Promise: Promise, setTimeout: setTimeout,
    SB_URL: 'https://x.supabase.co', SB_H: { apikey: 'k' },
    updateOfflineBadge: function () { ctx._badge = (ctx._badge || 0) + 1; },
    toast: function (m) { (ctx._toasts = ctx._toasts || []).push(m); },
    document: { getElementById: function () { return null; } },
    _verzoeken: verzoeken,
    /* RC0: sbPostQ/sbPatchQ/sbDelQ/flushOfflineQueue lopen sinds de sessie-veilige
       fetch-laag via sbFetch. De zandbak laadt die laag daarom mee, inclusief een
       instelbare refresh, zodat 401-gedrag echt getest wordt en niet per ongeluk in
       de catch-tak belandt. */
    authSession: opts.sessie === undefined ? { access_token: 't', refresh_token: 'r', user: { id: 'u1' } } : opts.sessie,
    /* v4.49.0 — status-contract i.p.v. booleaanse waarde, zie fSessieIntegriteit. */
    refreshAuthToken: function () { ctx._refreshes = (ctx._refreshes || 0) + 1; return Promise.resolve(opts.refreshLukt ? 'ok' : 'verlopen'); },
    fetch: function (url, o) {
      verzoeken.push({ url: url, method: (o && o.method) || 'GET', body: o && o.body });
      var res = opts.antwoord ? opts.antwoord(url, o, verzoeken.length) : { ok: true };
      if (res instanceof Error) return Promise.reject(res);
      return Promise.resolve({ ok: res.ok, status: res.status || (res.ok ? 200 : 500),
                               text: function () { return Promise.resolve(res.body || ''); } });
    }
  };
  vm.createContext(ctx);
  vm.runInContext([konstVar('OFFLINE_DB_NAME'), konstVar('SB_RETRY_STATUS'),
                   konstVar('_sbRefreshInFlight'), konstVar('_sbSessieVerlopenGemeld'),
                   konstVar('_flushBezig'),
                   pak('sbRetryable'), pak('sbRefreshOnce'), pak('sbSessieVerlopen'),
                   pak('sbFetch'), pak('_tkHuidigeUid'), pak('offlineDb'), pak('offlineQueueAdd'),
                   pak('offlineQueueVanHuidigeGebruiker'),
                   pak('offlineQueueAll'), pak('offlineQueueRemove'), pak('sbPostQ'),
                   pak('sbPatchQ'), pak('sbDelQ'), pak('flushOfflineQueue')].join('\n'), ctx);
  ctx._idb = idb;
  return ctx;
}


tAsync('B1: offline schrijven verliest geen data maar queuet', function () {
  var ctx = queueZandbak({ online: false });
  return ctx.sbPostQ('sessions', { date: '2026-08-19', exercise_id: 'a' }).then(function (ok) {
    assert.strictEqual(ok, true, 'de lokale flow wordt geblokkeerd terwijl offline');
    assert.strictEqual(ctx._verzoeken.length, 0, 'er is toch een netwerkverzoek gedaan');
    return ctx.offlineQueueAll();
  }).then(function (items) {
    assert.strictEqual(items.length, 1, 'niets gequeued — dit is dataverlies');
    assert.strictEqual(items[0].table, 'sessions');
    assert.strictEqual(items[0].method, 'POST');
    assert.ok(items[0].ts, 'geen tijdstempel op het queue-item');
  });
});

tAsync('B2: een netwerkfout online queuet óók', function () {
  var ctx = queueZandbak({ antwoord: function () { return new Error('netwerk weg'); } });
  return ctx.sbPostQ('sessions', { date: '2026-08-19' }).then(function (ok) {
    assert.strictEqual(ok, true);
    return ctx.offlineQueueAll();
  }).then(function (items) {
    assert.strictEqual(items.length, 1, 'data verloren bij een netwerkfout');
  });
});

tAsync('B3: een serverfout (4xx/5xx) queuet NIET — dat zou eindeloos herhalen', function () {
  var ctx = queueZandbak({ antwoord: function () { return { ok: false, status: 400, body: 'ongeldig' }; } });
  return ctx.sbPostQ('sessions', { date: '2026-08-19' }).then(function (ok) {
    assert.strictEqual(ok, false, 'een afgewezen schrijfactie meldt geen succes');
    return ctx.offlineQueueAll();
  }).then(function (items) {
    assert.strictEqual(items.length, 0, 'een door de server geweigerd item belandt in de wachtrij');
  });
});

tAsync('B4: PATCH en DELETE queuen met hun filter', function () {
  var ctx = queueZandbak({ online: false });
  return ctx.sbPatchQ('training_instances', 'id=eq.abc', { status: 'completed' })
    .then(function () { return ctx.sbDelQ('sessions', 'id=eq.xyz'); })
    .then(function () { return ctx.offlineQueueAll(); })
    .then(function (items) {
      assert.strictEqual(items.length, 2);
      var patch = items.filter(function (i) { return i.method === 'PATCH'; })[0];
      var del = items.filter(function (i) { return i.method === 'DELETE'; })[0];
      assert.strictEqual(patch.filter, 'id=eq.abc', 'PATCH verliest zijn filter');
      assert.strictEqual(del.filter, 'id=eq.xyz', 'DELETE verliest zijn filter');
      assert.strictEqual(del.body, undefined, 'DELETE draagt onnodig een body mee');
    });
});

tAsync('B5: de wachtrij wordt in volgorde afgespeeld', function () {
  var ctx = queueZandbak({ online: false });
  return ctx.sbPostQ('sessions', { n: 1 })
    .then(function () { return ctx.sbPostQ('sessions', { n: 2 }); })
    .then(function () { return ctx.sbPostQ('sessions', { n: 3 }); })
    .then(function () { ctx.navigator.onLine = true; return ctx.flushOfflineQueue(); })
    .then(function () {
      var volgorde = ctx._verzoeken.map(function (r) { return JSON.parse(r.body).n; });
      assert.deepStrictEqual(volgorde, [1, 2, 3], 'volgorde niet behouden: ' + volgorde);
      return ctx.offlineQueueAll();
    })
    .then(function (rest) { assert.strictEqual(rest.length, 0, 'wachtrij niet leeggemaakt'); });
});

tAsync('B6: offline blijft de wachtrij onaangeroerd', function () {
  var ctx = queueZandbak({ online: false });
  return ctx.sbPostQ('sessions', { n: 1 })
    .then(function () { return ctx.flushOfflineQueue(); })
    .then(function () {
      assert.strictEqual(ctx._verzoeken.length, 0, 'er wordt gesynchroniseerd terwijl offline');
      return ctx.offlineQueueAll();
    })
    .then(function (items) { assert.strictEqual(items.length, 1); });
});

tAsync('B7: één mislukt item blokkeert de rest niet, maar blijft wel staan', function () {
  var ctx = queueZandbak({ online: false, antwoord: function (url, o, nr) {
    return nr === 1 ? { ok: false, status: 400, body: 'kapot' } : { ok: true };
  } });
  return ctx.sbPostQ('sessions', { n: 1 })
    .then(function () { return ctx.sbPostQ('sessions', { n: 2 }); })
    .then(function () { return ctx.sbPostQ('sessions', { n: 3 }); })
    .then(function () { ctx.navigator.onLine = true; return ctx.flushOfflineQueue(); })
    .then(function () {
      assert.strictEqual(ctx._verzoeken.length, 3, 'na het mislukte item is gestopt');
      return ctx.offlineQueueAll();
    })
    .then(function (rest) {
      assert.strictEqual(rest.length, 1, 'het mislukte item is stilzwijgend weggegooid of alles bleef staan');
      assert.strictEqual(rest[0].body.n, 1, 'het verkeerde item bleef achter');
      assert.ok((ctx._toasts || []).some(function (m) { return m.indexOf('wachtrij') >= 0; }),
        'de sporter wordt niet gewaarschuwd over het achtergebleven item');
    });
});

tAsync('B8: wegvallend netwerk tijdens sync stopt en bewaart alles wat nog niet weg is', function () {
  var ctx = queueZandbak({ online: false, antwoord: function (url, o, nr) {
    return nr === 1 ? { ok: true } : new Error('verbinding weg');
  } });
  return ctx.sbPostQ('sessions', { n: 1 })
    .then(function () { return ctx.sbPostQ('sessions', { n: 2 }); })
    .then(function () { return ctx.sbPostQ('sessions', { n: 3 }); })
    .then(function () { ctx.navigator.onLine = true; return ctx.flushOfflineQueue(); })
    .then(function () { return ctx.offlineQueueAll(); })
    .then(function (rest) {
      assert.strictEqual(rest.length, 2, 'items verloren toen het netwerk wegviel');
      assert.deepStrictEqual(rest.map(function (r) { return r.body.n; }), [2, 3]);
    });
});

tAsync('B9: een geslaagde sync meldt dat aan de sporter', function () {
  var ctx = queueZandbak({ online: false });
  return ctx.sbPostQ('sessions', { n: 1 })
    .then(function () { ctx.navigator.onLine = true; return ctx.flushOfflineQueue(); })
    .then(function () {
      assert.ok((ctx._toasts || []).some(function (m) { return m.indexOf('gesynchroniseerd') >= 0; }),
        'geen bevestiging na een geslaagde sync');
    });
});

tAsync('B10: een lege wachtrij doet niets en meldt niets', function () {
  var ctx = queueZandbak();
  return ctx.flushOfflineQueue().then(function () {
    assert.strictEqual(ctx._verzoeken.length, 0);
    assert.strictEqual((ctx._toasts || []).length, 0, 'onterechte melding bij een lege wachtrij');
  });
});

tAsync('B11: de badge wordt bijgewerkt zodra er iets in de wachtrij komt', function () {
  var ctx = queueZandbak({ online: false });
  return ctx.sbPostQ('sessions', { n: 1 }).then(function () {
    assert.ok(ctx._badge > 0, 'de offline-badge wordt niet bijgewerkt');
  });
});

tAsync('B12: de afronding van een training-instance overleeft offline', function () {
  /* Fase 2, nieuw in v4.47.0: completeTrainingInstance loopt via sbPatchQ. Zonder
     verbinding mag die afronding niet verdampen — anders staat de instance na
     terugkomst alsnog voor altijd op 'active'. */
  var ctx = queueZandbak({ online: false });
  return ctx.sbPatchQ('training_instances', 'id=eq.i1', { status: 'completed', completed_at: 'x' })
    .then(function () { return ctx.offlineQueueAll(); })
    .then(function (items) {
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].table, 'training_instances');
      assert.strictEqual(JSON.parse(JSON.stringify(items[0].body)).status, 'completed');
    });
});

/* ══ C. SYNCTRIGGERS ═══════════════════════════════════════════════════════ */
console.log('\nC. Synctriggers');

t('C1: er wordt gesynchroniseerd bij online komen', function () {
  assert.ok(/addEventListener\('online',\s*flushOfflineQueue\)/.test(HTML),
    'geen sync bij het online-event');
});

t('C2: terugkeer naar de app valideert eerst de sessie en synchroniseert daarna', function () {
  /* Aangescherpt in RC0. De oude vorm keek alleen of flushOfflineQueue() binnen 120
     tekens na 'visibilitychange' stond — een afstandsmaat, geen gedrag. Op Android is
     juist de VOLGORDE bepalend: komt de app na uren terug, dan is het access-token
     verlopen en loopt een directe flush op 401 stuk. De sessie moet dus eerst worden
     gevalideerd. Deze test leest het volledige handlerblok en eist beide stappen. */
  var i = HTML.indexOf("addEventListener('visibilitychange'");
  assert.ok(i > 0, 'geen visibilitychange-handler');
  var blok = HTML.slice(i, HTML.indexOf('});', i) + 3);
  assert.ok(/flushOfflineQueue\(\)/.test(blok), 'geen sync bij visibilitychange');
  assert.ok(/ensureValidSession\(\)/.test(blok),
    'de sessie wordt niet gevalideerd voordat er gesynchroniseerd wordt');
  assert.ok(blok.indexOf('ensureValidSession') < blok.indexOf('flushOfflineQueue'),
    'flush gebeurt vóór de sessiecontrole — dan loopt elk item op 401 stuk');
});

t('C3: er wordt gesynchroniseerd bij opstart', function () {
  var voorkomens = (HTML.match(/flushOfflineQueue\(\)/g) || []).length;
  assert.ok(voorkomens >= 2, 'te weinig synctriggers: ' + voorkomens);
});

t('C4: er is een zichtbare wachtrij voor de sporter', function () {
  assert.ok(HTML.indexOf('id="m-offline-queue"') > 0, 'geen wachtrij-scherm');
  assert.ok(HTML.indexOf('function updateOfflineBadge') > 0, 'geen offline-badge');
});

/* ══ D. STATUSWAARDEN VAN TRAINING_INSTANCES ═══════════════════════════════
 * Aanleiding: de eerste versie van migratie_v446.sql gebruikte 'abandoned'. Die waarde
 * bestaat niet — training_instances_status_check staat alleen 'active', 'completed' en
 * 'aborted' toe — waarop de migratie afbrak met 23514. De fout was te voorkomen door
 * bij het schrijven niet alleen de kolommen maar ook de constraints op te vragen.
 * Deze tests leggen het toegestane vocabulaire vast en controleren dat zowel de app als
 * de migraties zich eraan houden, zodat dit niet stilzwijgend opnieuw kan gebeuren.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log('\nD. Statuswaarden training_instances');

/* Exact de waarden uit training_instances_status_check in Supabase. Wijzigt de
   constraint, dan hoort deze lijst in dezelfde wijziging mee te veranderen. */
var INSTANCE_STATUS = ['active', 'completed', 'aborted'];

t('D1: de app schrijft alleen toegestane statuswaarden', function () {
  var blok = HTML.slice(HTML.indexOf('async function completeTrainingInstance'),
                        HTML.indexOf('async function completeTrainingInstance') + 600);
  var gevonden = (blok.match(/status\s*:\s*'([a-z_]+)'/g) || [])
    .map(function (m) { return m.replace(/.*'([a-z_]+)'.*/, '$1'); });
  assert.ok(gevonden.length > 0, 'completeTrainingInstance zet geen status');
  gevonden.forEach(function (v) {
    assert.ok(INSTANCE_STATUS.indexOf(v) >= 0,
      'de app schrijft status "' + v + '", die de databaseconstraint niet toestaat');
  });
});

t('D2: geen enkele migratie gebruikt een niet-toegestane statuswaarde', function () {
  var dir = path.join(__dirname, '..');
  var migraties = fs.readdirSync(dir).filter(function (f) { return /^migratie_v\d+\.sql$/.test(f); });
  assert.ok(migraties.length > 0, 'geen migratiebestanden gevonden');
  migraties.forEach(function (f) {
    var sql = fs.readFileSync(path.join(dir, f), 'utf8');
    if (sql.indexOf('training_instances') < 0) return;
    /* Alleen echte SQL-regels; commentaarregels mogen de fout juist beschrijven. */
    sql.split('\n').forEach(function (regel, i) {
      if (regel.replace(/^\s+/, '').indexOf('--') === 0) return;
      var m = regel.match(/status\s*=\s*'([a-z_]+)'/);
      if (!m) return;
      assert.ok(INSTANCE_STATUS.indexOf(m[1]) >= 0,
        f + ' regel ' + (i + 1) + ' zet status "' + m[1] + '", niet toegestaan door de constraint');
    });
  });
});

t('D3: de migratie controleert zelf eerst welke waarden zijn toegestaan', function () {
  var sql = fs.readFileSync(path.join(__dirname, '..', 'migratie_v446.sql'), 'utf8');
  assert.ok(sql.indexOf('training_instances_status_check') > 0,
    'de migratie leest de constraint niet uit vóór het wijzigen');
  assert.ok(/\bbegin;[\s\S]*\bcommit;/.test(sql),
    'de migratie draait niet als één alles-of-niets-transactie');
});

t('D4: de migratie verwijdert niets', function () {
  var sql = fs.readFileSync(path.join(__dirname, '..', 'migratie_v446.sql'), 'utf8');
  sql.split('\n').forEach(function (regel, i) {
    if (regel.replace(/^\s+/, '').indexOf('--') === 0) return;
    assert.ok(!/\b(delete\s+from|drop\s+table|truncate)\b/i.test(regel),
      'destructieve opdracht op regel ' + (i + 1) + ': ' + regel.trim());
  });
});

/* ── uitvoeren en afronden ─────────────────────────────────────────────────── */
(function volgende(i) {
  if (i >= wachtend.length) {
    console.log('\n' + '='.repeat(56));
    console.log('fFase2.test.js — ' + n + ' asserts geslaagd');
    return;
  }
  var w = wachtend[i];
  Promise.resolve().then(w.fn).then(function () {
    n++; volgende(i + 1);
  }).catch(function (e) {
    console.error('\n✗ ' + w.naam + '\n  ' + (e && e.message));
    process.exit(1);
  });
})(0);
