/* fWearableIngestQuality.test.js — GAP-P2-018 R1/R2/R3: wearable-ingest keurt VOOR opslag.
 *
 * VOOR: providerwaarde -> parser -> rechtstreeks naar upsert_daily_health. Een HRV van 450 ms,
 * een rusthartslag van 150 of 30 uur slaap werd opgeslagen en pas bij lezen uitgesloten; een
 * negatieve stappenwaarde liet de hele dag-write op de databasecheck stranden. De ingest-
 * classificatie normalizeHealthDaily() bestond, maar GOOGLE_HEALTH_MAP beschreef een payloadvorm
 * die de echte parser nooit ziet, dus zij was niet aan te sluiten.
 *
 * NA: providerwaarde -> parser -> parsed-day -> DeviceCore.normalizeHealthDaily(GOOGLE_HEALTH_MAP)
 *     -> alleen 'valid' naar de RPC. Eén contractbron voor ingest en voor de keuring bij lezen.
 *
 * Deze suite voert de ECHTE keten uit: de echte parsers, de echte wearable-sync-handler (alleen
 * fetch is vervangen) en de ECHTE upsert_daily_health uit migratie_v560 op PostgreSQL (PGlite).
 * Buiten scope en hier als ongewijzigd vastgelegd: R4 (slaap-terugval op tijd in bed), R5
 * (hrv_metric_type) en R6 (bronselectie in healthSeries).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');
const ROOT = path.join(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const LIB = require('../netlify/functions/_wearableSyncLib.js');
const DC = require('./deviceIntegration.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }
function eq(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label + ' (kreeg ' + JSON.stringify(a) + ', verwacht ' + JSON.stringify(b) + ')'); }

const UID = '11111111-1111-1111-1111-111111111111';
const D1 = '2026-09-28', D2 = '2026-09-29', D3 = '2026-09-30';
const ymd = (d) => { const p = d.split('-').map(Number); return { year: p[0], month: p[1], day: p[2] }; };

/* ── Providerpayloads in de vormen die de parser werkelijk verwerkt ─────────── */
const hrvPunt = (d, v, veld) => ({ dailyHeartRateVariability: Object.assign({ date: ymd(d) }, { [veld || 'averageHeartRateVariabilityMilliseconds']: v }) });
const rhrPunt = (d, v, veld) => ({ dailyRestingHeartRate: Object.assign({ date: ymd(d) }, { [veld || 'beatsPerMinute']: v }) });
const slaapPunt = (d, summary, startUur) => ({ sleep: { interval: { startTime: d + 'T' + (startUur || '00:00:00') + 'Z', endTime: d + 'T07:30:00Z' }, summary: summary } });
const stappenPunt = (d, v, veld) => ({ civilStartTime: d + 'T00:00:00', steps: v === undefined ? undefined : { [veld || 'countSum']: v } });

/* ── Echte PostgreSQL met de echte functie ─────────────────────────────────── */
const defSrc = rd('migratie_v560.sql');
const FN_SQL = defSrc.slice(defSrc.indexOf('CREATE OR REPLACE FUNCTION public.upsert_daily_health('), defSrc.indexOf('$function$;') + '$function$;'.length);
async function maakDb() {
  const db = new PGlite();
  await db.exec(`
    create role service_role nologin bypassrls; create role authenticated nologin; create role anon nologin;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $f$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid $f$;
    create function auth.role() returns text language sql stable as $f$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' $f$;
    create table public.hrv_log (
      id uuid primary key default gen_random_uuid(), user_id uuid, date date not null, hrv numeric, rhr integer, sleep numeric,
      cyclus_fase text, edema text, note text, created_at timestamptz default now(), hrv_source text, rhr_source text, sleep_source text,
      hrv_metric_type text default 'unknown', steps integer, steps_source text,
      constraint hrv_log_user_date_unique unique (user_id, date),
      constraint hrv_log_steps_check check (steps is null or steps >= 0));`);
  await db.exec(FN_SQL);
  return db;
}
async function rpc(db, rol, sub, a) {
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(sub ? { sub: sub, role: rol } : { role: rol })]);
  try {
    const r = await db.query('select * from public.upsert_daily_health(p_user_id => $1, p_date => $2, p_hrv => $3, p_rhr => $4, p_sleep => $5, p_cyclus_fase => $6, p_edema => $7, p_note => $8, p_source => $9, p_steps => $10)',
      [a.p_user_id, a.p_date, a.p_hrv == null ? null : a.p_hrv, a.p_rhr == null ? null : a.p_rhr, a.p_sleep == null ? null : a.p_sleep, a.p_cyclus_fase == null ? null : a.p_cyclus_fase, a.p_edema == null ? null : a.p_edema, a.p_note == null ? null : a.p_note, a.p_source || 'manual', a.p_steps == null ? null : a.p_steps]);
    return { ok: true, row: r.rows[0] };
  } catch (e) { return { ok: false, msg: String(e.message) }; }
}
const rij = async (db, d) => (await db.query("select hrv::float8 hrv, hrv_source, rhr, rhr_source, sleep::float8 sleep, sleep_source, steps, steps_source, note, hrv_metric_type from public.hrv_log where user_id = $1 and date = $2", [UID, d])).rows[0] || null;
const aantal = async (db) => (await db.query('select count(*)::int n from public.hrv_log')).rows[0].n;

