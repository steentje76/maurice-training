// MS-BETA-01 Slice B — geplande retentie voor beta-feedback (zie netlify.toml: @daily).
// Zelfde patroon als cleanup-product-telemetry.js / cleanup-unverified-accounts.js: service_role, geen
// gebruikers-JWT, de query bepaalt wat in aanmerking komt. Beleid: 365 dagen (voorlopig productbeleid
// DEC-BETA-001, geen vastgestelde AVG-rechtsgrond). Verwijderd wordt uitsluitend created_at STRIKT OUDER
// dan (nu - 365 dagen). Eén gefilterde DELETE op exact public.beta_feedback; nooit ongefilterd, nooit een
// andere tabel, nooit rijen teruglezen. Fail-safe: fout -> foutstatus, niets extra's, geen throw.
const RETENTION_DAYS = 365;
const TABLE = 'beta_feedback';
const DAY_MS = 24 * 60 * 60 * 1000;
function retentionCutoffIso(nowMs) { const n = Number(nowMs); if (!isFinite(n)) throw new Error('invalid now'); return new Date(n - RETENTION_DAYS * DAY_MS).toISOString(); }
function buildDeleteUrl(supabaseUrl, cutoffIso) {
  if (!/^https:\/\//.test(String(supabaseUrl || ''))) throw new Error('invalid supabase url');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(String(cutoffIso || ''))) throw new Error('invalid cutoff');
  return supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + TABLE + '?created_at=lt.' + encodeURIComponent(cutoffIso);
}
async function runCleanup(deps) {
  const env = deps.env || {}, fetchFn = deps.fetch, now = deps.now || Date.now;
  const supabaseUrl = env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co', serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || typeof fetchFn !== 'function') return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'not_configured' }) };
  try {
    const cutoff = retentionCutoffIso(now());
    const r = await fetchFn(buildDeleteUrl(supabaseUrl, cutoff), { method: 'DELETE', headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, Prefer: 'return=minimal' } });
    if (!r || !r.ok) return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'delete_failed', status: r ? r.status : null }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true, table: TABLE, retention_days: RETENTION_DAYS, cutoff: cutoff }) };
  } catch (e) { return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'exception' }) }; }
}
exports.handler = async function () { return runCleanup({ env: process.env, fetch: (typeof fetch === 'function') ? fetch : null, now: Date.now }); };
exports._internal = { RETENTION_DAYS, TABLE, retentionCutoffIso, buildDeleteUrl, runCleanup };
