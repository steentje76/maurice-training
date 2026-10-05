/* fHealthIngestProvenance.test.js — GAP-P2-018 R4/R5: typed ingest-provenance voor slaap en HRV.
 *
 * R5. hrv_log.hrv_metric_type bestaat sinds migratie_v542 maar geen writer zet hem. De ingest weet
 *     het type (GOOGLE_HEALTH_MAP: sourceMetric 'rmssd'); het ging verloren tussen de keuring en de
 *     RPC, omdat qualifyDayValues() het niet doorgaf en upsert_daily_health er geen argument voor had.
 * R4. parseSleepPoint() valt bij een ontbrekende slaapduur terug op het interval van de slaapsessie
 *     (tijd in bed). Welke van de twee is opgeslagen lag nergens vast.
 *
 * Oplossing: migratie_v580 (kolom sleep_metric_type + twee optionele RPC-argumenten), de parser
 * meldt het pad, de keuring geeft het type door, de handler stuurt het mee. Zolang de migratie niet
 * op de database staat valt de handler terug op de bestaande tien argumenten.
 *
 * Deze suite draait de ECHTE migratie_v580 op PostgreSQL (PGlite), bovenop de toestand van productie
 * (functie uit v560, rechten uit v570/v579), en de ECHTE wearable-sync-handler ertegenaan.
 * GRENS: dit bewijst de migratie en de code, niet dat productie haar al draait.
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

const UID = '11111111-1111-1111-1111-111111111111', ANDER = '22222222-2222-2222-2222-222222222222';
const D1 = '2026-09-28', D2 = '2026-09-29', D3 = '2026-09-30', D4 = '2026-10-01';
const ymd = (d) => { const p = d.split('-').map(Number); return { year: p[0], month: p[1], day: p[2] }; };
const hrvPunt = (d, v, veld) => ({ dailyHeartRateVariability: Object.assign({ date: ymd(d) }, { [veld || 'averageHeartRateVariabilityMilliseconds']: v }) });
const rhrPunt = (d, v) => ({ dailyRestingHeartRate: { date: ymd(d), beatsPerMinute: v } });
const slaapPunt = (d, summary) => ({ sleep: { interval: { startTime: d + 'T00:00:00Z', endTime: d + 'T07:30:00Z' }, summary: summary } });
const stappenPunt = (d, v) => ({ civilStartTime: d + 'T00:00:00', steps: { countSum: v } });

const V560 = rd('migratie_v560.sql');
const FN_V560 = V560.slice(V560.indexOf('CREATE OR REPLACE FUNCTION public.upsert_daily_health('), V560.indexOf('$function$;') + '$function$;'.length);
const V580 = rd('migratie_v580.sql');
const SIG10 = '(uuid, date, numeric, integer, numeric, text, text, text, text, integer)';

/* De toestand van productie vóór v580: tabel, RLS, functie v560, rechten v570 + v579. */
async function maakDb() {
  const db = new PGlite();
  await db.exec(`
    create role service_role nologin bypassrls; create role authenticated nologin; create role anon nologin;
    grant usage on schema public to anon, authenticated, service_role;
    create schema auth; grant usage on schema auth to anon, authenticated, service_role;
    create function auth.uid() returns uuid language sql stable as $f$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid $f$;
    create function auth.role() returns text language sql stable as $f$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' $f$;
    create table public.hrv_log (
      id uuid primary key default gen_random_uuid(), date date not null, hrv numeric, rhr integer, sleep numeric, edema text, note text,
      created_at timestamptz default now(), user_id uuid, cyclus_fase text, hrv_source text, rhr_source text, sleep_source text,
      hrv_metric_type text default 'unknown', steps integer, steps_source text,
      constraint hrv_log_user_date_unique unique (user_id, date),
      constraint hrv_log_steps_check check (steps is null or steps >= 0),
      constraint hrv_log_hrv_metric_type_check check (hrv_metric_type in ('rmssd','sdnn','unknown')),
      constraint hrv_log_hrv_source_check check (hrv_source is null or hrv_source in ('manual','wearable','unknown')),
      constraint hrv_log_sleep_source_check check (sleep_source is null or sleep_source in ('manual','wearable','unknown')));
    alter table public.hrv_log enable row level security;
    create policy hrv_select_own on public.hrv_log for select to authenticated using (user_id = auth.uid());
    grant select on public.hrv_log to anon, authenticated;
    grant all on public.hrv_log to service_role;`);
  await db.exec(FN_V560);
  await db.exec(`revoke execute on function public.upsert_daily_health${SIG10} from public, anon;
                 grant execute on function public.upsert_daily_health${SIG10} to authenticated, service_role;`);
  return db;
}
async function pasV580Toe(db) { await db.exec('begin;'); try { await db.exec(V580); await db.exec('commit;'); return null; } catch (e) { await db.exec('rollback;'); return String(e.message); } }

