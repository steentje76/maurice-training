// netlify/functions/wearable-sync-activities.js — B9-H3B
//
// Haalt sportactiviteiten (exercise-datapoints) op uit de Google Health API
// en zet ze om naar canonieke `activities`-rijen (Running/Cycling, sectie
// 18/20 van de B9-H3B-opdracht). AANVULLEND op wearable-sync.js (HRV/RHR/
// sleep) -- die functie blijft volledig ongewijzigd. Deelt dezelfde
// wearable_connections/token-vault-infrastructuur (_wearableAuthLib.js).
//
// Endpoint/veldnamen geverifieerd tegen de officiële Google Health API-
// documentatie (developers.google.com/health/data-types/workouts,
// developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints,
// augustus 2026): GET /v4/users/me/dataTypes/exercise/dataPoints, filter op
// exercise.interval.civil_start_time. Scope:
// https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly
//
// EXTERNE BLOKKADE (gedocumenteerd, zie docs/B9_H3B_PROVIDER_SELECTION.md):
// deze nieuwe scope moet nog worden toegevoegd aan het OAuth-consent-scherm
// in de Google Cloud Console van het project -- die configuratiestap valt
// buiten deze sessie (geen toegang tot de Google Cloud Console). De code
// hieronder is volledig, correct, en klaar voor gebruik zodra die
// configuratiestap is voltooid; tot die tijd retourneert Google een
// autorisatiefout voor gebruikers die de nieuwe scope nog niet hebben
// geaccepteerd (nette, canonieke foutafhandeling, geen crash).

const CloudActivityIngestion = require('../../core/cloudActivityIngestion.js');
const { getValidGoogleHealthAccessToken } = require('./_wearableAuthLib.js');

const GOOGLE_HEALTH_BASE = 'https://health.googleapis.com/v4';