/* ── De echte handler; alleen fetch is vervangen ───────────────────────────── */
async function sync(db, provider, opts) {
  opts = opts || {};
  const verzoeken = [], logs = [];
  const antw = (body, okFlag, status) => ({ ok: okFlag !== false, status: status || (okFlag === false ? 400 : 200), json: async () => body, text: async () => JSON.stringify(body) });
  const oudFetch = global.fetch, oudEnv = Object.assign({}, process.env), oudLog = console.log, oudWarn = console.warn, oudErr = console.error;
  console.log = (...a) => logs.push(a.join(' ')); console.warn = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' '));
  process.env.SUPABASE_URL = 'https://sb.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  global.fetch = async (url, o) => {
    url = String(url); const method = (o && o.method) || 'GET';
    verzoeken.push({ url: url, method: method, body: o && o.body });
    if (url.indexOf('/auth/v1/user') >= 0) return antw({ id: UID });
    if (url.indexOf('/rest/v1/wearable_connections') >= 0 && method === 'GET') return antw([{ access_token_secret_id: 's1', refresh_token_secret_id: null, token_expires_at: new Date(Date.now() + 3600e3).toISOString() }]);
    if (url.indexOf('/rest/v1/rpc/get_wearable_token_secret') >= 0) return antw('tok');
    if (url.indexOf('/rest/v1/rpc/upsert_daily_health') >= 0) { const r = await rpc(db, 'service_role', null, JSON.parse(o.body)); return r.ok ? antw(r.row) : antw({ message: r.msg }, false); }
    if (url.indexOf('/rest/v1/hrv_log') >= 0 && method === 'GET') { const d = (url.match(/date=eq\.([0-9-]+)/) || [])[1]; return antw((await rij(db, d)) ? [{ id: 'x' }] : []); }
    if (url.indexOf('daily-heart-rate-variability') >= 0) return antw({ dataPoints: provider.hrv || [] });
    if (url.indexOf('daily-resting-heart-rate') >= 0) return antw({ dataPoints: provider.rhr || [] });
    if (url.indexOf('dataTypes/sleep') >= 0) return antw({ dataPoints: provider.sleep || [] });
    if (url.indexOf('dailyRollUp') >= 0) return antw({ rollupDataPoints: provider.steps || [] });
    return antw({});
  };
  let uit = null;
  const libPad = require.resolve('../netlify/functions/_wearableSyncLib.js'), hPad = require.resolve('../netlify/functions/wearable-sync.js');
  const echteKeuring = LIB.qualifyDayValues;
  try {
    if (opts.keuring) LIB.qualifyDayValues = opts.keuring;
    delete require.cache[hPad];
    uit = await require(hPad).handler({ httpMethod: 'POST', headers: { authorization: 'Bearer user-jwt' } });
  } finally {
    LIB.qualifyDayValues = echteKeuring; void libPad;
    global.fetch = oudFetch; console.log = oudLog; console.warn = oudWarn; console.error = oudErr;
    Object.keys(process.env).forEach((k) => { if (!(k in oudEnv)) delete process.env[k]; });
    Object.assign(process.env, oudEnv);
  }
  const rpcs = verzoeken.filter((v) => v.url.indexOf('/rest/v1/rpc/upsert_daily_health') >= 0).map((v) => JSON.parse(v.body));
  return { status: uit.statusCode, body: JSON.parse(uit.body), rpcs: rpcs, logs: logs.join('\n'), verzoeken: verzoeken };
}
const perDatum = (rpcs) => { const o = {}; rpcs.forEach((r) => { o[r.p_date] = r; }); return o; };

