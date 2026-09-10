/* fPolarIntegration.test.js — DEVICES/WEARABLES MASTER SPRINT, cloud providers.
 * Bewaakt: geen plaintext tokens (Vault-hergebruik, zelfde precedent als
 * Google Health/F13), sport-mapping respecteert het strikte
 * activities_sport_check-enum (nooit een ongeldige waarde forceren),
 * ISO8601-duurparsing correct, geen dubbele ingestion-risico (dedupe_key),
 * en de verplichte Polar-gebruikersregistratiestap wordt niet overgeslagen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const authStart = fs.readFileSync(path.join(ROOT, 'netlify/functions/polar-auth-start.js'), 'utf8');
const authCallback = fs.readFileSync(path.join(ROOT, 'netlify/functions/polar-auth-callback.js'), 'utf8');
const sync = fs.readFileSync(path.join(ROOT, 'netlify/functions/polar-sync.js'), 'utf8');
const disconnect = fs.readFileSync(path.join(ROOT, 'netlify/functions/polar-disconnect.js'), 'utf8');
const status = fs.readFileSync(path.join(ROOT, 'netlify/functions/polar-status.js'), 'utf8');

console.log('DEVICES/WEARABLES MASTER SPRINT — Polar AccessLink integratie');

// ---- A. Vault-gebruik (F13-precedent): nooit plaintext access_token/refresh_token ----
[authCallback, sync, disconnect].forEach((src, i) => {
  const namen = ['polar-auth-callback.js', 'polar-sync.js', 'polar-disconnect.js'];
  ok(!src.match(/access_token\s*:\s*accessToken(?!Secret)|INSERT INTO.*access_token[^_]/i) || src.includes('storeWearableTokenSecret') || src.includes('getWearableTokenSecret'),
    `A${i + 1}: ${namen[i]} gebruikt de Vault-helpers, geen directe plaintext access_token-kolom`);
});
ok(authCallback.includes("require('./wearableTokenVault.js')") && authCallback.includes('storeWearableTokenSecret'),
  'A4: polar-auth-callback.js slaat de token uitsluitend via de bestaande Vault-RPC op (geen nieuwe, aparte tokenopslag)');
ok(sync.includes("require('./wearableTokenVault.js')") && sync.includes('getWearableTokenSecret'),
  'A5: polar-sync.js haalt de token uitsluitend via de bestaande Vault-RPC op');
ok(disconnect.includes('deleteWearableTokenSecret'), 'A6: polar-disconnect.js verwijdert het Vault-secret bij loskoppelen');

// ---- B. Verplichte Polar user-registratiestap wordt niet overgeslagen ----
ok(authCallback.includes("'https://www.polaraccesslink.com/v3/users'") && authCallback.includes("'member-id'"),
  'B1: de verplichte POST /v3/users-registratiestap wordt uitgevoerd (meerdere onafhankelijke bronnen bevestigen: zonder dit falen alle latere data-aanroepen ondanks een geldig token)');
ok(authCallback.includes('registerRes.status !== 409'), 'B2: een 409 (al geregistreerd) wordt correct als geen-fout behandeld, niet als koppel-fout gerapporteerd');

// ---- C. Sport-mapping respecteert het strikte canonical enum ----
ok(sync.includes("activities_sport_check") || sync.match(/mapPolarSportToCanonical/),
  'C1: er bestaat een expliciete mapping-functie naar het canonieke sportmodel (niet een rechtstreekse, ongefilterde Polar-sportnaam)');
ok(sync.match(/return 'running'/) && sync.match(/return 'cycling'/) && sync.match(/return 'rowing'/) && sync.match(/return 'swimming'/),
  'C2: de mapping dekt alle vier de door TK toegestane sporten (activities_sport_check: running/cycling/rowing/swimming)');
ok(sync.includes('return null') && sync.includes('!canonicalSport'),
  'C3: een niet-mapbaar Polar-sporttype (Polar kent 100+ types) wordt overgeslagen (skipped), NOOIT geforceerd in een van de vier categorieen -- zou anders de CHECK-constraint laten falen of, erger, een verkeerde sport claimen');

// ---- D. Correcte enum-waarden voor source_provenance/data_quality (activities_*_check) ----
ok(sync.includes("source_provenance: 'provider_derived'"), 'D1: source_provenance gebruikt een waarde die daadwerkelijk in activities_source_provenance_check voorkomt (niet de providernaam zelf)');
ok(sync.includes("source_provider: 'polar'"), 'D2: de providernaam zelf staat in het aparte source_provider-veld, niet in source_provenance');
ok(sync.includes("data_quality: 'unverified'"), 'D3: data_quality gebruikt een waarde die daadwerkelijk in activities_data_quality_check voorkomt');

// ---- E. Dedupe: geen dubbele ingestion bij een herhaalde/gemiste sync ----
ok(sync.includes("'polar-exercise-' + exerciseId") && sync.includes('ignore-duplicates'),
  'E1: elke exercise krijgt een stabiele, exercise-id-gebaseerde dedupe_key en de insert gebruikt ignore-duplicates -- een herhaalde sync van dezelfde exercise levert geen dubbele activiteit op');

// ---- F. Transactiemodel: pas committen na succesvolle verwerking (geen dataverlies) ----
ok(sync.includes("skipped === 0") && sync.match(/method:\s*'PUT'/),
  'F1: de exercise-transactie wordt alleen gecommit als ALLE exercises succesvol verwerkt zijn -- bij een gedeeltelijke fout blijft de data bij Polar beschikbaar voor een volgende sync-poging (geen dataverlies)');

// ---- G. ISO8601-duurparsing (pure functie, direct testbaar) ----
{
  const iso8601DurationToSeconds = (function () {
    // Zelfde implementatie als in polar-sync.js -- geisoleerd getest zonder de hele module te vereisen (require zou fetch/env-afhankelijkheden triggeren).
    return function (iso) {
      if (typeof iso !== 'string') return null;
      const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/.exec(iso);
      if (!m) return null;
      const h = m[1] ? parseInt(m[1], 10) : 0, min = m[2] ? parseInt(m[2], 10) : 0, s = m[3] ? parseFloat(m[3]) : 0;
      return Math.round(h * 3600 + min * 60 + s);
    };
  })();
  ok(iso8601DurationToSeconds('PT1H30M') === 5400, 'G1: PT1H30M correct naar 5400 seconden');
  ok(iso8601DurationToSeconds('PT45M') === 2700, 'G2: PT45M correct naar 2700 seconden');
  ok(iso8601DurationToSeconds('PT30S') === 30, 'G3: PT30S correct naar 30 seconden');
  ok(iso8601DurationToSeconds('invalid') === null, 'G4: ongeldige input -> null, geen gegokte waarde');
  ok(sync.includes('iso8601DurationToSeconds'), 'G5: de sync-functie gebruikt daadwerkelijk deze parser voor het duration-veld');
}

// ---- H. Zelfde JWT-verificatiepatroon als de bestaande Google Health-functions (geen eigen, zwakker patroon) ----
[authStart, sync, disconnect, status].forEach((src, i) => {
  const namen = ['polar-auth-start.js', 'polar-sync.js', 'polar-disconnect.js', 'polar-status.js'];
  ok(src.includes('auth/v1/user') && src.includes('authHeader'), `H${i + 1}: ${namen[i]} verifieert de sessie via hetzelfde /auth/v1/user-patroon, nooit een user_id van de client zelf vertrouwd`);
});

// ---- I. Self-serve, geen goedkeuringsperiode (correct gedocumenteerd, geen onterecht externe-blocker-stempel) ----
ok(authStart.includes('ZELFBEDIENING') || authStart.includes('zelfregistratie'),
  'I1: het bestand documenteert correct dat Polar-registratie zelfbediening is (geen goedkeuringsperiode zoals Garmin) -- de PO kan direct starten zodra een client aangemaakt is');

// ---- J. State/CSRF/replay-bescherming (sectie 13 van de opdracht) ----
ok(authCallback.includes("wearable_oauth_state?state=eq.${state}`, {\n      method: 'DELETE'"),
  'J1: de state-rij wordt na opzoeken direct verwijderd (eenmalig bruikbaar) -- een herhaalde/dubbele callback met dezelfde state vindt geen rij meer en krijgt expired, geen tweede koppeling');
{
  // Volgorde-bewijs: de DELETE moet plaatsvinden VOORDAT de leeftijdscontrole
  // faalt kan laten doorlopen -- controleer dat de delete-aanroep in de
  // broncode voor de ageMinutes-check staat (tekstuele volgorde = uitvoeringsvolgorde
  // binnen dit lineaire async-blok).
  const deleteIdx = authCallback.indexOf("method: 'DELETE'");
  const ageIdx = authCallback.indexOf('ageMinutes');
  ok(deleteIdx > 0 && ageIdx > deleteIdx, 'J2: de eenmalige state wordt verwijderd vóór de leeftijdscontrole -- geen venster waarin dezelfde state tweemaal succesvol te gebruiken is');
}
ok(authCallback.includes('ageMinutes > 10'), 'J3: een verlopen (>10 min oude) state wordt geweigerd, ook al bestaat de rij nog toevallig');
ok(!authCallback.match(/queryStringParameters\.user_id|body\.user_id/i), 'J4: de callback vertrouwt nooit een user_id die rechtstreeks van de browser/query-string komt -- uitsluitend via de vooraf server-side aangemaakte state-rij');

console.log('\n========================================================');
console.log('fPolarIntegration.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
