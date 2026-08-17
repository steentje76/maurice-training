// netlify/functions/wearable-sync.js
// Haalt HRV (RMSSD), rusthartslag en slaap van de laatste 7 dagen op uit de Google Health API
// en zet ze in hrv_log — als AANVULLING op de handmatige check-in, niet als vervanging (bestaande
// rijen voor dezelfde datum worden bijgewerkt, niet gedupliceerd → idempotent per datum).
//
// v3 (17 augustus 2026) — SYNC-REPAIR:
//  1) PROVENANCE: elke rij waar de wearable ≥1 echte waarde levert krijgt [src:fitbit] in note,
//     zodat het Lichaam-scherm die metingen als bron "Fitbit" toont (client leest de tag).
//     Puur-handmatige dagen blijven ongetagd → bron "Check-in". Manuele note-tekst blijft behouden.
//  2) DIAGNOSTIEK (alleen tellingen/statussen/structuur — NOOIT tokens, payloads of waarden):
//     per data-type de HTTP-status + aantal ruwe datapoints + aantal geparste waarden + de
//     top-level KEYS van het eerste datapoint. Zo is na één live sync exact te zien waar de keten
//     stopt (0 records vs. verkeerde veldnamen vs. 4xx), zonder ooit gezondheidsdata te loggen.
//  3) EERLIJK RESULTAAT: OAuth-succes ≠ data-succes. De response bevat nu een canoniek contract
//     (status success|no_new_data|token_expired|..., imported/updated/skipped) NAAST de bestaande
//     {synced, daysWritten} (backward-compat). success ALLEEN bij daadwerkelijk geschreven data.
//
// Endpoint/ids/filter/envelope zijn geverifieerd tegen de officiële docs
// (developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/list):
//   GET https://health.googleapis.com/v4/users/me/dataTypes/{kebab-id}/dataPoints?filter=...
//   daily-filter: {snake_id}.date >= "YYYY-MM-DD" · response: { dataPoints: [...] }
// De per-datapoint VELDNAMEN (rmssdMillis e.d.) zijn niet in de docs gespecificeerd → meerdere
// plausibele paden met fallback + structurele key-logging (diagnostiek #2) bevestigt het live pad.

const LIB = require('./_wearableSyncLib.js');

const GOOGLE_HEALTH_DATA_TYPES = {
  hrv:   { id: 'daily-heart-rate-variability', filterField: 'daily_heart_rate_variability', kind: 'daily' },
  rhr:   { id: 'daily-resting-heart-rate',     filterField: 'daily_resting_heart_rate',     kind: 'daily' },
  sleep: { id: 'sleep',                        filterField: 'sleep',                        kind: 'session' }
};
const GOOGLE_HEALTH_BASE = 'https://health.googleapis.com/v4';