async function main() {
  const Q = LIB.qualifyDayValues;

  /* ══ A. R1 — stappencontract ═════════════════════════════════════════════ */
  {
    const P = (v, veld) => LIB.parseStepsRollupPoint(stappenPunt(D1, v, veld)).value;
    const keur = (v, veld) => Q({ steps: P(v, veld) });
    eq([P(0), keur(0).vals.steps, keur(0).status.steps], [0, 0, 'valid'], 'A1 stappen 0 (provider gaf werkelijk 0): geldig, blijft 0');
    eq([keur(12345).vals.steps, keur(12345).status.steps], [12345, 'valid'], 'A2 stappen 12345: geldig');
    eq([P('12345'), keur('12345').vals.steps, keur('12345', 'count_sum').vals.steps, keur('12345', 'count').vals.steps], [12345, 12345, 12345, 12345], 'A3 stappen "12345" (int64-als-string, drie veldnamen): bestaande coercie behouden');
    eq([P(-1), keur(-1).vals.steps, keur(-1).status.steps, keur(-1).rejected], [-1, null, 'invalid', { steps: 'invalid' }], 'A4 stappen -1: de parser leest het, de keuring wijst het af VOOR opslag');
    eq([P('veel'), P({}), keur('veel').vals.steps, keur('veel').status.steps], [null, null, null, 'empty'], 'A5 niet-numerieke stappen: null, geen opslagwaarde');
    eq([LIB.parseStepsRollupPoint(stappenPunt(D1, undefined)).value, LIB.parseStepsRollupPoint({ civilStartTime: D1 + 'T00:00:00' }).value, Q({}).vals.steps], [null, null, null], 'A6 ontbrekende stappen: null, nooit 0');
    eq([keur(250000).status.steps, keur(12.5).status.steps, keur('12.5').status.steps], ['valid', 'invalid', 'invalid'], 'A7 geen verzonnen bovengrens; een niet-geheel getal is ongeldig — door de ECHTE parser heen');
    const m = DC.GOOGLE_HEALTH_MAP.metrics.find((x) => x.key === 'steps_count');
    eq([m.unit, m.min, m.max === undefined, m.integer, DC.DQ_CONTRACT.steps], ['count', 0, true, true, { min: 0, max: null, bron: 'steps_count', integer: true }], 'A8 stappencontract: unit count, >= 0, geheel getal, geen maximum; ook beschikbaar voor de keuring bij lezen');
    const s = DC.qualifySeries([{ date: D1, value: -20 }, { date: D2, value: 0 }, { date: D3, value: 9000 }], { field: 'steps' });
    eq(s.points.map((p) => p.status + (p.reason ? ':' + p.reason : '')), ['excluded:buiten_contract', 'valid', 'valid'], 'A9 bij lezen: bestaande negatieve stappen worden nu ook uitgesloten (was valid)');
  }

  /* ══ B. R2 — keuring van de dagwaarden ═══════════════════════════════════ */
  {
    eq([Q({ hrv: 55 }).vals.hrv, Q({ hrv: 55 }).status.hrv], [55, 'valid'], 'B7 HRV 55: geldig');
    eq([Q({ hrv: 450 }).vals.hrv, Q({ hrv: 450 }).status.hrv, Q({ hrv: -5 }).status.hrv], [null, 'implausible', 'invalid'], 'B8 HRV 450 en HRV -5: afgewezen');
    eq([Q({ rhr: 60 }).vals.rhr, Q({ rhr: 60 }).status.rhr], [60, 'valid'], 'B9 rusthartslag 60: geldig');
    eq([Q({ rhr: 150 }).vals.rhr, Q({ rhr: 150 }).status.rhr, Q({ rhr: 19 }).status.rhr], [null, 'implausible', 'implausible'], 'B10 rusthartslag 150 en 19: afgewezen');
    eq([Q({ sleep: 7.5 }).vals.sleep, Q({ sleep: 7.5 }).status.sleep], [7.5, 'valid'], 'B11 slaap 7,5 uur: geldig; opgeslagen wordt de parserwaarde in uren');
    eq([Q({ sleep: 24.5 }).vals.sleep, Q({ sleep: 24.5 }).status.sleep, Q({ sleep: 24 }).status.sleep], [null, 'implausible', 'valid'], 'B12 slaap boven 24 uur: afgewezen; precies 24 uur valt binnen het contract');
    const gemengd = Q({ hrv: 450, rhr: 60, sleep: 7.5, steps: -1 });
    eq([gemengd.ok, gemengd.vals, gemengd.rejected], [true, { hrv: null, rhr: 60, sleep: 7.5, steps: null }, { hrv: 'implausible', steps: 'invalid' }], 'B13 gemengde dag: per waarde beslist; geldige waarden blijven');
    ok(LIB.contributed(Q({ hrv: 450, rhr: 150 }).vals) === false && LIB.classifyWrite(Q({ hrv: 450, rhr: 150 }).vals, false) === 'skipped', 'B14 alleen afgewezen waarden: de dag draagt niets bij en wordt overgeslagen');
    ok(JSON.stringify(Q({ hrv: 450, rhr: 150, sleep: 30, steps: -7 })).indexOf('450') < 0 && JSON.stringify(Q({ hrv: 450 }).rejected) === '{"hrv":"implausible"}', 'B15 het keuringsresultaat bevat redenen, nooit de afgewezen waarde');
  }

  /* ══ C. De echte keten: handler -> echte upsert_daily_health op PostgreSQL ═ */
  {
    const db = await maakDb();
    ok(!(await rpc(db, 'service_role', null, { p_user_id: UID, p_date: D1, p_steps: -1, p_source: 'wearable' })).ok && (await aantal(db)) === 0, 'C0 uitgangspunt: de database weigert negatieve stappen — vóór deze wijziging strandde daarop de hele dag-write');

    // geldige dag
    const g = await sync(db, { hrv: [hrvPunt(D1, 55)], rhr: [rhrPunt(D1, '60')], sleep: [slaapPunt(D1, { minutesAsleep: '450' })], steps: [stappenPunt(D1, '12345')] });
    eq([g.status, g.body.status, g.body.imported, g.body.metrics, g.body.rejected, g.body.rejectedMetrics], [200, 'success', 1, { hrv: 1, rhr: 1, sleep: 1, steps: 1 }, { hrv: 0, rhr: 0, sleep: 0, steps: 0 }, 0], 'C1 geldige dag: geschreven; responscontract ongewijzigd plus rejected-tellingen (0)');
    eq(await rij(db, D1), { hrv: 55, hrv_source: 'wearable', rhr: 60, rhr_source: 'wearable', sleep: 7.5, sleep_source: 'wearable', steps: 12345, steps_source: 'wearable', note: '[src:fitbit]', hrv_metric_type: 'unknown' }, 'C2 opgeslagen rij: waarden en bron per veld zoals voorheen');
    ok(['provider', 'status', 'imported', 'updated', 'skipped', 'daysWritten', 'synced', 'syncedAt', 'http', 'code', 'fetched', 'metrics', 'today'].every((k) => k in g.body), 'C3 alle bestaande responsvelden zijn er nog');

    // ongeldige waarden op een nieuwe dag: niets van die waarden in de database
    const o = await sync(db, { hrv: [hrvPunt(D2, 450)], rhr: [rhrPunt(D2, '150')], sleep: [slaapPunt(D2, { minutesAsleep: '1800' })], steps: [stappenPunt(D2, '-40')] });
    eq([o.rpcs.length, await rij(db, D2), o.body.status, o.body.skipped, o.body.rejected, o.body.rejectedMetrics, o.body.metrics], [0, null, 'no_new_data', 1, { hrv: 1, rhr: 1, sleep: 1, steps: 1 }, 4, { hrv: 0, rhr: 0, sleep: 0, steps: 0 }], 'C4 HRV 450, RHR 150, slaap 30 uur en stappen -40: geen RPC, geen rij, vier afgewezen waarden gemeld');
    ok(!/450|150|1800|-40/.test(JSON.stringify(o.body)) && !/"hrv":\s*450|1800|-40/.test(o.logs), 'C5 afgewezen waarden staan niet in de respons en niet in de log');

    // gemengde dag: HRV ongeldig, slaap geldig, bestaande HRV blijft
    await rpc(db, 'authenticated', UID, { p_user_id: UID, p_date: D3, p_hrv: 47, p_rhr: 58, p_source: 'manual', p_note: 'eigen notitie' });
    const m = await sync(db, { hrv: [hrvPunt(D3, 999)], sleep: [slaapPunt(D3, { minutesAsleep: '420' })], steps: [stappenPunt(D3, '-5')] });
    const mr = perDatum(m.rpcs)[D3];
    eq([m.rpcs.length, mr.p_hrv, mr.p_rhr, mr.p_sleep, mr.p_steps, mr.p_source], [1, null, null, 7, null, 'wearable'], 'C6 gemengde dag: de RPC krijgt alleen de geldige slaap; HRV en stappen zijn null');
    const r3 = await rij(db, D3);
    eq([r3.hrv, r3.hrv_source, r3.rhr, r3.rhr_source, r3.sleep, r3.sleep_source, r3.steps], [47, 'manual', 58, 'manual', 7, 'wearable', null], 'C7 de bestaande handmatige HRV en rusthartslag zijn NIET overschreven; slaap is toegevoegd; geen stappen');
    eq([m.body.updated, m.body.rejected], [1, { hrv: 1, rhr: 0, sleep: 0, steps: 1 }], 'C8 de dag telt als bijgewerkt; twee afgewezen waarden gemeld');
    // negatieve stappen blokkeren de dag niet meer
    const n = await sync(db, { hrv: [hrvPunt(D2, 52)], steps: [stappenPunt(D2, '-40')] });
    eq([n.body.imported, (await rij(db, D2)).hrv, (await rij(db, D2)).steps], [1, 52, null], 'C9 negatieve stappen + geldige HRV: de HRV wordt nu wel opgeslagen (voorheen strandde de hele dag)');
    // geldige wearablewaarde over een bestaande waarde: bestaande merge-semantiek
    const v = await sync(db, { hrv: [hrvPunt(D3, 51)], rhr: [rhrPunt(D3, '56')] });
    const r3b = await rij(db, D3);
    eq([r3b.hrv, r3b.hrv_source, r3b.rhr, r3b.rhr_source, r3b.sleep, r3b.sleep_source, v.body.updated], [51, 'wearable', 56, 'wearable', 7, 'wearable', 1], 'C10 geldige wearablewaarde werkt het veld bij en de bron volgt de waarde (merge-contract ongewijzigd)');
    // herhaling verandert niets
    const voor = JSON.stringify((await db.query('select * from public.hrv_log order by date')).rows.map((x) => Object.assign(x, { created_at: null })));
    await sync(db, { hrv: [hrvPunt(D3, 51)], rhr: [rhrPunt(D3, '56')] });
    ok(JSON.stringify((await db.query('select * from public.hrv_log order by date')).rows.map((x) => Object.assign(x, { created_at: null }))) === voor, 'C11 dezelfde sync nogmaals: database identiek (idempotent)');
    eq(await aantal(db), 3, 'C12 geen betekenisloze extra rijen: precies drie dagen');
    const TIEN = 'p_cyclus_fase,p_date,p_edema,p_hrv,p_note,p_rhr,p_sleep,p_source,p_steps,p_user_id';
    ok(g.rpcs.concat(m.rpcs, n.rpcs, v.rpcs).every((x) => Object.keys(x).filter((k) => k !== 'p_hrv_metric_type' && k !== 'p_sleep_metric_type').sort().join() === TIEN), 'C13 het RPC-contract: de tien bestaande argumenten, hooguit aangevuld met de twee optionele type-argumenten van migratie_v580; geen quality-veld');
    await db.close();
  }

  /* ══ D. R3 — de werkelijk verwerkte payloadvormen ════════════════════════ */
  {
    const hrv = (v, veld) => Q({ hrv: LIB.parseHrvPoint(hrvPunt(D1, v, veld)).value });
    eq([hrv(55).vals.hrv, hrv(38, 'rmssdMillis').vals.hrv, hrv('61.5').vals.hrv, hrv(999).status.hrv], [55, 38, 61.5, 'implausible'], 'D17 HRV: averageHeartRateVariabilityMilliseconds, rmssdMillis en een numerieke string; 999 afgewezen');
    const rhr = (v, veld) => Q({ rhr: LIB.parseRhrPoint(rhrPunt(D1, v, veld)).value });
    eq([rhr('57').vals.rhr, rhr(58.4, 'averageBeatsPerMinute').vals.rhr, rhr(60, 'restingHeartRateBpm').vals.rhr, rhr(61, 'bpm').vals.rhr, rhr('150').status.rhr], [57, 58, 60, 61, 'implausible'], 'D18 rusthartslag: alle vier de veldnamen, int64-als-string en afronding; 150 afgewezen');
    const slaap = (summary, start) => Q({ sleep: LIB.parseSleepPoint(slaapPunt(D1, summary, start)).value });
    eq([slaap({ minutesAsleep: '450' }).vals.sleep, slaap({ totalSleepMinutes: 420 }).vals.sleep, slaap({ totalSleepDurationMillis: '27000000' }).vals.sleep, slaap({ minutesAsleep: '1500' }).status.sleep], [7.5, 7, 7.5, 'implausible'], 'D19 slaap: minutesAsleep, totalSleepMinutes en totalSleepDurationMillis; 25 uur afgewezen');
    const st = (v, veld) => Q({ steps: LIB.parseStepsRollupPoint(stappenPunt(D1, v, veld)).value });
    eq([st('8123').vals.steps, st(8123, 'count_sum').vals.steps, st(8123, 'count').vals.steps], [8123, 8123, 8123], 'D20 stappen: countSum, count_sum en count');
    eq(DC.GOOGLE_HEALTH_MAP.metrics.map((x) => x.key + '<-' + x.path), ['hrv_ms<-hrv_ms', 'resting_hr_bpm<-resting_hr_bpm', 'sleep_minutes<-sleep_minutes', 'steps_count<-steps_count'], 'D20b de map beschrijft het parsed-day-object; geen fictieve ruwe paden meer');
    ok(!/rmssdMillis|dailyRestingHeartRate\.bpm|sleep\.totalMinutes/.test(JSON.stringify(DC.GOOGLE_HEALTH_MAP) + JSON.stringify(DC.FITBIT_METRIC_STATUS)), 'D20c de paden die met geen echte payload overeenkwamen zijn weg');
    const lib = rd('netlify/functions/_wearableSyncLib.js');
    ok(/dc\.normalizeHealthDaily\(parsedDay, dc\.GOOGLE_HEALTH_MAP/.test(lib), 'D20d de ingest roept normalizeHealthDaily aan met GOOGLE_HEALTH_MAP (aangesloten, niet nagebouwd)');
  }

  /* ══ E. Fail-closed ══════════════════════════════════════════════════════ */
  {
    const vals = { hrv: 55, rhr: 60, sleep: 7.5, steps: 9000 };
    const dicht = { hrv: null, rhr: null, sleep: null, steps: null };
    const gevallen = {
      'keuringslaag ontbreekt': null,
      'normalizeHealthDaily ontbreekt': { GOOGLE_HEALTH_MAP: DC.GOOGLE_HEALTH_MAP },
      'contract ontbreekt': { normalizeHealthDaily: DC.normalizeHealthDaily },
      'normalizeHealthDaily gooit': { GOOGLE_HEALTH_MAP: DC.GOOGLE_HEALTH_MAP, normalizeHealthDaily: () => { throw new Error('kapot'); } },
      'geen metrics': { GOOGLE_HEALTH_MAP: DC.GOOGLE_HEALTH_MAP, normalizeHealthDaily: () => ({}) },
      'metric ontbreekt': { GOOGLE_HEALTH_MAP: DC.GOOGLE_HEALTH_MAP, normalizeHealthDaily: (d, s, c) => { const r = DC.normalizeHealthDaily(d, s, c); r.metrics = r.metrics.slice(1); return r; } },
      'onbekende status': { GOOGLE_HEALTH_MAP: DC.GOOGLE_HEALTH_MAP, normalizeHealthDaily: (d, s, c) => { const r = DC.normalizeHealthDaily(d, s, c); r.metrics[0].quality = 'prima'; return r; } },
      'valid zonder getal': { GOOGLE_HEALTH_MAP: DC.GOOGLE_HEALTH_MAP, normalizeHealthDaily: (d, s, c) => { const r = DC.normalizeHealthDaily(d, s, c); r.metrics[1].value = null; return r; } }
    };
    for (const naam of Object.keys(gevallen)) {
      const r = Q(vals, gevallen[naam]);
      eq([r.ok, r.vals, Object.keys(r.rejected).sort()], [false, dicht, ['hrv', 'rhr', 'sleep', 'steps']], 'E21 ' + naam + ': alle vier de waarden dicht, geen ruwe waarde valt door');
    }
    const db = await maakDb();
    const kapot = await sync(db, { hrv: [hrvPunt(D1, 55)], rhr: [rhrPunt(D1, '60')] }, { keuring: () => ({ ok: false, vals: dicht, status: {}, rejected: {} }) });
    eq([kapot.status, kapot.body.status, kapot.body.code, kapot.rpcs.length, await aantal(db)], [500, 'sync_failed', 'QUALITY_UNAVAILABLE', 0, 0], 'E21b handler met falende keuringslaag: sync_failed, geen enkele RPC, niets opgeslagen');
    const gooit = await sync(db, { hrv: [hrvPunt(D1, 55)] }, { keuring: () => { throw new Error('boem'); } });
    eq([gooit.status, gooit.rpcs.length, await aantal(db)], [500, 0, 0], 'E21c handler met gooiende keuringslaag: niets opgeslagen');
    const leeg = await sync(db, { hrv: [hrvPunt(D1, 55)] }, { keuring: () => undefined });
    eq([leeg.status, leeg.rpcs.length], [500, 0], 'E21d handler met een keuring zonder uitkomst: niets opgeslagen');
    await db.close();
  }

  /* ══ F. Eén contractbron voor ingest en lezen ════════════════════════════ */
  {
    // dezelfde grenswaarden door beide lagen: ingest (qualifyDayValues) en lezen (qualifySeries)
    const lezen = (veld, v) => DC.qualifySeries([{ date: D1, value: v }], { field: veld }).points[0].status === 'valid';
    const ingest = (veld, v) => Q({ [veld]: v }).status[veld] === 'valid';
    const rooster = { hrv: [0, 0.5, 55, 400, 400.1, 9999], rhr: [19, 20, 60, 120, 121, 300], sleep: [0.5, 7.5, 24, 24.01, 30], steps: [0, 1, 9000, 250000, 12.5, 0.5, '12.5', '12345'] };
    Object.keys(rooster).forEach((veld) => {
      eq(rooster[veld].map((v) => ingest(veld, v)), rooster[veld].map((v) => lezen(veld, v)), 'F22 ' + veld + ': ingest en keuring-bij-lezen beslissen identiek over ' + JSON.stringify(rooster[veld]));
    });
    eq([ingest('hrv', -1), lezen('hrv', -1), ingest('steps', -1), lezen('steps', -1)], [false, false, false, false], 'F22b negatieve waarden: in beide lagen ongeldig');
    const g = {}; DC.GOOGLE_HEALTH_MAP.metrics.forEach((x) => { g[x.key] = x; });
    eq([DC.DQ_CONTRACT.hrv, DC.DQ_CONTRACT.rhr, DC.DQ_CONTRACT.sleep, DC.DQ_CONTRACT.steps],
      [{ min: g.hrv_ms.min, max: g.hrv_ms.max, bron: 'hrv_ms' }, { min: g.resting_hr_bpm.min, max: g.resting_hr_bpm.max, bron: 'resting_hr_bpm' }, { min: g.sleep_minutes.min / 60, max: g.sleep_minutes.max / 60, bron: 'sleep_minutes' }, { min: g.steps_count.min, max: null, bron: 'steps_count', integer: g.steps_count.integer }],
      'F22c het lees-contract is afgeleid van dezelfde lijst (GOOGLE_HEALTH_MAP), inclusief integer');
    eq([g.hrv_ms.min, g.hrv_ms.max, g.resting_hr_bpm.min, g.resting_hr_bpm.max, g.sleep_minutes.min, g.sleep_minutes.max], [0, 400, 20, 120, 0, 1440], 'F22d de bestaande grenzen zijn ongewijzigd (HRV 0-400, RHR 20-120, slaap 0-1440 min)');
    const ingestCode = rd('netlify/functions/_wearableSyncLib.js') + rd('netlify/functions/wearable-sync.js');
    const zonderCommentaar = ingestCode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    ok(!/\b(400|120|1440)\b/.test(zonderCommentaar) && !/[<>]=?\s*24\b/.test(zonderCommentaar), 'F22e de ingest-code bevat zelf geen contractgrenzen');
    ok(!/hrv_quality|rhr_quality|sleep_quality|steps_quality/.test(ingestCode + rd('core/deviceIntegration.js')), 'F22f geen quality-kolommen en geen tweede kwaliteitsmodel');
  }

  /* ══ H. Stappen: het geheel-getal-contract geldt end-to-end ══════════════ */
  {
    const P = (v, veld) => LIB.parseStepsRollupPoint(stappenPunt(D1, v, veld)).value;
    // 1. echte parser -> echte keuring
    eq([P(12.5), P('12.5'), P(12.4), P(0.6)], [12.5, 12.5, 12.4, 0.6], 'H1 de parser bewaart de providerwaarde en rondt niet af voor de keuring (12.5 blijft 12.5)');
    eq([Q({ steps: P(12.5) }).vals.steps, Q({ steps: P(12.5) }).status.steps, Q({ steps: P(12.5) }).rejected], [null, 'invalid', { steps: 'invalid' }], 'H1b parser -> keuring: 12.5 stappen wordt afgewezen');
    eq([P('12345'), Q({ steps: P('12345') }).vals.steps, P(12345.0), P(0), Q({ steps: P(0) }).vals.steps], [12345, 12345, 12345, 0, 0], 'H3/H4 "12345" blijft 12345 en is geldig; 0 is geldig en blijft 0');
    eq([P(-1), Q({ steps: P(-1) }).status.steps], [-1, 'invalid'], 'H5 -1 bereikt de keuring onveranderd en wordt daar afgewezen');
    ok(!/Math\.(round|floor|ceil|trunc)|isInteger|parseInt/.test(LIB.parseStepsRollupPoint.toString()), 'H1c de parser bevat geen afronding en geen eigen integerregel');
    // 2. echte handler -> echte RPC
    const db = await maakDb();
    const h = await sync(db, { hrv: [hrvPunt(D1, 55)], steps: [stappenPunt(D1, 12.5)] });
    const r1 = perDatum(h.rpcs)[D1];
    eq([h.rpcs.length, r1.p_hrv, r1.p_steps, h.body.rejected, h.body.imported, (await rij(db, D1)).hrv, (await rij(db, D1)).steps], [1, 55, null, { hrv: 0, rhr: 0, sleep: 0, steps: 1 }, 1, 55, null], 'H2 handler: HRV 55 + stappen 12.5 -> HRV geschreven, p_steps null, rejected.steps = 1, geen stappen in de database');
    const h3 = await sync(db, { hrv: [hrvPunt(D2, 52)], steps: [stappenPunt(D2, '12345')] });
    eq([perDatum(h3.rpcs)[D2].p_steps, (await rij(db, D2)).steps, h3.body.rejected.steps], [12345, 12345, 0], 'H3b handler: "12345" wordt als 12345 opgeslagen');
    const h4 = await sync(db, { steps: [stappenPunt(D3, 0)] });
    eq([perDatum(h4.rpcs)[D3].p_steps, (await rij(db, D3)).steps, h4.body.imported], [0, 0, 1], 'H4b handler: 0 stappen wordt als 0 opgeslagen');
    const h5 = await sync(db, { rhr: [rhrPunt('2026-09-27', '58')], sleep: [slaapPunt('2026-09-27', { minutesAsleep: '420' })], steps: [stappenPunt('2026-09-27', -1)] });
    const r5 = await rij(db, '2026-09-27');
    eq([r5.rhr, r5.sleep, r5.steps, h5.body.rejected.steps], [58, 7, null, 1], 'H5b handler: -1 stappen afgewezen; de overige geldige metrics van die dag zijn geschreven');
    ok(!/12\.5/.test(JSON.stringify(h.body)) && !/"steps":\s*12\.5|12\.5/.test(h.logs), 'H2b de afgewezen waarde staat niet in de respons of de log');
    await db.close();
    // 6-7. bij lezen
    const lees = (v) => { const p = DC.qualifySeries([{ date: D1, value: v }], { field: 'steps' }).points[0]; return p.status + (p.reason ? ':' + p.reason : ''); };
    eq([lees(12.5), lees('12.5'), lees(0.5)], ['excluded:buiten_contract', 'excluded:buiten_contract', 'excluded:buiten_contract'], 'H6 bij lezen: een niet-gehele stappenwaarde is excluded / buiten_contract (bestaande reden, geen nieuwe status)');
    eq([0, 1, 9000, 250000, '12345'].map(lees), ['valid', 'valid', 'valid', 'valid', 'valid'], 'H7 bij lezen: 0, 1, 9000, 250000 en "12345" zijn valid');
    // 8. contract
    const bron = DC.GOOGLE_HEALTH_MAP.metrics.find((x) => x.key === 'steps_count');
    eq([DC.DQ_CONTRACT.steps.integer, bron.integer, DC.DQ_CONTRACT.steps.min, bron.min, DC.DQ_CONTRACT.steps.bron], [true, true, 0, 0, 'steps_count'], 'H8 DQ_CONTRACT.steps is afgeleid van GOOGLE_HEALTH_MAP.steps_count, inclusief integer:true');
    eq([DC.DQ_CONTRACT.hrv, DC.DQ_CONTRACT.rhr, DC.DQ_CONTRACT.sleep], [{ min: 0, max: 400, bron: 'hrv_ms' }, { min: 20, max: 120, bron: 'resting_hr_bpm' }, { min: 0, max: 24, bron: 'sleep_minutes' }], 'H8b de contractobjecten van HRV, rusthartslag en slaap zijn ongewijzigd (geen integer-eigenschap)');
    eq([DC.qualifySeries([{ date: D1, value: 47.5 }], { field: 'hrv' }).points[0].status, DC.qualifySeries([{ date: D1, value: 7.25 }], { field: 'sleep' }).points[0].status], ['valid', 'valid'], 'H8c niet-gehele HRV en slaap blijven geldig: de integerregel geldt alleen waar het contract hem definieert');
    const dcSrc = rd('core/deviceIntegration.js');
    const qs = dcSrc.slice(dcSrc.indexOf('function qualifySeries('), dcSrc.indexOf('function qualifySeries(') + 2600);
    ok(/contract\.integer/.test(qs) && !/steps/.test(qs), 'H8d qualifySeries past contract.integer generiek toe, zonder eigen stappenregel');
    ok(!/steps[^\n]{0,40}(isInteger|Math\.floor)|(isInteger|Math\.floor)[^\n]{0,40}steps/.test(dcSrc + rd('netlify/functions/_wearableSyncLib.js') + rd('netlify/functions/wearable-sync.js')), 'H8e nergens een harde integerregel op metricnaam');
  }

  /* ══ G. R4, R5 en R6 zijn onaangeraakt ═══════════════════════════════════ */
  {
    const fb = LIB.parseSleepPoint({ sleep: { interval: { startTime: D1 + 'T00:00:00Z', endTime: D1 + 'T07:30:00Z' }, summary: {} } });
    eq([fb.value, Q({ sleep: fb.value }).vals.sleep], [7.5, 7.5], 'G-R4 de interval-terugval (tijd in bed) geeft dezelfde waarde als voorheen en wordt als slaap opgeslagen');
    eq(Q({ sleep: LIB.parseSleepPoint({ sleep: { interval: { startTime: '2026-09-27T00:00:00Z', endTime: '2026-09-28T07:30:00Z' }, summary: {} } }).value }).status.sleep, 'implausible', 'G-R4b een terugval boven 24 uur wordt wel tegen het contract getoetst en afgewezen');
    const ws = rd('netlify/functions/wearable-sync.js') + rd('netlify/functions/_wearableSyncLib.js');
    // R5 is sinds v4.70.14 geïmplementeerd (core/fHealthIngestProvenance.test.js): het type gaat mee als RPC-argument.
    ok(/p_hrv_metric_type: hrvType/.test(ws) && !/hrv_metric_type\s*=|\/rest\/v1\/hrv_log[^`]*`,\s*\{\s*method:\s*'(POST|PATCH)'/.test(ws), 'G-R5 het HRV-type gaat uitsluitend via upsert_daily_health; geen direct schrijfpad');
    const dcSrc = rd('core/deviceIntegration.js');
    const hs = dcSrc.slice(dcSrc.indexOf('function healthSeries('), dcSrc.indexOf('function healthSeries(') + 1600);
    // R6 is sinds v4.70.13 opgelost (core/fHealthSeriesProvenance.test.js): per-veld kolom eerst, tag als terugval.
    ok(/kolomBron \? kolomBron : _parseSrcTag\(r\.note\)/.test(hs), 'G-R6 healthSeries leest de bron primair uit de per-veld kolom (R6 gesloten)');
    ok(rd('netlify/functions/_wearableSyncLib.js').indexOf("else if (iv && iv.startTime && iv.endTime) {") > 0 && fb.basis === 'time_in_bed', 'G-R4c de terugval bestaat nog en wordt sinds v4.70.14 als time_in_bed gemeld (waarde ongewijzigd)');
  }
}

main().then(function () {
  console.log('fWearableIngestQuality: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) { console.error('fWearableIngestQuality: onverwachte fout', e); process.exit(1); });
