/* fBillingVerifyGooglePlay.test.js — MS-F13-08 regressietest. */
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
  delete require.cache[require.resolve('../netlify/functions/billing-verify-google-play.js')];
  return require('../netlify/functions/billing-verify-google-play.js');
}

function jsonRes(status, body) {
  return { ok: status >= 200 && status < 300, status: status, json: async () => body };
}

const crypto = require('crypto');
function genereerTestServiceAccount() {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return JSON.stringify({ client_email: 'test@test.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs1', format: 'pem' }) });
}

function buildFetchMock(opts) {
  opts = opts || {};
  const calls = [];
  const mock = async function (url, init) {
    calls.push({ url: url, method: (init && init.method) || 'GET', body: init && init.body });
    if (url.includes('/auth/v1/user')) return jsonRes(200, { id: opts.userId || 'U1' });
    if (url.includes('oauth2.googleapis.com/token')) {
      if (opts.tokenExchangeOk === false) return jsonRes(400, {});
      return jsonRes(200, { access_token: 'mock-access-token' });
    }
    if (url.includes('androidpublisher.googleapis.com')) {
      if (opts.verifyOk === false) return jsonRes(404, {});
      return jsonRes(200, opts.subscriptionResponse || { subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', startTime: '2026-08-30T10:00:00Z', lineItems: [{ expiryTime: '2026-09-30T10:00:00Z' }] });
    }
    if (url.includes('/rpc/reconcile_billing_event')) {
      if (opts.reconcileOk === false) return jsonRes(500, {});
      return jsonRes(200, [{ result: 'applied', applied_state: 'active' }]);
    }
    throw new Error('Onverwachte fetch-aanroep: ' + url);
  };
  mock.calls = calls;
  return mock;
}

function buildEvent(body) {
  return { httpMethod: 'POST', headers: { Authorization: 'Bearer test-jwt' }, body: JSON.stringify(body) };
}

async function run() {
  // ---- A. Geen JWT ----
  {
    global.fetch = buildFetchMock({});
    const mod = loadHandler();
    const res = await mod.handler({ httpMethod: 'POST', headers: {}, body: '{}' });
    ok(res.statusCode === 401, 'A1: geen JWT geeft 401');
  }

  // ---- B. Ontbrekende purchaseToken/productId ----
  {
    global.fetch = buildFetchMock({});
    const mod = loadHandler();
    const res = await mod.handler(buildEvent({}));
    ok(res.statusCode === 400, 'B1: ontbrekende purchaseToken/productId geeft 400');
  }

  // ---- C. Geen geconfigureerde provider -> 503, nooit een nep-verificatie ----
  {
    global.fetch = buildFetchMock({});
    const mod = loadHandler();
    const res = await mod.handler(buildEvent({ purchaseToken: 'tok123', productId: 'atleet_pro' }));
    ok(res.statusCode === 503, 'C1: zonder geconfigureerde service-account geeft dit 503, nooit een echte verificatiepoging');
  }

  // ---- D. Volledige, geslaagde flow met een gemockt, correct getekend test-keypair ----
  {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY = genereerTestServiceAccount();
    process.env.ANDROID_PACKAGE_NAME = 'com.trainingskompas.app';
    const mock = buildFetchMock({});
    global.fetch = mock;
    const mod = loadHandler();
    const res = await mod.handler(buildEvent({ purchaseToken: 'tok123', productId: 'atleet_pro' }));
    ok(res.statusCode === 200, 'D1: een geldige, actieve subscriptie resulteert in 200');
    const reconcileCall = mock.calls.find(function (c) { return c.url.includes('reconcile_billing_event'); });
    ok(!!reconcileCall, 'D2: reconcile_billing_event() wordt daadwerkelijk aangeroepen');
    const sentBody = JSON.parse(reconcileCall.body);
    ok(sentBody.p_provider === 'google_play', 'D3: de provider wordt correct als "google_play" doorgegeven');
    ok(sentBody.p_idempotency_key === 'tok123:SUBSCRIPTION_STATE_ACTIVE', 'D4: de idempotency_key gebruikt het globaal unieke purchaseToken (consistent met de officiële Google-aanbeveling)');
  }

  // ---- E. Onbekende/ongeldig purchaseToken bij Google -> geen mutatie ----
  {
    const mock = buildFetchMock({ verifyOk: false });
    global.fetch = mock;
    const mod = loadHandler();
    const res = await mod.handler(buildEvent({ purchaseToken: 'onbekend', productId: 'atleet_pro' }));
    ok(res.statusCode === 200, 'E1: een onbekend purchaseToken geeft 200 (fail-safe response, geen crash)');
    const reconcileCall = mock.calls.find(function (c) { return c.url.includes('reconcile_billing_event'); });
    ok(!reconcileCall, 'E2: geen enkele reconcile-aanroep voor een ongeldig purchaseToken');
  }

  // ---- F. Alleen 'paid'/active-achtige status kent het betaalde plan toe ----
  {
    const mock = buildFetchMock({ subscriptionResponse: { subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED', startTime: '2026-08-30T10:00:00Z' } });
    global.fetch = mock;
    const mod = loadHandler();
    await mod.handler(buildEvent({ purchaseToken: 'tok456', productId: 'atleet_pro' }));
    const reconcileCall = mock.calls.find(function (c) { return c.url.includes('reconcile_billing_event'); });
    const sentBody = JSON.parse(reconcileCall.body);
    ok(sentBody.p_plan_key === 'gratis', 'F1: een verlopen subscriptie kent nooit het betaalde plan toe, valt terug op gratis');
  }

  // ---- G. Onbekende Google-status -> fail closed ----
  {
    const mock = buildFetchMock({ subscriptionResponse: { subscriptionState: 'EEN_NIEUWE_ONBEKENDE_STATUS' } });
    global.fetch = mock;
    const mod = loadHandler();
    const res = await mod.handler(buildEvent({ purchaseToken: 'tok789', productId: 'atleet_pro' }));
    ok(res.statusCode === 200, 'G1: onbekende status geeft 200 (geen crash)');
    const reconcileCall = mock.calls.find(function (c) { return c.url.includes('reconcile_billing_event'); });
    ok(!reconcileCall, 'G2: geen reconcile-aanroep voor een onbekende Google-statuswaarde');
  }
  // ---- H. KRITIEK: een extra, kwaadaardig veld in de body (bijv. een
  // sabotagepoging om zelf het plan te forceren) mag NOOIT het door de
  // server bepaalde plan overschrijven. ----
  {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY = genereerTestServiceAccount();
    process.env.ANDROID_PACKAGE_NAME = 'com.trainingskompas.app';
    const mock = buildFetchMock({ subscriptionResponse: { subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED', startTime: '2026-08-30T10:00:00Z' } });
    global.fetch = mock;
    const mod = loadHandler();
    await mod.handler(buildEvent({ purchaseToken: 'tok999', productId: 'atleet_pro', forcedPlanKey: 'atleet_pro', status: 'active', plan: 'atleet_pro' }));
    const reconcileCall = mock.calls.find(function (c) { return c.url.includes('reconcile_billing_event'); });
    const sentBody = JSON.parse(reconcileCall.body);
    ok(sentBody.p_plan_key === 'gratis', 'H1: geen enkel extra, client-aangeleverd veld (forcedPlanKey/status/plan) kan het server-bepaalde plan overschrijven -- een verlopen subscriptie valt altijd terug op gratis');
  }
}

run().then(function () {
  console.log('fBillingVerifyGooglePlay: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) {
  console.error('ONVERWACHTE TESTFOUT:', e);
  process.exit(1);
});
