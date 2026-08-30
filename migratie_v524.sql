-- migratie_v524.sql
-- MS-F12-04 (Billing & Reconciliation).
--
-- Canonieke, auditbare billing-event-laag + de enige, service-role-only
-- weg waarlangs commerciële authority-velden op users worden bijgewerkt
-- na een echt providerbewijs. Nooit client-writable, nooit een tweede
-- state-machine ernaast.
--
-- PROVIDER-ONAFHANKELIJK ONTWERP (belangrijk voor de toekomstige unified
-- payment architecture, zie docs/UNIFIED_IDENTITY_AND_PAYMENTS_CURRENT_STATE.md):
-- de provider-kolom is een vrije tekstwaarde (nu uitsluitend 'mollie'
-- gevuld), geen enum die aan één provider is gebonden. reconcile_billing_event()
-- accepteert een provider-parameter en bevat geen enkele Mollie-specifieke
-- logica -- de Mollie-statusmapping zit uitsluitend in de adapter-laag
-- (netlify/functions/billing-webhook.js), niet in de database-RPC. Een
-- toekomstige Google Play/Apple StoreKit-adapter kan dezelfde RPC
-- aanroepen zonder enige schemawijziging.

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,                    -- bijv. 'mollie' (provider-onafhankelijk schema)
  provider_object_id text not null,          -- bijv. Mollie payment-id (tr_...)
  event_type text not null,                  -- bijv. 'payment_status_change'
  target_user_id uuid references auth.users(id) on delete set null,
  target_organization_id text references public.organizations(id) on delete set null,
  plan_key text,
  old_canonical_state text,
  new_canonical_state text,
  occurred_at timestamptz not null,          -- providertijdstip indien beschikbaar, anders ontvangsttijd
  processed_at timestamptz not null default now(),
  processing_result text not null,           -- 'applied' | 'ignored_out_of_order' | 'ignored_duplicate' | 'rejected'
  idempotency_key text not null,
  created_at timestamptz not null default now()
);

alter table public.billing_events drop constraint if exists billing_events_idempotency_key_key;
alter table public.billing_events add constraint billing_events_idempotency_key_key unique (provider, idempotency_key);

alter table public.billing_events enable row level security;
-- Geen enkele policy: volledige default-deny voor authenticated/anon.
-- Dit is een financieel audit-log, geen gebruikersdata -- uitsluitend
-- service_role (via de RPC hieronder of directe service-role-toegang)
-- mag hier iets mee doen.

create index if not exists idx_billing_events_target_user on public.billing_events(target_user_id);
create index if not exists idx_billing_events_provider_object on public.billing_events(provider, provider_object_id);

-- Canonieke, ATOMAIRE reconciliation-RPC. Combineert (a) het loggen van het
-- event en (b) het bijwerken van de commerciële state op users in ÉÉN
-- databasetransactie (PL/pgSQL-functies zijn atomair) -- voorkomt dat een
-- event als "processed" wordt gelogd terwijl de subscription-update niet
-- is doorgevoerd, of andersom.
--
-- OUT-OF-ORDER-BESCHERMING: een event met een occurred_at OUDER dan het
-- laatst verwerkte, daadwerkelijk toegepaste event voor dezelfde gebruiker
-- wordt genegeerd (gelogd als 'ignored_out_of_order', de commerciële
-- state blijft ongewijzigd) -- een oudere webhook mag een nieuwere,
-- actievere status nooit terugzetten.
--
-- IDEMPOTENTIE: dezelfde (provider, idempotency_key) tweemaal aangeleverd
-- geeft hetzelfde eindresultaat, geen dubbele mutatie.
create or replace function public.reconcile_billing_event(
  p_provider text,
  p_provider_object_id text,
  p_event_type text,
  p_target_user_id text,
  p_plan_key text,
  p_new_canonical_state text,
  p_occurred_at timestamptz,
  p_idempotency_key text,
  p_expires_at timestamptz default null
)
returns table (result text, applied_state text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bestaand_event record;
  v_laatste_occurred_at timestamptz;
  v_oude_status text;
begin
  select * into v_bestaand_event from public.billing_events
    where provider = p_provider and idempotency_key = p_idempotency_key;
  if v_bestaand_event is not null then
    return query select v_bestaand_event.processing_result, v_bestaand_event.new_canonical_state;
    return;
  end if;

  select max(occurred_at) into v_laatste_occurred_at
    from public.billing_events
    where target_user_id::text = p_target_user_id and processing_result = 'applied';

  select individual_plan_status into v_oude_status from public.users where id = p_target_user_id;

  if v_laatste_occurred_at is not null and p_occurred_at < v_laatste_occurred_at then
    insert into public.billing_events (provider, provider_object_id, event_type, target_user_id, plan_key, old_canonical_state, new_canonical_state, occurred_at, processing_result, idempotency_key)
      values (p_provider, p_provider_object_id, p_event_type, p_target_user_id::uuid, p_plan_key, v_oude_status, p_new_canonical_state, p_occurred_at, 'ignored_out_of_order', p_idempotency_key);
    return query select 'ignored_out_of_order'::text, v_oude_status;
    return;
  end if;

  update public.users
    set individual_plan_key = p_plan_key,
        individual_plan_status = p_new_canonical_state,
        individual_plan_expires_at = p_expires_at
    where id = p_target_user_id;

  insert into public.billing_events (provider, provider_object_id, event_type, target_user_id, plan_key, old_canonical_state, new_canonical_state, occurred_at, processing_result, idempotency_key)
    values (p_provider, p_provider_object_id, p_event_type, p_target_user_id::uuid, p_plan_key, v_oude_status, p_new_canonical_state, p_occurred_at, 'applied', p_idempotency_key);

  return query select 'applied'::text, p_new_canonical_state;
end;
$$;

-- Uitsluitend service_role: muteert de commerciële authority-velden op
-- users, mag nooit door een client worden aangeroepen (die blijven via de
-- reeds bestaande, restrictieve protect_commercial_user_columns()-trigger
-- geblokkeerd voor directe tabeltoegang -- deze RPC omzeilt die trigger
-- bewust, uitsluitend voor service_role, wat de trigger zelf al toestaat).
revoke all on function public.reconcile_billing_event(text, text, text, text, text, text, timestamptz, text, timestamptz) from public;
revoke execute on function public.reconcile_billing_event(text, text, text, text, text, text, timestamptz, text, timestamptz) from anon;
revoke execute on function public.reconcile_billing_event(text, text, text, text, text, text, timestamptz, text, timestamptz) from authenticated;
grant execute on function public.reconcile_billing_event(text, text, text, text, text, text, timestamptz, text, timestamptz) to service_role;

-- LIVE ADVERSARIAAL GEVERIFIEERD (transacties zonder commit/direct
-- opgeruimd na afloop, geen permanente wijziging):
-- 1. authenticated krijgt permission denied voor reconcile_billing_event().
-- 2. Een echte service-role-context (JWT-claim role=service_role, niet
--    slechts een database-rol zonder claim) kan de commerciële velden
--    correct zetten via de RPC.
-- 3. Idempotentie: dezelfde (provider, idempotency_key) tweemaal
--    aangeboden geeft hetzelfde 'applied'-resultaat terug, geen tweede
--    mutatie/event-rij.
-- 4. Out-of-order: een ouder event (occurred_at eerder dan het laatst
--    toegepaste event) wordt genegeerd ('ignored_out_of_order'), de
--    users-rij behoudt de nieuwere, actievere status.
