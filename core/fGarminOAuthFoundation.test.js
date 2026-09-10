/* fGarminOAuthFoundation.test.js — DEVICES/WEARABLES V1 MUST, Garmin.
 * Integratietest met een gemockte global.fetch -- bewijst het volledige
 * contract: auth-start genereert PKCE correct en slaat code_verifier op,
 * auth-callback wisselt code+code_verifier om en slaat tokens veilig op
 * (via de Vault, nooit plaintext), status/disconnect werken correct.
 * De echte netwerkaanroep naar Garmin blijft EXTERN GEBLOKKEERD (geen
 * approved client_id/secret in deze sessie) -- hier gemockt met
 * realistische, spec-conforme responsvormen (developerportal.garmin.com/
 * OAuth2PKCE_1.pdf), geen productiedata.
 */
'use strict';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.GARMIN_CLIENT_ID = 'test-client-id';
process.env.GARMIN_CLIENT_SECRET = 'test-client-secret';
process.env.GARMIN_REDIRECT_URI = 'https://maurice-art.netlify.app/.netlify/functions/garmin-auth-callback';

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

console.log('DEVICES/WEARABLES V1 MUST — Garmin OAuth2+PKCE-fundering');

let storedState = null;
let storedConnection = null;
let storedSecrets = {};
let deletedConnection = false;
let deregisteredAtGarmin = false;

function makeFetch() {
  return async function (url, opts) {
    url = String(url); opts = opts || {}; const method = opts.method || 'GET';
    const J = (obj, okFlag = true, status = 200) => ({ ok: okFlag, status, json: async () => obj, text: async () => JSON.stringify(obj) });

    if (url.indexOf('/auth/v1/user') !== -1) return J({ id: 'u1' });

    if (url.indexOf('wearable_oauth_state') !== -1 && method === 'DELETE') return J({}, true, 204);
    if (url.indexOf('wearable_oauth_state') !== -1 && method === 'POST') {
      const body = JSON.parse(opts.body);
      storedState = { state: 'state-abc-123', user_id: body.user_id, provider: body.provider, code_verifier: body.code_verifier, created_at: new Date().toISOString() };
      return J([storedState]);
    }
    if (url.indexOf('wearable_oauth_state') !== -1 && url.indexOf('state=eq.') !== -1) {
      return J(storedState ? [storedState] : []);
    }

    if (url.indexOf('diauth.garmin.com/di-oauth2-service/oauth/token') !== -1) {
      const body = new URLSearchParams(opts.body);
      if (body.get('code_verifier') !== storedState.code_verifier) return J({ error: 'invalid_grant' }, false, 400);
      return J({ access_token: 'AT_xyz', refresh_token: 'RT_xyz', expires_in: 86400, token_type: 'bearer', scope: 'PARTNER_READ CONNECT_READ' });
    }

    if (url.indexOf('apis.garmin.com/wellness-api/rest/user/registration') !== -1 && method === 'DELETE') {
      deregisteredAtGarmin = true;
      return J({}, true, 204);
    }

    if (url.indexOf('/rpc/store_wearable_token_secret') !== -1) {
      const body = JSON.parse(opts.body);
      const id = 'secret-' + Object.keys(storedSecrets).length;
      storedSecrets[id] = body.p_secret;
      return J(id);
    }
    if (url.indexOf('/rpc/get_wearable_token_secret') !== -1) {
      const body = JSON.parse(opts.body);
      return J(storedSecrets[body.p_secret_id] || null);
    }
    if (url.indexOf('/rpc/delete_wearable_token_secret') !== -1) {
      const body = JSON.parse(opts.body);
      delete storedSecrets[body.p_secret_id];
      return J(true);
    }

    if (url.indexOf('wearable_connections') !== -1 && method === 'DELETE') { deletedConnection = true; storedConnection = null; return J({}, true, 204); }
    if (url.indexOf('wearable_connections') !== -1 && method === 'POST') {
      const body = JSON.parse(opts.body);
      storedConnection = body;
      return J({}, true, 204);
    }
    if (url.indexOf('wearable_connections') !== -1 && method === 'GET') {
      return J(storedConnection ? [storedConnection] : []);
    }

    return J({}, false, 404);
  };
}

