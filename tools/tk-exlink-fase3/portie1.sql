-- DEC-EXLINK-005 fase 3b — portie 1: 5 oefeningen zonder programma- of trainingsverwijzing (E = C).
create temp table if not exists _p3_map (exercise_id text primary key, catalog_id text not null) on commit drop;
insert into _p3_map (exercise_id, catalog_id) values
  ('TK-000191', 'TK-000191'),  -- Machine Pulldown (gedeelde rij blijft actief voor anderen)
  ('TK-000147', 'TK-000147'),  -- Good Mornings
  ('TK-000199', 'TK-000199'),  -- Push Up
  ('TK-000052', 'TK-000052'),  -- Bodyweight Knee Push Ups
  ('TK-000180', 'TK-000180')   -- Machine Chest Press
on conflict do nothing;
