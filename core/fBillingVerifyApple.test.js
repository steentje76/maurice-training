/* fBillingVerifyApple.test.js — MS-F13-08 regressietest.
 * Bewaakt vooral het EXPLICIETE, VEILIGE FAIL-CLOSED-gedrag: dit
 * endpoint mag NOOIT een ongeverifieerde JWS-payload doorlaten naar
 * reconcile_billing_event(), ook niet als alle credentials aanwezig
 * zijn -- de handtekeningverificatie zelf is bewust niet geimplementeerd
 * (vereist de officiële Apple-library), dus het endpoint moet hier
 * altijd expliciet weigeren, nooit een onveilige aanname doen.
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

function loadHandler() {
  delete require.cache[require.resolve('../netlify/functions/billing-verify-apple.js')];
  return require('../netlify/functions/billing-verify-apple.js');
}

function jsonRes(status, body) {
  return { ok: status >= 200 && status < 300, status: status, json: async () => body };
}

function buildFetchMock() {
  const calls = [];
  const mock = async function (url, init) {
    calls.push({ url: url, method: (init && init.method) || 'GET', body: init && init.body });
    if (url.includes('/auth/v1/user')) return jsonRes(200, { id: 'U1' });
    if (url.includes('/rpc/reconcile_billing_event')) return jsonRes(200, [{ result: 'applied', applied_state: 'active' }]);
    throw new Error('Onverwachte fetch-aanroep: ' + url + ' -- dit endpoint mag Apple/reconcile NOOIT daadwerkelijk aanroepen zolang JWS-verificatie niet is geimplementeerd');
  };
  mock.calls = calls;
  return mock;
}

function buildEvent(body) {
  return { httpMethod: 'POST', headers: { Authorization: 'Bearer test-jwt' }, body: JSON.stringify(body) };
}

async function run() {
  {
    global.fetch = buildFetchMock();
    const mod = loadHandler();
    const res = await mod.handler({ httpMethod: 'POST', headers: {}, body: '{}' });
    ok(res.statusCode === 401, 'A1: geen JWT geeft 401');
  }

  {
    global.fetch = buildFetchMock();
    const mod = loadHandler();
    const res = await mod.handler(buildEvent({}));
    ok(res.statusCode === 400, 'B1: ontbrekende transactionId geeft 400');
  }

  // ---- C. Zonder geconfigureerde Apple-credentials -> 503 ----
  {
    global.fetch = buildFetchMock();
    const mod = loadHandler();
    const res = await mod.handler(buildEvent({ transactionId: 'tx123' }));
    ok(res.statusCode === 503, 'C1: zonder geconfigureerde Apple-credentials geeft dit 503');
  }

  // ---- D. KRITIEK: zelfs MET alle credentials geconfigureerd, weigert dit
  // endpoint expliciet omdat JWS-verificatie niet geimplementeerd is --
  // NOOIT een reconcile-aanroep zonder een echt geverifieerde transactie. ----
  {
    process.env.APPLE_APP_STORE_KEY_ID = 'test-key-id';
    process.env.APPLE_APP_STORE_ISSUER_ID = 'test-issuer-id';
    process.env.APPLE_APP_STORE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';
    const mock = buildFetchMock();
    global.fetch = mock;
    const mod = loadHandler();
    const res = await mod.handler(buildEvent({ transactionId: 'tx123' }));
    ok(res.statusCode === 501, 'D1: zelfs met alle credentials geconfigureerd, weigert dit endpoint expliciet (501) omdat de JWS-certificate-chain-verificatie zelf niet geimplementeerd is');
    const body = JSON.parse(res.body);
    ok(body.error.code === 'JWS_VERIFICATION_NOT_IMPLEMENTED', 'D2: de foutcode is expliciet en eerlijk, geen vage "er ging iets mis"');
    const reconcileCall = mock.calls.find(function (c) { return c.url.includes('reconcile_billing_event'); });
    ok(!reconcileCall, 'D3: reconcile_billing_event() wordt NOOIT aangeroepen zonder een echt geverifieerde transactie -- de kernbeveiliging van dit hele endpoint');
    delete process.env.APPLE_APP_STORE_KEY_ID;
    delete process.env.APPLE_APP_STORE_ISSUER_ID;
    delete process.env.APPLE_APP_STORE_PRIVATE_KEY;
  }
}

run().then(function () {
  console.log('fBillingVerifyApple: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) {
  console.error('ONVERWACHTE TESTFOUT:', e);
  process.exit(1);
});
