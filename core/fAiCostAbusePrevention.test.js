/* fAiCostAbusePrevention.test.js — F13 Post-Audit Remediation P1-01.
 * Bewaakt dat coach.js nooit een client-aangeleverd model of een
 * client-aangeleverde max_tokens boven het server-plafond doorgeeft
 * aan de Anthropic API.
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

function loadHandler() {
  delete require.cache[require.resolve('../netlify/functions/coach.js')];
  return require('../netlify/functions/coach.js').handler;
}

function jsonRes(status, body) { return { ok: status >= 200 && status < 300, status: status, json: async () => body }; }

function buildFetchMock(opts) {
  opts = opts || {};
  const calls = [];
  const mock = async function (url, init) {
    calls.push({ url: url, body: init && init.body });
    if (url.includes('/auth/v1/user')) return jsonRes(200, { id: 'U1' });
    if (url.includes('/rest/v1/users?')) return jsonRes(200, [{ individual_plan_key: 'atleet_pro', individual_plan_status: 'active', individual_plan_expires_at: null }]);
    if (url.includes('/rest/v1/memberships?')) return jsonRes(200, []);
    if (url.includes('/rest/v1/plan_features?')) return jsonRes(200, [{ plan_key: 'atleet_pro', feature_key: 'ai_coach' }, { plan_key: 'atleet_pro', feature_key: 'programma_generator' }]);
    if (url.includes('/rest/v1/plan_feature_quota?')) return jsonRes(200, []);
    if (url.includes('/rpc/check_and_increment_usage')) return jsonRes(200, [{ toegestaan: true }]);
    if (url.includes('api.anthropic.com')) return jsonRes(200, { content: [{ type: 'text', text: 'ok' }] });
    throw new Error('Onverwachte fetch-aanroep: ' + url);
  };
  mock.calls = calls;
  return mock;
}

function buildEvent(body) {
  return { httpMethod: 'POST', headers: { Authorization: 'Bearer test-jwt' }, body: JSON.stringify(body) };
}

async function run() {
  // ---- A. Client-aangeleverd model wordt volledig genegeerd ----
  {
    const mock = buildFetchMock({});
    global.fetch = mock;
    const handler = loadHandler();
    await handler(buildEvent({ requestType: 'chat', model: 'claude-opus-5-EXPENSIVE', max_tokens: 100, system: 'test', messages: [{ role: 'user', content: 'hoi' }] }));
    const anthropicCall = mock.calls.find(function (c) { return c.url.includes('api.anthropic.com'); });
    const sentBody = JSON.parse(anthropicCall.body);
    ok(sentBody.model === 'claude-sonnet-4-5', 'A1: het client-aangeleverde model wordt volledig genegeerd, server gebruikt altijd de eigen, vaste waarde');
  }

  // ---- B. Client-aangeleverde max_tokens boven het plafond wordt geclampt ----
  {
    const mock = buildFetchMock({});
    global.fetch = mock;
    const handler = loadHandler();
    await handler(buildEvent({ requestType: 'chat', model: 'irrelevant', max_tokens: 999999, system: 'test', messages: [{ role: 'user', content: 'hoi' }] }));
    const anthropicCall = mock.calls.find(function (c) { return c.url.includes('api.anthropic.com'); });
    const sentBody = JSON.parse(anthropicCall.body);
    ok(sentBody.max_tokens === 1200, 'B1: een absurd hoge, client-aangeleverde max_tokens wordt geclamped naar het server-plafond voor "chat" (1200)');
  }

  // ---- C. Een legitiem lagere, client-aangeleverde max_tokens (binnen het plafond) blijft werken ----
  {
    const mock = buildFetchMock({});
    global.fetch = mock;
    const handler = loadHandler();
    await handler(buildEvent({ requestType: 'chat', max_tokens: 200, system: 'test', messages: [{ role: 'user', content: 'hoi' }] }));
    const anthropicCall = mock.calls.find(function (c) { return c.url.includes('api.anthropic.com'); });
    const sentBody = JSON.parse(anthropicCall.body);
    ok(sentBody.max_tokens === 200, 'C1: een legitieme, lagere max_tokens-waarde binnen het plafond wordt gerespecteerd (behoudt bestaande, legitieme variatie tussen call-sites)');
  }

  // ---- D. Elk requestType heeft een eigen, passend plafond ----
  {
    const mock = buildFetchMock({});
    global.fetch = mock;
    const handler = loadHandler();
    await handler(buildEvent({ requestType: 'intake_extract', max_tokens: 999999, system: 'test', messages: [{ role: 'user', content: 'hoi' }] }));
    const anthropicCall = mock.calls.find(function (c) { return c.url.includes('api.anthropic.com'); });
    const sentBody = JSON.parse(anthropicCall.body);
    ok(sentBody.max_tokens === 300, 'D1: "intake_extract" heeft een eigen, lager plafond (300) dat ook niet client-overschrijfbaar is');
  }

  // ---- E. Ontbrekende/negatieve/niet-numerieke max_tokens valt veilig terug op het plafond ----
  {
    const mock = buildFetchMock({});
    global.fetch = mock;
    const handler = loadHandler();
    await handler(buildEvent({ requestType: 'session_summary', max_tokens: -50, system: 'test', messages: [{ role: 'user', content: 'hoi' }] }));
    const anthropicCall = mock.calls.find(function (c) { return c.url.includes('api.anthropic.com'); });
    const sentBody = JSON.parse(anthropicCall.body);
    ok(sentBody.max_tokens === 700, 'E1: een negatieve max_tokens-waarde valt veilig terug op het plafond, geen crash of ongeldige API-aanroep');
  }
}

run().then(function () {
  console.log('fAiCostAbusePrevention: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) {
  console.error('ONVERWACHTE TESTFOUT:', e);
  process.exit(1);
});
