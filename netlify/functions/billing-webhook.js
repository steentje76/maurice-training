// MS-F12-04 (Billing & Reconciliation). Mollie-webhook -- FETCH-TO-CONFIRM
// (het enige, officiële veilige patroon: Mollie-webhooks zijn NIET
// gesigneerd, geen HMAC, geen shared secret -- de body bevat uitsluitend
// een payment-ID). Een geforgede webhook-aanroep kan hierdoor NOOIT meer
// bereiken dan het opnieuw ophalen van een payment die de server zelf,
// met de eigen API-key, bij Mollie bevestigt te bestaan.
//
// Geen JWT nodig voor dit endpoint (Mollie kan geen gebruikers-JWT sturen)
// -- de autoriteit komt volledig van de server-to-server Mollie-API-lookup
// met de eigen, geheime API-key, nooit uit de inkomende request zelf.
//
// TRUST BOUNDARY: dit endpoint mag UITSLUITEND de commerciële authority-
// velden (plan_key/status/expiry) via reconcile_billing_event() bijwerken
// -- nooit role/gym_id/organization membership/privacy/consent.
const Observability = require('../../core/observability.js');

const MOLLIE_STATUS_TO_CANONICAL = {
  open: 'pending',
  pending: 'pending',
  authorized: 'pending',
  paid: 'active',
  failed: 'failed',
  canceled: 'cancelled',
  expired: 'expired'
};

exports.handler = async function(event) {
  const t0 = Date.now();
  const correlationId = Observability.newCorrelationId();
  const logCtx = { app_version: process.env.APP_VER || 'unknown', environment: process.env.CONTEXT || 'unknown', correlation_id: correlationId };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mollieApiKey = process.env.MOLLIE_API_KEY;
  if (!serviceKey || !mollieApiKey) {
    return { statusCode: 500, body: 'Server niet correct geconfigureerd' };
  }

  let paymentId;
  try {
    const params = new URLSearchParams(event.body || '');
    paymentId = params.get('id');
  } catch (e) {
    return { statusCode: 400, body: 'Ongeldige body' };
  }
  if (!paymentId || !/^tr_[A-Za-z0-9]+$/.test(paymentId)) {
    Observability.tkLog('ERROR', 'billing.webhook.malformed', 'billing', 'webhook', { operation: 'webhook_receive', duration_ms: Date.now() - t0 }, logCtx);
    return { statusCode: 400, body: 'Ongeldig payment-ID' };
  }

  let payment;
  try {
    const mollieRes = await fetch('https://api.mollie.com/v2/payments/' + encodeURIComponent(paymentId), {
      headers: { Authorization: 'Bearer ' + mollieApiKey }
    });
    if (!mollieRes.ok) {
      Observability.tkLog('ERROR', 'billing.webhook.provider_lookup_failed', 'billing', 'webhook', Object.assign(
        { operation: 'provider_lookup', duration_ms: Date.now() - t0 },
        Observability.normalizeError({ status: mollieRes.status }, { source: 'mollie' })
      ), logCtx);
      return { statusCode: 200, body: 'OK' };
    }
    payment = await mollieRes.json();
  } catch (e) {
    Observability.tkLog('ERROR', 'billing.webhook.provider_unreachable', 'billing', 'webhook', Object.assign(
      { operation: 'provider_lookup', duration_ms: Date.now() - t0 },
      Observability.normalizeError(e, { source: 'mollie' })
    ), logCtx);
    return { statusCode: 503, body: 'Provider tijdelijk onbereikbaar' };
  }

  const userId = payment.metadata && payment.metadata.user_id;
  const planKey = payment.metadata && payment.metadata.plan_key;
  if (!userId || !planKey) {
    Observability.tkLog('ERROR', 'billing.webhook.missing_metadata', 'billing', 'webhook', { operation: 'reconcile', duration_ms: Date.now() - t0 }, logCtx);
    return { statusCode: 200, body: 'OK' };
  }

  const canonicalState = MOLLIE_STATUS_TO_CANONICAL[payment.status];
  if (!canonicalState) {
    Observability.tkLog('ERROR', 'billing.webhook.unknown_status', 'billing', 'webhook', { operation: 'reconcile', duration_ms: Date.now() - t0, metadata: { mollie_status: payment.status } }, logCtx);
    return { statusCode: 200, body: 'OK' };
  }

  const finaleGrantedPlanKey = canonicalState === 'active' ? planKey : 'gratis';
  const expiresAt = canonicalState === 'active' ? new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString() : null;

  try {
    const rpcRes = await fetch(supabaseUrl + '/rest/v1/rpc/reconcile_billing_event', {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_provider: 'mollie',
        p_provider_object_id: paymentId,
        p_event_type: 'payment_status_change',
        p_target_user_id: userId,
        p_plan_key: finaleGrantedPlanKey,
        p_new_canonical_state: canonicalState,
        p_occurred_at: payment.createdAt || new Date().toISOString(),
        p_idempotency_key: paymentId + ':' + payment.status,
        p_expires_at: expiresAt
      })
    });
    if (!rpcRes.ok) {
      Observability.tkLog('ERROR', 'billing.webhook.reconcile_failed', 'billing', 'webhook', { operation: 'reconcile', duration_ms: Date.now() - t0 }, logCtx);
      return { statusCode: 500, body: 'Reconciliatie mislukt' };
    }
    Observability.tkLog('INFO', 'billing.webhook.reconciled', 'billing', 'webhook', {
      operation: 'reconcile', duration_ms: Date.now() - t0, metadata: { canonical_state: canonicalState }
    }, logCtx);
    return { statusCode: 200, body: 'OK' };
  } catch (e) {
    Observability.tkLog('ERROR', 'billing.webhook.reconcile_exception', 'billing', 'webhook', Object.assign(
      { operation: 'reconcile', duration_ms: Date.now() - t0 },
      Observability.normalizeError(e, { source: 'billing-webhook' })
    ), logCtx);
    return { statusCode: 500, body: 'Interne fout' };
  }
};
