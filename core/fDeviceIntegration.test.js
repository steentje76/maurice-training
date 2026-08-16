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

console.log('\nDevice-0 integratie: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
