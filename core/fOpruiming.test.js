/* fOpruiming.test.js — v4.50.0: accountverwijdering en de dagelijkse opruiming
 *
 * TWEE BEVINDINGEN (C4 uit het overdrachtsdocument):
 *
 *  1. delete-account.js en cleanup-unverified-accounts.js hadden allebei hun eigen kopie
 *     van de tabellenlijst, met in de code de aantekening "bij wijzigingen aan de een, ook
 *     de ander nalopen". Dat is gegaan zoals zulke aantekeningen gaan: delete-account
 *     groeide naar 30 tabellen, cleanup bleef op 16 staan. Onder de veertien die ontbraken
 *     zat wearable_connections — de tabel met het OAuth access- én refresh-token. Een
 *     niet-bevestigd account werd dus opgeruimd mét zijn tokens erin.
 *
 *  2. cleanup-unverified-accounts.js had geen enkele toegangscontrole. Het pad is
 *     raadbaar en elke POST startte een verwijderronde.
 *
 * Deze suite bewaakt allebei, én bewaakt dat de twee functies niet opnieuw uit elkaar
 * kunnen lopen.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var wortel = path.join(__dirname, '..');
var fnDir = path.join(wortel, 'netlify', 'functions');
var DEL = fs.readFileSync(path.join(fnDir, 'delete-account.js'), 'utf8');
var CLEAN = fs.readFileSync(path.join(fnDir, 'cleanup-unverified-accounts.js'), 'utf8');
var UD = require(path.join(fnDir, '_userData.js'));

var geslaagd = 0, mislukt = 0, wachtend = [];
function t(naam, fn) {
  try { fn(); geslaagd++; console.log('  ✓ ' + naam); }
  catch (e) { mislukt++; console.log('  ✗ ' + naam + ' :: ' + (e && e.message)); }
}
function tAsync(naam, fn) { wachtend.push({ naam: naam, fn: fn }); }

/* ══ A. ÉÉN LIJST, TWEE GEBRUIKERS ═════════════════════════════════════════ */
console.log('\nA. Eén gedeelde opruimroutine');

t('A1: beide functies gebruiken dezelfde module', function () {
  assert.ok(DEL.indexOf("require('./_userData.js')") >= 0, 'delete-account heeft nog een eigen lijst');
  assert.ok(CLEAN.indexOf("require('./_userData.js')") >= 0, 'cleanup heeft nog een eigen lijst');
  assert.ok(DEL.indexOf('verwijderGebruikersdata(supabaseUrl, serviceKey, userId)') >= 0);
  assert.ok(CLEAN.indexOf('verwijderGebruikersdata(supabaseUrl, serviceKey, u.id)') >= 0);
});

