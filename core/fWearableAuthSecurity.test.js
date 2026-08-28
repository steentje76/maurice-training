/* fWearableAuthSecurity.test.js — P0-002 regressietest voor wearable-auth-start.js,
 * wearable-auth-callback.js, wearable-disconnect.js en wearable-status.js.
 * Gemockte global.fetch — geen echte Google/Supabase-call.
 */
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.GOOGLE_HEALTH_CLIENT_ID = 'cid';
process.env.GOOGLE_HEALTH_CLIENT_SECRET = 'csec';
process.env.GOOGLE_HEALTH_REDIRECT_URI = 'https://test.netlify.app/.netlify/functions/wearable-auth-callback';
process.env.APP_URL = 'https://test.netlify.app';

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m) { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }

let stateStore = {}; // state -> { user_id, created_at }
let connections = {}; // user_id -> connection row

function J(obj, okFlag = true, status = 200) { return { ok: okFlag, status, json: async () => obj, text: async () => JSON.stringify(obj) }; }

function baseFetch(callerId) {
  return async function (url, opts) {
    url = String(url); opts = opts || {}; const method = opts.method || 'GET';
    if (url.indexOf('/auth/v1/user') !== -1) {
      if (!callerId) return J({}, false, 401);
      return J({ id: callerId });
    }
    if (url.indexOf('/rest/v1/wearable_oauth_state') !== -1 && method === 'DELETE') {
      const stateParam = (url.split('state=eq.')[1] || '').split('&')[0];
      if (stateParam) delete stateStore[decodeURIComponent(stateParam)];
      else { // delete by user_id (cleanup in auth-start)
        Object.keys(stateStore).forEach(s => { if (stateStore[s].user_id === callerId) delete stateStore[s]; });
      }
      return J({}, true, 204);
    }
    if (url.indexOf('/rest/v1/wearable_oauth_state') !== -1 && method === 'POST') {
      const state = 'state-' + Math.random().toString(36).slice(2);
      const row = { state, user_id: callerId, created_at: new Date().toISOString() };
      stateStore[state] = row;
      return J([row]);
    }
    if (url.indexOf('/rest/v1/wearable_oauth_state?state=eq.') !== -1 && method === 'GET') {
      const state = decodeURIComponent(url.split('state=eq.')[1].split('&')[0]);
      const row = stateStore[state];
      return J(row ? [{ user_id: row.user_id, created_at: row.created_at }] : []);
    }
    if (url.indexOf('oauth2.googleapis.com/token') !== -1) {
      return J({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 });
    }
    if (url.indexOf('/rest/v1/wearable_connections') !== -1 && method === 'POST') {
      const b = JSON.parse(opts.body);
      connections[b.user_id] = b;
      return J({}, true, 201);
    }
    if (url.indexOf('/rest/v1/wearable_connections') !== -1 && method === 'GET') {
      const uid = decodeURIComponent((url.split('user_id=eq.')[1] || '').split('&')[0]);
      const row = connections[uid];
      return J(row ? [row] : []);
    }
    if (url.indexOf('/rest/v1/wearable_connections') !== -1 && method === 'DELETE') {
      const uid = decodeURIComponent((url.split('user_id=eq.')[1] || '').split('&')[0]);
      delete connections[uid];
      return J({}, true, 204);
    }
    if (url.indexOf('oauth2.googleapis.com/revoke') !== -1) return J({}, true, 200);
    return J({}, true, 200);
  };
}

const startMod = require('../netlify/functions/wearable-auth-start.js');
const callbackMod = require('../netlify/functions/wearable-auth-callback.js');
const disconnectMod = require('../netlify/functions/wearable-disconnect.js');
const statusMod = require('../netlify/functions/wearable-status.js');

function authReq(callerId, extra) { return Object.assign({ httpMethod: 'POST', headers: callerId ? { authorization: 'Bearer s-' + callerId } : {}, body: '{}' }, extra || {}); }

