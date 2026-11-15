-- DEC-EXLINK-005 fase 3b — portie 2: 32 gekoppelde oefeningen zonder sessies en zonder programma-/trainingsregels.
-- 30 met een eigen id (E ≠ C: verwijzingen in favorieten en snapshots worden omgezet), 2 met E = C.
-- Race-oefeningen (hyrox_run, triathlon_fietsen) zitten er bewust niet in.
create temp table if not exists _p3_map (exercise_id text primary key, catalog_id text not null) on commit drop;
insert into _p3_map (exercise_id, catalog_id) values
  ('bicep_curl_bb','TK-000023'), ('bounding','TK-000279'), ('box_squat','TK-000047'), ('boxjump','TK-000057'),
  ('burpee','TK-000059'), ('burpee_broadjump','TK-000282'), ('cleanjerk','TK-000257'), ('deadlift_sumo','TK-000539'),
  ('doubleunders','TK-000381'), ('duurloop','TK-000401'), ('interval_400','TK-000461'), ('kb_cleanpress','TK-000310'),
  ('kb_goblet','TK-000383'), ('kb_swing','TK-000173'), ('kb_tgu','TK-000387'), ('kb_windmill','TK-000175'),
  ('muscleup','TK-000421'), ('pullup_strict','TK-000198'), ('sandbag_lunges','TK-000177'), ('sledpull','TK-000506'),
  ('sledpush','TK-000507'), ('snatch','TK-000035'), ('swim_rug','TK-000241'), ('swim_school','TK-000281'),
  ('swim_vlinder','TK-000284'), ('swim_vrij','TK-000350'), ('tempo_run','TK-000544'), ('thruster','TK-000041'),
  ('toestobar','TK-000547'), ('wall_ball','TK-000566'), ('TK-000002','TK-000002'), ('TK-000105','TK-000105')
on conflict do nothing;
