#!/usr/bin/env node
/* DEC-EXLINK-001 fase 1 — bouwt apply.sql en reverse.sql uit mapping.json.
 *
 *   node tools/tk-exlink-fase1/build.cjs          → schrijft apply.sql + reverse.sql
 *   node tools/tk-exlink-fase1/build.cjs --check  → faalt als de bestanden niet overeenkomen
 *
 * De scripts bevatten GEEN account-id. De eigenaar wordt bij uitvoering meegegeven:
 *   begin;
 *   select set_config('tk.exlink_owner', '<uuid eigenaar>', true);
 *   <inhoud apply.sql>
 *   commit;   -- of rollback; voor een proefrun
 */
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const MAP = JSON.parse(fs.readFileSync(path.join(DIR, 'mapping.json'), 'utf8'));
const TAG = 'tkx20261114';

// ── validatie van de mapping zelf ─────────────────────────────────────────────
const ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
const CAT_RE = /^TK-[0-9]{6}$/;
const links = MAP.links;
const byId = new Map();
for (const l of links) {
  if (!ID_RE.test(l.exercise_id)) throw new Error('ongeldige exercise_id ' + l.exercise_id);
  if (!CAT_RE.test(l.catalog_id)) throw new Error('ongeldige catalog_id ' + l.catalog_id);
  if (byId.has(l.exercise_id)) throw new Error('dubbele exercise_id ' + l.exercise_id);
  if (l.hidden && l.merged_into) throw new Error('hidden én merged ' + l.exercise_id);
  byId.set(l.exercise_id, l);
}
for (const l of links) {
  if (!l.merged_into) continue;
  const t = byId.get(l.merged_into);
  if (!t || t.merged_into || t.hidden) throw new Error('doel van ' + l.exercise_id + ' is geen gewone koppeling');
  if (t.catalog_id !== l.catalog_id) throw new Error('doel van ' + l.exercise_id + ' heeft ander catalogusitem');
  if (l.race_infrastructure || t.race_infrastructure) throw new Error('race-onderdeel mag niet samengevoegd worden: ' + l.exercise_id);
}
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const values = links.map((l) =>
  `  (${q(l.exercise_id)}, ${q(l.catalog_id)}, ${l.merged_into ? q(l.merged_into) : 'null'}, ${l.hidden ? 'true' : 'false'})`
).join(',\n');

// Tabellen met een gewone exercise_id-kolom, per eigenaar.
const REF = [
  ['sessions', 'user_id'], ['program_block_exercises', 'user_id'], ['training_exercises', 'user_id'],
  ['custom_training_exercises', 'user_id'], ['race_segments', 'user_id'], ['goals', 'user_id']
];
// JSON-kolommen met id-verwijzingen (alleen string-waarden die exact een samengevoegde id zijn).
const JSONT = [
  ['training_instances', 'snapshot', 'user_id', 'id'],
  ['planned_training_occurrences', 'definition_snapshot', 'creator_user_id', 'id'],
  ['program_regeneration_log', 'replaced_blocks_snapshot', 'user_id', 'id'],
  ['custom_trainings', 'metadata', 'user_id', 'id'],
  ['training_context', 'avoid_exercises', 'user_id', 'user_id']
];
// Tabellen die per groep (doel + samengevoegd) volledig worden geback-upt.
const GROUP = [['exercise_goals', 'id'], ['exercise_equipment', 'id'], ['exercise_favorites', 'exercise_id']];
const bak = (t) => `public.bak_${TAG}_${t}`;
const allBak = [...REF.map((r) => r[0]), ...JSONT.map((r) => r[0]), ...GROUP.map((r) => r[0]), 'exercises', 'exercise_catalog_links'];

const HEADER = `-- GEGENEREERD door tools/tk-exlink-fase1/build.cjs uit mapping.json (${MAP.decision}). Niet met de hand wijzigen.`;

