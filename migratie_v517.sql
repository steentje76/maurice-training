-- migratie_v517.sql
-- MS-F11-03 vervolg: server-side privacy-safe team-analytics.
--
-- BEVINDING: de bestaande event_attendance_select-policy staat staff toe
-- ALLE individuele rijen van het team te lezen (nodig voor legitieme
-- doeleinden zoals "wie komt er"), maar dit betekent dat een client-side
-- implementatie van TeamAnalyticsCore (die op individuele records
-- aggregeert) eerst user_id/status-combinaties naar de browser zou moeten
-- sturen voordat lokaal geaggregeerd wordt -- een privacy-risico.
--
-- FIX: get_team_attendance_summary() voert de aggregatie EN de minimum-
-- cohort-privacy-gate volledig server-side uit. De client ontvangt
-- uitsluitend: team_id, event_count, eligible_participant_count,
-- attendance_rate, responsibility_completion_rate, privacy_status,
-- period_start/end. Nooit user_id, namen, of individuele statussen.

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
begin
  if not public.team_has_access(p_team_id, array['owner','admin','staff']) then
    raise exception 'geen toegang tot team-analytics voor dit team';
  end if;

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

  if coalesce(v_response_count, 0) < p_min_cohort_size then
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
    case when coalesce(v_resp_total, 0) >= p_min_cohort_size
      then round((v_resp_done::numeric / nullif(v_resp_total, 0)) * 1000) / 1000
      else null::numeric end,
    'ok'::text,
    p_period_start, p_period_end;
end;
$$;

revoke all on function public.get_team_attendance_summary(text, timestamptz, timestamptz, int) from public;
revoke execute on function public.get_team_attendance_summary(text, timestamptz, timestamptz, int) from anon;
grant execute on function public.get_team_attendance_summary(text, timestamptz, timestamptz, int) to authenticated;

-- LIVE ADVERSARIAAL GEVERIFIEERD (transacties zonder commit, geen permanente
-- wijziging):
-- 1. Owner/staff krijgt correct 'insufficient_data' bij een cohort < 5,
--    geen percentage geretourneerd.
-- 2. Gewoon lid (member) krijgt een expliciete fout -- analytics is
--    uitsluitend een staff-capability.
-- 3. Cross-tenant: staff van organisatie A krijgt een expliciete fout bij
--    het opvragen van analytics voor een team van organisatie B.
-- 4. Cohort van 3 (met expliciet verlaagde drempelparameter) geeft correct
--    'ok' met attendance_rate = 0.667 (2 present van 3 responses).
