-- DEC-EXLINK-005 fase 3b — portie 3: 21 eigen krachtoefeningen met sessies en/of programma-/trainingsregels.
-- Stand 16 november: 70 sessies, 110 programmaregels, 5 regels in vaste trainingen, 1 in een eigen training.
-- Buiten deze portie: hoofdliften (portie 4), cardio/WOD/carry (wachten op MoveKit-cardio in de app), races.
create temp table if not exists _p3_map (exercise_id text primary key, catalog_id text not null) on commit drop;
insert into _p3_map (exercise_id, catalog_id) values
  ('cable_fly','TK-000071'), ('calf_raise','TK-000530'), ('frontsquat','TK-000356'), ('hexabar','TK-000553'),
  ('hpc','TK-000365'), ('hps','TK-000366'), ('incline_db_press','TK-000108'), ('lat_pulldown','TK-000392'),
  ('lateral_raise','TK-000113'), ('leg_curl','TK-000404'), ('leg_press','TK-000186'), ('rdl','TK-000266'),
  ('TK-000018','TK-000018'), ('TK-000093','TK-000093'), ('TK-000106','TK-000106'), ('TK-000125','TK-000125'),
  ('TK-000179','TK-000179'), ('TK-000185','TK-000185'), ('TK-000195','TK-000195'),
  ('tricep_overhead','TK-000122'), ('tricep_pushdown','TK-000073')
on conflict do nothing;
