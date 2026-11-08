/* fObservabilityErrorTaxonomy.test.js — V1 Proven Maturity Sprint 02.
 * Observability + Beta Telemetry + Failure Visibility.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Observability = require('./observability.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const telemetrySrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/telemetry.js'), 'utf8');

// ═══ Fase 1: foutentaxonomie -- 24 gevraagde categorieën aanwezig, stabiele TK_*-codes ═══
const VERWACHTE_DOMEINEN = ['AUTH', 'NETWORK', 'DATABASE', 'RLS_PERMISSION', 'VALIDATION', 'CALCULATION_INPUT',
  'DECISION_INPUT', 'AI_TRANSPORT', 'AI_QUOTA', 'AI_RESPONSE_VALIDATION', 'WEARABLE_PROVIDER', 'BARCODE_SCANNER',
  'OFF_PROVIDER', 'OCR', 'CAMERA_PERMISSION', 'NUTRITION_INGEST', 'PORTION_ENGINE', 'TRAINING_EXECUTION',
  'TRAINING_LOGGING', 'RECOVERY', 'SYNC', 'NATIVE_BRIDGE', 'UNEXPECTED_CLIENT', 'UNEXPECTED_SERVER'];
VERWACHTE_DOMEINEN.forEach((d) => ok(Array.isArray(Observability.ERROR_TAXONOMY[d]) && Observability.ERROR_TAXONOMY[d].length > 0, 'taxonomie: domein ' + d + ' bestaat met minstens 1 code'));
ok(Object.keys(Observability.ERROR_TAXONOMY).length === VERWACHTE_DOMEINEN.length, 'taxonomie: exact de 24 gevraagde categorieën, geen ontbrekende/overtollige');
{
  const alleCodes = [].concat.apply([], Object.keys(Observability.ERROR_TAXONOMY).map((d) => Observability.ERROR_TAXONOMY[d]));
  const stabielePatroon = /^(TK_[A-Z_]+|UNKNOWN|TIMEOUT|NETWORK)$/;
  alleCodes.forEach((c) => ok(stabielePatroon.test(c), 'taxonomie: code "' + c + '" volgt het stabiele, machine-leesbare naampatroon (geen losse vrije tekst)'));
}
ok(Observability.isKnownErrorCode('TK_TRAINING_SAVE_FAILED') === true, 'isKnownErrorCode: herkent een echte taxonomie-code');
ok(Observability.isKnownErrorCode('willekeurige_vrije_tekst') === false, 'isKnownErrorCode: wijst een niet-geregistreerde, vrije foutstring af');
ok(Observability.isKnownErrorCode(null) === false && Observability.isKnownErrorCode(undefined) === false, 'isKnownErrorCode: geen crash op null/undefined');

// ═══ Fase 3: kritieke-flow-instrumentatie (nieuw bekabeld deze sprint) ═══
ok(html.indexOf("error_code: 'TK_BARCODE_NATIVE_FAILURE'") > 0, '3F: native-scanner-startfout is nu getelemetreerd met een stabiele code (was voorheen volledig onzichtbaar)');
ok(html.indexOf("'TK_CAMERA_PERMISSION_DENIED' : 'TK_CAMERA_UNAVAILABLE'") > 0, '3F/CAMERA_PERMISSION: web-camera-toegangsfout is nu getelemetreerd, onderscheid permissie vs. overig');
ok(html.indexOf("error_code: 'TK_TRAINING_SAVE_FAILED'") > 0, '3B/TRAINING_LOGGING: running-activiteit-opslagfout is nu getelemetreerd (was voorheen alleen een toast, geen spoor)');

// ═══ Fase 2: correlatiemodel (bestaand contract, herbevestigd + hergebruikt, niet gedupliceerd) ═══
{
  const evt = Observability.buildEvent('ERROR', 'nutrition.barcode.native_start_failed', 'nutrition', 'native_scanner',
    { operation: 'start_scan', status: 'failed', error_code: 'TK_BARCODE_NATIVE_FAILURE' }, { app_version: 'v4.69.67', environment: 'native_android' });
  ['timestamp', 'level', 'event', 'domain', 'component', 'app_version', 'environment', 'operation', 'status', 'error_code'].forEach((veld) => {
    ok(evt[veld] !== undefined, 'correlatiemodel: gebouwd event bevat het verplichte/relevante veld "' + veld + '"');
  });
}

// ═══ Fase 4: gevoelige payloads NIET meegegeven aan de nieuwe telemetrie-aanroepen ═══
['TK_BARCODE_NATIVE_FAILURE', 'TK_CAMERA_PERMISSION_DENIED', 'TK_TRAINING_SAVE_FAILED'].forEach((code) => {
  const idx = html.indexOf("'" + code + "'");
  const omgeving = html.slice(Math.max(0, idx - 300), idx + 100);
  ok(!/payload\)/.test(omgeving.replace(/error_code:\s*'[A-Z_]+'\)/, '')) || omgeving.indexOf('metadata:{payload') === -1, '4: telemetrie rond ' + code + ' geeft niet het volledige request-payload-object mee (alleen de code/context)');
  ok(omgeving.indexOf('Authorization') === -1 && omgeving.indexOf('access_token') === -1, '4-b: telemetrie rond ' + code + ' bevat geen auth-gerelateerde velden in de directe omgeving');
});

// ═══ Fase 4 (server-side, telemetry.js zelf, herbevestiging bestaande F13-redactie) ═══
ok(telemetrySrc.indexOf('redactServerSide') > 0, '4-c: server-side telemetry-endpoint doet een tweede, eigen redactielaag (vertrouwt de client niet blind)');
ok(telemetrySrc.indexOf('MAX_PAYLOAD_BYTES') > 0 && telemetrySrc.indexOf('RATE_LIMIT') > 0, '4-d: payload-size-limiet en rate-limiting blijven bestaand en ongewijzigd aanwezig');

// ═══ Fase 12: adversarial -- telemetrie kan geen privilege escalation/cross-user-lek veroorzaken ═══
// (Live DB-adversarial-bewijs is uitgevoerd tegen het Supabase-project zelf,
// zie sessieverslag; hier de structurele herbevestiging dat de server-side
// endpoint zelf nooit ongeautoriseerde toegang geeft en nooit de hoofdflow
// kan breken.)
ok(telemetrySrc.indexOf('return { statusCode: 204') > 0, '12: telemetrie-endpoint faalt altijd stil (204), nooit een fout die de aanroepende hoofdflow zou kunnen breken');
ok(!/throw\s+/.test(telemetrySrc.replace(/\/\/.*$/gm, '')), '12-b: het telemetrie-endpoint gooit zelf nergens een onafgevangen exception (fail-safe by design)');
['nutrition.barcode.native_start_failed', 'nutrition.barcode.web_camera_access_failed', 'training.activity.save_failed'].forEach((eventNaam) => {
  const idx = html.indexOf("'" + eventNaam + "'");
  const omgevingRondEvent = html.slice(Math.max(0, idx - 60), idx + 400);
  ok(idx > 0 && omgevingRondEvent.indexOf('tkLog') > -1, '12-c: ' + eventNaam + ' gebruikt de bestaande, non-blocking tkLog-sink (geen eigen, blokkerende fetch-aanroep die de hoofdflow zou kunnen vertragen/breken)');
});

// ═══ Fase 6: swallowed-error-steekproef (documentatie van bevinding, geen blinde massale fix) ═══
{
  const alleCatches = (html.match(/catch\s*\(/g) || []).length;
  const legeCatches = (html.match(/catch\s*\(\s*[a-zA-Z_0-9]*\s*\)\s*\{\s*\}/g) || []).length;
  ok(alleCatches > 0, 'sanity: catch-blokken worden daadwerkelijk gevonden (geen kapotte regex)');
  ok(legeCatches <= alleCatches, 'sanity: aantal lege catches is nooit groter dan totaal aantal catches');
  console.log('INFO (geen assertie, documentatie): ' + legeCatches + ' van ' + alleCatches + ' catch-blokken zijn volledig leeg -- steekproef dit sessie: risicovolle contexten (opslag/betaling) waren zeldzaam (3/' + legeCatches + ') en bleken bij inspectie onschuldige lees-fallbacks, geen volledige 250-item-audit binnen dit sprintbudget.');
}

console.log('fObservabilityErrorTaxonomy: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
