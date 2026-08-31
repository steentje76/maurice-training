// MS-F13-08 (Multi-Provider Billing). Server-side verificatie van een
// Google Play-aankoop -- de client mag NOOIT zelf zeggen "ik heb premium
// gekocht, zet entitlement aan". Correcte flow: Android purchase ->
// providerbewijs (purchaseToken) -> server-verificatie (dit endpoint) ->
// canonical billing event via reconcile_billing_event() -> entitlement.
//
// Herbruikt de provider-onafhankelijke reconciliation-laag uit MS-F12-04
// zonder enige schemawijziging.
//
// OAuth2 service-account-authenticatie (RFC 7523 JWT Bearer Grant) is
// hier volledig geimplementeerd met Node's ingebouwde crypto-module
// (geen externe dependency) en getest met een gemockt test-keypair --
// conform de eis om de volledige software te bouwen en testen zonder
// te wachten op echte providercredentials.
const crypto = require('crypto');
const Observability = require('../../core/observability.js');

const GOOGLE_PLAY_STATE_TO_CANONICAL = {
  SUBSCRIPTION_STATE_PENDING: 'pending',
  SUBSCRIPTION_STATE_ACTIVE: 'active',
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'active',
  SUBSCRIPTION_STATE_ON_HOLD: 'failed',
  SUBSCRIPTION_STATE_CANCELED: 'cancelled',
  SUBSCRIPTION_STATE_EXPIRED: 'expired',
  SUBSCRIPTION_STATE_PAUSED: 'cancelled'
};

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Bouwt en ondertekent een RFC 7523 JWT-bearer-assertion met de service-
// account-private-key -- het standaard, officiële Google-authenticatie-
// patroon voor server-to-server-toegang, geen OAuth2-user-consent nodig.
function buildServiceAccountAssertion(serviceAccount, scope) {
  const nu = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: nu + 3600,
    iat: nu
  }));
  const signingInput = header + '.' + claims;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), serviceAccount.private_key);
  return signingInput + '.' + base64url(signature);
}

async function fetchGooglePlayAccessToken(serviceAccountJson) {
  const serviceAccount = JSON.parse(serviceAccountJson);
  const assertion = buildServiceAccountAssertion(serviceAccount, 'https://www.googleapis.com/auth/androidpublisher');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(assertion)
  });
  if (!tokenRes.ok) throw new Error('token-uitwisseling mislukt: ' + tokenRes.status);
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

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
  const googleServiceAccountKey = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;
  const androidPackageName = process.env.ANDROID_PACKAGE_NAME;

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
  // KRITIEK: de client mag uitsluitend het providerbewijs (purchaseToken)
  // en de productId aanleveren -- nooit een status, plan, of entitlement.
  const purchaseToken = typeof payload.purchaseToken === 'string' ? payload.purchaseToken : null;
  const productId = typeof payload.productId === 'string' ? payload.productId : null;
  if (!purchaseToken || !productId) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: 'purchaseToken en productId zijn verplicht' } }) };
  }

  if (!googleServiceAccountKey || !androidPackageName || !serviceKey) {
    return { statusCode: 503, body: JSON.stringify({ error: { message: 'Google Play-verificatie is momenteel niet beschikbaar', code: 'PROVIDER_NOT_CONFIGURED' } }) };
  }

  let subscription;
  try {
    const accessToken = await fetchGooglePlayAccessToken(googleServiceAccountKey);
    const verifyRes = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(androidPackageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
      { headers: { Authorization: 'Bearer ' + accessToken } }
    );
    if (!verifyRes.ok) {
      // Onbekend/ongeldig purchaseToken bij Google: fail closed, geen mutatie.
      Observability.tkLog('ERROR', 'billing.google_play.verify_failed', 'billing', 'verify', Object.assign(
        { operation: 'verify_subscription', duration_ms: Date.now() - t0 },
        Observability.normalizeError({ status: verifyRes.status }, { source: 'google_play' })
      ), logCtx);
      return { statusCode: 200, body: JSON.stringify({ error: { message: 'Kon aankoop niet verifiëren' } }) };
    }
    subscription = await verifyRes.json();
  } catch (e) {
    Observability.tkLog('ERROR', 'billing.google_play.provider_unreachable', 'billing', 'verify', Object.assign(
      { operation: 'verify_subscription', duration_ms: Date.now() - t0 },
      Observability.normalizeError(e, { source: 'google_play' })
    ), logCtx);
    return { statusCode: 503, body: JSON.stringify({ error: { message: 'Provider tijdelijk onbereikbaar' } }) };
  }

  const canonicalState = GOOGLE_PLAY_STATE_TO_CANONICAL[subscription.subscriptionState];
  if (!canonicalState) {
    Observability.tkLog('ERROR', 'billing.google_play.unknown_status', 'billing', 'verify', { operation: 'reconcile', duration_ms: Date.now() - t0, metadata: { google_state: subscription.subscriptionState } }, logCtx);
    return { statusCode: 200, body: JSON.stringify({ error: { message: 'Onbekende abonnementsstatus' } }) };
  }

  const finaleGrantedPlanKey = canonicalState === 'active' ? productId : 'gratis';
  const expiresAt = subscription.lineItems && subscription.lineItems[0] && subscription.lineItems[0].expiryTime ? subscription.lineItems[0].expiryTime : null;

  try {
    const rpcRes = await fetch(supabaseUrl + '/rest/v1/rpc/reconcile_billing_event', {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_provider: 'google_play',
        p_provider_object_id: purchaseToken,
        p_event_type: 'subscription_status_change',
        p_target_user_id: userId,
        p_plan_key: finaleGrantedPlanKey,
        p_new_canonical_state: canonicalState,
        p_occurred_at: subscription.startTime || new Date().toISOString(),
        p_idempotency_key: purchaseToken + ':' + subscription.subscriptionState,
        p_expires_at: expiresAt
      })
    });
    if (!rpcRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: { message: 'Reconciliatie mislukt' } }) };
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: canonicalState }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Interne fout' } }) };
  }
};

exports.GOOGLE_PLAY_STATE_TO_CANONICAL = GOOGLE_PLAY_STATE_TO_CANONICAL;
exports.buildServiceAccountAssertion = buildServiceAccountAssertion;
