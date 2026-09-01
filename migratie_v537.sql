-- migratie_v537.sql
-- B9-10 -- Nutrition Product: P0-fix voor foreign training-link spoofing.
--
-- ZELF GEVONDEN, KRITIEK GAT (sectie 32 van de B9-10-opdracht): de
-- oorspronkelijke insert/update-policies uit migratie_v536.sql
-- controleerden uitsluitend user_id = auth.uid() op de nutrition_entry
-- zelf -- niet of een meegegeven training_instance_id/activity_id ook
-- daadwerkelijk van dezelfde gebruiker was. Live bevestigd: user B kon
-- een training_instance_id van user A koppelen aan zijn eigen entry
-- (de foreign-key-constraint controleert alleen "bestaat dit record",
-- niet "is dit van mij"). Gecorrigeerd door de policies te vervangen
-- met een expliciete ownership-check op beide optionele koppelingen.
drop policy if exists nutrition_entries_insert_own on public.nutrition_entries;
drop policy if exists nutrition_entries_update_own on public.nutrition_entries;

create policy nutrition_entries_insert_own on public.nutrition_entries
  for insert with check (
    user_id = auth.uid()
    and (training_instance_id is null or exists (select 1 from public.training_instances ti where ti.id = training_instance_id and ti.user_id = auth.uid()))
    and (activity_id is null or exists (select 1 from public.activities a where a.id = activity_id and a.user_id = auth.uid()))
  );

create policy nutrition_entries_update_own on public.nutrition_entries
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (training_instance_id is null or exists (select 1 from public.training_instances ti where ti.id = training_instance_id and ti.user_id = auth.uid()))
    and (activity_id is null or exists (select 1 from public.activities a where a.id = activity_id and a.user_id = auth.uid()))
  );
