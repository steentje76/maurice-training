/* _cors.js — v4.49.0
 *
 * WAAROM DIT BESTAAT.
 * Op het web draait de app op dezelfde oorsprong als de functies, dus was CORS nooit een
 * onderwerp. In de Capacitor-app is dat anders: daar serveert Capacitor de app vanaf
 * `https://localhost` (capacitor.config.json, androidScheme "https"). Elke aanroep naar
 * `https://<site>/.netlify/functions/...` is daarmee cross-origin. Zonder de headers
 * hieronder weigert de browser het antwoord en werken de AI-coach, de wearable-sync, het
 * verwijderen van een account en het teambeheer niet in de Android-app.
 *
 * WAT DIT NIET IS.
 * Geen versoepeling van de beveiliging. Elke functie houdt haar eigen JWT-verificatie;
 * CORS bepaalt alleen of de BROWSER het antwoord aan de pagina mag geven. De toegestane
 * oorsprongen zijn bovendien een expliciete lijst, geen `*`: alleen de eigen app-schema's
 * van Capacitor. Een willekeurige website krijgt geen enkele header terug en kan dus geen
 * antwoord lezen, ook niet met een gestolen token.
 *
 * PREFLIGHT. Een POST met `Content-Type: application/json` en een `Authorization`-header
 * is geen "simple request": de browser stuurt eerst OPTIONS. De functies antwoordden
 * daarop met 405, waarmee het echte verzoek nooit werd verstuurd. `withCors` beantwoordt
 * OPTIONS zelf met 204 en laat al het andere ongewijzigd door.
 */
const TOEGESTANE_OORSPRONGEN = [
  'https://localhost',      // Capacitor Android (androidScheme: "https")
  'capacitor://localhost',  // Capacitor iOS
  'http://localhost'        // lokale ontwikkeling
];

function oorsprongVan(event) {
  const h = (event && event.headers) || {};
  return h.origin || h.Origin || null;
}

function corsHeaders(event) {
  const o = oorsprongVan(event);
  if (!o || TOEGESTANE_OORSPRONGEN.indexOf(o) < 0) return {};
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

/* Wikkelt een bestaande handler in. De handler zelf blijft ongewijzigd — inclusief zijn
 * auth-checks, statuscodes en foutafhandeling. */
function withCors(handler) {
  return async function (event, context) {
    if (event && event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: corsHeaders(event), body: '' };
    }
    const res = await handler(event, context);
    if (!res || typeof res !== 'object') return res;
    return Object.assign({}, res, { headers: Object.assign({}, res.headers || {}, corsHeaders(event)) });
  };
}

module.exports = { withCors, corsHeaders, TOEGESTANE_OORSPRONGEN };
