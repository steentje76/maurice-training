// netlify/functions/polar-sync.js
// Haalt exercises op via het Polar AccessLink exercise-transaction-model
// (geverifieerd tegen meerdere onafhankelijke, uit Polar's eigen OpenAPI-
// spec gegenereerde clientbibliotheken):
//   POST   /v3/users/{user-id}/exercise-transactions            -> 201 (nieuwe data) | 204 (niets nieuws)
//   GET    /v3/users/{user-id}/exercise-transactions/{id}        -> lijst exercise-resource-URIs
//   GET    <exercise-resource-URI>                                -> exercise-samenvatting
//   PUT    /v3/users/{user-id}/exercise-transactions/{id}        -> commit (pas NA succesvolle verwerking)
//
// De exacte JSON-veldnamen van de exercise-samenvatting zelf zijn niet met
// dezelfde 1:1-zekerheid bevestigd als de transactie-endpoints -- Polar's
// v3-API gebruikt consistent kebab-case in URL's en (per meerdere
// onafhankelijke community-clients) ook in JSON-veldnamen. Zelfde
// defensieve meerdere-paden-aanpak als _wearableSyncLib.js voor Google
// Health: probeer de meest waarschijnlijke veldnaam, log de werkelijke
// top-level keys (nooit waarden) voor diagnostiek, schrijf nooit een
// geraden waarde.
const { getWearableTokenSecret } = require('./wearableTokenVault.js');
const { mapProviderSportToCanonical } = require('./_providerSportMapping.js');

function jsonBody(obj) { return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }
function firstStr(obj, keys) { for (const k of keys) { if (obj && obj[k] != null && obj[k] !== '') return obj[k]; } return null; }
function firstNum(obj, keys) { for (const k of keys) { const v = obj && obj[k]; if (v != null && v !== '' && isFinite(Number(v))) return Number(v); } return null; }

