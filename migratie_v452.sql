-- migratie_v452.sql — Weer per sessie (weather_session_snapshot.v1)
--
-- MASTER SPRINT v4.52.0. Twee kolommen, beide JSONB, beide nullable, beide additief.
-- Architectuurregel (zie DECISION_LOG / auditrapport v4.52.0):
--   1) training_instances.weather is de PRIMAIRE opslag — één weer-snapshot per
--      trainings-occurrence (1:1, geen duplicatie over de N sessions-rijen van dezelfde
--      training).
--   2) sessions.weather is UITSLUITEND de fallback voor trainingen zonder
--      training_instance_id (bv. niet via Preview gestart) — de app schrijft daar zelf
--      maar naar ÉÉN rij per sessie (de eerst opgeslagen), nooit naar alle rijen.
--   3) Geen nieuwe tabel, geen nieuwe sync-laag — hergebruikt de bestaande sbPostQ/sbPatchQ
--      offline-wachtrij en de bestaande RLS op beide tabellen (raakt de policies niet aan;
--      een nieuwe kolom erft automatisch de rij-eigenaarschap-regels van de tabel).
--   4) Bevat NOOIT coördinaten — alleen temperatuur/luchtvochtigheid/wind + provenance
--      (schema weather_session_snapshot.v1, zie core/weather.js WeatherCore.minimalSnapshot).
--
-- Zoals bij migratie_v449 (duration_s): de app zelf detecteert via een lichte
-- kolom-probe (tkWeatherInstancesKolomBeschikbaar/tkWeatherSessionsKolomBeschikbaar) of
-- deze migratie al gedraaid is, en laat het veld gewoon weg zolang dat niet zo is — deze
-- migratie kan dus op elk moment veilig los van een release gedraaid worden.
--
-- Idempotent: `if not exists` overal, veilig opnieuw te draaien.

-- ══════════════════════════════════════════════════════════════════════════════

-- STAP 1 — de kolommen
alter table public.training_instances
  add column if not exists weather jsonb;

alter table public.sessions
  add column if not exists weather jsonb;

-- STAP 2 — documentatie in de database zelf
comment on column public.training_instances.weather is
  'Weer-snapshot (schema weather_session_snapshot.v1) voor deze trainings-occurrence: temperatuur, luchtvochtigheid, wind + provenance. NULL = niet vastgelegd (geen toestemming, geen locatie, of fetch mislukt — nooit fictief ingevuld). Primaire opslagplek; zie sessions.weather voor de fallback zonder instance-id.';

comment on column public.sessions.weather is
  'Fallback weer-snapshot (schema weather_session_snapshot.v1), UITSLUITEND gebruikt wanneer deze sessie geen training_instance_id heeft. Bij een training MET instance-id staat het weer in training_instances.weather en blijft dit veld NULL — geen dubbele opslag. Van de meerdere sessions-rijen die bij één training horen, draagt hoogstens de eerst opgeslagen rij dit veld.';

-- STAP 3 — verificatie (leest alleen)
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('training_instances', 'sessions')
  and column_name = 'weather';
