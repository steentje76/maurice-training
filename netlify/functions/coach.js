// Server-side AI-proxy — sleutel staat hier als environment variable,
// nooit in de browser. Vervangt de rechtstreekse client-call naar
// api.anthropic.com die de sleutel in localStorage nodig had.
//
// v3.3.10-fix: JWT-verificatie toegevoegd — als ENIGE Netlify Function in dit project
// miste deze functie de auth-check die alle andere functies (delete-account.js,
// gym-team.js, wearable-*.js) al hadden. Zonder die check kon letterlijk iedereen met
// de URL, zonder in te loggen, deze proxy gebruiken als gratis/onbeperkte Claude-API op
// kosten van de ANTHROPIC_API_KEY hierboven — geen rate limiting, geen kostenplafond.
// Zelfde verificatiepatroon als de rest van het project.
//
// MS-F1-02 (Observability Foundation): request start/complete/failed als gestructureerd
// event (ObservabilityCore), NOOIT de prompt/system/messages-inhoud of de AI-respons zelf
// -- uitsluitend veilige metadata (aantal berichten, model, duur, HTTP-status, foutklasse).
//
// MS-F12-02 (Entitlement Enforcement): server-side quota-afdwinging voor ai_coach.
// ENTITLEMENTS =/= SECURITY: deze enforcement bepaalt uitsluitend of de reeds
// geauthenticeerde gebruiker (via de bestaande JWT-check hierboven) de commerciële
// capability "ai_coach" mag gebruiken -- het raakt nooit RLS/tenant/privacy-rechten.
// De client-aangeleverde payload wordt NOOIT vertrouwd voor plan/quota-informatie --
// individual_plan_key/status/expiry en organization-memberships worden hier
// opnieuw, server-side opgehaald via de vertrouwde auth-boundary (user.id).
const Observability = require('../../core/observability.js');
const EntitlementCore = require('../../core/entitlementCore.js');
// F13 Post-Audit Remediation (P1-02, P1-03): beide modules zijn pure,
// Node-compatibele bibliotheken (geen DOM-afhankelijkheid) die al
// bestonden en al client-side werden toegepast in index.html.
// Server-side hergebruik hiervan is de kern van de fix: governance mag
// nooit uitsluitend client-side afgedwongen worden, want een
// gemanipuleerde client kan die stap simpelweg overslaan. Dezelfde
// validator, nu ook op de plek die de client niet kan omzeilen.
const AIOutputContract = require('../../core/aiOutputContract.js');
const CalcCore = require('../../core/calculation.js');

// MS-F12-02: vaste, server-side classificatie van request-type naar de
// canonieke feature-key. NIET manipuleerbaar via een willekeurige client-
// string: de client stuurt uitsluitend één van deze vier, vaste
// requestType-waarden (geen vrije feature-key), en de server slaat hier
// zelf de bijbehorende feature-key op. Een onbekend requestType faalt
// fail-closed (geweigerd), nooit een default-capability.
// - intake_extract: onboarding-dataextractie, geen betaalde capability
//   (analoog aan "account aanmaken" -- altijd toegankelijk, geen quota).
// - program_generation -> programma_generator
// - session_summary / chat -> ai_coach
const REQUEST_TYPE_TO_FEATURE = {
  intake_extract: null, // geen entitlement/quota-check: fundamentele onboarding-stap
  program_generation: 'programma_generator',
  session_summary: 'ai_coach',
  chat: 'ai_coach'
};

