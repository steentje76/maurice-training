// netlify/functions/_cors.js — v4.70.25 (DEC-API-001)
//
// AANLEIDING. In de Android-app (Capacitor) draait de webview op https://localhost. De app
// roept de serverfuncties daarom aan op de publieke oorsprong (zie tkApiUrl in index.html).
// Dat is een cross-origin verzoek met een Authorization-header: zonder antwoord op de
// preflight (OPTIONS) en zonder Access-Control-Allow-Origin blokkeert de webview het.
//
// WAT DIT DOET. withCors(handler) beantwoordt de preflight en voegt de CORS-headers toe,
// UITSLUITEND voor de vaste oorsprongen van de eigen native app. Voor elk ander verzoek
// (de webapp op dezelfde oorsprong, een vreemde site, een aanroep zonder Origin) gedraagt
// de functie zich exact als voorheen: er komt geen enkele header bij.
//
// WAT DIT NIET IS. CORS is geen authenticatie. Elke functie blijft zelf de Supabase-sessie
// verifiëren; er worden geen cookies of credentials toegestaan (geen Allow-Credentials) en
// er is geen wildcard.
'use strict';

const NATIVE_APP_ORIGINS = new Set([
  'https://localhost',     // Capacitor Android (androidScheme: https)
  'capacitor://localhost'  // Capacitor iOS
]);

function originVan(event) {
  const h = (event && event.headers) || {};
  return String(h.origin || h.Origin || '');
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin'
  };
}

function withCors(handler) {
  return async function corsHandler(event, context) {
    const origin = originVan(event);
    const toegestaan = NATIVE_APP_ORIGINS.has(origin);
    if (toegestaan && event && event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: corsHeaders(origin), body: '' };
    }
    const res = await handler(event, context);
    if (!toegestaan || !res || typeof res !== 'object') return res;
    return Object.assign({}, res, { headers: Object.assign({}, res.headers || {}, corsHeaders(origin)) });
  };
}

module.exports = { withCors, NATIVE_APP_ORIGINS, corsHeaders };
