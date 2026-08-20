/* fQuotaHervatten.test.js — v4.50.0: de twee P0's uit Master Sprint A
 *
 *  A1 — De AI-proxy had geen grens op het AANTAL aanroepen. Registratie staat open, dus
 *       elk zelfgemaakt account kon onbeperkt verzoeken door de ANTHROPIC_API_KEY van de
 *       eigenaar duwen. Model, tokenplafond en payload-omvang waren sinds v4.49.0 wél
 *       begrensd; het aantal niet.
 *
 *  A2 — GWUI.quit() belooft "je kunt later hervatten". De sessie werd ook echt bewaard en
 *       GWUI.launch() kon hem hervatten, maar de enige knop die launch() aanriep stond in
 *       het DASH-blok, dat rendert in #home-dash — een element met display:none. De
 *       belofte was daarmee aantoonbaar onbereikbaar.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var wortel = path.join(__dirname, '..');
var HTML = fs.readFileSync(path.join(wortel, 'index.html'), 'utf8');
var COACH = fs.readFileSync(path.join(wortel, 'netlify', 'functions', 'coach.js'), 'utf8');
var SQL = fs.readFileSync(path.join(wortel, 'migratie_v450.sql'), 'utf8');

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

/* ── Zandbak voor de Netlify-functie ───────────────────────────────────────
 * De handler wordt echt uitgevoerd, met een bestuurbare fetch. Zo testen we het
 * werkelijke gedrag en niet een parafrase ervan. */
function coachZandbak(opts) {
  opts = opts || {};
  var calls = [];
  var origFetch = global.fetch;
  var origEnv = {};
  ['SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'AI_QUOTA_PER_DAG', 'AI_QUOTA_PER_MAAND'].forEach(function (k) {
    origEnv[k] = process.env[k];
  });
  process.env.ANTHROPIC_API_KEY = 'test-anthropic';
  if (opts.serviceKey === false) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
  if (opts.limietDag != null) process.env.AI_QUOTA_PER_DAG = String(opts.limietDag);
  else delete process.env.AI_QUOTA_PER_DAG;
  if (opts.limietMaand != null) process.env.AI_QUOTA_PER_MAAND = String(opts.limietMaand);
  else delete process.env.AI_QUOTA_PER_MAAND;

  global.fetch = function (url, init) {
    calls.push({ url: String(url), body: init && init.body });
    if (String(url).indexOf('/auth/v1/user') >= 0) {
      return Promise.resolve({ ok: opts.authOk !== false, json: function () { return Promise.resolve({ id: 'user-1' }); } });
    }
    if (String(url).indexOf('rpc/ai_usage_registreer') >= 0) {
      if (opts.rpcStatus && opts.rpcStatus !== 200) return Promise.resolve({ ok: false, status: opts.rpcStatus, json: function () { return Promise.resolve({}); } });
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve([opts.quotum || { toegestaan: true, vandaag: 1, maand: 1, reden: 'ok' }]); } });
    }
    if (String(url).indexOf('rpc/ai_usage_tokens') >= 0) {
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve(null); } });
    }
    if (String(url).indexOf('api.anthropic.com') >= 0) {
      return Promise.resolve({ status: 200, json: function () {
        return Promise.resolve({ content: [{ text: 'ok' }], usage: { input_tokens: 1200, output_tokens: 300 } }); } });
    }
    return Promise.resolve({ ok: false, status: 404, json: function () { return Promise.resolve({}); }, text: function () { return Promise.resolve(''); } });
  };

  delete require.cache[require.resolve(path.join(wortel, 'netlify', 'functions', 'coach.js'))];
  delete require.cache[require.resolve(path.join(wortel, 'netlify', 'functions', '_cors.js'))];
  var mod = require(path.join(wortel, 'netlify', 'functions', 'coach.js'));

  return {
    calls: calls,
    aanroep: function () {
      return mod.handler({
        httpMethod: 'POST',
        headers: { authorization: 'Bearer jwt' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 500, system: 's', messages: [{ role: 'user', content: 'hoi' }] })
      });
    },
    herstel: function () {
      global.fetch = origFetch;
      Object.keys(origEnv).forEach(function (k) {
        if (origEnv[k] === undefined) delete process.env[k]; else process.env[k] = origEnv[k];
      });
    }
  };
}