const PRELUDE = `${HEADER}
-- Vereist: transactie + set_config('tk.exlink_owner', '<uuid>', true) vooraf (zie build.cjs).
create temp table if not exists _tkx_map (
  exercise_id text primary key, catalog_id text not null, merged_into text, hidden boolean not null
) on commit drop;
truncate _tkx_map;
insert into _tkx_map (exercise_id, catalog_id, merged_into, hidden) values
${values};
`;

const apply = `${PRELUDE}
-- Groepen: per doel de doel-id plus de samengevoegde id's.
create temp table if not exists _tkx_grp (target text not null, exercise_id text not null, primary key (target, exercise_id)) on commit drop;
truncate _tkx_grp;
insert into _tkx_grp select merged_into, merged_into from _tkx_map where merged_into is not null group by merged_into
  union select merged_into, exercise_id from _tkx_map where merged_into is not null;
create temp table if not exists _tkx_pre (k text primary key, v numeric) on commit drop;
truncate _tkx_pre;
create temp table if not exists _tkx_report (ord int, k text, v text) on commit drop;
truncate _tkx_report;

-- Herschrijft id-verwijzingen (recursief): string-waarden onder de sleutels exercise_id en id, en de
-- elementen van een skipped-lijst, die exact een samengevoegde id zijn. Overige JSON blijft gelijk.
create or replace function pg_temp.tkx_map1(v jsonb) returns jsonb language sql stable as $f$
  select case when jsonb_typeof(v) = 'string'
    then coalesce((select to_jsonb(m.merged_into) from _tkx_map m where m.merged_into is not null and m.exercise_id = (v #>> '{}')), v)
    else v end
$f$;
create or replace function pg_temp.tkx_rw(j jsonb) returns jsonb language sql stable as $f$
  select case jsonb_typeof(j)
    when 'object' then coalesce((select jsonb_object_agg(e.k,
        case when e.k in ('exercise_id', 'id') then pg_temp.tkx_map1(e.v)
             when e.k = 'skipped' and jsonb_typeof(e.v) = 'array'
               then coalesce((select jsonb_agg(pg_temp.tkx_map1(a.v) order by a.o) from jsonb_array_elements(e.v) with ordinality as a(v, o)), '[]'::jsonb)
             else pg_temp.tkx_rw(e.v) end) from jsonb_each(j) as e(k, v)), '{}'::jsonb)
    when 'array' then coalesce((select jsonb_agg(pg_temp.tkx_rw(a.v) order by a.o) from jsonb_array_elements(j) with ordinality as a(v, o)), '[]'::jsonb)
    else j end
$f$;
-- Aantal id-verwijzingen (zelfde regel als tkx_rw) naar een samengevoegde id.
create or replace function pg_temp.tkx_hit1(v jsonb) returns bigint language sql stable as $f$
  select case when jsonb_typeof(v) = 'string'
    then (select count(*) from _tkx_map m where m.merged_into is not null and m.exercise_id = (v #>> '{}'))
    else 0::bigint end
$f$;
create or replace function pg_temp.tkx_hits(j jsonb) returns bigint language sql stable as $f$
  select case jsonb_typeof(j)
    when 'object' then coalesce((select sum(
        case when e.k in ('exercise_id', 'id') then pg_temp.tkx_hit1(e.v)
             when e.k = 'skipped' and jsonb_typeof(e.v) = 'array'
               then coalesce((select sum(pg_temp.tkx_hit1(a.v)) from jsonb_array_elements(e.v) as a(v)), 0)
             else pg_temp.tkx_hits(e.v) end) from jsonb_each(j) as e(k, v)), 0)::bigint
    when 'array' then coalesce((select sum(pg_temp.tkx_hits(a.v)) from jsonb_array_elements(j) as a(v)), 0)::bigint
    else 0::bigint end
$f$;

-- Back-uptabellen (eenmalig aangemaakt, deny-all RLS zoals bak_p_*).
${allBak.map((t) => `create table if not exists ${bak(t)} (like public.${t});
alter table ${bak(t)} enable row level security;
revoke all on ${bak(t)} from public, anon, authenticated;`).join('\n')}

do $tkx$
declare
  v_owner uuid := nullif(current_setting('tk.exlink_owner', true), '')::uuid;
  v_n bigint; v_m bigint; r record; v_bad text;
begin
  -- ── 0. Voorwaarden ──────────────────────────────────────────────────────────
  if v_owner is null then raise exception 'TKX: tk.exlink_owner ontbreekt'; end if;
  if not exists (select 1 from auth.users where id = v_owner) then raise exception 'TKX: eigenaar onbekend'; end if;
  select string_agg(x.id, ',') into v_bad from (
    select exercise_id id from _tkx_map union select merged_into from _tkx_map where merged_into is not null) x
    where not exists (select 1 from public.exercises e where e.id = x.id);
  if v_bad is not null then raise exception 'TKX: onbekende oefening(en): %', v_bad; end if;
  select string_agg(m.catalog_id, ',') into v_bad from (select distinct catalog_id from _tkx_map) m
    where not exists (select 1 from public.movekit_catalog_fk_bindings b where b.catalog_id = m.catalog_id);
  if v_bad is not null then raise exception 'TKX: onbekend MoveKit-item: %', v_bad; end if;
  select string_agg(e.id, ',') into v_bad from public.exercises e join _tkx_map m on m.exercise_id = e.id
    where m.merged_into is not null and e.scope = 'personal' and e.created_by is distinct from v_owner;
  if v_bad is not null then raise exception 'TKX: eigen oefening(en) van een ander account: %', v_bad; end if;

  -- ── 1. Meetwaarden vooraf ───────────────────────────────────────────────────
${REF.map(([t, o]) => `  insert into _tkx_pre select 'own:${t}', count(*) from public.${t} where ${o} = v_owner;
  insert into _tkx_pre select 'foreign:${t}', count(*) from public.${t} t join _tkx_map m on m.exercise_id = t.exercise_id where t.${o} is distinct from v_owner;`).join('\n')}
  insert into _tkx_pre select 'foreign:exercise_goals', count(*) from public.exercise_goals g join _tkx_map m on m.exercise_id = g.exercise_id where g.user_id is distinct from v_owner;
  insert into _tkx_pre select 'foreign:exercise_equipment', count(*) from public.exercise_equipment g join _tkx_map m on m.exercise_id = g.exercise_id where g.user_id is distinct from v_owner;
  insert into _tkx_pre select 'foreign:exercises_active', count(*) from public.exercises e join _tkx_map m on m.exercise_id = e.id where e.active and not (e.scope = 'personal' and e.created_by = v_owner);
  -- Per doelgroep: aantal sessies en een controlegetal over de gelogde waarden.
  insert into _tkx_pre select 'grp_n:' || g.target, count(s.id) from _tkx_grp g left join public.sessions s on s.exercise_id = g.exercise_id and s.user_id = v_owner group by g.target;
  insert into _tkx_pre select 'grp_sum:' || g.target,
      coalesce(sum(coalesce(s.weight, 0) * coalesce(s.reps, 0) * coalesce(s.sets, 1) + coalesce(s.distance, 0) + coalesce(s.duration_s, 0)), 0)
    from _tkx_grp g left join public.sessions s on s.exercise_id = g.exercise_id and s.user_id = v_owner group by g.target;
  -- Verwachte doelen per groep: hoogste waarde per veld (eigenaarsbesluit 14-11-2026).
  create temp table if not exists _tkx_goal on commit drop as
    select g.target, max(eg.pr) pr, max(eg.one_rm) one_rm, max(eg.peak_goal) peak_goal,
           (array_agg(eg.updated_at order by eg.one_rm desc nulls last, eg.updated_at desc nulls last))[1] one_rm_at,
           count(eg.id) n
      from _tkx_grp g join public.exercise_goals eg on eg.exercise_id = g.exercise_id and eg.user_id = v_owner
      group by g.target;

  -- ── 2. Back-up (alleen rijen die nog niet geback-upt zijn) ─────────────────
${REF.map(([t, o]) => `  insert into ${bak(t)} select t.* from public.${t} t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null
    where t.${o} = v_owner and not exists (select 1 from ${bak(t)} b where b.id = t.id);`).join('\n')}
${JSONT.map(([t, c, o, pk]) => `  insert into ${bak(t)} select t.* from public.${t} t
    where t.${o} = v_owner and t.${c} is not null and pg_temp.tkx_hits(t.${c}) > 0 and not exists (select 1 from ${bak(t)} b where b.${pk} = t.${pk});`).join('\n')}
${GROUP.map(([t, pk]) => `  insert into ${bak(t)} select t.* from public.${t} t join _tkx_grp g on g.exercise_id = t.exercise_id
    where t.user_id = v_owner and not exists (select 1 from ${bak(t)} b where b.${pk} = t.${pk});`).join('\n')}
  insert into ${bak('exercises')} select e.* from public.exercises e join _tkx_map m on m.exercise_id = e.id
    where not exists (select 1 from ${bak('exercises')} b where b.id = e.id);
  insert into ${bak('exercises')} select e.* from public.exercises e join _tkx_map m on m.exercise_id = e.ratio_anchor and m.merged_into is not null
    where e.scope = 'personal' and e.created_by = v_owner and not exists (select 1 from ${bak('exercises')} b where b.id = e.id);
  insert into ${bak('exercise_catalog_links')} select l.* from public.exercise_catalog_links l join _tkx_map m on m.exercise_id = l.exercise_id
    where l.user_id = v_owner and not exists (select 1 from ${bak('exercise_catalog_links')} b where b.user_id = l.user_id and b.exercise_id = l.exercise_id);

  -- ── 3. Verwijzingen omzetten naar het doel (alleen deze eigenaar) ──────────
${REF.map(([t, o]) => `  update public.${t} t set exercise_id = m.merged_into from _tkx_map m
    where m.exercise_id = t.exercise_id and m.merged_into is not null and t.${o} = v_owner;`).join('\n')}
${JSONT.map(([t, c, o]) => `  update public.${t} t set ${c} = pg_temp.tkx_rw(t.${c})
    where t.${o} = v_owner and t.${c} is not null and pg_temp.tkx_hits(t.${c}) > 0;`).join('\n')}
  update public.exercises e set ratio_anchor = m.merged_into from _tkx_map m
    where m.exercise_id = e.ratio_anchor and m.merged_into is not null and e.scope = 'personal' and e.created_by = v_owner;

  -- ── 4. Doelen samenvoegen: hoogste waarde per veld op het doel ─────────────
  for r in select * from _tkx_goal loop
    if exists (select 1 from public.exercise_goals where user_id = v_owner and exercise_id = r.target) then
      update public.exercise_goals set pr = r.pr, one_rm = r.one_rm, peak_goal = r.peak_goal,
             updated_at = case when r.one_rm is not null then coalesce(r.one_rm_at, updated_at) else updated_at end
       where user_id = v_owner and exercise_id = r.target
         and (pr, one_rm, peak_goal) is distinct from (r.pr, r.one_rm, r.peak_goal);
    else
      insert into public.exercise_goals (user_id, exercise_id, pr, one_rm, peak_goal, updated_at)
      values (v_owner, r.target, r.pr, r.one_rm, r.peak_goal, coalesce(r.one_rm_at, now()));
    end if;
  end loop;
  delete from public.exercise_goals g using _tkx_map m
   where g.exercise_id = m.exercise_id and m.merged_into is not null and g.user_id = v_owner;

  -- ── 5. Uitrusting en favorieten: verplaatsen, dubbelen vervallen (geback-upt) ─
  delete from public.exercise_equipment q using _tkx_map m
   where q.exercise_id = m.exercise_id and m.merged_into is not null and q.user_id = v_owner
     and exists (select 1 from public.exercise_equipment d where d.exercise_id = m.merged_into and d.user_id = v_owner
                 and d.label is not distinct from q.label and d.value is not distinct from q.value);
  update public.exercise_equipment q set exercise_id = m.merged_into from _tkx_map m
   where q.exercise_id = m.exercise_id and m.merged_into is not null and q.user_id = v_owner;
  delete from public.exercise_favorites f using _tkx_map m
   where f.exercise_id = m.exercise_id and m.merged_into is not null and f.user_id = v_owner
     and exists (select 1 from public.exercise_favorites d where d.exercise_id = m.merged_into);
  update public.exercise_favorites f set exercise_id = m.merged_into from _tkx_map m
   where f.exercise_id = m.exercise_id and m.merged_into is not null and f.user_id = v_owner;

  -- ── 6. Samengevoegde eigen oefeningen op inactief (niet verwijderen) ───────
  update public.exercises e set active = false from _tkx_map m
   where m.exercise_id = e.id and m.merged_into is not null and e.scope = 'personal' and e.created_by = v_owner and e.active;

  -- ── 7. Koppelingen vastleggen ──────────────────────────────────────────────
  insert into public.exercise_catalog_links (user_id, exercise_id, catalog_id, merged_into, hidden)
    select v_owner, exercise_id, catalog_id, merged_into, hidden from _tkx_map
  on conflict (user_id, exercise_id) do update
    set catalog_id = excluded.catalog_id, merged_into = excluded.merged_into, hidden = excluded.hidden;

  -- ── 8. Controles achteraf (fout = alles terug) ─────────────────────────────
${REF.map(([t, o]) => `  select count(*) into v_n from public.${t} where ${o} = v_owner;
  if v_n <> (select v from _tkx_pre where k = 'own:${t}') then raise exception 'TKX: aantal rijen ${t} gewijzigd'; end if;
  select count(*) into v_n from public.${t} t join _tkx_map m on m.exercise_id = t.exercise_id where t.${o} is distinct from v_owner;
  if v_n <> (select v from _tkx_pre where k = 'foreign:${t}') then raise exception 'TKX: rijen van andere accounts in ${t} geraakt'; end if;
  select count(*) into v_n from public.${t} t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null where t.${o} = v_owner;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in ${t} niet omgezet', v_n; end if;`).join('\n')}
