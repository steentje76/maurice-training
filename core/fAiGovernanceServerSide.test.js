/* fAiGovernanceServerSide.test.js — F13 Post-Audit Remediation P1-02/P1-03.
 * Bewaakt dat coach.js de AI-output ZELF valideert (server-side) vóórdat
 * de tekst naar de client wordt teruggestuurd -- een gemanipuleerde
 * client die de client-side validatie overslaat, mag nooit verboden
 * medische/diagnostische taal of een fysiek onplausibel APPLY-voorstel
 * kunnen ontvangen.
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

function buildFetchMock(anthropicResponseText) {
  const calls = [];
  const mock = async function (url, init) {
    calls.push({ url: url, body: init && init.body });
    if (url.includes('/auth/v1/user')) return jsonRes(200, { id: 'U1' });
    if (url.includes('/rest/v1/users?')) return jsonRes(200, [{ individual_plan_key: 'atleet_pro', individual_plan_status: 'active', individual_plan_expires_at: null }]);
    if (url.includes('/rest/v1/memberships?')) return jsonRes(200, []);
    if (url.includes('/rest/v1/plan_features?')) return jsonRes(200, [{ plan_key: 'atleet_pro', feature_key: 'ai_coach' }]);
    if (url.includes('/rest/v1/plan_feature_quota?')) return jsonRes(200, []);
    if (url.includes('api.anthropic.com')) return jsonRes(200, { content: [{ type: 'text', text: anthropicResponseText }] });
    throw new Error('Onverwachte fetch-aanroep: ' + url);
  };
  mock.calls = calls;
  return mock;
}

function buildEvent(body) {
  return { httpMethod: 'POST', headers: { Authorization: 'Bearer test-jwt' }, body: JSON.stringify(body) };
}

async function run() {
  // ---- A. Verboden, diagnostische AI-output wordt server-side vervangen ----
  {
    global.fetch = buildFetchMock('Op basis van je HRV: je bent overtraind en hebt een blessure.');
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 'test', messages: [{ role: 'user', content: 'hoe gaat het' }] }));
    const body = JSON.parse(res.body);
    ok(!body.content[0].text.includes('overtraind') && !body.content[0].text.includes('blessure'),
      'A1: verboden diagnostische taal wordt server-side vervangen door de veilige fallback, ongeacht of de client dit zelf ook zou filteren');
  }

  // ---- B. Geldige, normale AI-output blijft ongewijzigd ----
  {
    global.fetch = buildFetchMock('Vandaag ging je bench iets omhoog t.o.v. vorige week.');
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 'test', messages: [{ role: 'user', content: 'hoe ging het' }] }));
    const body = JSON.parse(res.body);
    ok(body.content[0].text === 'Vandaag ging je bench iets omhoog t.o.v. vorige week.',
      'B1: geldige, normale AI-output wordt niet aangepast (geen valse positieven)');
  }

  // ---- C. Een fysiek onplausibel APPLY-voorstel (boven de absolute cap) wordt server-side verwijderd ----
  {
    global.fetch = buildFetchMock('Probeer vandaag 800 kg. [[APPLY:backsquat:800]]');
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 'test', messages: [{ role: 'user', content: 'wat moet ik doen' }] }));
    const body = JSON.parse(res.body);
    ok(!body.content[0].text.includes('[[APPLY:'),
      'C1: een APPLY-marker boven de absolute, server-side veiligheidsgrens (500kg zonder 1RM-context) wordt verwijderd, ongeacht of de client dit zelf ook zou afwijzen');
  }

  // ---- D. Een plausibel APPLY-voorstel blijft intact ----
  {
    global.fetch = buildFetchMock('Probeer vandaag 82.5 kg. [[APPLY:backsquat:82.5]]');
    const handler = loadHandler();
    const res = await handler(buildEvent({ requestType: 'chat', system: 'test', messages: [{ role: 'user', content: 'wat moet ik doen' }] }));
    const body = JSON.parse(res.body);
    ok(body.content[0].text.includes('[[APPLY:backsquat:82.5]]'),
      'D1: een plausibel, normaal APPLY-voorstel blijft intact (geen overmatige filtering)');
  }

  // ---- E. Governance-schendingen worden gelogd (observability, geen stil falen) ----
  {
    const mock = buildFetchMock('Dit duidt op overtraining en een medische diagnose.');
    global.fetch = mock;
    const origError = console.error;
    let gelogdeOutput = '';
    console.error = function (line) { gelogdeOutput += String(line); };
    const handler = loadHandler();
    await handler(buildEvent({ requestType: 'chat', system: 'test', messages: [{ role: 'user', content: 'x' }] }));
    console.error = origError;
    ok(gelogdeOutput.includes('ai.coach.output_contract_violation'),
      'E1: een governance-schending wordt expliciet gelogd via observability, niet stil afgehandeld');
  }
}

run().then(function () {
  console.log('fAiGovernanceServerSide: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) {
  console.error('ONVERWACHTE TESTFOUT:', e);
  process.exit(1);
});
