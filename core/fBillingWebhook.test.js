/* fBillingWebhook.test.js — MS-F12-04 regressietest voor
 * netlify/functions/billing-webhook.js. Bewijst het fetch-to-confirm-
 * patroon: de webhook-body wordt NOOIT als bron van waarheid gebruikt
 * buiten het ophalen van het payment-ID zelf.
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.MOLLIE_API_KEY = 'test_mollie_key';

function loadHandler() {
  delete require.cache[require.resolve('../netlify/functions/billing-webhook.js')];
  return require('../netlify/functions/billing-webhook.js').handler;
}

function jsonRes(status, body) {
  return { ok: status >= 200 && status < 300, status: status, json: async () => body };
}

function buildFetchMock(opts) {
  opts = opts || {};
  const calls = [];
  const mock = async function (url, init) {
    calls.push({ url: url, method: (init && init.method) || 'GET', body: init && init.body });
    if (url.includes('api.mollie.com/v2/payments/')) {
      if (opts.mollieLookupOk === false) return jsonRes(404, { detail: 'not found' });
      return jsonRes(200, opts.paymentResponse || { id: 'tr_mock1', status: 'paid', createdAt: '2026-08-30T10:00:00Z', metadata: { user_id: 'U1', plan_key: 'atleet_pro' } });
    }
    if (url.includes('/rpc/reconcile_billing_event')) {
      if (opts.reconcileOk === false) return jsonRes(500, { detail: 'reconcile failure' });
      return jsonRes(200, [{ result: 'applied', applied_state: 'active' }]);
    }
    throw new Error('Onverwachte fetch-aanroep: ' + url);
  };
  mock.calls = calls;
  return mock;
}

function buildEvent(bodyParams) {
  const params = new URLSearchParams(bodyParams);
  return { httpMethod: 'POST', headers: {}, body: params.toString() };
}

async function run() {
  // ---- A. KRITIEK: webhook-body bevat NOOIT de status zelf -- alleen een ID. De handler moet dit altijd opnieuw ophalen. ----
  {
    const mock = buildFetchMock({ paymentResponse: { id: 'tr_forged1', status: 'paid', createdAt: '2026-08-30T10:00:00Z', metadata: { user_id: 'U1', plan_key: 'atleet_pro' } } });
    global.fetch = mock;
    const handler = loadHandler();
    // Sabotagepoging: iemand stuurt een payment-ID die niet bestaat/niet van dit account is (mock simuleert een geldige lookup hier, de eigenlijke bescherming zit in dat de server ALTIJD navraagt).
    await handler(buildEvent({ id: 'tr_forged1' }));
    const lookupCall = mock.calls.find(function (c) { return c.url.includes('api.mollie.com'); });
    ok(!!lookupCall, 'A1: de handler haalt de payment ALTIJD zelf op bij Mollie (fetch-to-confirm), vertrouwt nooit alleen de binnenkomende body');
  }

  // ---- B. Onbekende/niet-bestaande payment-ID bij Mollie -> geen mutatie, 200 (voorkomt onnodige retries) ----
  {
    const mock = buildFetchMock({ mollieLookupOk: false });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ id: 'tr_onbekend' }));
    ok(res.statusCode === 200, 'B1: een onbekend payment-ID bij Mollie geeft 200 (geen retry-storm), maar leidt tot geen enkele mutatie');
    const reconcileCall = mock.calls.find(function (c) { return c.url.includes('reconcile_billing_event'); });
    ok(!reconcileCall, 'B2: geen enkele reconcile-aanroep vindt plaats voor een onbekend payment-ID');
  }

  // ---- C. Malformed payment-ID-formaat -> fail closed, 400 ----
  {
    global.fetch = buildFetchMock({});
    const handler = loadHandler();
    const res = await handler(buildEvent({ id: '<script>alert(1)</script>' }));
    ok(res.statusCode === 400, 'C1: een malformed payment-ID-formaat wordt direct geweigerd, nooit doorgestuurd naar Mollie');
  }

  // ---- D. Ontbrekende id in body ----
  {
    global.fetch = buildFetchMock({});
    const handler = loadHandler();
    const res = await handler(buildEvent({}));
    ok(res.statusCode === 400, 'D1: een lege body zonder id geeft 400');
  }

  // ---- E. Onbekende Mollie-status -> fail closed, geen mutatie ----
  {
    const mock = buildFetchMock({ paymentResponse: { id: 'tr_mock2', status: 'een_nieuwe_onbekende_status', createdAt: '2026-08-30T10:00:00Z', metadata: { user_id: 'U1', plan_key: 'atleet_pro' } } });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ id: 'tr_mock2' }));
    ok(res.statusCode === 200, 'E1: een onbekende Mollie-status geeft 200 (geen onnodige retry)');
    const reconcileCall = mock.calls.find(function (c) { return c.url.includes('reconcile_billing_event'); });
    ok(!reconcileCall, 'E2: geen enkele reconcile-aanroep voor een onbekende/nieuwe statuswaarde -- fail closed, geen mutatie');
  }

  // ---- F. Ontbrekende metadata -> fail closed, geen koppeling mogelijk ----
  {
    const mock = buildFetchMock({ paymentResponse: { id: 'tr_mock3', status: 'paid', createdAt: '2026-08-30T10:00:00Z', metadata: {} } });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ id: 'tr_mock3' }));
    ok(res.statusCode === 200, 'F1: ontbrekende metadata geeft 200 (geen retry)');
    const reconcileCall = mock.calls.find(function (c) { return c.url.includes('reconcile_billing_event'); });
    ok(!reconcileCall, 'F2: geen reconcile-aanroep zonder een betrouwbare user_id/plan_key-koppeling');
  }

  // ---- G. Status-mapping: alleen 'paid' resulteert in het daadwerkelijke betaalde plan, elke andere status valt terug op 'gratis' ----
  {
    const mock = buildFetchMock({ paymentResponse: { id: 'tr_mock4', status: 'failed', createdAt: '2026-08-30T10:00:00Z', metadata: { user_id: 'U1', plan_key: 'atleet_pro' } } });
    global.fetch = mock;
    const handler = loadHandler();
    await handler(buildEvent({ id: 'tr_mock4' }));
    const reconcileCall = mock.calls.find(function (c) { return c.url.includes('reconcile_billing_event'); });
    const sentBody = JSON.parse(reconcileCall.body);
    ok(sentBody.p_plan_key === 'gratis', 'G1: een "failed"-status kent nooit het betaalde plan toe, valt terug op gratis');
    ok(sentBody.p_new_canonical_state === 'failed', 'G2: de canonical state wordt correct gemapt naar "failed"');
  }

  // ---- H. Provider tijdelijk onbereikbaar -> 503, laat Mollie retryen, geen mutatie ----
  {
    global.fetch = async function (url) {
      if (url.includes('api.mollie.com')) throw new Error('netwerkfout');
      throw new Error('onverwacht: ' + url);
    };
    const handler = loadHandler();
    const res = await handler(buildEvent({ id: 'tr_mock5' }));
    ok(res.statusCode === 503, 'H1: een netwerkfout bij Mollie geeft 503 (laat Mollie retryen), geen crash');
  }

  // ---- I. Reconcile-RPC-failure -> 500, expliciet gemeld ----
  {
    const mock = buildFetchMock({ reconcileOk: false });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ id: 'tr_mock6' }));
    ok(res.statusCode === 500, 'I1: een reconcile-RPC-failure geeft 500, geen stille fout');
  }

  // ---- J. Verkeerde HTTP-methode ----
  {
    global.fetch = buildFetchMock({});
    const handler = loadHandler();
    const res = await handler({ httpMethod: 'GET', headers: {} });
    ok(res.statusCode === 405, 'J1: GET geeft 405');
  }
}

run().then(function () {
  console.log('fBillingWebhook: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) {
  console.error('ONVERWACHTE TESTFOUT:', e);
  process.exit(1);
});
