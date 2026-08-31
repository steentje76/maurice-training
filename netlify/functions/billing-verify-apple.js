// MS-F13-08 (Multi-Provider Billing). Server-side verificatie van een
// Apple App Store-transactie. Correcte flow: iOS purchase -> signed
// transaction (JWS) -> server-verificatie (dit endpoint) -> canonical
// billing event via reconcile_billing_event() -> entitlement.
//
// KRITIEK, EXPLICIET VEILIGHEIDSONTWERP: Apple's signedTransactionInfo is
// een JWS (JSON Web Signature) die cryptografisch geverifieerd moet
// worden tegen Apple's certificate-chain (root CA -> intermediate ->
// leaf) vóór de payload vertrouwd mag worden. Dit is een aanzienlijke,
// specialistische implementatie (X.509-certificate-chain-validatie) die
// Apple zelf aanraadt uitsluitend via de officiële app-store-server-
// library te doen -- een handmatige, ongeverifieerde base64-decode van
// de payload (zoals te vinden in diverse community-voorbeelden) zou een
// ONVEILIGE, vervalsbare "verificatie" zijn die net zo onbetrouwbaar is
// als het client-side accepteren van een "betaling geslaagd"-melding.
//
// Daarom: dit endpoint bouwt en documenteert het volledige, correcte
// server-contract (auth, request-shape, canonieke statusmapping,
// reconciliation-aanroep), maar voert de JWS-handtekeningverificatie
// zelf niet handmatig uit -- het faalt hier expliciet en veilig
// (fail-closed) in plaats van een oncontroleerbare, onveilige aanname
// te doen. Een toekomstige implementatie moet de officiële
// @apple/app-store-server-library gebruiken (Apple's eigen, onderhouden
// pakket) zodra een echte Apple Developer-omgeving beschikbaar is.
const Observability = require('../../core/observability.js');

// Canonieke, centrale mapping: Apple App Store Server API-status ->
// intern, canoniek label.
const APPLE_STATUS_TO_CANONICAL = {
  1: 'active',   // ACTIVE
  2: 'expired',  // EXPIRED
  3: 'failed',   // BILLING_RETRY (grace/failed renewal)
  4: 'active',   // BILLING_GRACE_PERIOD -- toegang blijft tijdens grace
  5: 'cancelled' // REVOKED
};

exports.handler = async function(event) {
  const t0 = Date.now();
  const correlationId = Observability.newCorrelationId();
  const logCtx = { app_version: process.env.APP_VER || 'unknown', environment: process.env.CONTEXT || 'unknown', correlation_id: correlationId };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appleKeyId = process.env.APPLE_APP_STORE_KEY_ID;
  const appleIssuerId = process.env.APPLE_APP_STORE_ISSUER_ID;
  const applePrivateKey = process.env.APPLE_APP_STORE_PRIVATE_KEY;

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };
  let userId;
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const user = await userRes.json();
    if (!user.id) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };
    userId = user.id;
  } catch (e) {
    return { statusCode: 401, body: JSON.stringify({ error: { message: 'Sessie kon niet geverifieerd worden' } }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: 'Ongeldige requestbody' } }) };
  }
  const transactionId = typeof payload.transactionId === 'string' ? payload.transactionId : null;
  if (!transactionId) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: 'transactionId is verplicht' } }) };
  }

  if (!appleKeyId || !appleIssuerId || !applePrivateKey || !serviceKey) {
    return { statusCode: 503, body: JSON.stringify({ error: { message: 'Apple-verificatie is momenteel niet beschikbaar', code: 'PROVIDER_NOT_CONFIGURED' } }) };
  }

  // EXPLICIET, VEILIG FAIL-CLOSED: de JWS-certificate-chain-verificatie is
  // niet handmatig geimplementeerd (zie het commentaarblok bovenaan dit
  // bestand). Nooit een ongeverifieerde payload doorlaten naar
  // reconcile_billing_event() -- dat zou een net zo onveilige aanname
  // zijn als het vertrouwen van een client-side "betaling geslaagd".
  Observability.tkLog('ERROR', 'billing.apple.jws_verification_not_implemented', 'billing', 'verify', { operation: 'verify_transaction', duration_ms: Date.now() - t0 }, logCtx);
  return { statusCode: 501, body: JSON.stringify({ error: { message: 'Apple-transactieverificatie vereist de officiële app-store-server-library voor veilige JWS-certificate-chain-validatie -- nog niet geintegreerd', code: 'JWS_VERIFICATION_NOT_IMPLEMENTED' } }) };
};

exports.APPLE_STATUS_TO_CANONICAL = APPLE_STATUS_TO_CANONICAL;