// F13 Post-Audit Remediation (P1-01, AI cost abuse): het model wordt
// ALTIJD server-side vastgelegd -- een client-aangeleverde payload.model
// wordt nooit gebruikt, zelfs niet als fallback-default. Dit voorkomt dat
// een gemanipuleerde client een ander, mogelijk duurder model afdwingt.
// max_tokens krijgt een vast PLAFOND per requestType (gebaseerd op de
// daadwerkelijke, bestaande call-sites in index.html) -- de client mag
// nog steeds een lagere waarde vragen voor de legitieme variatie binnen
// hetzelfde type (bijv. een korte vs. volledige chat-vraag), maar kan
// nooit boven het plafond uitkomen. Voorkomt dat een gemanipuleerde
// client een absurd hoge tokenlimiet (en dus kosten) forceert.
const AI_MODEL_PER_REQUEST_TYPE = {
  intake_extract: 'claude-sonnet-4-5',
  program_generation: 'claude-sonnet-4-5',
  session_summary: 'claude-sonnet-4-5',
  chat: 'claude-sonnet-4-5'
};
const AI_MAX_TOKENS_CEILING_PER_REQUEST_TYPE = {
  intake_extract: 300,
  program_generation: 1800,
  session_summary: 700,
  chat: 1200
};
function resolveServerAuthoritativeModelAndMaxTokens(requestType, clientRequestedMaxTokens) {
  const model = AI_MODEL_PER_REQUEST_TYPE[requestType]; // nooit client-input, ook niet als fallback
  const ceiling = AI_MAX_TOKENS_CEILING_PER_REQUEST_TYPE[requestType];
  const requested = typeof clientRequestedMaxTokens === 'number' && isFinite(clientRequestedMaxTokens) && clientRequestedMaxTokens > 0
    ? Math.floor(clientRequestedMaxTokens) : ceiling;
  const maxTokens = Math.min(requested, ceiling); // nooit boven het server-plafond, ongeacht client-input
  return { model: model, maxTokens: maxTokens };
}

async function fetchCommercialContext(supabaseUrl, anonKey, authHeader, userId) {
  const headers = { apikey: anonKey, Authorization: authHeader };
  const [userRes, membershipsRes, planFeaturesRes, planQuotaRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=individual_plan_key,individual_plan_status,individual_plan_expires_at`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/memberships?user_id=eq.${userId}&status=eq.active&select=organization_id,role`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/plan_features?select=plan_key,feature_key`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/plan_feature_quota?select=plan_key,feature_key,quota_per_maand`, { headers })
  ]);
  const userRows = userRes.ok ? await userRes.json() : [];
  const memberships = membershipsRes.ok ? await membershipsRes.json() : [];
  const planFeatures = planFeaturesRes.ok ? await planFeaturesRes.json() : [];
  const planQuota = planQuotaRes.ok ? await planQuotaRes.json() : [];
  const u = userRows[0] || {};

  // Organization-plan is nog niet gekoppeld aan een apart veld (F11 heeft
  // hiervoor geen kolom) -- voor gewone organization-memberships (zonder
  // een gekoppeld commercieel gym-plan) draagt dit vooralsnog geen
  // entitlement bij; dit is een bewust, minimaal ontwerp voor MS-F12-02
  // en wordt uitgebreid zodra Gym/Club/Team-billing (buiten deze sprint)
  // een organization_id->plan_key-koppeling krijgt. Membership-rijen
  // worden hier alleen opgehaald via de gebruiker se eigen, RLS-gefilterde
  // toegang (memberships?user_id=eq.<zelf>) -- nooit met service-role, dus
  // geen bypass van F11-tenant-RLS voor het berekenen van entitlements.
  const actor = {
    userId: userId,
    planKey: u.individual_plan_key || null,
    subscriptionStatus: u.individual_plan_status || null,
    expiresAt: u.individual_plan_expires_at || null,
    organizationMemberships: []
  };
  const catalog = { planFeatures: planFeatures, planQuota: planQuota };
  return EntitlementCore.resolveEntitlements(actor, catalog);
}

