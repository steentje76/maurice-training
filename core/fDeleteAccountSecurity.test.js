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

  // 7. F9 (Social & Community) — bevinding uit de F9 Final Integration Audit:
  // deze tien tabellen ontbraken oorspronkelijk volledig in delete-account.js.
  // Vier hebben een standaard user_id-kolom (via USER_DATA_TABLES); zes hebben
  // afwijkende/dubbele eigenaarskolommen en moeten per kolomnaam voorkomen.
  deletedByTableAndUser = []; adminDeleteCalls = [];
  global.fetch = makeFetch('u10');
  res = await handlerMod.handler(req('u10'));
  const f9StandaardTabellen = ['social_profiles', 'social_group_memberships', 'social_challenge_participants'];
  f9StandaardTabellen.forEach(function (t) {
    ok(deletedByTableAndUser.some(function (d) { return d.table === t; }), '7a: ' + t + ' wordt opgeruimd (standaard user_id-kolom)');
  });
  const f9DubbeleKolomTabellen = {
    social_connections: ['follower_id', 'followee_id'],
    social_blocks: ['blocker_id', 'blocked_id'],
    social_reports: ['reporter_user_id', 'target_user_id'],
    social_notifications: ['recipient_id', 'actor_id']
  };
  Object.keys(f9DubbeleKolomTabellen).forEach(function (t) {
    const treffers = deletedByTableAndUser.filter(function (d) { return d.table === t; });
    ok(treffers.length >= f9DubbeleKolomTabellen[t].length, '7b: ' + t + ' wordt in beide richtingen opgeruimd (' + f9DubbeleKolomTabellen[t].join('/') + ')');
  });
  ['social_groups', 'social_challenges', 'social_shared_activities'].forEach(function (t) {
    ok(deletedByTableAndUser.some(function (d) { return d.table === t; }), '7c: ' + t + ' wordt opgeruimd (eigen aangemaakte objecten)');
  });

  // 8. MS-F10-01 (Coach Consent & Permissions) — coach_athlete_relationships
  // heeft twee niet-standaard kolommen (coach_user_id/athlete_user_id) en
  // moet daarom, net als de F9-tabellen, in beide richtingen expliciet
  // opgeruimd worden (ook al is dit al via ON DELETE CASCADE afgedekt --
  // hier voor auditeerbaarheid getest, exact het race_segments-patroon).
  // coach_access_scopes heeft geen eigen user-kolom en hoeft hier niet apart
  // getest te worden (tweede-niveau CASCADE via de relatie zelf).
  deletedByTableAndUser = []; adminDeleteCalls = [];
  global.fetch = makeFetch('u11');
  res = await handlerMod.handler(req('u11'));
  const carTreffers = deletedByTableAndUser.filter(function (d) { return d.table === 'coach_athlete_relationships'; });
  ok(carTreffers.length >= 2, '8: coach_athlete_relationships wordt in beide richtingen opgeruimd (coach_user_id/athlete_user_id)');

  console.log('fDeleteAccountSecurity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
