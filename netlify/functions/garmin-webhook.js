// netlify/functions/garmin-webhook.js
// Devices/Wearables V1 MUST — Garmin. Ontvangt Garmin's push/ping-
// notificaties (officieel bevestigd: Garmin levert data primair via
// webhooks, niet via polling -- "Garmin delivers data exclusively through
// webhooks rather than polling", corroborerend bevestigd door meerdere
// onafhankelijke integratiegidsen).
//
// EERLIJKE, EXPLICIETE BEPERKING (evidence-niveau -- geen fabricage): de
// exacte payload-vorm per Garmin-samenvattingstype (dailies/epochs/sleeps/
// activities/...) en het officiële mechanisme om een inkomend verzoek
// daadwerkelijk als afkomstig van Garmin te verifiëren (bv. een gedeeld
// secret/HMAC-header) zijn in deze sessie niet met dezelfde A/B-zekerheid
// bevestigd als de OAuth2-PKCE-flow zelf. Deze functie ONTVANGT en LOGT
// daarom uitsluitend veilige, PII-vrije structuurinformatie (top-level
// keys, aantal items, callback-URL indien aanwezig) -- ZONDER de payload
// als geverifieerd-authentiek te behandelen en ZONDER er al canonical
// data uit te schrijven. Dat laatste (echte ingestion) volgt zodra de
// payload-vorm en verificatiemethode met dezelfde zekerheid bevestigd
// zijn als de rest van deze integratie (PO ACTION, zie
// docs/WEARABLE_PROVIDER_SOURCE_PACK.md).
const Observability = require('../../core/observability.js');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }
  let body = null;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = null; }

  // Uitsluitend structurele, PII-vrije diagnostiek -- nooit gezondheids-
  // waarden/tokens/persoonsgegevens (sectie 23 van de opdracht).
  const topLevelKeys = body && typeof body === 'object' ? Object.keys(body) : [];
  const itemCounts = {};
  topLevelKeys.forEach((k) => { if (Array.isArray(body[k])) itemCounts[k] = body[k].length; });

  try {
    Observability.tkLog('INFO', 'garmin.webhook.received', 'wearable', 'garmin-webhook', {
      operation: 'webhook', topLevelKeys, itemCounts
    }, {});
  } catch (e) { /* observability mag de 200-respons nooit blokkeren */ }

  // Garmin verwacht een snelle 200-respons; verwerking (indien/zodra de
  // payload-vorm bevestigd is) hoort in een aparte, asynchrone stap.
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ received: true }) };
};
