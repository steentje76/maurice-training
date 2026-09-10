/* fOuraIntegration.test.js — DEVICES/WEARABLES V1 MUST, Oura.
 * Integratietest met een gemockte global.fetch. De echte netwerkaanroep
 * naar Oura blijft extern geblokkeerd (geen credentials in deze sessie)
 * -- hier gemockt met realistische, spec-conforme responsvormen
 * (cloud.ouraring.com, verbatim teruggevonden schema's).
 */
'use strict';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.OURA_CLIENT_ID = 'test-client-id';
process.env.OURA_CLIENT_SECRET = 'test-client-secret';
process.env.OURA_REDIRECT_URI = 'https://maurice-art.netlify.app/.netlify/functions/oura-auth-callback';

let pass = 0, fail = 0;
const msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push(m); } }

console.log('DEVICES/WEARABLES V1 MUST — Oura OAuth2-fundering');

let storedState = null;
let storedConnection = null;
let storedSecrets = {};
let deletedConnection = false;
let storedActivities = [];
let revokeCalledWith = null;

function makeFetch() {
  return async function (url, opts) {
    url = String(url); opts = opts || {}; const method = opts.method || 'GET';
    const J = (obj, okFlag = true, status = 200) => ({ ok: okFlag, status, json: async () => obj, text: async () => JSON.stringify(obj) });

    if (url.indexOf('/auth/v1/user') !== -1) return J({ id: 'u1' });

    if (url.indexOf('wearable_oauth_state') !== -1 && method === 'DELETE') return J({}, true, 204);
    if (url.indexOf('wearable_oauth_state') !== -1 && method === 'POST') {
      const body = JSON.parse(opts.body);
      storedState = { state: 'state-oura-1', user_id: body.user_id, provider: body.provider, created_at: new Date().toISOString() };
      return J([storedState]);
    }
    if (url.indexOf('wearable_oauth_state') !== -1 && url.indexOf('state=eq.') !== -1) {
      return J(storedState ? [storedState] : []);
    }

    if (url.indexOf('api.ouraring.com/oauth/token') !== -1) {
      return J({ access_token: 'AT_oura', refresh_token: 'RT_oura', expires_in: 86400, token_type: 'bearer', scope: 'daily heartrate workout' });
    }
    if (url.indexOf('api.ouraring.com/oauth/revoke') !== -1) {
      revokeCalledWith = url;
      return J({}, true, 200);
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
    if (url.indexOf('wearable_connections') !== -1 && method === 'PATCH') { return J({}, true, 204); }
    if (url.indexOf('wearable_connections') !== -1 && method === 'GET') {
      return J(storedConnection ? [storedConnection] : []);
    }

    if (url.indexOf('api.ouraring.com/v2/usercollection/workout') !== -1) {
      // Verbatim-afgeleide respons-vorm (cloud.ouraring.com/v2/docs +
      // meerdere onafhankelijke clientbibliotheken), inclusief een echt
      // teruggevonden, niet-mapbaar sporttype ("tableTennis").
      return J({
        data: [
          { id: 'o1', activity: 'running', calories: 300, distance: 8000, start_datetime: '2026-08-01T06:00:00-05:00', end_datetime: '2026-08-01T06:45:00-05:00', intensity: 'moderate', source: 'confirmed' },
          { id: 'o2', activity: 'tableTennis', calories: 150, distance: null, start_datetime: '2026-08-02T18:00:00-05:00', end_datetime: '2026-08-02T19:00:00-05:00', intensity: 'moderate', source: 'confirmed' }
        ],
        next_token: null
      });
    }
    if (url.indexOf('/rest/v1/activities') !== -1 && method === 'POST') {
      const body = JSON.parse(opts.body);
      storedActivities.push(body);
      return J({}, true, 201);
    }

    return J({}, false, 404);
  };
}

async function run() {
  global.fetch = makeFetch();

  const authStart = require('../netlify/functions/oura-auth-start.js');
  const startRes = await authStart.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  const startBody = JSON.parse(startRes.body);
  ok(startRes.statusCode === 200 && startBody.authUrl, '1a: auth-start geeft een authUrl terug');
  ok(startBody.authUrl.startsWith('https://cloud.ouraring.com/oauth/authorize?'), '1b: authUrl gebruikt het officieel bevestigde Oura-autorisatie-endpoint');
  ok(!!storedState.state, '1c: een state is server-side aangemaakt vóór de redirect');

  const authCallback = require('../netlify/functions/oura-auth-callback.js');
  const cbRes = await authCallback.handler({ httpMethod: 'GET', queryStringParameters: { code: 'auth-code-xyz', state: storedState.state } });
  ok(cbRes.statusCode === 302 && cbRes.headers.Location.includes('wearable=connected') && cbRes.headers.Location.includes('provider=oura'), '2a: callback redirect met wearable=connected&provider=oura');
  ok(storedConnection && storedConnection.provider === 'oura', '2b: een wearable_connections-rij met provider=oura is aangemaakt');
  ok(storedConnection.access_token_secret_id && storedSecrets[storedConnection.access_token_secret_id] === 'AT_oura', '2c: het access_token is via de Vault opgeslagen');
  ok(!('access_token' in storedConnection), '2d: geen plaintext access_token-veld in de connection-rij');

  storedConnection = { user_id: 'u1', provider: 'oura', access_token_secret_id: 'secret-0', refresh_token_secret_id: 'secret-1', token_expires_at: new Date(Date.now() + 3600000).toISOString(), last_sync_at: null, last_sync_status: null };
  const syncFn = require('../netlify/functions/oura-sync.js');
  const syncRes = await syncFn.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  const syncBody = JSON.parse(syncRes.body);
  ok(syncRes.statusCode === 200 && syncBody.synced === true, '3a: sync slaagt');
  ok(syncBody.imported === 1, '3b: exact 1 workout geimporteerd (running) -- de andere (tableTennis, niet-mapbaar) wordt overgeslagen, nooit geforceerd');
  ok(syncBody.skipped === 1, '3c: 1 workout correct overgeslagen');
  ok(storedActivities.length === 1 && storedActivities[0].sport === 'running', '3d: het canonieke sportveld is correct gezet');
  ok(storedActivities[0].source_provenance === 'provider_derived' && storedActivities[0].source_provider === 'oura', '3e: source_provenance/source_provider gebruiken de toegestane enum-waarden');
  ok(storedActivities[0].duration_seconds === 2700, '3f: duur correct berekend uit start/end (45 minuten = 2700s)');
  ok(storedActivities[0].dedupe_key === 'oura-workout-o1', '3g: dedupe_key is stabiel en workout-id-gebaseerd');
  ok(storedActivities[0].distance_meters === 8000, '3h: afstand correct overgenomen');

  const statusFn = require('../netlify/functions/oura-status.js');
  const statusRes = await statusFn.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  const statusBody = JSON.parse(statusRes.body);
  ok(statusBody.connected === true && statusBody.provider === 'oura', '4a: status geeft connected:true terug');
  ok(!('accessToken' in statusBody) && !('access_token' in statusBody), '4b: status lekt nooit het token zelf');

  const disconnectFn = require('../netlify/functions/oura-disconnect.js');
  const discRes = await disconnectFn.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  ok(discRes.statusCode === 200 && deletedConnection, '5a: disconnect verwijdert de wearable_connections-rij');
  ok(!!revokeCalledWith && revokeCalledWith.includes('oauth/revoke') && revokeCalledWith.includes('AT_oura'), '5b: disconnect roept het officieel bevestigde revoke-endpoint aan met het juiste access_token -- beter bevestigd dan bij WHOOP/Garmin, dus hier wél daadwerkelijk aangeroepen');

  delete process.env.OURA_CLIENT_ID;
  const startNoConfig = await authStart.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  ok(startNoConfig.statusCode === 500, '6a: ontbrekende OURA_CLIENT_ID geeft een nette serverfout');
  process.env.OURA_CLIENT_ID = 'test-client-id';

  console.log('\n========================================================');
  console.log('fOuraIntegration.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (fail) { msgs.forEach(m => console.error('MISLUKT: ' + m)); process.exitCode = 1; }
}

run();
