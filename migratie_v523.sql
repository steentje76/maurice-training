-- migratie_v523.sql
-- MS-F12-02 (Entitlement Enforcement).
--
-- KRITIEKE, P0-NIVEAU BEVINDING (gevonden EN gerepareerd vóór enige merge).
-- De bestaande users_update_own-policy (FOR UPDATE, qual: id=auth.uid()::
-- text, GEEN with_check) liet een gewone, geauthenticeerde gebruiker het
-- eigen individual_plan_key-veld direct naar elk gewenst plan zetten
-- (bijv. 'atleet_pro') -- een volledige, rechtstreekse omzeiling van het
-- gehele commerciële systeem, zonder enige betaling. Live bevestigd: UPDATE
-- users SET individual_plan_key='atleet_pro' WHERE id=auth.uid() slaagde
-- voor een gewone gebruiker.
--
-- VOLLEDIGE FOUTKLASSE-AUDIT op public.users (alle kolommen, expliciet
-- geclassificeerd):
--   CLIENT-WRITABLE (legitiem, blijft werken): name, email (via het
--     bestaande auth-e-mailwijzigingsproces, niet via deze tabel direct)
--   SERVER/SERVICE-ONLY (commercieel, deze migratie): individual_plan_key,
--     individual_plan_status, individual_plan_expires_at, mollie_customer_id
--   SERVER/SERVICE-ONLY (privileged/rol, REEDS BESCHERMD door de
--     bestaande, onafhankelijke trg_protect_privileged_user_columns /
--     protect_privileged_user_columns(), niet door deze migratie
--     aangemaakt maar hier expliciet geverifieerd als nog steeds actief
--     en effectief): gym_role, gym_id, system_role
--   DERIVED/READ-ONLY: gym_role_level (generated column, kan uberhaupt
--     niet direct geschreven worden -- Postgres weigert dit op
--     schemaniveau)
--
-- FIX (commerciële velden): een BEFORE UPDATE-trigger beschermt
-- individual_plan_key, mollie_customer_id, individual_plan_status en
-- individual_plan_expires_at -- deze kolommen kunnen uitsluitend door
-- service_role (toekomstige, server-side billing-bevestiging, MS-F12-04)
-- worden gewijzigd. Consistent met het reeds bestaande, bewezen
-- protect_privileged_user_columns()-patroon: de conditie is
-- auth.role() IS DISTINCT FROM 'service_role' (niet auth.uid() IS NOT
-- NULL -- een eerdere, minder precieze tussenstap binnen dezelfde sessie,
-- direct gecorrigeerd naar het bewezen patroon vóór enige merge).

alter table public.users add column if not exists individual_plan_status text;
alter table public.users add column if not exists individual_plan_expires_at timestamptz;

alter table public.users drop constraint if exists users_individual_plan_status_chk;
alter table public.users add constraint users_individual_plan_status_chk
  check (individual_plan_status is null or individual_plan_status in
    ('active','trial','cancel_at_period_end','grace','expired','past_due','suspended','refunded'));

create or replace function public.protect_commercial_user_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() is distinct from 'service_role' then
    NEW.individual_plan_key := OLD.individual_plan_key;
    NEW.mollie_customer_id := OLD.mollie_customer_id;
    NEW.individual_plan_status := OLD.individual_plan_status;
    NEW.individual_plan_expires_at := OLD.individual_plan_expires_at;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_protect_commercial_user_columns on public.users;
create trigger trg_protect_commercial_user_columns
  before update on public.users
  for each row execute function public.protect_commercial_user_columns();

-- Atomaire "check-and-reserveer"-RPC voor server-side quota-enforcement.
-- Los van increment_usage() (MS-F12-01, ophogen zonder limietcontrole),
-- heeft server-side enforcement een ATOMAIRE combinatie van "is er nog
-- budget?" EN "verhoog" nodig in één databasetransactie, anders ontstaat
-- een TOCTOU-race: twee parallelle requests lezen beide "budget over" vóór
-- een van beide de increment uitvoert.
--
-- Bij een NULL-quota (onbeperkt, geen quota-rij voor dit plan) wordt altijd
-- toegestaan en de teller alsnog opgehoogd (voor audit/UX-weergave, ook al
-- is er geen limiet).

