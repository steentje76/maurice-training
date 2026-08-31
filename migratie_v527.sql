-- migratie_v527.sql
-- F13 POST-AUDIT REMEDIATION -- P1-09.
--
-- KRITIEKE, LIVE BEVESTIGDE BEVINDING: wearable_connections.access_token/
-- refresh_token stonden volledig in plaintext (bevestigd: een echt,
-- geldig Google OAuth2-access-token met het herkenbare "ya29."-prefix,
-- leesbaar voor iedereen met SELECT-toegang tot de tabel of een database-
-- dump/backup).
--
-- FIX: Supabase Vault (supabase_vault-extensie, al geinstalleerd,
-- v0.3.1) -- Transparent Column Encryption, de encryptiesleutel zelf is
-- nooit beschikbaar via SQL en wordt buiten de database beheerd. Dit is
-- de door Supabase zelf aangeboden, praktisch aantoonbaar betere
-- oplossing t.o.v. een zelfgebouwde applicatie-niveau-encryptie: geen
-- eigen sleutelbeheer nodig, geen risico op een sleutel die naast de
-- data in dezelfde database staat ("geen crypto theater").

alter table public.wearable_connections
  add column if not exists access_token_secret_id uuid,
  add column if not exists refresh_token_secret_id uuid;

-- Drie kleine, service-role-only RPC's rond Vault -- consistent met het
-- al bewezen SECURITY DEFINER + service-role-only-patroon uit
-- reconcile_billing_event() (MS-F12-04). vault.decrypted_secrets is zelf
-- niet via PostgREST bereikbaar (ander schema) -- deze RPC's zijn de
-- enige, correcte weg voor de Netlify Functions om tokens veilig op te
-- slaan/op te halen/te vernieuwen. Encrypt/decrypt gebeurt uitsluitend
-- server-side (deze RPC's zijn nooit client-uitvoerbaar), nooit
-- client-readable.

create or replace function public.store_wearable_token_secret(p_secret text, p_naam text)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  v_id := vault.create_secret(p_secret, p_naam, 'wearable OAuth-token (P1-09-remediation)');
  return v_id;
end;
$$;

create or replace function public.get_wearable_token_secret(p_secret_id uuid)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where id = p_secret_id;
$$;

create or replace function public.update_wearable_token_secret(p_secret_id uuid, p_nieuwe_waarde text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  perform vault.update_secret(p_secret_id, p_nieuwe_waarde);
end;
$$;

revoke all on function public.store_wearable_token_secret(text, text) from public, anon, authenticated;
revoke all on function public.get_wearable_token_secret(uuid) from public, anon, authenticated;
revoke all on function public.update_wearable_token_secret(uuid, text) from public, anon, authenticated;
grant execute on function public.store_wearable_token_secret(text, text) to service_role;
grant execute on function public.get_wearable_token_secret(uuid) to service_role;
grant execute on function public.update_wearable_token_secret(uuid, text) to service_role;

-- MIGRATIESTRATEGIE VOOR BESTAANDE TOKENS (live uitgevoerd, hier
-- gedocumenteerd voor reproduceerbaarheid): elke bestaande, plaintext
-- token wordt naar Vault gemigreerd, waarna de plaintext-waarde wordt
-- geleegd. access_token had een NOT NULL-constraint die eerst versoepeld
-- moest worden (de kolom is niet langer de bron van waarheid).
alter table public.wearable_connections alter column access_token drop not null;

update public.wearable_connections
  set access_token_secret_id = store_wearable_token_secret(access_token, 'wearable_access_' || id::text),
      refresh_token_secret_id = store_wearable_token_secret(refresh_token, 'wearable_refresh_' || id::text)
  where access_token is not null and access_token_secret_id is null;

update public.wearable_connections
  set access_token = null, refresh_token = null
  where access_token_secret_id is not null;

-- LIVE ADVERSARIAAL/FUNCTIONEEL GEVERIFIEERD NA TOEPASSING:
-- 1. De gemigreerde, gedecrypte Vault-waarde komt exact overeen met de
--    originele plaintext-token (functionele correctheid van de migratie).
-- 2. De plaintext-kolommen (access_token/refresh_token) zijn definitief
--    leeg voor elke gemigreerde rij.
-- 3. anon krijgt "permission denied" bij een poging tot
--    get_wearable_token_secret() -- geen enkele client-rol kan tokens
--    decrypten.
--
-- ROTATION STRATEGY: vault.update_secret() (via update_wearable_token_
-- secret()) wordt gebruikt bij elke token-refresh (zie netlify/functions/
-- wearable-sync.js) -- geen nieuwe secret-rij per refresh, hetzelfde
-- secret-id blijft behouden, alleen de versleutelde inhoud wijzigt.
--
-- BEKENDE, RESTERENDE BEPERKING (buiten deze migratie se bereik, vereist
-- een Supabase-dashboardinstelling, geen SQL-migratie): Vault-documentatie
-- vermeldt dat INSERT-statements op vault.secrets standaard in de
-- Postgres-statement-logs terechtkomen. Dit is een bekend, door Supabase
-- zelf gedocumenteerd aandachtspunt van Vault zelf (niet specifiek voor
-- deze implementatie) -- vereist het uitschakelen van statement-logging
-- op projectniveau voor volledige bescherming tegen dit ene, secundaire
-- blootstellingspad. Vermeld hier expliciet, niet stilzwijgend genegeerd.
