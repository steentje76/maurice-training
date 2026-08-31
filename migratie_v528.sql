-- migratie_v528.sql
-- F13 POST-AUDIT REMEDIATION -- P1-13.
--
-- Audit-bevinding: observability-sink was uitsluitend console -- een
-- crash/onverwachte fout bij een echte gebruiker was voor Maurice
-- volledig onzichtbaar (alleen zichtbaar in de lokale browserconsole van
-- de gebruiker zelf, bevestigd door lezing van de bestaande window.
-- onerror/unhandledrejection-handlers in index.html, die uitsluitend
-- naar ObservabilityCore.tkLog() -> console loggen). Dit moet worden
-- opgelost vóór een gesloten beta.
--
-- Minimale, privacy-veilige telemetrytabel. GEEN analytics-warehouse,
-- GEEN user-behavior-tracking -- uitsluitend crash/error-diagnose,
-- consistent met het bestaande observability_event.v1-contract
-- (core/observability.js, die al message_safe/redact() levert).

create table if not exists public.client_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  app_version text,
  platform text,
  route text,
  event_type text not null,
  error_code text,
  message_safe text,
  correlation_id text,
  release_sha text
);

alter table public.client_telemetry_events enable row level security;

-- Uitsluitend INSERT voor de eigen, authenticated gebruiker (of NULL
-- user_id voor een crash vóór het inloggen -- expliciet toegestaan zodat
-- een crash op het loginscherm zelf niet stil verloren gaat).
create policy client_telemetry_insert_own on public.client_telemetry_events
  for insert
  with check (user_id is null or user_id = auth.uid());

-- GEEN SELECT-policy voor anon/authenticated: uitsluitend server-side/
-- admin-leesbaar (service_role). Retention: bewust GEEN automatische
-- cleanup-cron in deze sprint (product-beslissing, buiten scope) --
-- expliciet vastgelegd als open punt.

create index if not exists idx_client_telemetry_created_at on public.client_telemetry_events(created_at desc);
create index if not exists idx_client_telemetry_event_type on public.client_telemetry_events(event_type);

-- Least privilege (defense-in-depth naast de RLS-policy zelf): Supabase
-- geeft nieuwe tabellen standaard SELECT/INSERT/UPDATE/DELETE/TRUNCATE
-- voor zowel anon als authenticated (hetzelfde patroon dat al eerder
-- werd gevonden bij hrv_log_archive_v500, P0-B). anon krijgt hier
-- HELEMAAL GEEN toegang (telemetrie vereist een ingelogde sessie).
-- authenticated behoudt uitsluitend INSERT.
revoke all on public.client_telemetry_events from anon;
revoke select, update, delete, truncate, trigger, references on public.client_telemetry_events from authenticated;

-- BELANGRIJKE, LIVE ONTDEKTE TECHNISCHE LES (voor de Netlify Function-
-- implementatie): een PostgREST INSERT met "Prefer: return=representation"
-- vereist IMPLICIET dat de zojuist ingevoegde rij ook zichtbaar is
-- volgens een SELECT-RLS-policy (Postgres RETURNING-semantiek) -- zonder
-- SELECT-policy faalt zo'n insert met "new row violates row-level
-- security policy", ondanks een correcte, slagende INSERT-policy. Live
-- bevestigd: exact dezelfde insert-statement slaagt zonder RETURNING/
-- return=representation, faalt ermee. De Netlify Function MOET daarom
-- altijd "Prefer: return=minimal" gebruiken voor deze tabel.
--
-- LIVE ADVERSARIAAL GEVERIFIEERD NA TOEPASSING:
-- 1. anon: permission denied (volledig geen toegang).
-- 2. authenticated: SELECT permission denied.
-- 3. authenticated, eigen user_id, zonder RETURNING: insert slaagt.
-- 4. authenticated, andere user_id: RLS-violation (cross-user geweigerd).