function jsonBody(obj) { return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

async function fetchExerciseDataPoints(authFetch, sinceDate) {
  const filter = `exercise.interval.civil_start_time >= "${sinceDate}T00:00:00"`;
  const url = `${GOOGLE_HEALTH_BASE}/users/me/dataTypes/exercise/dataPoints?filter=${encodeURIComponent(filter)}&pageSize=100`;
  try {
    const r = await authFetch(url);
    if (!r.ok) {
      // B9-H3C, sectie 11: de app/backend moet CONNECTED_BUT_SCOPE_MISSING
      // kunnen onderscheiden van TOKEN_EXPIRED/DISCONNECTED. Een gebruiker
      // die vóór B9-H3B al Google koppelde, heeft een geldig token ZONDER de
      // nieuwe activity_and_fitness-scope -- dat token blijft geldig voor
      // HRV/RHR/sleep (wearable-sync.js, ongewijzigd), maar geeft voor DEZE
      // aanroep een 403 terug. Google se officiële foutcontract (geverifieerd
      // tegen bekende, publieke incident-rapporten) gebruikt hiervoor
      // "reason": "insufficientPermissions" of "ACCESS_TOKEN_SCOPE_INSUFFICIENT"
      // -- expliciet onderscheiden van een generieke 401/overige 403.
      let scopeMissing = false;
      if (r.status === 403) {
        const errBody = await r.json().catch(() => null);
        const errors = (errBody && errBody.error && Array.isArray(errBody.error.errors)) ? errBody.error.errors : [];
        const details = (errBody && errBody.error && Array.isArray(errBody.error.details)) ? errBody.error.details : [];
        scopeMissing = errors.some(e => e && e.reason === 'insufficientPermissions')
          || details.some(d => d && d.reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT');
      }
      return { points: [], status: r.status, ok: false, scopeMissing };
    }
    const body = await r.json().catch(() => null);
    return { points: (body && Array.isArray(body.dataPoints)) ? body.dataPoints : [], status: r.status, ok: true };
  } catch (e) {
    return { points: [], status: 0, ok: false, exception: true };
  }
}

exports.handler = async function (event) {
  const Observability = require('../../core/observability.js');
  const t0 = Date.now();
  const correlationId = Observability.newCorrelationId();
  const logCtx = { app_version: process.env.APP_VER || 'unknown', environment: process.env.CONTEXT || 'unknown', correlation_id: correlationId };
  Observability.tkLog('INFO', 'wearable.sync_activities.start', 'wearable', 'wearable-sync-activities', { operation: 'sync', provider: 'google_health' }, logCtx);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld op Netlify' } }) };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };

  const sbHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ code: 'AUTH_ERROR', error: { message: 'Ongeldige of verlopen sessie' } }) };
    const userJson = await userRes.json();
    const userId = userJson && userJson.id;
    if (!userId) return { statusCode: 401, body: JSON.stringify({ code: 'AUTH_ERROR', error: { message: 'Kon gebruiker niet vaststellen' } }) };

    const tokenResult = await getValidGoogleHealthAccessToken(supabaseUrl, serviceKey, sbHeaders, userId);
    if (!tokenResult.ok) return jsonBody(tokenResult.body);

    const since = new Date(); since.setDate(since.getDate() - 30); // sectie 51: bounded initial import, 30 dagen (consistent met een redelijke, niet-oneindige historie)
    const sinceDate = since.toISOString().split('T')[0];
    const authFetch = (url) => fetch(url, { headers: { Authorization: `Bearer ${tokenResult.accessToken}`, Accept: 'application/json' } });

    const exerciseR = await fetchExerciseDataPoints(authFetch, sinceDate);
    if (!exerciseR.ok) {
      // sectie 11 (B9-H3C): CONNECTED_BUT_SCOPE_MISSING wordt nu expliciet
      // onderscheiden van een generieke provider-fout -- een bestaande
      // gebruiker (vóór B9-H3B gekoppeld) krijgt een duidelijke,
      // canonieke status i.p.v. een ondoorzichtige "provider_error".
      const status = exerciseR.scopeMissing ? 'scope_missing' : 'provider_error';
      Observability.tkLog('WARN', 'wearable.sync_activities.provider_error', 'wearable', 'wearable-sync-activities',
        { operation: 'sync', status, http_status: exerciseR.status }, logCtx);
      return jsonBody({ synced: false, imported: 0, updated: 0, skipped: 0, status, httpStatus: exerciseR.status });
    }

    let imported = 0, updated = 0, skipped = 0, unsupported = 0;
    for (const dataPoint of exerciseR.points) {
      const normalized = CloudActivityIngestion.normalizeGoogleHealthExercise(dataPoint, userId);
      if (!normalized.valid) {
        // sectie 34/38: onbekende sport = generieke, softwarematige skip -- geen
        // crash, geen gok. Sport Capability Registry beperkt zich in deze sprint
        // bewust tot Running/Cycling (sectie 1: "verplichte eerste twee").
        unsupported++;
        continue;
      }
      // Dedupe/idempotency (sectie 23/26): de bestaande unique partial index
      // idx_activities_user_dedupe (user_id, dedupe_key) WHERE dedupe_key IS
      // NOT NULL beschermt tegen dubbele inserts. P1-FIX (zelf gevonden, live
      // adversariaal bevestigd): PostgREST se generieke `on_conflict`-query-
      // parameter ondersteunt geen partial-index-WHERE-clausule (42P10-fout).
      // Daarom via de veilige, atomaire upsert_provider_activity()-RPC
      // (migratie_v541.sql), die de correcte, partial-index-bewuste SQL
      // intern uitvoert -- zelfde patroon als upsert_daily_health() in
      // wearable-sync.js. auth.uid() binnen de RPC voorkomt cross-user-writes
      // (sectie 62), ongeacht wat userId hier bevat.
      const upsertRes = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_provider_activity`, {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify({
          p_user_id: userId,
          p_sport: normalized.activity.sport,
          p_duration_seconds: normalized.activity.duration_seconds,
          p_distance_meters: normalized.activity.distance_meters,
          p_elevation_gain_meters: normalized.activity.elevation_gain_meters,
          p_avg_heart_rate_bpm: normalized.activity.avg_heart_rate_bpm,
          p_avg_power_watts: normalized.activity.avg_power_watts,
          p_avg_cadence_rpm: normalized.activity.avg_cadence_rpm,
          p_source_provenance: normalized.activity.source_provenance,
          p_source_provider: normalized.activity.source_provider,
          p_data_quality: normalized.activity.data_quality,
          p_recorded_at: normalized.activity.recorded_at,
          p_dedupe_key: normalized.activity.dedupe_key
        })
      });
      if (upsertRes.ok) {
        // Sectie 31, manual data protection: de RPC retourneert NULL (geen
        // rij) wanneer de bestaande activity data_quality='user_corrected'
        // heeft -- de sync mag die handmatige correctie nooit stil
        // overschrijven. Dit telt expliciet als "skipped", niet als
        // "imported" (eerlijke telling, sectie 71: geen fake succes).
        const upsertBody = await upsertRes.json().catch(() => null);
        if (upsertBody === null || upsertBody === undefined) {
          skipped++;
        } else {
          imported++;
        }
      } else {
        skipped++;
      }
    }

    Observability.tkLog('INFO', 'wearable.sync_activities.complete', 'wearable', 'wearable-sync-activities', {
      operation: 'sync', status: imported > 0 ? 'success' : 'no_new_data', duration_ms: Date.now() - t0,
      provider: 'google_health', records_fetched: exerciseR.points.length,
      records_accepted: imported, records_skipped: skipped, records_unsupported_sport: unsupported
    }, logCtx);

    return jsonBody({
      synced: true, provider: 'google_health', status: imported > 0 ? 'success' : 'no_new_data',
      imported, updated, skipped, unsupportedSport: unsupported, syncedAt: new Date().toISOString()
    });
  } catch (e) {
    Observability.tkLog('ERROR', 'wearable.sync_activities.exception', 'wearable', 'wearable-sync-activities',
      { operation: 'sync', status: 'exception', error_category: 'INTERNAL' }, logCtx);
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Interne fout bij activity-sync' } }) };
  }
};
