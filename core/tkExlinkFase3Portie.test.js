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
      scope text not null default 'personal', active boolean default true, created_by uuid, muscle_primary text[] default '{}', muscle_secondary text[] default '{}', sports text[] default '{}', ratio_anchor text);
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
    create table public.race_segments (id bigserial primary key, user_id uuid, exercise_id text references public.exercises(id));
    create table public.goals (id bigserial primary key, user_id uuid, exercise_id text references public.exercises(id));
    create table public.training_instances (id uuid primary key, user_id uuid, snapshot jsonb);
    create table public.planned_training_occurrences (id uuid primary key, creator_user_id uuid, definition_snapshot jsonb);
    create table public.program_regeneration_log (id bigserial primary key, user_id uuid, replaced_blocks_snapshot jsonb);
    create table public.custom_trainings (id uuid primary key, user_id uuid, metadata jsonb);
    create table public.training_context (user_id uuid primary key, avoid_exercises jsonb);
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

  console.log('\nE. Eigen id (E ≠ C): verwijzingen en snapshots');
  await db.exec(`
    insert into public.exercises (id, name, scope, active, created_by) values ('kb_goblet','Goblet Squat','personal',true,'${O}'), ('front','Frontsquat','personal',true,'${O}');
    insert into public.exercises (id, name, scope, active, created_by, ratio_anchor) values ('my_split','Split Squat','personal',true,'${O}','front');
    insert into public.exercise_catalog_links (user_id, exercise_id, catalog_id) values ('${O}','kb_goblet','TK-000383'), ('${O}','front','TK-000356'), ('${O}','hyrox_run','TK-000555');
    insert into public.exercises (id, name, scope) values ('hyrox_run','HYROX Run','global');
    insert into public.sessions values ('00000000-0000-0000-0000-000000000010','${O}','front',80,5,3,null,null);
    insert into public.program_block_exercises (user_id, exercise_id) values ('${O}','front'), ('${X}','front');
    insert into public.training_exercises (user_id, exercise_id) values ('${O}','kb_goblet');
    insert into public.exercise_favorites values ('${O}','kb_goblet');
    insert into public.training_instances values ('00000000-0000-0000-0000-0000000000a1','${O}','{"items":[{"id":"kb_goblet","naam":"Goblet"},{"id":"squat"}],"skipped":["front"],"adjust":[{"type":"swap","exercise_id":"x","replacement_exercise_id":"kb_goblet"}]}');
    insert into public.training_context values ('${O}','["kb_goblet","x"]');
  `);
  const MAP2 = "create temp table if not exists _p3_map (exercise_id text primary key, catalog_id text not null) on commit drop; insert into _p3_map values ('kb_goblet','TK-000383'), ('front','TK-000356');";
  await db.exec(`begin; select set_config('tk.exlink_owner','${O}',true); ${MAP2} ${APPLY} commit;`);
  ok((await q(`select exercise_id from sessions where id='00000000-0000-0000-0000-000000000010'`))[0].exercise_id === 'TKC-000356', 'E1: sessie op het MoveKit-id');
  ok((await q(`select count(*)::int n from program_block_exercises where user_id='${O}' and exercise_id='TK-000356'`))[0].n === 1 && (await q(`select exercise_id from program_block_exercises where user_id='${X}'`))[0].exercise_id === 'front', 'E2: programmaregel van de eigenaar naar het catalogus-id; die van een ander niet');
  ok((await q(`select exercise_id from training_exercises where user_id='${O}'`))[0].exercise_id === 'TK-000383' && (await q(`select exercise_id from exercise_favorites where user_id='${O}'`))[0].exercise_id === 'TK-000383', 'E3: trainingsregel en favoriet omgezet');
  const snap = (await q(`select snapshot from training_instances where id='00000000-0000-0000-0000-0000000000a1'`))[0].snapshot;
  ok(snap.items[0].id === 'TK-000383' && snap.items[0].naam === 'Goblet' && snap.items[1].id === 'squat' && snap.skipped[0] === 'TK-000356' && snap.adjust[0].replacement_exercise_id === 'TK-000383' && snap.adjust[0].exercise_id === 'x', 'E4: snapshot herschreven (id, skipped, replacement_exercise_id), rest ongewijzigd');
  ok(JSON.stringify((await q(`select avoid_exercises a from training_context where user_id='${O}'`))[0].a) === '["TK-000383","x"]', 'E5: te vermijden oefeningen omgezet');
  ok((await q(`select ratio_anchor from exercises where id='my_split'`))[0].ratio_anchor === 'TK-000356', 'E6: ratio-anker omgezet');
  const fk = await q(`select id, active, scope from exercises where id in ('TK-000383','TK-000356') order by id`);
  ok(fk.length === 2 && fk.every(r => r.active === false && r.scope === 'personal'), 'E7: inactieve FK-rij voor het catalogus-id aangemaakt');
  ok((await q(`select count(*)::int n from exercises where id in ('kb_goblet','front') and active`))[0].n === 0, 'E8: eigen oefeningen inactief');
  await db.exec(`begin; select set_config('tk.exlink_owner','${O}',true); ${MAP2} ${REVERSE} commit;`);
  const snap2 = (await q(`select snapshot from training_instances where id='00000000-0000-0000-0000-0000000000a1'`))[0].snapshot;
  ok(snap2.items[0].id === 'kb_goblet' && (await q(`select exercise_id from exercise_favorites where user_id='${O}'`))[0].exercise_id === 'kb_goblet' &&
     (await q(`select count(*)::int n from program_block_exercises where exercise_id='front'`))[0].n === 2 && (await q(`select ratio_anchor from exercises where id='my_split'`))[0].ratio_anchor === 'front' &&
     (await q(`select exercise_id from sessions where id='00000000-0000-0000-0000-000000000010'`))[0].exercise_id === 'front', 'E9: terugdraaien herstelt verwijzingen, snapshot, favoriet, ratio-anker en sessie');
  let race = false;
  try { await db.exec(`begin; select set_config('tk.exlink_owner','${O}',true); create temp table _p3_map (exercise_id text primary key, catalog_id text not null) on commit drop; insert into _p3_map values ('hyrox_run','TK-000555'); ${APPLY} commit;`); } catch (_) { race = true; await db.exec('rollback'); }
  ok(race, 'E10: race-oefening wordt geweigerd');
  await db.exec(`insert into public.exercises (id, name, scope, active, created_by, type) values ('duurloop','Duurloop','personal',true,'${O}','running'), ('roeien','Roeien','personal',true,'${O}','cardio');
    insert into public.exercise_catalog_links (user_id, exercise_id, catalog_id) values ('${O}','duurloop','TK-000401'), ('${O}','roeien','TK-000458');`);
  for (const [id, cid] of [['duurloop','TK-000401'], ['roeien','TK-000458']]) {
    let refused = false;
    try { await db.exec(`begin; select set_config('tk.exlink_owner','${O}',true); create temp table _p3_map (exercise_id text primary key, catalog_id text not null) on commit drop; insert into _p3_map values ('${id}','${cid}'); ${APPLY} commit;`); } catch (_) { refused = true; await db.exec('rollback'); }
    ok(refused && (await q(`select active from exercises where id='${id}'`))[0].active === true, 'E11: cardio-oefening ' + id + ' wordt geweigerd (app herkent MoveKit-cardio nog niet)');
  }

  console.log('\n[DEC-EXLINK-005] fase 3b portiescript: ' + checks + ' checks geslaagd');
})().catch(e => { console.error(e); process.exit(1); });
