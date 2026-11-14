/* tkExerciseLinksMigration.test.js — DEC-EXLINK-001 fase 1.
 *
 * Voert de echte migratie (supabase/migrations/…_tk_exercise_catalog_links.sql) en de echte
 * gegenereerde scripts (tools/tk-exlink-fase1/apply.sql + reverse.sql) uit in een in-process
 * PostgreSQL (PGlite) op een synthetische database met dezelfde kolommen die de scripts raken.
 *
 * EERLIJKE GRENS: de fixture bevat alleen de kolommen/constraints die de scripts gebruiken.
 * Bewezen wordt de SQL-logica (omzetten, samenvoegen, back-up, controles, terugdraaien, RLS),
 * niet de volledige productieschema-pariteit. Vaste synthetische account-id's — nooit echte.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');
const ROOT = path.join(__dirname, '..');
const MIG = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261114180000_tk_exercise_catalog_links.sql'), 'utf8');
const APPLY = fs.readFileSync(path.join(ROOT, 'tools/tk-exlink-fase1/apply.sql'), 'utf8');
const REVERSE = fs.readFileSync(path.join(ROOT, 'tools/tk-exlink-fase1/reverse.sql'), 'utf8');
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/tk-exlink-fase1/mapping.json'), 'utf8')).links;

let pass = 0, fail = 0; const msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + m); } }
function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

const U1 = '11111111-aaaa-4aaa-8aaa-111111111111'; // eigenaar (synthetisch)
const U2 = '22222222-bbbb-4bbb-8bbb-222222222222'; // ander account (synthetisch)
const GLOBAL = new Set(['TK-000019', 'TK-000020', 'TK-000024', 'TK-000030', 'TK-000038', 'TK-000192',
  'hyrox_skierg', 'hyrox_sled_push', 'hyrox_sled_pull', 'hyrox_burpee_broad_jump', 'hyrox_row', 'hyrox_farmers_carry',
  'hyrox_sandbag_lunges', 'hyrox_wall_balls', 'hyrox_run', 'triathlon_zwemmen', 'triathlon_fietsen', 'triathlon_hardlopen']);

const FIXTURE = `
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
grant usage on schema public to anon, authenticated, service_role;
create table public.exercises (id text primary key, name text, scope text, created_by uuid, user_id uuid, gym_id text,
  active boolean default true, ratio_anchor text, ratio_factor numeric);
create table public.movekit_catalog_fk_bindings (catalog_id text primary key, exercise_id text, active boolean, reviewed_at timestamptz);
create table public.sessions (id uuid primary key default gen_random_uuid(), user_id uuid, exercise_id text references public.exercises(id),
  date date default current_date, sets int, reps int, weight numeric, distance int, duration_s int, note text);
create table public.program_block_exercises (id uuid primary key default gen_random_uuid(), user_id uuid, exercise_id text references public.exercises(id), sort_order int);
create table public.training_exercises (id text primary key, user_id uuid, exercise_id text references public.exercises(id), training_ref text);
create table public.custom_training_exercises (id uuid primary key default gen_random_uuid(), user_id uuid, exercise_id text, custom_training_id text);
create table public.race_segments (id uuid primary key default gen_random_uuid(), user_id uuid, exercise_id text references public.exercises(id),
  training_instance_id uuid, segment_index int, unique (training_instance_id, segment_index));
create table public.goals (id bigint generated always as identity primary key, user_id uuid not null, exercise_id text references public.exercises(id) on delete set null, naam text);
create table public.exercise_goals (id bigint generated always as identity primary key, user_id uuid not null, exercise_id text references public.exercises(id),
  peak_goal numeric, pr numeric, one_rm numeric, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, exercise_id));
create table public.exercise_equipment (id text primary key, exercise_id text, user_id uuid, label text, value text);
create table public.exercise_favorites (exercise_id text primary key references public.exercises(id), user_id uuid, created_at timestamptz default now());
create table public.training_instances (id uuid primary key default gen_random_uuid(), user_id uuid, snapshot jsonb);
create table public.planned_training_occurrences (id uuid primary key default gen_random_uuid(), creator_user_id uuid, definition_snapshot jsonb);
create table public.program_regeneration_log (id uuid primary key default gen_random_uuid(), user_id uuid, replaced_blocks_snapshot jsonb);
create table public.custom_trainings (id text primary key, user_id uuid, metadata jsonb);
create table public.training_context (user_id uuid primary key, avoid_exercises jsonb);
`;

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
function seedSql() {
  const ids = new Set();
  MAP.forEach((l) => { ids.add(l.exercise_id); if (l.merged_into) ids.add(l.merged_into); });
  ids.add('frontsquat_other'); // niet in de mapping
  const ex = [...ids].map((id) => GLOBAL.has(id)
    ? `(${q(id)}, ${q('G ' + id)}, 'global', null)`
    : `(${q(id)}, ${q('P ' + id)}, 'personal', '${U1}')`).join(',\n');
  const cats = [...new Set(MAP.map((l) => l.catalog_id))].map((c) => `(${q(c)}, ${q('TKC-' + c.slice(3))}, false, null)`).join(',');
  return `
insert into auth.users values ('${U1}'), ('${U2}');
insert into public.exercises (id, name, scope, created_by) values
${ex};
insert into public.movekit_catalog_fk_bindings values ${cats};
-- sessies eigenaar
insert into public.sessions (user_id, exercise_id, sets, reps, weight) values
  ('${U1}','bench',4,5,60), ('${U1}','TK-000019',4,5,80), ('${U1}','TK-000019',3,3,85),
  ('${U1}','backsquat',4,5,90), ('${U1}','safety_squat_bar',3,5,100), ('${U1}','safity_bar_squat',3,5,95), ('${U1}','TK-000038',5,5,110),
  ('${U1}','shoulderpress',4,5,40), ('${U1}','TK-000030',4,5,50),
  ('${U1}','cablerow',4,8,60), ('${U1}','TK-000192',4,8,80), ('${U1}','frontsquat_other',3,3,90);
insert into public.sessions (user_id, exercise_id, distance, duration_s) values
  ('${U1}','roeien',2000,480), ('${U1}','hyrox_skierg',1000,250), ('${U1}','ski_erg',1000,240);
-- sessies ander account (op dezelfde id's): mogen NIET bewegen
insert into public.sessions (user_id, exercise_id, sets, reps, weight) values ('${U2}','TK-000019',3,5,70), ('${U2}','bench',3,5,50);
insert into public.program_block_exercises (user_id, exercise_id, sort_order) values
  ('${U1}','bench',1), ('${U1}','paused_bench',2), ('${U1}','TK-000019',3), ('${U1}','backsquat',4), ('${U2}','bench',1);
insert into public.training_exercises values ('A_bench','${U1}','bench','A'), ('A_sq','${U1}','safity_bar_squat','A'), ('B_row','${U1}','roeien','B');
insert into public.custom_training_exercises (user_id, exercise_id, custom_training_id) values ('${U1}','cablerow','ct1');
insert into public.race_segments (user_id, exercise_id, segment_index) values ('${U1}','hyrox_skierg',2);
insert into public.goals (user_id, exercise_id, naam) values ('${U1}','deadlift','DL 200');
insert into public.exercise_goals (user_id, exercise_id, pr, one_rm, peak_goal, updated_at) values
  ('${U1}','bench',60,90,null,'2026-01-01'), ('${U1}','TK-000019',85,90,105,'2026-02-01'),
  ('${U1}','backsquat',93.5,110,null,'2026-03-01'), ('${U1}','safety_squat_bar',null,null,140,'2026-01-05'), ('${U1}','TK-000038',110,110,140,'2026-02-02'),
  ('${U1}','shoulderpress',41,64,null,'2026-01-03'), ('${U1}','TK-000030',500,64,75,'2026-02-03'),
  ('${U1}','good_morning',60,null,null,'2026-01-04'), ('${U1}','TK-000147',50,null,null,'2026-01-06'),
  ('${U1}','deadlift',140,205,null,'2026-01-07'),
  ('${U2}','TK-000019',70,80,90,'2026-01-01'), ('${U2}','bench',40,50,60,'2026-01-01');
insert into public.exercise_equipment values ('eq1','bench','${U1}','bank','plat'), ('eq2','bench','${U1}','stang','olympisch'),
  ('eq3','TK-000019','${U1}','bank','plat'), ('eq4','TK-000019','${U2}','bank','plat');
insert into public.exercise_favorites values ('cablerow','${U1}',now()), ('leg_extension','${U1}',now()), ('TK-000185','${U1}',now());
insert into public.training_instances (user_id, snapshot) values
  ('${U1}', '{"items":[{"exercise_id":"bench","naam":"bench","sets":4},{"exercise_id":"TK-000019"}],"modifications":[{"type":"remove","exercise_id":"backsquat"}],"execution":{"items":[{"id":"cablerow"}],"skipped":["bench"]},"note":"bench dag"}'),
  ('${U1}', '{"items":[{"exercise_id":"frontsquat_other"}]}'),
  ('${U2}', '{"items":[{"exercise_id":"bench"}]}');
insert into public.planned_training_occurrences (creator_user_id, definition_snapshot) values ('${U1}', '{"items":[{"exercise_id":"shoulderpress"}]}');
insert into public.program_regeneration_log (user_id, replaced_blocks_snapshot) values ('${U1}', '[{"oefeningen":[{"exercise_id":"deadlift"},{"exercise_id":"hyrox_row"}]}]');
insert into public.custom_trainings values ('ct1','${U1}','{"sel":{"sport":"kracht"}}');
insert into public.training_context values ('${U1}', '["burpee"]');
update public.exercises set ratio_anchor = 'backsquat', ratio_factor = 0.8 where id = 'frontsquat_other';
`;
}

async function db0() { const db = new PGlite(); await db.exec(FIXTURE); await db.exec(MIG); await db.exec(seedSql()); return db; }
async function run(db, body, owner, commit = true) {
  await db.exec('begin');
  try {
    if (owner) await db.query("select set_config('tk.exlink_owner', $1, true)", [owner]);
    const res = await db.exec(body);
    await db.exec(commit ? 'commit' : 'rollback');
    return { ok: true, res };
  } catch (e) { try { await db.exec('rollback'); } catch (_) {} return { ok: false, msg: e.message }; }
}
async function rows(db, sql, p) { return (await db.query(sql, p || [])).rows; }
async function dump(db) {
  const out = {};
  for (const [t, ord] of [['sessions', 'id'], ['program_block_exercises', 'id'], ['training_exercises', 'id'], ['custom_training_exercises', 'id'],
    ['race_segments', 'id'], ['goals', 'id'], ['exercise_goals', 'id'], ['exercise_equipment', 'id'], ['exercise_favorites', 'exercise_id'],
    ['training_instances', 'id'], ['planned_training_occurrences', 'id'], ['program_regeneration_log', 'id'], ['custom_trainings', 'id'],
    ['training_context', 'user_id'], ['exercises', 'id']]) {
    out[t] = JSON.stringify(await rows(db, `select * from public.${t} order by ${ord}`));
  }
  return out;
}
const exOf = async (db, user, id) => (await rows(db, 'select count(*)::int n from public.sessions where user_id=$1 and exercise_id=$2', [user, id]))[0].n;

async function main() {
  /* ══ 0. Scripts zijn actueel en bevatten geen account-id ════════════════════ */
  let fresh = true; try { require('child_process').execFileSync(process.execPath, [path.join(ROOT, 'tools/tk-exlink-fase1/build.cjs'), '--check'], { stdio: 'pipe' }); } catch (_) { fresh = false; }
  ok(fresh, '01 apply.sql/reverse.sql zijn gelijk aan de build uit mapping.json');
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  ok(!UUID.test(APPLY) && !UUID.test(REVERSE) && !UUID.test(MIG), '02 geen account-id in migratie of scripts');
  eq(MAP.length, 98, '03 mapping bevat 98 eigen oefeningen');
  /* ══ A. Migratie: additief, herhaalbaar, owner-only RLS ══════════════════════ */
  let db = await db0();
  let again = true; try { await db.exec(MIG); } catch (_) { again = false; }
  ok(again, 'A1 migratie is herhaalbaar');
  const rls = await rows(db, "select relrowsecurity from pg_class where relname='exercise_catalog_links'");
  eq(rls[0].relrowsecurity, true, 'A2 RLS staat aan op exercise_catalog_links');
  let badCat = false; try { await db.exec(`insert into public.exercise_catalog_links (user_id, exercise_id, catalog_id) values ('${U1}','bench','TK-000999')`); } catch (_) { badCat = true; }
  ok(badCat, 'A3 catalog_id buiten 1..582 geweigerd');
  let badHid = false; try { await db.exec(`insert into public.exercise_catalog_links (user_id, exercise_id, catalog_id, merged_into, hidden) values ('${U1}','bench','TK-000019','TK-000019',true)`); } catch (_) { badHid = true; }
  ok(badHid, 'A4 hidden én merged_into tegelijk geweigerd');

  /* ══ B. Voorwaarden ═════════════════════════════════════════════════════════ */
  let r = await run(db, APPLY, null);
  ok(!r.ok && /tk.exlink_owner ontbreekt/.test(r.msg), 'B1 zonder eigenaar weigert het script (' + r.msg + ')');
  r = await run(db, APPLY, '33333333-cccc-4ccc-8ccc-333333333333');
  ok(!r.ok && /eigenaar onbekend/.test(r.msg), 'B2 onbekende eigenaar geweigerd');
  await db.exec(`update public.exercises set created_by='${U2}' where id='paused_bench'`);
  r = await run(db, APPLY, U1);
  ok(!r.ok && /ander account/.test(r.msg), 'B3 eigen oefening van een ander account wordt niet samengevoegd');
  await db.exec(`update public.exercises set created_by='${U1}' where id='paused_bench'`);

  /* ══ C. Proefrun: rollback laat alles ongemoeid ═════════════════════════════ */
  const before = await dump(db);
  r = await run(db, APPLY, U1, false);
  ok(r.ok, 'C1 proefrun slaagt (' + (r.msg || '') + ')');
  const report = r.ok ? r.res[r.res.length - 1].rows : [];
  ok(report.some((x) => x.k === 'controles' && x.v === 'geslaagd'), 'C2 verslag meldt geslaagde controles');
  eq(report.find((x) => x.k === 'koppelingen') && report.find((x) => x.k === 'koppelingen').v, '98', 'C3 98 koppelingen');
  eq(await dump(db), before, 'C4 na rollback is de database byte-gelijk');
  eq((await rows(db, "select count(*)::int n from pg_class where relname like 'bak_tkx20261114_%'"))[0].n, 0, 'C5 ook geen back-uptabellen na rollback');

  /* ══ D. Uitvoering ═════════════════════════════════════════════════════════ */
  r = await run(db, APPLY, U1, true);
  ok(r.ok, 'D1 uitvoering slaagt (' + (r.msg || '') + ')');
  eq(await exOf(db, U1, 'bench'), 0, 'D2 geen eigen sessie meer op bench');
  eq(await exOf(db, U1, 'TK-000019'), 3, 'D3 bench-sessie staat op TK-000019 (2+1)');
  eq(await exOf(db, U1, 'TK-000038'), 4, 'D4 backsquat + 2 safety bar varianten op TK-000038');
  eq(await exOf(db, U2, 'bench'), 1, 'D5 sessie van ander account op bench ongemoeid');
  eq(await exOf(db, U2, 'TK-000019'), 1, 'D6 sessie van ander account op TK-000019 ongemoeid');
  eq(await exOf(db, U1, 'hyrox_skierg'), 1, 'D7 race-onderdeel hyrox_skierg niet samengevoegd');
  eq(await exOf(db, U1, 'roeien'), 1, 'D8 roeien (doel) behoudt zijn sessie');
  eq(await exOf(db, U1, 'frontsquat_other'), 1, 'D9 oefening buiten de mapping ongemoeid');
  eq((await rows(db, "select exercise_id from public.race_segments"))[0].exercise_id, 'hyrox_skierg', 'D10 racesegment ongemoeid');
  eq((await rows(db, `select exercise_id from public.program_block_exercises where user_id='${U1}' order by sort_order`)).map((x) => x.exercise_id),
    ['TK-000019', 'TK-000019', 'TK-000019', 'TK-000038'], 'D11 programmaregels omgezet (incl. Paused Bench)');
  eq((await rows(db, `select exercise_id from public.program_block_exercises where user_id='${U2}'`))[0].exercise_id, 'bench', 'D12 programmaregel ander account ongemoeid');
  eq((await rows(db, "select exercise_id from public.training_exercises order by id")).map((x) => x.exercise_id), ['TK-000019', 'TK-000038', 'roeien'], 'D13 vaste trainingen omgezet');
  eq((await rows(db, "select exercise_id from public.custom_training_exercises"))[0].exercise_id, 'TK-000192', 'D14 eigen training omgezet');
  eq((await rows(db, "select exercise_id from public.goals"))[0].exercise_id, 'TK-000024', 'D15 doel (goals) omgezet');
  // Doelen: hoogste waarde per veld
  const g = async (u, id) => (await rows(db, 'select pr::float, one_rm::float, peak_goal::float from public.exercise_goals where user_id=$1 and exercise_id=$2', [u, id]))[0] || null;
  eq(await g(U1, 'TK-000019'), { pr: 85, one_rm: 90, peak_goal: 105 }, 'D16 bench-groep: hoogste waarden');
  eq(await g(U1, 'TK-000038'), { pr: 110, one_rm: 110, peak_goal: 140 }, 'D17 squat-groep: hoogste waarden');
  eq(await g(U1, 'TK-000030'), { pr: 500, one_rm: 64, peak_goal: 75 }, 'D18 press-groep: waarden ongewijzigd overgenomen (500 blijft)');
  eq(await g(U1, 'TK-000147'), { pr: 60, one_rm: null, peak_goal: null }, 'D19 good morning: hoogste PR 60');
  eq(await g(U1, 'TK-000024'), { pr: 140, one_rm: 205, peak_goal: null }, 'D20 deadlift: doel aangemaakt op doel-id');
  eq(await g(U1, 'bench'), null, 'D21 doelrij op bench verdwenen');
  eq(await g(U2, 'TK-000019'), { pr: 70, one_rm: 80, peak_goal: 90 }, 'D22 doelen ander account ongemoeid');
  eq(await g(U2, 'bench'), { pr: 40, one_rm: 50, peak_goal: 60 }, 'D23 doelen ander account op bench ongemoeid');
  // JSON
  const snap = (await rows(db, `select snapshot from public.training_instances where user_id='${U1}' and snapshot::text like '%modifications%'`))[0].snapshot;
  eq(snap.items.map((i) => i.exercise_id), ['TK-000019', 'TK-000019'], 'D24 snapshot items omgezet');
  eq(snap.items[0].naam, 'bench', 'D25 alleen id-velden worden omgezet: een naamveld met dezelfde tekst blijft');
  eq(snap.modifications[0].exercise_id, 'TK-000038', 'D26 modifications omgezet');
  eq([snap.execution.items[0].id, snap.execution.skipped[0]], ['TK-000192', 'TK-000019'], 'D27 execution-ids omgezet');
  eq(snap.note, 'bench dag', 'D28 vrije tekst blijft ongemoeid');
  eq((await rows(db, `select snapshot from public.training_instances where user_id='${U2}'`))[0].snapshot.items[0].exercise_id, 'bench', 'D29 snapshot ander account ongemoeid');
  eq((await rows(db, 'select definition_snapshot from public.planned_training_occurrences'))[0].definition_snapshot.items[0].exercise_id, 'TK-000030', 'D30 geplande training omgezet');
  eq((await rows(db, 'select replaced_blocks_snapshot from public.program_regeneration_log'))[0].replaced_blocks_snapshot[0].oefeningen.map((o) => o.exercise_id),
    ['TK-000024', 'hyrox_row'], 'D31 programmalog omgezet, race-id blijft');
  // Uitrusting, favorieten, oefeningen
  eq((await rows(db, `select id, exercise_id from public.exercise_equipment order by id`)).map((x) => x.id + ':' + x.exercise_id),
    ['eq2:TK-000019', 'eq3:TK-000019', 'eq4:TK-000019'], 'D32 uitrusting verplaatst, dubbel (bank/plat) vervallen');
  eq((await rows(db, 'select exercise_id from public.exercise_favorites order by 1')).map((x) => x.exercise_id), ['TK-000185', 'TK-000192'], 'D33 favorieten verplaatst/ontdubbeld');
  eq((await rows(db, "select active from public.exercises where id='bench'"))[0].active, false, 'D34 eigen bench op inactief (niet verwijderd)');
  eq((await rows(db, "select active from public.exercises where id='TK-000019'"))[0].active, true, 'D35 gedeelde TK-000019 actief');
  eq((await rows(db, "select count(*)::int n from public.exercises where id like 'hyrox_%' and not active"))[0].n, 0, 'D36 gedeelde race-oefeningen niet aangeraakt');
  eq((await rows(db, "select ratio_anchor from public.exercises where id='frontsquat_other'"))[0].ratio_anchor, 'TK-000038', 'D37 ratio-anker omgezet');
  eq((await rows(db, `select count(*)::int n, count(*) filter (where merged_into is not null)::int m, count(*) filter (where hidden)::int h from public.exercise_catalog_links where user_id='${U1}'`))[0],
    { n: 98, m: 18, h: 10 }, 'D38 koppelingen: 98, 18 samengevoegd, 10 verborgen race');
  ok((await rows(db, "select count(*)::int n from pg_class where relname like 'bak_tkx20261114_%'"))[0].n >= 15, 'D39 back-uptabellen aangemaakt');
  eq((await rows(db, "select count(*)::int n from public.bak_tkx20261114_sessions"))[0].n, 6, 'D40 alleen de 6 verplaatste eigen sessies geback-upt');
  eq((await rows(db, "select relrowsecurity r from pg_class where relname='bak_tkx20261114_sessions'"))[0].r, true, 'D41 back-up deny-all (RLS aan)');

  /* ══ E. Idempotent ══════════════════════════════════════════════════════════ */
  const afterApply = await dump(db);
  r = await run(db, APPLY, U1, true);
  ok(r.ok, 'E1 tweede run slaagt (' + (r.msg || '') + ')');
  eq(await dump(db), afterApply, 'E2 tweede run verandert niets');
  // achterblijver (bv. offline wachtrij die na de migratie nog op bench synct) wordt bij een herhaling meegenomen
  await db.exec(`insert into public.sessions (user_id, exercise_id, sets, reps, weight) values ('${U1}','bench',1,1,61)`);
  r = await run(db, APPLY, U1, true);
  ok(r.ok && (await exOf(db, U1, 'bench')) === 0, 'E3 achterblijver wordt bij herhaling omgezet');

  /* ══ F. RLS van de koppeltabel ══════════════════════════════════════════════ */
  await db.exec("select set_config('request.jwt.claim.sub', '" + U2 + "', false)");
  await db.exec('set role authenticated');
  const vis = (await rows(db, 'select count(*)::int n from public.exercise_catalog_links'))[0].n;
  let foreignWrite = false;
  try { await db.exec(`insert into public.exercise_catalog_links (user_id, exercise_id, catalog_id) values ('${U1}','frontsquat_other','TK-000356')`); foreignWrite = true; } catch (_) {}
  await db.exec('reset role');
  eq(vis, 0, 'F1 ander account ziet geen koppelingen van de eigenaar');
  ok(!foreignWrite, 'F2 ander account kan geen koppeling namens de eigenaar schrijven');

  /* ══ G. Terugdraaien ════════════════════════════════════════════════════════ */
  db = await db0();
  const pristine = await dump(db);
  r = await run(db, APPLY, U1, true); ok(r.ok, 'G1 apply op schone db');
  r = await run(db, REVERSE, U1, true); ok(r.ok, 'G2 reverse slaagt (' + (r.msg || '') + ')');
  const restored = await dump(db);
  for (const t of Object.keys(pristine)) {
    if (t === 'exercise_goals') {
      const strip = (s) => JSON.parse(s).map((x) => ({ ...x })).sort((a, b) => a.id - b.id);
      eq(strip(restored[t]), strip(pristine[t]), 'G3 ' + t + ' terug naar de oorspronkelijke stand');
    } else eq(restored[t], pristine[t], 'G3 ' + t + ' terug naar de oorspronkelijke stand');
  }
  eq((await rows(db, 'select count(*)::int n from public.exercise_catalog_links'))[0].n, 0, 'G4 koppelingen verwijderd');

  console.log('\n[DEC-EXLINK-001] migratie + apply/reverse (PGlite)');
  msgs.forEach((m) => console.log('  ' + m));
  console.log('  ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (fail) process.exit(1);
}
main().catch((e) => { msgs.forEach((m) => console.log("  " + m)); console.error(e.message); process.exit(1); });
