/* fCoachProxySecurity.test.js — P0-002 regressietest voor netlify/functions/coach.js.
 * Bewijst het open-proxy-scenario (v3.3.10-fix) blijft dicht: zonder geldige sessie
 * mag de Anthropic-call NOOIT bereikt worden. GEEN echte Anthropic-call — global.fetch
 * gemockt, net als core/fWearableSyncHandler.test.js.
 */
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m) { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }

let anthropicCalled = false;

function makeFetch(userAuthOk, userAuthStatus) {
  return async function (url, opts) {
    url = String(url); opts = opts || {};
    const J = (obj, okFlag = true, status = 200) => ({ ok: okFlag, status, json: async () => obj, text: async () => JSON.stringify(obj) });
    if (url.indexOf('/auth/v1/user') !== -1) {
      if (!userAuthOk) return J({ error: 'invalid' }, false, userAuthStatus || 401);
      return J({ id: 'u1' });
    }
    if (url.indexOf('api.anthropic.com') !== -1) {
      anthropicCalled = true;
      return J({ content: [{ type: 'text', text: 'mock-antwoord' }] }, true, 200);
    }
    return J({}, true, 200);
  };
}

const handlerMod = require('../netlify/functions/coach.js');

(async () => {
  // SCENARIO 1: geen Authorization header -> 401, Anthropic NOOIT aangeroepen
  anthropicCalled = false;
  global.fetch = makeFetch(true);
  let res = await handlerMod.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ messages: [] }) });
  eq(res.statusCode, 401, 'S1: geen Authorization-header -> 401');
  ok(!anthropicCalled, 'S1: open-proxy-regressie geblokkeerd — Anthropic NIET aangeroepen zonder auth-header');

  // SCENARIO 2: malformed/lege token -> 401
  anthropicCalled = false;
  global.fetch = makeFetch(true);
  res = await handlerMod.handler({ httpMethod: 'POST', headers: { authorization: '' }, body: '{}' });
  eq(res.statusCode, 401, 'S2: lege Authorization-waarde -> 401');
  ok(!anthropicCalled, 'S2: Anthropic NIET aangeroepen bij lege auth-waarde');

  // SCENARIO 3: ongeldige/verlopen sessie (Supabase /auth/v1/user faalt) -> 401
  anthropicCalled = false;
  global.fetch = makeFetch(false, 401);
  res = await handlerMod.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer bad-token' }, body: '{}' });
  eq(res.statusCode, 401, 'S3: ongeldige sessie -> 401');
  ok(!anthropicCalled, 'S3: Anthropic NIET aangeroepen bij ongeldige sessie');

  // SCENARIO 4: sessieverificatie gooit een netwerkfout -> fail closed (401), niet crashen
  anthropicCalled = false;
  global.fetch = async (url) => { if (String(url).indexOf('/auth/v1/user') !== -1) throw new Error('netwerkfout'); return { ok: true, status: 200, json: async () => ({}) }; };
  res = await handlerMod.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer x' }, body: '{}' });
  eq(res.statusCode, 401, 'S4: netwerkfout tijdens sessieverificatie -> fail closed (401)');
  ok(!anthropicCalled, 'S4: Anthropic NIET aangeroepen bij verificatiefout');

  // SCENARIO 5: geldige sessie -> mag de normale route bereiken (Anthropic wél aangeroepen)
  // MS-F12-02: requestType is nu verplicht -- intake_extract is het meest
  // neutrale, altijd-toegankelijke type (geen entitlement/quota-check),
  // consistent met deze test se doel (auth-boundary, niet entitlements).
  anthropicCalled = false;
  global.fetch = makeFetch(true);
  res = await handlerMod.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer good-token' }, body: JSON.stringify({ requestType: 'intake_extract', messages: [{ role: 'user', content: 'hoi' }] }) });
  eq(res.statusCode, 200, 'S5: geldige sessie -> 200');
  ok(anthropicCalled, 'S5: Anthropic WEL aangeroepen bij geldige sessie (normale flow blijft werken)');

  // SCENARIO 6: verkeerde HTTP-methode -> 405, geen sessiecheck/Anthropic-call nodig
  anthropicCalled = false;
  res = await handlerMod.handler({ httpMethod: 'GET', headers: {} });
  eq(res.statusCode, 405, 'S6: GET-request -> 405 Method Not Allowed');
  ok(!anthropicCalled, 'S6: Anthropic NIET aangeroepen bij verkeerde methode');

  console.log('fCoachProxySecurity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
