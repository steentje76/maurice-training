// MS-BETA-01 Slice C — governed triage voor in-app beta-feedback (lijst + statusovergang).
// Autorisatie: uitsluitend het BESTAANDE platformrolmodel users.system_role ('support','developer'),
// server-side opgehaald met service_role — zelfde patroon als coach.js. 'tester' en gewone gebruikers: 403.
// De rol komt NOOIT uit de client. users.system_role is door protect_privileged_user_columns() alleen
// via service_role te wijzigen.
// Statusovergang: huidige status wordt server-side gelezen, de gevraagde overgang wordt gevalideerd met het
// canonieke contract (core/betaFeedback.js canTransition), en de PATCH is conditioneel op de gelezen status
// (optimistic concurrency: 0 rijen -> 409). Alleen status/duplicate_of/status_updated_* worden geschreven.
// De lijst toont geen user_id of accountinformatie en geen technische context.
const BetaFeedback = require('../../core/betaFeedback.js');
const TRIAGE_ROLES = ['support', 'developer'];
const MAX_BYTES = 2048, LIST_LIMIT = 100, WINDOW_MS = 60 * 1000, MAX_PER_WINDOW = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_FIELDS = 'id,created_at,category,status,description,reproduction_steps,redactions,duplicate_of,status_updated_at';
const ALLOWED_KEYS = { list: ['action'], transition: ['action', 'id', 'to', 'duplicate_of'] };
const rate = Object.create(null);
function reply(code, obj) { return { statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) }; }
function limited(k, now) { const e = rate[k]; if (!e || now - e.start > WINDOW_MS) { rate[k] = { start: now, count: 1 }; return false; } e.count++; return e.count > MAX_PER_WINDOW; }
async function userFromToken(token, base, anonKey, fetchFn) {
  if (!token || !/^Bearer\s+\S+/.test(token)) return null;
  try { const r = await fetchFn(base + '/auth/v1/user', { headers: { Authorization: token, apikey: anonKey } }); if (!r || !r.ok) return null;
    const u = await r.json(); return (u && typeof u.id === 'string' && UUID.test(u.id)) ? u.id : null; } catch (e) { return null; }
}
async function systemRole(uid, base, sh, fetchFn) {
  const r = await fetchFn(base + '/rest/v1/users?id=eq.' + encodeURIComponent(uid) + '&select=system_role&limit=1', { headers: sh });
  if (!r || !r.ok) throw new Error('role_lookup_failed');
  const rows = await r.json();
  return (Array.isArray(rows) && rows[0] && typeof rows[0].system_role === 'string') ? rows[0].system_role : null;
}
async function handle(event, deps) {
  const env = deps.env || {}, fetchFn = deps.fetch, now = deps.now || Date.now;
  if (!event || event.httpMethod !== 'POST') return reply(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  const base = env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co', service = env.SUPABASE_SERVICE_ROLE_KEY,
    anon = env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  if (!service || typeof fetchFn !== 'function') return reply(503, { ok: false, error: 'NOT_CONFIGURED' });
  const sh = { apikey: service, Authorization: 'Bearer ' + service };
  try {
    const raw = event.body || '';
    if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) return reply(413, { ok: false, error: 'PAYLOAD_TOO_LARGE' });
    const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
    const uid = await userFromToken(auth, base, anon, fetchFn);
    if (!uid) return reply(401, { ok: false, error: 'UNAUTHENTICATED' });
    if (limited(uid, now())) return reply(429, { ok: false, error: 'RATE_LIMITED' });
    let role;
    try { role = await systemRole(uid, base, sh, fetchFn); } catch (e) { return reply(503, { ok: false, error: 'ROLE_LOOKUP_FAILED' }); }
    if (TRIAGE_ROLES.indexOf(role) === -1) return reply(403, { ok: false, error: 'FORBIDDEN' });
    let body; try { body = JSON.parse(raw || '{}'); } catch (e) { return reply(400, { ok: false, error: 'INVALID_JSON' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.prototype.hasOwnProperty.call(ALLOWED_KEYS, body.action)) return reply(400, { ok: false, error: 'INVALID_ACTION' });
    const extra = Object.keys(body).filter(k => ALLOWED_KEYS[body.action].indexOf(k) === -1);
    if (extra.length) return reply(400, { ok: false, error: 'UNKNOWN_FIELD' });

    if (body.action === 'list') {
      const r = await fetchFn(base + '/rest/v1/beta_feedback?select=' + LIST_FIELDS + '&order=created_at.desc&limit=' + LIST_LIMIT, { headers: sh });
      if (!r || !r.ok) return reply(502, { ok: false, error: 'STORAGE_FAILED' });
      const rows = await r.json();
      return reply(200, { ok: true, items: (rows || []).map(x => ({ id: x.id, created_at: x.created_at, category: x.category, status: x.status,
        description: x.description, reproduction_steps: x.reproduction_steps, redactions: x.redactions || [], duplicate_of: x.duplicate_of || null,
        status_updated_at: x.status_updated_at || null, next: BetaFeedback.nextStatuses(x.status) })) });
    }

    // transition
    if (typeof body.id !== 'string' || !UUID.test(body.id)) return reply(400, { ok: false, error: 'INVALID_ID' });
    if (typeof body.to !== 'string') return reply(400, { ok: false, error: 'UNKNOWN_STATUS' });
    if (body.duplicate_of !== undefined && (typeof body.duplicate_of !== 'string' || !UUID.test(body.duplicate_of) || body.duplicate_of === body.id)) return reply(400, { ok: false, error: 'INVALID_DUPLICATE_REFERENCE' });
    const cur = await fetchFn(base + '/rest/v1/beta_feedback?id=eq.' + body.id + '&select=id,status&limit=1', { headers: sh });
    if (!cur || !cur.ok) return reply(502, { ok: false, error: 'STORAGE_FAILED' });
    const curRows = await cur.json();
    if (!Array.isArray(curRows) || !curRows[0]) return reply(404, { ok: false, error: 'NOT_FOUND' });
    const from = curRows[0].status;
    const verdict = BetaFeedback.canTransition(from, body.to, { duplicate_of: body.duplicate_of });
    if (!verdict.ok) return reply(409, { ok: false, error: verdict.error });
    if (body.to !== 'DUPLICATE' && body.duplicate_of !== undefined) return reply(400, { ok: false, error: 'INVALID_DUPLICATE_REFERENCE' });
    if (body.to === 'DUPLICATE') {
      const ref = await fetchFn(base + '/rest/v1/beta_feedback?id=eq.' + body.duplicate_of + '&select=id&limit=1', { headers: sh });
      if (!ref || !ref.ok) return reply(502, { ok: false, error: 'STORAGE_FAILED' });
      const refRows = await ref.json();
      if (!Array.isArray(refRows) || !refRows[0]) return reply(400, { ok: false, error: 'INVALID_DUPLICATE_REFERENCE' });
    }
    const patch = { status: body.to, status_updated_at: new Date(now()).toISOString(), status_updated_by: uid };
    if (body.to === 'DUPLICATE') patch.duplicate_of = body.duplicate_of;
    const w = await fetchFn(base + '/rest/v1/beta_feedback?id=eq.' + body.id + '&status=eq.' + encodeURIComponent(from), {
      method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=representation' }, sh), body: JSON.stringify(patch) });
    if (!w || !w.ok) return reply(502, { ok: false, error: 'STORAGE_FAILED' });
    const upd = await w.json();
    if (!Array.isArray(upd) || upd.length !== 1) return reply(409, { ok: false, error: 'CONCURRENT_CHANGE' });
    return reply(200, { ok: true, id: body.id, from: from, status: body.to, next: BetaFeedback.nextStatuses(body.to) });
  } catch (e) {
    return reply(500, { ok: false, error: 'INTERNAL' });
  }
}
exports.handler = async function (event) {
  return handle(event, { env: process.env, fetch: (typeof fetch === 'function') ? fetch : null, now: Date.now });
};
exports._internal = { handle, TRIAGE_ROLES, LIST_FIELDS, _resetRate: () => { for (const k in rate) delete rate[k]; } };
