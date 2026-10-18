-- migratie_v581.sql
-- WEARABLE TOKEN-LIFECYCLE (DEC-VAULT-001, v4.70.25) -- opruimen van wees-secrets in Vault.
--
-- STATUS: NIET TOEGEPAST OP PRODUCTIE. Toepassen gebeurt uitsluitend na merge en op een
-- afzonderlijke, expliciete opdracht van de Product Owner (zie DECISION_LOG, DEC-VAULT-001).
--
-- DE APP IS NIET AFHANKELIJK VAN DEZE MIGRATIE. Het eigenlijke herstel zit in de
-- serverfuncties (netlify/functions/wearableTokenVault.js): elke autorisatie krijgt een
-- unieke secretnaam en oude secrets worden op id opgeruimd. Dat werkt met de vier RPC's die
-- al op productie staan. Deze migratie voegt alleen het vangnet toe voor secrets die door
-- een afgebroken aanroep of door de oude code zijn achtergebleven.
--
-- AANLEIDING (productie, 11 oktober 2026): vault.secrets heeft een unieke index op name
-- (secrets_name_idx). Tokens stonden onder een vaste naam per gebruiker
-- ('wearable_access_<userId>'). wearable-disconnect verwijderde de koppeling maar niet de
-- secrets; de volgende koppeling faalde daardoor met SQLSTATE 23505 / HTTP 409 op
-- store_wearable_token_secret -> "Koppelen mislukt (opslaan)".

-- 1. delete_wearable_token_secret -- REPO-DRIFT HERSTELD.
--    Deze functie staat al op productie (service-role-only, live geverifieerd op
--    11 oktober 2026) en wordt aangeroepen door wearableTokenVault.js, maar stond in geen
--    enkel migratiebestand. Hier ongewijzigd vastgelegd zodat de repo de database beschrijft.
create or replace function public.delete_wearable_token_secret(p_secret_id uuid)
returns void
language sql
security definer
set search_path = public, vault
as $$
  delete from vault.secrets where id = p_secret_id;
$$;

revoke all on function public.delete_wearable_token_secret(uuid) from public, anon, authenticated;
grant execute on function public.delete_wearable_token_secret(uuid) to service_role;

-- 2. cleanup_orphan_wearable_token_secrets -- verwijdert wees-secrets.
--    Een secret is een wees als:
--      a. de naam het vaste wearable-patroon heeft
--         (<provider>_(access|refresh)_<uuid>[_<uuid>]) -- andere Vault-secrets worden
--         nooit geraakt;
--      b. geen enkele rij in wearable_connections ernaar verwijst; en
--      c. het ouder is dan 15 minuten. Die termijn beschermt een koppeling die op dit
--         moment wordt vastgelegd: het secret bestaat dan al, de verwijzing nog niet.
--    p_user_id gegeven  -> alleen de secrets van die gebruiker (zo roept de app hem aan,
--                          na een geslaagde koppeling of ontkoppeling).
--    p_user_id null     -> alle wees-secrets, ook van inmiddels verwijderde accounts. Dit is
--                          een beheeractie en wordt nooit door de app aangeroepen.
--    Geeft het aantal verwijderde secrets terug. Leest of retourneert nooit een secretwaarde.
create or replace function public.cleanup_orphan_wearable_token_secrets(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_patroon text;
  v_aantal integer;
begin
  if p_user_id is null then
    v_patroon := '^(wearable|whoop|oura|garmin|polar)_(access|refresh)_[0-9a-f-]{36}(_[0-9a-f-]{36})?$';
  else
    v_patroon := '^(wearable|whoop|oura|garmin|polar)_(access|refresh)_' || p_user_id::text || '(_[0-9a-f-]{36})?$';
  end if;

  with weg as (
    delete from vault.secrets s
    where s.name ~ v_patroon
      and s.created_at < now() - interval '15 minutes'
      and not exists (
        select 1 from public.wearable_connections c
        where c.access_token_secret_id = s.id or c.refresh_token_secret_id = s.id
      )
    returning 1
  )
  select count(*)::integer into v_aantal from weg;
  return v_aantal;
end;
$$;

revoke all on function public.cleanup_orphan_wearable_token_secrets(uuid) from public, anon, authenticated;
grant execute on function public.cleanup_orphan_wearable_token_secrets(uuid) to service_role;

-- VERIFICATIE NA TOEPASSEN (alleen-lezen):
--   select has_function_privilege('anon', 'public.cleanup_orphan_wearable_token_secrets(uuid)', 'execute');          -- false
--   select has_function_privilege('authenticated', 'public.cleanup_orphan_wearable_token_secrets(uuid)', 'execute'); -- false
--   select has_function_privilege('service_role', 'public.cleanup_orphan_wearable_token_secrets(uuid)', 'execute');  -- true
--
-- DROOGLOOP (alleen-lezen) -- welke secrets zou de beheeractie verwijderen? Toont geen waarden.
--   select s.id, s.name, s.created_at
--   from vault.secrets s
--   where s.name ~ '^(wearable|whoop|oura|garmin|polar)_(access|refresh)_[0-9a-f-]{36}(_[0-9a-f-]{36})?$'
--     and s.created_at < now() - interval '15 minutes'
--     and not exists (select 1 from public.wearable_connections c
--                     where c.access_token_secret_id = s.id or c.refresh_token_secret_id = s.id);
--
-- EENMALIGE OPRUIMING VAN DE BESTAANDE WEES-SECRETS (afzonderlijk akkoord vereist):
--   select public.cleanup_orphan_wearable_token_secrets(null);