/* ══ A. HET QUOTUM STAAT SERVER-SIDE ═══════════════════════════════════════ */
console.log('\nA. AI-quotum (A1)');

t('A1: de migratie legt tabel, RLS en twee functies vast', function () {
  assert.ok(/create table if not exists public\.ai_usage/.test(SQL), 'geen tabel');
  assert.ok(/alter table public\.ai_usage enable row level security/.test(SQL), 'RLS staat niet aan');
  assert.ok(!/create policy/i.test(SQL),
    'een policy zou de tabel voor authenticated openzetten; alleen service_role hoort erbij te kunnen');
  assert.ok(/function public\.ai_usage_registreer/.test(SQL) && /function public\.ai_usage_tokens/.test(SQL));
});

t('A2: beide functies zijn afgeschermd zoals migratie_v447 voorschrijft', function () {
  assert.ok(/set search_path = public/.test(SQL), 'geen vaste search_path op een SECURITY DEFINER-functie');
  /* 'public' MOET in de revoke staan. PostgreSQL geeft een nieuwe functie standaard EXECUTE
     aan de pseudorol PUBLIC en rechten zijn additief: alleen anon en authenticated intrekken
     laat die grant staan. De anon-sleutel staat in index.html, dus dan kan een willekeurige
     bezoeker via /rest/v1/rpc de teller van een ánder account volschrijven en diens coach de
     rest van de dag blokkeren. Deze test faalde terecht toen 'public' ontbrak. */
  ['ai_usage_registreer', 'ai_usage_tokens'].forEach(function (fn) {
    var m = SQL.match(new RegExp('revoke execute on function public\\.' + fn + '[^;]*;'));
    assert.ok(m, 'geen revoke gevonden voor ' + fn);
    ['public', 'anon', 'authenticated'].forEach(function (rol) {
      assert.ok(new RegExp('(from|,)\\s*' + rol + '\\b').test(m[0]),
        fn + ' blijft aanroepbaar door de rol ' + rol + ' — dan is het quotum omzeilbaar');
    });
  });
});

t('A3: verhogen en toetsen gebeurt in één statement', function () {
  /* Twee gelijktijdige verzoeken die eerst lezen en daarna verhogen lezen dezelfde stand
     en laten allebei door — precies de race die een quotum waardeloos maakt. */
  assert.ok(/insert into public\.ai_usage[\s\S]*?on conflict \(user_id, dag\) do update[\s\S]*?returning/.test(SQL),
    'de verhoging is geen atomaire upsert met returning');
});

t('A4: een afgewezen poging telt mee', function () {
  var fn = SQL.slice(SQL.indexOf('function public.ai_usage_registreer'), SQL.indexOf('function public.ai_usage_tokens'));
  var iInsert = fn.indexOf('insert into public.ai_usage');
  var iToets = fn.indexOf('p_limiet_dag is not null');
  assert.ok(iInsert > 0 && iToets > iInsert,
    'de toets staat vóór de verhoging — dan kan een aanvaller gratis blijven proberen');
});

