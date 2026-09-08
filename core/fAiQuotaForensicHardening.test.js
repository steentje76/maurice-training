/* fAiQuotaForensicHardening.test.js — AI-QUOTA-FORENSIC + HARDENING.
 * Mockt global.fetch (zelfde patroon als fCoachEnforcement.test.js) om de
 * quota-scheiding (ai_coach vs knowledge_ai) en de tester/PO-vrijstelling
 * te testen zonder echte netwerk-/provider-/quotaverbruik.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

function loadHandler() {
  delete require.cache[require.resolve('../netlify/functions/coach.js')];
  return require('../netlify/functions/coach.js').handler;
}
function jsonRes(status, body) { return { ok: status >= 200 && status < 300, status: status, json: async () => body }; }

const DEFAULT_PLAN_FEATURES = [
  { plan_key: 'gratis', feature_key: 'ai_coach' },
  { plan_key: 'gratis', feature_key: 'knowledge_ai' },
  { plan_key: 'gratis', feature_key: 'programma_generator' }
];
const DEFAULT_PLAN_QUOTA = [
  { plan_key: 'gratis', feature_key: 'ai_coach', quota_per_maand: 5 },
  { plan_key: 'gratis', feature_key: 'knowledge_ai', quota_per_maand: 5 },
  { plan_key: 'gratis', feature_key: 'programma_generator', quota_per_maand: 1 }
];

/* buildFetchMock: opts.systemRole simuleert de SERVER-SIDE opgehaalde
 * users-rij -- nooit iets uit de client-payload. opts.quotaState is een
 * gedeelde map, zodat cross-feature-consumptie tussen twee opeenvolgende
 * calls binnen dezelfde test getest kan worden. */
