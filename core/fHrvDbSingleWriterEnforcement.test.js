/* fHrvDbSingleWriterEnforcement.test.js — HRV single-writer, Phase 2 (migratie_v579).
 *
 * Phase 1 (#513) maakte upsert_daily_health de enige writer in de APPLICATIE. Phase 2 laat de DATABASE dat
 * afdwingen: anon/authenticated verliezen INSERT/UPDATE/DELETE/TRUNCATE op public.hrv_log.
 *
 * Privilegegedrag is niet met tekstvergelijking te bewijzen. Deze suite draait daarom op echte PostgreSQL
 * (PGlite, in-process) met:
 *   - de ECHTE functie uit de laatste migratie die upsert_daily_health definieert (v560),
 *   - de ECHTE EXECUTE-rechten uit migratie_v570,
 *   - de ECHTE, ongewijzigde migratie_v579,
 *   - het ECHTE verificatiescript tools/verify-hrv-single-writer.sql (vaste synthetische identiteiten; kiest
 *     geen account uit auth.users).
 * Fixture (niet uit de repo, want de basistabel staat in geen enkele migratie): de tabel, de RLS-policy, de
 * trigger, de rollen en de tabel-ACL zoals read-only vastgesteld op productie op 2026-10-04. De live rol
 * `postgres` (geen superuser, wel owner en BYPASSRLS) heet hier `tk_owner`. De coach-leespolicy is weggelaten
 * (leest alleen; hangt aan coach_has_scope).
 *
 * GRENS: dit bewijst de migratie op echte Postgres-semantiek, niet dat productie haar al draait. Dat laatste
 * bewijst tools/verify-hrv-single-writer.sql na een gecontroleerde apply.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');
const ROOT = path.join(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }
function eq(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label + ' (kreeg ' + JSON.stringify(a) + ', verwacht ' + JSON.stringify(b) + ')'); }

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
// Vaste synthetische identiteiten van tools/verify-hrv-single-writer.sql: geen account in auth.users.
const SYN_A = '00000000-0000-0000-0000-00000000a579';
const SYN_B = '00000000-0000-0000-0000-00000000b579';
const SIG = '(uuid, date, numeric, integer, numeric, text, text, text, text, integer)';
const MIG = rd('migratie_v579.sql');
const VERIFY = rd('tools/verify-hrv-single-writer.sql');

/* Echte repo-SQL */
const migs = fs.readdirSync(ROOT).filter((f) => /^migratie_v\d+\.sql$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
const defFile = migs.filter((f) => /CREATE OR REPLACE FUNCTION public\.upsert_daily_health\(/i.test(rd(f))).pop();
const defSrc = rd(defFile);
const FN_SQL = defSrc.slice(defSrc.indexOf('CREATE OR REPLACE FUNCTION public.upsert_daily_health('), defSrc.indexOf('$function$;') + '$function$;'.length);
const V570 = rd('migratie_v570.sql').split('\n').filter((l) => /on function public\.upsert_daily_health\(/.test(l)).join('\n');

const FIXTURE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role tk_owner nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, created_at timestamptz not null default now());
insert into auth.users values ('${A}', '2026-01-01'), ('${B}', '2026-02-01');
create function auth.uid() returns uuid language sql stable as $f$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid $f$;
create function auth.role() returns text language sql stable as $f$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' $f$;
grant usage on schema auth to anon, authenticated, service_role, tk_owner;
grant select on auth.users to tk_owner;
grant usage on schema public to anon, authenticated, service_role;
grant create, usage on schema public to tk_owner;
create table public.hrv_log (
  id uuid primary key default gen_random_uuid(), user_id uuid, date date not null,
  hrv numeric, rhr integer, sleep numeric, cyclus_fase text, edema text, note text,
  created_at timestamptz default now(), hrv_source text, rhr_source text, sleep_source text,
  hrv_metric_type text default 'unknown', steps integer, steps_source text,
  constraint hrv_log_user_date_unique unique (user_id, date),
  constraint hrv_log_hrv_source_check check (hrv_source is null or hrv_source in ('manual','wearable','unknown')),
  constraint hrv_log_rhr_source_check check (rhr_source is null or rhr_source in ('manual','wearable','unknown')),
  constraint hrv_log_sleep_source_check check (sleep_source is null or sleep_source in ('manual','wearable','unknown')),
  constraint hrv_log_hrv_metric_type_check check (hrv_metric_type in ('rmssd','sdnn','unknown')),
  constraint hrv_log_steps_check check (steps is null or steps >= 0));
create function public.set_user_id_from_auth() returns trigger language plpgsql security definer set search_path to 'public' as $f$
  begin if auth.uid() is not null then new.user_id := auth.uid(); end if; return new; end $f$;
create trigger trg_set_user_id before insert on public.hrv_log for each row execute function public.set_user_id_from_auth();
alter table public.hrv_log enable row level security;
create policy eigen_data_alleen on public.hrv_log for all to public using (user_id = auth.uid()) with check (user_id = auth.uid());
`;
// Live ACL vóór v579: anon=arwdm, authenticated=arwdm, service_role=alles.
const LIVE_ACL = `
alter table public.hrv_log owner to tk_owner;
alter function public.set_user_id_from_auth() owner to tk_owner;
revoke all on table public.hrv_log from public, anon, authenticated, service_role;
grant select, insert, update, delete, maintain on table public.hrv_log to anon, authenticated;
grant all on table public.hrv_log to service_role;
`;

async function maakDb(opts) {
  opts = opts || {};
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(FN_SQL);
  await db.exec('alter function public.upsert_daily_health' + SIG + ' owner to tk_owner;');
  await db.exec(V570);
  await db.exec(LIVE_ACL);
  if (opts.voorMigratie) await db.exec(opts.voorMigratie);
  return db;
}
async function als(db, rol, sub, sql, params) {
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(sub ? { sub: sub, role: rol } : { role: rol })]);
  await db.exec('set role ' + rol);
  try { return { ok: true, rows: (await db.query(sql, params || [])).rows }; }
  catch (e) { return { ok: false, code: e.code, msg: String(e.message) }; }
  finally { await db.exec('reset role'); await db.query("select set_config('request.jwt.claims', '', false)"); }
}
const RPC = 'select hrv::float8 hrv, hrv_source, rhr, rhr_source, sleep::float8 sleep, sleep_source, steps, steps_source, note, user_id from public.upsert_daily_health(p_user_id => $1, p_date => $2, p_hrv => $3, p_rhr => $4, p_sleep => $5, p_note => $6, p_source => $7, p_steps => $8)';
function rpc(db, rol, sub, a) { return als(db, rol, sub, RPC, [a.user, a.date, a.hrv == null ? null : a.hrv, a.rhr == null ? null : a.rhr, a.sleep == null ? null : a.sleep, a.note == null ? null : a.note, a.source || 'manual', a.steps == null ? null : a.steps]); }
async function rechten(db) {
  const r = await db.query(`select rol, string_agg(recht, ',' order by recht) r from unnest(array['anon','authenticated','service_role']) rol,
    unnest(array['DELETE','INSERT','SELECT','TRUNCATE','UPDATE']) recht where has_table_privilege(rol, 'public.hrv_log', recht) group by rol order by rol`);
  const o = {}; r.rows.forEach((x) => { o[x.rol] = x.r; }); return o;
}
async function verifyRegels(db) {
  const res = await db.exec(VERIFY);
  const sel = res.filter((x) => x.rows && x.rows.length && x.rows[0].k !== undefined).pop();
  const o = {}; (sel ? sel.rows : []).forEach((x) => { o[x.k.slice(0, 2)] = x.v; }); return o;
}

async function main() {
  ok(defFile === 'migratie_v560.sql', 'S1 de functie komt uit de laatste definitie in de repo (migratie_v560.sql; kreeg ' + defFile + ')');
  ok(/revoke execute[^\n]*from public, anon;/.test(V570) && /grant\s+execute[^\n]*to authenticated, service_role;/.test(V570), 'S2 EXECUTE-rechten komen uit migratie_v570.sql');

  const db = await maakDb();

  /* ══ A. Uitgangssituatie = live stand vóór v579: de opening bestaat ═══════ */
  eq(await rechten(db), { anon: 'DELETE,INSERT,SELECT,UPDATE', authenticated: 'DELETE,INSERT,SELECT,UPDATE', service_role: 'DELETE,INSERT,SELECT,TRUNCATE,UPDATE' }, 'A1 fixture-ACL is gelijk aan de live ACL van 2026-10-04');
  const vIns = await als(db, 'authenticated', A, "insert into public.hrv_log (user_id, date, hrv, hrv_source) values ($1, '2026-05-01', 50, 'wearable') returning hrv_source", [A]);
  ok(vIns.ok && vIns.rows[0].hrv_source === 'wearable', 'A2 VOOR v579: authenticated kan rechtstreeks een rij invoegen met een zelfgekozen bron (de opening)');
  const vUpd = await als(db, 'authenticated', A, "update public.hrv_log set hrv = null, rhr = null where user_id = $1 and date = '2026-05-01' returning id", [A]);
  ok(vUpd.ok && vUpd.rows.length === 1, 'A3 VOOR v579: authenticated kan rechtstreeks een bestaande dag leegmaken (omzeilt de COALESCE-merge)');
  const vDel = await als(db, 'authenticated', A, "delete from public.hrv_log where user_id = $1 and date = '2026-05-01' returning id", [A]);
  ok(vDel.ok && vDel.rows.length === 1, 'A4 VOOR v579: authenticated kan rechtstreeks een dag verwijderen');
  const voor = await verifyRegels(db);
  eq([voor['10'], voor['11'], voor['12']], ['TOEGESTAAN', 'TOEGESTAAN', 'TOEGESTAAN'], 'A5 het verificatiescript toont de opening vóór de migratie');
  eq((await db.query('select count(*)::int n from public.hrv_log')).rows[0].n, 0, 'A6 het verificatiescript laat niets achter (ROLLBACK)');

  // Bestaande data die de migratie niet mag raken.
  await rpc(db, 'service_role', null, { user: A, date: '2026-09-30', hrv: 48, sleep: 7.5, steps: 9000, source: 'wearable', note: '[src:fitbit]' });
  await rpc(db, 'service_role', null, { user: B, date: '2026-09-30', hrv: 70, source: 'wearable' });
  const dataVoor = JSON.stringify((await db.query('select * from public.hrv_log order by user_id, date')).rows);

  /* ══ B. De echte migratie_v579 ════════════════════════════════════════════ */
  await db.exec(MIG);
  eq(await rechten(db), { anon: 'SELECT', authenticated: 'SELECT', service_role: 'DELETE,INSERT,SELECT,TRUNCATE,UPDATE' }, 'B1 na v579: anon/authenticated alleen SELECT; service_role ongewijzigd');
  ok(JSON.stringify((await db.query('select * from public.hrv_log order by user_id, date')).rows) === dataVoor, 'B2 de migratie wijzigt geen enkele rij');
  await db.exec(MIG);
  eq((await rechten(db)).authenticated, 'SELECT', 'B3 v579 is idempotent (tweede keer toepassen slaagt, zelfde stand)');
  const pol = await db.query("select count(*)::int n, bool_and(relrowsecurity) rls from pg_policies p join pg_class c on c.relname = p.tablename where p.tablename = 'hrv_log'");
  eq([pol.rows[0].n, pol.rows[0].rls], [1, true], 'B4 RLS en policy ongewijzigd');

  /* ══ C. Fail-closed: directe mutaties ═════════════════════════════════════ */
  const cIns = await als(db, 'authenticated', A, "insert into public.hrv_log (user_id, date, hrv) values ($1, '2026-10-01', 50)", [A]);
  eq([cIns.ok, cIns.code], [false, '42501'], 'C1 authenticated directe INSERT op eigen rij: permission denied');
  const cUpd = await als(db, 'authenticated', A, "update public.hrv_log set hrv = 1 where user_id = $1", [A]);
  eq([cUpd.ok, cUpd.code], [false, '42501'], 'C2 authenticated directe UPDATE op eigen rij: permission denied');
  const cDel = await als(db, 'authenticated', A, 'delete from public.hrv_log where user_id = $1', [A]);
  eq([cDel.ok, cDel.code], [false, '42501'], 'C3 authenticated directe DELETE op eigen rij: permission denied');
  const cTru = await als(db, 'authenticated', A, 'truncate public.hrv_log');
  eq([cTru.ok, cTru.code], [false, '42501'], 'C4 authenticated TRUNCATE: permission denied');
  const cUps = await als(db, 'authenticated', A, "insert into public.hrv_log (user_id, date, hrv) values ($1, '2026-09-30', 1) on conflict (user_id, date) do update set hrv = excluded.hrv", [A]);
  eq([cUps.ok, cUps.code], [false, '42501'], 'C5 authenticated directe UPSERT (PostgREST merge-duplicates): permission denied');
  for (const [nr, sql] of [['C6', "insert into public.hrv_log (user_id, date, hrv) values ('" + A + "', '2026-10-01', 50)"], ['C7', 'update public.hrv_log set hrv = 1'], ['C8', 'delete from public.hrv_log']]) {
    const r = await als(db, 'anon', null, sql);
    eq([r.ok, r.code], [false, '42501'], nr + ' anon directe ' + sql.split(' ')[0].toUpperCase() + ': permission denied');
  }
  ok(JSON.stringify((await db.query('select * from public.hrv_log order by user_id, date')).rows) === dataVoor, 'C9 geen van de geweigerde pogingen heeft data veranderd');

  /* ══ D. De canonieke writer blijft werken ═════════════════════════════════ */
  const d1 = await rpc(db, 'authenticated', A, { user: A, date: '2026-09-30', rhr: 52, source: 'manual' });
  ok(d1.ok, 'D1 authenticated schrijft eigen data via upsert_daily_health (zonder eigen tabelrechten)' + (d1.ok ? '' : ': ' + d1.msg));
  eq(d1.ok && [d1.rows[0].hrv, d1.rows[0].hrv_source, d1.rows[0].sleep, d1.rows[0].sleep_source, d1.rows[0].steps, d1.rows[0].steps_source, d1.rows[0].note, d1.rows[0].rhr, d1.rows[0].rhr_source],
    [48, 'wearable', 7.5, 'wearable', 9000, 'wearable', '[src:fitbit]', 52, 'manual'], 'D2 gedeeltelijke update via de RPC behoudt niet-aangeleverde waarden; bron per veld intact');
  const d3 = await rpc(db, 'authenticated', A, { user: A, date: '2026-10-02', hrv: 44, source: 'manual' });
  ok(d3.ok && d3.rows[0].user_id === A && d3.rows[0].hrv_source === 'manual', 'D3 nieuwe dag via de RPC: rij aangemaakt voor de eigen gebruiker');
  const d4 = await rpc(db, 'authenticated', A, { user: B, date: '2026-10-02', hrv: 1 });
  ok(!d4.ok && /not authorized/.test(d4.msg), 'D4 cross-user RPC geweigerd door de functie');
  const d5 = await rpc(db, 'anon', null, { user: A, date: '2026-10-02', hrv: 1 });
  eq([d5.ok, d5.code], [false, '42501'], 'D5 anon mag de RPC niet uitvoeren (geen EXECUTE)');
  const d6 = await rpc(db, 'authenticated', A, { user: A, date: '2026-10-02', hrv: 1, source: 'import' });
  ok(!d6.ok && /invalid source/.test(d6.msg), 'D6 ongeldige bron geweigerd');
  const d7 = await rpc(db, 'authenticated', null, { user: A, date: '2026-10-02', hrv: 1 });
  ok(!d7.ok && /not authorized/.test(d7.msg), 'D7 authenticated zonder sub-claim geweigerd');
  const d8 = await rpc(db, 'service_role', null, { user: B, date: '2026-10-02', rhr: 61, source: 'wearable' });
  ok(d8.ok && d8.rows[0].user_id === B && d8.rows[0].rhr_source === 'wearable', 'D8 service_role (wearable-sync) schrijft via de RPC voor de opgegeven gebruiker');
  eq((await db.query("select hrv::float8 hrv from public.hrv_log where user_id = $1 and date = '2026-09-30'", [B])).rows[0].hrv, 70, 'D9 data van de andere gebruiker is onaangeroerd');

  /* ══ E. Lezen en accountverwijdering ══════════════════════════════════════ */
  const e1 = await als(db, 'authenticated', A, 'select user_id, date::text d from public.hrv_log order by date');
  ok(e1.ok && e1.rows.length === 2 && e1.rows.every((x) => x.user_id === A), 'E1 leesflow: authenticated leest zijn eigen rijen, en alleen die (RLS)');
  const e2 = await als(db, 'anon', null, 'select count(*)::int n from public.hrv_log');
  ok(e2.ok && e2.rows[0].n === 0, 'E2 anon leest niets');
  const e3 = await als(db, 'service_role', null, 'select count(*)::int n from public.hrv_log where user_id = $1 and date = $2', [A, '2026-09-30']);
  ok(e3.ok && e3.rows[0].n === 1, 'E3 service_role leest (bestaans-check in wearable-sync)');
  const e4 = await als(db, 'service_role', null, 'delete from public.hrv_log where user_id = $1 returning id', [B]);
  ok(e4.ok && e4.rows.length === 2, 'E4 service_role DELETE per user_id werkt (delete-account / cleanup-unverified-accounts)');
  const fnDir = path.join(ROOT, 'netlify', 'functions');
  const del = fs.readFileSync(path.join(fnDir, 'delete-account.js'), 'utf8'), cln = fs.readFileSync(path.join(fnDir, 'cleanup-unverified-accounts.js'), 'utf8');
  ok(/'hrv_log'/.test(del) && /method: 'DELETE',\s*headers: \{ apikey: serviceKey, Authorization: `Bearer \$\{serviceKey\}`/.test(del), 'E5 delete-account.js verwijdert hrv_log met de service-role-sleutel');
  ok(/'hrv_log'/.test(cln) && /const sbHeaders = \{ apikey: serviceKey, Authorization: `Bearer \$\{serviceKey\}`/.test(cln), 'E6 cleanup-unverified-accounts.js gebruikt de service-role-sleutel');

  /* ══ F. Verificatiescript na de migratie ══════════════════════════════════ */
  const na = await verifyRegels(db);
  eq(na, { '00': 'true', '01': '0', '02': 'true', '03': 'true', '04': 'true', '05': '1/true/true', '06': 'false/true/true', '07': '0',
    '10': 'GEWEIGERD', '11': 'GEWEIGERD', '12': 'GEWEIGERD', '13': 'TOEGESTAAN', '14': '50/manual/55/wearable', '15': 'GEWEIGERD',
    '20': 'GEWEIGERD', '21': 'GEWEIGERD', '22': 'GEWEIGERD', '30': 'TOEGESTAAN', '31': 'TOEGESTAAN' }, 'F1 tools/verify-hrv-single-writer.sql geeft na v579 op elke regel de verwachte uitkomst');
  eq((await db.query("select count(*)::int n from public.hrv_log where date = '1900-01-01'")).rows[0].n, 0, 'F2 het verificatiescript laat geen schildwachtrij achter');
  ok(/^begin;/m.test(VERIFY) && /rollback;\s*$/.test(VERIFY.trim()) && !/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.test(VERIFY), 'F3 verificatiescript is rollback-veilig en bevat geen echte user-id');
  // Synthetische-identiteitencontract: het script kiest geen echt account en raakt er geen aan.
  const vCode = VERIFY.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
  const uuids = vCode.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) || [];
  eq(uuids.slice().sort(), [SYN_A, SYN_B], 'F4 het script gebruikt precies de twee vaste synthetische UUID\'s');
  ok(uuids.every((u) => u[14] === '0'), 'F5 beide UUID\'s hebben versie-nibble 0 en kunnen dus geen door auth uitgegeven (v4) account zijn');
  ok(!/\binto\s+\w+\s+from\s+auth\.users/i.test(vCode) && !/from\s+auth\.users[^;]*order\s+by/i.test(vCode), 'F6 het script selecteert geen identiteit uit auth.users');
  eq((await db.query('select count(*)::int n from auth.users where id in ($1, $2)', [SYN_A, SYN_B])).rows[0].n, 0, 'F7 de synthetische identiteiten bestaan niet als account; de verificatie slaagt toch (geen FK, geen bestaanscontrole in de RPC)');
  eq((await db.query('select count(*)::int n from public.hrv_log where user_id in ($1, $2)', [SYN_A, SYN_B])).rows[0].n, 0, 'F8 na het script bestaat geen rij voor een synthetische identiteit');
  const echtVoor = JSON.stringify((await db.query('select * from public.hrv_log order by user_id, date')).rows);
  await verifyRegels(db);
  ok(JSON.stringify((await db.query('select * from public.hrv_log order by user_id, date')).rows) === echtVoor, 'F9 het script wijzigt geen enkele rij van een echte gebruiker');
  await db.query("insert into auth.users values ($1, '2026-03-01')", [SYN_A]);
  let botsing = null;
  try { await db.exec(VERIFY); } catch (e) { botsing = String(e.message); }
  await db.exec('rollback');
  ok(botsing !== null && /synthetische testidentiteit bestaat/.test(botsing), 'F10 bestaat een synthetische UUID toch als account, dan breekt het script af vóór de eerste write');
  ok(JSON.stringify((await db.query('select * from public.hrv_log order by user_id, date')).rows) === echtVoor, 'F11 en ook dan blijft er niets achter');
  await db.query('delete from auth.users where id = $1', [SYN_A]);

  /* ══ G. Herstelpad uit de migratiekop ═════════════════════════════════════ */
  const herstel = (MIG.match(/^--\s+(grant insert, update, delete on table public\.hrv_log to anon, authenticated;)\s*$/m) || [])[1];
  ok(!!herstel, 'G1 de migratie documenteert het herstelstatement');
  if (herstel) {
    await db.exec(herstel);
    eq((await rechten(db)).authenticated, 'DELETE,INSERT,SELECT,UPDATE', 'G2 het herstelstatement zet exact de oude stand terug');
    await db.exec(MIG);
    eq((await rechten(db)).authenticated, 'SELECT', 'G3 opnieuw toepassen sluit de opening weer');
  }
  await db.close();

  /* ══ H. De migratie faalt gesloten wanneer de invariant niet geldt ════════ */
  async function moetFalen(label, patroon, sql, voorMigratie) {
    const d = await maakDb({ voorMigratie: voorMigratie });
    const voorR = JSON.stringify(await rechten(d));
    let fout = null;
    try { await d.transaction(async (tx) => { await tx.exec(sql); }); } catch (e) { fout = String(e.message); }
    ok(fout !== null && patroon.test(fout), label + ' -> migratie breekt af (' + (fout || 'geen fout').slice(0, 70) + ')');
    ok(JSON.stringify(await rechten(d)) === voorR, label + ' -> en draait volledig terug (rechten ongewijzigd)');
    await d.close();
  }
  await moetFalen('H1 UPDATE niet ingetrokken', /authenticated heeft nog UPDATE|anon heeft nog UPDATE/, MIG.replace('revoke insert, update, delete, truncate on table', 'revoke insert, delete, truncate on table'));
  await moetFalen('H2 authenticated vergeten', /authenticated heeft nog INSERT/, MIG.replace('on table public.hrv_log from anon, authenticated, public;', 'on table public.hrv_log from anon, public;'));
  await moetFalen('H3 functie is SECURITY INVOKER', /niet SECURITY DEFINER/, MIG, 'alter function public.upsert_daily_health' + SIG + ' security invoker;');
  await moetFalen('H4 anon kan de RPC uitvoeren', /anon kan upsert_daily_health uitvoeren/, MIG.replace(/revoke execute on function public\.upsert_daily_health[^;]*;/, ''), 'grant execute on function public.upsert_daily_health' + SIG + ' to anon;');
  await moetFalen('H5 service_role mist DELETE', /service_role mist DELETE/, MIG, 'revoke delete on table public.hrv_log from service_role;');
  await moetFalen('H6 functie zonder vaste search_path', /geen vaste search_path/, MIG, 'alter function public.upsert_daily_health' + SIG + ' reset search_path;');

  /* ══ I. Contract van de migratietekst ═════════════════════════════════════ */
  const code = MIG.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
  ok(/revoke insert, update, delete, truncate on table public\.hrv_log from anon, authenticated, public;/.test(code), 'I1 expliciete revoke van INSERT/UPDATE/DELETE/TRUNCATE voor anon, authenticated en PUBLIC');
  ok(!/\bgrant\b[^;]*\bon\s+table\b/i.test(code) && !/\bgrant\b[^;]*\bto\b[^;]*\b(anon|public)\b/i.test(code), 'I2 geen tabel-grant en niets verleend aan anon/PUBLIC');
  ok(!/revoke[^;]*\bselect\b/i.test(code) && !/revoke[^;]*from[^;]*service_role/i.test(code), 'I3 SELECT en service_role worden niet ingetrokken');
  ok(!/create policy|drop policy|alter policy|row level security|create (or replace )?function|alter default privileges/i.test(code), 'I4 geen RLS-, policy-, functie- of default-privilege-wijziging');
  const later = migs.filter((f) => Number(f.match(/\d+/)[0]) > 579).filter((f) => /\bgrant\b[^;]*\b(insert|update|delete|truncate|all)\b[^;]*\bon\s+(table\s+)?(public\.)?hrv_log\b[^;]*\bto\b[^;]*\b(anon|authenticated|public)\b/i
    .test(rd(f).split('\n').map((l) => l.replace(/--.*$/, '')).join('\n')));
  eq(later, [], 'I5 geen latere migratie geeft anon/authenticated/PUBLIC opnieuw een mutatierecht op hrv_log');
}

main().then(function () {
  console.log('fHrvDbSingleWriterEnforcement: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) { console.error('fHrvDbSingleWriterEnforcement: onverwachte fout', e); process.exit(1); });
