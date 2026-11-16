-- DEC-EXLINK-005 fase 3b — portie 4: hoofdliften (gedeelde, globale oefeningsrijen; E = C).
-- Alleen de data van de eigenaar verhuist (85 sessies, 6 doelen); de globale rijen en de programma's
-- van andere accounts blijven ongemoeid. Programmaregels van de eigenaar dragen al het catalogus-id.
create temp table if not exists _p3_map (exercise_id text primary key, catalog_id text not null) on commit drop;
insert into _p3_map (exercise_id, catalog_id) values
  ('TK-000019','TK-000019'),  -- Barbell Bench Press
  ('TK-000020','TK-000020'),  -- Barbell Bent Over Row
  ('TK-000024','TK-000024'),  -- Barbell Deadlift
  ('TK-000030','TK-000030'),  -- Barbell Overhead Press
  ('TK-000038','TK-000038'),  -- Barbell Squat
  ('TK-000192','TK-000192')   -- Machine Seated Cable Row
on conflict do nothing;
