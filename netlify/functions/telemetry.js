// netlify/functions/telemetry.js — F13 Post-Audit Remediation (P1-13).
//
// Ontvangt client-side crash-/errortelemetrie (window.onerror/
// unhandledrejection) en slaat deze veilig op in client_telemetry_events
// (migratie_v528.sql). GEEN analytics-warehouse, GEEN user-behavior-
// tracking -- uitsluitend crash/error-diagnose vóór een gesloten beta.
//
// Veiligheidseisen (conform de F13 Post-Audit-opdracht):
// - redaction: server-side, aanvullende redactie bovenop de al
//   client-side geredacteerde payload (nooit volledig vertrouwen op de
//   client alleen -- een gemanipuleerde client zou ongeredacteerde data
//   kunnen sturen).
// - payload size limit: een klein, vast maximum per event.
// - rate limit: een eenvoudige, in-memory limiet per Netlify Function-
//   instance (best-effort -- een volledige, gedistribueerde rate-limiter
//   valt buiten de scope van deze minimale telemetrie-foundation).
// - failure must never break app: elke fout hier resulteert in een
//   stille 200/204, nooit een crash of een zichtbare fout voor de
//   gebruiker (telemetrie is nooit kritisch pad).
// - USER FEEDBACK blijft apart (dit endpoint is uitsluitend voor
//   automatische crash-events, nooit voor met-de-hand ingevoerde
//   gebruikersfeedback).
const Observability = require('../../core/observability.js');

const MAX_PAYLOAD_BYTES = 4096; // klein, vast maximum -- crash-events zijn kort
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_PER_USER = 20; // ruim voldoende voor legitieme crash-bursts, voorkomt misbruik
// Best-effort, in-memory (per Netlify Function-instance, geen gedeelde store nodig
// voor deze minimale foundation -- een instance-restart reset de teller, acceptabel
// voor dit doel).
const _rateLimitState = {};

function checkRateLimit(key) {
  const now = Date.now();
  const entry = _rateLimitState[key];
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    _rateLimitState[key] = { windowStart: now, count: 1 };
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX_PER_USER;
}

// Aanvullende, server-side redactie -- nooit volledig vertrouwen op de
// client-side redact()/normalizeError() alleen. Toegestane velden zijn
// een expliciete whitelist (fail-closed: onbekende velden worden nooit
// doorgelaten).
function sanitizeEvent(body, userId) {
  const toegestaanEventType = typeof body.event_type === 'string' && body.event_type.length <= 100
    ? body.event_type : 'app.unknown_event';
  return {
    user_id: userId || null,
    app_version: typeof body.app_version === 'string' ? body.app_version.slice(0, 32) : null,
    platform: typeof body.platform === 'string' ? body.platform.slice(0, 32) : null,
    // route: nooit de volledige URL (kan query-parameters met gevoelige data
    // bevatten) -- alleen een kort, intern scherm-label van de client.
    route: typeof body.route === 'string' ? body.route.slice(0, 100) : null,
    event_type: toegestaanEventType,
    error_code: typeof body.error_code === 'string' ? body.error_code.slice(0, 64) : null,
    // message_safe: de client stuurt al de door normalizeError() gegenereerde,
    // generieke, geen-stack-trace-bevattende boodschap. Extra lengtelimiet
    // en een tweede, server-side check op bekende, gevoelige patronen.
    message_safe: typeof body.message_safe === 'string' ? redactServerSide(body.message_safe.slice(0, 300)) : null,
    correlation_id: typeof body.correlation_id === 'string' ? body.correlation_id.slice(0, 64) : null,
    release_sha: typeof body.release_sha === 'string' ? body.release_sha.slice(0, 64) : null
  };
}

function redactServerSide(tekst) {
  // Fail-safe, tweede laag: als er toch per ongeluk iets gevoelig-uitziends
  // doorkomt (bijv. een token-achtige string), vervang die -- nooit de hele
  // request laten falen op basis hiervan.
  return tekst.replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[REDACTED_LONG_TOKEN]');
}

exports.handler = async function (event) {
  // Failure must never break app: elke onverwachte fout hier resulteert
  // in een stille 204, nooit een zichtbare fout voor de gebruiker.
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
    if (!serviceKey) return { statusCode: 204, body: '' }; // best-effort, nooit blokkerend

    if (!event.body || event.body.length > MAX_PAYLOAD_BYTES) {
      return { statusCode: 204, body: '' }; // payload size limit -- stil negeren, nooit crashen
    }

    // Telemetrie vereist een sessie (voorkomt dat een volledig anonieme
    // partij dit endpoint als open write-sink misbruikt) -- maar een
    // ontbrekende/ongeldige sessie mag de crash-rapportage zelf nooit laten
    // crashen; user_id wordt dan simpelweg null (nog steeds toegestaan
    // conform de RLS-policy, voor crashes vóór het inloggen).
    const authHeader = event.headers.authorization || event.headers.Authorization;
    let userId = null;
    let rateLimitKey = 'anon';
    if (authHeader) {
      try {
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
        if (userRes.ok) {
          const userJson = await userRes.json();
          userId = userJson && userJson.id ? userJson.id : null;
          rateLimitKey = userId || 'anon';
        }
      } catch (e) { /* best-effort: geen geldige sessie -> user_id blijft null */ }
    }

    if (!checkRateLimit(rateLimitKey)) {
      return { statusCode: 204, body: '' }; // rate limit overschreden -- stil negeren
    }

    let body;
    try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 204, body: '' }; }

    const sanitized = sanitizeEvent(body, userId);

    // BELANGRIJKE, LIVE ONTDEKTE LES (migratie_v528.sql): deze tabel heeft
    // GEEN SELECT-RLS-policy -- "Prefer: return=representation" zou daarom
    // altijd falen (Postgres RETURNING-semantiek vereist SELECT-zichtbaarheid).
    // Gebruik hier ALTIJD return=minimal.
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/client_telemetry_events`, {
      method: 'POST',
      headers: {
        apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal'
      },
      body: JSON.stringify(sanitized)
    });
    if (!insertRes.ok) {
      // Best-effort: een mislukte telemetrie-write mag nooit een fout naar
      // de client teruggeven -- dat zou een tweede, zichtbare fout creëren
      // bovenop de oorspronkelijke crash die net gerapporteerd werd.
      Observability.tkLog('WARN', 'telemetry.ingest_failed', 'platform', 'telemetry', {
        operation: 'ingest', metadata: { status: insertRes.status }
      }, {});
    }
    return { statusCode: 204, body: '' };
  } catch (e) {
    // Absolute fail-safe: telemetrie mag onder geen enkele omstandigheid
    // de app breken of een zichtbare fout veroorzaken.
    return { statusCode: 204, body: '' };
  }
};