t('A2: geen van beide houdt nog een eigen tabellenlijst bij', function () {
  assert.ok(!/const USER_DATA_TABLES = \[/.test(DEL), 'delete-account definieert opnieuw een lijst');
  assert.ok(!/const USER_DATA_TABLES = \[/.test(CLEAN), 'cleanup definieert opnieuw een lijst');
});

t('A3: de gevoelige tabellen staan er allemaal in', function () {
  ['wearable_connections', 'wearable_oauth_state', 'common_data_points', 'external_records',
   'chat_history', 'hrv_log', 'sessions', 'atleet_profiel', 'training_context',
   'usage_log', 'ai_usage'].forEach(function (tabel) {
    assert.ok(UD.USER_DATA_TABLES.indexOf(tabel) >= 0, tabel + ' ontbreekt in de opruimlijst');
  });
});

t('A4: de nieuwe quotumtabel wordt meeverwijderd', function () {
  /* ai_usage is in deze versie toegevoegd (migratie_v450). Zonder deze regel blijven
     gebruikstellers achter na het verwijderen van een account. */
  assert.ok(UD.USER_DATA_TABLES.indexOf('ai_usage') >= 0);
});

t('A5: de volgorde respecteert de verwijzingen tussen tabellen', function () {
  var i = function (n) { return UD.USER_DATA_TABLES.indexOf(n); };
  assert.ok(i('external_records') < i('external_connections'), 'external_records verwijst naar external_connections');
  assert.ok(i('program_block_exercises') < i('program_blocks'));
  assert.ok(i('custom_training_exercises') < i('custom_trainings'));
});

/* ══ B. DE ROUTINE ZELF ════════════════════════════════════════════════════ */
console.log('\nB. verwijderGebruikersdata');

function nepFetch(faalOp) {
  var calls = [];
  global.fetch = function (url, init) {
    calls.push({ url: String(url), method: init && init.method });
    var ok = !(faalOp && String(url).indexOf(faalOp) >= 0);
    return Promise.resolve({ ok: ok, status: ok ? 204 : 500, text: function () { return Promise.resolve(''); } });
  };
  return calls;
}

tAsync('B1: alle tabellen, beide deelrichtingen en de bijzondere gevallen worden geraakt', function () {
  var origFetch = global.fetch;
  var calls = nepFetch(null);
  return UD.verwijderGebruikersdata('https://x.supabase.co', 'key', 'u-1').then(function (mislukt) {
    assert.deepStrictEqual(mislukt, [], 'er wordt een mislukking gemeld terwijl alles slaagde');
    var urls = calls.map(function (c) { return c.url; }).join('\n');
    UD.USER_DATA_TABLES.forEach(function (tabel) {
      assert.ok(urls.indexOf('/rest/v1/' + tabel + '?user_id=eq.u-1') >= 0, tabel + ' is niet opgeruimd');
    });
    assert.ok(urls.indexOf('content_shares?shared_with=eq.u-1') >= 0, 'ontvangen deelrecords blijven staan');
    assert.ok(urls.indexOf('content_shares?shared_by=eq.u-1') >= 0, 'gedeelde deelrecords blijven als wees achter');
    assert.ok(urls.indexOf('exercises?created_by=eq.u-1&scope=eq.personal') >= 0, 'persoonlijke oefeningen blijven staan');
    assert.ok(urls.indexOf('users?id=eq.u-1') >= 0, 'het spooklid in de Team-lijst blijft staan');
    calls.forEach(function (c) { assert.strictEqual(c.method, 'DELETE'); });
  }).then(function () { global.fetch = origFetch; }, function (e) { global.fetch = origFetch; throw e; });
});

tAsync('B2: gedeelde gym-inrichting van anderen blijft bestaan', function () {
  var origFetch = global.fetch;
  var calls = nepFetch(null);
  return UD.verwijderGebruikersdata('https://x.supabase.co', 'key', 'u-1').then(function () {
    ['equipment_catalog', 'exercise_equipment'].forEach(function (tabel) {
      var hit = calls.filter(function (c) { return c.url.indexOf('/' + tabel + '?') >= 0; })[0];
      assert.ok(hit, tabel + ' wordt niet opgeruimd');
      assert.ok(hit.url.indexOf('gym_id=is.null') >= 0,
        tabel + ' wordt zonder gym-filter verwijderd — dan verdwijnt de inrichting van de andere leden');
    });
  }).then(function () { global.fetch = origFetch; }, function (e) { global.fetch = origFetch; throw e; });
});

tAsync('B3: een mislukte tabel wordt gemeld in plaats van verzwegen', function () {
  var origFetch = global.fetch;
  nepFetch('hrv_log');
  return UD.verwijderGebruikersdata('https://x.supabase.co', 'key', 'u-1').then(function (mislukt) {
    assert.ok(mislukt.indexOf('hrv_log') >= 0, 'een half verwijderd account meldt zichzelf als volledig verwijderd');
  }).then(function () { global.fetch = origFetch; }, function (e) { global.fetch = origFetch; throw e; });
});

tAsync('B4: één mislukte tabel stopt de rest niet', function () {
  var origFetch = global.fetch;
  var calls = nepFetch('program_block_exercises');
  return UD.verwijderGebruikersdata('https://x.supabase.co', 'key', 'u-1').then(function (mislukt) {
    assert.strictEqual(mislukt.length, 1);
    assert.ok(calls.length > UD.USER_DATA_TABLES.length, 'de opruiming is halverwege gestopt');
  }).then(function () { global.fetch = origFetch; }, function (e) { global.fetch = origFetch; throw e; });
});

t('B5: de gebruikers-id wordt ge-encodeerd in de URL', function () {
  var src = fs.readFileSync(path.join(fnDir, '_userData.js'), 'utf8');
  assert.ok(src.indexOf('encodeURIComponent(userId)') >= 0,
    'een niet-geëncodeerde id kan de query verminken');
});

/* ══ C. WIE MAG DE OPRUIMING STARTEN ═══════════════════════════════════════ */
console.log('\nC. Toegang tot de dagelijkse opruiming');

function cleanZandbak(env) {
  var orig = { CLEANUP_SECRET: process.env.CLEANUP_SECRET, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
  var origFetch = global.fetch;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  if (env && env.secret) process.env.CLEANUP_SECRET = env.secret; else delete process.env.CLEANUP_SECRET;
  global.fetch = function () { return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve([]); }, text: function () { return Promise.resolve(''); } }); };
  delete require.cache[require.resolve(path.join(fnDir, 'cleanup-unverified-accounts.js'))];
  var mod = require(path.join(fnDir, 'cleanup-unverified-accounts.js'));
  return {
    handler: mod.handler,
    herstel: function () {
      global.fetch = origFetch;
      Object.keys(orig).forEach(function (k) { if (orig[k] === undefined) delete process.env[k]; else process.env[k] = orig[k]; });
    }
  };
}