// ISO 8601-duur ("PT1H30M5S") -> seconden. Geen aanname buiten uren/minuten/seconden.
function iso8601DurationToSeconds(iso) {
  if (typeof iso !== 'string') return null;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/.exec(iso);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0, min = m[2] ? parseInt(m[2], 10) : 0, s = m[3] ? parseFloat(m[3]) : 0;
  return Math.round(h * 3600 + min * 60 + s);
}

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
    if (!userRes.ok) return jsonBody({ synced: false, provider: 'polar', status: 'sync_failed', code: 'AUTH_ERROR' });
    userId = (await userRes.json()).id;
    if (!userId) return jsonBody({ synced: false, provider: 'polar', status: 'sync_failed', code: 'AUTH_ERROR' });

    const connRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.polar&limit=1`, { headers: sbHeaders });
    const conns = await connRes.json();
    const conn = conns && conns[0];
    if (!conn) return jsonBody({ synced: false, daysWritten: 0, provider: 'polar', status: 'not_connected', code: 'NOT_CONNECTED' });

    const accessToken = await getWearableTokenSecret(supabaseUrl, serviceKey, conn.access_token_secret_id);
    if (!accessToken) {
      await markSyncStatus(supabaseUrl, sbHeaders, userId, 'token_expired_no_refresh');
      return jsonBody({ synced: false, daysWritten: 0, provider: 'polar', status: 'token_expired', code: 'TOKEN_REFRESH_ERROR' });
    }
    const polarUserId = conn.provider_user_id;
    const polarFetch = (url, opts) => fetch(url, { ...(opts || {}), headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...((opts && opts.headers) || {}) } });

    // Stap 1: nieuwe transactie aanmaken. 204 = niets nieuws sinds de vorige sync.
    const createRes = await polarFetch(`https://www.polaraccesslink.com/v3/users/${polarUserId}/exercise-transactions`, { method: 'POST' });
    if (createRes.status === 204) {
      await markSyncStatus(supabaseUrl, sbHeaders, userId, 'ok');
      return jsonBody({ synced: true, daysWritten: 0, provider: 'polar', status: 'no_new_data', imported: 0, updated: 0 });
    }
    if (createRes.status === 401) { await markSyncStatus(supabaseUrl, sbHeaders, userId, 'token_expired_no_refresh'); return jsonBody({ synced: false, provider: 'polar', status: 'token_expired', code: 'TOKEN_REFRESH_ERROR' }); }
    if (!createRes.ok) { await markSyncStatus(supabaseUrl, sbHeaders, userId, 'error:provider'); return jsonBody({ synced: false, provider: 'polar', status: 'sync_failed', code: 'PROVIDER_API_ERROR' }); }

    const createJson = await createRes.json();
    // Veldnaam voor de transactie-URI/id: meerdere plausibele vormen (kebab-case is de Polar-conventie).
    const transactionId = firstStr(createJson, ['transaction-id']) || (function () {
      const uri = firstStr(createJson, ['resource-uri']);
      const m = uri && /exercise-transactions\/(\d+)/.exec(uri);
      return m ? m[1] : null;
    })();
    if (!transactionId) { console.warn('polar-sync: kon transaction-id niet bepalen uit', JSON.stringify(Object.keys(createJson || {}))); await markSyncStatus(supabaseUrl, sbHeaders, userId, 'error:parse'); return jsonBody({ synced: false, provider: 'polar', status: 'sync_failed', code: 'INVALID_RESPONSE' }); }

    // Stap 2: lijst met exercise-resource-URI's binnen deze transactie.
    const listRes = await polarFetch(`https://www.polaraccesslink.com/v3/users/${polarUserId}/exercise-transactions/${transactionId}`);
    if (!listRes.ok) { await markSyncStatus(supabaseUrl, sbHeaders, userId, 'error:provider'); return jsonBody({ synced: false, provider: 'polar', status: 'sync_failed', code: 'PROVIDER_API_ERROR' }); }
    const listJson = await listRes.json();
    const exerciseUris = listJson && Array.isArray(listJson.exercises) ? listJson.exercises : [];

    let imported = 0, skipped = 0;
    for (const uri of exerciseUris) {
      try {
        const exRes = await polarFetch(uri);
        if (!exRes.ok) { skipped++; continue; }
        const ex = await exRes.json();
        // Diagnostiek -- uitsluitend structuur (keys), nooit waarden.
        console.log('polar-sync exercise shape', JSON.stringify(Object.keys(ex || {})));

        const startTime = firstStr(ex, ['start-time', 'start_time', 'startTime']);
        const durationIso = firstStr(ex, ['duration']);
        const durationSeconds = iso8601DurationToSeconds(durationIso);
        const rawSport = firstStr(ex, ['sport', 'detailed-sport-info']);
        const canonicalSport = mapProviderSportToCanonical(rawSport);
        const distanceM = firstNum(ex, ['distance']);
        const avgHr = firstNum(ex, ['heart-rate', 'average-heart-rate-bpm']) || (ex && ex['heart-rate'] && firstNum(ex['heart-rate'], ['average']));
        const exerciseId = firstStr(ex, ['id']);

        // Niet-mapbaar sporttype (TK kent uitsluitend running/cycling/rowing/
        // swimming, activities_sport_check) -- overslaan, nooit forceren.
        if (!startTime || !exerciseId || !canonicalSport) { skipped++; continue; }
        const dedupeKey = 'polar-exercise-' + exerciseId;
        const payload = {
          user_id: userId, sport: canonicalSport,
          distance_meters: distanceM, duration_seconds: durationSeconds,
          avg_heart_rate_bpm: avgHr != null ? Math.round(avgHr) : null,
          source_provenance: 'provider_derived', source_provider: 'polar', data_quality: 'unverified',
          recorded_at: startTime, dedupe_key: dedupeKey
        };
        const writeRes = await fetch(`${supabaseUrl}/rest/v1/activities`, {
          method: 'POST', headers: { ...sbHeaders, Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify(payload)
        });
        if (writeRes.ok) imported++; else skipped++;
      } catch (e) { skipped++; }
    }

    // Stap 3: pas committen na verwerking (ongecommit blijft de data
    // beschikbaar bij een volgende sync-poging -- geen dataverlies bij een
    // gedeeltelijke fout).
    if (skipped === 0) {
      await polarFetch(`https://www.polaraccesslink.com/v3/users/${polarUserId}/exercise-transactions/${transactionId}`, { method: 'PUT' });
    }

    await markSyncStatus(supabaseUrl, sbHeaders, userId, imported > 0 ? 'ok' : 'no_new_data');
    return jsonBody({ synced: true, daysWritten: imported, provider: 'polar', status: imported > 0 ? 'success' : 'no_new_data', imported, skipped, committed: skipped === 0 });
  } catch (e) {
    console.error('polar-sync error', e.message);
    try { await markSyncStatus(supabaseUrl, { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }, userId, 'error:exception'); } catch (_) {}
    return { statusCode: 500, body: JSON.stringify({ synced: false, provider: 'polar', status: 'sync_failed', code: 'UNKNOWN_ERROR' }) };
  }
};

async function markSyncStatus(supabaseUrl, sbHeaders, userId, status) {
  if (!userId) return;
  await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.polar`, {
    method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ last_sync_at: new Date().toISOString(), last_sync_status: status })
  });
}
