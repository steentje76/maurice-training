-- migratie_v541.sql
-- B9-H3B Cross-Sport Cloud Provider Integration.
--
-- P1-FIX (zelf gevonden tijdens live idempotentie-verificatie): de
-- bestaande unique index idx_activities_user_dedupe is een PARTIAL
-- index (WHERE dedupe_key IS NOT NULL) -- correct, want handmatig
-- ingevoerde activiteiten hebben geen dedupe_key en mogen niet
-- onderling als "conflict" gezien worden. Maar PostgREST se generieke
-- `on_conflict`-query-parameter ondersteunt geen partial-index-WHERE-
-- clausule op de conflict-target (live bevestigd: 42P10-fout). Native
-- SQL met een expliciete `on conflict (...) where ... do update`
-- werkt wel correct (live bevestigd: 2 identieke inserts -> 1 rij).
--
-- Oplossing, conform het bestaande upsert_daily_health()-patroon: een
-- SECURITY DEFINER-RPC die de correcte, partial-index-bewuste SQL
-- intern uitvoert. auth.uid()-check voorkomt dat een gebruiker een
-- activity namens een ander aanmaakt (sectie 62: cross-user-sabotage).

create or replace function public.upsert_provider_activity(
  p_user_id uuid,
  p_sport text,
  p_duration_seconds integer,
  p_distance_meters numeric,
  p_elevation_gain_meters numeric,
  p_avg_heart_rate_bpm integer,
  p_avg_power_watts numeric,
  p_avg_cadence_rpm numeric,
  p_source_provenance text,
  p_source_provider text,
  p_data_quality text,
  p_recorded_at timestamptz,
  p_dedupe_key text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_caller uuid := auth.uid();
begin
  -- Zelfde patroon als upsert_daily_health(): Netlify-functies roepen deze
  -- RPC aan met de service-role (nadat ZIJ de gebruiker se sessie al zelf
  -- hebben gevalideerd via /auth/v1/user) -- staat schrijven namens een
  -- expliciete p_user_id toe. Een gewone, authenticated client (geen
  -- service-role) mag uitsluitend voor zichzelf schrijven (sectie 62:
  -- cross-user-sabotage blijft architecturaal onmogelijk voor client-calls).
  if auth.role() is distinct from 'service_role' then
    if v_caller is null or v_caller <> p_user_id then
      raise exception 'not authorized to write activity data for another user';
    end if;
  end if;
  if p_dedupe_key is null then
    raise exception 'dedupe_key is verplicht voor provider-ingestion';
  end if;

  insert into public.activities (
    user_id, sport, duration_seconds, distance_meters, elevation_gain_meters,
    avg_heart_rate_bpm, avg_power_watts, avg_cadence_rpm,
    source_provenance, source_provider, data_quality, recorded_at, dedupe_key
  )
  values (
    p_user_id, p_sport, p_duration_seconds, p_distance_meters, p_elevation_gain_meters,
    p_avg_heart_rate_bpm, p_avg_power_watts, p_avg_cadence_rpm,
    p_source_provenance, p_source_provider, p_data_quality, p_recorded_at, p_dedupe_key
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null
  do update set
    duration_seconds = excluded.duration_seconds,
    distance_meters = excluded.distance_meters,
    elevation_gain_meters = excluded.elevation_gain_meters,
    avg_heart_rate_bpm = excluded.avg_heart_rate_bpm,
    avg_power_watts = excluded.avg_power_watts,
    avg_cadence_rpm = excluded.avg_cadence_rpm,
    data_quality = excluded.data_quality
    -- update_semantics (sectie 27): provider kan een activiteit later
    -- corrigeren (bijv. afstand-correctie) -- dezelfde dedupe_key krijgt
    -- een update, nooit een tweede rij. source_provenance/source_provider/
    -- recorded_at blijven bewust ONGEWIJZIGD bij een update (de oorspronkelijke
    -- identiteit/bron van de activiteit verandert niet).
  where public.activities.data_quality is distinct from 'user_corrected'
    -- MANUAL DATA PROTECTION (sectie 31, zelf gevonden tijdens het
    -- doordenken van de update-semantiek): als de athlete een provider-
    -- afkomstige activity handmatig heeft gecorrigeerd (data_quality =
    -- 'user_corrected', bestaand label, reeds gebruikt elders in de app
    -- voor threshold_pace_seconds_per_km), mag een volgende sync die
    -- correctie NOOIT stil overschrijven. Bij een conflict met een
    -- user_corrected-rij doet de INSERT effectief niets (0 rijen
    -- geraakt) -- de RETURNING geeft dan NULL, wat de caller correct
    -- als "geskipt, want handmatig beschermd" moet interpreteren.
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.upsert_provider_activity(uuid, text, integer, numeric, numeric, integer, numeric, numeric, text, text, text, timestamptz, text) from public;
revoke execute on function public.upsert_provider_activity(uuid, text, integer, numeric, numeric, integer, numeric, numeric, text, text, text, timestamptz, text) from anon;
grant execute on function public.upsert_provider_activity(uuid, text, integer, numeric, numeric, integer, numeric, numeric, text, text, text, timestamptz, text) to authenticated;