tAsync('C1: met een ingesteld geheim wordt een kale POST geweigerd', function () {
  var z = cleanZandbak({ secret: 'geheim' });
  return z.handler({ httpMethod: 'POST', headers: {}, body: '{}' }).then(function (res) {
    assert.strictEqual(res.statusCode, 401, 'iedereen kan de verwijderronde nog starten');
  }).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});

tAsync('C2: met het juiste geheim mag het wel', function () {
  var z = cleanZandbak({ secret: 'geheim' });
  return z.handler({ httpMethod: 'POST', headers: { 'x-cleanup-secret': 'geheim' }, body: '{}' }).then(function (res) {
    assert.strictEqual(res.statusCode, 200);
  }).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});

tAsync('C3: de geplande aanroep van Netlify blijft altijd werken', function () {
  var z = cleanZandbak({ secret: 'geheim' });
  return z.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ next_run: '2026-08-20T00:00:00Z' }) })
    .then(function (res) {
      assert.strictEqual(res.statusCode, 200, 'de next_run-payload van een scheduled function wordt niet herkend');
    }).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});

tAsync('C3b: de payload wordt echt geparseerd, niet op tekst herkend', function () {
  /* Een substring-controle ("bevat de body ergens next_run?") zou betekenen dat elke body
     met dat woord erin de toegangscontrole opent. */
  var z = cleanZandbak({ secret: 'geheim' });
  var pogingen = ['next_run', '{"boodschap":"next_run"}', '{"next_run":"morgen"}',
                  '{"next_run":123}', 'zeg next_run tegen de server'];
  return pogingen.reduce(function (keten, body) {
    return keten.then(function () {
      return z.handler({ httpMethod: 'POST', headers: {}, body: body }).then(function (res) {
        assert.strictEqual(res.statusCode, 401, 'toegang met een nagebootste payload: ' + body);
      });
    });
  }, Promise.resolve()).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});

tAsync('C3c: een zelf meegestuurde x-nf-event-header is géén toegangsbewijs', function () {
  /* Die header is door elke client mee te sturen en staat niet in de documentatie van
     scheduled functions. Als toegangscontrole is dat geen slot maar een sticker. */
  var z = cleanZandbak({ secret: 'geheim' });
  return z.handler({ httpMethod: 'POST', headers: { 'x-nf-event': 'schedule' }, body: '{}' })
    .then(function (res) {
      assert.strictEqual(res.statusCode, 401, 'een zelf gezette header opent de verwijderronde');
    }).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});

