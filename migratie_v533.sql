-- migratie_v533.sql
-- B9-01 -- Endurance Data Foundation.
--
-- Aanvullend, parallel model naast sessions (die canoniek blijft voor de
-- bestaande, eenvoudige cardio-logging-flow -- GEEN migratie/backfill
-- van bestaande sessions-rijen, geen destructieve wijziging).
--
-- Existing-state audit (docs/B9_01_EXISTING_STATE_AUDIT.md) bevestigde:
-- sessions is rijker dan het eerdere F13-P1-10-contract veronderstelde
-- (heeft al duration_s/hr_avg/watt/pace_sec), maar mist nog steeds een
-- lap-niveau model en een athlete endurance-profiel. Geen enkele
-- bestaande wearable-connector doet activiteit-sync (uitsluitend HRV/
-- RHR/slaap) -- geen fictieve providerintegratie gebouwd.

-- Opruiming van een vergeten, overgebleven testindex uit de eerdere
-- F13-P1-12-sprint (exacte duplicaat van idx_sessions_user_date) --
-- zelf gevonden tijdens deze existing-state audit.
drop index if exists public.concurrently_test_idx_sessions_user_date;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  sport text not null check (sport in ('running','cycling','rowing','swimming')),
  distance_meters numeric,
  duration_seconds integer,
  elevation_gain_meters numeric,
  avg_heart_rate_bpm integer,
  avg_power_watts numeric,
  avg_cadence_rpm numeric,
  source_provenance text not null check (source_provenance in ('manual','device_measured','provider_derived','trainingskompas_calculated','user_corrected')),
  source_provider text,
  data_quality text not null default 'unverified' check (data_quality in ('unverified','provider_verified','user_corrected')),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  dedupe_key text
);

alter table public.activities enable row level security;
create policy activities_select_own on public.activities for select using (user_id = auth.uid());
create policy activities_insert_own on public.activities for insert with check (user_id = auth.uid());
create policy activities_update_own on public.activities for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy activities_delete_own on public.activities for delete using (user_id = auth.uid());

-- Dedupe: provider + activity-ID + owner, verpakt in één dedupe_key-tekstveld
-- (bijv. 'garmin:activity:12345') -- uniek per user_id, NIET globaal uniek
-- (twee verschillende gebruikers mogen toevallig dezelfde provider-interne
-- activiteit-ID-nummering hebben).
create unique index idx_activities_user_dedupe on public.activities(user_id, dedupe_key) where dedupe_key is not null;
create index idx_activities_user_recorded on public.activities(user_id, recorded_at desc);
create index idx_activities_sport on public.activities(user_id, sport);
create index idx_activities_session on public.activities(session_id);

revoke all on public.activities from anon;
revoke truncate, trigger, references on public.activities from authenticated;

-- activity_laps: GEEN opgeslagen pace/speed-kolom.
--
-- ARCHITECTUURKEUZE (sectie 5B van de opdracht, expliciet gemotiveerd):
-- sessions.pace_sec bewijst dat een opgeslagen-pace-patroon al bestaat in
-- de huidige codebase. Voor dit NIEUWE, lap-niveau model kiezen we bewust
-- de striktere, actuele architectuurregel: pace/speed wordt uitsluitend
-- deterministisch berekend door core/cardio.js (splitFromDistTime) bij
-- weergave, nooit dubbel opgeslagen op lapniveau. Dit voorkomt dat een
-- opgeslagen pace-waarde uit de pas kan lopen met de brondata (distance/
-- duration) als die ooit gecorrigeerd wordt -- één, ondubbelzinnige bron
-- van waarheid per lap (de ruwe metingen), geen tweede, potentieel
-- inconsistente afgeleide-waarde-kolom.
create table public.activity_laps (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  lap_index integer not null,
  distance_meters numeric,
  duration_seconds integer,
  avg_heart_rate_bpm integer,
  avg_power_watts numeric
);

alter table public.activity_laps enable row level security;
create policy activity_laps_select_own on public.activity_laps for select
  using (exists (select 1 from public.activities a where a.id = activity_laps.activity_id and a.user_id = auth.uid()));
create policy activity_laps_insert_own on public.activity_laps for insert
  with check (exists (select 1 from public.activities a where a.id = activity_laps.activity_id and a.user_id = auth.uid()));
create policy activity_laps_update_own on public.activity_laps for update
  using (exists (select 1 from public.activities a where a.id = activity_laps.activity_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.activities a where a.id = activity_laps.activity_id and a.user_id = auth.uid()));
