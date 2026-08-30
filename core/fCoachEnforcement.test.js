/* fCoachEnforcement.test.js — MS-F12-02 regressietest voor
 * netlify/functions/coach.js. Mockt global.fetch op basis van URL-patroon
 * (Supabase auth/user, REST-tabellen, RPC's, Anthropic) om server-side
 * entitlement/quota-enforcement te testen zonder echte netwerkaanroepen.
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

// Verwijder uit de module-cache tussen scenario's zodat elke test met een
// schone staat begint (coach.js zelf is stateless, maar dit voorkomt
// verrassingen als toekomstige wijzigingen module-level state toevoegen).
function loadHandler() {
  delete require.cache[require.resolve('../netlify/functions/coach.js')];
  return require('../netlify/functions/coach.js').handler;
}

function jsonRes(status, body) {
  return { ok: status >= 200 && status < 300, status: status, json: async () => body };
}

/* buildFetchMock(opts): opts = { validAuth, planKey, planStatus, expiresAt,
 * planFeatures, planQuota, quotaState (map feature_key->{aantal}),
 * anthropicOk, anthropicStatus }. Retourneert een fetch-mock functie plus
 * een `calls`-array voor assertions over wat daadwerkelijk aangeroepen is. */
function buildFetchMock(opts) {
  opts = opts || {};
  const calls = [];
  const quotaState = opts.quotaState || {};
  const mock = async function (url, init) {
    calls.push({ url: url, method: (init && init.method) || 'GET' });
    if (url.includes('/auth/v1/user')) {
      if (opts.validAuth === false) return jsonRes(401, { error: 'invalid' });
      return jsonRes(200, { id: opts.userId || 'U1' });
    }
    if (url.includes('/rest/v1/users?')) {
      return jsonRes(200, [{
        individual_plan_key: opts.planKey !== undefined ? opts.planKey : null,
        individual_plan_status: opts.planStatus !== undefined ? opts.planStatus : null,
        individual_plan_expires_at: opts.expiresAt !== undefined ? opts.expiresAt : null
      }]);
    }
    if (url.includes('/rest/v1/memberships?')) {
      return jsonRes(200, opts.memberships || []);
    }
    if (url.includes('/rest/v1/plan_features')) {
      return jsonRes(200, opts.planFeatures || []);
    }
    if (url.includes('/rest/v1/plan_feature_quota')) {
      return jsonRes(200, opts.planQuota || []);
    }
    if (url.includes('/rpc/check_and_increment_usage')) {
      const body = JSON.parse(init.body);
      const key = body.p_feature_key + '|' + body.p_periode;
      const huidig = (quotaState[key] || 0);
      if (body.p_quota === null || huidig < body.p_quota) {
        quotaState[key] = huidig + 1;
        return jsonRes(200, [{ toegestaan: true, huidig_gebruik: quotaState[key] }]);
      }
      return jsonRes(200, [{ toegestaan: false, huidig_gebruik: huidig }]);
    }
    if (url.includes('/rpc/decrement_usage')) {
      const body = JSON.parse(init.body);
      const key = body.p_feature_key + '|' + body.p_periode;
      quotaState[key] = Math.max((quotaState[key] || 0) - 1, 0);
      return jsonRes(200, quotaState[key]);
    }
    if (url.includes('api.anthropic.com')) {
      if (opts.anthropicOk === false) return jsonRes(opts.anthropicStatus || 500, { error: { message: 'upstream failure' } });
      return jsonRes(200, { content: [{ text: 'ok' }] });
    }
    throw new Error('Onverwachte fetch-aanroep in mock: ' + url);
  };
  mock.calls = calls;
  mock.quotaState = quotaState;
  return mock;
}

function buildEvent(body, opts) {
  opts = opts || {};
  return {
    httpMethod: 'POST',
    headers: opts.noAuth ? {} : { Authorization: 'Bearer test-jwt' },
    body: JSON.stringify(body)
  };
}