/* PostgREST-gedrag: een aanroep met een argumentnaam die de functie niet kent -> 404 / PGRST202. */
async function rpc(db, claims, args) {
  const fn = (await db.query("select proargnames from pg_proc where pronamespace = 'public'::regnamespace and proname = 'upsert_daily_health'")).rows;
  const namen = fn.length ? fn[0].proargnames : [];
  const keys = Object.keys(args);
  if (keys.some((k) => namen.indexOf(k) < 0)) return { ok: false, status: 404, body: { code: 'PGRST202', message: 'Could not find the function public.upsert_daily_health in the schema cache' } };
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(claims)]);
  try {
    const r = await db.query('select * from public.upsert_daily_health(' + keys.map((k, i) => k + ' => $' + (i + 1)).join(', ') + ')', keys.map((k) => args[k] === undefined ? null : args[k]));
    return { ok: true, status: 200, body: r.rows[0] };
  } catch (e) { return { ok: false, status: 400, body: { code: 'P0001', message: String(e.message) } }; }
}
const KOLOMMEN = "hrv::float8 hrv, hrv_source, hrv_metric_type, rhr, rhr_source, sleep::float8 sleep, sleep_source, steps, steps_source";
const rij = async (db, d, metSlaapType) => (await db.query('select ' + KOLOMMEN + (metSlaapType === false ? '' : ', sleep_metric_type') + ' from public.hrv_log where user_id = $1 and date = $2', [UID, d])).rows[0] || null;
const aantalFuncties = async (db) => (await db.query("select count(*)::int n from pg_proc where pronamespace = 'public'::regnamespace and proname = 'upsert_daily_health'")).rows[0].n;
const signatuur = async (db) => (await db.query("select p.oid::regprocedure::text s from pg_proc p where pronamespace = 'public'::regnamespace and proname = 'upsert_daily_health'")).rows.map((r) => r.s);

/* De echte handler; alleen fetch is vervangen. */
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
    if (url.indexOf('/rest/v1/rpc/upsert_daily_health') >= 0) {
      if (opts.rpcFout) return antw(opts.rpcFout.body, false, opts.rpcFout.status);
      const r = await rpc(db, { role: 'service_role' }, JSON.parse(o.body)); return antw(r.body, r.ok, r.status);
    }
    if (url.indexOf('/rest/v1/hrv_log') >= 0 && method === 'GET') { const d = (url.match(/date=eq\.([0-9-]+)/) || [])[1]; return antw((await rij(db, d, false)) ? [{ id: 'x' }] : []); }
    if (url.indexOf('daily-heart-rate-variability') >= 0) return antw({ dataPoints: provider.hrv || [] });
    if (url.indexOf('daily-resting-heart-rate') >= 0) return antw({ dataPoints: provider.rhr || [] });
    if (url.indexOf('dataTypes/sleep') >= 0) return antw({ dataPoints: provider.sleep || [] });
    if (url.indexOf('dailyRollUp') >= 0) return antw({ rollupDataPoints: provider.steps || [] });
    return antw({});
  };
  let uit = null;
  const hPad = require.resolve('../netlify/functions/wearable-sync.js');
  try { delete require.cache[hPad]; uit = await require(hPad).handler({ httpMethod: 'POST', headers: { authorization: 'Bearer user-jwt' } }); }
  finally {
    global.fetch = oudFetch; console.log = oudLog; console.warn = oudWarn; console.error = oudErr;
    Object.keys(process.env).forEach((k) => { if (!(k in oudEnv)) delete process.env[k]; });
    Object.assign(process.env, oudEnv);
  }
  const rpcs = verzoeken.filter((v) => v.url.indexOf('/rest/v1/rpc/upsert_daily_health') >= 0).map((v) => JSON.parse(v.body));
  return { status: uit.statusCode, body: JSON.parse(uit.body), rpcs: rpcs, logs: logs.join('\n'), verzoeken: verzoeken };
}

