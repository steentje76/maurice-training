/* Device-0 foundation (device_canonical.v1) — PURE canonical/normalize/provenance/
 * idempotency/unit/quality keten. Provider-onafhankelijk + Concept2 data-driven mapping
 * met REALISTISCHE Logbook-payload (officiële veldnamen/units: time=tienden s, distance=m).
 * Draai: node core/fDeviceIntegration.test.js
 */
const D = require('./deviceIntegration.js');

let pass = 0, fail = 0;
function eq(a, b, m){ if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function close(a, b, m, eps){ if (Math.abs(a - b) <= (eps || 1e-9)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ~' + b + ', kreeg ' + a + ')'); } }

// ── UNIT NORMALIZATION ──
eq(D.convertUnit(100, 'lb').value.toFixed(4), (45.359237).toFixed(4), 'lb→kg');
eq(D.convertUnit(100, 'lb').unit, 'kg', 'lb→kg unit');
eq(D.convertUnit(1, 'km').value, 1000, 'km→m');
eq(D.convertUnit(2000, 'm').value, 2000, 'm→m passthrough');
eq(D.convertUnit(50, 'dm').value, 5, 'dm→m (decimeter)');
eq(D.convertUnit(1234, 'ds').value, 123.4, 'ds→s (tienden seconde)');
eq(D.convertUnit(1234, 'cs').value, 12.34, 'cs→s (honderdsten)');
eq(D.convertUnit(90, 'sec_per_500m').unit, 'sec_per_500m', 'pace passthrough unit');
eq(D.convertUnit(5, 'w').value, 5, 'watt passthrough');
eq(D.convertUnit(10, 'onbekend'), null, 'onbekende unit → null (geen aanname)');
eq(D.convertUnit(null, 'kg'), null, 'null value → null');
eq(D.convertUnit('7,5', 'kg').value, 7.5, 'NL-komma tolerant');

// ── QUALITY / MISSING DATA ──
eq(D.classifyValue(undefined).status, 'empty', 'undefined → empty');
eq(D.classifyValue('').status, 'empty', 'lege string → empty');
eq(D.classifyValue(null).status, 'empty', 'null → empty');
eq(D.classifyValue('abc').status, 'invalid', 'niet-numeriek → invalid');
eq(D.classifyValue(-5).status, 'invalid', 'negatief → invalid (default)');
eq(D.classifyValue(-5, {allowNegative:true}).status, 'valid', 'negatief toegestaan → valid');
eq(D.classifyValue('1:55', {type:'time'}).value, 115, 'time mm:ss → 115s');
eq(D.classifyValue('x:y', {type:'time'}).status, 'invalid', 'onleesbare tijd → invalid');
eq(D.classifyValue(300, {max:240}).status, 'implausible', 'boven max → implausible');
eq(D.classifyValue(300, {max:240}).value, 300, 'implausible behoudt de echte waarde (geen drop)');
eq(D.classifyValue(10, {min:20}).status, 'implausible', 'onder min → implausible');
eq(D.classifyValue(120, {min:20,max:240}).status, 'valid', 'binnen bereik → valid');

// ── IDENTITY / IDEMPOTENCY ──
eq(D.workoutIdentity('Concept2', 987), 'concept2:987', 'workoutIdentity lowercased provider');
eq(D.workoutIdentity(null, 987), null, 'geen provider → null identity');
eq(D.workoutIdentity('c2', ''), null, 'lege externalId → null identity');
eq(D.metricIdentity('c2', 987, 'distance_m'), 'c2:987#distance_m', 'metricIdentity');
eq(D.metricIdentity('c2', 987, 'split', 3), 'c2:987#split:3', 'metricIdentity met index');
eq(D.metricIdentity('c2', null, 'x'), null, 'geen workout → geen metricIdentity');
// dedupe: identieke sleutel → één record (eerste wint)
const ded = D.dedupe([{k:'a',v:1},{k:'a',v:2},{k:'b',v:3}], x=>x.k);
eq(ded.length, 2, 'dedupe: 3→2 records');
eq(ded[0].v, 1, 'dedupe: eerste wint');
// records zonder key blijven behouden
eq(D.dedupe([{},{}], ()=>null).length, 2, 'dedupe: null-key records blijven');

// ── PROVENANCE ──
const prov = D.buildProvenance({provider:'concept2', metric:'distance_m', unit:'m', method:'api', receivedAt:1700000000000});
eq(prov.provider, 'concept2', 'provenance provider');
eq(prov.method, 'api', 'provenance method');
eq(prov.receivedAt, 1700000000000, 'provenance receivedAt ingespoten (geen Date.now)');
eq(prov.device, null, 'ontbrekend veld → null (niet gefabriceerd)');
eq(prov.schema, D.VERSIONS.canonical, 'provenance schema-versie');

// ── ADAPTER CONTRACT ──
eq(D.isAdapter({}).ok, false, 'leeg object is geen adapter');
eq(D.isAdapter(null).ok, false, 'null is geen adapter');
const stub = {}; D.ADAPTER_METHODS.forEach(m=>stub[m]=function(){});
eq(D.isAdapter(stub).ok, true, 'object met alle contractmethoden → geldige adapter');
delete stub.normalize;
ok(D.isAdapter(stub).missing.indexOf('normalize') !== -1, 'ontbrekende methode wordt gerapporteerd');

// ── NORMALIZE PIPELINE — provider-onafhankelijk ──
const genSpec = { provider:'demo', method:'file', idPath:'wid', timePath:'ts',
  fields:[ {key:'load_kg', path:'w', unit:'lb', type:'number', min:0, max:500},
           {key:'duration_s', path:'dur', type:'time'} ] };
const gw = D.normalizeWorkout({wid:'X1', ts:'2026-08-16T10:00:00Z', w:100, dur:'2:00'}, genSpec, {receivedAt:1700000000000, athlete:'a1'});
eq(gw.identity, 'demo:X1', 'canonical identity gezet');
eq(gw.schema, 'device_canonical.v1', 'canonical schema-versie');
eq(gw.athlete, 'a1', 'athlete uit ctx');
close(gw.metrics[0].value, 45.359237, 'load 100lb → 45.36kg canoniek');
eq(gw.metrics[0].unit, 'kg', 'load canonieke unit kg');
eq(gw.metrics[0].provenance.provider, 'demo', 'metric-provenance provider');
eq(gw.metrics[1].value, 120, 'duration 2:00 → 120s');
eq(gw.metrics[1].unit, 's', 'duration unit s');

// ── CONCEPT2 — realistische Logbook results-payload (officiële velden/units) ──
const c2 = {
  id: 693047,
  user_id: 12345,
  date: '2026-08-16 09:30:00',
  date_utc: '2026-08-16T07:30:00Z',
  type: 'rower',
  distance: 5000,            // meters
  time: 12000,               // TIENDEN seconde → 1200.0 s (20:00)
  workout_type: 'FixedDistanceInterval',
  stroke_rate: 28,           // spm
  stroke_count: 560,
  calories_total: 250,       // kcal
  drag_factor: 120,          // unitless
  heart_rate: { average: 150, ending: 165 }  // bpm
};
const cw = D.normalizeWorkout(c2, D.CONCEPT2_MAP, {receivedAt:1700000000000, keepRaw:false});
eq(cw.provider, 'concept2', 'C2 provider');
eq(cw.identity, 'concept2:693047', 'C2 identity uit id');
eq(cw.modality, 'row', 'C2 type rower → modality row');
eq(cw.startTime, '2026-08-16T07:30:00Z', 'C2 startTime uit date_utc');
function mval(w,k){ var m=w.metrics.find(x=>x.key===k); return m?m.value:'__none__'; }
function munit(w,k){ var m=w.metrics.find(x=>x.key===k); return m?m.unit:'__none__'; }
function mq(w,k){ var m=w.metrics.find(x=>x.key===k); return m?m.quality:'__none__'; }
eq(mval(cw,'distance_m'), 5000, 'C2 distance 5000m');
eq(munit(cw,'distance_m'), 'm', 'C2 distance unit m');
close(mval(cw,'duration_s'), 1200, 'C2 time 12000 tienden → 1200s (20:00)');
eq(munit(cw,'duration_s'), 's', 'C2 duration canoniek s');
eq(mval(cw,'stroke_rate_spm'), 28, 'C2 stroke_rate 28 spm');
eq(mval(cw,'calories_kcal'), 250, 'C2 calories 250 kcal');
eq(mval(cw,'drag_factor'), 120, 'C2 drag_factor 120');
eq(mval(cw,'heart_rate_bpm'), 150, 'C2 heart_rate.average 150 bpm (nested path)');
// pace is AFGELEID, geen bron-veld
close(D.derivePace500(5000, 1200), 120, 'afgeleide pace 500m: 1200s/5000m*500 = 120s (2:00/500m)');

// ── CONCEPT2 — modaliteiten ski/bike ──
eq(D.normalizeWorkout({id:1,type:'skierg',distance:1000,time:2400}, D.CONCEPT2_MAP, {}).modality, 'ski', 'skierg → ski');
eq(D.normalizeWorkout({id:2,type:'bikeerg',distance:1000,time:2400}, D.CONCEPT2_MAP, {}).modality, 'bike', 'bikeerg → bike');

// ── CONCEPT2 — ontbrekende/ongeldige data → null/quality, geen fabricage ──
const c2miss = { id: 5, type:'rower', distance: 2000, time: 6000 }; // geen HR, geen drag, geen calories
const cwm = D.normalizeWorkout(c2miss, D.CONCEPT2_MAP, {});
eq(mval(cwm,'heart_rate_bpm'), null, 'ontbrekende HR → value null');
eq(mq(cwm,'heart_rate_bpm'), 'empty', 'ontbrekende HR → quality empty (niet verzonnen)');
eq(mval(cwm,'drag_factor'), null, 'ontbrekende drag → null');
// onwaarschijnlijke HR wordt gemarkeerd maar niet gedropt
const cwHi = D.normalizeWorkout({id:6,type:'rower',distance:1000,time:2400,heart_rate:{average:300}}, D.CONCEPT2_MAP, {});
eq(mq(cwHi,'heart_rate_bpm'), 'implausible', 'HR 300 → implausible (boven 240)');
eq(mval(cwHi,'heart_rate_bpm'), 300, 'implausibele HR behoudt echte waarde');

// ── IDEMPOTENCY end-to-end: zelfde payload 2× → identieke identity + metriek ──
const a1 = D.normalizeWorkout(c2, D.CONCEPT2_MAP, {receivedAt:1700000000000});
const a2 = D.normalizeWorkout(c2, D.CONCEPT2_MAP, {receivedAt:1700000000000});
eq(a1.identity, a2.identity, 'idempotent: zelfde identity bij herhaalde import');
eq(JSON.stringify(a1.metrics), JSON.stringify(a2.metrics), 'idempotent: identieke metriek-output (deterministisch)');
// metric-namen uniek binnen een workout (dedupe-guard)
const keys = cw.metrics.map(m=>m.key);
eq(new Set(keys).size, keys.length, 'geen dubbele metric-keys binnen een workout');

// ── PURITY: raw payload niet gemuteerd ──
eq(c2.distance, 5000, 'bron-payload ongewijzigd na normalisatie (geen mutatie)');
eq(c2.time, 12000, 'bron-payload time ongewijzigd');

// ── DEVICE-1: Concept2 strokes-serie normalisatie (representatieve payload) ──
const strokes = [
  { t: 100, d: 250, p: 1200, spm: 20, hr: 120 },   // 10.0s, 25.0m, pace 120.0s/500m, 20spm, 120bpm
  { t: 200, d: 520, p: 1150, spm: 22, hr: 130 }
];
const ns = D.normalizeSeries(strokes, D.CONCEPT2_STROKE_MAP, {externalId:693047});
eq(ns.length, 2, 'strokes: 2 samples');
close(ns[0].metrics.time_s.value, 10, 'stroke0 t 100 tienden → 10s');
close(ns[0].metrics.distance_m.value, 25, 'stroke0 d 250 dm → 25m');
close(ns[0].metrics.pace_s_500m.value, 120, 'stroke0 p 1200 tienden → 120 s/500m');
eq(ns[0].metrics.stroke_rate_spm.value, 20, 'stroke0 spm 20');
eq(ns[0].metrics.heart_rate_bpm.value, 120, 'stroke0 hr 120 bpm');
eq(ns[0].metrics.time_s.identity, 'concept2:693047#time_s:0', 'stroke sample identity per index');
eq(ns[1].metrics.time_s.identity, 'concept2:693047#time_s:1', 'stroke sample identity index 1');
eq(D.normalizeSeries(null, D.CONCEPT2_STROKE_MAP, {}).length, 0, 'geen array → lege serie');

// ── DEVICE-1: Concept2 adapter voldoet aan Device-0 contract ──
const adNoTransport = D.makeConcept2Adapter();
eq(D.isAdapter(adNoTransport).ok, true, 'Concept2-adapter implementeert het volledige contract');
eq(adNoTransport.capabilities().provider, 'concept2', 'capabilities() geeft provider');
eq(adNoTransport.capabilities().liveViaApi, 'NOT_AVAILABLE', 'capabilities: live via API niet beschikbaar (eerlijk)');
eq(adNoTransport.capabilities().bleUuids, 'UNKNOWN', 'capabilities: BLE-UUIDs UNKNOWN (niet als YES gepresenteerd)');
eq(adNoTransport.connect().ok, false, 'zonder transport: connect niet ok');
// PURE transform werkt zónder transport (geen netwerk nodig)
const adCw = adNoTransport.normalize(c2, {receivedAt:1700000000000});
eq(adCw.identity, 'concept2:693047', 'adapter.normalize → canoniek (puur, geen netwerk)');
eq(adNoTransport.normalizeStrokes(strokes, {externalId:1}).length, 2, 'adapter.normalizeStrokes puur');
eq(adNoTransport.getProvenance('distance_m',{externalId:5}).provider, 'concept2', 'adapter.getProvenance');
// netwerkmethode zonder transport → duidelijke fout, GEEN fake data
let threw = false; try { adNoTransport.fetchWorkouts({}); } catch(e){ threw = /transport vereist/.test(e.message); }
ok(threw, 'netwerkmethode zonder transport gooit duidelijke fout (geen fake integratie)');
// mét ingespoten transport → gebruikt de injectie (geen echte call in test)
const fakeTransport = { listResults:(p)=>({called:'list',p:p}), getResult:(id)=>({called:'get',id:id}),
  getStrokes:(id)=>[{t:10,d:10,p:1000,spm:20,hr:100}], getAccessToken:(c)=>({token:'X',code:c}) };
const adT = D.makeConcept2Adapter(fakeTransport);
eq(adT.connect().ok, true, 'met transport: connect ok');
eq(adT.fetchWorkouts({from:'x'}).called, 'list', 'adapter delegeert naar ingespoten transport (DI)');
eq(adT.authenticate('AUTHCODE').token, 'X', 'adapter.authenticate delegeert (geen secrets in core)');

// ── HEALTH/WEARABLE DAGMETRIEKEN (Google Health / Fitbit) → CANONIEK ──
const gh = {
  dailyHeartRateVariability: { rmssdMillis: 42 },
  dailyRestingHeartRate: { bpm: 54 },
  sleep: { totalMinutes: 430 }
};
const hd = D.normalizeHealthDaily(gh, D.GOOGLE_HEALTH_MAP, { date:'2026-08-15', receivedAt:1700000000000 });
function hmet(o,k){ var m=o.metrics.find(x=>x.key===k); return m; }
eq(hd.provider, 'google-health', 'health: provider');
eq(hd.date, '2026-08-15', 'health: datum als externalId/timestamp');
eq(hmet(hd,'hrv_ms').value, 42, 'HRV 42 ms (canoniek ms, GEEN ms→s-conversie)');
eq(hmet(hd,'hrv_ms').unit, 'ms', 'HRV unit ms');
eq(hmet(hd,'hrv_ms').sourceMetric, 'rmssd', 'HRV expliciet als RMSSD getagd (nooit samenvoegen met SDNN)');
eq(hmet(hd,'resting_hr_bpm').value, 54, 'RHR 54 bpm');
eq(hmet(hd,'sleep_minutes').value, 430, 'slaap 430 min');
eq(hmet(hd,'hrv_ms').provenance.provider, 'google-health', 'health: metric-provenance provider');
eq(hmet(hd,'hrv_ms').provenance.method, 'api', 'health: method api');
// ontbrekend → null, geen fabricatie
const hd2 = D.normalizeHealthDaily({ dailyRestingHeartRate:{ bpm:60 } }, D.GOOGLE_HEALTH_MAP, { date:'2026-08-15' });
eq(hmet(hd2,'hrv_ms').value, null, 'ontbrekende HRV → null (geen fabricatie)');
eq(hmet(hd2,'hrv_ms').quality, 'empty', 'ontbrekende HRV → quality empty');
eq(hmet(hd2,'resting_hr_bpm').value, 60, 'aanwezige RHR blijft');
// onwaarschijnlijk → implausible, waarde behouden
const hd3 = D.normalizeHealthDaily({ dailyHeartRateVariability:{ rmssdMillis:999 } }, D.GOOGLE_HEALTH_MAP, {});
eq(hmet(hd3,'hrv_ms').quality, 'implausible', 'HRV 999 → implausible (boven 400)');
eq(hmet(hd3,'hrv_ms').value, 999, 'implausibele HRV behoudt echte waarde');
// bron niet gemuteerd
eq(gh.dailyHeartRateVariability.rmssdMillis, 42, 'bron-payload ongewijzigd (geen mutatie)');

// ── CONCEPT2 WATTS-AFGELEIDE (officiële formule watts = 2.80 / (s/m)³) ──
close(D.deriveWatts(2000, 500), 179.2, 'watts uit 2000m/500s (Concept2-formule)', 0.1);
close(D.deriveWatts(500, 90), 480.109739, 'watts uit 500m/90s', 0.01);
eq(D.deriveWatts(0, 100), null, 'watts: afstand 0 → null (geen fabricatie)');
eq(D.deriveWatts(1000, 0), null, 'watts: duur 0 → null');
eq(D.deriveWatts('x', 100), null, 'watts: niet-numeriek → null');
close(D.derivePace500(2000, 500), 125, 'pace 2000m/500s = 125 s/500m', 1e-9);

// ── GENERIEKE CONNECTIE-/SYNC-STATUS (Fitbit én Concept2) ──
const NOW = Date.parse('2026-08-17T20:00:00Z');
eq(D.deviceConnectionState({connected:false}, {now:NOW}).status, 'not_connected', 'niet verbonden → not_connected');
eq(D.deviceConnectionState({connected:true, tokenExpired:true}, {now:NOW}).status, 'token_expired', 'token verlopen → token_expired');
eq(D.deviceConnectionState({connected:true, syncing:true}, {now:NOW}).status, 'syncing', 'sync bezig → syncing');
eq(D.deviceConnectionState({connected:true, lastSyncStatus:'running'}, {now:NOW}).status, 'syncing', 'lastSyncStatus running → syncing');
eq(D.deviceConnectionState({connected:true, lastSyncStatus:'error'}, {now:NOW}).status, 'sync_failed', 'sync-fout → sync_failed');
eq(D.deviceConnectionState({connected:true, lastSyncStatus:'ok', lastSyncAt:'2026-08-17T19:40:00Z'}, {now:NOW}).status, 'connected', 'recent gesynct → connected');
const stale = D.deviceConnectionState({connected:true, lastSyncStatus:'ok', lastSyncAt:'2026-08-16T10:00:00Z'}, {now:NOW});
eq(stale.status, 'stale', 'sync >26u geleden → stale');
eq(stale.isStale, true, 'stale-vlag gezet');
ok(stale.ageMs > 26*3600*1000, 'ageMs berekend (>26u)');
eq(D.deviceConnectionState({connected:true, lastSyncStatus:'ok'}, {now:NOW}).isStale, false, 'geen lastSyncAt → niet stale (geen aanname)');

// ── ROOT-CAUSE-AUDIT FITBIT-SYNC-INTEGRITEIT (28-08-2026) ──
// wearable-sync.js schrijft nooit de literal 'error' — alleen 'ok'|'no_new_data'|
// 'token_expired_no_refresh'|'refresh_failed'|'error:<CODE>'. Vóór deze fix viel
// 'refresh_failed' door alle voorwaarden heen naar de stale/connected-fallback, en
// omdat last_sync_at bij ELKE poging (ook mislukt) wordt bijgewerkt, maakte dat een
// al 6 dagen kapotte koppeling ononderscheidbaar van een gezonde ('connected').
eq(D.deviceConnectionState({connected:true, lastSyncStatus:'refresh_failed', lastSyncAt:NOW}, {now:NOW}).status, 'sync_failed', 'refresh_failed (echte serverwaarde) → sync_failed, ook met verse lastSyncAt');
eq(D.deviceConnectionState({connected:true, lastSyncStatus:'error:NETWORK_ERROR', lastSyncAt:NOW}, {now:NOW}).status, 'sync_failed', 'error:<CODE> → sync_failed');
eq(D.deviceConnectionState({connected:true, lastSyncStatus:'error:FITBIT_API_ERROR', lastSyncAt:NOW}, {now:NOW}).status, 'sync_failed', 'elke error:-prefix → sync_failed');
eq(D.deviceConnectionState({connected:true, lastSyncStatus:'token_expired_no_refresh', lastSyncAt:NOW}, {now:NOW}).status, 'token_expired', 'token_expired_no_refresh zonder externe tokenExpired-flag → token_expired (was eerder alleen via call-site tokenExpired-berekening)');
eq(D.deviceConnectionState({connected:true, lastSyncStatus:'no_new_data', lastSyncAt:NOW}, {now:NOW}).status, 'connected', 'no_new_data is GEEN storing (OAuth ok, gewoon niets nieuws) → connected blijft correct');
eq(D.deviceConnectionState({connected:true, lastSyncStatus:'ok', lastSyncAt:NOW}, {now:NOW}).status, 'connected', 'echte succesvolle sync blijft connected (geen regressie)');

// observation(): staleAfterDays-override voor dagelijkse metrics (default blijft 7 —
// FRESHNESS_RECENT_DAYS-test hieronder moet ongewijzigd blijven, zie fObservation.test.js).
{
  const serie=[{date:'2026-08-22', value:9.22, source:'fitbit'}];
  const generiek=D.observation(serie, {today:'2026-08-28'});
  eq(generiek.freshness, 'recent', 'zonder staleAfterDays: 6 dagen oud blijft "recent" op de generieke 7-dagen-grens (geen ongevraagde gedragswijziging)');
  const dagelijks=D.observation(serie, {today:'2026-08-28', staleAfterDays:2});
  eq(dagelijks.freshness, 'stale', 'met staleAfterDays:2 (HRV/RHR/slaap): 6 dagen oud → stale');
  const vandaag=D.observation([{date:'2026-08-28', value:5.87, source:'fitbit'}], {today:'2026-08-28', staleAfterDays:2});
  eq(vandaag.freshness, 'today', 'vandaag geschreven data blijft "today" met de striktere grens');
  const gisteren=D.observation([{date:'2026-08-27', value:6.5, source:'fitbit'}], {today:'2026-08-28', staleAfterDays:2});
  eq(gisteren.freshness, 'yesterday', 'gisteren blijft "yesterday", niet stale (grensgeval leeftijd=1)');
}
ok(D.DEVICE_STATUSES.indexOf('token_expired')!==-1 && D.DEVICE_STATUSES.length===6, 'DEVICE_STATUSES manifest compleet (6)');

// ── FITBIT METRIC-STATUS MANIFEST (eerlijk; geen fabricage) ──
eq(D.FITBIT_METRIC_STATUS.hrv_ms.status, 'SUPPORTED', 'HRV = SUPPORTED');
eq(D.FITBIT_METRIC_STATUS.resting_hr_bpm.status, 'SUPPORTED', 'RHR = SUPPORTED');
eq(D.FITBIT_METRIC_STATUS.sleep_minutes.status, 'SUPPORTED', 'slaap = SUPPORTED');
eq(D.FITBIT_METRIC_STATUS.weight_kg.status, 'EXTERNAL', 'gewicht = EXTERNAL (aparte scope/bron)');
eq(D.FITBIT_METRIC_STATUS.heart_rate_bpm.status, 'NOT_AVAILABLE', 'intraday HR = NOT_AVAILABLE via dag-rollup');
ok(['SUPPORTED','OPTIONAL','EXTERNAL','NOT_AVAILABLE'].indexOf(D.FITBIT_METRIC_STATUS.steps.status)!==-1, 'steps heeft geldige statuswaarde');

// ── CONCEPT2 IMPORT → ROWING ACTUAL (mapping + idempotency + watts measured/derived) ──
// Realistische Logbook-result payload (officiële velden/units: distance=m, time=tienden s).
const c2raw = { id: 88123456, date_utc: '2026-08-16 07:12:00', type: 'rower',
  distance: 2000, time: 4800 /*tienden = 480.0s = 8:00*/, stroke_rate: 31, stroke_count: 248,
  calories_total: 96, drag_factor: 120, heart_rate: { average: 158 } };
const c2w = D.normalizeWorkout(c2raw, D.CONCEPT2_MAP, { receivedAt: Date.parse('2026-08-16T07:20:00Z') });
eq(c2w.modality, 'row', 'Concept2 type rower → modality row');
eq(D.metricVal(c2w, 'distance_m'), 2000, 'canoniek distance 2000m');
close(D.metricVal(c2w, 'duration_s'), 480, 'canoniek duration 480s (uit tienden)', 1e-6);
// mapping → rowing actual
const map = D.concept2ToRowingActual(c2w, { training_type: 'A' });
eq(map.row.exercise_id, 'roeien', 'row → exercise_id roeien');
eq(map.row.distance, 2000, 'row distance 2000');
eq(map.row.time_str, '8:00', 'row time_str 8:00 (uit 480s)');
eq(map.row.stroke_rate, 31, 'row stroke_rate 31 spm');
eq(map.row.rpe, null, 'ACTUAL-only: rpe null (nooit prescription overschrijven)');
eq(map.row.date, '2026-08-16', 'date uit workout.startTime');
eq(map.row.training_type, 'A', 'training_type doorgegeven');
ok(/split:2:00\/500m/.test(map.row.note), 'note bevat split 2:00/500m (500m basis voor row)');
ok(/drag 120/.test(map.row.note), 'note bevat drag 120');
ok(/\[c2:88123456\]/.test(map.row.note), 'note bevat externe identiteit [c2:88123456]');
// watts AFGELEID (geen watts-veld in result) → provenance concept2_derived, ~179.2W
eq(map.provenance.watts_source, 'concept2_derived', 'watts afgeleid → provenance concept2_derived');
close(map.row.watt, 202.5, 'afgeleide watt ~202.5 (2000m/480s→pace 0.24 s/m)', 1);
// watts GEMETEN wint van afgeleid
const c2wMeasured = { modality:'row', externalId:'X1', startTime:'2026-08-16',
  metrics:[{key:'distance_m',value:2000},{key:'duration_s',value:480},{key:'watts_w',value:203}] };
const mapM = D.concept2ToRowingActual(c2wMeasured, {});
eq(mapM.provenance.watts_source, 'concept2_measured', 'gemeten watts → provenance concept2_measured');
eq(mapM.row.watt, 203, 'gemeten watt 203 gebruikt (niet afgeleid)');
// BikeErg → pace-basis 1000m
const bikeRaw = { id:'B9', date_utc:'2026-08-16', type:'bikeerg', distance:4000, time:6000 /*600s*/, stroke_rate:90 };
const bikeW = D.normalizeWorkout(bikeRaw, D.CONCEPT2_MAP, {});
const bikeMap = D.concept2ToRowingActual(bikeW, {});
eq(bikeMap.row.exercise_id, 'bikeerg', 'bikeerg → exercise_id bikeerg');
ok(/\/1000m/.test(bikeMap.row.note), 'bike split-basis 1000m (niet 500m)');
// IDEMPOTENCY: zelfde workout 2x → exact één insert
const existing = [ { note: 'eerdere import [c2:88123456]' } ];
eq(D.concept2AlreadyImported('88123456', existing), true, 'reeds geïmporteerd gedetecteerd via note-tag');
const batch1 = D.importConcept2Workouts([c2w], existing, {});
eq(batch1.toInsert.length, 0, 'idempotent: al bestaande workout niet opnieuw ingevoegd');
eq(batch1.skipped.length, 1, 'overgeslagen gerapporteerd');
const batch2 = D.importConcept2Workouts([c2w, c2w], [], {}); // zelfde 2x in één batch
eq(batch2.toInsert.length, 1, 'idempotent binnen batch: 2× dezelfde → 1 insert');
eq(batch2.skipped.length, 1, 'batch-duplicaat overgeslagen');
ok(batch2.derivedWatts.indexOf('88123456')!==-1, 'derivedWatts-rapport bevat afgeleide-watt workout');
// prescription-scheiding: mapping raakt nooit training_exercises/target-velden
ok(!('sets' in map.row) && !('reps' in map.row) && !('suggestedWeight' in map.row), 'mapping bevat geen prescription/target-velden');
// tijdformattering met tienden
eq(D.formatDurationStr(452.3), '7:32.3', 'formatDurationStr 452.3s → 7:32.3 (tienden)');
eq(D.formatDurationStr(480), '8:00', 'formatDurationStr 480s → 8:00');

// ── GENERIEKE PROVIDER-SYNC BOUNDARY (canoniek contract + error-model) ──
const sOk = D.parseSyncResponse({ provider:'concept2', status:'success', syncedAt:'2026-08-17T20:00:00Z', imported:2, skipped:1, data:[{externalId:'a'}] });
eq(sOk.status, 'success', 'sync: success behouden');
eq(sOk.imported, 2, 'sync: imported geteld');
eq(sOk.skipped, 1, 'sync: skipped geteld');
eq(sOk.data.length, 1, 'sync: data-array doorgegeven');
eq(D.parseSyncResponse({}).status, 'invalid_response', 'sync: ontbrekende status → invalid_response (fail-closed)');
eq(D.parseSyncResponse({error:'boom'}).status, 'sync_failed', 'sync: error-veld → sync_failed');
eq(D.parseSyncResponse({error:'boom'}).errors.length, 1, 'sync: error → errors-lijst');
eq(D.parseSyncResponse({status:'no_new_data'}).status, 'no_new_data', 'sync: no_new_data behouden');
eq(D.parseSyncResponse({status:'bananas'}).status, 'invalid_response', 'sync: onbekende status → invalid_response (geen fake success)');
eq(D.parseSyncResponse({imported:'x'}).imported, 0, 'sync: niet-numeriek imported → 0');
eq(D.isSyncOk('success'), true, 'isSyncOk success');
eq(D.isSyncOk('no_new_data'), true, 'isSyncOk no_new_data');
eq(D.isSyncOk('sync_failed'), false, 'isSyncOk sync_failed → false');
// status → connectiestatus (één canonieke UI-state)
eq(D.deviceConnectionState(D.syncStatusToConnectionInput({status:'success',syncedAt:'2026-08-17T19:55:00Z'}),{now:NOW}).status, 'connected', 'success → connected');
eq(D.deviceConnectionState(D.syncStatusToConnectionInput({status:'token_expired'}),{now:NOW}).status, 'token_expired', 'token_expired → token_expired');
eq(D.deviceConnectionState(D.syncStatusToConnectionInput({status:'authorization_required'}),{now:NOW}).status, 'token_expired', 'authorization_required → opnieuw koppelen (token_expired)');
eq(D.deviceConnectionState(D.syncStatusToConnectionInput({status:'not_connected'}),{now:NOW}).status, 'not_connected', 'not_connected → not_connected');
eq(D.deviceConnectionState(D.syncStatusToConnectionInput({status:'provider_unavailable'}),{now:NOW}).status, 'sync_failed', 'provider_unavailable → sync_failed');
eq(D.deviceConnectionState(D.syncStatusToConnectionInput({status:'rate_limited'}),{now:NOW}).status, 'sync_failed', 'rate_limited → sync_failed');
ok(D.PROVIDER_SYNC_STATUSES.length===9 && D.PROVIDER_SYNC_STATUSES.indexOf('no_new_data')!==-1, 'PROVIDER_SYNC_STATUSES compleet (9)');
// integratie: server-canonieke workouts uit sync-response → idempotente rowing-import
const syncResp = D.parseSyncResponse({ provider:'concept2', status:'success', syncedAt:'2026-08-17T20:00:00Z',
  data:[ D.normalizeWorkout({id:'R1',date_utc:'2026-08-16',type:'rower',distance:1000,time:2400,stroke_rate:28}, D.CONCEPT2_MAP, {}) ] });
const imp1 = D.importConcept2Workouts(syncResp.data, [], {});
eq(imp1.toInsert.length, 1, 'sync→import: eerste import voegt 1 sessie toe');
const impRetry = D.importConcept2Workouts(syncResp.data, imp1.toInsert, {}); // retry na opslag
eq(impRetry.toInsert.length, 0, 'sync→import: retry na opslag → 0 dubbele (idempotent over retries)');

// ── BODY-METRIC SELECTIE + PROVENANCE (nieuwste echte meting per metric; manual vs wearable) ──
// T-1: nieuwste dag wint per metric
const rowsA = [
  { date:'2026-08-17', hrv:42, rhr:54, sleep:450, note:'[src:fitbit]' },
  { date:'2026-08-16', hrv:29, rhr:58, sleep:432, note:'ochtend' }
];
const bmA = D.bodyMetricsFromLog(rowsA);
eq(bmA.hrv.value, 42, 'T-1: nieuwste HRV 42 (17-08)');
eq(bmA.hrv.date, '2026-08-17', 'T-1: HRV-datum 17-08 (niet vandaag geforceerd)');
eq(bmA.hrv.source, 'Fitbit', 'T-1: [src:fitbit] → bron Fitbit');
// T-2: alleen 16-08 aanwezig → 16-08 (nooit auto-vandaag)
const bmB = D.bodyMetricsFromLog([{date:'2026-08-16', hrv:29, rhr:58, sleep:432, note:'check-in'}]);
eq(bmB.hrv.date, '2026-08-16', 'T-2: enige data 16-08 → toont 16-08');
eq(bmB.hrv.source, 'Check-in', 'T-2: geen src-tag → handmatige check-in');
// T-3: 0 rijen → null (geen fabricage)
const bmEmpty = D.bodyMetricsFromLog([]);
eq(bmEmpty.hrv.value, null, 'T-3: geen data → null');
eq(bmEmpty.hrv.source, null, 'T-3: geen data → geen bron');
// T-4/5/6: per-metric newest-valid — nieuwste rij mist een metric, oudere heeft 'm
const rowsPartial = [
  { date:'2026-08-17', hrv:42, rhr:null, sleep:null, note:'[src:fitbit]' }, // alleen HRV vandaag
  { date:'2026-08-16', hrv:29, rhr:58,   sleep:432,  note:'check-in' }
];
const bmP = D.bodyMetricsFromLog(rowsPartial);
eq(bmP.hrv.value, 42, 'T-4: HRV nieuwste = 42 (17-08, Fitbit)');
eq(bmP.rhr.value, 58, 'T-5: RHR valt terug op nieuwste échte waarde 58 (16-08)');
eq(bmP.rhr.date, '2026-08-16', 'T-5: RHR-datum eigen datum 16-08 (niet die van HRV)');
eq(bmP.rhr.source, 'Check-in', 'T-5: RHR-bron handmatig (eigen rij)');
eq(bmP.sleep.value, 432, 'T-6: slaap valt terug op 16-08 waarde');
// T-7: ongeldige/lege waarden overgeslagen
const bmInv = D.bodyMetricsFromLog([{date:'2026-08-17', hrv:'', rhr:null, sleep:undefined, note:'x'},{date:'2026-08-15', hrv:40, rhr:52, sleep:400, note:'[src:fitbit]'}]);
eq(bmInv.hrv.value, 40, 'T-7: lege HRV overgeslagen → nieuwste echte 40');
eq(bmInv.hrv.date, '2026-08-15', 'T-7: HRV-datum 15-08 (echte meting)');
// T-8/manual-vs-wearable: verschillende bronnen per metric
const rowsMix = [
  { date:'2026-08-17', hrv:42, rhr:null, sleep:null, note:'[src:fitbit] nachtsync' }, // Fitbit HRV 17-08
  { date:'2026-08-16', hrv:29, rhr:58,   sleep:432,  note:'handmatig' }               // manueel 16-08
];
const bmMix = D.bodyMetricsFromLog(rowsMix);
eq(bmMix.hrv.source, 'Fitbit', 'manual/wearable: HRV = Fitbit (17-08)');
eq(bmMix.rhr.source, 'Check-in', 'manual/wearable: RHR = handmatige check-in (16-08)');
ok(bmMix.hrv.date==='2026-08-17' && bmMix.rhr.date==='2026-08-16', 'manual/wearable: elke metric behoudt eigen datum+bron (geen vermenging)');
// T-9: ongesorteerde input → defensief nieuwste gekozen
const bmUnsorted = D.bodyMetricsFromLog([{date:'2026-08-15',hrv:30,note:'x'},{date:'2026-08-18',hrv:45,note:'[src:fitbit]'},{date:'2026-08-16',hrv:33,note:'y'}]);
eq(bmUnsorted.hrv.value, 45, 'T-9: ongesorteerd → nieuwste (18-08) gekozen');
// pickLatestMetric non-array → veilig
eq(D.pickLatestMetric(null,'hrv').value, null, 'pickLatestMetric(null) → veilig null');

// ── ERG DEVICE-CORRECTE CONCEPT2-ROUTING (RowErg≠SkiErg≠BikeErg; nooit bike/ski → rowing) ──
const c2Row = D.concept2ToRowingActual({ modality:'row', externalId:'R', startTime:'2026-08-16', metrics:[{key:'distance_m',value:2000},{key:'duration_s',value:480}] }, {});
eq(c2Row.row.exercise_id, 'roeien', 'K: Concept2 RowErg → exercise_id roeien (RowErg = canonieke id roeien)');
const c2Ski = D.concept2ToRowingActual({ modality:'ski', externalId:'S', startTime:'2026-08-16', metrics:[{key:'distance_m',value:1000},{key:'duration_s',value:240}] }, {});
eq(c2Ski.row.exercise_id, 'skierg', 'M: Concept2 SkiErg → exercise_id skierg (NIET roeien)');
ok(c2Ski.row.exercise_id !== 'roeien', 'G: SkiErg wordt NIET als rowing/roeien gerouteerd');
const c2Bike = D.concept2ToRowingActual({ modality:'bike', externalId:'B', startTime:'2026-08-16', metrics:[{key:'distance_m',value:4000},{key:'duration_s',value:600}] }, {});
eq(c2Bike.row.exercise_id, 'bikeerg', 'L: Concept2 BikeErg → exercise_id bikeerg (NIET roeien)');
ok(c2Bike.row.exercise_id !== 'roeien', 'F: BikeErg wordt NIET als rowing/roeien gerouteerd');
ok(/\/1000m/.test(c2Bike.row.note), 'BikeErg pace-basis 1000m (device-correct, niet 500m)');
ok(/\/500m/.test(c2Ski.row.note), 'SkiErg pace-basis 500m');

// ── HEALTH-HISTORY TRANSFORMS (grafiek-data: gaps≠0, bron, trend, periode, TZ) ──
const histRows = [
  { date:'2026-08-17', hrv:32, rhr:56, sleep:450, note:'[src:google_health]' },
  { date:'2026-08-16', hrv:29, rhr:58, sleep:432, note:'ochtend' },              // check-in
  { date:'2026-08-14', hrv:34, rhr:54, sleep:470, note:'[src:google_health]' }   // 15-08 ontbreekt
];
// periode/dateRange
eq(D.dateRange('2026-08-17', 7).length, 7, 'history: 7-dagen range lengte 7');
eq(D.dateRange('2026-08-17', 30).length, 30, 'history: 30-dagen range');
eq(D.dateRange('2026-08-17', 14)[13], '2026-08-17', 'history: laatste dag = einddatum');
eq(D.dateRange('2026-08-17', 14)[0], '2026-08-04', 'history: 14-dagen startdatum (TZ-veilig, geen shift)');
// serie: 7 dagen HRV
const hs = D.healthSeries(histRows, 'hrv', '2026-08-17', 7);
eq(hs.length, 7, 'history: HRV-serie 7 punten');
eq(hs[6].value, 32, 'history: 17-08 HRV 32');
eq(hs[6].source, 'Google Health', 'history: 17-08 bron Google Health (uit tag)');
eq(hs[5].source, 'Check-in', 'history: 16-08 bron Check-in (geen tag)');
const d15 = hs.filter(s=>s.date==='2026-08-15')[0];
eq(d15.value, null, 'history: ontbrekende 15-08 → null (GAP, NOOIT 0)');
eq(d15.source, null, 'history: ontbrekende dag → geen bron');
// same-day bronprioriteit: wearable wint van check-in
const conflict = D.healthSeries([
  { date:'2026-08-17', hrv:20, rhr:60, sleep:400, note:'check-in' },
  { date:'2026-08-17', hrv:31, rhr:55, sleep:455, note:'[src:google_health]' }
], 'hrv', '2026-08-17', 1);
eq(conflict[0].value, 31, 'history same-day: wearable-waarde wint (geen stille handmatige overschrijving van wearable)');
eq(conflict[0].source, 'Google Health', 'history same-day: bron = wearable');
// trend
eq(D.healthTrend(D.healthSeries([{date:'2026-08-17',hrv:40,note:'x'},{date:'2026-08-16',hrv:38,note:'x'},{date:'2026-08-15',hrv:30,note:'x'},{date:'2026-08-14',hrv:28,note:'x'}], 'hrv','2026-08-17',4)).symbol, '↗', 'history: stijgende HRV → ↗');
eq(D.healthTrend([{value:50},{value:50},{value:50},{value:50}]).symbol, '→', 'history: vlakke reeks → →');
eq(D.healthTrend([{value:null}]).symbol, '→', 'history: <2 punten → → (geen valse trend)');
// samenvatting (a11y)
const sum = D.healthSummary(hs);
eq(sum.count, 3, 'history summary: 3 echte punten (gaps niet meegeteld)');
eq(sum.max.value, 34, 'history summary: max 34');
eq(sum.min.value, 29, 'history summary: min 29');
eq(sum.latest.value, 32, 'history summary: meest recente 32');
eq(D.healthSummary([{value:null},{value:null}]).count, 0, 'history summary: geen data → count 0');

console.log('\nDevice-0 integratie: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
