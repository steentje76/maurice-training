// netlify/functions/nutrition-off-lookup.js
//
// Server-side Open Food Facts barcode-lookup + canonical ingest.
// GEEN client-side provider-aanroep (User-Agent-eis, rate-limit-
// onzekerheid, bestaand precedent coach.js -- zie
// docs/NUTRITION_OFF_STALENESS_AND_SERVER_BOUNDARY.md).
//
// Volgt de bestaande auth-conventie (auth/v1/user, geen lokale JWT-
// decode) en het REJECT/observability-patroon uit coach.js.
//
// PRODUCT OWNER-BESLISSING (Wave 3 closure): technische contact-
// identiteit voor de OFF User-Agent is support@trainingskompas.com,
// niet zelfstandig verzonnen.
const OpenFoodFactsAdapter = require('../../core/nutritionProviderOpenFoodFacts.js');
const NutritionFoundation2Core = require('../../core/nutritionFoundation2.js');
const NutritionIngestService = require('../../core/nutritionIngestService.js');
const Observability = require('../../core/observability.js');

const OFF_TIMEOUT_MS = 8000; // conservatief, geen agressieve retry (Fase 11)
const USER_AGENT = `Trainingskompas/${process.env.APP_VER || 'dev'} (support@trainingskompas.com)`;

function jsonResponse(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async function (event) {
  const t0 = Date.now();
  const correlationId = Observability.newCorrelationId();
  const logCtx = { app_version: process.env.APP_VER || 'unknown', environment: process.env.CONTEXT || 'unknown', correlation_id: correlationId };

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: { message: 'Method not allowed' } });
  }

  // Zelfde auth-conventie als coach.js: verifieer via Supabase auth/v1/user,
  // geen lokale JWT-decode.
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return jsonResponse(401, { error: { message: 'Geen sessie meegegeven' } });
  let userId;
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return jsonResponse(401, { error: { message: 'Ongeldige of verlopen sessie' } });
    const user = await userRes.json();
    if (!user.id) return jsonResponse(401, { error: { message: 'Kon gebruiker niet vaststellen' } });
    userId = user.id;
  } catch (e) {
    return jsonResponse(401, { error: { message: 'Sessie kon niet geverifieerd worden' } });
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(400, { error: { message: 'Ongeldige requestbody' } }); }

  const rawBarcode = payload.barcode;
  if (!rawBarcode) return jsonResponse(400, { error: { message: 'barcode is verplicht' } });

  // Validatie/checksum via de bestaande, geteste Foundation 2-functie --
  // geen tweede, parallelle validatie-implementatie.
  const normalized = NutritionFoundation2Core.normalizeBarcode(rawBarcode);
  if (!normalized) {
    Observability.tkLog('INFO', 'nutrition.off_lookup.invalid_input', 'nutrition', 'off_lookup', logCtx);
    return jsonResponse(400, { status: 'INVALID_IDENTIFIER', error: { message: 'Ongeldige barcode-invoer' } });
  }
  if (normalized.status === 'INVALID_IDENTIFIER') {
    Observability.tkLog('INFO', 'nutrition.off_lookup.invalid_identifier', 'nutrition', 'off_lookup', logCtx);
    return jsonResponse(200, { status: 'INVALID_IDENTIFIER' });
  }

  // Deze Netlify Function ontvangt de lokale-lookup-uitkomst van de
  // client/aanroepende laag (NutritionProductLookupService, client-side)
  // als hint, maar herhaalt zelf GEEN databasecall hier -- de daadwerkelijke
  // canonical persistence gebeurt via PostgREST met de gebruikers-JWT
  // (RLS-gedekt, geen service-role-bypass), niet in deze functie zelf.
  // Deze functie is uitsluitend verantwoordelijk voor de PROVIDER-aanroep
  // en normalisatie -- persistence blijft aan de client (via bestaande
  // sbPostQ-infrastructuur), conform "geen tweede platformframework".

  let offResponse;
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalized.value)}.json`;
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } }, OFF_TIMEOUT_MS);
    if (!res.ok) {
      Observability.tkLog('WARN', 'nutrition.off_lookup.provider_unavailable', 'nutrition', 'off_lookup', Object.assign({}, logCtx, { http_status: res.status }));
      return jsonResponse(200, { status: 'SOURCE_UNAVAILABLE' });
    }
    offResponse = await res.json();
  } catch (e) {
    const isTimeout = e && e.name === 'AbortError';
    Observability.tkLog('WARN', isTimeout ? 'nutrition.off_lookup.provider_timeout' : 'nutrition.off_lookup.provider_unavailable', 'nutrition', 'off_lookup', logCtx);
    return jsonResponse(200, { status: isTimeout ? 'TIMEOUT' : 'SOURCE_UNAVAILABLE' });
  }

  // KERN: HTTP 200 + OFF status:0 = NOT_FOUND, NOOIT succes.
  const validation = OpenFoodFactsAdapter.validateResponse(offResponse);
  if (!validation.valid) {
    Observability.tkLog('INFO', validation.reason === 'NOT_FOUND' ? 'nutrition.off_lookup.provider_not_found' : 'nutrition.off_lookup.normalization_failed', 'nutrition', 'off_lookup', logCtx);
    return jsonResponse(200, { status: validation.reason });
  }

  const nowIso = new Date().toISOString();
  const candidate = OpenFoodFactsAdapter.normalizeProduct(offResponse.product, normalized.value);
  const sourceMeta = OpenFoodFactsAdapter.getSourceMetadata(offResponse, nowIso);
  const dataQuality = OpenFoodFactsAdapter.evaluateDataQuality(candidate, offResponse.product && offResponse.product.completeness);

  if (!candidate.name) {
    Observability.tkLog('INFO', 'nutrition.off_lookup.incomplete_product', 'nutrition', 'off_lookup', logCtx);
    return jsonResponse(200, { status: 'INCOMPLETE_PRODUCT' });
  }

  Observability.tkLog('INFO', 'nutrition.off_lookup.provider_hit', 'nutrition', 'off_lookup', Object.assign({}, logCtx, { duration_ms: Date.now() - t0 }));

  // Geen directe database-write hier (persistence via client-side,
  // RLS-gedekte sbPostQ-aanroepen, conform bestaand offline/idempotency-
  // patroon) -- deze functie levert het genormaliseerde candidate +
  // provenance + data_quality terug, klaar voor canonical ingest door
  // de client volgens NutritionIngestService.resolveIngestDecision().
  return jsonResponse(200, {
    status: 'FOUND_PROVIDER',
    identifier_type: normalized.identifier_type,
    candidate: candidate,
    provenance: sourceMeta,
    data_quality: dataQuality
  });
};
