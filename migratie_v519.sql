-- migratie_v519.sql
-- F11 Tenant Escape Final Matrix, sectie 4 (KRITIEKE PRIVACY-BUG,
-- geintroduceerd in migratie_v517.sql, gevonden en gerepareerd vóór
-- MS-F11-03 als CLOSED beschouwd kan worden).
--
-- BEVINDING: get_team_attendance_summary() stond toe dat de AANROEPER zelf
-- p_min_cohort_size instelde, inclusief waarden ONDER het canonieke
-- minimum van 5. Live adversarial bevestigd: met p_min_cohort_size=1 kon
-- een staff-lid het EXACTE aanwezigheidspercentage van een cohort van 1
-- enkele persoon zien -- een volledige omzeiling van de privacy-garantie.
--
-- FIX: het canonieke minimum (5) is nu een SERVER-SIDE, niet-client-
-- overschrijfbare ondergrens via GREATEST(). Een client mag de drempel
-- uitsluitend VERHOGEN, nooit verlagen.
create or replace function public.get_team_attendance_summary(
  p_team_id text,
  p_period_start timestamptz default (now() - interval '90 days'),
  p_period_end timestamptz default now(),
  p_min_cohort_size int default 5
)
returns table (
  team_id text,
  event_count bigint,
  eligible_participant_count bigint,
  attendance_rate numeric,
  responsibility_completion_rate numeric,
  privacy_status text,
  period_start timestamptz,
  period_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_count bigint;
  v_response_count bigint;
  v_present_count bigint;
  v_resp_total bigint;
  v_resp_done bigint;
  v_effective_min_cohort int;
begin
  if not public.team_has_access(p_team_id, array['owner','admin','staff']) then
    raise exception 'geen toegang tot team-analytics voor dit team';
  end if;

  v_effective_min_cohort := greatest(coalesce(p_min_cohort_size, 5), 5);

  select count(*) into v_event_count
  from public.team_events e
  where e.team_id = p_team_id and e.starts_at >= p_period_start and e.starts_at <= p_period_end;

  select count(*) filter (where a.status in ('present','absent','maybe')),
         count(*) filter (where a.status = 'present')
    into v_response_count, v_present_count
  from public.event_attendance a
  join public.team_events e on e.id = a.event_id
  where e.team_id = p_team_id and e.starts_at >= p_period_start and e.starts_at <= p_period_end;

  select count(*), count(*) filter (where r.status = 'done')
    into v_resp_total, v_resp_done
  from public.event_responsibilities r
  join public.team_events e on e.id = r.event_id
  where e.team_id = p_team_id and e.starts_at >= p_period_start and e.starts_at <= p_period_end;

  if coalesce(v_response_count, 0) < v_effective_min_cohort then
    return query select
      p_team_id, v_event_count, coalesce(v_response_count, 0)::bigint,
      null::numeric, null::numeric, 'insufficient_data'::text,
      p_period_start, p_period_end;
    return;
  end if;

  return query select
    p_team_id,
    v_event_count,
    v_response_count,
    round((v_present_count::numeric / nullif(v_response_count, 0)) * 1000) / 1000,
    case when coalesce(v_resp_total, 0) >= v_effective_min_cohort
      then round((v_resp_done::numeric / nullif(v_resp_total, 0)) * 1000) / 1000
      else null::numeric end,
    'ok'::text,
    p_period_start, p_period_end;
end;
$$;

-- LIVE ADVERSARIAAL GEVERIFIEERD NA DE FIX (transacties zonder commit, geen
-- permanente wijziging):
-- 1. Dezelfde aanval (p_min_cohort_size=1 op een cohort van 1) geeft nu
--    correct insufficient_data i.p.v. het exacte percentage.
-- 2. Zonder client-parameter (default 5) op een cohort van 3 ->
--    insufficient_data, zoals verwacht.
-- 3. Een client die een STRENGERE drempel opgeeft (10) op een cohort van 3
--    -> insufficient_data blijft correct gelden.