function jsonBody(obj) { return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

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
    if (!conn) return jsonBody({ synced: false, daysWritten: 0, provider: 'fitbit', status: 'not_connected', reason: 'not_connected' });

    let accessToken = conn.access_token;

    // Token verversen als hij binnen 5 minuten verloopt of al verlopen is.
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      if (!conn.refresh_token || !clientId || !clientSecret) {
        await markSyncStatus(supabaseUrl, sbHeaders, userId, 'token_expired_no_refresh');
        return jsonBody({ synced: false, daysWritten: 0, provider: 'fitbit', status: 'token_expired', reason: 'token_expired_no_refresh' });
      }
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ refresh_token: conn.refresh_token, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' })
      });
      const refreshed = await refreshRes.json();
      if (!refreshRes.ok || !refreshed.access_token) {
        await markSyncStatus(supabaseUrl, sbHeaders, userId, 'refresh_failed');
        // refresh mislukt = koppeling verlopen → client toont "Opnieuw koppelen nodig"
        return jsonBody({ synced: false, daysWritten: 0, provider: 'fitbit', status: 'token_expired', reason: 'refresh_failed' });
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
    const dateTo = new Date().toISOString().split('T')[0];
    const authFetch = (url) => fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });

    const [hrvR, rhrR, sleepR] = await Promise.all([
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.hrv, sinceDate),
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.rhr, sinceDate),
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.sleep, sinceDate)
    ]);
    const hrvData = hrvR.points, rhrData = rhrR.points, sleepData = sleepR.points;

    // Per datum samenvoegen. Veldnamen niet officieel gedocumenteerd → meerdere plausibele paden.
    const byDate = {};
    let parsedHrv = 0, parsedRhr = 0, parsedSleep = 0;
    hrvData.forEach(p => { const d = LIB.dailyDateOf(p); if (d) { const v = p.dailyHeartRateVariability?.rmssdMillis ?? p.dailyHeartRateVariability?.value ?? p.value ?? null; (byDate[d] ||= {}).hrv = v; if (v != null) parsedHrv++; } });
    rhrData.forEach(p => { const d = LIB.dailyDateOf(p); if (d) { const v = p.dailyRestingHeartRate?.bpm ?? p.dailyRestingHeartRate?.value ?? p.value ?? null; (byDate[d] ||= {}).rhr = v; if (v != null) parsedRhr++; } });
    sleepData.forEach(p => { const d = LIB.sessionDateOf(p); if (d) { const v = LIB.sleepMinutesOf(p); (byDate[d] ||= {}).sleep = v; if (v != null) parsedSleep++; } });

    let imported = 0, updated = 0, skipped = 0;
    for (const [date, vals] of Object.entries(byDate)) {
      const cls = LIB.classifyWrite(vals, false); // voorlopige klasse; existing bepaalt update vs import
      if (cls === 'skipped') { skipped++; continue; }
      const existingRes = await fetch(`${supabaseUrl}/rest/v1/hrv_log?user_id=eq.${userId}&date=eq.${date}&limit=1`, { headers: sbHeaders });
      const [existing] = await existingRes.json();
      const built = LIB.buildRow(date, userId, vals, existing);
      if (existing) {
        await fetch(`${supabaseUrl}/rest/v1/hrv_log?id=eq.${existing.id}`, { method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(built.row) });
        updated++;
      } else {
        await fetch(`${supabaseUrl}/rest/v1/hrv_log`, { method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(built.row) });
        imported++;
      }
    }

    // DIAGNOSTIEK — uitsluitend tellingen/statussen/structuur (nooit tokens/waarden/PII).
    console.log('wearable-sync diag', JSON.stringify({
      provider: 'google_health', dateFrom: sinceDate, dateTo,
      http: { hrv: hrvR.status, rhr: rhrR.status, sleep: sleepR.status },
      fetched: { hrv: hrvData.length, rhr: rhrData.length, sleep: sleepData.length },
      parsed: { hrv: parsedHrv, rhr: parsedRhr, sleep: parsedSleep },
      shape: { hrv: LIB.pointShape(hrvData[0]), rhr: LIB.pointShape(rhrData[0]), sleep: LIB.pointShape(sleepData[0]) },
      written: { imported, updated, skipped }
    }));

    const result = LIB.syncResult({ imported, updated, skipped });
    await markSyncStatus(supabaseUrl, sbHeaders, userId, imported + updated > 0 ? 'ok' : 'no_new_data');
    // Backward-compat velden (synced, daysWritten) + canoniek contract (status, imported, updated, skipped).
    return jsonBody({ ...result, syncedAt: new Date().toISOString(), fetched: { hrv: hrvData.length, rhr: rhrData.length, sleep: sleepData.length } });
  } catch (e) {
    console.error('wearable-sync exception', e && e.message);
    try { await markSyncStatus(supabaseUrl, sbHeaders, undefined, 'error: ' + (e && e.message)); } catch (_) {}
    return { statusCode: 500, body: JSON.stringify({ synced: false, provider: 'fitbit', status: 'sync_failed', error: { message: 'Serverfout' } }) };
  }
};

// → { points:[], status:<httpStatus|'exception'>, ok:bool }. Non-ok logt status (geen payload-waarden).
async function fetchDataPoints(authFetch, dataType, sinceDate) {
  try {
    const filter = dataType.kind === 'daily'
      ? `${dataType.filterField}.date >= "${sinceDate}"`
      : `${dataType.filterField}.interval.end_time >= "${sinceDate}T00:00:00Z"`;
    const url = `${GOOGLE_HEALTH_BASE}/users/me/dataTypes/${dataType.id}/dataPoints?filter=${encodeURIComponent(filter)}&pageSize=1000`;
    const r = await authFetch(url);
    if (!r.ok) { console.warn('wearable-sync fetchDataPoints niet ok', dataType.id, r.status); return { points: [], status: r.status, ok: false }; }
    const d = await r.json();
    return { points: d.dataPoints || d.data_points || [], status: r.status, ok: true };
  } catch (e) {
    console.warn('wearable-sync fetchDataPoints exception', dataType.id, e && e.message);
    return { points: [], status: 'exception', ok: false };
  }
}
async function markSyncStatus(supabaseUrl, sbHeaders, userId, status) {
  if (!userId) return;
  await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health`, {
    method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ last_sync_at: new Date().toISOString(), last_sync_status: status })
  });
}
