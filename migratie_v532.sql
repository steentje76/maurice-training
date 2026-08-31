-- migratie_v532.sql
-- F14 MS-F14-03 -- Cohort & Research Governance.
--
-- Cohort-toegang is aanzienlijk gevoeliger dan de individuele export uit
-- MS-F14-02: het combineert data van MEERDERE gebruikers. Conform de
-- F14-opdracht se stopconditie ("cross-user/cross-tenant research leak")
-- en sectie 7 (heridentificatierisico) met extra waarborgen ontworpen.

-- Audit-log: WIE (system_role-gebruiker) WANNEER een cohort-export heeft
-- opgevraagd, en hoeveel subjects erin zaten -- nooit welke subjects.
-- Governance/auditability conform sectie 16. Geen enkele client-policy:
-- uitsluitend server-side/service-role-inzichtelijk.
create table public.research_cohort_access_log (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  cohort_size integer not null,
  result_status text not null check (result_status in ('granted','insufficient_cohort_size'))
);

alter table public.research_cohort_access_log enable row level security;
revoke all on public.research_cohort_access_log from anon, authenticated;

-- Cohort-export-RPC. Vereist system_role (dezelfde, al bewezen platform-
-- brede autoriteitslaag als de F13-P1-08-fix voor scope='global'-mutaties
-- -- NOOIT gym_role_level, dat is een per-gym rol, geen platform-
-- autoriteit). k-anonimiteit-achtige drempel (minimaal 3 subjects) tegen
-- heridentificatie bij een te klein cohort.
--
-- BELANGRIJKE, LIVE ONTDEKTE TECHNISCHE LES: public.users.id is `text`,
-- niet `uuid` (in tegenstelling tot auth.users.id) -- een vergelijking
-- met auth.uid() (uuid) vereist een expliciete ::text-cast, anders
-- "operator does not exist: text = uuid".
create or replace function public.export_research_cohort()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_system_role text;
  v_cohort_size integer;
  v_records jsonb;
  v_min_cohort_size constant integer := 3;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select system_role into v_system_role from public.users where id = v_uid::text;
  if v_system_role is distinct from 'developer' and v_system_role is distinct from 'support' then
    raise exception 'insufficient platform authority for cohort research access';
  end if;

  select count(distinct rc.user_id) into v_cohort_size
  from public.research_consents rc
  where rc.research_purpose = 'general_research_export'
    and rc.action = 'granted' and rc.consent_version = 'v1'
    and rc.created_at = (
      select max(rc2.created_at) from public.research_consents rc2
      where rc2.user_id = rc.user_id and rc2.research_purpose = 'general_research_export'
    );

  if v_cohort_size < v_min_cohort_size then
    insert into public.research_cohort_access_log (requested_by, cohort_size, result_status)
      values (v_uid, coalesce(v_cohort_size, 0), 'insufficient_cohort_size');
    return jsonb_build_object(
      'schema_version', 'research_cohort_export.v1',
      'export_generated_at', now(),
      'status', 'insufficient_cohort_size',
      'cohort_size', v_cohort_size,
      'minimum_required', v_min_cohort_size,
      'records', '[]'::jsonb
    );
  end if;

  select jsonb_agg(jsonb_build_object(
    'subject_id', encode(digest(s.user_id::text || 'tk-research-pseudonym-salt-v1', 'sha256'), 'hex'),
    'exercise_id', s.exercise_id,
    'date', s.date,
    'weight_kg', s.weight,
    'reps', s.reps,
    'training_type', s.training_type,
    'unit_weight', 'kg',
    'calculation_id', 'raw_observation',
    'calculation_version', 'n/a',
    'source_provenance', 'manual_or_app_logged',
    'timezone', 'UTC'
  )) into v_records
  from public.sessions s
  where s.user_id in (
    select rc.user_id from public.research_consents rc
    where rc.research_purpose = 'general_research_export'
      and rc.action = 'granted' and rc.consent_version = 'v1'
      and rc.created_at = (
        select max(rc2.created_at) from public.research_consents rc2
        where rc2.user_id = rc.user_id and rc2.research_purpose = 'general_research_export'
      )
  );

  insert into public.research_cohort_access_log (requested_by, cohort_size, result_status)
    values (v_uid, v_cohort_size, 'granted');

  return jsonb_build_object(
    'schema_version', 'research_cohort_export.v1',
    'export_generated_at', now(),
    'status', 'granted',
    'cohort_size', v_cohort_size,
    'records', coalesce(v_records, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.export_research_cohort() from public, anon;
grant execute on function public.export_research_cohort() to authenticated;

-- LIVE ADVERSARIAAL/FUNCTIONEEL GEVERIFIEERD (transacties zonder commit,
-- data-integriteit na afloop bevestigd: 0 restanten):
-- 1. anon: permission denied.
-- 2. authenticated zonder system_role: RAISE EXCEPTION "insufficient
--    platform authority".
-- 3. Maurice (system_role='developer') met 0 consented gebruikers:
--    status='insufficient_cohort_size', 0 records (k-anonimiteit-drempel
--    werkt correct, geen data blootgelegd bij een te klein cohort).
-- 4. Maurice met 3 gesimuleerde, consented gebruikers (via service_role
--    toegevoegd -- authenticated kan zelfs niet namens zichzelf-als-
--    andere-gebruiker consent invoegen, RLS bevestigd correct): 
--    status='granted', cohort_size=3, volledige, gepseudonimiseerde
--    export.
