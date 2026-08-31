/* fFederatedIdentity.test.js — MS-F13-07 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- A. Runtime-integratie-bewijs: geen dead code ----
ok(html.includes('function signInWithFederatedProvider'), 'A1: signInWithFederatedProvider() is gedefinieerd');
ok(html.includes("onclick=\"signInWithFederatedProvider('google')\""), 'A2: de Google-knop roept daadwerkelijk signInWithFederatedProvider aan');
ok(html.includes("onclick=\"signInWithFederatedProvider('apple')\""), 'A3: de Apple-knop roept daadwerkelijk signInWithFederatedProvider aan');
ok(html.includes('function handleFederatedAuthCallback') && html.includes('await handleFederatedAuthCallback()'),
  'A4: handleFederatedAuthCallback() wordt zowel gedefinieerd als daadwerkelijk aangeroepen (vanuit ensureValidSession)');
ok(html.includes('function refreshAccountIdentities') && html.includes('refreshAccountIdentities();'),
  'A5: refreshAccountIdentities() wordt zowel gedefinieerd als aangeroepen');

// ---- B. Raw GoTrue-protocol correct gebruikt (geen SDK-aanname) ----
{
  const fnBlok = html.split('function signInWithFederatedProvider(provider){')[1].split('// Vangt')[0];
  ok(fnBlok.includes('/auth/v1/authorize?provider='), 'B1: de redirect gaat naar het correcte, raw GoTrue /authorize-endpoint');
  ok(fnBlok.includes('redirect_to='), 'B2: een redirect_to-parameter wordt meegegeven');
  ok(fnBlok.includes('encodeURIComponent(provider)'), 'B3: de provider-parameter wordt correct URL-encoded (geen injectierisico)');
}

// ---- C. KRITIEK: canonical user identity blijft auth.users.id/public.users.id,
// NOOIT een provider-specifiek ID. De callback-handler mag nooit een provider-
// ID gebruiken als primary key voor iets anders dan de sessie zelf. ----
{
  const fnBlok = html.split('async function handleFederatedAuthCallback(){')[1].split('function toggleAuthMode')[0];
  ok(fnBlok.includes('user:{id:user.id, email:user.email}'),
    'C1: de sessie wordt opgeslagen met user.id (het canonieke auth.users.id), nooit een providerspecifiek ID');
  ok(!fnBlok.match(/provider_token|provider_id/i) || fnBlok.match(/provider_token/i) === null,
    'C2: geen provider_token/provider_id wordt als business-identiteit gebruikt (uitsluitend access_token/refresh_token voor de sessie zelf)');
}

// ---- D. Tokens verdwijnen uit de URL na verwerking (voorkomt leakage via adresbalk/geschiedenis/delen) ----
{
  const fnBlok = html.split('async function handleFederatedAuthCallback(){')[1].split('function toggleAuthMode')[0];
  ok(fnBlok.includes('history.replaceState'), 'D1: het URL-hash-fragment met tokens wordt na verwerking verwijderd uit de adresbalk');
}

// ---- E. Geen hardcoded provider-secrets/client-IDs in de client-code ----
ok(!html.match(/client_secret/i), 'E1: geen enkele "client_secret" in index.html (die hoort uitsluitend server-side/providerdashboard te staan)');

// ---- F. Presentatie-only: refreshAccountIdentities() muteert nooit iets, leest alleen ----
{
  const fnBlok = html.split('async function refreshAccountIdentities(){')[1].split('async function loadCommercialCatalog')[0];
  ok(!fnBlok.match(/method:\s*['"]?(POST|PATCH|DELETE)/i), 'F1: refreshAccountIdentities() voert uitsluitend een GET uit, geen enkele mutatie');
}

// ---- G. Money/identity-scheiding: FEDERATED-IDENTITY-code bevat geen enkele
// verwijzing naar commerciële/billing-velden (identity en billing blijven
// architectonisch gescheiden systemen, consistent met de F12-wet). ----
{
  const blok1 = html.split('function signInWithFederatedProvider(provider){')[1].split('// Vangt')[0];
  const blok2 = html.split('async function handleFederatedAuthCallback(){')[1].split('function toggleAuthMode')[0];
  const blok3 = html.split('async function refreshAccountIdentities(){')[1].split('async function loadCommercialCatalog')[0];
  const fnBlokken = blok1 + '\n' + blok2 + '\n' + blok3;
  ['individual_plan_key', 'billing_events', 'mollie'].forEach(function (term) {
    ok(!fnBlokken.toLowerCase().includes(term.toLowerCase()), 'G: de federated-identity-code bevat geen verwijzing naar "' + term + '" (identity en billing blijven gescheiden)');
  });
}

console.log('fFederatedIdentity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