${JSONT.map(([t, c, o]) => `  select coalesce(sum(pg_temp.tkx_hits(${c})), 0) into v_n from public.${t} where ${o} = v_owner and ${c} is not null;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in ${t}.${c} niet omgezet', v_n; end if;`).join('\n')}
  select count(*) into v_n from public.exercise_goals g join _tkx_map m on m.exercise_id = g.exercise_id where g.user_id is distinct from v_owner;
  if v_n <> (select v from _tkx_pre where k = 'foreign:exercise_goals') then raise exception 'TKX: doelen van andere accounts geraakt'; end if;
  select count(*) into v_n from public.exercise_equipment g join _tkx_map m on m.exercise_id = g.exercise_id where g.user_id is distinct from v_owner;
  if v_n <> (select v from _tkx_pre where k = 'foreign:exercise_equipment') then raise exception 'TKX: uitrusting van andere accounts geraakt'; end if;
  select count(*) into v_n from public.exercises e join _tkx_map m on m.exercise_id = e.id where e.active and not (e.scope = 'personal' and e.created_by = v_owner);
  if v_n <> (select v from _tkx_pre where k = 'foreign:exercises_active') then raise exception 'TKX: gedeelde oefening gewijzigd'; end if;
  for r in select g.target,
      count(s.id) n,
      coalesce(sum(coalesce(s.weight, 0) * coalesce(s.reps, 0) * coalesce(s.sets, 1) + coalesce(s.distance, 0) + coalesce(s.duration_s, 0)), 0) sm
    from _tkx_grp g left join public.sessions s on s.exercise_id = g.exercise_id and s.user_id = v_owner group by g.target loop
    if r.n <> (select v from _tkx_pre where k = 'grp_n:' || r.target) or r.sm <> (select v from _tkx_pre where k = 'grp_sum:' || r.target) then
      raise exception 'TKX: sessies van groep % niet volledig behouden', r.target;
    end if;
    select count(*) into v_m from public.sessions s join _tkx_grp g on g.exercise_id = s.exercise_id and g.target = r.target
      where s.user_id = v_owner and s.exercise_id <> r.target;
    if v_m <> 0 then raise exception 'TKX: groep % heeft nog sessies op samengevoegde id', r.target; end if;
  end loop;
  for r in select * from _tkx_goal loop
    if not exists (select 1 from public.exercise_goals g where g.user_id = v_owner and g.exercise_id = r.target
                   and g.pr is not distinct from r.pr and g.one_rm is not distinct from r.one_rm and g.peak_goal is not distinct from r.peak_goal) then
      raise exception 'TKX: doelen van % niet de hoogste waarde', r.target;
    end if;
  end loop;
  select count(*) into v_n from public.exercise_goals g join _tkx_map m on m.exercise_id = g.exercise_id and m.merged_into is not null where g.user_id = v_owner;
  if v_n <> 0 then raise exception 'TKX: doelen op samengevoegde id over'; end if;
  select count(*) into v_n from public.exercises e join _tkx_map m on m.exercise_id = e.id and m.merged_into is not null
    where e.scope = 'personal' and e.created_by = v_owner and e.active;
  if v_n <> 0 then raise exception 'TKX: samengevoegde eigen oefening nog actief'; end if;
  select count(*) into v_n from public.exercise_catalog_links l join _tkx_map m
      on m.exercise_id = l.exercise_id and m.catalog_id = l.catalog_id
     and m.merged_into is not distinct from l.merged_into and m.hidden = l.hidden
    where l.user_id = v_owner;
  if v_n <> (select count(*) from _tkx_map) then raise exception 'TKX: koppelingen onvolledig'; end if;

  -- ── 9. Verslag ─────────────────────────────────────────────────────────────
  insert into _tkx_report values
    (1, 'eigenaar_sessies', (select v from _tkx_pre where k = 'own:sessions')::text),
    (2, 'koppelingen', (select count(*) from _tkx_map)::text),
    (3, 'samengevoegd', (select count(*) from _tkx_map where merged_into is not null)::text),
    (4, 'verborgen_race', (select count(*) from _tkx_map where hidden)::text),
    (5, 'doelgroepen', (select count(distinct target) from _tkx_grp)::text),
    (6, 'doelen_samengevoegd', (select count(*) from _tkx_goal)::text),
    (7, 'controles', 'geslaagd');
