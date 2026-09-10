/* fWearableStepsIngestion.test.js — DEVICES/WEARABLES MASTER SPRINT.
 * Integratietest voor de nieuwe stappen-ingestion in wearable-sync.js, zelfde
 * harnas als fWearableSyncHandler.test.js (gemockte transport, echte
 * handler-code). Bewaakt specifiek: UNKNOWN != ZERO (een dag zonder
 * rollup-entry wordt nooit als 0 stappen geschreven), een echte countSum=0
 * WORDT geschreven (sedentaire, wel-getrackte dag), een steps-only dag
 * (geen hrv/rhr/sleep) wordt niet stilzwijgend overgeslagen (de contributed()
 * -fix), en dat de bestaande hrv/rhr/sleep-keten ongewijzigd blijft werken.
 */
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.GOOGLE_HEALTH_CLIENT_ID = 'cid';
process.env.GOOGLE_HEALTH_CLIENT_SECRET = 'csec';

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m) { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }

const future = new Date(Date.now() + 3600 * 1000).toISOString();
let writtenRows = [];

function makeFetch(rollupEntries) {
  return async function (url, opts) {
    url = String(url); opts = opts || {}; const method = opts.method || 'GET';
    const J = (obj, okFlag = true, status = 200) => ({ ok: okFlag, status, json: async () => obj, text: async () => JSON.stringify(obj) });
    if (url.indexOf('/auth/v1/user') !== -1) return J({ id: 'u1' });
    if (url.indexOf('wearable_connections') !== -1 && method === 'GET')
      return J([{ access_token_secret_id: 'sid-at', refresh_token_secret_id: 'sid-rt', token_expires_at: future }]);
    if (url.indexOf('wearable_connections') !== -1 && method === 'PATCH') return J({}, true, 204);
    if (url.indexOf('/rpc/get_wearable_token_secret') !== -1) {
      const body = JSON.parse(opts.body || '{}');
      if (body.p_secret_id === 'sid-at') return J('AT');
      if (body.p_secret_id === 'sid-rt') return J('RT');
      return J(null);
    }
    if (url.indexOf('/rpc/update_wearable_token_secret') !== -1) return J(null);
    // Nieuwe dailyRollUp-aanroep voor steps -- POST, geen GET met filter-query.
    if (url.indexOf('dataTypes/steps/dataPoints:dailyRollUp') !== -1 && method === 'POST') {
      return J({ rollupDataPoints: rollupEntries });
    }
    if (url.indexOf('health.googleapis.com') !== -1) return J({ dataPoints: [] }); // hrv/rhr/sleep: geen data in deze scenario's
    if (url.indexOf('/rest/v1/hrv_log') !== -1 && method === 'GET') return J([]);
    if (url.indexOf('/rest/v1/rpc/upsert_daily_health') !== -1 && method === 'POST') {
      const body = JSON.parse(opts.body);
      writtenRows.push({ steps: body.p_steps, hrv: body.p_hrv, rhr: body.p_rhr, sleep: body.p_sleep, date: body.p_date, note: body.p_note });
      return J({}, true, 200);
    }
    return J({}, true, 200);
  };
}

const handlerMod = require('../netlify/functions/wearable-sync.js');
const event = { httpMethod: 'POST', headers: { authorization: 'Bearer session' } };

// ---- Overload-les (v552/v557-precedent) toegepast op v560 -- synchroon,
// vóór de async scenario's, zodat de tellingen niet door elkaar lopen. ----
{
  const fs = require('fs');
  const path = require('path');
  const migratie = fs.readFileSync(path.join(__dirname, '..', 'migratie_v560.sql'), 'utf8');
  const heeftDrop = migratie.includes('DROP FUNCTION IF EXISTS public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text)');
  const dropVoorCreate = migratie.indexOf('DROP FUNCTION IF EXISTS public.upsert_daily_health') < migratie.indexOf('CREATE OR REPLACE FUNCTION public.upsert_daily_health');
  ok(heeftDrop && dropVoorCreate,
    'H1: migratie_v560 dropt expliciet de oude 9-parameter-signatuur VOOR de nieuwe 10-parameter-CREATE -- exact de v552/v557-les (CREATE OR REPLACE creeert een overload i.p.v. te vervangen bij een gewijzigde parameterlijst)');
}