t('A5: de limieten zijn configureerbaar en de default is gedocumenteerd', function () {
  assert.ok(/AI_QUOTA_PER_DAG/.test(COACH), 'de daglimiet is niet configureerbaar');
  assert.ok(/AI_QUOTA_PER_MAAND/.test(COACH), 'de maandlimiet is niet configureerbaar');
  assert.ok(/process\.env\[naam\]/.test(COACH), 'de grens wordt niet uit de omgeving gelezen');
  assert.ok(/grens\('AI_QUOTA_PER_DAG', 60\)/.test(COACH) && /grens\('AI_QUOTA_PER_MAAND', 900\)/.test(COACH),
    'de defaults zijn gewijzigd zonder de test bij te werken');
  /* `parseInt(x,10) || standaard` maakte van "0" — bewust alles blokkeren — stilzwijgend 60,
     en van een typefout net zo goed. Nul moet een geldige keuze zijn. */
  assert.ok(!/parseInt\(process\.env\.AI_QUOTA/.test(COACH),
    'een limiet van 0 of een typefout valt stilzwijgend terug op de standaard');
  assert.ok(/expliciet productbesluit/.test(COACH), 'de gekozen default is niet als productbesluit gedocumenteerd');
});

t('A6: de identiteit komt uit de geverifieerde JWT, nooit uit de body', function () {
  assert.ok(/userId = user\.id;/.test(COACH), 'de gebruiker wordt niet uit het geverifieerde antwoord gehaald');
  assert.ok(!/payload\.user|body\.user_id|payload\.user_id/.test(COACH),
    'de gebruikers-id komt (mede) uit de request-body — dat is omzeilbaar');
  var iAuth = COACH.indexOf('/auth/v1/user'), iQuota = COACH.indexOf('ai_usage_registreer');
  assert.ok(iAuth > 0 && iQuota > iAuth, 'het quotum wordt geteld vóórdat de sessie is geverifieerd');
});

t('A7: er worden geen prompts of antwoorden opgeslagen', function () {
  assert.ok(!/system|messages|content/.test(SQL.replace(/--[^\n]*/g, '')),
    'er staat inhoud in het gebruiksschema; alleen tellers horen daar');
  assert.ok(/Geen prompts, geen antwoorden, geen inhoud/.test(SQL));
});

tAsync('A8: een normale aanvraag gaat door en telt mee', function () {
  var z = coachZandbak({});
  return z.aanroep().then(function (res) {
    assert.strictEqual(res.statusCode, 200, 'een normale aanvraag werd geblokkeerd');
    assert.ok(z.calls.some(function (c) { return c.url.indexOf('ai_usage_registreer') >= 0; }), 'het quotum is niet geteld');
    assert.ok(z.calls.some(function (c) { return c.url.indexOf('api.anthropic.com') >= 0; }), 'de AI is niet aangeroepen');
  }).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});

tAsync('A9: bij overschrijding volgt 429 en wordt de AI NIET aangeroepen', function () {
  var z = coachZandbak({ quotum: { toegestaan: false, vandaag: 61, maand: 61, reden: 'daglimiet' } });
  return z.aanroep().then(function (res) {
    assert.strictEqual(res.statusCode, 429, 'een overschrijding werd gewoon doorgelaten');
    assert.ok(!z.calls.some(function (c) { return c.url.indexOf('api.anthropic.com') >= 0; }),
      'de AI is tóch aangeroepen — dan kost een geweigerd verzoek nog steeds geld');
    var body = JSON.parse(res.body);
    assert.ok(body.error && /vandaag/.test(body.error.message), 'de melding legt niet uit wat er aan de hand is');
    assert.ok(res.headers['Retry-After'], 'geen Retry-After bij een 429');
  }).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});

tAsync('A10: de maandlimiet werkt apart van de daglimiet', function () {
  var z = coachZandbak({ quotum: { toegestaan: false, vandaag: 3, maand: 901, reden: 'maandlimiet' } });
  return z.aanroep().then(function (res) {
    assert.strictEqual(res.statusCode, 429);
    assert.ok(/maand/.test(JSON.parse(res.body).error.message));
  }).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});

tAsync('A11: zonder geldige sessie gebeurt er niets — ook geen telling', function () {
  var z = coachZandbak({ authOk: false });
  return z.aanroep().then(function (res) {
    assert.strictEqual(res.statusCode, 401);
    assert.ok(!z.calls.some(function (c) { return c.url.indexOf('ai_usage_registreer') >= 0; }),
      'er wordt geteld op een gebruiker die niet is vastgesteld');
  }).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});

tAsync('A12: is de teller onbereikbaar, dan gaat het verzoek door (fail-open, met opzet)', function () {
  /* Fail-closed zou betekenen dat één databasehapering de coach voor iedereen uitschakelt,
     en die storing is niets wat een aanvaller kan veroorzaken. */
  var z = coachZandbak({ rpcStatus: 404 });
  return z.aanroep().then(function (res) {
    assert.strictEqual(res.statusCode, 200, 'een ontbrekende migratie zet de hele coach uit');
  }).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});

tAsync('A13: het werkelijke tokenverbruik wordt bijgeschreven', function () {
  var z = coachZandbak({});
  return z.aanroep().then(function () {
    var c = z.calls.filter(function (x) { return x.url.indexOf('ai_usage_tokens') >= 0; })[0];
    assert.ok(c, 'het tokenverbruik wordt niet vastgelegd');
    var b = JSON.parse(c.body);
    assert.strictEqual(b.p_in, 1200);
    assert.strictEqual(b.p_uit, 300);
  }).then(function () { z.herstel(); }, function (e) { z.herstel(); throw e; });
});

t('A14: de client toont de quotummelding in plaats van "er ging iets mis"', function () {
  assert.ok(HTML.indexOf('res.status===429') >= 0, 'een 429 wordt als storing gepresenteerd');
});

/* ══ B. HERVATTEN VAN EEN GEPAUZEERDE BEGELEIDE TRAINING ═══════════════════ */
console.log('\nB. Hervatten (A2)');

t('B1: de bewaarde sessie is read-only in te zien', function () {
  assert.ok(/function peekActive\(\)/.test(HTML), 'GW.peekActive ontbreekt');
  assert.ok(/peekActive:peekActive/.test(HTML), 'peekActive wordt niet geëxporteerd');
  var fn = HTML.match(/function peekActive\(\)\{[\s\S]*?\n  \}/)[0];
  assert.ok(fn.indexOf('st.active=') < 0, 'peekActive muteert de sessie — een renderfunctie hoort dat niet te doen');
});

t('B2: er staat een hervat-kaart op Home, buiten het verborgen dashboard', function () {
  assert.ok(HTML.indexOf('<div id="home-guided-resume"></div>') >= 0, 'het element ontbreekt');
  var i = HTML.indexOf('id="home-guided-resume"');
  var blok = HTML.slice(i - 400, i);
  assert.ok(!/display:none/.test(HTML.slice(i, i + 80)), 'de kaart staat zelf op display:none');
  assert.ok(/function renderGuidedResumeCard\(\)/.test(HTML), 'de renderfunctie ontbreekt');
});

t('B3: de kaart wordt bij elke Home-render bijgewerkt', function () {
  /* renderV43Home is de Home-renderer die ook het plan tekent, en wordt door refreshHome
     aangeroepen. Daar hoort de hervat-kaart dus bij — niet in een los pad. */
  var fn = pak('renderV43Home');
  assert.ok(fn.indexOf('renderGuidedResumeCard()') >= 0, 'de Home-render vernieuwt de hervat-kaart niet');
  var iResume = fn.indexOf('renderGuidedResumeCard()'), iPlan = fn.indexOf("v43RenderPlan('home-plan'");
  assert.ok(iPlan > 0 && iResume < iPlan, 'een onafgeronde training hoort vóór de volgende geplande te staan');
  assert.ok(pak('refreshHome').indexOf('renderV43Home(') >= 0, 'refreshHome roept de Home-renderer niet aan');
});

t('B4: hervatten gaat via de bestaande route, er komt geen tweede pad bij', function () {
  var fn = HTML.match(/function renderGuidedResumeCard\(\)\{[\s\S]*?\n\}/)[0];
  assert.ok(fn.indexOf('GWUI.launch()') >= 0, 'de kaart start een eigen hervat-implementatie');
  assert.ok(fn.indexOf('GW.peekActive()') >= 0, 'de kaart leest de sessie niet via de engine');
});

t('B5: zonder openstaande sessie is de kaart leeg', function () {
  var fn = HTML.match(/function renderGuidedResumeCard\(\)\{[\s\S]*?\n\}/)[0];
  assert.ok(/if\(!a\)\{ el\.innerHTML=''; return; \}/.test(fn),
    'een afgeronde of geannuleerde sessie kan blijven staan als "actief"');
});

t('B6: weggooien vraagt bevestiging en benoemt wat er verloren gaat', function () {
  var fn = HTML.match(/async function verwijderGepauzeerdeTraining\(\)\{[\s\S]*?\n\}/)[0];
  assert.ok(fn.indexOf('confirmModal') >= 0, 'weggooien gebeurt zonder bevestiging');
  assert.ok(fn.indexOf('gelogdeSets') >= 0 && fn.indexOf('gaan verloren') >= 0,
    'de sporter hoort te weten hoeveel gelogde sets hij weggooit — een begeleide sessie schrijft pas bij finish() naar sessions');
  assert.ok(fn.indexOf('GW.abort()') >= 0);
});

t('B7: de pauzeermelding zegt waar je hervat', function () {
  assert.ok(HTML.indexOf('je vindt hem terug op Home') >= 0,
    'de melding belooft hervatten zonder te zeggen waar dat kan');
});

t('B8: de bewaarde sessie is gebruiker-gescoped', function () {
  var lijst = HTML.match(/const PERSONAL_CACHE_KEYS=\[[\s\S]*?\];/)[0];
  assert.ok(lijst.indexOf("'tk_gw_active'") >= 0,
    'de begeleide sessie blijft bij een eigenaarswissel staan en kan door de volgende sporter hervat worden');
});

t('B9: peekActive telt gelogde sets zonder iets te verzinnen', function () {
  var ctx = { lsGet: function () { return {
      items: [{ naam: 'Squat', sets: [{ done: true, kg: 100, reps: 5 }, { done: true, kg: 100, reps: 5 }] },
              { naam: 'Bench', sets: [{}] }],
      gi: 1, phase: 'exercise', startedAt: 1, trainingType: 'guided' }; } };
  vm.createContext(ctx);
  vm.runInContext(HTML.match(/function peekActive\(\)\{[\s\S]*?\n  \}/)[0] + '\nvar uit=peekActive();', ctx);
  assert.strictEqual(ctx.uit.gelogdeSets, 2, 'lege sets worden meegeteld als gelogd');
  assert.strictEqual(ctx.uit.oefeningen, 2);
  assert.strictEqual(ctx.uit.oefeningNr, 2);
  assert.strictEqual(ctx.uit.naam, 'Bench');
});

t('B10: een afgeronde sessie levert geen kaart op', function () {
  var ctx = { lsGet: function () { return { items: [{ naam: 'x', sets: [] }], gi: 0, phase: 'done' }; } };
  vm.createContext(ctx);
  vm.runInContext(HTML.match(/function peekActive\(\)\{[\s\S]*?\n  \}/)[0] + '\nvar uit=peekActive();', ctx);
  assert.strictEqual(ctx.uit, null);
});

/* ══ SLOT ═══════════════════════════════════════════════════════════════════ */
(function volgende(i) {
  if (i >= wachtend.length) {
    console.log('\n========================================================');
    console.log('RESULTAAT: ' + geslaagd + ' geslaagd, ' + mislukt + ' mislukt');
    if (mislukt) { console.log('❌ Quota/hervatten niet groen.'); process.exit(1); }
    console.log('✅ Quota en hervatten groen.');
    return;
  }
  var w = wachtend[i];
  Promise.resolve().then(w.fn).then(
    function () { geslaagd++; console.log('  ✓ ' + w.naam); volgende(i + 1); },
    function (e) { mislukt++; console.log('  ✗ ' + w.naam + ' :: ' + (e && e.message)); volgende(i + 1); }
  );
})(0);