end $tkx$;

select k, v from _tkx_report order by ord;
`;

// ── Terugdraaien ─────────────────────────────────────────────────────────────
const reverse = `${PRELUDE}
create temp table if not exists _tkx_grp (target text not null, exercise_id text not null, primary key (target, exercise_id)) on commit drop;
truncate _tkx_grp;
insert into _tkx_grp select merged_into, merged_into from _tkx_map where merged_into is not null group by merged_into
  union select merged_into, exercise_id from _tkx_map where merged_into is not null;

-- Herstelt de stand van vóór apply.sql uit de back-ups. Rijen die NA apply op een doel zijn
-- gelogd blijven op het doel staan; doelen (PR/1RM/piekdoel) gaan terug naar de back-up.
do $tkx$
declare
  v_owner uuid := nullif(current_setting('tk.exlink_owner', true), '')::uuid;
  v_n bigint;
begin
  if v_owner is null then raise exception 'TKX: tk.exlink_owner ontbreekt'; end if;
  if to_regclass('${bak('sessions')}') is null then raise exception 'TKX: geen back-up gevonden'; end if;
${REF.map(([t, o]) => `  update public.${t} t set exercise_id = b.exercise_id from ${bak(t)} b
   where b.id = t.id and b.${o} = v_owner and t.exercise_id is distinct from b.exercise_id;`).join('\n')}