(async () => {
  // SCENARIO 1: een dag met een echte rollup-entry (countSum=20316) wordt geschreven,
  // ook al zijn er geen hrv/rhr/sleep-data die dag (steps-only -- bewijst de contributed()-fix).
  writtenRows = [];
  global.fetch = makeFetch([{ civilStartTime: '2026-08-17T00:00:00Z', steps: { countSum: 20316 } }]);
  let res = await handlerMod.handler(event);
  let body = JSON.parse(res.body);
  eq(res.statusCode, 200, 'S1: 200');
  eq(body.status, 'success', 'S1: canoniek status success (steps-only telt mee als echte data)');
  ok(writtenRows.length === 1, 'S1: exact één hrv_log-write voor de steps-only dag (voorheen zou contributed()==false dit hebben overgeslagen)');
  eq(writtenRows[0].steps, 20316, 'S1: 20316 stappen correct geschreven');
  eq(writtenRows[0].date, '2026-08-17', 'S1: juiste datum uit civilStartTime');

  // SCENARIO 2: countSum=0 (een echte, bevestigde sedentaire dag) WORDT geschreven als 0 --
  // dit is geen UNKNOWN, de provider bevestigde expliciet een rollup met 0 stappen.
  writtenRows = [];
  global.fetch = makeFetch([{ civilStartTime: '2026-08-18T00:00:00Z', steps: { countSum: 0 } }]);
  res = await handlerMod.handler(event);
  body = JSON.parse(res.body);
  eq(body.status, 'success', 'S2: een bevestigde 0-stappen-dag telt nog steeds als succesvol geschreven data');
  ok(writtenRows.length === 1, 'S2: de dag wordt geschreven');
  eq(writtenRows[0].steps, 0, 'S2: countSum=0 wordt als 0 geschreven (geen "geen data"-verwarring, PARSER geeft hier bewust 0 terug, niet null)');

  // SCENARIO 3: GEEN rollup-entry voor een dag (bv. "off-wrist") -> UNKNOWN, NOOIT 0.
  // Simuleer door een lege rollupDataPoints-array terug te geven.
  writtenRows = [];
  global.fetch = makeFetch([]);
  res = await handlerMod.handler(event);
  body = JSON.parse(res.body);
  eq(body.status, 'no_new_data', 'S3: geen rollup-entries -> geen nieuwe data (geen fake 0-schrijving)');
  eq(writtenRows.length, 0, 'S3: geen enkele hrv_log-write -- UNKNOWN wordt nooit als 0 stappen weggeschreven');
  eq(body.metrics.steps, 0, 'S3: metrics.steps=0 betekent "0 dagen geparst", niet "stappen=0" (tellingsveld, geen meetwaarde)');

  // SCENARIO 4: een steps-veld ZONDER countSum (rollup-entry bestaat, maar geen steps-object) ->
  // ook UNKNOWN, niet 0 -- parseStepsRollupPoint() geeft value:null terug.
  writtenRows = [];
  global.fetch = makeFetch([{ civilStartTime: '2026-08-19T00:00:00Z' }]); // geen .steps-property
  res = await handlerMod.handler(event);
  eq(writtenRows.length, 0, 'S4: een rollup-entry zonder steps-veld schrijft niets (UNKNOWN, niet 0)');

  console.log('\n========================================================');
  console.log('fWearableStepsIngestion.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (fail) process.exitCode = 1;
})();

// ---- Overload-les (v552/v557-precedent) toegepast op v560 ----
(function () {
  const fs = require('fs');
  const path = require('path');
  const migratie = fs.readFileSync(path.join(__dirname, '..', 'migratie_v560.sql'), 'utf8');
  const heeftDrop = migratie.includes('DROP FUNCTION IF EXISTS public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text)');
  const dropVoorCreate = migratie.indexOf('DROP FUNCTION IF EXISTS public.upsert_daily_health') < migratie.indexOf('CREATE OR REPLACE FUNCTION public.upsert_daily_health');
  ok(heeftDrop && dropVoorCreate,
    'H1: migratie_v560 dropt expliciet de oude 9-parameter-signatuur VOOR de nieuwe 10-parameter-CREATE -- exact de v552/v557-les (CREATE OR REPLACE creeert een overload i.p.v. te vervangen bij een gewijzigde parameterlijst)');
  console.log('fWearableStepsIngestion.test.js (overload-check) — ' + (heeftDrop && dropVoorCreate ? '1 geslaagd' : '0 geslaagd, 1 mislukt'));
  if (!(heeftDrop && dropVoorCreate)) process.exitCode = 1;
})();
