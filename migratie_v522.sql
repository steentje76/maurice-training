-- migratie_v522.sql
-- MS-F12-01 (Tier & Entitlement Design).
--
-- KRITIEKE, LIVE BEVESTIGDE BEVINDING (F12 existing-state audit,
-- docs/F12_EXISTING_COMMERCIAL_ARCHITECTURE_AUDIT.md): de bestaande
-- policies credit_purchases_own_data / usage_log_own_data waren FOR ALL
-- met alleen een USING-conditie (auth.uid()=user_id) en GEEN expliciete
-- WITH CHECK -- Postgres gebruikt dan dezelfde conditie als impliciete
-- WITH CHECK, wat betekende dat een gebruiker credits_resterend/aantal
-- van de EIGEN rij vrij kon muteren (self-service credit-inflatie/quota-
-- manipulatie). Live bevestigd: credits_resterend naar 999999 gezet via
-- een simpele directe UPDATE. Tevens bevestigd: de bijbehorende
-- credit_purchases_insert_own-policy controleerde alleen user_id, niet de
-- waarde van credits_resterend -- een gebruiker kon bij het aanmaken van
-- de eigen rij zelf credits_resterend=999999 invullen.
--
-- FIX: alle directe client-mutatie op deze twee tabellen is vervangen door
-- SECURITY DEFINER-RPC's die de waarde server-side afleiden/berekenen,
-- nooit uit client-input.

drop policy if exists credit_purchases_own_data on public.user_credit_purchases;
drop policy if exists usage_log_own_data on public.usage_log;

create policy credit_purchases_select_own on public.user_credit_purchases
  for select using (auth.uid() = user_id);
create policy usage_log_select_own on public.usage_log
  for select using (auth.uid() = user_id);
-- Geen INSERT/UPDATE-policy voor de client op beide tabellen: mutatie
-- uitsluitend via de RPC's hieronder.

create or replace function public.consume_credit(p_credit_purchase_id uuid, p_aantal integer default 1)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resterend integer;
begin
  if p_aantal <= 0 then
    raise exception 'p_aantal moet positief zijn';
  end if;
  update public.user_credit_purchases
    set credits_resterend = credits_resterend - p_aantal
    where id = p_credit_purchase_id
      and user_id = auth.uid()
      and credits_resterend >= p_aantal
    returning credits_resterend into v_resterend;
  if v_resterend is null then
    raise exception 'Onvoldoende credits of rij niet gevonden/niet van deze gebruiker';
  end if;
  return v_resterend;
end;
$$;
revoke all on function public.consume_credit(uuid, integer) from public;
revoke execute on function public.consume_credit(uuid, integer) from anon;
grant execute on function public.consume_credit(uuid, integer) to authenticated;

create or replace function public.increment_usage(p_feature_key text, p_periode date, p_aantal integer default 1)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aantal integer;
begin
  if p_aantal <= 0 then
    raise exception 'p_aantal moet positief zijn';
  end if;
  insert into public.usage_log (user_id, feature_key, periode, aantal, updated_at)
    values (auth.uid(), p_feature_key, p_periode, p_aantal, now())
  on conflict (user_id, feature_key, periode)
    do update set aantal = usage_log.aantal + excluded.aantal, updated_at = now()
  returning aantal into v_aantal;
  return v_aantal;
end;
$$;
revoke all on function public.increment_usage(text, date, integer) from public;
revoke execute on function public.increment_usage(text, date, integer) from anon;
grant execute on function public.increment_usage(text, date, integer) to authenticated;

alter table public.usage_log drop constraint if exists usage_log_user_feature_periode_key;
alter table public.usage_log add constraint usage_log_user_feature_periode_key unique (user_id, feature_key, periode);

-- TWEEDE, TIJDENS DEZELFDE SESSIE GEVONDEN BEVINDING: idempotentie
-- ontbrak volledig bij credit-toekenning. Een dubbele aanroep met
-- dezelfde mollie_payment_id (bijv. door een Mollie-webhook-retry, tot 5
-- pogingen per Mollie-documentatie) zou tweemaal credits toekennen.
alter table public.user_credit_purchases drop constraint if exists user_credit_purchases_mollie_payment_id_key;
alter table public.user_credit_purchases add constraint user_credit_purchases_mollie_payment_id_key unique (mollie_payment_id);

create or replace function public.grant_credit_purchase(p_user_id uuid, p_credit_pack_key text, p_mollie_payment_id text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pack record;
  v_id uuid;
begin
  select feature_key, aantal_credits into v_pack from public.credit_packs where key = p_credit_pack_key and actief = true;
  if v_pack is null then
    raise exception 'Onbekend of inactief credit_pack: %', p_credit_pack_key;
  end if;

  if p_mollie_payment_id is not null then
    select id into v_id from public.user_credit_purchases where mollie_payment_id = p_mollie_payment_id;
    if v_id is not null then
      return v_id; -- idempotent: dezelfde betaling levert nooit een tweede keer credits op
    end if;
  end if;

  insert into public.user_credit_purchases (user_id, credit_pack_key, feature_key, credits_resterend, mollie_payment_id)
    values (p_user_id, p_credit_pack_key, v_pack.feature_key, v_pack.aantal_credits, p_mollie_payment_id)
    returning id into v_id;
  return v_id;
end;
$$;
-- Uitsluitend service_role mag credits toekennen (na een server-side
-- bevestigde betaling) -- nooit de client zelf, dat zou onbeperkt gratis
-- credits toestaan.
revoke all on function public.grant_credit_purchase(uuid, text, text) from public;
revoke execute on function public.grant_credit_purchase(uuid, text, text) from anon;
revoke execute on function public.grant_credit_purchase(uuid, text, text) from authenticated;
grant execute on function public.grant_credit_purchase(uuid, text, text) to service_role;

-- Canonieke, read-only RLS voor het plan/feature-catalogusmodel. Productcatalogus,
-- geen gebruikersdata -- elke geauthenticeerde gebruiker mag lezen (nodig om
-- plannen/features te tonen), niemand via de client mag muteren.
create policy plans_select_all on public.plans
  for select using (true);
create policy features_select_all on public.features
  for select using (true);
create policy plan_features_select_all on public.plan_features
  for select using (true);
create policy plan_feature_quota_select_all on public.plan_feature_quota
  for select using (true);
create policy credit_packs_select_all on public.credit_packs
  for select using (actief = true);

-- LIVE ADVERSARIAAL GEVERIFIEERD (transacties zonder commit, geen
-- permanente wijziging):
-- 1. Directe client-UPDATE/INSERT op user_credit_purchases/usage_log ->
--    RLS-policy-violation, geen enkele rij geraakt.
-- 2. consume_credit(): correcte atomaire decrement; negatieve input,
--    overconsumptie, extreme/overflow-waarden, en cross-user-aanroepen
--    allemaal correct geweigerd; parallelle-verbruik-race-conditie
--    getest (twee opeenvolgende aanroepen van 2 credits op een saldo van
--    3 -- de tweede faalt correct).
-- 3. increment_usage(): atomaire upsert-increment bevestigd (1+3=4).
-- 4. grant_credit_purchase(): authenticated krijgt permission denied;
--    vanuit service-role-context correct, credits_resterend komt exact
--    uit credit_packs.aantal_credits (nooit client-input); dubbele
--    aanroep met dezelfde mollie_payment_id levert idempotent dezelfde
--    rij op (geen dubbele credits).
-- 5. Repo-brede foutklasse-audit: 0 overige policies met cmd='ALL' en
--    with_check IS NULL in de hele database na deze fix.
