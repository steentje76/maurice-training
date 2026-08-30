-- migratie_v508.sql
-- MS-F10-03 (Coach Programming & Assignment) -- PARTIEEL, BLOCKING GAP GEVONDEN
--
-- Dit bestand documenteert zowel het veilige, correct werkende deel
-- (coach_program_assignments als provenance-record) als een kritieke,
-- live ontdekte en direct gecorrigeerde architecturale blokkade.

create table if not exists public.coach_program_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id bigint not null references public.programs(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  athlete_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned','accepted','modified_by_athlete')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint cpa_unique_program unique (program_id)
);
comment on table public.coach_program_assignments is
  'MS-F10-03 -- provenance-record. LET OP: functioneel nog ONGEBRUIKT -- zie GAP-P2-023, de onderliggende programs-aanmaak-flow voor coaches is nog geblokkeerd door een bestaande trigger.';

alter table public.coach_program_assignments enable row level security;

create policy cpa_betrokkenen_lezen on public.coach_program_assignments
  for select using (coach_user_id = auth.uid() or athlete_user_id = auth.uid());

create policy cpa_coach_maakt_aan on public.coach_program_assignments
  for insert
  with check (
    coach_user_id = auth.uid()
    and public.coach_has_scope(auth.uid(), athlete_user_id, 'TRAINING_CORE')
  );

create policy cpa_athlete_wijzigt_status on public.coach_program_assignments
  for update
  using (athlete_user_id = auth.uid())
  with check (athlete_user_id = auth.uid());

create index if not exists idx_cpa_athlete on public.coach_program_assignments(athlete_user_id);
create index if not exists idx_cpa_coach on public.coach_program_assignments(coach_user_id);

-- ============================================================================
-- KRITIEKE, LIVE ONTDEKTE EN DIRECT GECORRIGEERDE BEVINDING (zie GAP-P2-023):
--
-- Een eerste poging om coaches toe te staan een programma AAN TE MAKEN VOOR
-- een athlete (nieuwe INSERT-policy op public.programs) BLEEK NIET TE WERKEN.
--
-- Root cause: public.programs heeft een bestaande BEFORE INSERT-trigger
-- (trg_set_user_id / set_user_id_from_auth()) die ONVOORWAARDELIJK
-- NEW.user_id := auth.uid() afdwingt. Dit is een correcte, bestaande
-- bescherming tegen user_id-spoofing, maar het overschrijft ALTIJD
-- user_id naar de coach zelf, ongeacht wat de coach opgaf.
--
-- Live adversarial bevestigd (transactie zonder commit): een coach-INSERT-
-- poging met user_id=athlete_id resulteerde in een rij met user_id=coach_id.
-- GEEN lek naar andermans data, maar de bedoelde functionaliteit werkte niet.
--
-- DIRECT GECORRIGEERD: de niet-functionerende policy is direct verwijderd,
-- om geen schijnbaar-werkende maar kapotte autorisatielaag achter te laten.
-- De bestaande eigen_data_alleen-policy op programs blijft ongewijzigd --
-- live herbevestigd identiek aan de staat vóór deze sprint.
--
-- MS-F10-03 kan pas volledig sluiten na een aparte architectuurbeslissing
-- (zie GAP-P2-023 voor de twee overwogen opties).
-- ============================================================================
drop policy if exists coach_creates_program_for_athlete on public.programs;
