// MS-TELEMETRY-01 closure — geplande retentie voor ruwe producttelemetry (zie netlify.toml: @daily).
// Zelfde patroon als cleanup-unverified-accounts.js: draait als service_role zonder gebruikers-JWT;
// de query zelf bepaalt wat in aanmerking komt, nooit input van buitenaf.
//
// Beleid (voorlopig productbeleid PO 29-09-2026, DEC-BETA-001/DEC-TELEMETRY-002; GEEN vastgestelde
// AVG-rechtsgrond): ruwe rijen in public.product_telemetry_events worden 90 dagen bewaard. Verwijderd
// wordt uitsluitend created_at STRIKT OUDER dan (nu - 90 dagen). Eén gefilterde DELETE op precies deze
// tabel; nooit een ongefilterde DELETE, nooit een andere tabel, nooit rijen teruglezen.
// Fail-safe: ontbrekende configuratie of een fout geeft een foutstatus, verwijdert niets extra's en
// gooit nooit door.
const RETENTION_DAYS = 90;
const TABLE = 'product_telemetry_events';
const DAY_MS = 24 * 60 * 60 * 1000;

function retentionCutoffIso(nowMs) {
  const n = Number(nowMs);
  if (!isFinite(n)) throw new Error('invalid now');
  return new Date(n - RETENTION_DAYS * DAY_MS).toISOString();
}

function buildDeleteUrl(supabaseUrl, cutoffIso) {
  if (!/^https:\/\//.test(String(supabaseUrl || ''))) throw new Error('invalid supabase url');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(String(cutoffIso || ''))) throw new Error('invalid cutoff');
  return supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + TABLE + '?created_at=lt.' + encodeURIComponent(cutoffIso);
}

async function runCleanup(deps) {
  const env = deps.env || {}, fetchFn = deps.fetch, now = deps.now || Date.now;
  // Zelfde fallback voor de (publieke) project-URL als cleanup-unverified-accounts.js; de service key
  // blijft verplicht en komt uitsluitend uit de omgeving.
  const supabaseUrl = env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co', serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || typeof fetchFn !== 'function') return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'not_configured' }) };
  try {
    const cutoff = retentionCutoffIso(now());
    const url = buildDeleteUrl(supabaseUrl, cutoff);
    const r = await fetchFn(url, { method: 'DELETE', headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, Prefer: 'return=minimal' } });
    if (!r || !r.ok) return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'delete_failed', status: r ? r.status : null }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true, table: TABLE, retention_days: RETENTION_DAYS, cutoff: cutoff }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'exception' }) };
  }
}

exports.handler = async function () {
  return runCleanup({ env: process.env, fetch: (typeof fetch === 'function') ? fetch : null, now: Date.now });
};
exports._internal = { RETENTION_DAYS, TABLE, retentionCutoffIso, buildDeleteUrl, runCleanup };
