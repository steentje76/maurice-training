/* fClientTelemetry.test.js — F13 Post-Audit Remediation P1-13.
 * Bewaakt de client-side crash-telemetrie-uitbreiding en het server-side
 * telemetry-endpoint: never blokkerend, altijd best-effort, correcte
 * redactie, rate limiting, payload size limit, en de kritieke
 * "Prefer: return=minimal"-les (deze tabel heeft geen SELECT-policy).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v528.sql'), 'utf8');
const telemetrySrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/telemetry.js'), 'utf8');

// ---- A. Schema: RLS aan, insert-only voor de eigen gebruiker, geen SELECT-policy ----
ok(migratie.includes('alter table public.client_telemetry_events enable row level security'),
  'A1: RLS is expliciet ingeschakeld op client_telemetry_events');
ok(migratie.includes("with check (user_id is null or user_id = auth.uid())"),
  'A2: de insert-policy staat uitsluitend de eigen user_id of NULL toe (nooit een andere gebruiker)');
ok(!migratie.match(/create policy \w+ on public\.client_telemetry_events\s+for select/i),
  'A3: geen enkele SELECT-policy voor client-rollen (uitsluitend server-side/admin-leesbaar)');
ok(migratie.includes('revoke all on public.client_telemetry_events from anon'),
  'A4: anon heeft helemaal geen toegang (least privilege, defense-in-depth)');

// ---- B. Client-side: de bestaande error-handlers zijn uitgebreid, blijven fail-safe ----
ok(html.includes('sendTelemetryBestEffort') && html.match(/window\.addEventListener\('error'[\s\S]{0,400}sendTelemetryBestEffort/),
  'B1: window.onerror stuurt het genormaliseerde event ook naar het telemetry-endpoint');
ok(html.match(/window\.addEventListener\('unhandledrejection'[\s\S]{0,400}sendTelemetryBestEffort/),
  'B2: unhandledrejection stuurt het genormaliseerde event ook naar het telemetry-endpoint');
ok(html.includes("fetch('/.netlify/functions/telemetry',") && html.includes(".catch(function () {});"),
  'B3: de telemetry-fetch is expliciet non-blocking (geen await) en heeft een lege .catch() -- kan de app nooit beinvloeden');
ok(!html.match(/sendTelemetryBestEffort[\s\S]{0,50}stack/i),
  'B4: de rauwe stack trace wordt nooit meegestuurd, uitsluitend het al genormaliseerde message_safe/error_code');

// ---- C. Server: nooit blokkerend, altijd 204, correcte Prefer-header ----
ok(telemetrySrc.includes("Prefer: 'return=minimal'"),
  'C1: de insert gebruikt Prefer: return=minimal -- deze tabel heeft geen SELECT-policy, return=representation zou altijd falen (RETURNING-semantiek)');
ok((telemetrySrc.match(/statusCode: 204/g) || []).length >= 3,
  'C2: meerdere foutpaden (ontbrekende serviceKey, te grote payload, rate limit, ongeldige JSON) geven allemaal stil 204 terug, nooit een zichtbare fout');
ok(telemetrySrc.includes('MAX_PAYLOAD_BYTES') && telemetrySrc.includes('event.body.length > MAX_PAYLOAD_BYTES'),
  'C3: een payload size limit is aanwezig en wordt afgedwongen');
ok(telemetrySrc.includes('checkRateLimit') && telemetrySrc.includes('RATE_LIMIT_MAX_PER_USER'),
  'C4: rate limiting is aanwezig per gebruiker/anonieme sleutel');
ok(telemetrySrc.includes('redactServerSide'),
  'C5: server-side redactie is een aanvullende, tweede laag bovenop de client-side redactie');
ok(telemetrySrc.includes('route.slice(0, 100)'),
  'C6: route wordt afgekapt en is nooit de volledige URL (kan query-parameters met gevoelige data bevatten)');
ok(!telemetrySrc.match(/password|full_request_payload|service_role_key_value/i),
  'C7: geen enkele expliciete opslag van wachtwoorden/volledige request-payloads in het endpoint');

console.log('fClientTelemetry: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
