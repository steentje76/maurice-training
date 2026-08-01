// Haalt HRV, rusthartslag en slaap van de laatste paar dagen op uit de Google Health API
// en zet ze in hrv_log — als aanvulling op de handmatige check-in, niet als vervanging
// (bestaande handmatige rijen voor dezelfde datum worden bijgewerkt, niet gedupliceerd).
//
// LET OP — TE VERIFIËREN VOOR EERSTE GEBRUIK: de exacte data-type-namen in
// GOOGLE_HEALTH_DATA_TYPES hieronder zijn gebaseerd op de officiële Google Health
// API-documentatie (developers.google.com/health/reference/rest/v4) maar zijn niet
// getest tegen een echte account, omdat daar een geregistreerde OAuth-client + verbonden
// Fitbit-account voor nodig is. Controleer de exacte data-type-slugs en JSON-veldnamen in
// de respons zodra de eerste echte koppeling is gemaakt, en pas hieronder aan waar nodig.
const GOOGLE_HEALTH_DATA_TYPES = {
  hrv: 'dailyHeartRateVariability',
  rhr: 'dailyRestingHeartRate',
  sleep: 'sleepSummary'
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

    // Laatste 3 dagen ophalen (vangt gemiste syncs op zonder overdreven veel data per keer).
    const since = new Date(); since.setDate(since.getDate() - 3);
    const sinceStr = since.toISOString().split('T')[0] + 'T00:00:00';
    const authFetch = (url) => fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });

    const [hrvData, rhrData, sleepData] = await Promise.all([
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.hrv, sinceStr),
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.rhr, sinceStr),
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.sleep, sinceStr)
    ]);

    // Per datum samenvoegen. TE VERIFIËREN: exacte veldnamen in de respons (hrvMs/bpm/
    // duration hieronder zijn een redelijke aanname o.b.v. de Google Health API-conventies,
    // niet live geverifieerd — zie opmerking bovenaan dit bestand).
    const byDate = {};
    hrvData.forEach(p => { const d = dateOf(p); if (d) (byDate[d] ||= {}).hrv = p.dailyHeartRateVariability?.rmssdMillis ?? p.value ?? null; });
    rhrData.forEach(p => { const d = dateOf(p); if (d) (byDate[d] ||= {}).rhr = p.dailyRestingHeartRate?.bpm ?? p.value ?? null; });
    sleepData.forEach(p => { const d = dateOf(p); if (d) (byDate[d] ||= {}).sleep = p.sleepSummary?.durationMinutes ?? p.value ?? null; });

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

async function fetchDataPoints(authFetch, dataType, sinceIso) {
  try {
    const url = `${GOOGLE_HEALTH_BASE}/users/me/dataTypes/${dataType}/dataPoints?filter=${encodeURIComponent(`interval.start_time >= "${sinceIso}"`)}`;
    const r = await authFetch(url);
    if (!r.ok) { console.warn('wearable-sync fetchDataPoints niet ok', dataType, r.status, await r.text()); return []; }
    const d = await r.json();
    return d.dataPoints || d.data_points || [];
  } catch (e) {
    console.warn('wearable-sync fetchDataPoints exception', dataType, e.message);
    return [];
  }
}
function dateOf(point) {
  const t = point?.interval?.startTime || point?.interval?.civilStartTime || point?.startTime;
  return t ? String(t).split('T')[0] : null;
}
async function markSyncStatus(supabaseUrl, sbHeaders, userId, status) {
  if (!userId) return;
  await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health`, {
    method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ last_sync_at: new Date().toISOString(), last_sync_status: status })
  });
}
