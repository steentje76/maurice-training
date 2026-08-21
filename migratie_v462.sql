-- migratie_v462.sql — Triathlon-brick: ontbrekende generieke catalogus-oefeningen
--
-- MASTER SPRINT v4.62.0. GEEN schemawijziging — uitsluitend drie catalogus-rijen,
-- exact hetzelfde patroon als de negen HYROX-oefeningen uit migratie_v459.sql.
--
-- Fase-1-audit vond: CARDIO_TYPES.swimming/.cycling/.running (de REKENCONFIGURATIE)
-- bestaat al volledig, maar er is geen enkele bestaande exercises-rij met
-- type='swimming'/'cycling'/'running' om een triathlon-segment aan te koppelen —
-- sessions.exercise_id heeft een FK-constraint naar exercises.id, dus zonder deze
-- rijen kan geen enkel triathlon-segment worden opgeslagen. Dit is ontdekt tijdens
-- de implementatie van v4.62.0 en hier expliciet gerapporteerd, niet stilzwijgend
-- opgelost met een geïmproviseerde workaround.
--
-- Zelfde beveiligingstrigger als bij v459 (trg_set_exercise_scope_context, sinds
-- migratie v333): scope='global' vereist gym_role_level >= 3 via auth.uid(). De
-- Supabase SQL-editor heeft geen ingelogde sessie — draai dit net als v459 met de
-- trigger tijdelijk uitgeschakeld, direct weer aan na de insert.
--
-- Idempotent (`on conflict do nothing`), geen DROP, geen bestaande data gewijzigd.

alter table public.exercises disable trigger trg_set_exercise_scope_context;

insert into public.exercises (id, name, category, type, pr, sort_order, active, scope)
values
  ('triathlon_zwemmen',  'Zwemmen (triathlon)',  'C', 'swimming', null, 110, true, 'global'),
  ('triathlon_fietsen',  'Fietsen (triathlon)',  'C', 'cycling',  null, 111, true, 'global'),
  ('triathlon_hardlopen','Hardlopen (triathlon)','C', 'running',  null, 112, true, 'global')
on conflict (id) do nothing;

alter table public.exercises enable trigger trg_set_exercise_scope_context;

-- Verificatie (leest alleen)
select id, name, category, type, sort_order
from public.exercises
where id like 'triathlon_%'
order by sort_order;

select tgname, tgenabled
from pg_trigger
where tgname = 'trg_set_exercise_scope_context';
