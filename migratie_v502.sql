-- migratie_v502.sql
-- MS-F8-01 (Women's Performance Product Decisions) — retroactieve documentatie
--
-- BEVINDING (F8 Entry Audit): de tabel public.cycle_symptom_logs bestaat al
-- correct en veilig op de live database (RLS aan, eigen-data-alleen-policy
-- cycle_symptom_logs_eigen_data_alleen, live geverifieerd via
-- information_schema/pg_policies) en wordt al actief gebruikt door de
-- runtime (index.html, cyclusLaadSymptomen()/cyclusSymptoomOpslaan()).
-- Het aanmaak-script zelf was echter nooit naar deze repo gecommit --
-- een documentatie-/reproduceerbaarheidsgap, geen actief security-risico.
--
-- Dit bestand documenteert de REEDS BESTAANDE tabelstructuur retroactief,
-- exact zoals live geverifieerd (information_schema.columns). IF NOT EXISTS
-- overal: dit script wijzigt de live database niet, het maakt de repo
-- consistent met de reeds bestaande, werkende staat.

create table if not exists public.cycle_symptom_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  log_date date not null,
  symptoms jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cycle_symptom_logs is
  'Cyclustracking-MVP: athlete-gerapporteerde symptomen per dag, uitsluitend context, geen diagnose. Retroactief gedocumenteerd (MS-F8-01) -- de tabel bestond al live vóór dit script, dit maakt de repo consistent met de reeds bestaande, werkende staat.';

alter table public.cycle_symptom_logs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'cycle_symptom_logs' and policyname = 'cycle_symptom_logs_eigen_data_alleen'
  ) then
    create policy cycle_symptom_logs_eigen_data_alleen on public.cycle_symptom_logs
      for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

create index if not exists idx_cycle_symptom_logs_user_date on public.cycle_symptom_logs(user_id, log_date desc);
