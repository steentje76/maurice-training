// MS-BETA-01 Slice B — server-side ingestion voor in-app beta-feedback.
// Contractbron: core/betaFeedback.js (user_feedback.v1). Elke submission wordt HIER opnieuw gevalideerd;
// de client is nooit de autoriteit. Opslag uitsluitend in public.beta_feedback via service_role.
//  - alleen authenticated (Supabase-JWT, gebruiker opgehaald bij /auth/v1/user);
//  - user_id komt uitsluitend uit het token, nooit uit de payload;
//  - payload-cap, per-gebruiker rate limit, fail-closed op inhoud (geen record bij enige fout);
//  - geen automatische athlete/health/nutrition/GPS/AI-context; technische context alleen via de
//    Slice-A-allowlist en alleen met expliciete consent per submission (afgedwongen door het contract);
//  - antwoorden bevatten nooit de ingestuurde tekst terug; fouten worden als codes gemeld.
const BetaFeedback = require('../../core/betaFeedback.js');
const MAX_BYTES = 16384, WINDOW_MS = 60 * 60 * 1000, MAX_PER_WINDOW = 20;
const rate = Object.create(null);
function reply(code, obj) { return { statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) }; }
function limited(k, now) { const e = rate[k]; if (!e || now - e.start > WINDOW_MS) { rate[k] = { start: now, count: 1 }; return false; } e.count++; return e.count > MAX_PER_WINDOW; }
async function userFromToken(token, base, anonKey, fetchFn) {
  if (!token || !/^Bearer\s+\S+/.test(token) || !base || !anonKey) return null;
  try { const r = await fetchFn(base + '/auth/v1/user', { headers: { Authorization: token, apikey: anonKey } }); if (!r || !r.ok) return null;
    const u = await r.json(); return (u && typeof u.id === 'string' && /^[0-9a-f-]{36}$/i.test(u.id)) ? u.id : null; } catch (e) { return null; }
}
async function handle(event, deps) {
  const env = deps.env || {}, fetchFn = deps.fetch, now = deps.now || Date.now;
  if (!event || event.httpMethod !== 'POST') return reply(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  // Zelfde publieke fallbacks (project-URL + publishable key) als billing-checkout.js; de service key
  // blijft verplicht en komt uitsluitend uit de omgeving.
  const base = env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co', service = env.SUPABASE_SERVICE_ROLE_KEY,
    anon = env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  if (!base || !service || !anon || typeof fetchFn !== 'function') return reply(503, { ok: false, error: 'NOT_CONFIGURED' });
  try {
    const raw = event.body || '';
    if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) return reply(413, { ok: false, error: 'PAYLOAD_TOO_LARGE' });
    const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
    const uid = await userFromToken(auth, base, anon, fetchFn);
    if (!uid) return reply(401, { ok: false, error: 'UNAUTHENTICATED' });
    if (limited(uid, now())) return reply(429, { ok: false, error: 'RATE_LIMITED' });
    let body; try { body = JSON.parse(raw || '{}'); } catch (e) { return reply(400, { ok: false, errors: ['INVALID_JSON'] }); }
    const built = BetaFeedback.buildSubmission(body, { now: () => new Date(now()).toISOString() });
    if (!built.ok) return reply(400, { ok: false, errors: built.errors.map(e => String(e).split(':')[0]) });
    const r = built.record;
    const row = { user_id: uid, contract: r.contract, category: r.category, status: r.status,
      description: r.description, reproduction_steps: r.reproduction_steps, free_text_classification: r.free_text_classification,
      redactions: r.redactions, technical_context_consent: r.technical_context_consent, technical_context: r.technical_context,
      submitted_at: r.submitted_at };
    const w = await fetchFn(base + '/rest/v1/beta_feedback', { method: 'POST',
      headers: { apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row) });
    if (!w || !w.ok) return reply(502, { ok: false, error: 'STORAGE_FAILED' });
    return reply(201, { ok: true, status: r.status, redactions: r.redactions });
  } catch (e) {
    return reply(500, { ok: false, error: 'INTERNAL' });
  }
}
exports.handler = async function (event) {
  return handle(event, { env: process.env, fetch: (typeof fetch === 'function') ? fetch : null, now: Date.now });
};
exports._internal = { handle, MAX_BYTES, MAX_PER_WINDOW, WINDOW_MS, _resetRate: () => { for (const k in rate) delete rate[k]; } };
