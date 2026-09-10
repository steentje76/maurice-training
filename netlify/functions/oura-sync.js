// netlify/functions/oura-sync.js
// Haalt workouts op via de officieel bevestigde v2 Workout-endpoint
// (cloud.ouraring.com/v2/docs, curl-voorbeeld verbatim teruggevonden;
// gecorroboreerd door meerdere onafhankelijke clientbibliotheken die
// identieke veldnamen tonen):
//   GET https://api.ouraring.com/v2/usercollection/workout?start_date=...&end_date=...
//   Respons: { data: [ { id, activity, calories, day, distance,
//     end_datetime, intensity, label, source, start_datetime } ], next_token }
// activity is een leesbare string (bv. "running", "tableTennis" -- een
// echt teruggevonden waarde) -- GEEN numerieke ID-mapping nodig.
const { getWearableTokenSecret } = require('./wearableTokenVault.js');
const { mapProviderSportToCanonical } = require('./_providerSportMapping.js');

function jsonBody(obj) { return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld' } }) };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };
  const sbHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  let userId = null;

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return jsonBody({ synced: false, provider: 'oura', status: 'sync_failed', code: 'AUTH_ERROR' });
    userId = (await userRes.json()).id;
    if (!userId) return jsonBody({ synced: false, provider: 'oura', status: 'sync_failed', code: 'AUTH_ERROR' });

    const connRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.oura&limit=1`, { headers: sbHeaders });
    const conns = await connRes.json();
    const conn = conns && conns[0];
    if (!conn) return jsonBody({ synced: false, daysWritten: 0, provider: 'oura', status: 'not_connected', code: 'NOT_CONNECTED' });

    let accessToken = await getWearableTokenSecret(supabaseUrl, serviceKey, conn.access_token_secret_id);

    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      const refreshToken = conn.refresh_token_secret_id ? await getWearableTokenSecret(supabaseUrl, serviceKey, conn.refresh_token_secret_id) : null;
      const clientId = process.env.OURA_CLIENT_ID, clientSecret = process.env.OURA_CLIENT_SECRET;
      if (!refreshToken || !clientId || !clientSecret) {
        await markSyncStatus(supabaseUrl, sbHeaders, userId, 'token_expired_no_refresh');
        return jsonBody({ synced: false, daysWritten: 0, provider: 'oura', status: 'token_expired', code: 'TOKEN_REFRESH_ERROR' });
      }
      const refreshRes = await fetch('https://api.ouraring.com/oauth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret })
      });
      let refreshed = null;
      try { refreshed = await refreshRes.json(); } catch (_) { refreshed = null; }
      if (!refreshRes.ok || !refreshed || !refreshed.access_token) {
        await markSyncStatus(supabaseUrl, sbHeaders, userId, 'refresh_failed');
        return jsonBody({ synced: false, daysWritten: 0, provider: 'oura', status: 'token_expired', code: 'TOKEN_REFRESH_ERROR' });
      }
      accessToken = refreshed.access_token;
      const { updateWearableTokenSecret } = require('./wearableTokenVault.js');
      await updateWearableTokenSecret(supabaseUrl, serviceKey, conn.access_token_secret_id, accessToken);
      const newExpiresAt = new Date(Date.now() + (Number(refreshed.expires_in) || 3600) * 1000).toISOString();
      await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.oura`, {
        method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify({ token_expires_at: newExpiresAt })
      });
    }

    const ouraFetch = (url) => fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });

    const since = new Date(); since.setDate(since.getDate() - 30);
    const startDate = since.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    let imported = 0, skipped = 0, nextToken = null;
    let pageCount = 0;
    do {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      if (nextToken) params.set('next_token', nextToken);
      const r = await ouraFetch(`https://api.ouraring.com/v2/usercollection/workout?${params.toString()}`);
      if (r.status === 401) { await markSyncStatus(supabaseUrl, sbHeaders, userId, 'token_expired_no_refresh'); return jsonBody({ synced: false, provider: 'oura', status: 'token_expired', code: 'TOKEN_REFRESH_ERROR' }); }
      if (!r.ok) { await markSyncStatus(supabaseUrl, sbHeaders, userId, 'error:provider'); return jsonBody({ synced: false, provider: 'oura', status: 'sync_failed', code: 'PROVIDER_API_ERROR' }); }
      const json = await r.json();
      const records = Array.isArray(json.data) ? json.data : [];
      console.log('oura-sync workout shape', JSON.stringify(records[0] ? Object.keys(records[0]) : []));

      for (const w of records) {
        const canonicalSport = mapProviderSportToCanonical(w.activity);
        if (!canonicalSport || !w.start_datetime || !w.id) { skipped++; continue; }
        const durationSeconds = (w.end_datetime && w.start_datetime) ? Math.round((Date.parse(w.end_datetime) - Date.parse(w.start_datetime)) / 1000) : null;
        const payload = {
          user_id: userId, sport: canonicalSport,
          distance_meters: typeof w.distance === 'number' ? w.distance : null,
          duration_seconds: durationSeconds,
          source_provenance: 'provider_derived', source_provider: 'oura', data_quality: 'unverified',
          recorded_at: w.start_datetime, dedupe_key: 'oura-workout-' + w.id
        };
        const writeRes = await fetch(`${supabaseUrl}/rest/v1/activities`, {
          method: 'POST', headers: { ...sbHeaders, Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify(payload)
        });
        if (writeRes.ok) imported++; else skipped++;
      }
      nextToken = json.next_token || null;
      pageCount++;
    } while (nextToken && pageCount < 10);

    await markSyncStatus(supabaseUrl, sbHeaders, userId, imported > 0 ? 'ok' : 'no_new_data');
    return jsonBody({ synced: true, daysWritten: imported, provider: 'oura', status: imported > 0 ? 'success' : 'no_new_data', imported, skipped });
  } catch (e) {
    console.error('oura-sync error', e.message);
    try { await markSyncStatus(supabaseUrl, { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }, userId, 'error:exception'); } catch (_) {}
    return { statusCode: 500, body: JSON.stringify({ synced: false, provider: 'oura', status: 'sync_failed', code: 'UNKNOWN_ERROR' }) };
  }
};

async function markSyncStatus(supabaseUrl, sbHeaders, userId, status) {
  if (!userId) return;
  await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.oura`, {
    method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ last_sync_at: new Date().toISOString(), last_sync_status: status })
  });
}
