/* wearable-sync HANDLER integratietest — de ECHTE function (netlify/functions/wearable-sync.js)
 * met een GEMOCKTE transport (global.fetch). Bewijst de volledige keten:
 *   sessie → connectie → (token ok) → Google-Health dataPoints → parse → buildRow([src:fitbit])
 *   → hrv_log write → canoniek resultaat. De LIVE fetch blijft EXTERN BLOCKED; hier is hij gemockt
 *   met realistische payload-vormen (geen productie-data). Draai: node core/fWearableSyncHandler.test.js
 */
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.GOOGLE_HEALTH_CLIENT_ID = 'cid';
process.env.GOOGLE_HEALTH_CLIENT_SECRET = 'csec';

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a,b,m){ if (JSON.stringify(a)===JSON.stringify(b)) pass++; else { fail++; console.log('  ✗ '+m+' (verwacht '+JSON.stringify(b)+', kreeg '+JSON.stringify(a)+')'); } }

const future = new Date(Date.now() + 3600*1000).toISOString();
let writtenRows = [];

function makeFetch(healthPoints){
  return async function(url, opts){
    url = String(url); opts = opts || {}; const method = opts.method || 'GET';
    const J = (obj, okFlag=true, status=200) => ({ ok: okFlag, status, json: async()=>obj, text: async()=>JSON.stringify(obj) });
    if (url.indexOf('/auth/v1/user') !== -1) return J({ id: 'u1' });
    if (url.indexOf('wearable_connections') !== -1 && method === 'GET')
      return J([{ access_token: 'AT', token_expires_at: future, refresh_token: 'RT' }]);
    if (url.indexOf('wearable_connections') !== -1 && method === 'PATCH') return J({}, true, 204);
    if (url.indexOf('health.googleapis.com') !== -1){
      if (url.indexOf('daily-heart-rate-variability') !== -1) return J({ dataPoints: healthPoints.hrv });
      if (url.indexOf('daily-resting-heart-rate') !== -1) return J({ dataPoints: healthPoints.rhr });
      if (url.indexOf('dataTypes/sleep') !== -1) return J({ dataPoints: healthPoints.sleep });
      return J({ dataPoints: [] });
    }
    if (url.indexOf('/rest/v1/hrv_log') !== -1 && method === 'GET') return J([]); // geen bestaande rij
    if (url.indexOf('/rest/v1/hrv_log') !== -1 && method === 'POST'){ writtenRows.push(JSON.parse(opts.body)); return J({}, true, 201); }
    if (url.indexOf('/rest/v1/hrv_log') !== -1 && method === 'PATCH'){ writtenRows.push(JSON.parse(opts.body)); return J({}, true, 204); }
    return J({}, true, 200);
  };
}

const handlerMod = require('../netlify/functions/wearable-sync.js');
const event = { httpMethod: 'POST', headers: { authorization: 'Bearer session' } };

