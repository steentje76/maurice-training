/* fBillingCheckout.test.js — MS-F12-04 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.MOLLIE_API_KEY = 'test_mollie_key';
process.env.URL = 'https://trainingskompas.example';

function loadHandler() {
  delete require.cache[require.resolve('../netlify/functions/billing-checkout.js')];
  return require('../netlify/functions/billing-checkout.js').handler;
}

function jsonRes(status, body) {
  return { ok: status >= 200 && status < 300, status: status, json: async () => body };
}

function buildFetchMock(opts) {
  opts = opts || {};
  const calls = [];
  const mock = async function (url, init) {
    calls.push({ url: url, method: (init && init.method) || 'GET', body: init && init.body });
    if (url.includes('/auth/v1/user')) {
      if (opts.validAuth === false) return jsonRes(401, { error: 'invalid' });
      return jsonRes(200, { id: opts.userId || 'U1', email: 'u1@example.com' });
    }
    if (url.includes('/rest/v1/plans?')) {
      return jsonRes(200, opts.planRows !== undefined ? opts.planRows : []);
    }
    if (url.includes('api.mollie.com/v2/payments')) {
      if (opts.mollieOk === false) return jsonRes(500, { detail: 'provider failure' });
      const sentBody = JSON.parse(init.body);
      return jsonRes(201, { id: 'tr_mock123', _links: { checkout: { href: 'https://mollie.com/checkout/tr_mock123' } }, _sentAmount: sentBody.amount });
    }
    throw new Error('Onverwachte fetch-aanroep: ' + url);
  };
  mock.calls = calls;
  return mock;
}

function buildEvent(body, opts) {
  opts = opts || {};
  return { httpMethod: 'POST', headers: opts.noAuth ? {} : { Authorization: 'Bearer test-jwt' }, body: JSON.stringify(body) };
}

async function run() {
  {
    global.fetch = buildFetchMock({});
    const handler = loadHandler();
    const res = await handler(buildEvent({ planKey: 'atleet_pro' }, { noAuth: true }));
    ok(res.statusCode === 401, 'A1: geen JWT geeft 401');
  }

  {
    global.fetch = buildFetchMock({});
    const handler = loadHandler();
    const res = await handler(buildEvent({}));
    ok(res.statusCode === 400, 'B1: ontbrekende planKey geeft 400');
  }

  {
    global.fetch = buildFetchMock({ planRows: [] });
    const handler = loadHandler();
    const res = await handler(buildEvent({ planKey: 'niet_bestaand' }));
    ok(res.statusCode === 400, 'C1: een onbekend plan geeft 400');
    const body = JSON.parse(res.body);
    ok(body.error.code === 'UNKNOWN_PLAN', 'C2: het foutobject bevat de canonieke UNKNOWN_PLAN-code');
  }

  {
    global.fetch = buildFetchMock({ planRows: [{ key: 'atleet_pro', naam: 'Atleet Pro', type: 'individueel', prijs_cent: null }] });
    const handler = loadHandler();
    const res = await handler(buildEvent({ planKey: 'atleet_pro' }));
    ok(res.statusCode === 409, 'D1: een NULL-prijs weigert de checkout met 409');
    const body = JSON.parse(res.body);
    ok(body.error.code === 'PRODUCT_NOT_CONFIGURED', 'D2: het foutobject bevat de canonieke PRODUCT_NOT_CONFIGURED-code');
  }

  {
    const mock = buildFetchMock({ planRows: [{ key: 'atleet_pro', naam: 'Atleet Pro', type: 'individueel', prijs_cent: 999 }] });
    global.fetch = mock;
    const handler = loadHandler();
    const res = await handler(buildEvent({ planKey: 'atleet_pro', amount: '0.01', currency: 'USD', prijs_cent: 1 }));
    ok(res.statusCode === 200, 'E1: checkout met een geconfigureerde prijs slaagt');
    const mollieCall = mock.calls.find(function (c) { return c.url.includes('api.mollie.com'); });
    const sentBody = JSON.parse(mollieCall.body);
    ok(sentBody.amount.value === '9.99' && sentBody.amount.currency === 'EUR',
      'E2: het naar Mollie verstuurde bedrag komt exact overeen met plans.prijs_cent, NOOIT het client-aangeleverde bedrag');
  }

  {
    delete process.env.MOLLIE_API_KEY;
    global.fetch = buildFetchMock({ planRows: [{ key: 'atleet_pro', naam: 'Atleet Pro', type: 'individueel', prijs_cent: 999 }] });
    const handler = loadHandler();
    const res = await handler(buildEvent({ planKey: 'atleet_pro' }));
    ok(res.statusCode === 503, 'F1: een ontbrekende provider-sleutel geeft 503, nooit een mock-checkout-URL');
    process.env.MOLLIE_API_KEY = 'test_mollie_key';
  }

  {
    global.fetch = buildFetchMock({ planRows: [{ key: 'atleet_pro', naam: 'Atleet Pro', type: 'individueel', prijs_cent: 999 }], mollieOk: false });
    const handler = loadHandler();
    const res = await handler(buildEvent({ planKey: 'atleet_pro' }));
    ok(res.statusCode === 503, 'G1: een providerfout geeft 503, geen crash');
  }

  {
    global.fetch = buildFetchMock({});
    const handler = loadHandler();
    const res = await handler({ httpMethod: 'POST', headers: { Authorization: 'Bearer x' }, body: '{invalid json' });
    ok(res.statusCode === 400, 'H1: een malformed requestbody geeft 400, geen crash');
  }

  {
    global.fetch = buildFetchMock({});
    const handler = loadHandler();
    const res = await handler({ httpMethod: 'GET', headers: {} });
    ok(res.statusCode === 405, 'I1: GET geeft 405');
  }

  // ---- J. KRITIEK: geen enkele client-side return-URL-handler mag entitlement
  // activeren. Return URL is uitsluitend presentatie/navigatie -- de webhook/
  // reconciliation is de enige financiële waarheid. ----
  {
    const fs = require('fs');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    ok(!html.match(/checkout=return[\s\S]{0,500}individual_plan_key\s*=/i) && !html.match(/individual_plan_key\s*=\s*['"][a-z_]+['"]/i),
      'J1: index.html bevat geen enkele client-side toewijzing aan individual_plan_key gekoppeld aan de checkout-return-parameter (return URL is uitsluitend presentatie)');
  }
}

run().then(function () {
  console.log('fBillingCheckout: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) {
  console.error('ONVERWACHTE TESTFOUT:', e);
  process.exit(1);
});
