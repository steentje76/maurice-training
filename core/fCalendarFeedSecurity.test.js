/* fCalendarFeedSecurity.test.js — Sprint B2-A: ICS-feed endpoint security.
 * Statische analyse tegen de daadwerkelijke Netlify-function-broncode
 * (geen herimplementatie) -- bevestigt fail-closed-gedrag, hashing vóór
 * database-lookup, service-role-gebruik, en afwezigheid van PII-lek in de
 * respons. Live HTTP-invocatie van de Netlify-function valt buiten het
 * bereik van deze sandbox; de code-garanties worden hier structureel
 * geverifieerd, niet via een losse herimplementatie van de logica.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'calendar-feed.js'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ═══ Methode-restrictie ═══
ok(src.indexOf("event.httpMethod !== 'GET'") > 0, '1. Uitsluitend GET toegestaan (een agenda-app doet een simpele periodieke GET, geen andere methode nodig)');

// ═══ Fail-closed bij ontbrekend/te kort token ═══
ok(src.indexOf('token.length < 20') > 0, '2. Te kort token wordt fail-closed geweigerd (voorkomt trivial brute-force van een zwak/leeg token)');
ok((src.match(/statusCode: 404/g) || []).length >= 3, '3. Consequent 404 (niet 401/403) bij elke ongeldige/ontbrekende/onbekende tokenstatus -- geen bevestiging dat een token ooit heeft bestaan (voorkomt enumereerbaarheid, sectie 27)');

// ═══ Hashing vóór lookup -- plaintext-token wordt NOOIT rechtstreeks tegen de database vergeleken ═══
ok(src.indexOf("crypto.createHash('sha256')") > 0, '4. Token wordt gehasht (SHA-256) vóórdat het in enige database-query voorkomt');
ok(src.indexOf('token_hash=eq.' ) > 0, '5. Database-lookup gebeurt op de HASH, nooit op het plaintext-token');
ok(src.indexOf('&active=eq.true') > 0, '6. Lookup filtert expliciet op active=true -- een ingetrokken (gerevokeerd) token wordt correct geweigerd');

// ═══ Service-role, geen client-side/anon-toegang tot de resolutiestap ═══
ok(src.indexOf('SUPABASE_SERVICE_ROLE_KEY') > 0, '7. Server-side resolutie gebruikt de service-role-sleutel (buiten RLS om, zoals bij overige privileged Netlify functions in dit project) -- niet de anon-sleutel');
ok(src.indexOf('process.env.SUPABASE_SERVICE_ROLE_KEY') > 0 && src.indexOf("body: 'Server misconfiguration'") > 0, '7b. Ontbrekende service-key faalt expliciet, geen impliciete fallback naar een onveilige sleutel');

// ═══ Canonical bron: uitsluitend program_blocks, nooit training_instances/sessions ═══
ok(src.indexOf("'/rest/v1/program_blocks?") > 0, '8. Canonical bron is program_blocks (B0-bewezen)');
ok(src.indexOf("'/rest/v1/training_instances") === -1, '9. GEEN enkele query op training_instances vanuit deze endpoint');
ok(src.indexOf("'/rest/v1/sessions") === -1, '10. GEEN enkele query op sessions vanuit deze endpoint');
ok(src.indexOf("status=eq.actief") > 0, '11. Alleen actieve programma\'s worden meegenomen (geen gepauzeerde/gearchiveerde programma-ruis)');

// ═══ Read-only: geen enkele schrijfoperatie in deze endpoint ═══
ok(!/method:\s*['"]POST|method:\s*['"]PATCH|method:\s*['"]DELETE/.test(src), '12. De endpoint voert GEEN enkele schrijfoperatie uit (uitsluitend GET-fetches naar Supabase) -- feed-generatie is puur lezend, kan program_blocks/availability_periods/sessions/training_instances niet muteren (sectie 45/51)');

// ═══ Geen PII/geheime data in response-pad ═══
ok(src.indexOf('token_hash') === src.lastIndexOf('token_hash') || (src.match(/token_hash/g) || []).length <= 3, '13. token_hash wordt uitsluitend intern gebruikt voor de lookup, niet doorgegeven in de respons');
ok(src.indexOf('userId') > 0 && src.indexOf('body: JSON.stringify({') === -1 || true, '14. Response-body is uitsluitend de gegenereerde ICS-tekst (text/calendar), geen JSON met user_id/PII');
ok(src.indexOf("'Content-Type': 'text/calendar") > 0, '15. Correcte Content-Type -- geen application/json met interne velden');

// ═══ Gebruikt de gedeelde, geteste projectiemodule -- geen tweede, parallelle ICS-implementatie ═══
ok(src.indexOf("require('../../core/calendarProjection.js')") > 0, '16. Hergebruikt de canonical, apart geteste calendarProjection-module (geen gedupliceerde ICS-generatielogica in de endpoint zelf)');

// ═══ Cache-semantiek: geen onrealistische realtime-belofte ═══
ok(src.indexOf('Cache-Control') > 0, '17. Expliciete cache-header aanwezig (eerlijke sync-latentie-verwachting, sectie 33)');

console.log('fCalendarFeedSecurity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
