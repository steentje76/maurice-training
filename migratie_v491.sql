-- ============================================================================
-- MASTER SPRINT — HYROX/TRIATHLON RACE-SEGMENT ARCHITECTUUR (v4.91.0)
-- ============================================================================
-- DOEL: race-segmentdata (HYROX/Triathlon-brick) expliciet scheiden van de
-- generieke sessions-tabel, in een eigen race_segments-tabel met een
-- afdwingbare NOT NULL foreign key naar training_instances -- iets wat op de
-- gedeelde sessions-tabel principieel onmogelijk is (die tabel wordt ook door
-- reguliere trainingen gebruikt, waarvoor training_instance_id terecht
-- nullable moet blijven).
--
-- SCOPE-ONDERZOEK (vóór migratie, read-only):
-- - sessions.training_instance_id wordt breed gebruikt (reguliere trainingen,
--   niet uitsluitend races) -- een generieke NOT NULL-constraint zou daar
--   bestaande, niet-race-functionaliteit breken.
-- - Slechts 1 bestaande HYROX-rij in de live database, 0 Triathlon-brick-
--   rijen -- migratierisico is minimaal.
-- - RLS-patroon op sessions: BEFORE INSERT-trigger trg_set_user_id vult
--   user_id automatisch (set_user_id_from_auth()), RLS-policy "user_id =
--   auth.uid()" voor alle commando's. Exact gerepliceerd hieronder.
--
-- ARCHITECTUURVERBETERING (naast de tabelscheiding): training_instances
-- krijgt een expliciete race_type-kolom ('hyrox'/'brick'). Dit maakt het
-- onderscheid HYROX vs Triathlon-brick een EERSTE-KLAS, expliciet veld op
-- instance-niveau, in plaats van een impliciete afleiding uit welke race_*-
-- velden toevallig wel/niet gevuld zijn (de bron van de eerder gerepareerde
-- Context Engine-bug, waarbij race_format=null voor brick de query onterecht
-- liet falen).
-- ============================================================================

-- 1. Expliciete race_type op training_instances
alter table public.training_instances
  add column if not exists race_type text;

alter table public.training_instances
  add constraint training_instances_race_type_check
  check (race_type is null or race_type in ('hyrox','brick'));

comment on column public.training_instances.race_type is
  'v4.91.0 -- expliciet, eerste-klas onderscheid HYROX vs Triathlon-brick op instance-niveau. NULL voor alle niet-race trainingsinstances.';

-- 2. race_segments-tabel
create table if not exists public.race_segments (
  id uuid primary key default gen_random_uuid(),
  training_instance_id uuid not null references public.training_instances(id) on delete cascade,
  segment_index integer not null,
  exercise_id text references public.exercises(id),
  start_at timestamptz,
  finish_at timestamptz,
  distance integer,
  weight numeric,
  reps integer,
  rpe numeric,
  user_id uuid,
  created_at timestamptz not null default now(),
  constraint race_segments_instance_segment_unique unique (training_instance_id, segment_index)
);

comment on table public.race_segments is
  'v4.91.0 -- HYROX/Triathlon-brick race-segmentregistraties. Vervangt het gebruik van de generieke sessions-tabel voor dit doeleinde. RAW DATA: start_at/finish_at/distance/weight/reps/rpe. Duur/transitie blijven Calculation Engine-output, nooit hier gematerialiseerd.';
comment on column public.race_segments.training_instance_id is
  'NOT NULL, ON DELETE CASCADE -- afdwingbaar op deze tabel omdat race_segments UITSLUITEND races bevat (i.t.t. de gedeelde sessions-tabel, waar dit veld terecht nullable moet blijven voor niet-race trainingen).';

alter table public.race_segments enable row level security;

create trigger trg_set_user_id
  before insert on public.race_segments
  for each row execute function set_user_id_from_auth();

create policy race_segments_eigen_data_alleen on public.race_segments
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_race_segments_instance on public.race_segments(training_instance_id);

-- 3. BACKFILL: de enige bestaande HYROX-rij migreren, geen dataverlies (de
-- oorspronkelijke sessions-rij blijft ONGEWIJZIGD staan als historisch
-- restant -- geen delete, uitsluitend een kopie naar de nieuwe tabel).
insert into public.race_segments (training_instance_id, segment_index, exercise_id, start_at, finish_at, distance, weight, reps, rpe, user_id, created_at)
select s.training_instance_id, s.segment_index, s.exercise_id, s.start_at, s.finish_at, s.distance, s.weight, s.reps, s.rpe, s.user_id, s.created_at
from public.sessions s
where s.training_type in ('HYROX','Triathlon')
  and s.training_instance_id is not null
  and s.segment_index is not null
on conflict (training_instance_id, segment_index) do nothing;

update public.training_instances ti
set race_type = case
    when exists (select 1 from public.sessions s where s.training_instance_id = ti.id and s.training_type = 'HYROX') then 'hyrox'
    when exists (select 1 from public.sessions s where s.training_instance_id = ti.id and s.training_type = 'Triathlon') then 'brick'
    else ti.race_type
  end
where ti.race_is_official is not null;