function buildFetchMock(opts) {
  opts = opts || {};
  const calls = [];
  const quotaState = opts.quotaState || {};
  const mock = async function (url, init) {
    calls.push({ url: url, method: (init && init.method) || 'GET', body: init && init.body });
    if (url.includes('/auth/v1/user')) {
      if (opts.validAuth === false) return jsonRes(401, { error: 'invalid' });
      return jsonRes(200, { id: opts.userId || 'U1' });
    }
    if (url.includes('/rest/v1/users?')) {
      // Bewijst dat system_role hier, server-side, wordt opgevraagd --
      // nooit uit de request-body van de client.
      ok(url.includes('system_role'), 'sanity: de users-select vraagt system_role expliciet mee op (server-side bron)');
      return jsonRes(200, [{
        individual_plan_key: opts.planKey !== undefined ? opts.planKey : null,
        individual_plan_status: opts.planStatus !== undefined ? opts.planStatus : null,
        individual_plan_expires_at: opts.expiresAt !== undefined ? opts.expiresAt : null,
        system_role: opts.systemRole !== undefined ? opts.systemRole : null
      }]);
    }
    if (url.includes('/rest/v1/memberships?')) return jsonRes(200, opts.memberships || []);
    if (url.includes('/rest/v1/plan_features')) return jsonRes(200, opts.planFeatures || DEFAULT_PLAN_FEATURES);
    if (url.includes('/rest/v1/plan_feature_quota')) return jsonRes(200, opts.planQuota || DEFAULT_PLAN_QUOTA);
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
  return { mock: mock, calls: calls, quotaState: quotaState };
}

function makeEvent(bodyObj, authHeader) {
  // Sentinel-fix: 'undefined' (niet meegegeven) -> standaard testheader;
  // expliciet 'null' meegegeven -> écht geen Authorization-header (voor de
  // unauthorized-bypass-test hieronder).
  const header = authHeader === undefined ? 'Bearer test-jwt' : authHeader;
  return { httpMethod: 'POST', headers: { authorization: header }, body: JSON.stringify(bodyObj || {}) };
}

async function run() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');
  const coachSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/coach.js'), 'utf8');

  // ═══ requestType classification ═══
  ok(coachSrc.indexOf("knowledge_chat: 'knowledge_ai'") > 0, 'requestType-classificatie: knowledge_chat -> knowledge_ai (was ai_coach)');
  ok(coachSrc.indexOf("chat: 'ai_coach'") > 0 && coachSrc.indexOf("session_summary: 'ai_coach'") > 0, 'requestType-classificatie: chat/session_summary blijven op ai_coach (Daily Coach ongewijzigd)');

  // ═══ quota isolation + cross-feature consumption ═══
  {
    const shared = buildFetchMock({ quotaState: {} });
    global.fetch = shared.mock;
    let handler = loadHandler();
    // Verbruik alle 5 ai_coach-credits via 'chat' (Daily Coach)
    for (let i = 0; i < 5; i++) {
      const res = await handler(makeEvent({ requestType: 'chat', messages: [{ role: 'user', content: 'x' }] }));
      ok(res.statusCode === 200, 'setup: chat-call ' + (i + 1) + '/5 slaagt (bouwt ai_coach-verbruik op)');
    }
    const overLimiet = await handler(makeEvent({ requestType: 'chat', messages: [{ role: 'user', content: 'x' }] }));
    ok(overLimiet.statusCode === 429, 'quota isolation: 6e chat-call wordt terecht geweigerd (ai_coach op)');
    // De Kennis-AI (knowledge_chat -> knowledge_ai) moet HIERDOOR NIET geraakt worden.
    const kennisNaOp = await handler(makeEvent({ requestType: 'knowledge_chat', messages: [{ role: 'user', content: 'x' }] }));
    ok(kennisNaOp.statusCode === 200, 'cross-feature consumption: knowledge_chat werkt nog gewoon nadat ai_coach (chat) volledig op is -- de bug is opgelost');
    // En omgekeerd: knowledge_ai opmaken mag ai_coach niet raken.
    for (let i = 0; i < 4; i++) {
      await handler(makeEvent({ requestType: 'knowledge_chat', messages: [{ role: 'user', content: 'x' }] }));
    }
    const kennisOverLimiet = await handler(makeEvent({ requestType: 'knowledge_chat', messages: [{ role: 'user', content: 'x' }] }));
    ok(kennisOverLimiet.statusCode === 429, 'quota isolation: knowledge_ai heeft zijn eigen, onafhankelijke plafond van 5');
    const chatBlijftOp = await handler(makeEvent({ requestType: 'chat', messages: [{ role: 'user', content: 'x' }] }));
    ok(chatBlijftOp.statusCode === 429, 'sanity: ai_coach (chat) blijft correct op zijn eigen, eerder opgebruikte quotum (geen onbedoelde reset)');
  }

  // ═══ entitlement (ongewijzigd, herbevestiging) ═══
  {
    const noEntitlement = buildFetchMock({ planFeatures: [], planQuota: [] });
    global.fetch = noEntitlement.mock;
    const handler = loadHandler();
    const res = await handler(makeEvent({ requestType: 'chat', messages: [{ role: 'user', content: 'x' }] }));
    ok(res.statusCode === 402, 'entitlement: zonder plan_features-rij voor ai_coach wordt de call geweigerd (402)');
  }

  // ═══ reset (ongewijzigd) ═══
  ok(coachSrc.includes("periode = new Date().toISOString().slice(0, 8) + '01'"), 'reset: periode blijft de UTC-kalendermaandgrens (YYYY-MM-01), ongewijzigd door deze fix');

  // ═══ unauthorized bypass impossible ═══
  {
    const noAuth = buildFetchMock({});
    global.fetch = noAuth.mock;
    const handler = loadHandler();
    const resGeenHeader = await handler(makeEvent({ requestType: 'knowledge_chat' }, null));
    ok(resGeenHeader.statusCode === 401, 'unauthorized bypass: geen Authorization-header -> 401, ook voor knowledge_chat');
    const invalidAuth = buildFetchMock({ validAuth: false });
    global.fetch = invalidAuth.mock;
    const handler2 = loadHandler();
    const resInvalid = await handler2(makeEvent({ requestType: 'knowledge_chat', messages: [] }));
    ok(resInvalid.statusCode === 401, 'unauthorized bypass: ongeldige/verlopen sessie -> 401, ook voor knowledge_chat');
  }

  // ═══ forged tester flag rejected ═══
  {
    const forged = buildFetchMock({ systemRole: null, quotaState: {} }); // server-side: GEEN developer
    global.fetch = forged.mock;
    const handler = loadHandler();
    for (let i = 0; i < 5; i++) {
      await handler(makeEvent({ requestType: 'knowledge_chat', messages: [{ role: 'user', content: 'x' }] }));
    }
    // Client probeert een tester-vlag te vervalsen in de request-body -- de
    // server leest dit veld nergens uit de payload, dus dit mag geen effect hebben.
    const forgedRes = await handler(makeEvent({ requestType: 'knowledge_chat', isVerifiedTester: true, systemRole: 'developer', messages: [{ role: 'user', content: 'x' }] }));
    ok(forgedRes.statusCode === 429, 'forged tester flag rejected: een client-aangeleverd isVerifiedTester/systemRole in de payload heeft geen enkel effect -- nog steeds geweigerd');
    ok(coachSrc.indexOf('payloadVoorType.isVerifiedTester') === -1 && coachSrc.indexOf('payloadVoorType.systemRole') === -1 && coachSrc.indexOf('payloadVoorType.system_role') === -1,
      'forged tester flag rejected: coach.js leest system_role/isVerifiedTester nergens uit de client-payload (uitsluitend uit de server-side users-fetch)');
  }

  // ═══ preview cannot self-elevate / production policy intact / verified tester werkt ═══
  {
    const tester = buildFetchMock({ systemRole: 'developer', quotaState: {} });
    global.fetch = tester.mock;
    const handler = loadHandler();
    for (let i = 0; i < 5; i++) {
      const r = await handler(makeEvent({ requestType: 'knowledge_chat', messages: [{ role: 'user', content: 'x' }] }));
      ok(r.statusCode === 200, 'verified tester: call ' + (i + 1) + '/5 slaagt');
    }
    // Een normaal gebruikersplan zou hier al op 429 staan (zie eerdere test) --
    // een geverifieerde tester (server-side system_role=developer) gaat door.
    const overDeNormaleLimiet = await handler(makeEvent({ requestType: 'knowledge_chat', messages: [{ role: 'user', content: 'x' }] }));
    ok(overDeNormaleLimiet.statusCode === 200, 'verified tester: 6e call (voorbij het normale plafond van 5) slaagt alsnog -- quotumvrijstelling werkt');
    ok(tester.calls.some((c) => c.url.includes('/rest/v1/users?')), 'preview cannot self-elevate: system_role komt aantoonbaar uit een echte server-side databasequery, niet uit de client');
  }
  {
    // "production policy intact": een gewone (niet-tester) gebruiker blijft
    // na deze fix nog steeds normaal begrensd -- geen onbedoelde algehele
    // quotumopheffing voor iedereen.
    const normaal = buildFetchMock({ systemRole: null, quotaState: {} });
    global.fetch = normaal.mock;
    const handler = loadHandler();
    for (let i = 0; i < 5; i++) await handler(makeEvent({ requestType: 'chat', messages: [{ role: 'user', content: 'x' }] }));
    const res = await handler(makeEvent({ requestType: 'chat', messages: [{ role: 'user', content: 'x' }] }));
    ok(res.statusCode === 429, 'production policy intact: een normale (niet-tester) gebruiker blijft na 5 calls begrensd');
  }

  // ═══ Knowledge remains usable at quota=0 (FAQ/Wetenschap-pad blijft AI-vrij) ═══
  const faqFnMatch = html.match(/function voedingKennisFaqHtml\(topicId\)\{[\s\S]{0,600}?\n\}/);
  ok(!!faqFnMatch && faqFnMatch[0].indexOf('fetch(') === -1, 'Knowledge bruikbaar bij quota=0: de FAQ-tab doet nooit een AI-fetch, dus blijft altijd werken ongeacht quotumstatus');
  ok(html.indexOf('function voedingKennisWetenschapHtml') > -1 || html.indexOf('voedingKennisWetenschapHtml') > -1, 'Knowledge bruikbaar bij quota=0: de Wetenschap-tab blijft aanwezig/AI-onafhankelijk');

  // ═══ AI input correctly disabled at quota=0 / quota error UX ═══
  ok(html.indexOf('function voedingKennisAiDisableForQuota') > 0, 'AI input disabled at quota=0: de disable-functie bestaat');
  ok(html.indexOf("d.error.code==='QUOTA_EXCEEDED') voedingKennisAiDisableForQuota()") > 0, 'AI input disabled at quota=0: wordt aangeroepen specifiek bij QUOTA_EXCEEDED, niet bij elke fout');
  ok(/inp\.disabled=true/.test(html) && /btn\.disabled=true/.test(html), 'AI input disabled at quota=0: zowel het invoerveld als de knop worden uitgeschakeld');
  ok(html.indexOf("commercialErrorMessage(d.error,'de Kennis-AI')") > 0, 'quota error UX: de Kennis-AI-foutmelding noemt specifiek welke functie geraakt is');
  ok(html.indexOf("commercialErrorMessage(d.error,'de Trainingskompas Coach')") > 0, 'quota error UX: de Daily-Coach-foutmelding noemt specifiek welke functie geraakt is');
  ok(html.indexOf('Je hebt je maandelijkse limiet voor \'+label+\' bereikt') > 0, 'quota error UX: de generieke boodschap is nu feature-specifiek geparametriseerd');

  // ═══ existing AI Output Contract (regressie) ═══
  {
    const AIOutputContract = require('./aiOutputContract.js');
    ok(!AIOutputContract.validateAiOutputText('Jouw persoonlijke koolhydraatinname is 320 gram per dag.').valid, 'AI Output Contract: bestaande validatie blijft ongewijzigd van kracht na de quota-fix');
  }

  // ═══ security regression: privileged-column-trigger blijft correct (nu zonder de per-abuis toegevoegde is_super_admin-verwijzing) ═══
  ok(!coachSrc.match(/is_super_admin/), 'security regression: coach.js verwijst nergens naar is_super_admin (dat bestaat niet op public.users -- geen kapotte verwijzing meegesleept)');

  console.log('fAiQuotaForensicHardening: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}
run();