${JSONT.map(([t, c, o, pk]) => `  update public.${t} t set ${c} = b.${c} from ${bak(t)} b
   where b.${pk} = t.${pk} and b.${o} = v_owner and t.${c} is distinct from b.${c};`).join('\n')}
  -- exercise_goals: doelrijen terug naar back-up, nieuw aangemaakte doelrijen weg, verwijderde terug.
  delete from public.exercise_goals g using _tkx_grp x
   where g.exercise_id = x.exercise_id and g.user_id = v_owner and not exists (select 1 from ${bak('exercise_goals')} b where b.id = g.id);
  update public.exercise_goals g set pr = b.pr, one_rm = b.one_rm, peak_goal = b.peak_goal, updated_at = b.updated_at, exercise_id = b.exercise_id
    from ${bak('exercise_goals')} b where b.id = g.id and b.user_id = v_owner;
  insert into public.exercise_goals overriding system value
    select b.* from ${bak('exercise_goals')} b where b.user_id = v_owner and not exists (select 1 from public.exercise_goals g where g.id = b.id);
  -- uitrusting en favorieten: groepsrijen van deze eigenaar exact terug naar de back-up.
  delete from public.exercise_equipment q using _tkx_grp x
   where q.exercise_id = x.exercise_id and q.user_id = v_owner and not exists (select 1 from ${bak('exercise_equipment')} b where b.id = q.id);
  update public.exercise_equipment q set exercise_id = b.exercise_id from ${bak('exercise_equipment')} b where b.id = q.id and b.user_id = v_owner;
  insert into public.exercise_equipment select b.* from ${bak('exercise_equipment')} b
   where b.user_id = v_owner and not exists (select 1 from public.exercise_equipment q where q.id = b.id);
  delete from public.exercise_favorites f using _tkx_grp x
   where f.exercise_id = x.exercise_id and f.user_id = v_owner and not exists (select 1 from ${bak('exercise_favorites')} b where b.exercise_id = f.exercise_id);
  insert into public.exercise_favorites select b.* from ${bak('exercise_favorites')} b
   where b.user_id = v_owner and not exists (select 1 from public.exercise_favorites f where f.exercise_id = b.exercise_id);
  -- oefeningen: actief-stand en ratio-anker terug.
  update public.exercises e set active = b.active, ratio_anchor = b.ratio_anchor from ${bak('exercises')} b
   where b.id = e.id and (e.active, e.ratio_anchor) is distinct from (b.active, b.ratio_anchor)
     and e.scope = 'personal' and e.created_by = v_owner;
  -- koppelingen: weg, en een eventuele eerdere stand terug.
  delete from public.exercise_catalog_links l using _tkx_map m where l.exercise_id = m.exercise_id and l.user_id = v_owner;
  insert into public.exercise_catalog_links select b.* from ${bak('exercise_catalog_links')} b where b.user_id = v_owner
    on conflict do nothing;
  -- controle: geen rij wijkt nog af van de back-up.
${REF.map(([t, o]) => `  select count(*) into v_n from public.${t} t join ${bak(t)} b on b.id = t.id where b.${o} = v_owner and t.exercise_id is distinct from b.exercise_id;
  if v_n <> 0 then raise exception 'TKX-REVERSE: ${t} niet hersteld'; end if;`).join('\n')}
  raise notice 'TKX-REVERSE: hersteld';
end $tkx$;
`;

const out = { 'apply.sql': apply, 'reverse.sql': reverse };
if (process.argv.includes('--check')) {
  let bad = 0;
  for (const [f, c] of Object.entries(out)) {
    const cur = fs.existsSync(path.join(DIR, f)) ? fs.readFileSync(path.join(DIR, f), 'utf8') : '';
    if (cur !== c) { console.error('VEROUDERD: ' + f + ' — draai node tools/tk-exlink-fase1/build.cjs'); bad++; }
  }
  process.exit(bad ? 1 : 0);
}
for (const [f, c] of Object.entries(out)) fs.writeFileSync(path.join(DIR, f), c);
console.log('geschreven: apply.sql, reverse.sql (' + links.length + ' koppelingen)');
module.exports = { apply, reverse };