tAsync('C4: zonder ingesteld geheim verandert er niets — een beveiliging mag geen werkende taak breken', function () {
  var z = cleanZandbak({});
  return z.handler({ httpMethod: 'POST', headers: {}, body: '{}' }).then(function (res) {
    assert.strictEqual(res.statusCode, 200,
      'het zetten van deze code zou de dagelijkse opruiming stilzwijgend uitschakelen');
  }).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});
/* C5 kijkt naar de WAARDE van het geheim, niet naar de naam ervan. De waarschuwing
   "CLEANUP_SECRET niet ingesteld" noemt bewust de naam van de omgevingsvariabele, zodat de
   eigenaar weet wat hij moet zetten — dat is geen lek. Wat wél een lek zou zijn is de
   ingestelde of de meegestuurde waarde in de log. Daarom hier een echte draai met een
   onderschepte console in plaats van een regex op de naam. */
tAsync('C5: de waarde van het geheim belandt nooit in de log', function () {
  var z = cleanZandbak({ secret: 'ZEER-GEHEIM-123' });
  var regels = [];
  var origLog = console.log, origWarn = console.warn, origError = console.error;
  var vang = function () { regels.push(Array.prototype.slice.call(arguments).map(String).join(' ')); };
  console.log = vang; console.warn = vang; console.error = vang;
  var herstelConsole = function () { console.log = origLog; console.warn = origWarn; console.error = origError; };
  return z.handler({ httpMethod: 'POST', headers: { 'x-cleanup-secret': 'FOUTE-POGING-456' }, body: '{}' })
    .then(function () { return z.handler({ httpMethod: 'POST', headers: { 'x-nf-event': 'schedule' }, body: '{}' }); })
    .then(function () {
      herstelConsole();
      var alles = regels.join('\n');
      assert.ok(alles.indexOf('ZEER-GEHEIM-123') < 0, 'het ingestelde geheim belandt in de log');
      assert.ok(alles.indexOf('FOUTE-POGING-456') < 0, 'de meegestuurde poging belandt in de log');
      /* en statisch: de variabelen zelf worden nergens aan een console meegegeven */
      assert.ok(!/console\.[a-z]+\([^)]*\bgeheim\b/.test(CLEAN), 'het geheim wordt aan een console meegegeven');
      assert.ok(!/console\.[a-z]+\([^)]*\bmeegegeven\b/.test(CLEAN), 'de meegestuurde waarde wordt aan een console meegegeven');
    })
    .then(function () { z.herstel(); }, function (e) { herstelConsole(); z.herstel(); throw e; });
});

t('C6: delete-account houdt zijn eigen JWT-verificatie', function () {
  assert.ok(DEL.indexOf('/auth/v1/user') >= 0, 'de gebruiker wordt niet meer geverifieerd');
  assert.ok(!/body\.user_id|payload\.user_id/.test(DEL), 'de te verwijderen gebruiker komt uit de request-body');
});

/* ══ SLOT ═══════════════════════════════════════════════════════════════════ */
(function volgende(i) {
  if (i >= wachtend.length) {
    console.log('\n========================================================');
    console.log('RESULTAAT: ' + geslaagd + ' geslaagd, ' + mislukt + ' mislukt');
    if (mislukt) { console.log('❌ Opruiming niet groen.'); process.exit(1); }
    console.log('✅ Opruiming groen.');
    return;
  }
  var w = wachtend[i];
  Promise.resolve().then(w.fn).then(
    function () { geslaagd++; console.log('  ✓ ' + w.naam); volgende(i + 1); },
    function (e) { mislukt++; console.log('  ✗ ' + w.naam + ' :: ' + (e && e.message)); volgende(i + 1); }
  );
})(0);