exports.handler = async function(event) {
  const t0 = Date.now();
  const correlationId = Observability.newCorrelationId();
  const logCtx = { app_version: process.env.APP_VER || 'unknown', environment: process.env.CONTEXT || 'unknown', correlation_id: correlationId };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY niet ingesteld op Netlify' } }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
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

  // MS-F12-02: requestType is verplicht en moet exact één van de vaste,
  // bekende waarden zijn -- fail-closed bij een onbekende of ontbrekende
  // waarde (nooit een impliciete default-capability toekennen).
  let payloadVoorType;
  try {
    payloadVoorType = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: 'Ongeldige requestbody' } }) };
  }
  const requestType = payloadVoorType.requestType;
  if (!Object.prototype.hasOwnProperty.call(REQUEST_TYPE_TO_FEATURE, requestType)) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: 'Onbekend of ontbrekend requestType', code: 'UNKNOWN_REQUEST_TYPE' } }) };
  }
  const featureKey = REQUEST_TYPE_TO_FEATURE[requestType];

  // MS-F12-02: server-side entitlement + quota-check. featureKey === null
  // (intake_extract) is een fundamentele onboarding-stap, geen betaalde
  // capability -- geen entitlement/quota-check nodig, analoog aan
  // "account aanmaken". Fail-safe: als de commerciële context niet
  // opgehaald kan worden (backend unavailable), wordt een betaalde
  // capability GEWEIGERD (nooit stilzwijgend toegestaan) -- maar dit
  // blokkeert uitsluitend deze specifieke, betaalde capability, nooit
  // account/privacy/security-functionaliteit elders in de app.
  let entitlements = null;
  if (featureKey !== null) {
    try {
      entitlements = await fetchCommercialContext(supabaseUrl, anonKey, authHeader, userId);
    } catch (e) {
      return { statusCode: 503, body: JSON.stringify({ error: { message: 'Commerciële context tijdelijk niet beschikbaar, probeer het later opnieuw' } }) };
    }
    if (!EntitlementCore.hasCapability(entitlements, featureKey)) {
      return { statusCode: 402, body: JSON.stringify({ error: { message: 'Deze functie is niet inbegrepen in je huidige plan', code: 'ENTITLEMENT_REQUIRED' } }) };
    }
  }

  const periode = new Date().toISOString().slice(0, 8) + '01'; // YYYY-MM-01, timezone-safe maandgrens (UTC-kalendermaand)
  const quota = featureKey !== null ? EntitlementCore.getQuota(entitlements, featureKey) : null;
  let quotaGereserveerd = false;
  if (featureKey !== null && quota !== null) {
    try {
      const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/check_and_increment_usage`, {
        method: 'POST',
        headers: { apikey: anonKey, Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_feature_key: featureKey, p_periode: periode, p_quota: quota })
      });
      const rpcData = rpcRes.ok ? await rpcRes.json() : null;
      const toegestaan = Array.isArray(rpcData) && rpcData[0] ? rpcData[0].toegestaan : false;
      if (!rpcRes.ok || !toegestaan) {
        return { statusCode: 429, body: JSON.stringify({ error: { message: 'Je hebt je maandelijkse limiet voor deze functie bereikt', code: 'QUOTA_EXCEEDED' } }) };
      }
      quotaGereserveerd = true;
    } catch (e) {
      return { statusCode: 503, body: JSON.stringify({ error: { message: 'Kon gebruikslimiet niet verifiëren, probeer het later opnieuw' } }) };
    }
  }

  try {
    const payload = payloadVoorType;
    // F13 Post-Audit Remediation (P1-01): model en max_tokens komen
    // uitsluitend uit de server-side, vaste configuratie per requestType
    // -- payload.model/payload.max_tokens worden NOOIT rechtstreeks
    // doorgegeven aan de Anthropic API.
    const { model: serverModel, maxTokens: serverMaxTokens } = resolveServerAuthoritativeModelAndMaxTokens(requestType, payload.max_tokens);
    Observability.tkLog('INFO', 'ai.coach.request_started', 'ai', 'coach', {
      operation: 'request', model: serverModel, message_count: Array.isArray(payload.messages) ? payload.messages.length : 0, request_type: requestType
    }, logCtx);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: serverModel,
        max_tokens: serverMaxTokens,
        system: payload.system,
        messages: payload.messages
      })
    });
    const data = await res.json();
    const durationMs = Date.now() - t0;
    if (res.ok) {
      // F13 Post-Audit Remediation (P1-02): server-side AIOutputContract-
      // validatie -- DEZELFDE validator die index.html al client-side
      // toepaste, maar nu op de plek die een gemanipuleerde client niet
      // kan omzeilen. Governance mag nooit uitsluitend client-side
      // afgedwongen worden.
      if (Array.isArray(data.content)) {
        data.content = data.content.map(function (blok) {
          if (blok.type !== 'text' || typeof blok.text !== 'string') return blok;
          const check = AIOutputContract.validateAiOutputText(blok.text);
          if (!check.valid) {
            Observability.tkLog('ERROR', 'ai.coach.output_contract_violation', 'ai', 'coach', {
              operation: 'output_validation', request_type: requestType,
              metadata: { violations: check.violations.map(function (v) { return v.categorie; }) }
            }, logCtx);
            return Object.assign({}, blok, { text: AIOutputContract.safeCoachFallback() });
          }
          // F13 Post-Audit Remediation (P1-03): een absolute, server-side
          // veiligheidsgrens op elke [[APPLY:exId:kg]]-marker in de tekst --
          // aanvullend op de bestaande client-side, 1RM-relatieve
          // plausibiliteitscheck (die de server niet kan reproduceren
          // zonder de gebruikers 1RM-context, wat buiten deze fix valt).
          // Een marker boven de absolute grens wordt uit de tekst
          // verwijderd -- de client kan dan geen "Toepassen"-knop tonen
          // voor een fysiek onplausibel voorstel, ongeacht 1RM-context.
          const APPLY_RE = /\[\[APPLY:([a-zA-Z0-9_-]+):([\d.]+)\]\]/g;
          const gefilterdeTekst = blok.text.replace(APPLY_RE, function (m, exId, kg) {
            const validatie = CalcCore.validateProposedWeight(kg, null); // null = absolute cap (500kg), geen 1RM-context server-side beschikbaar
            if (!validatie.ok) {
              Observability.tkLog('ERROR', 'ai.coach.apply_rejected', 'ai', 'coach', {
                operation: 'output_validation', request_type: requestType, metadata: { reason: validatie.reason }
              }, logCtx);
              return '';
            }
            return m;
          });
          return gefilterdeTekst === blok.text ? blok : Object.assign({}, blok, { text: gefilterdeTekst });
        });
      }
      Observability.tkLog('INFO', 'ai.coach.request_completed', 'ai', 'coach', {
        operation: 'request', status: 'success', duration_ms: durationMs, provider: 'anthropic'
      }, logCtx);
    } else {
      // MS-F12-02: de AI-aanroep zelf mislukte NA een succesvolle quota-
      // reservering -- compenseer, zodat de gebruiker geen gratis actie
      // verliest door een fout die niets met de gebruiker te maken heeft.
      if (quotaGereserveerd) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/rpc/decrement_usage`, {
            method: 'POST',
            headers: { apikey: anonKey, Authorization: authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_feature_key: featureKey, p_periode: periode })
          });
        } catch (compEx) { /* compensatie is best-effort; de primaire fout wordt hieronder al gerapporteerd */ }
      }
      Observability.tkLog('ERROR', 'ai.coach.request_failed', 'ai', 'coach', Object.assign(
        { operation: 'request', duration_ms: durationMs, provider: 'anthropic' },
        Observability.normalizeError({ status: res.status }, { source: 'anthropic' })
      ), logCtx);
    }
    return { statusCode: res.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (e) {
    if (quotaGereserveerd) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/decrement_usage`, {
          method: 'POST',
          headers: { apikey: anonKey, Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_feature_key: featureKey, p_periode: periode })
        });
      } catch (compEx) { /* best-effort */ }
    }
    Observability.tkLog('ERROR', 'ai.coach.request_failed', 'ai', 'coach', Object.assign(
      { operation: 'request', duration_ms: Date.now() - t0 },
      Observability.normalizeError(e, { source: 'coach-proxy' })
    ), logCtx);
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Proxy-fout: ' + e.message } }) };
  }
};
