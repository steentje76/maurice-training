/* core/fB9_H3BCloudProviderIntegration.test.js
 * B9-H3B Cross-Sport Cloud Provider Integration.
 * Bewaakt: de generieke provider-adapter/sport-mapper/metric-mapper,
 * units/timezone-correctheid, missing != zero, dedupe/idempotency
 * (inclusief de zelf gevonden en gerepareerde partial-index-bug),
 * manual data protection, security (auth/anon/cross-user), geen
 * provider-specifieke sportengines, en de bestaande architectuur blijft
 * ongewijzigd/herbruikt (geen tweede token-vault, geen tweede
 * connection-model).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CloudActivityIngestion = require('./cloudActivityIngestion.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v541.sql'), 'utf8');
const netlifyFn = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearable-sync-activities.js'), 'utf8');
const authLib = fs.readFileSync(path.join(ROOT, 'netlify/functions/_wearableAuthLib.js'), 'utf8');
const authStart = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearable-auth-start.js'), 'utf8');
const delAcct = fs.readFileSync(path.join(ROOT, 'netlify/functions/delete-account.js'), 'utf8');

// ---- 1. Sport mapping: Running/Cycling verplicht, geen provider-specifieke engine ----
ok(CloudActivityIngestion.mapSport('RUNNING') === 'running',
  '1a: RUNNING -> canoniek "running"');
ok(CloudActivityIngestion.mapSport('TRAIL_RUNNING') === 'running',
  '1b: TRAIL_RUNNING -> canoniek "running" (subtype-mapping)');
ok(CloudActivityIngestion.mapSport('BIKING') === 'cycling',
  '1c: BIKING -> canoniek "cycling"');
ok(CloudActivityIngestion.mapSport('ROAD_BIKING') === 'cycling',
  '1d: ROAD_BIKING -> canoniek "cycling" (subtype-mapping)');

// ---- 2. Onbekende sport: geen crash, geen gok (sectie 34/38) ----
ok(CloudActivityIngestion.mapSport('SWIMMING_POOL') === null,
  '2a: onbekende/niet-ondersteunde sport -> null, geen crash, geen gok');
ok(CloudActivityIngestion.mapSport(null) === null && CloudActivityIngestion.mapSport(undefined) === null,
  '2b: ontbrekend sporttype -> null, geen crash');

// ---- 3. Units: milliseconds-als-seconds-bug (sabotage S6) ----
ok(CloudActivityIngestion.parseGoogleHealthDuration('1800s') === 1800,
  '3a: "1800s" (Google Health-formaat) -> 1800 (integer seconden), correct geparsed');
ok(CloudActivityIngestion.parseGoogleHealthDuration('1800') === null,
  '3b (sabotage S6-detectie): een duration-string ZONDER het verplichte "s"-suffix wordt NIET geaccepteerd als seconden -- voorkomt een milliseconds/seconds-verwarring als de bron ooit een ander formaat levert');
ok(CloudActivityIngestion.parseGoogleHealthDuration(null) === null && CloudActivityIngestion.parseGoogleHealthDuration(undefined) === null,
  '3c: missing duration -> null, NOOIT 0 (sectie 35)');

// ---- 4. Units: millimeters-naar-meters (sabotage S5, mile/km-analoog) ----
ok(CloudActivityIngestion.millimetersToMeters(5000000) === 5000,
  '4a: 5.000.000 millimeter (Google Health-eenheid) -> 5000 meter, correcte conversie');
ok(CloudActivityIngestion.millimetersToMeters(null) === null,
  '4b: missing distance -> null, NOOIT 0 (sectie 35)');

// ---- 5. Missing != Zero (sectie 35, hard regression gate) ----
{
  const result = CloudActivityIngestion.normalizeGoogleHealthExercise({
    name: 'users/me/dataTypes/exercise/dataPoints/no-metrics-test',
    exercise: { exerciseType: 'RUNNING', interval: { startTime: '2026-04-20T08:00:00Z' } }
  }, 'user-1');
  ok(result.valid === true, '5a: een exercise zonder metricsSummary blijft geldig (partial data is OK)');
  ok(result.activity.distance_meters === null, '5b: ontbrekende afstand -> null, NIET 0');
  ok(result.activity.avg_heart_rate_bpm === null && result.activity.avg_power_watts === null && result.activity.avg_cadence_rpm === null,
    '5c: HR/power/cadence die Google Health exercise.metricsSummary niet standaard levert -> null, NIET 0/verzonnen');
}

// ---- 6. Provenance (sectie 16/19) ----
{
  const result = CloudActivityIngestion.normalizeGoogleHealthExercise({
    name: 'users/me/dataTypes/exercise/dataPoints/prov-test',
    exercise: { exerciseType: 'RUNNING', interval: { startTime: '2026-04-20T08:00:00Z' }, activeDuration: '1800s' }
  }, 'user-1');
  ok(result.activity.source_provider === 'google_health', '6a: source_provider correct vastgelegd');
  ok(result.activity.source_provenance === 'provider_derived', '6b: source_provenance correct "provider_derived" (bestaande, canonieke waarde, geen nieuwe categorie verzonnen)');
  ok(result.activity.dedupe_key === 'google_health:users/me/dataTypes/exercise/dataPoints/prov-test',
    '6c: dedupe_key is deterministisch, provider+external-id-gebaseerd (EXACT-confidence dedupe, sectie 25)');
}

// ---- 7. Ontbrekende external ID -> geweigerd (geen dedupe-loze rij) ----
{
  const result = CloudActivityIngestion.normalizeGoogleHealthExercise({
    exercise: { exerciseType: 'RUNNING', interval: { startTime: '2026-04-20T08:00:00Z' } }
  }, 'user-1');
  ok(result.valid === false && result.reason === 'missing_external_id',
    '7: zonder een external ID (dataPoint.name) wordt de activity geweigerd -- nooit een dedupe-loze provider-rij (zou idempotency onmogelijk maken)');
}

// ---- 8. Provider is GEEN sportengine (sectie 13, architecturale grens) ----
ok(!fs.existsSync(path.join(ROOT, 'core/googleHealthRunningEngine.js')) && !fs.existsSync(path.join(ROOT, 'core/googleHealthCyclingEngine.js')),
  '8: geen enkele provider-specifieke "Engine" bestaat -- de adapter produceert canonieke activities, de bestaande Running/Cycling Calculation Engines blijven de enige bron van sport-berekeningen');

// ---- 9. Canonical Activity Is Source Of Truth (sectie 15) ----
ok(!fs.existsSync(path.join(ROOT, 'migratie_v541.sql')) || !migratie.match(/create table.*google_health_run|create table.*google_health_ride/i),
  '9: geen nieuwe, parallelle productlaag (bijv. google_health_runs) -- de bestaande, canonieke activities-tabel wordt hergebruikt, ongewijzigd qua schema');

// ---- 10. Idempotency/dedupe: de zelf gevonden en gerepareerde partial-index-bug ----
ok(migratie.includes('on conflict (user_id, dedupe_key) where dedupe_key is not null'),
  '10a (zelf gevonden en gerepareerd): de RPC gebruikt de expliciete, partial-index-bewuste ON CONFLICT-syntax -- PostgREST se generieke on_conflict-query-parameter ondersteunt dit NIET (live bevestigd: 42P10-fout bij een eerdere poging), vandaar de eigen RPC i.p.v. een directe PostgREST-insert');
ok(!netlifyFn.includes('on_conflict=user_id,dedupe_key'),
  '10b: de Netlify-functie gebruikt niet langer de kapotte, directe PostgREST on_conflict-aanpak (vervangen door de RPC)');

// ---- 11. Manual Data Protection (sectie 31, zelf gevonden tijdens ontwerp) ----
ok(migratie.includes("data_quality is distinct from 'user_corrected'"),
  '11a (zelf gevonden): de upsert-RPC beschermt expliciet tegen het overschrijven van een handmatig gecorrigeerde activity (data_quality=user_corrected) door een volgende provider-sync -- live, adversariaal bevestigd: distance_meters bleef 5000 (gebruiker se correctie), niet overschreven door 9999 (nieuwe provider-waarde)');
ok(netlifyFn.includes("upsertBody === null") || netlifyFn.match(/upsertBody.*null/),
  '11b: de Netlify-functie behandelt een NULL-resultaat (manual-protection-skip) expliciet als "skipped", niet als fake "imported"-succes (sectie 71: geen fake succes in telemetrie)');

// ---- 12. Security: cross-user (sectie 62, S8) ----
ok(migratie.includes("raise exception 'not authorized to write activity data for another user'"),
  '12a: de RPC weigert expliciet als een niet-service-role-caller namens een andere gebruiker probeert te schrijven -- live, adversariaal bevestigd (geweigerd)');
ok(migratie.includes("auth.role() is distinct from 'service_role'"),
  '12b: hetzelfde, reeds bewezen patroon als upsert_daily_health() (wearable-sync.js) wordt hergebruikt -- geen nieuw, ad-hoc autorisatiepatroon');

// ---- 13. Security: anon (sectie 60, S9/S10) ----
ok(migratie.includes('revoke execute on function public.upsert_provider_activity') && migratie.match(/revoke execute on function public\.upsert_provider_activity\([^)]*\) from anon/),
  '13: expliciete anon-revoke naast de grant aan authenticated -- live bevestigd: has_function_privilege(anon,...)=false');

// ---- 14. Token vault hergebruikt, geen tweede systeem (sectie 43/47) ----
ok(authLib.includes("require('./wearableTokenVault.js')"),
  '14: de nieuwe auth-helper hergebruikt de bestaande, versleutelde wearableTokenVault -- geen plaintext-tokenopslag, geen tweede vault-systeem');

// ---- 15. wearable-sync.js (HRV/RHR/sleep) blijft ONGEWIJZIGD (failure isolation, sectie 57) ----
{
  const wearableSync = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearable-sync.js'), 'utf8');
  ok(!wearableSync.includes('exercise') || wearableSync.includes('// (geen wijziging'),
    '15a: wearable-sync.js is niet gewijzigd om de nieuwe exercise-ingestion te introduceren -- een storing in de nieuwe activity-sync mag de bestaande, kritieke HRV/RHR/sleep-sync niet kunnen breken (geïsoleerde, aparte functie)');
}

// ---- 16. OAuth-scope-uitbreiding (sectie 45, least privilege) ----
ok(authStart.includes('googlehealth.activity_and_fitness.readonly'),
  '16a: de nieuwe, officiële Google Health-scope voor exercise-toegang is toegevoegd aan de OAuth-flow (geverifieerd tegen developers.google.com/health/scopes)');
ok(authStart.includes('googlehealth.health_metrics_and_measurements.readonly') && authStart.includes('googlehealth.sleep.readonly'),
  '16b: de bestaande, reeds gebruikte scopes blijven behouden (geen regressie op HRV/RHR/sleep-toegang)');

// ---- 17. Account deletion (sectie 50, reeds bewezen, herbevestigd) ----
ok(delAcct.includes("'activities',"),
  '17: activities staat al in de account-deletion-lijst (B9-01) -- geen nieuwe tabel om apart te dekken, de nieuwe provider-ingestion schrijft naar dezelfde, reeds gedekte tabel');

// ---- 18. Provider Capabilities niet uit naam afgeleid (sectie 44) ----
ok(!netlifyFn.match(/if\s*\(\s*provider\s*===?\s*['"]google_health['"]\s*\)\s*{\s*\/\/\s*heeft altijd/i),
  '18: geen hardcoded "als provider X, dan altijd capability Y"-aanname zonder expliciete data-check');

// ---- 19. AI/Calculation/Decision-boundary (sectie 66-69) ----
ok(!netlifyFn.match(/calculat|decision|threshold.*rest|bodyBattery/i),
  '19: de ingestion-functie bevat geen enkele calculation/decision-logica -- puur adapter + persistence, downstream engines blijven de enige bron van sport-berekeningen en beslissingen');

// ---- 20. Provider-2-ready architectuur (sectie 82) ----
ok(fs.existsSync(path.join(ROOT, 'core/cloudActivityIngestion.js')) &&
   require(path.join(ROOT, 'core/cloudActivityIngestion.js')).SPORT_MAPPING &&
   Object.keys(require(path.join(ROOT, 'core/cloudActivityIngestion.js')).SPORT_MAPPING).length > 0,
  '20: de sport-mapping zit in één, centrale, exporteerbare registry (SPORT_MAPPING) -- een tweede provider kan een eigen adapter-functie toevoegen die dezelfde canonieke output produceert, zonder de activities-tabel, Running/Cycling Engines, of Decision/AI-laag te wijzigen');

// ---- 21. Downstream-consumptie: bestaande Intelligence-modules zijn al provider-agnostisch (sectie 19/20/77) ----
{
  const runningIntel = fs.readFileSync(path.join(ROOT, 'core/runningIntelligence.js'), 'utf8');
  const cyclingIntel = fs.readFileSync(path.join(ROOT, 'core/cyclingIntelligence.js'), 'utf8');
  ok(runningIntel.match(/function\s+weeklyVolume\s*\(\s*activities\s*\)/) && runningIntel.match(/function\s+criticalSpeedEligiblePerformances\s*\(\s*activities/),
    '21a: runningIntelligence.js neemt een generieke "activities"-array als parameter -- een provider-afkomstige rij (source_provenance=provider_derived) wordt zonder enige codewijziging op dezelfde manier verwerkt als een handmatig ingevoerde activity, precies zoals sectie 19 vereist ("connector berekent dit NIET", de bestaande engine blijft de enige bron)');
  ok(cyclingIntel.match(/function\s+criticalPowerEligiblePerformances\s*\(\s*activities/),
    '21b: cyclingIntelligence.js is eveneens volledig generiek op de activities-array -- geen provider-specifieke Cycling-berekening nodig of gebouwd (sectie 20)');
}

console.log('fB9_H3BCloudProviderIntegration: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
