/* fDeleteAccountSecurity.test.js — P0-002 regressietest voor netlify/functions/delete-account.js.
 * Gemockte global.fetch. GEEN echte verwijdering ergens.
 */
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m) { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }

let deletedByTableAndUser = []; // {table, userId}
let adminDeleteCalls = [];

function J(obj, okFlag = true, status = 200) { return { ok: okFlag, status, json: async () => obj, text: async () => JSON.stringify(obj) }; }

function makeFetch(callerId) {
  return async function (url, opts) {
    url = String(url); opts = opts || {}; const method = opts.method || 'GET';
    if (url.indexOf('/auth/v1/user') !== -1) {
      if (!callerId) return J({}, false, 401);
      return J({ id: callerId });
    }
    if (url.indexOf('/auth/v1/admin/users/') !== -1 && method === 'DELETE') {
      const uid = url.split('/auth/v1/admin/users/')[1];
      adminDeleteCalls.push(uid);
      return J({}, true, 200);
    }
    if (method === 'DELETE' && url.indexOf('/rest/v1/') !== -1) {
      const table = url.split('/rest/v1/')[1].split('?')[0];
      const userIdMatch = url.match(/user_id=eq\.([^&]+)/) || url.match(/created_by=eq\.([^&]+)/) || url.match(/[?&]id=eq\.([^&]+)/) || url.match(/shared_with=eq\.([^&]+)/) || url.match(/shared_by=eq\.([^&]+)/);
      deletedByTableAndUser.push({ table, userId: userIdMatch ? decodeURIComponent(userIdMatch[1]) : null });
      return J({}, true, 204);
    }
    return J({}, true, 200);
  };
}

const handlerMod = require('../netlify/functions/delete-account.js');
function req(callerId) { return { httpMethod: 'POST', headers: callerId ? { authorization: 'Bearer s-' + callerId } : {} }; }

(async () => {
  // 1. unauthenticated -> reject, GEEN enkele delete-call uitgevoerd
  deletedByTableAndUser = []; adminDeleteCalls = [];
  global.fetch = makeFetch(null);
  let res = await handlerMod.handler(req(null));
  eq(res.statusCode, 401, '1: unauthenticated -> 401');
  eq(deletedByTableAndUser.length, 0, '1b: geen enkele tabel-delete uitgevoerd zonder sessie');
  eq(adminDeleteCalls.length, 0, '1c: geen admin-account-delete uitgevoerd zonder sessie');

  // 2. authenticated user kan UITSLUITEND het eigen, server-geverifieerde account
  //    laten verwijderen — er is geen enkel request-veld waarmee een ander
  //    user-id kan worden opgegeven (de handler leest userId altijd uit de
  //    Supabase-sessie zelf, nooit uit event.body).
  deletedByTableAndUser = []; adminDeleteCalls = [];
  global.fetch = makeFetch('victim-id'); // sessie hoort bij 'victim-id', ongeacht wat een event.body zou beweren
  res = await handlerMod.handler(req('victim-id'));
  eq(res.statusCode, 200, '2: geldige eigen sessie -> 200');
  eq(adminDeleteCalls, ['victim-id'], '2b: alleen het EIGEN, server-geverifieerde account wordt verwijderd (user A kan user B niet targeten, want er is geen client-input voor het doel-id)');
  ok(deletedByTableAndUser.every(d => d.userId === 'victim-id' || d.userId === null), '2c: alle tabel-deletes zijn gescoped op het geverifieerde eigen user-id');

  // 3. service-role blijft uitsluitend server-side (nooit teruggegeven aan de client)
  ok(JSON.stringify(res.body || '').indexOf('test-service-key') === -1, '3: service-role-key lekt niet in de response');

  // 4. ontbrekende/ongeldige identity (Supabase geeft user zonder id terug) -> fail closed
  deletedByTableAndUser = []; adminDeleteCalls = [];
  global.fetch = async (url) => {
    if (String(url).indexOf('/auth/v1/user') !== -1) return J({ /* geen id */ });
    return J({}, true, 200);
  };
  res = await handlerMod.handler(req('whatever'));
  eq(res.statusCode, 401, '4: sessie zonder vaststelbaar user-id -> fail closed (401)');
  eq(deletedByTableAndUser.length, 0, '4b: geen enkele delete uitgevoerd zonder vaststelbaar user-id');

  // 5. verkeerde HTTP-methode -> 405, geen enkele actie
  deletedByTableAndUser = []; adminDeleteCalls = [];
  res = await handlerMod.handler({ httpMethod: 'GET', headers: {} });
  eq(res.statusCode, 405, '5: GET -> 405');
  eq(deletedByTableAndUser.length + adminDeleteCalls.length, 0, '5b: geen enkele actie bij verkeerde methode');

  // 6. persoonlijke content_shares (beide richtingen) worden meegenomen
  deletedByTableAndUser = []; adminDeleteCalls = [];
  global.fetch = makeFetch('u9');
  res = await handlerMod.handler(req('u9'));
  const csDeletes = deletedByTableAndUser.filter(d => d.table.indexOf('content_shares') === 0);
  ok(csDeletes.length >= 2, '6: content_shares wordt in beide richtingen (shared_by EN shared_with) opgeruimd');

  console.log('fDeleteAccountSecurity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
