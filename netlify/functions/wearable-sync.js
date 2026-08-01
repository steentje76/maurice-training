// Haalt HRV, rusthartslag en slaap van de laatste paar dagen op uit de Google Health API
// en zet ze in hrv_log — als aanvulling op de handmatige check-in, niet als vervanging
// (bestaande handmatige rijen voor dezelfde datum worden bijgewerkt, niet gedupliceerd).
//
// v2 (1 augustus 2026) — gecorrigeerd na een live 400 INVALID_PARENT_DATA_TYPE_COLLECTION-
// fout. De officiële datatype-tabel (developers.google.com/health/data-types) geeft: in de
// URL moet de data-type-naam kebab-case zijn (bv. daily-heart-rate-variability), en elk
// recordtype heeft een eigen filterveld-structuur:
//   Daily   → {type}.date            (bv. daily_heart_rate_variability.date >= "2026-07-29")
//   Session → {type}.interval.end_time
// Sleep zit bewust onder een EIGEN scope ("sleep"), niet health_metrics_and_measurements —
// vandaar de aparte googlehealth.sleep.readonly-scope in wearable-auth-start.js.
const GOOGLE_HEALTH_DATA_TYPES = {
  hrv:   { id: 'daily-heart-rate-variability', filterField: 'daily_heart_rate_variability', kind: 'daily' },
  rhr:   { id: 'daily-resting-heart-rate',     filterField: 'daily_resting_heart_rate',     kind: 'daily' },
  sleep: { id: 'sleep',                        filterField: 'sleep',                        kind: 'session' }
};
const GOOGLE_HEALTH_BASE = 'https://health.googleapis.com/v4';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld op Netlify' } }) };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };

  const sbHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const { id: userId } = await userRes.json();
    if (!userId) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };

    const connRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health&limit=1`, { headers: sbHeaders });
    const [conn] = await connRes.json();
    if (!conn) return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ synced: false, reason: 'not_connected' }) };

    let accessToken = conn.access_token;

    // Token verversen als hij binnen 5 minuten verloopt of al verlopen is.
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      if (!conn.refresh_token || !clientId || !clientSecret) {
        await markSyncStatus(supabaseUrl, sbHeaders, userId, 'token_expired_no_refresh');
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ synced: false, reason: 'token_expired_no_refresh' }) };
      }
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: conn.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        })
      });
      const refreshed = await refreshRes.json();
      if (!refreshRes.ok || !refreshed.access_token) {
        await markSyncStatus(supabaseUrl, sbHeaders, userId, 'refresh_failed');
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ synced: false, reason: 'refresh_failed' }) };
      }
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
      await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health`, {
        method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ access_token: accessToken, token_expires_at: newExpiresAt })
      });
    }

    // Laatste 7 dagen ophalen (vangt gemiste syncs op zonder overdreven veel data per keer).
    const since = new Date(); since.setDate(since.getDate() - 7);
    const sinceDate = since.toISOString().split('T')[0];
    const authFetch = (url) => fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });

    const [hrvData, rhrData, sleepData] = await Promise.all([
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.hrv, sinceDate),
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.rhr, sinceDate),
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.sleep, sinceDate)
    ]);

    // Per datum samenvoegen. TE VERIFIËREN (nog niet live bevestigd): de exacte veldnamen
    // in de respons per datapoint. Elke regel probeert een paar plausibele padnamen en
    // valt terug op null i.p.v. te crashen — check de function-logs na de eerste sync en
    // meld welk pad daadwerkelijk data teruggeeft, dan verwijderen we de gok-varianten.
    const byDate = {};
    hrvData.forEach(p => { const d = dailyDateOf(p); if (d) (byDate[d] ||= {}).hrv = p.dailyHeartRateVariability?.rmssdMillis ?? p.dailyHeartRateVariability?.value ?? null; });
    rhrData.forEach(p => { const d = dailyDateOf(p); if (d) (byDate[d] ||= {}).rhr = p.dailyRestingHeartRate?.bpm ?? p.dailyRestingHeartRate?.value ?? null; });
    sleepData.forEach(p => { const d = sessionDateOf(p); if (d) (byDate[d] ||= {}).sleep = sleepMinutesOf(p); });

    let written = 0;
    for (const [date, vals] of Object.entries(byDate)) {
      if (!vals.hrv && !vals.rhr && !vals.sleep) continue;
      const existingRes = await fetch(`${supabaseUrl}/rest/v1/hrv_log?user_id=eq.${userId}&date=eq.${date}&limit=1`, { headers: sbHeaders });
      const [existing] = await existingRes.json();
      const row = { date, user_id: userId, hrv: vals.hrv ?? existing?.hrv, rhr: vals.rhr ?? existing?.rhr, sleep: vals.sleep ?? existing?.sleep, note: existing?.note || 'Fitbit (auto-sync)' };
      if (existing) {
        await fetch(`${supabaseUrl}/rest/v1/hrv_log?id=eq.${existing.id}`, { method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(row) });
      } else {
        await fetch(`${supabaseUrl}/rest/v1/hrv_log`, { method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(row) });
      }
      written++;
    }

    await markSyncStatus(supabaseUrl, sbHeaders, userId, 'ok');
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ synced: true, daysWritten: written }) };
  } catch (e) {
    console.error('wearable-sync exception', e);
    try { await markSyncStatus(supabaseUrl, sbHeaders, undefined, 'error: ' + e.message); } catch (_) {}
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};

async function fetchDataPoints(authFetch, dataType, sinceDate) {
  try {
    const filter = dataType.kind === 'daily'
      ? `${dataType.filterField}.date >= "${sinceDate}"`
      : `${dataType.filterField}.interval.end_time >= "${sinceDate}T00:00:00Z"`;
    const url = `${GOOGLE_HEALTH_BASE}/users/me/dataTypes/${dataType.id}/dataPoints?filter=${encodeURIComponent(filter)}`;
    const r = await authFetch(url);
    if (!r.ok) { console.warn('wearable-sync fetchDataPoints niet ok', dataType.id, r.status, await r.text()); return []; }
    const d = await r.json();
    return d.dataPoints || d.data_points || [];
  } catch (e) {
    console.warn('wearable-sync fetchDataPoints exception', dataType.id, e.message);
    return [];
  }
}
// Daily-datapoints dragen een 'date'-veld (jaar/maand/dag), geen interval.
function dailyDateOf(point) {
  const d = point?.date;
  if (!d) return null;
  if (typeof d === 'string') return d.split('T')[0];
  if (d.year && d.month && d.day) return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  return null;
}
// Session-datapoints (sleep) dragen een interval — we koppelen aan de einddatum, omdat
// een nachtelijke sessie meestal na middernacht eindigt en zo bij de juiste ochtend hoort.
function sessionDateOf(point) {
  const t = point?.interval?.endTime || point?.interval?.civilEndTime || point?.endTime;
  return t ? String(t).split('T')[0] : null;
}
function sleepMinutesOf(point) {
  const ms = point?.sleep?.summary?.totalDurationMillis ?? point?.sleep?.totalDurationMillis;
  if (ms) return Math.round(ms / 60000);
  const sec = point?.sleep?.summary?.totalDurationSeconds ?? point?.sleep?.totalDurationSeconds;
  if (sec) return Math.round(sec / 60);
  return null;
}
async function markSyncStatus(supabaseUrl, sbHeaders, userId, status) {
  if (!userId) return;
  await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health`, {
    method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ last_sync_at: new Date().toISOString(), last_sync_status: status })
  });
}
