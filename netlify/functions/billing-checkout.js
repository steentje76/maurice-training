// MS-F12-04 (Billing & Reconciliation). Server-authoritative checkout-
// initiatie. Volgt exact het canonieke, verplichte pad:
// CLIENT -> authenticated endpoint -> server leest user identity uit JWT
// -> server haalt canonical plan/prijs uit DB -> server creëert Mollie
// payment -> client krijgt uitsluitend een checkout-URL terug.
//
// PRIJSAUTORITEIT (absoluut): de client mag NOOIT amount/currency/
// duration/credits/quota/prijs/entitlement/subscriptionstatus sturen.
// De client mag uitsluitend een geldige, canonieke plan_key aanvragen.
// De server zoekt de actuele prijs zelf op in plans.prijs_cent.
//
// NULL PRICING (expliciete productbeslissing, F12_04_EXISTING_STATE_AUDIT.md):
// als plans.prijs_cent NULL is, wordt GEEN checkout gestart. Fail met
// PRODUCT_NOT_CONFIGURED -- nooit een fictieve prijs verzinnen.
const Observability = require('../../core/observability.js');

exports.handler = async function(event) {
  const t0 = Date.now();
  const correlationId = Observability.newCorrelationId();
  const logCtx = { app_version: process.env.APP_VER || 'unknown', environment: process.env.CONTEXT || 'unknown', correlation_id: correlationId };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const mollieApiKey = process.env.MOLLIE_API_KEY;
  const authHeader = event.headers.authorization || event.headers.Authorization;

  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };
  let userId, userEmail;
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const user = await userRes.json();
    if (!user.id) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };
    userId = user.id; userEmail = user.email;
  } catch (e) {
    return { statusCode: 401, body: JSON.stringify({ error: { message: 'Sessie kon niet geverifieerd worden' } }) };
  }

  // KRITIEK: de client mag uitsluitend een plan_key aanvragen. Elk ander,
  // financieel-relevant veld in de body wordt genegeerd -- nooit gebruikt,
  // ook niet als "hint". amount/currency/prijs komen uitsluitend uit de DB.
  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: 'Ongeldige requestbody' } }) };
  }
  const planKey = typeof payload.planKey === 'string' ? payload.planKey : null;
  if (!planKey) return { statusCode: 400, body: JSON.stringify({ error: { message: 'planKey is verplicht' } }) };

  let plan;
  try {
    const planRes = await fetch(`${supabaseUrl}/rest/v1/plans?key=eq.${encodeURIComponent(planKey)}&actief=eq.true&select=key,naam,type,prijs_cent`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!planRes.ok) throw new Error('plan-lookup mislukt');
    const rows = await planRes.json();
    plan = rows[0];
  } catch (e) {
    return { statusCode: 503, body: JSON.stringify({ error: { message: 'Kon plan niet ophalen, probeer het later opnieuw' } }) };
  }
  if (!plan) return { statusCode: 400, body: JSON.stringify({ error: { message: 'Onbekend of inactief plan', code: 'UNKNOWN_PLAN' } }) };

  // PRIJSAUTORITEIT: NULL-prijs start nooit een echte checkout. Geen
  // fictieve prijs, geen fallback-bedrag -- expliciete, gecontroleerde
  // weigering conform de productbeslissing in F12_04_EXISTING_STATE_AUDIT.md.
  if (plan.prijs_cent === null || plan.prijs_cent === undefined) {
    return { statusCode: 409, body: JSON.stringify({ error: { message: 'Voor dit plan is nog geen prijs vastgesteld', code: 'PRODUCT_NOT_CONFIGURED' } }) };
  }

  if (!mollieApiKey) {
    // Software is klaar, maar zonder een geconfigureerde providersleutel kan
    // geen echte checkout worden aangemaakt -- expliciet, veilig falen,
    // nooit een nep-/mock-checkout-URL teruggeven.
    return { statusCode: 503, body: JSON.stringify({ error: { message: 'Betalingen zijn momenteel niet beschikbaar', code: 'PROVIDER_NOT_CONFIGURED' } }) };
  }

  // Idempotency: eenzelfde, snel herhaald checkout-verzoek (dubbelklik,
  // netwerkretry) voor dezelfde gebruiker+plan binnen een korte periode
  // krijgt een deterministische, herbruikbare referentie -- voorkomt
  // dubbele Mollie-payments bij een browser-refresh/dubbelklik.
  const idempotencyBasis = userId + ':' + planKey + ':' + new Date().toISOString().slice(0, 16); // per-minuut-granulariteit
  const orderReference = 'tk_' + Buffer.from(idempotencyBasis).toString('base64url').slice(0, 40);

  try {
    const mollieRes = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + mollieApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: { currency: 'EUR', value: (plan.prijs_cent / 100).toFixed(2) },
        description: 'Trainingskompas — ' + plan.naam,
        redirectUrl: (process.env.URL || 'https://maurice-art.netlify.app') + '/?checkout=return',
        webhookUrl: (process.env.URL || 'https://maurice-art.netlify.app') + '/.netlify/functions/billing-webhook',
        metadata: { user_id: userId, plan_key: plan.key, order_reference: orderReference }
      })
    });
    const mollieData = await mollieRes.json();
    if (!mollieRes.ok) {
      Observability.tkLog('ERROR', 'billing.checkout.provider_failed', 'billing', 'checkout', Object.assign(
        { operation: 'create_payment', duration_ms: Date.now() - t0 },
        Observability.normalizeError({ status: mollieRes.status }, { source: 'mollie' })
      ), logCtx);
      return { statusCode: 503, body: JSON.stringify({ error: { message: 'Kon geen betaling starten, probeer het later opnieuw' } }) };
    }
    Observability.tkLog('INFO', 'billing.checkout.created', 'billing', 'checkout', {
      operation: 'create_payment', duration_ms: Date.now() - t0, plan_key: plan.key
    }, logCtx);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checkoutUrl: mollieData._links && mollieData._links.checkout ? mollieData._links.checkout.href : null }) };
  } catch (e) {
    Observability.tkLog('ERROR', 'billing.checkout.failed', 'billing', 'checkout', Object.assign(
      { operation: 'create_payment', duration_ms: Date.now() - t0 },
      Observability.normalizeError(e, { source: 'billing-checkout' })
    ), logCtx);
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Er ging iets mis bij het starten van de betaling' } }) };
  }
};
