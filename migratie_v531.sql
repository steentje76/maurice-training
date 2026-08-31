-- migratie_v531.sql
-- F14 MS-F14-02 -- Reproducible Dataset Export.
--
-- Server-authoritative RPC, GEEN user-id-parameter (voorkomt elk
-- "arbitrary user ID"-risico bij ontwerp): gebruikt uitsluitend
-- auth.uid() van de aanroepende, geauthenticeerde sessie zelf
-- (security invoker, niet security definer -- de RLS van sessions
-- geldt dus ook nog eens, als tweede, onafhankelijke beschermingslaag
-- bovenop de expliciete WHERE user_id=auth.uid()-filter).
--
-- Consent-gate: retourneert een lege, expliciet gemarkeerde payload
-- (consent_status: 'not_granted', geen enkele trainingsdata) tenzij de
-- aanroeper een geldige, 'granted'-consent heeft bij de HUIDIGE,
-- actieve consent-versie in research_consents (MS-F14-01) -- dezelfde
-- versie-logica als de client-side getResearchConsentStatus().
--
-- Pseudonimisering (nadrukkelijk PSEUDONYMOUS, nooit "anonymous"
-- genoemd conform de F14-opdracht sectie 7 -- de hash is omkeerbaar
-- voor wie de salt+uid kent, en dit blijft de eigen-gebruiker-export
-- van dezelfde sessie, geen anonimisering-garantie): sha256(uid + een
-- vaste, alleen server-side bekende salt) als subject_id, nooit het
-- rauwe user_id.
--
-- Dataminimalisatie: een vaste, deterministische veldenwhitelist voor
-- sessions -- exercise_id/date/weight/reps/training_type. GEEN notes
-- (vrije tekst, kan PII bevatten -- live bevestigd: een testnotitie
-- werd correct NIET meegenomen), geen id/user_id, geen gezondheidsdata
-- (HRV/RHR/slaap/Women's Performance expliciet buiten scope van deze
-- eerste exportversie -- dataminimalisatie per doel).
--
-- Volledige provenance per record: calculation_id/calculation_version
-- (hier 'raw_observation'/'n/a', want dit zijn ruwe, ingevoerde
-- waarden, geen afgeleide Calculation Engine-berekeningen), source_
-- provenance, unit, timezone. Op export-niveau: export_generated_at,
-- schema_version, consent_version, consent_status.

create extension if not exists pgcrypto;

create or replace function public.export_research_dataset()
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_heeft_consent boolean;
  v_subject_id text;
  v_records jsonb;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select (rc.action = 'granted' and rc.consent_version = 'v1') into v_heeft_consent
  from public.research_consents rc
  where rc.user_id = v_uid and rc.research_purpose = 'general_research_export'
  order by rc.created_at desc limit 1;

  if v_heeft_consent is not true then
    return jsonb_build_object(
      'schema_version', 'research_export.v1',
      'export_generated_at', now(),
      'consent_status', 'not_granted',
      'records', '[]'::jsonb
    );
  end if;

  v_subject_id := encode(digest(v_uid::text || 'tk-research-pseudonym-salt-v1', 'sha256'), 'hex');

  select jsonb_agg(jsonb_build_object(
    'subject_id', v_subject_id,
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
  where s.user_id = v_uid;

  return jsonb_build_object(
    'schema_version', 'research_export.v1',
    'export_generated_at', now(),
    'consent_status', 'granted',
    'consent_version', 'v1',
    'subject_id', v_subject_id,
    'records', coalesce(v_records, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.export_research_dataset() from public, anon;
grant execute on function public.export_research_dataset() to authenticated;

-- LIVE ADVERSARIAAL/FUNCTIONEEL GEVERIFIEERD (transacties zonder commit,
-- data-integriteit na afloop bevestigd: 0 restanten):
-- 1. anon: permission denied (volledig geen toegang).
-- 2. authenticated, geen consent: consent_status='not_granted', 0 records.
-- 3. authenticated, met consent + een testsessie (incl. een notitie met
--    "PII"): export bevat de sessie-velden correct, de notitie is
--    correct NIET meegenomen (dataminimalisatie bevestigd).
-- 4. Geen user-id-parameter bestaat op de functie -- een cross-user-
--    export via parametermanipulatie is architecturaal onmogelijk
--    (geen manipuleerbaar veld om te misbruiken).