create or replace function public.check_and_increment_usage(p_feature_key text, p_periode date, p_quota integer)
returns table (toegestaan boolean, huidig_gebruik integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aantal integer;
begin
  if p_quota is null then
    insert into public.usage_log (user_id, feature_key, periode, aantal, updated_at)
      values (auth.uid(), p_feature_key, p_periode, 1, now())
    on conflict (user_id, feature_key, periode)
      do update set aantal = usage_log.aantal + 1, updated_at = now()
    returning aantal into v_aantal;
    return query select true, v_aantal;
    return;
  end if;

  update public.usage_log
    set aantal = aantal + 1, updated_at = now()
    where user_id = auth.uid() and feature_key = p_feature_key and periode = p_periode
      and aantal < p_quota
    returning aantal into v_aantal;

  if v_aantal is not null then
    return query select true, v_aantal;
    return;
  end if;

  begin
    insert into public.usage_log (user_id, feature_key, periode, aantal, updated_at)
      values (auth.uid(), p_feature_key, p_periode, 1, now())
      returning aantal into v_aantal;
    return query select (p_quota > 0), v_aantal;
    return;
  exception when unique_violation then
    update public.usage_log
      set aantal = aantal + 1, updated_at = now()
      where user_id = auth.uid() and feature_key = p_feature_key and periode = p_periode
        and aantal < p_quota
      returning aantal into v_aantal;
    if v_aantal is not null then
      return query select true, v_aantal;
      return;
    end if;
    select aantal into v_aantal from public.usage_log where user_id = auth.uid() and feature_key = p_feature_key and periode = p_periode;
    return query select false, coalesce(v_aantal, p_quota);
    return;
  end;
end;
$$;
revoke all on function public.check_and_increment_usage(text, date, integer) from public;
revoke execute on function public.check_and_increment_usage(text, date, integer) from anon;
grant execute on function public.check_and_increment_usage(text, date, integer) to authenticated;

-- Compenserende decrement: als de betaalde/quota-gebonden actie zelf
-- (bijv. de AI-aanroep) achteraf mislukt, krijgt de gebruiker de
-- gereserveerde quota-eenheid terug -- geen gratis actie verliezen door
-- een downstream-fout die niets met de gebruiker te maken heeft.
--
-- IDEMPOTENTIE-RISICO ONDERZOCHT (expliciet vereist): een blinde
-- decrement_usage() zou bij een replay van dezelfde mislukte request
-- (bijv. een netwerk-retry die de foutrespons twee keer verwerkt) tweemaal
-- kunnen decrementeren, wat een gebruiker een GRATIS extra quota-eenheid
-- zou opleveren (de eerste decrement compenseert terecht, de tweede
-- decrement heeft geen bijbehorende consumptie meer om te compenseren).
-- FIX: decrement_usage() is countervailing, NOOIT onder 0 (via greatest()),
-- en coach.js (de enige aanroeper) roept dit precies éénmaal aan per
-- verzoek-uitvoering-pad (niet per retry) -- de aanroep zit in de
-- catch/failure-tak van de AI-call zelf, niet in een client-retryable
-- endpoint. Voor extra robuustheid: een dubbele decrement op een reeds-
-- naar-0-gedecrementeerde rij blijft op 0 (bewezen, geen negatieve balans,
-- geen "vers" gratis quota door het herhaaldelijk aanroepen van decrement
-- op een rij die al gecompenseerd is -- de ondergrens van 0 voorkomt dat
-- decrement ooit MEER teruggeeft dan er ooit geconsumeerd is).
create or replace function public.decrement_usage(p_feature_key text, p_periode date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aantal integer;
begin
  update public.usage_log
    set aantal = greatest(aantal - 1, 0), updated_at = now()
    where user_id = auth.uid() and feature_key = p_feature_key and periode = p_periode
    returning aantal into v_aantal;
  return v_aantal;
end;
$$;
revoke all on function public.decrement_usage(text, date) from public;
revoke execute on function public.decrement_usage(text, date) from anon;
grant execute on function public.decrement_usage(text, date) to authenticated;

-- LIVE ADVERSARIAAL GEVERIFIEERD (transacties zonder commit, geen
-- permanente wijziging):
-- A. authenticated user: individual_plan_key/status/expires_at/
--    mollie_customer_id blijven alle vier ongewijzigd bij een directe
--    zelf-mutatiepoging; een gelijktijdige, legitieme profielwijziging
--    (name) in dezelfde UPDATE-statement slaagt wel (geen stille
--    privilege-escalatie via bulk-update).
-- B. cross-user: een andere gebruiker raakt 0 rijen bij een poging op
--    andermans rij (RLS filtert dit al af, los van de trigger).
-- C. service_role (met de daadwerkelijke JWT role-claim
--    'service_role', niet slechts een database-rol zonder claim):
--    kan de commerciële velden wél correct zetten.
-- D. Onbekende/ontbrekende rol-context (geen expliciete JWT-claim):
--    trigger blokkeert -- fail-safe bij twijfel, consistent met de
--    bestaande, onafhankelijke trg_protect_privileged_user_columns.
-- E. gym_role/gym_id/system_role: reeds beschermd door de bestaande,
--    onafhankelijke trg_protect_privileged_user_columns -- geverifieerd
--    nog steeds actief en effectief, geen wijziging nodig.
-- F. quota=1: eerste aanroep toegestaan (aantal=1), tweede en derde
--    aanroep correct geweigerd (aantal blijft 1) -- race-safe via de
--    atomaire UPDATE...WHERE aantal<quota-conditie.
-- G. decrement_usage() na een succesvolle increment geeft de eenheid
--    correct terug (1->0); een tweede decrement-poging blijft op 0
--    (nooit negatief, via greatest()).
-- H. anon krijgt permission denied voor beide nieuwe functies.