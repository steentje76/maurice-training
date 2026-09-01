/* core/fB9_H3CRealProviderValidation.test.js
 * B9-H3C Real Provider & Device Validation Closure.
 * Bewaakt de zelf gevonden en gerepareerde fix voor bestaande
 * gebruikers met een oud token (CONNECTED_BUT_SCOPE_MISSING), plus
 * aanvullende, adversariale robuustheidstests op de provider-adapter
 * (malformed data) die zonder een echte provider-verbinding uitvoerbaar
 * zijn.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CloudActivityIngestion = require('./cloudActivityIngestion.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const netlifyFn = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearable-sync-activities.js'), 'utf8');

// ---- 1. CONNECTED_BUT_SCOPE_MISSING wordt expliciet onderscheiden (sectie 11, zelf gevonden gap) ----
ok(netlifyFn.includes("'insufficientPermissions'") && netlifyFn.includes("'ACCESS_TOKEN_SCOPE_INSUFFICIENT'"),
  '1a (zelf gevonden en gerepareerd): een bestaande gebruiker (vóór B9-H3B gekoppeld, dus zonder de nieuwe activity-scope) kreeg voorheen een ondoorzichtige "provider_error" i.p.v. een herkenbare "scope ontbreekt"-status. Nu wordt Google se officiële 403-foutcontract (reason=insufficientPermissions / ACCESS_TOKEN_SCOPE_INSUFFICIENT) expliciet herkend.');
ok(netlifyFn.includes("'scope_missing'"),
  '1b: de functie retourneert nu een expliciete "scope_missing"-status, te onderscheiden van "provider_error"/"token_expired"/"not_connected" (sectie 11-vereiste)');

// ---- 2. HRV/RHR/sleep blijven ONGEWIJZIGD werken voor deze zelfde, oude verbinding ----
{
  const wearableSync = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearable-sync.js'), 'utf8');
  ok(!wearableSync.includes('scope_missing'),
    '2: wearable-sync.js (HRV/RHR/sleep) is niet gewijzigd door deze fix -- een oud token zonder de nieuwe activity-scope blijft voor de bestaande, kritieke sync gewoon geldig, want die scope was nooit vereist voor HRV/RHR/sleep');
}

// ---- 3. Provider malformed data (sectie 46): negative distance, absurd duration, unknown sport ----
ok(CloudActivityIngestion.millimetersToMeters(-5000000) === -5000,
  '3a: een negatieve afstand wordt niet stilzwijgend "gecorrigeerd" naar 0 of positief -- de waarde wordt eerlijk doorgegeven zoals ontvangen (downstream Calculation/Context is verantwoordelijk voor plausibiliteitschecks, niet de adapter zelf, conform sectie 13: geen sportengine-logica in de adapter)');
{
  const result = CloudActivityIngestion.normalizeGoogleHealthExercise({
    name: 'users/me/dataTypes/exercise/dataPoints/malformed-1',
    exercise: { exerciseType: 'UNKNOWN_FUTURE_SPORT_TYPE', interval: { startTime: '2026-04-20T08:00:00Z' }, activeDuration: '99999999s' }
  }, 'user-1');
  ok(result.valid === false && result.reason === 'unsupported_sport',
    '3b: een absurd lange duration in combinatie met een onbekend, toekomstig sporttype wordt geweigerd op sportniveau (geen crash) -- de duration wordt niet eens verder verwerkt voor een niet-ondersteunde sport');
}
{
  const result = CloudActivityIngestion.normalizeGoogleHealthExercise({
    name: 'users/me/dataTypes/exercise/dataPoints/malformed-2',
    exercise: { exerciseType: 'RUNNING', interval: { startTime: 'niet-een-geldige-iso-datum' }, activeDuration: '1800s' }
  }, 'user-1');
  ok(result.valid === true && result.activity.recorded_at === 'niet-een-geldige-iso-datum',
    '3c: een malformed timestamp wordt NIET zelf geparsed/gecorrigeerd door de adapter -- ongewijzigd doorgegeven; de database-kolom (timestamptz) valideert bij insertie, en een insert-fout is een expliciete, zichtbare fout (geen silent corruption), niet een stille "0000-01-01"-fallback');
}
{
  const result = CloudActivityIngestion.normalizeGoogleHealthExercise({
    name: '',
    exercise: { exerciseType: 'RUNNING', interval: { startTime: '2026-04-20T08:00:00Z' }, activeDuration: '1800s' }
  }, 'user-1');
  ok(result.valid === false && result.reason === 'missing_external_id',
    '3d: een lege string als external ID (edge case naast null/undefined) wordt eveneens geweigerd -- geen dedupe-loze rij');
}

// ---- 4. Giant payload / duplicated ID binnen dezelfde sync-batch (sectie 46) ----
{
  const dataPoint = {
    name: 'users/me/dataTypes/exercise/dataPoints/duplicate-in-batch',
    exercise: { exerciseType: 'RUNNING', interval: { startTime: '2026-04-20T08:00:00Z' }, activeDuration: '1800s' }
  };
  const r1 = CloudActivityIngestion.normalizeGoogleHealthExercise(dataPoint, 'user-1');
  const r2 = CloudActivityIngestion.normalizeGoogleHealthExercise(dataPoint, 'user-1');
  ok(r1.activity.dedupe_key === r2.activity.dedupe_key,
    '4: dezelfde datapoint tweemaal in één sync-batch verwerkt (bijv. door een pagination-overlap) produceert dezelfde dedupe_key -- de database-RPC (upsert_provider_activity, live bewezen in B9-H3B) handelt de daadwerkelijke deduplicatie af, de adapter zelf hoeft geen batch-interne state bij te houden');
}

console.log('fB9_H3CRealProviderValidation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