(async () => {
  // ===== START =====
  global.fetch = baseFetch(null);
  let res = await startMod.handler(authReq(null));
  eq(res.statusCode, 401, 'START 1: geen sessie -> 401, geen state aangemaakt');

  stateStore = {};
  global.fetch = baseFetch('u1');
  res = await startMod.handler(authReq('u1'));
  eq(res.statusCode, 200, 'START 2: geldige sessie -> 200');
  const body1 = JSON.parse(res.body);
  ok(body1.authUrl && body1.authUrl.indexOf('accounts.google.com') !== -1, 'START 3: authUrl gegenereerd');
  ok(Object.keys(stateStore).length === 1, 'START 4: precies 1 state-rij aangemaakt, gebonden aan de GEVERIFIEERDE user_id (niet client-input)');
  const boundState = Object.keys(stateStore)[0];
  eq(stateStore[boundState].user_id, 'u1', 'START 5: state is gebonden aan het server-geverifieerde user-id');

  // ===== CALLBACK =====
  // 6: ontbrekende state -> reject (redirect met invalid_request)
  global.fetch = baseFetch('u1');
  res = await callbackMod.handler({ queryStringParameters: { code: 'abc' } });
  ok(res.headers.Location.indexOf('invalid_request') !== -1, 'CALLBACK 6: ontbrekende state -> invalid_request-redirect');

  // 7: ongeldige/onbekende state -> reject (expired)
  res = await callbackMod.handler({ queryStringParameters: { code: 'abc', state: 'nonexistent-state' } });
  ok(res.headers.Location.indexOf('expired') !== -1, 'CALLBACK 7: onbekende state -> expired-redirect (fail closed)');

  // 8: state van een ANDERE gebruiker mag alleen aan diens eigen user_id gekoppeld worden
  //    (geen cross-user hijack: de callback heeft geen Authorization-header en vertrouwt
  //    uitsluitend op de server-aangemaakte state-rij, nooit op client-input)
  stateStore = {};
  global.fetch = baseFetch('slachtoffer');
  await startMod.handler(authReq('slachtoffer'));
  const victimState = Object.keys(stateStore)[0];
  connections = {};
  global.fetch = baseFetch(null); // callback zelf heeft geen auth-header nodig (by design)
  res = await callbackMod.handler({ queryStringParameters: { code: 'goodcode', state: victimState } });
  ok(res.headers.Location.indexOf('connected') !== -1, 'CALLBACK 8: geldige state -> normale flow werkt');
  eq(Object.keys(connections)[0], 'slachtoffer', 'CALLBACK 9: koppeling wordt opgeslagen op het user_id dat bij de STATE hoort, niet op client-input');

  // 10: state is eenmalig — tweede gebruik van dezelfde state faalt
  res = await callbackMod.handler({ queryStringParameters: { code: 'replay', state: victimState } });
  ok(res.headers.Location.indexOf('expired') !== -1, 'CALLBACK 10: hergebruik van dezelfde state (replay) wordt geblokkeerd (eenmalig, direct verwijderd)');

  // 11: verlopen state (>10 min oud) -> reject
  stateStore = {};
  global.fetch = baseFetch('u2');
  await startMod.handler(authReq('u2'));
  const oldState = Object.keys(stateStore)[0];
  stateStore[oldState].created_at = new Date(Date.now() - 15 * 60000).toISOString();
  res = await callbackMod.handler({ queryStringParameters: { code: 'x', state: oldState } });
  ok(res.headers.Location.indexOf('expired') !== -1, 'CALLBACK 11: state ouder dan 10 minuten -> expired');

  // 12: oauth-error van Google (denied) -> reject
  res = await callbackMod.handler({ queryStringParameters: { error: 'access_denied' } });
  ok(res.headers.Location.indexOf('denied') !== -1, 'CALLBACK 12: Google oauth-error -> denied-redirect');

  // ===== DISCONNECT =====
  connections = { u3: { access_token: 'AT3' } };
  global.fetch = baseFetch(null);
  res = await disconnectMod.handler(authReq(null));
  eq(res.statusCode, 401, 'DISCONNECT 13: geen sessie -> 401');

  global.fetch = baseFetch('u3');
  res = await disconnectMod.handler(authReq('u3'));
  eq(res.statusCode, 200, 'DISCONNECT 14: eigen sessie kan eigen connectie verwijderen');
  ok(!connections['u3'], 'DISCONNECT 15: connectie daadwerkelijk verwijderd (server-side, op basis van geverifieerd user-id)');

  // ===== STATUS =====
  connections = { u4: { connected_at: '2026-01-01', last_sync_at: null, last_sync_status: null } };
  global.fetch = baseFetch(null);
  res = await statusMod.handler(authReq(null));
  eq(res.statusCode, 401, 'STATUS 16: geen sessie -> 401');

  global.fetch = baseFetch('u4');
  res = await statusMod.handler(authReq('u4'));
  eq(res.statusCode, 200, 'STATUS 17: eigen status opvraagbaar');
  const statusBody = JSON.parse(res.body);
  eq(statusBody.connected, true, 'STATUS 18: connected=true voor eigen koppeling');
  ok(statusBody.access_token === undefined && statusBody.refresh_token === undefined, 'STATUS 19: tokens komen NOOIT voor in de statusresponse');

  global.fetch = baseFetch('u5'); // u5 heeft geen connectie
  res = await statusMod.handler(authReq('u5'));
  const statusBody2 = JSON.parse(res.body);
  eq(statusBody2.connected, false, 'STATUS 20: gebruiker zonder koppeling krijgt connected=false, geen data van anderen');

  console.log('fWearableAuthSecurity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