async function run() {
  // ---- A. Geen JWT -> 401 ----
  {
    global.fetch = buildFetchMock({});
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }, { noAuth: true }));
    ok(res.statusCode === 401, 'A1: geen JWT geeft 401');
  }

  // ---- B. Onbekend/ontbrekend requestType -> fail-closed ----
  {
    global.fetch = buildFetchMock({});
    const handler = loadHandler();
    const res = await handler(buildEvent({ system: 's', messages: [] }));
    ok(res.statusCode === 400, 'B1: ontbrekend requestType geeft 400 (fail-closed, niet een default-capability)');
    const res2 = await handler(buildEvent({ requestType: 'willekeurige_string', system: 's', messages: [] }));
    ok(res2.statusCode === 400, 'B2: onbekend requestType geeft 400');
  }

  // ---- C. intake_extract: geen entitlement/quota-check, altijd toegankelijk ----
  {
    global.fetch = buildFetchMock({ planKey: null, anthropicOk: true });
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'intake_extract', system: 's', messages: [{ role: 'user', content: 'x' }] }));
    ok(res.statusCode === 200, 'C1: intake_extract is toegankelijk zonder plan (fundamentele onboarding-stap)');
  }

  // ---- D. Free user binnen quota -> toegestaan ----
  {
    const mock = buildFetchMock({
      planKey: null,
      planFeatures: [{ plan_key: 'gratis', feature_key: 'ai_coach' }],
      planQuota: [{ plan_key: 'gratis', feature_key: 'ai_coach', quota_per_maand: 5 }],
      anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 's', messages: [{ role: 'user', content: 'x' }] }));
    ok(res.statusCode === 200, 'D1: free user binnen quota krijgt een geldig antwoord (200)');
  }

  // ---- E. Free user quota op -> 429 (commerciële fout, geen crash) ----
  {
    const mock = buildFetchMock({
      planKey: null,
      planFeatures: [{ plan_key: 'gratis', feature_key: 'ai_coach' }],
      planQuota: [{ plan_key: 'gratis', feature_key: 'ai_coach', quota_per_maand: 1 }],
      anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] })); // consumeert de enige beschikbare eenheid
    const res2 = await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }));
    ok(res2.statusCode === 429, 'E1: quota-uitputting geeft 429 met een duidelijke code');
    const body = JSON.parse(res2.body);
    ok(body.error.code === 'QUOTA_EXCEEDED', 'E2: het foutobject bevat de canonieke QUOTA_EXCEEDED-code');
  }

  // ---- F. Pro/unlimited -> toegestaan, geen quota-RPC-aanroep nodig ----
  {
    const mock = buildFetchMock({
      planKey: 'atleet_pro', planStatus: 'active',
      planFeatures: [{ plan_key: 'atleet_pro', feature_key: 'ai_coach' }],
      planQuota: [], // geen quota-rij = onbeperkt
      anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }));
    ok(res.statusCode === 200, 'F1: atleet_pro (onbeperkt) krijgt een geldig antwoord');
  }

  // ---- G. Expired pro -> valt terug op gratis (of weigering als gratis de feature niet heeft) ----
  {
    const mock = buildFetchMock({
      planKey: 'atleet_pro', planStatus: 'expired',
      planFeatures: [{ plan_key: 'atleet_pro', feature_key: 'ai_coach' }], // GEEN gratis-koppeling
      planQuota: [],
      anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }));
    ok(res.statusCode === 402, 'G1: expired pro zonder gratis-fallback-koppeling wordt correct geweigerd (402, niet stilzwijgend toegestaan)');
  }

  // ---- H. cancel_at_period_end vóór/ná expiry ----
  {
    const toekomst = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const mock = buildFetchMock({
      planKey: 'atleet_pro', planStatus: 'cancel_at_period_end', expiresAt: toekomst,
      planFeatures: [{ plan_key: 'atleet_pro', feature_key: 'ai_coach' }], planQuota: [], anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }));
    ok(res.statusCode === 200, 'H1: cancel_at_period_end vóór expiry blijft toegestaan');
  }
  {
    const verleden = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const mock = buildFetchMock({
      planKey: 'atleet_pro', planStatus: 'cancel_at_period_end', expiresAt: verleden,
      planFeatures: [{ plan_key: 'atleet_pro', feature_key: 'ai_coach' }], planQuota: [], anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }));
    ok(res.statusCode === 402, 'H2: cancel_at_period_end ná expiry wordt geweigerd');
  }

  // ---- I. Grace ----
  {
    const mock = buildFetchMock({
      planKey: 'atleet_pro', planStatus: 'grace',
      planFeatures: [{ plan_key: 'atleet_pro', feature_key: 'ai_coach' }], planQuota: [], anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }));
    ok(res.statusCode === 200, 'I1: grace-periode blijft toegestaan volgens de canonieke resolver');
  }

  // ---- J. KRITIEK: client claimt pro maar DB zegt free -> DB wint ----
  {
    const mock = buildFetchMock({
      planKey: null, // DB: geen betaald plan
      planFeatures: [{ plan_key: 'gratis', feature_key: 'ai_coach' }],
      planQuota: [{ plan_key: 'gratis', feature_key: 'ai_coach', quota_per_maand: 5 }],
      anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    // Client probeert planKey/subscriptionStatus in de payload te smokkelen -- moet genegeerd worden.
    const res = await handler(buildEvent({ requestType: 'chat', planKey: 'atleet_pro', subscriptionStatus: 'active', system: 's', messages: [] }));
    ok(res.statusCode === 200, 'J1: request slaagt (via het echte gratis-plan), niet via de client-geclaimde pro-status');
    const usageCall = mock.calls.find(function (c) { return c.url.includes('check_and_increment_usage'); });
    ok(!!usageCall, 'J2: de quota-RPC is daadwerkelijk aangeroepen -- bevestigt dat de GRATIS-quota is toegepast, niet een onbeperkte pro-vrijstelling');
  }

  // ---- K. Client claimt andere user -> JWT-identity wint (server haalt user.id altijd zelf op) ----
  {
    const mock = buildFetchMock({ userId: 'ECHTE-GEBRUIKER', planKey: null, planFeatures: [], planQuota: [], anthropicOk: true });
    global.fetch = mock;
    const handler = loadHandler();
    await handler(buildEvent({ requestType: 'intake_extract', userId: 'ANDERE-GEBRUIKER-CLAIM', system: 's', messages: [] }));
    const userLookup = mock.calls.find(function (c) { return c.url.includes('/rest/v1/users?'); });
    ok(!userLookup || !userLookup.url.includes('ANDERE-GEBRUIKER-CLAIM'), 'K1: de user-lookup gebruikt nooit een client-aangeleverd userId-veld uit de body');
  }

  // ---- L. Forged organization membership: memberships wordt server-side, RLS-gefilterd opgehaald ----
  {
    const mock = buildFetchMock({
      planKey: null, planFeatures: [], planQuota: [],
      memberships: [], // de mock simuleert RLS: de gebruiker heeft geen memberships, ongeacht wat de client beweert
      anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', organizationId: 'FORGED-ORG', system: 's', messages: [] }));
    ok(res.statusCode === 402, 'L1: een geforgede organization-claim in de body verandert niets -- geen membership, geen entitlement, geweigerd');
  }

  // ---- M. AI Coach vs programma_generator: verschillende feature-keys, verschillende quota ----
  {
    const mock = buildFetchMock({
      planKey: null,
      planFeatures: [{ plan_key: 'gratis', feature_key: 'ai_coach' }], // GEEN programma_generator voor gratis
      planQuota: [{ plan_key: 'gratis', feature_key: 'ai_coach', quota_per_maand: 5 }],
      anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    const resChat = await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }));
    ok(resChat.statusCode === 200, 'M1: chat (ai_coach) toegestaan voor gratis-plan');
    const resProg = await handler(buildEvent({ requestType: 'program_generation', system: 's', messages: [] }));
    ok(resProg.statusCode === 402, 'M2: program_generation (programma_generator) correct geweigerd -- verschillende feature-key, geen lek tussen capabilities');
  }

  // ---- N. Supabase lookup failure -> fail-closed voor betaalde feature, geen data loss/crash ----
  {
    global.fetch = async function (url) {
      if (url.includes('/auth/v1/user')) return jsonRes(200, { id: 'U1' });
      throw new Error('Supabase tijdelijk onbereikbaar');
    };
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }));
    ok(res.statusCode === 503, 'N1: een backend-storing bij het ophalen van de commerciële context geeft 503, nooit een crash of stilzwijgende toegang');
  }

  // ---- O. quota-RPC failure ----
  {
    global.fetch = async function (url, init) {
      if (url.includes('/auth/v1/user')) return jsonRes(200, { id: 'U1' });
      if (url.includes('/rest/v1/users?')) return jsonRes(200, [{ individual_plan_key: null }]);
      if (url.includes('/rest/v1/memberships?')) return jsonRes(200, []);
      if (url.includes('/rest/v1/plan_features')) return jsonRes(200, [{ plan_key: 'gratis', feature_key: 'ai_coach' }]);
      if (url.includes('/rest/v1/plan_feature_quota')) return jsonRes(200, [{ plan_key: 'gratis', feature_key: 'ai_coach', quota_per_maand: 5 }]);
      if (url.includes('/rpc/check_and_increment_usage')) throw new Error('RPC tijdelijk onbereikbaar');
      throw new Error('onverwacht: ' + url);
    };
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }));
    ok(res.statusCode === 503, 'O1: een RPC-storing bij de quota-check geeft 503, geen crash, geen stilzwijgende toegang');
  }

  // ---- P. Provider failure + veilige compensatie ----
  {
    const mock = buildFetchMock({
      planKey: null,
      planFeatures: [{ plan_key: 'gratis', feature_key: 'ai_coach' }],
      planQuota: [{ plan_key: 'gratis', feature_key: 'ai_coach', quota_per_maand: 5 }],
      anthropicOk: false, anthropicStatus: 500
    });
    global.fetch = mock;
    const handler = loadHandler();
    await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }));
    const decrementCall = mock.calls.find(function (c) { return c.url.includes('decrement_usage'); });
    ok(!!decrementCall, 'P1: bij een mislukte provider-aanroep wordt de gereserveerde quota-eenheid gecompenseerd (decrement_usage aangeroepen)');
  }

  // ---- Q. Provider success: geen compensatie ----
  {
    const mock = buildFetchMock({
      planKey: null,
      planFeatures: [{ plan_key: 'gratis', feature_key: 'ai_coach' }],
      planQuota: [{ plan_key: 'gratis', feature_key: 'ai_coach', quota_per_maand: 5 }],
      anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    await handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }));
    const decrementCall = mock.calls.find(function (c) { return c.url.includes('decrement_usage'); });
    ok(!decrementCall, 'Q1: bij een succesvolle provider-aanroep wordt NOOIT gecompenseerd (geen dubbele/onterechte quota-teruggave)');
  }

  // ---- R. Parallel quota race (twee "gelijktijdige" requests bij remaining=1) ----
  {
    const mock = buildFetchMock({
      planKey: null,
      planFeatures: [{ plan_key: 'gratis', feature_key: 'ai_coach' }],
      planQuota: [{ plan_key: 'gratis', feature_key: 'ai_coach', quota_per_maand: 1 }],
      anthropicOk: true
    });
    global.fetch = mock;
    const handler = loadHandler();
    const [r1, r2] = await Promise.all([
      handler(buildEvent({ requestType: 'chat', system: 's', messages: [] })),
      handler(buildEvent({ requestType: 'chat', system: 's', messages: [] }))
    ]);
    const statuses = [r1.statusCode, r2.statusCode].sort();
    ok(JSON.stringify(statuses) === JSON.stringify([200, 429]), 'R1: bij quota=1 en twee parallelle requests slaagt er precies één (200) en wordt de ander geweigerd (429), nooit beide toegestaan');
  }
  // ---- S. Compensatie-idempotentie: intake_extract heeft NOOIT quota gereserveerd
  // (featureKey === null), dus zelfs bij een mislukte provider-aanroep mag
  // decrement_usage() NOOIT worden aangeroepen -- anders zou dit een gebruiker
  // een "gratis extra quota-eenheid" kunnen opleveren zonder bijbehorende
  // consumptie (het risico dat de opdracht expliciet vereist te bewijzen). ----
  {
    const mock = buildFetchMock({ planKey: null, anthropicOk: false, anthropicStatus: 500 });
    global.fetch = mock;
    const handler = loadHandler();
    await handler(buildEvent({ requestType: 'intake_extract', system: 's', messages: [] }));
    const decrementCall = mock.calls.find(function (c) { return c.url.includes('decrement_usage'); });
    ok(!decrementCall, 'S1: intake_extract (geen quota-reservering) roept nooit decrement_usage aan bij een mislukte provider-aanroep -- geen quota kan worden "teruggewonnen" zonder ooit geconsumeerd te zijn');
  }
}

run().then(function () {
  console.log('fCoachEnforcement: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) {
  console.error('ONVERWACHTE TESTFOUT:', e);
  process.exit(1);
});
