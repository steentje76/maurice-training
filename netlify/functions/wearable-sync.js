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
const { getWearableTokenSecret, updateWearableTokenSecret } = require('./wearableTokenVault.js');

const GOOGLE_HEALTH_DATA_TYPES = {
  hrv:   { id: 'daily-heart-rate-variability', filterField: 'daily_heart_rate_variability', kind: 'daily' },
  rhr:   { id: 'daily-resting-heart-rate',     filterField: 'daily_resting_heart_rate',     kind: 'daily' },
  sleep: { id: 'sleep',                        filterField: 'sleep',                        kind: 'session' }
};
const GOOGLE_HEALTH_BASE = 'https://health.googleapis.com/v4';

function jsonBody(obj) { return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

/* ── FOUTCODE-TAXONOMIE (v4) ──────────────────────────────────────────────────
 * Intern onderscheiden we foutsoorten zodat een incident in één oogopslag te
 * plaatsen is; de GEBRUIKER krijgt altijd dezelfde veilige tekst. Er gaan nooit
 * tokens, secrets, payloads of gezondheidswaarden naar de client of naar de log.
 * ────────────────────────────────────────────────────────────────────────────*/
const ERR = {
  AUTH: 'AUTH_ERROR',                    // geen/ongeldige Supabase-sessie
  TOKEN_REFRESH: 'TOKEN_REFRESH_ERROR',  // refresh_token ontbreekt of Google weigert
  PROVIDER_API: 'FITBIT_API_ERROR',      // Google Health gaf 4xx/5xx
  RATE_LIMIT: 'RATE_LIMIT',              // Google Health gaf 429
  NETWORK: 'NETWORK_ERROR',              // transportfout richting Google/Supabase
  SUPABASE: 'SUPABASE_ERROR',            // PostgREST gaf een fout of onverwachte vorm
  INVALID_RESPONSE: 'INVALID_RESPONSE',  // niet-JSON of onverwachte structuur
  NOT_CONNECTED: 'NOT_CONNECTED',
  UNKNOWN: 'UNKNOWN_ERROR'
};
const USER_MSG = 'Synchroniseren met Fitbit is momenteel niet gelukt. Probeer het later opnieuw.';

// Mapt een opgevangen exception naar een foutcode zonder de boodschap door te geven.
function classifyException(e) {
  if (e && e.tkCode) return e.tkCode;
  const m = String((e && e.message) || '');
  if (/fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|network|socket/i.test(m)) return ERR.NETWORK;
  if (/JSON|Unexpected token|is not iterable|undefined is not/i.test(m)) return ERR.INVALID_RESPONSE;
  return ERR.UNKNOWN;
}
// HTTP-status van de provider → foutcode.
function providerCode(status) {
  if (status === 429) return ERR.RATE_LIMIT;
  if (status === 401 || status === 403) return ERR.AUTH;
  return ERR.PROVIDER_API;
}
function tkError(code, message) { const e = new Error(message || code); e.tkCode = code; return e; }

// Leest een PostgREST-respons als ARRAY. Bij een fout-object of niet-ok status →
// getypeerde SUPABASE_ERROR i.p.v. een TypeError verderop.
async function sbRows(res, what) {
  let body;
  try { body = await res.json(); }
  catch (_) { throw tkError(ERR.SUPABASE, 'supabase non-json: ' + what); }
  if (!res.ok || !Array.isArray(body)) throw tkError(ERR.SUPABASE, 'supabase ' + what + ' status ' + res.status);
  return body;
}

exports.handler = async function (event) {
  const Observability = require('../../core/observability.js');
  const t0 = Date.now();
  const correlationId = Observability.newCorrelationId();
  const logCtx = { app_version: process.env.APP_VER || 'unknown', environment: process.env.CONTEXT || 'unknown', correlation_id: correlationId };
  Observability.tkLog('INFO', 'wearable.sync.start', 'wearable', 'wearable-sync', { operation: 'sync', provider: 'google_health' }, logCtx);
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
  // Buiten de try: de catch moet de mislukking bij de JUISTE gebruiker kunnen vastleggen.
  // Voorheen stond hier `undefined`, waardoor markSyncStatus stilletjes niets deed en
  // last_sync_status op de vorige 'ok' bleef staan — een fout werd dus nergens zichtbaar.
  let userId = null;

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ code: ERR.AUTH, error: { message: 'Ongeldige of verlopen sessie' } }) };
    const userJson = await userRes.json();
    userId = userJson && userJson.id;
    if (!userId) return { statusCode: 401, body: JSON.stringify({ code: ERR.AUTH, error: { message: 'Kon gebruiker niet vaststellen' } }) };

    const connRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health&limit=1`, { headers: sbHeaders });
    // sbRows: een échte Supabase-fout wordt een getypeerde SUPABASE_ERROR i.p.v.
    // stilzwijgend "not_connected" (dat zou een storing als "niet gekoppeld" tonen).
    const [conn] = await sbRows(connRes, 'wearable_connections');
    if (!conn) return jsonBody({ synced: false, daysWritten: 0, provider: 'fitbit', status: 'not_connected', code: ERR.NOT_CONNECTED, reason: 'not_connected' });

    // F13 Post-Audit Remediation (P1-09): tokens staan niet langer in
    // plaintext op conn.access_token/refresh_token, maar als een Vault-
    // secret-verwijzing (access_token_secret_id/refresh_token_secret_id).
    // getWearableTokenSecret() decrypt uitsluitend server-side, met de
    // service-role-sleutel -- nooit client-readable.
    let accessToken = await getWearableTokenSecret(supabaseUrl, serviceKey, conn.access_token_secret_id);
    const refreshTokenValue = conn.refresh_token_secret_id ? await getWearableTokenSecret(supabaseUrl, serviceKey, conn.refresh_token_secret_id) : null;
    if (!accessToken) {
      await markSyncStatus(supabaseUrl, sbHeaders, userId, 'token_expired_no_refresh');
      return jsonBody({ synced: false, daysWritten: 0, provider: 'fitbit', status: 'token_expired', code: ERR.TOKEN_REFRESH, reason: 'token_secret_unavailable' });
    }

    // Token verversen als hij binnen 5 minuten verloopt of al verlopen is.
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      if (!refreshTokenValue || !clientId || !clientSecret) {
        await markSyncStatus(supabaseUrl, sbHeaders, userId, 'token_expired_no_refresh');
        return jsonBody({ synced: false, daysWritten: 0, provider: 'fitbit', status: 'token_expired', code: ERR.TOKEN_REFRESH, reason: 'token_expired_no_refresh' });
      }
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ refresh_token: refreshTokenValue, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' })
      });
      let refreshed = null;
      try { refreshed = await refreshRes.json(); } catch (_) { refreshed = null; }
      if (!refreshRes.ok || !refreshed || !refreshed.access_token) {
        await markSyncStatus(supabaseUrl, sbHeaders, userId, 'refresh_failed');
        // refresh mislukt = koppeling verlopen → client toont "Opnieuw koppelen nodig"
        return jsonBody({ synced: false, daysWritten: 0, provider: 'fitbit', status: 'token_expired', code: ERR.TOKEN_REFRESH, reason: 'refresh_failed' });
      }
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
      // F13 Post-Audit Remediation (P1-09): de vernieuwde token wordt in
      // hetzelfde Vault-secret bijgewerkt (rotation strategy) -- geen
      // nieuwe secret-rij per refresh, en nooit meer plaintext in
      // wearable_connections zelf.
      await updateWearableTokenSecret(supabaseUrl, serviceKey, conn.access_token_secret_id, accessToken);
      await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health`, {
        method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ token_expires_at: newExpiresAt })
      });
    }

    // Laatste 7 dagen ophalen (vangt gemiste syncs op zonder overdreven veel data per keer).
    const since = new Date(); since.setDate(since.getDate() - 7);
    const sinceDate = since.toISOString().split('T')[0];
    const dateTo = new Date().toISOString().split('T')[0];
    // "Vandaag" in Europe/Amsterdam (niet blind UTC) → eerlijke today-semantiek + diagnostiek.
    const todayAms = LIB.amsterdamToday(Date.now());
    const authFetch = (url) => fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });

    const [hrvR, rhrR, sleepR] = await Promise.all([
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.hrv, sinceDate),
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.rhr, sinceDate),
      fetchDataPoints(authFetch, GOOGLE_HEALTH_DATA_TYPES.sleep, sinceDate)
    ]);
    const hrvData = hrvR.points, rhrData = rhrR.points, sleepData = sleepR.points;

    // Per datum samenvoegen via de PRODUCTIE-SHAPE parsers (nested records; officiële veldnamen).
    // Datum + waarde komen uit het geneste record — niet top-level (dat was de parsed:0-bug).
    const byDate = {};
    let parsedHrv = 0, parsedRhr = 0, parsedSleep = 0;
    hrvData.forEach(p => { const r = LIB.parseHrvPoint(p); if (r && r.date) { (byDate[r.date] ||= {}).hrv = r.value; if (r.value != null) parsedHrv++; } });
    rhrData.forEach(p => { const r = LIB.parseRhrPoint(p); if (r && r.date) { (byDate[r.date] ||= {}).rhr = r.value; if (r.value != null) parsedRhr++; } });
    sleepData.forEach(p => { const r = LIB.parseSleepPoint(p); if (r && r.date) { (byDate[r.date] ||= {}).sleep = r.value; if (r.value != null) parsedSleep++; } });

    let imported = 0, updated = 0, skipped = 0;
    let todayWrite = 'none'; // 'imported' | 'updated' | 'skipped' | 'none' — wat gebeurde er specifiek met VANDAAG
    for (const [date, vals] of Object.entries(byDate)) {
      const cls = LIB.classifyWrite(vals, false); // voorlopige klasse; existing bepaalt update vs import
      if (cls === 'skipped') { skipped++; if (date === todayAms) todayWrite = 'skipped'; continue; }
      // GAP-P1-008-closure (F3 Closure Hotfix): het oude lees-existing-dan-PATCH/POST-patroon
      // (niet-atomair, bewees een race-condition met 4 duplicate-rij-paren live in productie)
      // is vervangen door één atomaire RPC-aanroep (migratie_v500.sql, INSERT..ON CONFLICT..
      // DO UPDATE). De database lost de merge/lock zelf op, per veld, in één transactie.
      // Onderstaande existence-check is UITSLUITEND voor de imported/updated-telling
      // (diagnostiek) — hij beïnvloedt de write zelf niet en introduceert dus geen race
      // terug in het schrijfpad zelf.
      const existsRes = await fetch(`${supabaseUrl}/rest/v1/hrv_log?user_id=eq.${userId}&date=eq.${date}&select=id&limit=1`, { headers: sbHeaders });
      const bestondAl = (await sbRows(existsRes, 'hrv_log')).length > 0;

      const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_daily_health`, {
        method: 'POST', headers: sbHeaders,
        body: JSON.stringify({
          p_user_id: userId, p_date: date,
          p_hrv: vals.hrv != null ? vals.hrv : null,
          p_rhr: vals.rhr != null ? vals.rhr : null,
          p_sleep: vals.sleep != null ? vals.sleep : null,
          p_cyclus_fase: null, p_edema: null,
          p_note: LIB.provenanceNote(null),
          p_source: 'wearable'
        })
      });
      if (rpcRes.ok) {
        if (bestondAl) { updated++; if (date === todayAms) todayWrite = 'updated'; }
        else { imported++; if (date === todayAms) todayWrite = 'imported'; }
      }
    }
    // Eerlijke vandaag-samenvatting (Amsterdam): fetched vs parsed vs written — bewijst waar de keten VANDAAG stopt.
    const today = LIB.todaySummary(byDate, todayAms);
    today.written = todayWrite;

    // DIAGNOSTIEK — uitsluitend tellingen/statussen/structuur (nooit tokens/waarden/PII).
    // `recordShape` toont de GENESTE leaf-keys (bv. van dailyRestingHeartRate) zodat een afwijkend
    // RHR-veld direct zichtbaar is zonder ooit een waarde te loggen.
    // Providerfouten per datatype (429/4xx/5xx) — voor de log én voor het antwoord.
    const httpStatuses = { hrv: hrvR.status, rhr: rhrR.status, sleep: sleepR.status };
    const failed = [hrvR, rhrR, sleepR].filter(r => !r.ok);
    const providerErr = failed.length ? providerCode(failed[0].status) : null;

    console.log('wearable-sync diag', JSON.stringify({
      provider: 'google_health', dateFrom: sinceDate, dateTo, today: todayAms,
      http: { hrv: hrvR.status, rhr: rhrR.status, sleep: sleepR.status },
      fetched: { hrv: hrvData.length, rhr: rhrData.length, sleep: sleepData.length },
      parsed: { hrv: parsedHrv, rhr: parsedRhr, sleep: parsedSleep },
      // VANDAAG apart: onderscheidt A (upstream heeft vandaag niet: fetched=false) van B (veldnaam: fetched=true, parsed=false)
      todayDiag: { date: todayAms, fetched: today.fetched, parsed: today.metrics, written: today.written, available: today.available },
      shape: { hrv: LIB.pointShape(hrvData[0]), rhr: LIB.pointShape(rhrData[0]), sleep: LIB.pointShape(sleepData[0]) },
      recordShape: { hrv: LIB.recordShape(hrvData[0], 'dailyHeartRateVariability'), rhr: LIB.recordShape(rhrData[0], 'dailyRestingHeartRate'), sleep: LIB.recordShape(sleepData[0], 'sleep') },
      // sleep.summary-keys: bewijst of we een echte slaapduur gebruiken of terugvallen op
      // het interval (= tijd in bed). Alleen KEYS, nooit waarden.
      sleepSummaryShape: LIB.sleepSummaryShape(sleepData[0]),
      providerError: providerErr,
      written: { imported, updated, skipped }
    }));

    const result = LIB.syncResult({ imported, updated, skipped });
    await markSyncStatus(supabaseUrl, sbHeaders, userId, imported + updated > 0 ? 'ok' : 'no_new_data');
    Observability.tkLog('INFO', 'wearable.sync.complete', 'wearable', 'wearable-sync', {
      operation: 'sync', status: result.status, duration_ms: Date.now() - t0, provider: 'google_health',
      records_fetched: hrvData.length + rhrData.length + sleepData.length,
      records_accepted: imported + updated, records_skipped: skipped
    }, logCtx);
    // Backward-compat velden (synced, daysWritten) + canoniek contract + PER-METRIC tellingen
    // (client maakt hiermee "HRV 8 dagen · slaap 8 dagen · rusthartslag geen nieuwe data").
    // `today` maakt EERLIJK expliciet of vandaag beschikbaar is — "success" (er is íéts in 7 dagen
    // geschreven) mag niet verward worden met "vandaag is binnen". available/metrics komen UITSLUITEND
    // uit echt geparste Google-Health-data voor de Amsterdamse datum van vandaag.
    return jsonBody({ ...result, syncedAt: new Date().toISOString(),
      // http = HTTP-status per datatype (geen payload) zodat een incident zonder toegang
      // tot de Netlify-logs al te plaatsen is: 200 + fetched>0 + metrics=0 = parserfout,
      // 4xx = provider/permissie, 429 = rate limit.
      http: httpStatuses,
      code: providerErr,
      fetched: { hrv: hrvData.length, rhr: rhrData.length, sleep: sleepData.length },
      metrics: { hrv: parsedHrv, rhr: parsedRhr, sleep: parsedSleep },
      today: today });
  } catch (e) {
    const code = classifyException(e);
    // Alleen de CODE in de log — geen stacktrace met URLs/tokens, geen gezondheidsdata.
    console.error('wearable-sync error', JSON.stringify({ code, at: 'handler' }));
    Observability.tkLog('ERROR', 'wearable.sync.failed', 'wearable', 'wearable-sync', Object.assign(
      { operation: 'sync', duration_ms: Date.now() - t0, provider: 'google_health' },
      Observability.normalizeError(e, { source: 'wearable-sync', error_code: code })
    ), logCtx);
    try { await markSyncStatus(supabaseUrl, sbHeaders, userId, 'error:' + code); } catch (_) {}
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ synced: false, provider: 'fitbit', status: 'sync_failed', code, error: { message: USER_MSG } }) };
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
    if (!r.ok) { console.warn('wearable-sync provider niet ok', JSON.stringify({ type: dataType.id, status: r.status, code: providerCode(r.status) })); return { points: [], status: r.status, ok: false }; }
    const d = await r.json();
    // asArray: bij een onverwachte responsvorm liever 0 punten dan een crash verderop.
    return { points: LIB.asArray(d.dataPoints || d.data_points), status: r.status, ok: true };
  } catch (e) {
    console.warn('wearable-sync provider exception', JSON.stringify({ type: dataType.id, code: classifyException(e) }));
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
