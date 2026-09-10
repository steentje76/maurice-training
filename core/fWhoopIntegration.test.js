/* fWhoopIntegration.test.js — DEVICES/WEARABLES V1 MUST, WHOOP.
 * Integratietest met een gemockte global.fetch -- bewijst het volledige
 * contract: auth-start/auth-callback/sync/status/disconnect. De echte
 * netwerkaanroep naar WHOOP blijft extern geblokkeerd (geen credentials in
 * deze sessie) -- hier gemockt met realistische, spec-conforme
 * responsvormen (developer.whoop.com, verbatim teruggevonden schema's).
 */
'use strict';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.WHOOP_CLIENT_ID = 'test-client-id';
process.env.WHOOP_CLIENT_SECRET = 'test-client-secret';
process.env.WHOOP_REDIRECT_URI = 'https://maurice-art.netlify.app/.netlify/functions/whoop-auth-callback';

let pass = 0, fail = 0;
const msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push(m); } }

console.log('DEVICES/WEARABLES V1 MUST — WHOOP OAuth2-fundering');

let storedState = null;
let storedConnection = null;
let storedSecrets = {};
let deletedConnection = false;
let storedActivities = [];

function makeFetch() {
  return async function (url, opts) {
    url = String(url); opts = opts || {}; const method = opts.method || 'GET';
    const J = (obj, okFlag = true, status = 200) => ({ ok: okFlag, status, json: async () => obj, text: async () => JSON.stringify(obj) });

    if (url.indexOf('/auth/v1/user') !== -1) return J({ id: 'u1' });

    if (url.indexOf('wearable_oauth_state') !== -1 && method === 'DELETE') return J({}, true, 204);
    if (url.indexOf('wearable_oauth_state') !== -1 && method === 'POST') {
      const body = JSON.parse(opts.body);
      storedState = { state: 'state-whoop-1', user_id: body.user_id, provider: body.provider, created_at: new Date().toISOString() };
      return J([storedState]);
    }
    if (url.indexOf('wearable_oauth_state') !== -1 && url.indexOf('state=eq.') !== -1) {
      return J(storedState ? [storedState] : []);
    }

    if (url.indexOf('api.prod.whoop.com/oauth/oauth2/token') !== -1) {
      return J({ access_token: 'AT_whoop', refresh_token: 'RT_whoop', expires_in: 3600, token_type: 'bearer', scope: 'offline read:workout' });
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

    if (url.indexOf('api.prod.whoop.com/developer/v2/activity/workout') !== -1) {
      // Verbatim-afgeleide respons-vorm (developer.whoop.com/api/), inclusief
      // een ongescoorde workout (moet overgeslagen worden) en een niet-
      // mapbaar sporttype (moet ook overgeslagen worden).
      return J({
        records: [
          { id: 'w1', user_id: 9012, start: '2026-08-01T06:00:00.000Z', end: '2026-08-01T06:45:00.000Z', sport_name: 'running', score_state: 'SCORED', score: { average_heart_rate: 150, distance_meter: 8000 } },
          { id: 'w2', user_id: 9012, start: '2026-08-02T06:00:00.000Z', end: '2026-08-02T07:00:00.000Z', sport_name: 'weightlifting', score_state: 'SCORED', score: { average_heart_rate: 110 } },
          { id: 'w3', user_id: 9012, start: '2026-08-03T06:00:00.000Z', end: null, sport_name: 'cycling', score_state: 'PENDING_SCORE', score: null }
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

  const authStart = require('../netlify/functions/whoop-auth-start.js');
  const startRes = await authStart.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  const startBody = JSON.parse(startRes.body);
  ok(startRes.statusCode === 200 && startBody.authUrl, '1a: auth-start geeft een authUrl terug');
  ok(startBody.authUrl.startsWith('https://api.prod.whoop.com/oauth/oauth2/auth?'), '1b: authUrl gebruikt het officieel bevestigde WHOOP-autorisatie-endpoint');
  ok(startBody.authUrl.includes('read%3Aworkout') || startBody.authUrl.includes('read:workout'), '1c: de gevraagde scopes bevatten read:workout');
  ok(!!storedState.state, '1d: een state is server-side aangemaakt vóór de redirect');

  const authCallback = require('../netlify/functions/whoop-auth-callback.js');
  const cbRes = await authCallback.handler({ httpMethod: 'GET', queryStringParameters: { code: 'auth-code-xyz', state: storedState.state } });
  ok(cbRes.statusCode === 302 && cbRes.headers.Location.includes('wearable=connected') && cbRes.headers.Location.includes('provider=whoop'), '2a: callback redirect met wearable=connected&provider=whoop');
  ok(storedConnection && storedConnection.provider === 'whoop', '2b: een wearable_connections-rij met provider=whoop is aangemaakt');
  ok(storedConnection.access_token_secret_id && storedSecrets[storedConnection.access_token_secret_id] === 'AT_whoop', '2c: het access_token is via de Vault opgeslagen');
  ok(!('access_token' in storedConnection), '2d: geen plaintext access_token-veld in de connection-rij');

  storedConnection = { user_id: 'u1', provider: 'whoop', access_token_secret_id: 'secret-0', refresh_token_secret_id: 'secret-1', token_expires_at: new Date(Date.now() + 3600000).toISOString(), last_sync_at: null, last_sync_status: null };
  const syncFn = require('../netlify/functions/whoop-sync.js');
  const syncRes = await syncFn.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  const syncBody = JSON.parse(syncRes.body);
  ok(syncRes.statusCode === 200 && syncBody.synced === true, '3a: sync slaagt');
  ok(syncBody.imported === 1, '3b: exact 1 workout geimporteerd (running, SCORED) -- de andere twee (niet-mapbaar sporttype resp. ongescoord) worden overgeslagen');
  ok(syncBody.skipped === 2, '3c: 2 workouts correct overgeslagen (weightlifting mapt niet naar het canonieke enum; cycling is nog niet SCORED)');
  ok(storedActivities.length === 1 && storedActivities[0].sport === 'running', '3d: de geimporteerde activiteit heeft het canonieke sportveld correct gezet');
  ok(storedActivities[0].source_provenance === 'provider_derived' && storedActivities[0].source_provider === 'whoop', '3e: source_provenance/source_provider gebruiken de daadwerkelijke, toegestane enum-waarden');
  ok(storedActivities[0].data_quality === 'unverified', '3f: data_quality gebruikt een toegestane enum-waarde');
  ok(storedActivities[0].duration_seconds === 2700, '3g: duur correct berekend uit start/end (45 minuten = 2700s)');
  ok(storedActivities[0].dedupe_key === 'whoop-workout-w1', '3h: dedupe_key is stabiel en workout-id-gebaseerd');

  const statusFn = require('../netlify/functions/whoop-status.js');
  const statusRes = await statusFn.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  const statusBody = JSON.parse(statusRes.body);
  ok(statusBody.connected === true && statusBody.provider === 'whoop', '4a: status geeft connected:true terug');
  ok(!('accessToken' in statusBody) && !('access_token' in statusBody), '4b: status lekt nooit het token zelf');

  const disconnectFn = require('../netlify/functions/whoop-disconnect.js');
  const discRes = await disconnectFn.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  ok(discRes.statusCode === 200 && deletedConnection, '5a: disconnect verwijdert de wearable_connections-rij');

  delete process.env.WHOOP_CLIENT_ID;
  const startNoConfig = await authStart.handler({ httpMethod: 'POST', headers: { authorization: 'Bearer sess' } });
  ok(startNoConfig.statusCode === 500, '6a: ontbrekende WHOOP_CLIENT_ID geeft een nette serverfout');
  process.env.WHOOP_CLIENT_ID = 'test-client-id';

  console.log('\n========================================================');
  console.log('fWhoopIntegration.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (fail) { msgs.forEach(m => console.error('MISLUKT: ' + m)); process.exitCode = 1; }
}

run();
