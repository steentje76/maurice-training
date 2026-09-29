-- migratie_v573.sql — F-SEC-002 closure: quota-compensatie uitsluitend server-side.
--
-- Root cause (docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md, F-SEC-002): public.decrement_usage(text, date) is
-- SECURITY DEFINER, gebonden aan auth.uid(), en EXECUTE voor authenticated. Het is bedoeld als compensatie in
-- netlify/functions/coach.js wanneer de AI-provider faalt NA een quota-reservering, maar een ingelogde gebruiker kon
-- de RPC ook rechtstreeks aanroepen en zo het eigen maandverbruik telkens terugzetten (bewezen met rollback:
-- quota vol -> decrement -> opnieuw toegestaan). Geen cross-user effect (auth.uid()-gebonden, vloer 0).
--
-- Fix (zelfde patroon als ai_usage_registreer/grant_credit_purchase: server-only functie met expliciete gebruiker):
--  1. nieuwe public.decrement_usage_for_user(p_user_id, p_feature_key, p_periode), SECURITY DEFINER, EXECUTE
--     uitsluitend service_role; coach.js roept hem alleen aan na een eigen, mislukte provider-call op een door
--     de server zelf gereserveerde eenheid, met de uit het JWT geverifieerde userId;
--  2. EXECUTE op public.decrement_usage(text, date) ingetrokken van PUBLIC, anon en authenticated.
-- Ongewijzigd: check_and_increment_usage (atomair, auth.uid()-gebonden; direct aanroepen verhoogt alleen het eigen
-- verbruik), increment_usage, consume_credit, usage_log (RLS: alleen select_own), quota-/planmodel.

create or replace function public.decrement_usage_for_user(p_user_id uuid, p_feature_key text, p_periode date)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_aantal integer;
begin
  if p_user_id is null or p_feature_key is null or p_periode is null then
    raise exception 'invalid usage compensation';
  end if;
  update public.usage_log
     set aantal = greatest(aantal - 1, 0), updated_at = now()
   where user_id = p_user_id and feature_key = p_feature_key and periode = p_periode
  returning aantal into v_aantal;
  return v_aantal;
end;
$function$;

revoke all on function public.decrement_usage_for_user(uuid, text, date) from public, anon, authenticated;
grant execute on function public.decrement_usage_for_user(uuid, text, date) to service_role;

revoke execute on function public.decrement_usage(text, date) from public, anon, authenticated;
