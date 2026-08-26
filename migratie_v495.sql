-- ============================================================================
-- CYCLUSTRACKING MVP — RAW DATA (v4.95.0)
-- ============================================================================
-- Doel: menstruatiecyclus als TRAININGSCONTEXT, gericht op registratie van
-- periode-start/eind (RAW DATA). Geen medisch hulpmiddel, geen anticonceptie-,
-- zwangerschaps- of ovulatie-met-zekerheid-claims.
--
-- BESTAANDE INFRASTRUCTUUR HERGEBRUIKT (niet gedupliceerd):
-- hrv_log.cyclus_fase (self-reported, dagelijkse check-in) en
-- CalcCore.cyclusDagFactor() (protected core/calculation.js) bestaan al en
-- verwachten exact de vier fasewaarden 'menstruatie'/'folliculair'/'ovulatie'/
-- 'luteaal'. Deze migratie voegt UITSLUITEND de ontbrekende RAW DATA toe
-- (periode-start/einddatums over tijd) waaruit een geschatte cyclusdag/fase
-- kan worden AFGELEID (nieuwe, aparte Calculation-module, core/cycle.js,
-- GEEN wijziging aan protected core/calculation.js).
-- ============================================================================

create table if not exists public.cycle_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  start_date date not null,
  end_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cycle_periods_end_after_start check (end_date is null or end_date >= start_date)
);

comment on table public.cycle_periods is
  'v4.95.0 -- Cyclustracking-MVP: RAW DATA (periode-start/einddatum). Geen medisch hulpmiddel. Geschatte cyclusdag/fase wordt elders (core/cycle.js) deterministisch afgeleid, nooit hier gematerialiseerd.';
comment on column public.cycle_periods.end_date is
  'NULL zolang de periode nog actief/niet afgerond is.';

alter table public.cycle_periods enable row level security;

create trigger trg_set_user_id
  before insert on public.cycle_periods
  for each row execute function set_user_id_from_auth();

create policy cycle_periods_eigen_data_alleen on public.cycle_periods
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_cycle_periods_user_start on public.cycle_periods(user_id, start_date desc);