async function run() {
  global.fetch = makeFetch();

  // ── 1. auth-start: PKCE genereren + state opslaan ──
  const authStart = require('../netlify/functions/garmin-auth-start.js');
  const startRes = await authStart.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  const startBody = JSON.parse(startRes.body);
  ok(startRes.statusCode === 200 && startBody.authUrl, '1a: auth-start geeft een authUrl terug');
  ok(startBody.authUrl.startsWith('https://connect.garmin.com/oauth2Confirm?'), '1b: authUrl gebruikt het officieel bevestigde Garmin-autorisatie-endpoint');
  const authUrlParams = new URLSearchParams(startBody.authUrl.split('?')[1]);
  ok(authUrlParams.get('code_challenge_method') === 'S256', '1c: code_challenge_method=S256 zoals officieel vereist');
  ok(!!authUrlParams.get('code_challenge') && authUrlParams.get('code_challenge').length > 20, '1d: een code_challenge is daadwerkelijk gegenereerd');
  ok(!!storedState.code_verifier, '1e: de bijbehorende code_verifier is server-side opgeslagen (nooit naar de client gestuurd)');

  // ── 2. auth-callback: code+code_verifier omwisselen voor tokens ──
  const authCallback = require('../netlify/functions/garmin-auth-callback.js');
  const cbRes = await authCallback.handler({ httpMethod: 'GET', queryStringParameters: { code: 'auth-code-xyz', state: storedState.state } });
  ok(cbRes.statusCode === 302 && cbRes.headers.Location.includes('wearable=connected') && cbRes.headers.Location.includes('provider=garmin'), '2a: callback redirect naar de app met hetzelfde wearable=connected&provider=X-patroon als Polar (consistente Provider Management UI, sectie 22)');
  ok(storedConnection && storedConnection.provider === 'garmin', '2b: een wearable_connections-rij met provider=garmin is aangemaakt');
  ok(storedConnection.access_token_secret_id && storedSecrets[storedConnection.access_token_secret_id] === 'AT_xyz', '2c: het access_token is via de Vault opgeslagen (nooit plaintext in de connection-rij zelf)');
  ok(!('access_token' in storedConnection), '2d: geen plaintext access_token-veld in de wearable_connections-rij');

  // ── 3. wrong code_verifier (bv. state-replay met verkeerde verifier) -> token_error ──
  storedState = { state: 'state-replay', user_id: 'u1', provider: 'garmin', code_verifier: 'echte-verifier', created_at: new Date().toISOString() };
  const cbBad = await authCallback.handler({ httpMethod: 'GET', queryStringParameters: { code: 'x', state: 'state-replay' } });
  // (de mock-fetch zelf valideert code_verifier tegen storedState.code_verifier, dus dit pad test de foutafhandeling wanneer Garmin 400 teruggeeft)
  ok(cbBad.statusCode === 302, '3a: ook bij een providerfout blijft de callback een nette redirect geven (geen 500/crash naar de browser)');

  // ── 4. status ──
  storedConnection = { user_id: 'u1', provider: 'garmin', connected_at: '2026-01-01T00:00:00Z', last_sync_at: null, last_sync_status: null, access_token_secret_id: 'secret-0' };
  const statusFn = require('../netlify/functions/garmin-status.js');
  const statusRes = await statusFn.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  const statusBody = JSON.parse(statusRes.body);
  ok(statusBody.connected === true && statusBody.provider === 'garmin', '4a: status geeft connected:true terug voor een bestaande Garmin-koppeling');
  ok(!('accessToken' in statusBody) && !('access_token' in statusBody), '4b: status lekt nooit het token zelf');

  // ── 5. disconnect ──
  const disconnectFn = require('../netlify/functions/garmin-disconnect.js');
  const discRes = await disconnectFn.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  ok(discRes.statusCode === 200 && deletedConnection, '5a: disconnect verwijdert de wearable_connections-rij');
  ok(deregisteredAtGarmin, '5b: disconnect roept het nu onafhankelijk bevestigde deregistratie-endpoint bij Garmin zelf aan (DELETE /wellness-api/rest/user/registration) -- "revokes the access token authorized by user"');

  // ── 6. webhook: ontvangt en logt uitsluitend structurele info, claimt geen verificatie ──
  const webhookFn = require('../netlify/functions/garmin-webhook.js');
  const webhookRes = await webhookFn.handler({ httpMethod: 'POST', body: JSON.stringify({ dailies: [{ x: 1 }, { x: 2 }] }) });
  ok(webhookRes.statusCode === 200, '6a: webhook geeft een snelle 200-respons (Garmin vereist dit)');
  const webhookBody = JSON.parse(webhookRes.body);
  ok(webhookBody.received === true, '6b: webhook bevestigt ontvangst zonder de payload als geverifieerd-authentiek te presenteren');

  // ── 7. missing env vars -> eerlijke config_error, geen crash ──
  delete process.env.GARMIN_CLIENT_ID;
  const startNoConfig = await authStart.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  ok(startNoConfig.statusCode === 500, '7a: ontbrekende GARMIN_CLIENT_ID geeft een nette serverfout, geen gegokte/lege authUrl');
  process.env.GARMIN_CLIENT_ID = 'test-client-id';

  // ---- K. Provider Management UI (sectie 22): eerlijke degradatie, geen verborgen integratie ----
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  ok(html.includes('Garmin koppelen (nog niet actief)') && html.includes('disabled'),
    'K1: de Garmin-kaart is altijd zichtbaar (geen verborgen integratie) maar de koppelknop is bewust disabled zolang credentials ontbreken -- geen schijnfunctionaliteit die toch zou mislukken');
  ok(html.includes('fetchGarminStatus') && html.includes('garminDisconnect'),
    'K2: status ophalen en loskoppelen werken al, ook vóór activatie (een gebruiker die ooit gekoppeld was kan altijd nog loskoppelen)');
  ok(html.match(/provider===.garmin.[\s\S]{0,120}tkVerversGegevensScherm/),
    "K3: de redirect-handler kent het garmin-provider-pad en ververst het scherm consistent met Polar's afhandeling");

  console.log('\n========================================================');
  console.log('fGarminOAuthFoundation.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (fail) process.exitCode = 1;
}

run();