(async () => {
  // SCENARIO 1: echte data → geschreven met [src:fitbit], canoniek success
  writtenRows = [];
  global.fetch = makeFetch({
    hrv:   [{ date: '2026-08-17', dailyHeartRateVariability: { rmssdMillis: 42 } }],
    rhr:   [{ date: '2026-08-17', dailyRestingHeartRate: { bpm: 54 } }],
    sleep: [{ interval: { endTime: '2026-08-17T06:30:00Z' }, sleep: { summary: { totalDurationMillis: 27000000 } } }]
  });
  let res = await handlerMod.handler(event);
  let body = JSON.parse(res.body);
  eq(res.statusCode, 200, 'S1: 200');
  eq(body.status, 'success', 'S1: canoniek status success (echte data geschreven)');
  eq(body.daysWritten, 1, 'S1: 1 dag geschreven (backward-compat veld)');
  eq(body.imported, 1, 'S1: imported=1');
  ok(body.syncedAt, 'S1: syncedAt aanwezig');
  ok(writtenRows.length === 1, 'S1: exact één hrv_log-write');
  eq(writtenRows[0].hrv, 42, 'S1: HRV 42 geschreven (RMSSD-pad)');
  eq(writtenRows[0].rhr, 54, 'S1: RHR 54 geschreven');
  eq(writtenRows[0].sleep, 7.5, 'S1: slaap weggeschreven als 7,5 uur (canonieke eenheid)');
  ok(/\[src:fitbit\]/.test(writtenRows[0].note), 'S1: [src:fitbit]-provenance geschreven (kernrepair)');
  eq(writtenRows[0].date, '2026-08-17', 'S1: juiste datum (niet vandaag geforceerd)');

  // SCENARIO 2: API 200 maar 0 dataPoints → GEEN fake success
  writtenRows = [];
  global.fetch = makeFetch({ hrv: [], rhr: [], sleep: [] });
  res = await handlerMod.handler(event); body = JSON.parse(res.body);
  eq(body.status, 'no_new_data', 'S2: 0 records → no_new_data (OAuth-succes ≠ data-succes)');
  eq(body.daysWritten, 0, 'S2: daysWritten 0');
  eq(writtenRows.length, 0, 'S2: niets geschreven');

  // SCENARIO 3: velden matchen NIET (onbekende paden) → parsed 0 → skipped, geen fake data
  writtenRows = [];
  global.fetch = makeFetch({
    hrv:   [{ date: '2026-08-17', SOMETHING_ELSE: { foo: 1 } }],
    rhr:   [], sleep: []
  });
  res = await handlerMod.handler(event); body = JSON.parse(res.body);
  eq(body.status, 'no_new_data', 'S3: onbekende veldpaden → parsed null → no_new_data (geen fabricage)');
  eq(writtenRows.length, 0, 'S3: geen rij geschreven bij niet-herkende velden');

  // SCENARIO 4: niet gekoppeld
  global.fetch = async function(url, opts){
    url = String(url); const method=(opts&&opts.method)||'GET';
    const J=(o,f=true,s=200)=>({ok:f,status:s,json:async()=>o});
    if (url.indexOf('/auth/v1/user')!==-1) return J({id:'u1'});
    if (url.indexOf('wearable_connections')!==-1 && method==='GET') return J([]); // geen connectie
    return J({});
  };
  res = await handlerMod.handler(event); body = JSON.parse(res.body);
  eq(body.status, 'not_connected', 'S4: geen connectie → not_connected');
  eq(body.synced, false, 'S4: synced false');

  // SCENARIO 5: ECHTE PRODUCTIE-SHAPE (nested records, zoals de live diag-log bewees) → parsed>0, imported, [src:fitbit]
  writtenRows = [];
  global.fetch = makeFetch({
    hrv:   [{ dataSource:'d', dailyHeartRateVariability: { date:{year:2026,month:8,day:17}, averageHeartRateVariabilityMilliseconds: 42 } }],
    rhr:   [{ dataSource:'d', dailyRestingHeartRate: { date:{year:2026,month:8,day:17}, averageBeatsPerMinute: 54 } }],
    sleep: [{ name:'n', dataSource:'d', sleep: { interval: { startTime:'2026-08-16T23:00:00Z', endTime:'2026-08-17T06:30:00Z' } } }]
  });
  res = await handlerMod.handler(event); body = JSON.parse(res.body);
  eq(body.status, 'success', 'S5: productie-shape → success (parsed:0 is opgelost)');
  eq(body.imported, 1, 'S5: 1 dag geïmporteerd uit echte nested shape');
  ok(writtenRows.length === 1, 'S5: exact één write');
  eq(writtenRows[0].hrv, 42, 'S5: HRV 42 (averageHeartRateVariabilityMilliseconds)');
  eq(writtenRows[0].rhr, 54, 'S5: RHR 54 (averageBeatsPerMinute — parsed.rhr=0-fix)');
  eq(body.metrics && body.metrics.rhr, 1, 'S5: per-metric telling rhr=1 (voor per-metric sync-microcopy)');
  eq(writtenRows[0].sleep, 7.5, 'S5: slaap uit interval → 7,5 uur');
  eq(writtenRows[0].date, '2026-08-17', 'S5: juiste datum uit nested date');
  ok(/\[src:fitbit\]/.test(writtenRows[0].note), 'S5: provenance [src:fitbit] behouden');
  // SCENARIO 6: tweede identieke productie-sync → geen duplicaat (upsert per datum)
  const prior = writtenRows[0]; writtenRows = [];
  global.fetch = (function(base){ return async function(url, opts){
    url=String(url); const method=(opts&&opts.method)||'GET';
    if (url.indexOf('/rest/v1/hrv_log')!==-1 && method==='GET') return { ok:true, status:200, json:async()=>[{ id:99, ...prior }] }; // bestaat al
    return base(url, opts);
  }; })(makeFetch({
    hrv:   [{ dataSource:'d', dailyHeartRateVariability: { date:{year:2026,month:8,day:17}, averageHeartRateVariabilityMilliseconds: 42 } }],
    rhr:   [], sleep: []
  }));
  res = await handlerMod.handler(event); body = JSON.parse(res.body);
  eq(body.imported, 0, 'S6: tweede sync → 0 nieuw (geen duplicaat)');
  eq(body.updated, 1, 'S6: bestaande datum → update (upsert per datum, idempotent)');


  // ── SCENARIO 7: INCIDENT 18-08-2026 — EXACTE live productie-shape ───────────
  // Live diag bewees: http 200, fetched {hrv:8,rhr:8,sleep:8}, parsed {hrv:8,rhr:0,sleep:8}
  // met recordShape.rhr = ["date","beatsPerMinute","dailyRestingHeartRateMetadata"].
  // `beatsPerMinute` is int64 → JSON-string. Deze test faalt op de oude parser.
  writtenRows = []; let seenHrvLogQuery = null;
  global.fetch = (function(base){ return async function(url, opts){
    if (String(url).indexOf('/rest/v1/hrv_log') !== -1 && !(opts && opts.method && opts.method !== 'GET')) seenHrvLogQuery = String(url);
    return base(url, opts);
  }; })(makeFetch({
    hrv:   [{ dataSource:'d', dailyHeartRateVariability:{ date:{year:2026,month:8,day:17}, averageHeartRateVariabilityMilliseconds: 28.5, nonRemHeartRateBeatsPerMinute:'52', entropy: 3.1 } }],
    rhr:   [{ dataSource:'d', dailyRestingHeartRate:{ date:{year:2026,month:8,day:17}, beatsPerMinute: '57', dailyRestingHeartRateMetadata:{ calculationMethod:'WITH_SLEEP' } } }],
    sleep: [{ name:'n', dataSource:'d', sleep:{ interval:{ startTime:'2026-08-16T23:12:00Z', endTime:'2026-08-17T06:16:00Z' }, type:'x', stages:[], metadata:{}, summary:{}, shortAwakenings:[] } }]
  }));
  res = await handlerMod.handler(event); body = JSON.parse(res.body);
  eq(body.metrics && body.metrics.rhr, 1, 'S7: RHR wordt nu WEL geparsed uit int64-string (was parsed.rhr=0)');
  eq(writtenRows.length, 1, 'S7: exact één write');
  eq(writtenRows[0].rhr, 57, 'S7: rusthartslag 57 komt in hrv_log terecht');
  eq(writtenRows[0].hrv, 28.5, 'S7: HRV blijft correct');
  ok(writtenRows[0].sleep > 7 && writtenRows[0].sleep < 7.2, 'S7: slaap uit interval (~7,07 uur)');
  eq(body.http && body.http.rhr, 200, 'S7: HTTP-status per datatype in het antwoord (diagnose zonder logtoegang)');
  ok(seenHrvLogQuery && seenHrvLogQuery.indexOf('order=created_at.desc') !== -1,
     'S7: bestaande-rij-lookup is deterministisch (order=created_at.desc) — patcht de rij die de app toont');

  // ── SCENARIO 8: PostgREST-foutobject → getypeerde SUPABASE_ERROR, geen lek ───
  // Voorheen gaf `const [conn] = <object>` een TypeError → generieke 500 "Serverfout".
  writtenRows = [];
  global.fetch = async function(url, opts){
    url = String(url);
    if (url.indexOf('/auth/v1/user') !== -1) return { ok:true, status:200, json: async()=>({ id:'u1' }) };
    if (url.indexOf('wearable_connections') !== -1 && (!opts || !opts.method || opts.method === 'GET'))
      return { ok:false, status:500, json: async()=>({ code:'PGRST301', message:'db down' }), text: async()=>'x' };
    return { ok:true, status:200, json: async()=>({}), text: async()=>'{}' };
  };
  res = await handlerMod.handler(event); body = JSON.parse(res.body);
  eq(res.statusCode, 500, 'S8: Supabase-fout → 500');
  ok(body.code && body.code.length > 0, 'S8: machineleesbare foutcode aanwezig');
  ok(!/db down|PGRST301/.test(JSON.stringify(body)), 'S8: geen technische/DB-details richting client');
  ok(/Probeer het later opnieuw/.test(body.error.message), 'S8: veilige gebruikersmelding i.p.v. "Serverfout"');

  // ── SCENARIO 9: provider rate limit (429) → RATE_LIMIT in het antwoord ───────
  writtenRows = [];
  global.fetch = (function(base){ return async function(url, opts){
    if (String(url).indexOf('health.googleapis.com') !== -1) return { ok:false, status:429, json: async()=>({}), text: async()=>'' };
    return base(url, opts);
  }; })(makeFetch({ hrv:[], rhr:[], sleep:[] }));
  res = await handlerMod.handler(event); body = JSON.parse(res.body);
  eq(res.statusCode, 200, 'S9: rate limit is geen serverfout');
  eq(body.code, 'RATE_LIMIT', 'S9: RATE_LIMIT expliciet gerapporteerd');
  eq(body.status, 'no_new_data', 'S9: geen valse "success" bij een geblokkeerde provider');

  console.log('\nwearable-sync HANDLER (mocked transport): RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HANDLER TEST FAIL:', e); process.exit(2); });