async function main() {
  const Q = LIB.qualifyDayValues;

  /* ══ A. Parser en keuring: waar het type vandaan komt ════════════════════ */
  {
    const slaap = (summary, iv) => LIB.parseSleepPoint({ sleep: { interval: iv === undefined ? { startTime: D1 + 'T00:00:00Z', endTime: D1 + 'T07:30:00Z' } : iv, summary: summary } });
    eq([slaap({ minutesAsleep: '420' }).basis, slaap({ minutesAsleep: '420' }).value], ['asleep', 7], 'A1 R4: summary.minutesAsleep (gedocumenteerde slaapduur) -> asleep');
    eq([slaap({}).basis, slaap({}).value, slaap(undefined).basis, slaap({ minutesInSleepPeriod: '450' }).basis], ['time_in_bed', 7.5, 'time_in_bed', 'time_in_bed'], 'A2 R4: geen slaapduur -> terugval op het interval -> time_in_bed');
    eq([slaap({ totalSleepMinutes: 420 }).basis, slaap({ totalSleepDurationMillis: '25200000' }).basis, slaap({ totalDurationMillis: 25200000 }).basis], ['unknown', 'unknown', 'unknown'], 'A3 R4: overige, niet-gedocumenteerde duurvelden -> unknown (er wordt niet geraden)');
    eq([slaap({}, null).basis, slaap({}, null).value, slaap({ minutesAsleep: '0' }, null).basis], [null, null, null], 'A4 R4: geen slaapwaarde -> geen basis');
    eq([slaap({ minutesAsleep: '420' }).value, slaap({ totalSleepMinutes: 420 }).value, slaap({}).value], [7, 7, 7.5], 'A5 R4: de numerieke slaapwaarde is per pad exact zoals voorheen');
    const g = {}; DC.GOOGLE_HEALTH_MAP.metrics.forEach((x) => { g[x.key] = x; });
    eq([g.hrv_ms.sourceMetric, DC.HEALTH_METRIC_TYPES], ['rmssd', { hrv: ['rmssd', 'sdnn', 'unknown'], sleep: ['asleep', 'time_in_bed', 'unknown'] }], 'A6 R5: het HRV-type staat in de contractbron (rmssd); één vocabulaire in DeviceCore');
    eq(Q({ hrv: 55, sleep: 7.5, sleepBasis: 'time_in_bed' }).meta, { hrv_metric_type: 'rmssd', sleep_metric_type: 'time_in_bed' }, 'A7 de keuring geeft beide types door bij geaccepteerde waarden');
    eq([Q({ rhr: 60 }).meta, Q({ hrv: 450, sleep: 30, sleepBasis: 'asleep' }).meta], [{ hrv_metric_type: null, sleep_metric_type: null }, { hrv_metric_type: null, sleep_metric_type: null }], 'A8 geen HRV/slaap, of afgewezen waarden -> geen type (niets gefabriceerd)');
    eq([Q({ sleep: 7, sleepBasis: 'geraden' }).meta.sleep_metric_type, Q({ sleep: 7 }).meta.sleep_metric_type], [null, null], 'A9 een type buiten de vocabulaire of een ontbrekende basis wordt null, niet doorgegeven');
    eq(Q({ hrv: 55 }, null).meta, { hrv_metric_type: null, sleep_metric_type: null }, 'A10 fail-closed: zonder keuringslaag ook geen type');
    const v = Q({ hrv: 55, rhr: 60, sleep: 7.5, steps: 9000, sleepBasis: 'asleep' });
    eq([v.vals, v.status, v.rejected], [{ hrv: 55, rhr: 60, sleep: 7.5, steps: 9000 }, { hrv: 'valid', rhr: 'valid', sleep: 'valid', steps: 'valid' }, {}], 'A11 waarden, statussen en afwijzingen van de keuring zijn ongewijzigd (#518)');
    // dezelfde vocabulaire in database en code
    const check = (sql, kolom) => (new RegExp(kolom + "\\s+in\\s*\\(([^)]*)\\)", 'i').exec(sql) || [null, ''])[1].replace(/['\s]/g, '').toLowerCase().split(',');
    eq([check(rd('migratie_v542.sql'), 'hrv_metric_type'), check(V580, 'sleep_metric_type')], [DC.HEALTH_METRIC_TYPES.hrv, DC.HEALTH_METRIC_TYPES.sleep], 'A12 de CHECK-constraints (v542, v580) spiegelen DeviceCore.HEALTH_METRIC_TYPES');
    ok(/p_hrv_metric_type NOT IN \('rmssd','sdnn','unknown'\)/.test(V580) && /p_sleep_metric_type NOT IN \('asleep','time_in_bed','unknown'\)/.test(V580), 'A13 de RPC valideert dezelfde vocabulaire');
  }

  /* ══ B. De migratie zelf, op de toestand van productie ═══════════════════ */
  {
    const db = await maakDb();
    await rpc(db, { role: 'service_role' }, { p_user_id: UID, p_date: D1, p_hrv: 47, p_rhr: 58, p_sleep: 7.25, p_source: 'manual', p_note: 'bestaand' });
    await rpc(db, { role: 'service_role' }, { p_user_id: ANDER, p_date: D1, p_hrv: 61, p_source: 'wearable', p_steps: 8000 });
    const hash = async () => (await db.query("select md5(string_agg(md5(concat_ws('|', id, user_id, date, hrv, hrv_source, hrv_metric_type, rhr, rhr_source, sleep, sleep_source, steps, steps_source, note, cyclus_fase, edema, created_at)), ',' order by id)) h, count(*)::int n from public.hrv_log")).rows[0];
    const voor = await hash();
    const beleidVoor = (await db.query("select count(*)::int n from pg_policies where tablename = 'hrv_log'")).rows[0].n;
    eq([await aantalFuncties(db), await signatuur(db)], [1, ['upsert_daily_health(uuid,date,numeric,integer,numeric,text,text,text,text,integer)']], 'B0 uitgangspunt: één functie met tien argumenten (productie)');

    eq(await pasV580Toe(db), null, 'B1 migratie_v580 past zonder fout toe, inclusief haar sluitende controles');
    eq([await aantalFuncties(db), await signatuur(db)], [1, ['upsert_daily_health(uuid,date,numeric,integer,numeric,text,text,text,text,integer,text,text)']], 'B2 daarna precies één functie, met twaalf argumenten; de oude overload is weg');
    const f = (await db.query("select prosecdef, proconfig::text cfg, pg_get_userbyid(proowner) eig from pg_proc where proname = 'upsert_daily_health'")).rows[0];
    eq([f.prosecdef, f.cfg], [true, '{search_path=public}'], 'B3 SECURITY DEFINER met vaste search_path');
    const fx = (rol) => db.query("select has_function_privilege($1, p.oid, 'EXECUTE') x from pg_proc p where proname = 'upsert_daily_health'", [rol]).then((r) => r.rows[0].x);
    const pub = (await db.query("select exists(select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.proname = 'upsert_daily_health' and a.grantee = 0 and a.privilege_type = 'EXECUTE') x")).rows[0].x;
    eq([await fx('anon'), pub, await fx('authenticated'), await fx('service_role')], [false, false, true, true], 'B4 EXECUTE: anon nee, PUBLIC nee, authenticated ja, service_role ja');
    const tp = async (rol) => (await db.query("select has_table_privilege($1,'public.hrv_log','SELECT') s, has_table_privilege($1,'public.hrv_log','INSERT') i, has_table_privilege($1,'public.hrv_log','UPDATE') u, has_table_privilege($1,'public.hrv_log','DELETE') d", [rol])).rows[0];
    eq([await tp('anon'), await tp('authenticated'), (await db.query("select relrowsecurity r from pg_class where oid = 'public.hrv_log'::regclass")).rows[0].r, (await db.query("select count(*)::int n from pg_policies where tablename = 'hrv_log'")).rows[0].n],
      [{ s: true, i: false, u: false, d: false }, { s: true, i: false, u: false, d: false }, true, beleidVoor], 'B5 single-writer-invariant (v579), RLS en policies zijn ongewijzigd');
    eq(await hash(), voor, 'B6 bestaande rijen zijn inhoudelijk ongewijzigd (zelfde hash over alle bestaande kolommen)');
    const kol = (await db.query("select column_default d, is_nullable n from information_schema.columns where table_name = 'hrv_log' and column_name = 'sleep_metric_type'")).rows[0];
    eq([kol.d, kol.n, (await db.query("select array_agg(distinct sleep_metric_type) a, array_agg(distinct hrv_metric_type) h from public.hrv_log")).rows[0]], ["'unknown'::text", 'YES', { a: ['unknown'], h: ['unknown'] }], 'B7 nieuwe kolom: nullable, default unknown; bestaande rijen zijn unknown (geen backfill, geen gok)');
    eq(await pasV580Toe(db), null, 'B8 de migratie is herhaalbaar (tweede keer zonder fout)');
    eq([await aantalFuncties(db), await hash()], [1, voor], 'B8b en verandert dan niets');
    // bestaande aanroepvormen blijven werken
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ role: 'service_role' })]);
    const pos = (await db.query("select hrv_source, hrv_metric_type, sleep_metric_type from public.upsert_daily_health($1, $2, 50, 57, 7.5, null, null, null, 'manual', null)", [UID, D2])).rows[0];
    eq(pos, { hrv_source: 'manual', hrv_metric_type: 'unknown', sleep_metric_type: 'unknown' }, 'B9 de bestaande positionele aanroep met tien argumenten werkt; type unknown');
    eq((await rpc(db, { sub: UID, role: 'authenticated' }, { p_user_id: UID, p_date: D3, p_hrv: 49, p_source: 'manual' })).ok, true, 'B10 de bestaande aanroep van de client (argumenten op naam, zonder type) werkt');
    eq([(await rpc(db, { sub: UID, role: 'authenticated' }, { p_user_id: ANDER, p_date: D3, p_hrv: 49 })).ok, (await rpc(db, {}, { p_user_id: UID, p_date: D3, p_hrv: 49 })).ok], [false, false], 'B11 autorisatie ongewijzigd: een andere gebruiker en een aanroep zonder identiteit worden geweigerd');
    await db.exec('set role anon;');
    let anonFout = null; try { await db.query('select public.upsert_daily_health($1, $2)', [UID, D3]); } catch (e) { anonFout = String(e.message); }
    await db.exec('reset role;');
    ok(/permission denied for function upsert_daily_health/.test(anonFout || ''), 'B12 de rol anon kan de nieuwe functie niet uitvoeren (permission denied)');
    await db.close();

    // de sluitende controle breekt de migratie af als de invariant niet klopt
    const kapot = await maakDb();
    await kapot.exec('grant insert on public.hrv_log to authenticated;');
    const fout = await pasV580Toe(kapot);
    ok(/single-writer-invariant is geschonden/.test(fout || ''), 'B13 is de single-writer-invariant geschonden, dan faalt de migratie');
    eq(await signatuur(kapot), ['upsert_daily_health(uuid,date,numeric,integer,numeric,text,text,text,text,integer)'], 'B13b en wordt zij volledig teruggedraaid: de oude functie staat er nog');
    await kapot.close();
  }

  /* ══ C. Semantiek na de migratie: echte handler -> echte functie ═════════ */
  {
    const db = await maakDb(); await pasV580Toe(db);
    // Google HRV + gerapporteerde slaapduur
    const a = await sync(db, { hrv: [hrvPunt(D1, 55)], rhr: [rhrPunt(D1, '60')], sleep: [slaapPunt(D1, { minutesAsleep: '450' })], steps: [stappenPunt(D1, '9000')] });
    eq(await rij(db, D1), { hrv: 55, hrv_source: 'wearable', hrv_metric_type: 'rmssd', rhr: 60, rhr_source: 'wearable', sleep: 7.5, sleep_source: 'wearable', steps: 9000, steps_source: 'wearable', sleep_metric_type: 'asleep' }, 'C1 Google HRV -> rmssd; gerapporteerde slaapduur -> asleep; waarden en bronnen zoals voorheen');
    eq([a.body.status, a.body.provenance, a.rpcs.length], ['success', { rpc: 'typed', typed: { hrv: 1, sleep: 1 } }, 1], 'C2 respons: provenance typed, één RPC');
    // terugval op het interval
    const b = await sync(db, { sleep: [slaapPunt(D2, {})] });
    eq([(await rij(db, D2)).sleep, (await rij(db, D2)).sleep_metric_type, (await rij(db, D2)).hrv_metric_type, b.body.provenance.typed], [7.5, 'time_in_bed', 'unknown', { hrv: 0, sleep: 1 }], 'C3 terugval op het interval -> time_in_bed; zelfde numerieke slaapwaarde; geen HRV -> HRV-type blijft unknown (niets gefabriceerd)');
    // update van alleen slaap wist het HRV-type niet; update van alleen RHR wist het slaaptype niet
    await sync(db, { sleep: [slaapPunt(D1, {})] });
    eq([(await rij(db, D1)).hrv_metric_type, (await rij(db, D1)).sleep_metric_type, (await rij(db, D1)).hrv], ['rmssd', 'time_in_bed', 55], 'C4 een latere slaap-only-sync wist het HRV-type niet; het slaaptype volgt de nieuwe slaapwaarde');
    await sync(db, { rhr: [rhrPunt(D1, '59')] });
    eq([(await rij(db, D1)).rhr, (await rij(db, D1)).hrv_metric_type, (await rij(db, D1)).sleep_metric_type], [59, 'rmssd', 'time_in_bed'], 'C5 een update van alleen de rusthartslag laat beide types staan');
    // handmatige HRV: geen type verzinnen; het type hoort bij de waarde
    await rpc(db, { sub: UID, role: 'authenticated' }, { p_user_id: UID, p_date: D1, p_hrv: 48, p_source: 'manual' });
    eq([(await rij(db, D1)).hrv, (await rij(db, D1)).hrv_source, (await rij(db, D1)).hrv_metric_type, (await rij(db, D1)).sleep_metric_type], [48, 'manual', 'unknown', 'time_in_bed'], 'C6 handmatige HRV daarna: bron manual en type unknown (het rmssd-type hoorde bij de vervangen waarde); slaaptype onaangeroerd');
    await rpc(db, { sub: UID, role: 'authenticated' }, { p_user_id: UID, p_date: D4, p_hrv: 50, p_sleep: 7, p_source: 'manual' });
    eq([(await rij(db, D4)).hrv_metric_type, (await rij(db, D4)).sleep_metric_type], ['unknown', 'unknown'], 'C7 handmatige invoer zonder type blijft unknown');
    // type zonder waarde wordt genegeerd; ongeldig type wordt geweigerd
    await rpc(db, { role: 'service_role' }, { p_user_id: UID, p_date: D4, p_rhr: 57, p_source: 'wearable', p_hrv_metric_type: 'sdnn', p_sleep_metric_type: 'asleep' });
    eq([(await rij(db, D4)).hrv_metric_type, (await rij(db, D4)).sleep_metric_type, (await rij(db, D4)).rhr], ['unknown', 'unknown', 57], 'C8 een type zonder bijbehorende waarde verandert niets');
    const fout = await rpc(db, { role: 'service_role' }, { p_user_id: UID, p_date: D4, p_hrv: 51, p_hrv_metric_type: 'pnn50' });
    ok(!fout.ok && /invalid hrv metric type/.test(fout.body.message) && (await rij(db, D4)).hrv === 50, 'C9 een onbekend HRV-type wordt geweigerd; de rij blijft ongewijzigd');
    ok(!(await rpc(db, { role: 'service_role' }, { p_user_id: UID, p_date: D4, p_sleep: 7, p_sleep_metric_type: 'liggen' })).ok, 'C9b idem voor een onbekend slaaptype');
    // herhaling is idempotent
    const dump = async () => JSON.stringify((await db.query('select * from public.hrv_log order by user_id, date')).rows.map((x) => Object.assign(x, { created_at: null })));
    await sync(db, { hrv: [hrvPunt(D3, 52)], sleep: [slaapPunt(D3, { minutesAsleep: '400' })] });
    const voor = await dump();
    await sync(db, { hrv: [hrvPunt(D3, 52)], sleep: [slaapPunt(D3, { minutesAsleep: '400' })] });
    ok((await dump()) === voor, 'C10 dezelfde sync nogmaals: database identiek (idempotent)');
    // #518 blijft gelden: afgewezen HRV raakt type en waarde niet
    await sync(db, { hrv: [hrvPunt(D3, 999)], sleep: [slaapPunt(D3, { minutesAsleep: '1800' })], rhr: [rhrPunt(D3, '61')] });
    const r3 = await rij(db, D3);
    eq([r3.hrv, r3.hrv_metric_type, r3.sleep, r3.sleep_metric_type, r3.rhr], [52, 'rmssd', 6.67, 'asleep', 61], 'C11 afgewezen HRV/slaap (#518) laten waarde en type staan; de geldige rusthartslag is geschreven');
    // gemengde dag: bron en type per veld
    await rpc(db, { sub: UID, role: 'authenticated' }, { p_user_id: UID, p_date: D2, p_rhr: 62, p_source: 'manual' });
    await sync(db, { hrv: [hrvPunt(D2, 54, 'rmssdMillis')], steps: [stappenPunt(D2, '7000')] });
    eq(await rij(db, D2), { hrv: 54, hrv_source: 'wearable', hrv_metric_type: 'rmssd', rhr: 62, rhr_source: 'manual', sleep: 7.5, sleep_source: 'wearable', steps: 7000, steps_source: 'wearable', sleep_metric_type: 'time_in_bed' }, 'C12 gemengde dag: bron en type kloppen per veld (HRV wearable/rmssd, rusthartslag manual, slaap wearable/time_in_bed)');
    const reeks = (await db.query('select date::text date, hrv::float8 hrv, hrv_source, rhr, rhr_source, sleep::float8 sleep, sleep_source, note from public.hrv_log where user_id = $1', [UID])).rows;
    eq([DC.healthSeries(reeks, 'hrv', D4, 4).find((p) => p.date === D2).source, DC.healthSeries(reeks, 'rhr', D4, 4).find((p) => p.date === D2).source], ['Fitbit', 'Check-in'], 'C13 en healthSeries (R6) leest die bron per veld');
    await db.close();
  }

  /* ══ D. Vóór de migratie: de handler valt terug en schrijft de waarden ═══ */
  {
    const db = await maakDb();   // functie v560: kent de nieuwe argumenten niet
    const a = await sync(db, { hrv: [hrvPunt(D1, 55), hrvPunt(D2, 56)], sleep: [slaapPunt(D1, { minutesAsleep: '450' }), slaapPunt(D2, {})] });
    eq([a.body.status, a.body.imported, a.body.provenance], ['success', 2, { rpc: 'legacy', typed: { hrv: 0, sleep: 0 } }], 'D1 zonder migratie_v580: de sync slaagt, beide dagen geschreven, provenance legacy');
    eq([await rij(db, D1, false), await rij(db, D2, false)], [{ hrv: 55, hrv_source: 'wearable', hrv_metric_type: 'unknown', rhr: null, rhr_source: null, sleep: 7.5, sleep_source: 'wearable', steps: null, steps_source: null }, { hrv: 56, hrv_source: 'wearable', hrv_metric_type: 'unknown', rhr: null, rhr_source: null, sleep: 7.5, sleep_source: 'wearable', steps: null, steps_source: null }], 'D2 de waarden staan er precies zoals vóór deze wijziging; het type blijft unknown');
    eq(a.rpcs.map((x) => Object.keys(x).length), [12, 10, 10], 'D3 één mislukte poging met type, direct opnieuw met de tien bestaande argumenten; de volgende dag meteen zonder type');
    const b = await sync(db, { rhr: [rhrPunt(D3, '60')], steps: [stappenPunt(D3, '5000')] });
    eq([b.rpcs.map((x) => Object.keys(x).length), b.body.provenance.rpc], [[10], 'typed'], 'D4 een dag zonder HRV/slaap stuurt nooit type-argumenten mee');
    // een andere fout dan "functie onbekend" wordt NIET opnieuw geprobeerd zonder type
    const c = await sync(db, { hrv: [hrvPunt(D4, 55)] }, { rpcFout: { status: 500, body: { code: 'XX000', message: 'kapot' } } });
    eq([c.rpcs.length, c.body.imported, c.body.status, await rij(db, D4, false)], [1, 0, 'no_new_data', null], 'D5 een serverfout wordt niet gemaskeerd door een tweede poging');
    const d = await sync(db, { hrv: [hrvPunt(D4, 55)] }, { rpcFout: { status: 404, body: { code: 'PGRST116', message: 'iets anders' } } });
    eq(d.rpcs.length, 1, 'D6 alleen 404 met code PGRST202 leidt tot de terugval');
    await pasV580Toe(db);
    const e = await sync(db, { hrv: [hrvPunt(D1, 55)], sleep: [slaapPunt(D1, { minutesAsleep: '450' })] });
    eq([e.body.provenance, (await rij(db, D1)).hrv_metric_type, (await rij(db, D1)).sleep_metric_type, e.rpcs.length], [{ rpc: 'typed', typed: { hrv: 1, sleep: 1 } }, 'rmssd', 'asleep', 1], 'D7 na het toepassen van de migratie schrijft dezelfde code het type, zonder verdere wijziging');
    ok(!/"p_hrv":|"hrv":\s*5\d/.test(a.logs) && !/tok\b/.test(JSON.stringify(a.body)), 'D8 geen waarden of tokens in de log of de respons');
    await db.close();
  }

  /* ══ E. Geen effect op berekening of beslissing; single writer intact ════ */
  {
    const bron = (f) => rd(f);
    ok(!/sleep_metric_type|hrv_metric_type/.test(bron('core/calculation.js') + bron('core/decision.js') + bron('core/coaching.js')), 'E1 Calculation, Decision en Coaching lezen geen metric-type');
    ok(!/sleep_metric_type/.test(bron('index.html')), 'E2 de app leest of toont het slaaptype niet (geen nieuw herstel- of confidence-effect)');
    const q1 = LIB.qualifyDayValues({ sleep: 7.5, sleepBasis: 'asleep' }), q2 = LIB.qualifyDayValues({ sleep: 7.5, sleepBasis: 'time_in_bed' });
    eq([q1.vals, q1.status], [q2.vals, q2.status], 'E3 de keuring en de opgeslagen waarde zijn gelijk voor beide bases: alleen de provenance verschilt');
    const ws = bron('netlify/functions/wearable-sync.js');
    ok(!/\/rest\/v1\/hrv_log[^`]*`,\s*\{\s*method:\s*'(POST|PATCH|PUT|DELETE)'/.test(ws) && (ws.match(/rest\/v1\/hrv_log/g) || []).length === 1, 'E4 de handler heeft geen direct schrijfpad naar hrv_log; alleen de bestaande leescontrole');
    ok(!/\[sleep:|\[hrv:/.test(ws + bron('netlify/functions/_wearableSyncLib.js')), 'E5 geen metric-type in de vrije-tekst-notitie');
    ok(/Niet op productie toegepast/.test(V580) && !/update\s+public\.hrv_log|delete\s+from\s+public\.hrv_log/i.test(V580), 'E6 de migratie muteert geen bestaande rijen en vermeldt dat zij nog niet is toegepast');
    ok(!/hrv_quality|rhr_quality|sleep_quality|steps_quality/.test(V580 + ws), 'E7 geen quality-kolommen');
  }
}

main().then(function () {
  console.log('fHealthIngestProvenance: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) { console.error('fHealthIngestProvenance: onverwachte fout', e); process.exit(1); });
