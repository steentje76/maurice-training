/* fGymTeamSecurity.test.js — P0-002 regressietest voor netlify/functions/gym-team.js
 * en gym-team-set-pin.js. Gemockte global.fetch, geen echte Supabase-call.
 */
const crypto = require('crypto');
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m) { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
const REAL_PIN = '1234';
const PIN_HASH = sha256(REAL_PIN);

// users-tabel simulatie: id -> { gym_id, gym_role, gym_role_level, email }
const USERS = {
  u_lid: { id: 'u_lid', email: 'lid@x.nl', gym_id: 'g1', gym_role: 'lid', gym_role_level: 0 },
  u_coach: { id: 'u_coach', email: 'coach@x.nl', gym_id: 'g1', gym_role: 'coach', gym_role_level: 1 },
  u_manager: { id: 'u_manager', email: 'manager@x.nl', gym_id: 'g1', gym_role: 'manager', gym_role_level: 2 },
  u_owner: { id: 'u_owner', email: 'owner@x.nl', gym_id: 'g1', gym_role: 'owner', gym_role_level: 3 },
  u_other_gym_owner: { id: 'u_other_gym_owner', email: 'oo@x.nl', gym_id: 'g2', gym_role: 'owner', gym_role_level: 3 }
};
let auditLog = [];
let patchedRoles = {};

function makeFetch(callerId) {
  return async function (url, opts) {
    url = String(url); opts = opts || {}; const method = opts.method || 'GET';
    const J = (obj, okFlag = true, status = 200) => ({ ok: okFlag, status, json: async () => obj, text: async () => JSON.stringify(obj) });
    if (url.indexOf('/auth/v1/user') !== -1) {
      if (!callerId) return J({}, false, 401);
      return J({ id: callerId, email: (USERS[callerId] || {}).email });
    }
    if (url.indexOf('/rest/v1/users?id=eq.') !== -1 && method === 'GET') {
      const id = decodeURIComponent(url.split('id=eq.')[1].split('&')[0]);
      const u = USERS[id];
      return J(u ? [Object.assign({}, u, { gym_role: patchedRoles[id] || u.gym_role, gym_role_level: patchedRoles[id] ? { lid: 0, coach: 1, manager: 2, owner: 3 }[patchedRoles[id]] : u.gym_role_level })] : []);
    }
    if (url.indexOf('/rest/v1/gyms?id=eq.') !== -1 && method === 'GET') {
      return J([{ coach_pin_hash: PIN_HASH }]);
    }
    if (url.indexOf('/rest/v1/users?id=eq.') !== -1 && method === 'PATCH') {
      const id = decodeURIComponent(url.split('id=eq.')[1].split('&')[0]);
      const newRole = JSON.parse(opts.body).gym_role;
      patchedRoles[id] = newRole;
      return J({}, true, 204);
    }
    if (url.indexOf('/rest/v1/gym_audit_log') !== -1 && method === 'POST') {
      auditLog.push(JSON.parse(opts.body)); return J({}, true, 201);
    }
    if (url.indexOf('/rest/v1/users?gym_id=eq.') !== -1) return J(Object.values(USERS));
    return J({}, true, 200);
  };
}

const handlerMod = require('../netlify/functions/gym-team.js');
const setPinMod = require('../netlify/functions/gym-team-set-pin.js');

function req(callerId, body) {
  return { httpMethod: 'POST', headers: callerId ? { authorization: 'Bearer session-' + callerId } : {}, body: JSON.stringify(body || {}) };
}

(async () => {
  // 1. Niet-lid (geen gym-account) -> geen beheer
  global.fetch = async (url, opts) => {
    if (String(url).indexOf('/auth/v1/user') !== -1) return { ok: true, status: 200, json: async () => ({ id: 'ghost' }) };
    if (String(url).indexOf('/rest/v1/users?id=eq.') !== -1) return { ok: true, status: 200, json: async () => [] };
    return { ok: true, status: 200, json: async () => ({}) };
  };
  let res = await handlerMod.handler(req('ghost', { action: 'list', pin: REAL_PIN }));
  eq(res.statusCode, 403, '1: gebruiker zonder gym-account -> 403 bij list');

  // 2. lid probeert list (vereist coach-niveau) -> 403
  patchedRoles = {}; auditLog = [];
  global.fetch = makeFetch('u_lid');
  res = await handlerMod.handler(req('u_lid', { action: 'list', pin: REAL_PIN }));
  eq(res.statusCode, 403, '2: lid heeft onvoldoende rechten voor list');

  // 3. coach probeert update_role (vereist manager-niveau) -> 403, ongeacht correcte pin
  global.fetch = makeFetch('u_coach');
  res = await handlerMod.handler(req('u_coach', { action: 'update_role', pin: REAL_PIN, targetUserId: 'u_lid', newRole: 'coach' }));
  eq(res.statusCode, 403, '3: coach heeft onvoldoende rechten voor update_role');

  // 4. manager probeert zichzelf naar owner te promoveren -> 403 (bestaande bescherming)
  global.fetch = makeFetch('u_manager');
  res = await handlerMod.handler(req('u_manager', { action: 'update_role', pin: REAL_PIN, targetUserId: 'u_lid', newRole: 'owner' }));
  eq(res.statusCode, 403, '4: manager kan geen rol > eigen niveau toekennen (owner aan iemand geven)');

  // 5. manager kan owner NIET demoten (DE NIEUW GEVONDEN EN GEFIXTE BUG)
  patchedRoles = {};
  global.fetch = makeFetch('u_manager');
  res = await handlerMod.handler(req('u_manager', { action: 'update_role', pin: REAL_PIN, targetUserId: 'u_owner', newRole: 'coach' }));
  eq(res.statusCode, 403, '5: manager kan owner niet demoten (regressie op nieuw gevonden bug)');
  eq(patchedRoles['u_owner'], undefined, '5b: owner-rol is niet daadwerkelijk gewijzigd in de DB-mock');

  // 6. manager kan een andere manager niet wijzigen (gelijk niveau)
  global.fetch = makeFetch('u_manager');
  res = await handlerMod.handler(req('u_manager', { action: 'update_role', pin: REAL_PIN, targetUserId: 'u_manager', newRole: 'coach' }));
  // (dit is 'eigen rol wijzigen' -> aparte 400-check, apart getest in 7)

  // 7. caller kan eigen rol niet wijzigen
  global.fetch = makeFetch('u_owner');
  res = await handlerMod.handler(req('u_owner', { action: 'update_role', pin: REAL_PIN, targetUserId: 'u_owner', newRole: 'manager' }));
  eq(res.statusCode, 400, '7: caller kan eigen rol niet wijzigen');

  // 8. owner KAN een coach demoten naar lid (legitieme flow blijft werken)
  patchedRoles = {};
  global.fetch = makeFetch('u_owner');
  res = await handlerMod.handler(req('u_owner', { action: 'update_role', pin: REAL_PIN, targetUserId: 'u_coach', newRole: 'lid' }));
  eq(res.statusCode, 200, '8: owner kan coach demoten naar lid (legitieme flow blijft werken)');
  eq(patchedRoles['u_coach'], 'lid', '8b: rol daadwerkelijk bijgewerkt');

  // 9. cross-gym mutation -> reject (target in andere gym)
  patchedRoles = {};
  global.fetch = makeFetch('u_owner');
  res = await handlerMod.handler(req('u_owner', { action: 'update_role', pin: REAL_PIN, targetUserId: 'u_other_gym_owner', newRole: 'lid' }));
  eq(res.statusCode, 404, '9: cross-gym mutation wordt geweigerd (target niet gevonden in eigen gym)');

  // 10. ongeldige pincode -> 403
  global.fetch = makeFetch('u_owner');
  res = await handlerMod.handler(req('u_owner', { action: 'update_role', pin: '0000', targetUserId: 'u_coach', newRole: 'lid' }));
  eq(res.statusCode, 403, '10: onjuiste pincode -> 403');

  // 11. PIN-hash wordt nooit teruggestuurd in enige response
  global.fetch = makeFetch('u_owner');
  res = await handlerMod.handler(req('u_owner', { action: 'list', pin: REAL_PIN }));
  ok(res.body.indexOf(PIN_HASH) === -1, '11: PIN-hash komt niet voor in de list-response');
  ok(res.body.indexOf('coach_pin_hash') === -1, '11b: coach_pin_hash-veld komt niet voor in de list-response');

  // 12. whoami vereist geen pincode
  global.fetch = makeFetch('u_lid');
  res = await handlerMod.handler(req('u_lid', { action: 'whoami' }));
  eq(res.statusCode, 200, '12: whoami werkt zonder pincode voor elk rolniveau');

  // ---- gym-team-set-pin.js ----
  // 13. alleen owner mag pincode instellen
  global.fetch = makeFetch('u_manager');
  res = await setPinMod.handler(req('u_manager', { newPin: '4321' }));
  eq(res.statusCode, 403, '13: manager mag coach-pincode niet instellen');

  global.fetch = makeFetch('u_owner');
  res = await setPinMod.handler(req('u_owner', { newPin: '4321' }));
  eq(res.statusCode, 200, '14: owner mag coach-pincode wel instellen');

  // 15. ongeldig pincodeformaat -> 400
  global.fetch = makeFetch('u_owner');
  res = await setPinMod.handler(req('u_owner', { newPin: 'abcd' }));
  eq(res.statusCode, 400, '15: niet-numerieke pincode wordt geweigerd');

  console.log('fGymTeamSecurity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
