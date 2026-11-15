'use strict';
// DEC-EXLINK-005 fase 3b: het ECHTE portiescript (apply/reverse) op een PGlite-model van de betrokken tabellen.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const DIR = path.join(__dirname, '..', 'tools', 'tk-exlink-fase3');
const APPLY = fs.readFileSync(path.join(DIR, 'apply-portie.sql'), 'utf8');
const REVERSE = fs.readFileSync(path.join(DIR, 'reverse-portie.sql'), 'utf8');
const P1 = fs.readFileSync(path.join(DIR, 'portie1.sql'), 'utf8');
let checks = 0; function ok(v, label) { assert(v, label); checks++; console.log('  ok  ' + label); }
const O = '11111111-1111-1111-1111-111111111111', X = '22222222-2222-2222-2222-222222222222';

(async () => {
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create table public.exercises (id text primary key, name text not null, category text not null default 'A', type text not null default 'strength',
      scope text not null default 'personal', active boolean default true, created_by uuid, muscle_primary text[] default '{}', muscle_secondary text[] default '{}', sports text[] default '{}');
    create table public.sessions (id uuid primary key, user_id uuid, exercise_id text references public.exercises(id), weight numeric, reps int, sets int, distance numeric, duration_s int);
    create table public.exercise_goals (id bigserial primary key, user_id uuid, exercise_id text references public.exercises(id), pr numeric, one_rm numeric, peak_goal numeric, updated_at timestamptz default now(), unique (user_id, exercise_id));
    create table public.exercise_catalog_links (user_id uuid, exercise_id text, catalog_id text, merged_into text, hidden boolean default false, created_at timestamptz default now(), migrated_at timestamptz, primary key (user_id, exercise_id));
    create table public.movekit_catalog_fk_bindings (catalog_id text primary key, exercise_id text, active boolean, reviewed_at timestamptz);
    create table public.exercise_rest_settings (user_id uuid, exercise_id text, rest_seconds int, created_at timestamptz default now(), updated_at timestamptz default now(), primary key (user_id, exercise_id));
    create table public.exercise_equipment (id bigserial primary key, exercise_id text, user_id uuid, label text, value text);
    create table public.exercise_favorites (user_id uuid, exercise_id text, primary key (user_id, exercise_id));
    create table public.program_block_exercises (id bigserial primary key, user_id uuid, exercise_id text);
    create table public.training_exercises (id bigserial primary key, user_id uuid, exercise_id text);
    create table public.custom_training_exercises (id bigserial primary key, user_id uuid, exercise_id text);
    insert into public.exercises (id, name, scope, active, created_by) values
      ('TK-000191','Machine Pulldown','global',true,'${O}'), ('TK-000147','Good Mornings','personal',true,'${O}'),
      ('TK-000199','Push Up','personal',true,'${O}'), ('TK-000052','Knee Push Ups','personal',true,'${O}'), ('TK-000180','Machine Chest Press','personal',true,'${O}');
    insert into public.exercises (id, name, scope, active, category) select 'TKC-'||lpad(n::text,6,'0'), 'ref', 'global', false, 'system' from generate_series(1,582) n;
    insert into public.movekit_catalog_fk_bindings select 'TK-'||lpad(n::text,6,'0'), 'TKC-'||lpad(n::text,6,'0'), true, now() from generate_series(1,582) n;
    insert into public.exercise_catalog_links (user_id, exercise_id, catalog_id) select '${O}', id, id from public.exercises where id like 'TK-%';
    insert into public.sessions values
      ('00000000-0000-0000-0000-000000000001','${O}','TK-000191',50,10,3,null,null),
      ('00000000-0000-0000-0000-000000000002','${O}','TK-000191',55,8,3,null,null),
      ('00000000-0000-0000-0000-000000000003','${O}','TK-000147',40,10,3,null,null),
      ('00000000-0000-0000-0000-000000000004','${X}','TK-000191',30,10,3,null,null),
      ('00000000-0000-0000-0000-000000000005','${O}','TKC-000180',60,5,3,null,null),
      ('00000000-0000-0000-0000-000000000006','${O}','TK-000180',58,6,3,null,null);
    insert into public.exercise_goals (user_id, exercise_id, pr, one_rm, peak_goal) values
      ('${O}','TK-000191',60,70,null), ('${O}','TKC-000191',62,null,80), ('${X}','TK-000191',99,99,99), ('${O}','TK-000147',45,null,null);
    insert into public.exercise_rest_settings (user_id, exercise_id, rest_seconds) values ('${O}','TK-000199',90);
  `);
  const run = async (sql) => db.exec(`begin; select set_config('tk.exlink_owner','${O}',true); ${P1} ${sql} commit;`);
  const q = async (s) => (await db.query(s)).rows;

  console.log('\nA. Portie 1 uitvoeren');
  await run(APPLY);
  ok((await q(`select count(*)::int n from sessions where user_id='${O}' and exercise_id like 'TK-%'`))[0].n === 0, 'A1: geen sessies van de eigenaar meer op het oude id');
  ok((await q(`select count(*)::int n from sessions where user_id='${O}' and exercise_id='TKC-000191'`))[0].n === 2 && (await q(`select count(*)::int n from sessions where user_id='${O}' and exercise_id='TKC-000180'`))[0].n === 2, 'A2: sessies samen op het MoveKit-id (ook een bestaande TKC-sessie)');
  ok((await q(`select exercise_id from sessions where user_id='${X}'`))[0].exercise_id === 'TK-000191', 'A3: sessie van een ander account onaangeroerd');
  const g = (await q(`select pr::int, one_rm::int, peak_goal::int from exercise_goals where user_id='${O}' and exercise_id='TKC-000191'`))[0];
  ok(g.pr === 62 && g.one_rm === 70 && g.peak_goal === 80, 'A4: doelen samengevoegd, hoogste waarde per veld');
  ok((await q(`select count(*)::int n from exercise_goals where user_id='${O}' and exercise_id like 'TK-%'`))[0].n === 0 && (await q(`select pr::int from exercise_goals where user_id='${O}' and exercise_id='TKC-000147'`))[0].pr === 45, 'A5: geen doelen meer op het oude id; enkel doel verhuisd');
  ok((await q(`select pr::int from exercise_goals where user_id='${X}'`))[0].pr === 99, 'A6: doelen van een ander account onaangeroerd');
  ok((await q(`select exercise_id from exercise_rest_settings where user_id='${O}'`))[0].exercise_id === 'TKC-000199', 'A7: rusttijd naar het MoveKit-id');
  ok((await q(`select active from exercises where id='TK-000191'`))[0].active === true && (await q(`select count(*)::int n from exercises where id in ('TK-000147','TK-000199','TK-000052','TK-000180') and active`))[0].n === 0, 'A8: gedeelde rij blijft actief, eigen persoonlijke rijen inactief');
  ok((await q(`select count(*)::int n from exercise_catalog_links where migrated_at is not null`))[0].n === 5, 'A9: 5 koppelingen gemigreerd');
  ok((await q(`select count(*)::int n from bak_tkx3_sessions`))[0].n === 4 && (await q(`select count(*)::int n from bak_tkx3_exercise_goals`))[0].n === 3, 'A10: back-up van verplaatste sessies en doelen');

  console.log('\nB. Herhaalbaar (achterblijver uit de wachtrij)');
  await db.exec(`insert into sessions values ('00000000-0000-0000-0000-000000000007','${O}','TK-000199',0,20,3,null,null)`);
  await run(APPLY);
  ok((await q(`select exercise_id from sessions where id='00000000-0000-0000-0000-000000000007'`))[0].exercise_id === 'TKC-000199', 'B1: tweede run verplaatst de achterblijver');
  ok((await q(`select count(*)::int n from exercise_goals where user_id='${O}'`))[0].n === 2, 'B2: tweede run maakt geen extra doelen');

  console.log('\nC. Controles stoppen een foute portie');
  let refused = false;
  try { await db.exec(`begin; select set_config('tk.exlink_owner','${O}',true); create temp table _p3_map (exercise_id text primary key, catalog_id text not null) on commit drop; insert into _p3_map values ('bestaat_niet','TK-000001'); ${APPLY} commit;`); } catch (_) { refused = true; await db.exec('rollback'); }
  ok(refused, 'C1: id zonder koppeling van de eigenaar → geweigerd, niets gewijzigd');
  refused = false;
  try { await db.exec(`begin; create temp table _p3_map (exercise_id text primary key, catalog_id text not null) on commit drop; insert into _p3_map values ('TK-000147','TK-000147'); ${APPLY} commit;`); } catch (_) { refused = true; await db.exec('rollback'); }
  ok(refused, 'C2: zonder eigenaar → geweigerd');

  console.log('\nD. Terugdraaien');
  await run(REVERSE);
  ok((await q(`select count(*)::int n from sessions where user_id='${O}' and exercise_id like 'TK-%'`))[0].n === 5 && (await q(`select count(*)::int n from sessions where exercise_id='TKC-000180'`))[0].n === 1, 'D1: alle 5 verplaatste sessies terug op het oude id (incl. achterblijver); de al bestaande TKC-sessie blijft');
  ok((await q(`select count(*)::int n from exercise_goals where user_id='${O}' and exercise_id like 'TK-%'`))[0].n === 2 && (await q(`select pr::int from exercise_goals where user_id='${O}' and exercise_id='TKC-000191'`))[0].pr === 62, 'D2: doelen hersteld zoals vóór de migratie');
  ok((await q(`select count(*)::int n from exercise_catalog_links where migrated_at is not null`))[0].n === 0 && (await q(`select count(*)::int n from exercises where id in ('TK-000147','TK-000199','TK-000052','TK-000180') and active`))[0].n === 4, 'D3: koppelingen en actief-stand hersteld');

  console.log('\n[DEC-EXLINK-005] fase 3b portiescript: ' + checks + ' checks geslaagd');
})().catch(e => { console.error(e); process.exit(1); });