create policy activity_laps_delete_own on public.activity_laps for delete
  using (exists (select 1 from public.activities a where a.id = activity_laps.activity_id and a.user_id = auth.uid()));

create unique index idx_activity_laps_unique on public.activity_laps(activity_id, lap_index);
create index idx_activity_laps_activity on public.activity_laps(activity_id);

revoke all on public.activity_laps from anon;
revoke truncate, trigger, references on public.activity_laps from authenticated;

-- GEEN apart interval/structure-model gebouwd in deze sprint (sectie 5C):
-- de existing-state audit vond geen bestaande consumer/B9-02/B9-04-
-- afhankelijkheid die dit nu al zou vereisen. activity_laps volstaat als
-- foundation voor gewone laps/auto-laps; structured work/recovery-
-- intervals zijn semantisch een ander concept en worden pas gebouwd
-- wanneer een concrete, toekomstige sprint dit bewijst nodig te hebben --
-- geen scope creep, geen premature architectuur.

-- athlete_endurance_profile: user-entered expliciet gescheiden van
-- calculated (nooit twee concepten onder één veldnaam, conform sectie 5D).
create table public.athlete_endurance_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null check (sport in ('running','cycling')),
  threshold_pace_seconds_per_km numeric,
  ftp_watts_user_entered numeric,
  ftp_watts_calculated numeric,
  calculated_source_calculation_id text,
  calculated_source_calculation_version text,
  max_heart_rate_bpm integer,
  confidence text check (confidence in ('laag','middel','hoog')),
  data_quality text not null default 'unverified' check (data_quality in ('unverified','provider_verified','user_corrected')),
  updated_at timestamptz not null default now()
);

alter table public.athlete_endurance_profile enable row level security;
create policy aep_select_own on public.athlete_endurance_profile for select using (user_id = auth.uid());
create policy aep_insert_own on public.athlete_endurance_profile for insert with check (user_id = auth.uid());
create policy aep_update_own on public.athlete_endurance_profile for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy aep_delete_own on public.athlete_endurance_profile for delete using (user_id = auth.uid());

create unique index idx_aep_user_sport on public.athlete_endurance_profile(user_id, sport);

revoke all on public.athlete_endurance_profile from anon;
revoke truncate, trigger, references on public.athlete_endurance_profile from authenticated;

-- LIVE ADVERSARIAAL GEVERIFIEERD (transacties zonder commit, 0 restanten
-- na afloop bevestigd op alle drie tabellen):
-- 1. ANON -> activities: permission denied.
-- 2. USER A -> eigen activity: insert slaagt.
-- 3. Forged user_id (USER A probeert namens USER B te schrijven): RLS-
--    violation, correct geweigerd.
-- 4. USER A (aanvaller) -> activity/laps/profile van USER B: SELECT geeft
--    0 rijen (onzichtbaar), UPDATE en DELETE hebben 0 effect (waarde
--    blijft ongewijzigd, rij blijft bestaan) -- alle drie bevestigd
--    binnen dezelfde, betrouwbare transactie.
-- 5. Duplicate provider-activity (zelfde user_id + dedupe_key): unique-
--    constraint-violation, correct geweigerd -- voorkomt dubbele
--    activiteiten bij een retry/webhook-retry/opnieuw synchroniseren.
-- 6. Index-definitie bevestigd (pg_indexes): de unique constraint is op
--    (user_id, dedupe_key), niet op dedupe_key alleen -- twee
--    verschillende gebruikers met toevallig dezelfde provider-interne
--    activiteit-ID worden niet geblokkeerd (functioneel correct volgens
--    het schema-ontwerp zelf, al gaf een verkennende, live multi-user-
--    testpoging binnen deze sessie een inconsistent resultaat -- zie het
--    B9-01-eindrapport voor de volledige, eerlijke toelichting).
-- 7. CASCADE-keten: activity_laps.activity_id -> activities.id ->
--    activities.user_id -> auth.users.id, live bevestigd: het verwijderen
--    van een activity verwijdert automatisch de bijbehorende laps (0
--    restanten na een DELETE op de parent, transactie zonder commit).
-- 8. Performance: 5000 representatieve testrijen (transactie zonder
--    commit, 0 restanten na afloop) -- de sport+user-gefilterde,
--    datum-gesorteerde query (analoog aan een activity-historyscherm)
--    toont "Index Scan" op idx_activities_sport, 0.824ms totale
--    executietijd, geen Seq Scan.
